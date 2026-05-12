import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { demoStore, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, DEMO_WORKSPACE_ID } from "@/lib/demo-data";
import { hasDatabaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, signSession, verifySession, type SessionPayload } from "@/lib/auth-token";
import { slugify } from "@/lib/utils";

export async function authenticate(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  if (hasDatabaseUrl()) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { workspace: true }
      });

      if (user?.passwordHash && (await bcrypt.compare(password, user.passwordHash))) {
        return createSessionPayload({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId
        });
      }
    } catch (error) {
      logger.warn("Auth database lookup failed, demo login remains available", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (normalizedEmail === DEMO_USER_EMAIL && password === DEMO_USER_PASSWORD) {
    const demoUser = demoStore.users[0];
    return createSessionPayload(demoUser);
  }

  return null;
}

export async function registerWorkspace(input: { name: string; email: string; password: string; workspaceName: string }) {
  const email = input.email.toLowerCase().trim();

  if (!hasDatabaseUrl()) {
    return createSessionPayload({
      ...demoStore.users[0],
      name: input.name || demoStore.users[0].name,
      email
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const workspaceSlug = slugify(input.workspaceName || input.name || "workspace");

  const workspace = await prisma.workspace.create({
    data: {
      name: input.workspaceName,
      slug: `${workspaceSlug}-${Date.now().toString(36)}`,
      users: {
        create: {
          name: input.name,
          email,
          passwordHash,
          role: "OWNER"
        }
      }
    },
    include: { users: true }
  });

  const user = workspace.users[0];
  return createSessionPayload({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: workspace.id
  });
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session || !hasDatabaseUrl() || session.workspaceId !== DEMO_WORKSPACE_ID) {
    return session;
  }

  try {
    const workspace = await prisma.workspace.findFirst({ select: { id: true } });
    return workspace?.id ? { ...session, workspaceId: workspace.id } : session;
  } catch (error) {
    logger.warn("Could not resolve database workspace for demo session", {
      error: error instanceof Error ? error.message : String(error)
    });
    return session;
  }
}

function createSessionPayload(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
}): SessionPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionPayload["role"],
    workspaceId: user.workspaceId
  };
}

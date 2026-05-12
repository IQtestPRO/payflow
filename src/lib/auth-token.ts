import { jwtVerify, SignJWT } from "jose";
import { authSecret } from "@/lib/env";
import type { UserRole } from "@/lib/types";

export const SESSION_COOKIE = "payflow_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  workspaceId: string;
};

function secretKey() {
  return new TextEncoder().encode(authSecret());
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token?: string | null) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email?: string;
  password?: string;
  role: UserRole;
};

const workspaceSlug = process.env.PAYFLOW_WORKSPACE_SLUG || "payflow";
const workspaceName = process.env.PAYFLOW_WORKSPACE_NAME || "PayFlow";

const seedUsers: SeedUser[] = [
  {
    name: "Lucas",
    email: process.env.PAYFLOW_LUCAS_EMAIL,
    password: process.env.PAYFLOW_LUCAS_PASSWORD,
    role: (process.env.PAYFLOW_LUCAS_ROLE as UserRole | undefined) || "ATTENDANT"
  },
  {
    name: "Arthur",
    email: process.env.PAYFLOW_ARTHUR_EMAIL,
    password: process.env.PAYFLOW_ARTHUR_PASSWORD,
    role: (process.env.PAYFLOW_ARTHUR_ROLE as UserRole | undefined) || "ADMIN"
  }
];

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: { name: workspaceName },
    create: {
      name: workspaceName,
      slug: workspaceSlug
    }
  });

  const configuredUsers = seedUsers.filter((user) => user.email && user.password);

  for (const user of configuredUsers) {
    const passwordHash = await bcrypt.hash(user.password as string, 12);
    await prisma.user.upsert({
      where: { email: user.email as string },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        workspaceId: workspace.id
      },
      create: {
        name: user.name,
        email: user.email as string,
        passwordHash,
        role: user.role,
        workspaceId: workspace.id
      }
    });
  }

  if (configuredUsers.length === 0) {
    console.log("Seed criou apenas o workspace. Configure PAYFLOW_LUCAS_* e PAYFLOW_ARTHUR_* para criar acessos.");
    return;
  }

  console.log(`Seed concluido: ${configuredUsers.map((user) => user.name).join(", ")} no workspace ${workspace.slug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

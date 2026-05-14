import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWorkspace, setSessionCookie } from "@/server/services/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados do cadastro" }, { status: 422 });
  }

  try {
    const user = await registerWorkspace(parsed.data);
    await setSessionCookie(user);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel criar o workspace" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, setSessionCookie } from "@/server/services/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de login inválidos" }, { status: 422 });
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  await setSessionCookie(user);
  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}

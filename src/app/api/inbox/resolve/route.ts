import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveConversation } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({
  conversationId: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.role === "VIEWER") return NextResponse.json({ error: "Usuario sem permissao para resolver atendimento." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Informe a conversa." }, { status: 422 });

  try {
    const conversation = await resolveConversation(parsed.data.conversationId, { id: auth.user.sub, name: auth.user.name }, auth.user.workspaceId);
    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao resolver atendimento." }, { status: 400 });
  }
}

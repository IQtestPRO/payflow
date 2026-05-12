import { NextResponse } from "next/server";
import { sendMessageSchema } from "@/server/validation/schemas";
import { requireApiUser } from "@/server/services/api-auth";
import { sendConversationMessage } from "@/server/services/messaging";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = sendMessageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida" }, { status: 422 });
  }

  try {
    const result = await sendConversationMessage(parsed.data.conversationId, parsed.data.body, auth.user.workspaceId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao enviar mensagem" }, { status: 400 });
  }
}

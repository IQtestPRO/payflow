import { NextResponse } from "next/server";
import { z } from "zod";
import { getInboxChargePreview } from "@/server/services/inbox-charges";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({
  conversationId: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Informe a conversa para preparar a cobranca." }, { status: 422 });

  try {
    const preview = await getInboxChargePreview(parsed.data.conversationId, auth.user.workspaceId);
    return NextResponse.json({ ok: true, ...preview });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao preparar cobranca." }, { status: 422 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendInboxChargeArtifact } from "@/server/services/inbox-charges";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({
  conversationId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  artifact: z.enum(["qr_code", "pix_copy_paste"])
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.role === "VIEWER") return NextResponse.json({ error: "Usuario sem permissao para enviar cobrancas." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Informe a cobranca e o item a enviar." }, { status: 422 });

  try {
    const result = await sendInboxChargeArtifact(parsed.data, auth.user.workspaceId, {
      id: auth.user.sub,
      name: auth.user.name
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao enviar cobranca." }, { status: 422 });
  }
}

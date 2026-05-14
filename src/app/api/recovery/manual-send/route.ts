import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/server/services/api-auth";
import { sendManualRecoveryArtifact } from "@/server/services/recovery";

const schema = z.object({
  paymentId: z.string().trim().min(1),
  artifact: z.enum(["pix_copy_paste", "qr_code", "checkout_url"])
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.role === "VIEWER") return NextResponse.json({ error: "Usuario sem permissao para enviar recuperacao." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Informe pagamento e item de recuperacao." }, { status: 422 });

  try {
    const result = await sendManualRecoveryArtifact(parsed.data, auth.user.workspaceId, {
      id: auth.user.sub,
      name: auth.user.name
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao enviar recuperacao." }, { status: 422 });
  }
}

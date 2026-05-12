import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/server/services/api-auth";
import { sendRecoveryForPaymentNow } from "@/server/services/recovery";

const schema = z.object({ paymentId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Pagamento inválido" }, { status: 422 });

  try {
    return NextResponse.json(await sendRecoveryForPaymentNow(parsed.data.paymentId, auth.user.workspaceId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao enviar recuperação" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/server/services/api-auth";
import { pauseRecoveryForPayment } from "@/server/services/recovery";

const schema = z.object({ paymentId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Pagamento inválido" }, { status: 422 });
  return NextResponse.json(await pauseRecoveryForPayment(parsed.data.paymentId, auth.user.workspaceId));
}

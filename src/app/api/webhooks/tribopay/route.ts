import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security";
import { processTriboPayWebhookPayload } from "@/server/services/webhooks";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-tribopay-signature") ?? request.headers.get("x-signature");
  const valid = await verifyHmacSignature(process.env.TRIBOPAY_WEBHOOK_SECRET, raw, signature);
  if (!valid) return NextResponse.json({ error: "Assinatura invalida" }, { status: 401 });

  try {
    return NextResponse.json(await processTriboPayWebhookPayload(JSON.parse(raw)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook TriboPay invalido" }, { status: 422 });
  }
}

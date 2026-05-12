import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security";
import { processUtmifyWebhookPayload } from "@/server/services/webhooks";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-utmify-signature") ?? request.headers.get("x-signature");
  const valid = await verifyHmacSignature(process.env.UTMIFY_WEBHOOK_SECRET, raw, signature);
  if (!valid) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  try {
    return NextResponse.json(await processUtmifyWebhookPayload(JSON.parse(raw)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook Utmify inválido" }, { status: 422 });
  }
}

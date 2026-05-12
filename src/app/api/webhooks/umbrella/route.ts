import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security";
import { processUmbrellaWebhookPayload } from "@/server/services/webhooks";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-umbrella-signature") ?? request.headers.get("x-signature");
  const valid = await verifyHmacSignature(process.env.UMBRELLA_WEBHOOK_SECRET, raw, signature);
  if (!valid) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  try {
    return NextResponse.json(await processUmbrellaWebhookPayload(JSON.parse(raw)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook Umbrella inválido" }, { status: 422 });
  }
}

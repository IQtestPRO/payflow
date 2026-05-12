import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security";
import { processWhatsAppWebhookPayload } from "@/server/services/webhooks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Token de verificação inválido" }, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? request.headers.get("x-signature");
  const valid = await verifyHmacSignature(process.env.WHATSAPP_WEBHOOK_SECRET, raw, signature);
  if (!valid) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  const payload = JSON.parse(raw);
  const result = await processWhatsAppWebhookPayload(payload);
  return NextResponse.json(result);
}

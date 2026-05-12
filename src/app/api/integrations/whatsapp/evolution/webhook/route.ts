import { NextResponse } from "next/server";
import { EvolutionWhatsAppProvider, evolutionWebhookUrl } from "@/providers/whatsapp/evolution";
import { requireApiUser } from "@/server/services/api-auth";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  try {
    const provider = new EvolutionWhatsAppProvider();
    const result = await provider.setWebhook(evolutionWebhookUrl());
    return NextResponse.json({ ok: true, result, webhookUrl: evolutionWebhookUrl() });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao configurar webhook Evolution"
      },
      { status: 400 }
    );
  }
}

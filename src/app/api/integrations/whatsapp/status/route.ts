import { NextResponse } from "next/server";
import { evolutionWebhookUrl, getEvolutionConfig } from "@/providers/whatsapp/evolution";
import { requireApiUser } from "@/server/services/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const provider = process.env.WHATSAPP_PROVIDER || "evolution";
  const hasAccessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const hasPhoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "payflow-whatsapp-local";
  const webhookSecretConfigured = Boolean(process.env.WHATSAPP_WEBHOOK_SECRET);
  const evolution = getEvolutionConfig();
  const hasEvolutionBaseUrl = Boolean(process.env.EVOLUTION_API_BASE_URL);
  const hasEvolutionApiKey = Boolean(process.env.EVOLUTION_API_KEY);
  const hasEvolutionInstanceName = Boolean(process.env.EVOLUTION_INSTANCE_NAME);

  return NextResponse.json({
    provider,
    readyForMetaTest: provider === "meta" && hasAccessToken && hasPhoneNumberId && Boolean(verifyToken),
    readyForEvolutionLocal: provider === "evolution" && hasEvolutionBaseUrl && hasEvolutionApiKey && hasEvolutionInstanceName,
    hasAccessToken,
    hasPhoneNumberId,
    hasVerifyToken: Boolean(verifyToken),
    hasEvolutionBaseUrl,
    hasEvolutionApiKey,
    hasEvolutionInstanceName,
    evolutionBaseUrl: evolution.baseUrl,
    evolutionInstanceName: evolution.instanceName,
    webhookSecretConfigured,
    verifyToken,
    webhookUrl: evolutionWebhookUrl(),
    recommendedTemplate: "hello_world",
    recommendedLanguage: "en_US"
  });
}

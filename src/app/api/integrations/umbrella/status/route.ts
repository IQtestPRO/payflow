import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { requireApiUser } from "@/server/services/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const apiBaseUrl = process.env.UMBRELLA_API_BASE_URL || "";
  const hasApiBaseUrl = Boolean(apiBaseUrl);
  const hasApiKey = Boolean(process.env.UMBRELLA_API_KEY);
  const webhookSecretConfigured = Boolean(process.env.UMBRELLA_WEBHOOK_SECRET);

  return NextResponse.json({
    provider: "umbrella",
    readyForRealApi: hasApiBaseUrl && hasApiKey,
    hasApiBaseUrl,
    hasApiKey,
    webhookSecretConfigured,
    apiBaseUrl,
    webhookUrl: `${appUrl().replace(/\/$/, "")}/api/webhooks/umbrella`,
    requiredHeaders: {
      api: ["x-api-key", "User-Agent: UMBRELLAB2B/1.0"],
      webhookSignature: webhookSecretConfigured ? ["x-umbrella-signature"] : []
    }
  });
}

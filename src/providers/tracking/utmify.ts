import type { NormalizedTrackingWebhook, TrackingProvider } from "@/providers/tracking/types";
import { utmifyWebhookSchema } from "@/server/validation/schemas";

export class UtmifyProvider implements TrackingProvider {
  name = "utmify";

  normalizeWebhook(payload: unknown): NormalizedTrackingWebhook {
    const parsed = utmifyWebhookSchema.parse(payload);
    return {
      eventType: parsed.eventType,
      externalId: parsed.clickId ?? parsed.paymentId ?? null,
      customerPhone: parsed.customerPhone,
      customerEmail: parsed.customerEmail,
      paymentId: parsed.paymentId,
      offerId: parsed.offerId,
      source: parsed.source,
      medium: parsed.medium,
      campaign: parsed.campaign,
      content: parsed.content,
      term: parsed.term,
      fbclid: parsed.fbclid,
      clickId: parsed.clickId,
      raw: payload
    };
  }

  async testConnection() {
    return {
      ok: Boolean(process.env.UTMIFY_API_BASE_URL && process.env.UTMIFY_API_KEY),
      status: process.env.UTMIFY_API_KEY ? "Credenciais Utmify presentes" : "Provider mock aguardando credenciais"
    };
  }
}

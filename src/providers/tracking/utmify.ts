import type { NormalizedTrackingWebhook, TrackingProvider, UtmifyOrderPayload } from "@/providers/tracking/types";
import { utmifyWebhookSchema } from "@/server/validation/schemas";

const DEFAULT_UTMIFY_ORDERS_URL = "https://api.utmify.com.br/api-credentials/orders";

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
    const apiKey = process.env.UTMIFY_API_KEY || process.env.UTMIFY_API_TOKEN;

    return {
      ok: Boolean(apiKey),
      status: apiKey ? "Credenciais Utmify presentes" : "Provider mock aguardando credenciais"
    };
  }

  async sendOrder(payload: UtmifyOrderPayload) {
    const apiKey = utmifyApiKey();
    if (!apiKey) {
      return {
        ok: false,
        skipped: true,
        status: "Configure UTMIFY_API_KEY para enviar pedidos para a Utmify."
      };
    }

    const response = await fetch(utmifyOrdersUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": apiKey
      },
      body: JSON.stringify(payload)
    });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(readUtmifyError(json) ?? `Utmify respondeu ${response.status}`);
    }

    return {
      ok: true,
      skipped: false,
      status: "Pedido enviado para Utmify",
      response: json
    };
  }
}

function utmifyApiKey() {
  return process.env.UTMIFY_API_KEY || process.env.UTMIFY_API_TOKEN;
}

function utmifyOrdersUrl() {
  const configured = process.env.UTMIFY_API_BASE_URL || process.env.UTMIFY_ENDPOINT;
  if (!configured) return DEFAULT_UTMIFY_ORDERS_URL;
  if (/\/api-credentials\/orders\/?$/.test(configured)) return configured;

  const baseUrl = configured.replace(/\/$/, "");
  return `${baseUrl}/api-credentials/orders`;
}

function readUtmifyError(value: unknown) {
  const record = objectValue(value);
  return stringValue(record?.message) ?? stringValue(record?.error) ?? stringValue(record?.detail) ?? null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

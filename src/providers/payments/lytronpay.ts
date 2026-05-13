import type { NormalizedPaymentWebhook, PaymentProvider } from "@/providers/payments/types";

export type LytronPayCreatePixChargeInput = Record<string, unknown>;
export type LytronPayCreatePayoutInput = Record<string, unknown>;

const DEFAULT_LYTRON_BASE_URL = "https://api.lytronpay.com/api/v1";

export class LytronPayProvider implements PaymentProvider {
  name = "lytronpay";

  normalizeWebhook(): NormalizedPaymentWebhook {
    throw new Error("Webhook LytronPay ainda nao implementado. Envie payload oficial e assinatura para ativar com seguranca.");
  }

  async testConnection() {
    if (!lytronAccessKey()) {
      return {
        ok: false,
        status: "Configure LYTRON_API_ACCESS_KEY"
      };
    }

    return {
      ok: true,
      status: "LytronPay com credencial presente. Validacao online exige TXID ou criacao controlada de cobranca."
    };
  }

  async createTransaction(input: LytronPayCreatePixChargeInput) {
    return lytronRequest("/v1/charges", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async getTransaction(txid: string) {
    return lytronRequest(`/v1/charges/${encodeURIComponent(txid)}`, {
      method: "GET"
    });
  }

  async createPayout(input: LytronPayCreatePayoutInput) {
    return lytronRequest("/v1/payouts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
}

async function lytronRequest(path: string, init: RequestInit) {
  const accessKey = lytronAccessKey();
  if (!accessKey) throw new Error("Configure LYTRON_API_ACCESS_KEY");

  const response = await fetch(lytronApiUrl(path), {
    ...init,
    headers: {
      "Api-Access-Key": accessKey,
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readLytronError(json) ?? `LytronPay respondeu ${response.status}`);
  }

  return json;
}

function lytronApiUrl(path: string) {
  const baseUrl = (process.env.LYTRON_API_BASE_URL || DEFAULT_LYTRON_BASE_URL).replace(/\/$/, "");
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (baseUrl.endsWith("/v1") && normalizedPath.startsWith("/v1/")) normalizedPath = normalizedPath.slice(3);
  return `${baseUrl}${normalizedPath}`;
}

function lytronAccessKey() {
  return process.env.LYTRON_API_ACCESS_KEY || process.env.LYTRON_API_KEY;
}

function readLytronError(value: unknown) {
  const record = objectValue(value);
  return stringValue(read(record, "message")) ?? stringValue(read(record, "error")) ?? stringValue(read(record, "detail")) ?? null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function read(value: unknown, key: string) {
  return objectValue(value)?.[key];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

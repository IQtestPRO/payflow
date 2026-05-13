import type { NormalizedPaymentWebhook, PaymentProvider } from "@/providers/payments/types";
import { createHmac } from "crypto";

export type LytronPayCreatePixChargeInput = {
  amount: number;
  description?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    document: {
      type: "cpf";
      number: string;
    };
  };
};
export type LytronPayCreatePayoutInput = Record<string, unknown>;

const DEFAULT_LYTRON_BASE_URL = "https://api.lytronpay.com/api/v1";
const VALIDATION_TXID = "payflow-validation";

export class LytronPayError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "LytronPayError";
  }
}

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

    try {
      await this.getTransaction(VALIDATION_TXID);
      return {
        ok: true,
        status: "LytronPay respondeu a consulta de validacao."
      };
    } catch (error) {
      if (error instanceof LytronPayError && error.status === 404) {
        return {
          ok: true,
          status: "LytronPay respondeu com 404 esperado para TXID de validacao. Credencial aceita."
        };
      }

      return {
        ok: false,
        status: error instanceof Error ? error.message : "Falha ao validar LytronPay"
      };
    }
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
  const body = typeof init.body === "string" ? init.body : undefined;

  const response = await fetch(lytronApiUrl(path), {
    ...init,
    headers: lytronHeaders(accessKey, init.headers, body)
  });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new LytronPayError(readLytronError(json) ?? `LytronPay respondeu ${response.status}`, response.status);
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

function lytronTransactionSecret() {
  return process.env.LYTRON_API_SECRET_HASH || process.env.LYTRON_TRANSACTION_SECRET;
}

function lytronTransactionHashHeader(body?: string) {
  const secret = lytronTransactionSecret();
  if (!secret || !body) return {};

  return {
    "Transaction-Hash": createHmac("sha256", secret).update(body).digest("hex")
  };
}

function lytronHeaders(accessKey: string, initHeaders?: HeadersInit, body?: string) {
  const headers = new Headers(initHeaders);
  headers.set("Api-Access-Key", accessKey);
  headers.set("Content-Type", "application/json");
  const transactionHash = lytronTransactionHashHeader(body)["Transaction-Hash"];
  if (transactionHash) headers.set("Transaction-Hash", transactionHash);
  return headers;
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

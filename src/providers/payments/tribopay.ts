import type { PaymentStatus } from "@/lib/types";
import type { NormalizedPaymentWebhook, PaymentProvider } from "@/providers/payments/types";
import { triboPayWebhookSchema } from "@/server/validation/schemas";

export type TriboPayPaymentMethod = "pix" | "credit_card" | "billet";

export type TriboPayCreateTransactionInput = {
  amount: number;
  offer_hash: string;
  payment_method: TriboPayPaymentMethod;
  customer: {
    name: string;
    email: string;
    phone_number: string;
    document: string;
    street_name?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  cart: Array<{
    product_hash: string;
    title: string;
    price: number;
    quantity: number;
    operation_type?: string;
    tangible: boolean;
  }>;
  card?: {
    number: string;
    holder_name: string;
    exp_month: string;
    exp_year: string;
    cvv: string;
  };
  installments?: number;
  expire_in_days?: number;
  transaction_origin?: string;
  tracking?: Record<string, unknown>;
  postback_url?: string;
};

const DEFAULT_TRIBOPAY_BASE_URL = "https://api.tribopay.com.br/api/public/v1";

const statusMap: Record<string, PaymentStatus> = {
  created: "CREATED",
  pending: "PENDING",
  waiting_payment: "WAITING_PAYMENT",
  waitingpayment: "WAITING_PAYMENT",
  pix_generated: "PIX_GENERATED",
  pixgenerated: "PIX_GENERATED",
  billet_generated: "BOLETO_GENERATED",
  boleto_generated: "BOLETO_GENERATED",
  boletogenerated: "BOLETO_GENERATED",
  failed: "FAILED",
  refused: "FAILED",
  expired: "EXPIRED",
  canceled: "CANCELLED",
  cancelled: "CANCELLED",
  paid: "PAID",
  approved: "PAID",
  refunded: "REFUNDED",
  chargeback: "CHARGEBACK",
  chargedback: "CHARGEBACK"
};

export class TriboPayProvider implements PaymentProvider {
  name = "tribopay";

  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook {
    const parsed = triboPayWebhookSchema.parse(payload);
    const record = unwrapTriboPayPayload(parsed);
    const metadata = parseMetadata(read(record, "metadata") ?? read(record, "tracking"));
    const firstCartItem = firstArrayItem(read(record, "cart"));

    const externalId =
      stringValue(read(record, "transaction_hash")) ??
      stringValue(read(record, "transactionHash")) ??
      stringValue(read(record, "hash")) ??
      stringValue(read(record, "id")) ??
      stringValue(read(record, "transaction_id")) ??
      stringValue(read(record, "transactionId")) ??
      stringValue(metadata.transactionHash) ??
      stringValue(metadata.transactionId);
    if (!externalId) throw new Error("Webhook TriboPay sem id externo");

    const rawStatus = stringValue(read(record, "status")) ?? stringValue(read(record, "transaction_status")) ?? stringValue(read(record, "transactionStatus"));
    if (!rawStatus) throw new Error("Webhook TriboPay sem status");

    const amount = normalizeCents(read(record, "amount") ?? read(record, "total_amount") ?? read(record, "totalAmount") ?? read(record, "value"));
    if (amount === null) throw new Error("Webhook TriboPay sem valor");

    const status = statusMap[normalizeStatusKey(rawStatus)] ?? "PENDING";
    const customer = objectValue(read(record, "customer"));
    const offerHash = stringValue(read(record, "offer_hash")) ?? stringValue(read(record, "offerHash")) ?? stringValue(metadata.offerHash);
    const productHash = stringValue(read(firstCartItem, "product_hash")) ?? stringValue(read(firstCartItem, "productHash"));

    return {
      eventType: `payment.${status.toLowerCase()}`,
      externalId,
      customer: {
        name: stringValue(read(customer, "name")),
        phone: stringValue(read(customer, "phone_number")) ?? stringValue(read(customer, "phone")),
        email: stringValue(read(customer, "email")),
        document: stringValue(read(customer, "document"))
      },
      payment: {
        workspaceId: "",
        customerId: null,
        offerId: offerHash ?? productHash ?? stringValue(metadata.offerId) ?? null,
        offerName: stringValue(read(firstCartItem, "title")) ?? stringValue(metadata.offerName) ?? null,
        provider: "TRIBOPAY",
        providerPaymentId: externalId,
        status,
        amount,
        currency: stringValue(read(record, "currency")) ?? "BRL",
        paymentMethod: stringValue(read(record, "payment_method")) ?? stringValue(read(record, "paymentMethod")),
        checkoutUrl:
          stringValue(read(record, "checkout_url")) ??
          stringValue(read(record, "checkoutUrl")) ??
          stringValue(read(record, "payment_url")) ??
          stringValue(read(record, "paymentUrl")) ??
          null,
        pixCode:
          stringValue(read(record, "pix_code")) ??
          stringValue(read(record, "pixCode")) ??
          stringValue(read(record, "qr_code")) ??
          stringValue(read(record, "qrCode")) ??
          stringValue(read(objectValue(read(record, "pix")), "code")) ??
          stringValue(read(objectValue(read(record, "pix")), "copy_paste")) ??
          stringValue(read(objectValue(read(record, "pix")), "copyPaste")) ??
          null,
        boletoUrl:
          stringValue(read(record, "billet_url")) ??
          stringValue(read(record, "boleto_url")) ??
          stringValue(read(record, "boletoUrl")) ??
          stringValue(read(objectValue(read(record, "billet")), "url")) ??
          stringValue(read(objectValue(read(record, "boleto")), "url")) ??
          null,
        paidAt: stringValue(read(record, "paid_at")) ?? stringValue(read(record, "paidAt")) ?? null,
        expiresAt: stringValue(read(record, "expires_at")) ?? stringValue(read(record, "expiresAt")) ?? null
      },
      raw: payload
    };
  }

  async testConnection() {
    if (!triboPayApiToken()) {
      return {
        ok: false,
        status: "Configure TRIBOPAY_API_TOKEN"
      };
    }

    try {
      await this.request("/balance", { method: "GET" });
      return {
        ok: true,
        status: "TriboPay conectada. API token aceito e saldo acessivel."
      };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof Error ? error.message : "Falha ao conectar com TriboPay"
      };
    }
  }

  async createTransaction(input: TriboPayCreateTransactionInput) {
    return this.request("/transactions", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async getTransaction(hash: string) {
    return this.request(`/transactions/${encodeURIComponent(hash)}`, { method: "GET" });
  }

  async listTransactions(query: { page?: number; per_page?: number; status?: string } = {}) {
    return this.request("/transactions", { method: "GET", query });
  }

  async refundTransaction(hash: string, amount?: number) {
    return this.request(`/transactions/${encodeURIComponent(hash)}/refund`, {
      method: "POST",
      body: JSON.stringify(amount === undefined ? {} : { amount })
    });
  }

  private async request(path: string, init: RequestInit & { query?: Record<string, string | number | undefined> }) {
    const token = triboPayApiToken();
    if (!token) throw new Error("Configure TRIBOPAY_API_TOKEN");

    const response = await fetch(triboPayApiUrl(path, token, init.query), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers
      }
    });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(readTriboPayError(json) ?? `TriboPay respondeu ${response.status}`);
    }

    return json;
  }
}

function triboPayApiUrl(path: string, apiToken: string, query?: Record<string, string | number | undefined>) {
  const baseUrl = (process.env.TRIBOPAY_API_BASE_URL || DEFAULT_TRIBOPAY_BASE_URL).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  url.searchParams.set("api_token", apiToken);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function triboPayApiToken() {
  return process.env.TRIBOPAY_API_TOKEN || process.env.TRIBOPAY_API_KEY;
}

function readTriboPayError(value: unknown) {
  const record = objectValue(value);
  return stringValue(read(record, "message")) ?? stringValue(read(record, "error")) ?? stringValue(read(record, "detail")) ?? null;
}

function unwrapTriboPayPayload(payload: unknown): Record<string, unknown> {
  const root = objectValue(payload);
  const data = read(root, "data");
  if (Array.isArray(data)) return objectValue(data[0]) ?? {};
  return objectValue(data) || objectValue(read(root, "payload")) || objectValue(read(root, "transaction")) || root || {};
}

function normalizeStatusKey(status: string) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeCents(value: unknown) {
  const amount = numberValue(value);
  if (amount === null) return null;
  return Number.isInteger(amount) ? amount / 100 : amount;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return objectValue(JSON.parse(value)) ?? {};
    } catch {
      return {};
    }
  }

  return objectValue(value) ?? {};
}

function firstArrayItem(value: unknown) {
  return Array.isArray(value) ? objectValue(value[0]) : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function read(value: unknown, key: string) {
  return objectValue(value)?.[key];
}

function stringValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

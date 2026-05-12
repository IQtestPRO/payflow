import type { PaymentStatus } from "@/lib/types";
import type { NormalizedPaymentWebhook, PaymentProvider } from "@/providers/payments/types";
import { umbrellaWebhookSchema } from "@/server/validation/schemas";

const statusMap: Record<string, PaymentStatus> = {
  processing: "PENDING",
  created: "CREATED",
  pending: "PENDING",
  waiting_payment: "WAITING_PAYMENT",
  waitingpayment: "WAITING_PAYMENT",
  pix_generated: "PIX_GENERATED",
  pixgenerated: "PIX_GENERATED",
  boleto_generated: "BOLETO_GENERATED",
  boletogenerated: "BOLETO_GENERATED",
  failed: "FAILED",
  refused: "FAILED",
  expired: "EXPIRED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  paid: "PAID",
  approved: "PAID",
  authorized: "PAID",
  authorised: "PAID",
  refunded: "REFUNDED",
  chargeback: "CHARGEBACK",
  chargedback: "CHARGEBACK",
  in_protest: "FAILED",
  inprotest: "FAILED"
};

export class UmbrellaProvider implements PaymentProvider {
  name = "umbrella";

  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook {
    const parsed = umbrellaWebhookSchema.parse(payload);
    const record = unwrapUmbrellaPayload(parsed);
    const metadata = parseMetadata(read(record, "metadata"));
    const firstItem = getFirstItem(record);

    const externalId =
      stringValue(read(record, "id")) ??
      stringValue(read(record, "transaction_id")) ??
      stringValue(read(record, "transactionId")) ??
      stringValue(read(record, "payment_id")) ??
      stringValue(read(record, "paymentId")) ??
      stringValue(read(record, "externalRef")) ??
      stringValue(metadata.orderId) ??
      stringValue(metadata.transactionId);
    if (!externalId) throw new Error("Webhook Umbrella sem id externo");

    const rawStatus = stringValue(read(record, "status"));
    if (!rawStatus) throw new Error("Webhook Umbrella sem status");

    const status = statusMap[normalizeStatusKey(rawStatus)] ?? "PENDING";
    const amount = normalizeAmount(record);
    if (amount === null) throw new Error("Webhook Umbrella sem valor");

    const customer = objectValue(read(record, "customer"));
    const document = read(customer, "document");
    const offer = objectValue(read(record, "offer"));

    return {
      eventType: `payment.${status.toLowerCase()}`,
      externalId,
      customer: {
        name: stringValue(read(customer, "name")),
        phone: stringValue(read(customer, "phone")),
        email: stringValue(read(customer, "email")),
        document: stringValue(document) ?? stringValue(read(objectValue(document), "number"))
      },
      payment: {
        workspaceId: "",
        customerId: null,
        offerId: stringValue(read(offer, "id")) ?? stringValue(read(offer, "slug")) ?? stringValue(metadata.linkId) ?? stringValue(metadata.orderId) ?? null,
        offerName: stringValue(read(offer, "name")) ?? stringValue(read(firstItem, "title")) ?? null,
        provider: "UMBRELLA",
        providerPaymentId: externalId,
        status,
        amount,
        currency: stringValue(read(record, "currency")) ?? "BRL",
        paymentMethod: stringValue(read(record, "payment_method")) ?? stringValue(read(record, "paymentMethod")),
        checkoutUrl:
          stringValue(read(record, "checkout_url")) ??
          stringValue(read(record, "checkoutUrl")) ??
          stringValue(read(record, "secureUrl")) ??
          null,
        pixCode:
          stringValue(read(record, "pix_code")) ??
          stringValue(read(record, "pixCode")) ??
          stringValue(read(objectValue(read(record, "pix")), "qrcode")) ??
          stringValue(read(objectValue(read(record, "pix")), "qrCode")) ??
          stringValue(read(objectValue(read(record, "pix")), "emv")) ??
          null,
        boletoUrl:
          stringValue(read(record, "boleto_url")) ??
          stringValue(read(record, "boletoUrl")) ??
          stringValue(read(objectValue(read(record, "boleto")), "url")) ??
          null,
        paidAt: stringValue(read(record, "paid_at")) ?? stringValue(read(record, "paidAt")) ?? null,
        expiresAt: stringValue(read(record, "expires_at")) ?? stringValue(read(record, "expiresAt")) ?? null
      },
      raw: payload
    };
  }

  async testConnection() {
    const baseUrl = process.env.UMBRELLA_API_BASE_URL;
    const apiKey = process.env.UMBRELLA_API_KEY;

    if (!baseUrl || !apiKey) {
      return {
        ok: false,
        status: "Configure UMBRELLA_API_BASE_URL e UMBRELLA_API_KEY"
      };
    }

    try {
      const response = await fetch(umbrellaPaymentMethodsUrl(baseUrl), {
        method: "GET",
        headers: umbrellaHeaders(apiKey)
      });

      if (!response.ok) {
        return {
          ok: false,
          status: `Umbrella respondeu ${response.status}`
        };
      }

      return {
        ok: true,
        status: "Umbrella conectada. API key aceita e metodos de pagamento acessiveis."
      };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof Error ? error.message : "Falha ao conectar com Umbrella"
      };
    }
  }
}

function umbrellaHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "User-Agent": "UMBRELLAB2B/1.0",
    "x-api-key": apiKey
  };
}

function umbrellaPaymentMethodsUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const path = normalizedBaseUrl.endsWith("/api") ? "/user/checkout/payment-methods" : "/api/user/checkout/payment-methods";
  return `${normalizedBaseUrl}${path}`;
}

function unwrapUmbrellaPayload(payload: unknown): Record<string, unknown> {
  const root = objectValue(payload);
  const data = read(root, "data");
  if (Array.isArray(data)) return objectValue(data[0]) ?? {};
  return objectValue(data) || objectValue(read(root, "payload")) || objectValue(read(root, "transaction")) || root || {};
}

function normalizeStatusKey(status: string) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeAmount(record: Record<string, unknown>) {
  const cents = numberValue(read(record, "amount_cents")) ?? numberValue(read(record, "amountInCents")) ?? numberValue(read(record, "value_cents"));
  if (cents !== null) return cents / 100;

  const amount = numberValue(read(record, "amount")) ?? numberValue(read(record, "totalAmount")) ?? numberValue(read(record, "amount_total"));
  if (amount === null) return null;

  const looksLikeUmbrellaApiTransaction = Boolean(
    read(record, "paymentMethod") || read(record, "postbackUrl") || read(record, "secureUrl") || read(record, "createdAt") || read(record, "updatedAt")
  );

  return looksLikeUmbrellaApiTransaction && Number.isInteger(amount) ? amount / 100 : amount;
}

function getFirstItem(record: Record<string, unknown>) {
  const items = read(record, "items");
  return Array.isArray(items) ? objectValue(items[0]) : null;
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

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function read(value: unknown, key: string) {
  return objectValue(value)?.[key];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

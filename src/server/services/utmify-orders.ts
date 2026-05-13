import type { CustomerRecord, OfferRecord, PaymentRecord, PaymentStatus } from "@/lib/types";
import { logger } from "@/lib/logger";
import type { UtmifyCurrency, UtmifyOrderPayload, UtmifyOrderStatus, UtmifyPaymentMethod } from "@/providers/tracking/types";
import { UtmifyProvider } from "@/providers/tracking/utmify";
import { recordTrackingEvent } from "@/server/repositories/payflow-repository";

type PaymentTrackingInput = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  clickId?: string | null;
  src?: string | null;
  sck?: string | null;
};

type SyncPaymentToUtmifyInput = {
  payment: PaymentRecord;
  customer?: Pick<CustomerRecord, "id" | "name" | "email" | "phone" | "document"> | null;
  offer?: Pick<OfferRecord, "id" | "name" | "slug" | "defaultUtmSource" | "defaultUtmMedium" | "defaultUtmCampaign"> | null;
  tracking?: PaymentTrackingInput | null;
  itemTitle?: string | null;
  rawSource?: unknown;
  isTest?: boolean;
};

export async function syncPaymentToUtmify(input: SyncPaymentToUtmifyInput) {
  const provider = new UtmifyProvider();
  const tracking = mergeTracking(input.tracking, input.rawSource);
  const payload = buildUtmifyOrderPayload({ ...input, tracking });

  if (!payload.customer.email) {
    logger.warn("Utmify sync skipped because customer email is missing", {
      paymentId: input.payment.id,
      providerPaymentId: input.payment.providerPaymentId
    });
    return { ok: false, skipped: true, status: "Cliente sem e-mail para envio Utmify" };
  }

  try {
    const result = await provider.sendOrder(payload);
    await recordTrackingEvent({
      workspaceId: input.payment.workspaceId,
      customerId: input.customer?.id ?? input.payment.customerId ?? null,
      paymentId: input.payment.id,
      offerId: input.offer?.id ?? input.payment.offerId ?? null,
      source: tracking.source ?? input.offer?.defaultUtmSource ?? null,
      medium: tracking.medium ?? input.offer?.defaultUtmMedium ?? null,
      campaign: tracking.campaign ?? input.offer?.defaultUtmCampaign ?? null,
      content: tracking.content ?? null,
      term: tracking.term ?? null,
      fbclid: tracking.fbclid ?? null,
      clickId: tracking.clickId ?? null,
      eventType: result.ok ? "utmify_order_sent" : "utmify_order_skipped",
      rawPayloadJson: {
        status: result.status,
        skipped: result.skipped,
        orderId: payload.orderId,
        payload: sanitizePayload(payload)
      }
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar pedido para Utmify";
    logger.warn("Utmify sync failed", {
      paymentId: input.payment.id,
      providerPaymentId: input.payment.providerPaymentId,
      error: message
    });
    await recordTrackingEvent({
      workspaceId: input.payment.workspaceId,
      customerId: input.customer?.id ?? input.payment.customerId ?? null,
      paymentId: input.payment.id,
      offerId: input.offer?.id ?? input.payment.offerId ?? null,
      source: tracking.source ?? input.offer?.defaultUtmSource ?? null,
      medium: tracking.medium ?? input.offer?.defaultUtmMedium ?? null,
      campaign: tracking.campaign ?? input.offer?.defaultUtmCampaign ?? null,
      content: tracking.content ?? null,
      term: tracking.term ?? null,
      fbclid: tracking.fbclid ?? null,
      clickId: tracking.clickId ?? null,
      eventType: "utmify_order_failed",
      rawPayloadJson: {
        error: message,
        orderId: payload.orderId,
        payload: sanitizePayload(payload)
      }
    });
    return { ok: false, skipped: false, status: message };
  }
}

export function buildUtmifyOrderPayload(input: SyncPaymentToUtmifyInput & { tracking?: PaymentTrackingInput | null }): UtmifyOrderPayload {
  const payment = input.payment;
  const amountInCents = Math.max(0, Math.round(payment.amount * 100));
  const tracking = input.tracking ?? {};
  const offerName = input.offer?.name ?? payment.offerName ?? input.itemTitle ?? "Pagamento PayFlow";

  return {
    orderId: `${payment.provider}:${payment.providerPaymentId}`,
    platform: "PayFlow",
    paymentMethod: mapPaymentMethod(payment),
    status: mapUtmifyStatus(payment.status),
    createdAt: formatUtmifyDate(payment.createdAt),
    approvedDate: payment.status === "PAID" ? formatUtmifyDate(payment.paidAt ?? payment.updatedAt) : null,
    refundedAt: payment.status === "REFUNDED" ? formatUtmifyDate(payment.updatedAt) : null,
    customer: {
      name: input.customer?.name ?? payment.customerName ?? "Cliente PayFlow",
      email: input.customer?.email ?? "",
      phone: input.customer?.phone ?? payment.customerPhone ?? null,
      document: input.customer?.document ?? null,
      country: "BR"
    },
    products: [
      {
        id: input.offer?.id ?? payment.offerId ?? payment.providerPaymentId,
        name: offerName,
        planId: input.offer?.id ?? payment.offerId ?? null,
        planName: input.offer?.name ?? payment.offerName ?? null,
        quantity: 1,
        priceInCents: amountInCents
      }
    ],
    trackingParameters: {
      src: tracking.src ?? tracking.clickId ?? null,
      sck: tracking.sck ?? null,
      utm_source: tracking.source ?? input.offer?.defaultUtmSource ?? null,
      utm_campaign: tracking.campaign ?? input.offer?.defaultUtmCampaign ?? null,
      utm_medium: tracking.medium ?? input.offer?.defaultUtmMedium ?? null,
      utm_content: tracking.content ?? null,
      utm_term: tracking.term ?? null
    },
    commission: {
      totalPriceInCents: amountInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: amountInCents,
      currency: mapCurrency(payment.currency)
    },
    isTest: input.isTest
  };
}

function mapUtmifyStatus(status: PaymentStatus): UtmifyOrderStatus {
  if (status === "PAID") return "paid";
  if (status === "REFUNDED") return "refunded";
  if (status === "CHARGEBACK") return "chargedback";
  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") return "refused";
  return "waiting_payment";
}

function mapPaymentMethod(payment: PaymentRecord): UtmifyPaymentMethod {
  const method = payment.paymentMethod?.toLowerCase() ?? "";
  if (method.includes("card") || method.includes("cartao") || method.includes("credito")) return "credit_card";
  if (method.includes("boleto")) return "boleto";
  if (method.includes("paypal")) return "paypal";
  if (method.includes("free")) return "free_price";
  if (method.includes("pix") || payment.pixCode) return "pix";
  if (payment.boletoUrl) return "boleto";
  return "pix";
}

function mapCurrency(value?: string | null): UtmifyCurrency {
  const normalized = value?.toUpperCase();
  if (normalized === "USD" || normalized === "EUR" || normalized === "GBP" || normalized === "ARS" || normalized === "CAD") return normalized;
  return "BRL";
}

function formatUtmifyDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString().replace("T", " ").slice(0, 19);
}

function mergeTracking(tracking?: PaymentTrackingInput | null, rawSource?: unknown): PaymentTrackingInput {
  const rawTracking = extractTracking(rawSource);
  return {
    ...rawTracking,
    ...tracking
  };
}

function extractTracking(value: unknown): PaymentTrackingInput {
  const root = objectValue(value) ?? {};
  const data = objectValue(root.data) ?? objectValue(root.payload) ?? objectValue(root.transaction) ?? root;
  const metadata = parseJsonObject(data.metadata) ?? parseJsonObject(root.metadata) ?? {};
  const metadataUtm = objectValue(metadata.utm) ?? {};
  const rawTracking = objectValue(data.tracking) ?? objectValue(root.tracking) ?? {};

  return {
    clickId: stringValue(metadata.clickId) ?? stringValue(rawTracking.clickId) ?? stringValue(data.clickId),
    fbclid: stringValue(metadata.fbclid) ?? stringValue(rawTracking.fbclid) ?? stringValue(data.fbclid),
    src: stringValue(metadata.src) ?? stringValue(rawTracking.src) ?? stringValue(data.src),
    sck: stringValue(metadata.sck) ?? stringValue(rawTracking.sck) ?? stringValue(data.sck),
    source:
      stringValue(metadataUtm.source) ??
      stringValue(rawTracking.utm_source) ??
      stringValue(rawTracking.utmSource) ??
      stringValue(data.utm_source),
    medium:
      stringValue(metadataUtm.medium) ??
      stringValue(rawTracking.utm_medium) ??
      stringValue(rawTracking.utmMedium) ??
      stringValue(data.utm_medium),
    campaign:
      stringValue(metadataUtm.campaign) ??
      stringValue(rawTracking.utm_campaign) ??
      stringValue(rawTracking.utmCampaign) ??
      stringValue(data.utm_campaign),
    content:
      stringValue(metadataUtm.content) ??
      stringValue(rawTracking.utm_content) ??
      stringValue(rawTracking.utmContent) ??
      stringValue(data.utm_content),
    term:
      stringValue(metadataUtm.term) ??
      stringValue(rawTracking.utm_term) ??
      stringValue(rawTracking.utmTerm) ??
      stringValue(data.utm_term)
  };
}

function sanitizePayload(payload: UtmifyOrderPayload) {
  return {
    orderId: payload.orderId,
    platform: payload.platform,
    paymentMethod: payload.paymentMethod,
    status: payload.status,
    isTest: payload.isTest,
    products: payload.products,
    trackingParameters: payload.trackingParameters,
    commission: payload.commission
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return objectValue(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return objectValue(value);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

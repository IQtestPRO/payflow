export type NormalizedTrackingWebhook = {
  eventType: string;
  externalId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  paymentId?: string | null;
  offerId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  clickId?: string | null;
  raw: unknown;
};

export interface TrackingProvider {
  name: string;
  normalizeWebhook(payload: unknown): NormalizedTrackingWebhook;
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

export type UtmifyOrderStatus = "waiting_payment" | "paid" | "refused" | "refunded" | "chargedback";
export type UtmifyPaymentMethod = "credit_card" | "boleto" | "pix" | "paypal" | "free_price";
export type UtmifyCurrency = "BRL" | "USD" | "EUR" | "GBP" | "ARS" | "CAD";

export type UtmifyOrderPayload = {
  orderId: string;
  platform: string;
  paymentMethod: UtmifyPaymentMethod;
  status: UtmifyOrderStatus;
  createdAt: string;
  approvedDate: string | null;
  refundedAt: string | null;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    document: string | null;
    country?: string;
    ip?: string;
  };
  products: Array<{
    id: string;
    name: string;
    planId: string | null;
    planName: string | null;
    quantity: number;
    priceInCents: number;
  }>;
  trackingParameters: {
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  commission: {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency?: UtmifyCurrency;
  };
  isTest?: boolean;
};

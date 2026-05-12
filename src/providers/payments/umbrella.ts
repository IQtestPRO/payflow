import type { PaymentStatus } from "@/lib/types";
import type { NormalizedPaymentWebhook, PaymentProvider } from "@/providers/payments/types";
import { umbrellaWebhookSchema } from "@/server/validation/schemas";

const statusMap: Record<string, PaymentStatus> = {
  created: "CREATED",
  pending: "PENDING",
  waiting_payment: "WAITING_PAYMENT",
  pix_generated: "PIX_GENERATED",
  boleto_generated: "BOLETO_GENERATED",
  failed: "FAILED",
  expired: "EXPIRED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  paid: "PAID",
  approved: "PAID",
  refunded: "REFUNDED",
  chargeback: "CHARGEBACK"
};

export class UmbrellaProvider implements PaymentProvider {
  name = "umbrella";

  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook {
    const parsed = umbrellaWebhookSchema.parse(payload);
    const externalId = parsed.id ?? parsed.transaction_id ?? parsed.payment_id;
    if (!externalId) throw new Error("Webhook Umbrella sem id externo");

    const status = statusMap[String(parsed.status).toLowerCase()] ?? "PENDING";

    return {
      eventType: `payment.${status.toLowerCase()}`,
      externalId,
      customer: {
        name: parsed.customer?.name,
        phone: parsed.customer?.phone,
        email: parsed.customer?.email,
        document: parsed.customer?.document
      },
      payment: {
        workspaceId: "",
        customerId: null,
        offerId: parsed.offer?.id ?? null,
        offerName: parsed.offer?.name ?? null,
        provider: "UMBRELLA",
        providerPaymentId: externalId,
        status,
        amount: parsed.amount,
        currency: parsed.currency,
        paymentMethod: parsed.payment_method,
        checkoutUrl: parsed.checkout_url,
        pixCode: parsed.pix_code,
        boletoUrl: parsed.boleto_url,
        paidAt: parsed.paid_at ?? null,
        expiresAt: parsed.expires_at ?? null
      },
      raw: payload
    };
  }

  async testConnection() {
    return {
      ok: Boolean(process.env.UMBRELLA_API_BASE_URL && process.env.UMBRELLA_API_KEY),
      status: process.env.UMBRELLA_API_KEY ? "Credenciais Umbrella presentes" : "Provider mock aguardando credenciais"
    };
  }
}

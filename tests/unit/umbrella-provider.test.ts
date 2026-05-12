import { describe, expect, it } from "vitest";
import { UmbrellaProvider } from "../../src/providers/payments/umbrella";

describe("UmbrellaProvider", () => {
  it("normalizes snake-case webhook payloads without converting amount", () => {
    const provider = new UmbrellaProvider();
    const normalized = provider.normalizeWebhook({
      id: "pay-local-1",
      status: "pending",
      amount: 297,
      currency: "BRL",
      payment_method: "pix",
      checkout_url: "https://checkout.local/pay",
      customer: {
        name: "Cliente Pix",
        phone: "5511888888888",
        email: "pix@example.com"
      },
      offer: {
        id: "offer-02",
        name: "Kit Funil WhatsApp"
      }
    });

    expect(normalized.externalId).toBe("pay-local-1");
    expect(normalized.payment.status).toBe("PENDING");
    expect(normalized.payment.amount).toBe(297);
    expect(normalized.payment.paymentMethod).toBe("pix");
    expect(normalized.payment.checkoutUrl).toBe("https://checkout.local/pay");
    expect(normalized.customer.phone).toBe("5511888888888");
  });

  it("normalizes Umbrella API-style nested payloads with cents and camelCase fields", () => {
    const provider = new UmbrellaProvider();
    const normalized = provider.normalizeWebhook({
      data: {
        id: "tx-umbrella-123",
        status: "APPROVED",
        amount: 29700,
        paymentMethod: "PIX",
        secureUrl: "https://checkout.umbrellapag.com/tx-umbrella-123",
        postbackUrl: "https://pay-flow.shop/api/webhooks/umbrella",
        pix: {
          qrCode: "0002010102122688"
        },
        metadata: JSON.stringify({
          linkId: "offer-02",
          orderId: "order-123"
        }),
        customer: {
          name: "Cliente API",
          phone: "5511999999999",
          email: "api@example.com",
          document: {
            number: "12345678900",
            type: "cpf"
          }
        },
        items: [
          {
            title: "Kit Funil WhatsApp"
          }
        ],
        createdAt: "2026-05-12T12:00:00.000Z",
        paidAt: "2026-05-12T12:03:00.000Z"
      }
    });

    expect(normalized.externalId).toBe("tx-umbrella-123");
    expect(normalized.eventType).toBe("payment.paid");
    expect(normalized.payment.status).toBe("PAID");
    expect(normalized.payment.amount).toBe(297);
    expect(normalized.payment.offerId).toBe("offer-02");
    expect(normalized.payment.offerName).toBe("Kit Funil WhatsApp");
    expect(normalized.payment.pixCode).toBe("0002010102122688");
    expect(normalized.payment.checkoutUrl).toBe("https://checkout.umbrellapag.com/tx-umbrella-123");
    expect(normalized.customer.document).toBe("12345678900");
  });
});

import { describe, expect, it } from "vitest";
import type { PaymentRecord } from "../../src/lib/types";
import { buildUtmifyOrderPayload } from "../../src/server/services/utmify-orders";

describe("buildUtmifyOrderPayload", () => {
  it("maps PayFlow payments to Utmify order payloads", () => {
    const payload = buildUtmifyOrderPayload({
      payment: paymentRecord({
        status: "PIX_GENERATED",
        paymentMethod: "PIX",
        pixCode: "000201",
        amount: 49.9
      }),
      customer: {
        id: "cust-1",
        name: "Cliente Real",
        email: "cliente@example.com",
        phone: "5519999999999",
        document: "12345678901"
      },
      offer: {
        id: "offer-1",
        name: "MusclePrime Brasil",
        slug: "muscleprime-brasil",
        defaultUtmSource: "meta",
        defaultUtmMedium: "cpc",
        defaultUtmCampaign: "x1"
      },
      tracking: {
        clickId: "PF-MUSCLE-123",
        content: "criativo-1",
        term: "whatsapp"
      },
      isTest: false
    });

    expect(payload).toMatchObject({
      orderId: "LYTRONPAY:tx-123",
      platform: "PayFlow",
      paymentMethod: "pix",
      status: "waiting_payment",
      customer: {
        email: "cliente@example.com"
      },
      trackingParameters: {
        src: "PF-MUSCLE-123",
        utm_source: "meta",
        utm_medium: "cpc",
        utm_campaign: "x1",
        utm_content: "criativo-1",
        utm_term: "whatsapp"
      },
      commission: {
        totalPriceInCents: 4990,
        gatewayFeeInCents: 0,
        userCommissionInCents: 4990,
        currency: "BRL"
      }
    });
  });

  it("maps paid and refund statuses to Utmify statuses", () => {
    expect(buildUtmifyOrderPayload({ payment: paymentRecord({ status: "PAID" }) }).status).toBe("paid");
    expect(buildUtmifyOrderPayload({ payment: paymentRecord({ status: "REFUNDED" }) }).status).toBe("refunded");
    expect(buildUtmifyOrderPayload({ payment: paymentRecord({ status: "CHARGEBACK" }) }).status).toBe("chargedback");
    expect(buildUtmifyOrderPayload({ payment: paymentRecord({ status: "FAILED" }) }).status).toBe("refused");
  });
});

function paymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "pay-1",
    workspaceId: "ws-1",
    customerId: "cust-1",
    customerName: "Cliente Real",
    customerPhone: "5519999999999",
    offerId: "offer-1",
    offerName: "MusclePrime Brasil",
    provider: "LYTRONPAY",
    providerPaymentId: "tx-123",
    status: "PIX_GENERATED",
    amount: 10,
    currency: "BRL",
    paymentMethod: "PIX",
    checkoutUrl: null,
    pixCode: null,
    boletoUrl: null,
    createdAt: "2026-05-13T22:00:00.000Z",
    updatedAt: "2026-05-13T22:00:00.000Z",
    paidAt: null,
    expiresAt: null,
    ...overrides
  };
}

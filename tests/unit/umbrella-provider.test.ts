import { afterEach, describe, expect, it, vi } from "vitest";
import { UmbrellaProvider, type UmbrellaCreateTransactionInput } from "../../src/providers/payments/umbrella";

describe("UmbrellaProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UMBRELLA_API_BASE_URL;
    delete process.env.UMBRELLA_API_KEY;
    delete process.env.UMBRELLA_USER_AGENT;
  });

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

  it("creates Umbrella transactions with configured headers and API path", async () => {
    process.env.UMBRELLA_API_BASE_URL = "https://api.example.com/api";
    process.env.UMBRELLA_API_KEY = "test-key";
    process.env.UMBRELLA_USER_AGENT = "UMBRELLAB2B/1.0";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "tx-created",
          status: "WAITING_PAYMENT",
          amount: 29700,
          paymentMethod: "PIX"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload: UmbrellaCreateTransactionInput = {
      amount: 29700,
      currency: "BRL",
      paymentMethod: "PIX",
      installments: 1,
      customer: {
        name: "Cliente Real",
        email: "cliente@example.com",
        document: {
          number: "12345678900",
          type: "CPF"
        },
        phone: "5511999999999",
        address: {
          street: "Avenida Paulista",
          streetNumber: "123",
          zipCode: "01310000",
          neighborhood: "Bela Vista",
          city: "Sao Paulo",
          state: "SP",
          country: "BR"
        }
      },
      items: [
        {
          title: "Kit Funil WhatsApp",
          unitPrice: 29700,
          quantity: 1,
          tangible: false
        }
      ],
      pix: { expiresInDays: 1 },
      postbackUrl: "https://pay-flow.shop/api/webhooks/umbrella",
      metadata: "{\"source\":\"payflow\"}",
      traceable: true,
      ip: "127.0.0.1"
    };

    await new UmbrellaProvider().createTransaction(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/user/transactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "User-Agent": "UMBRELLAB2B/1.0",
          "x-api-key": "test-key"
        }),
        body: JSON.stringify(payload)
      })
    );
  });
});

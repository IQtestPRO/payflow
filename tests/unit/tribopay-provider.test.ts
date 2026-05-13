import { afterEach, describe, expect, it, vi } from "vitest";
import { TriboPayProvider, type TriboPayCreateTransactionInput } from "../../src/providers/payments/tribopay";

describe("TriboPayProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TRIBOPAY_API_BASE_URL;
    delete process.env.TRIBOPAY_API_TOKEN;
    delete process.env.TRIBOPAY_API_KEY;
  });

  it("normalizes TriboPay webhook payloads with cents", () => {
    const provider = new TriboPayProvider();
    const normalized = provider.normalizeWebhook({
      transaction_hash: "tp-123",
      status: "paid",
      amount: 29700,
      currency: "BRL",
      payment_method: "pix",
      pix_code: "0002010102122688",
      customer: {
        name: "Cliente Tribo",
        phone_number: "5511999999999",
        email: "tribo@example.com",
        document: "12345678900"
      },
      cart: [
        {
          product_hash: "offer-x1",
          title: "Oferta X1",
          price: 29700,
          quantity: 1,
          tangible: false
        }
      ]
    });

    expect(normalized.externalId).toBe("tp-123");
    expect(normalized.eventType).toBe("payment.paid");
    expect(normalized.payment.provider).toBe("TRIBOPAY");
    expect(normalized.payment.status).toBe("PAID");
    expect(normalized.payment.amount).toBe(297);
    expect(normalized.payment.paymentMethod).toBe("pix");
    expect(normalized.payment.pixCode).toBe("0002010102122688");
    expect(normalized.payment.offerId).toBe("offer-x1");
    expect(normalized.payment.offerName).toBe("Oferta X1");
    expect(normalized.customer.document).toBe("12345678900");
  });

  it("creates transactions using api_token query auth", async () => {
    process.env.TRIBOPAY_API_BASE_URL = "https://api.example.com/api/public/v1";
    process.env.TRIBOPAY_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hash: "tp-created",
        status: "pending"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload: TriboPayCreateTransactionInput = {
      amount: 29700,
      offer_hash: "offer-x1",
      payment_method: "pix",
      customer: {
        name: "Cliente Real",
        email: "cliente@example.com",
        phone_number: "5511999999999",
        document: "12345678900"
      },
      cart: [
        {
          product_hash: "product-x1",
          title: "Oferta X1",
          price: 29700,
          quantity: 1,
          tangible: false
        }
      ],
      postback_url: "https://pay-flow.shop/api/webhooks/tribopay"
    };

    await new TriboPayProvider().createTransaction(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/public/v1/transactions?api_token=test-token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
      })
    );
  });

  it("tests connection through balance endpoint", async () => {
    process.env.TRIBOPAY_API_BASE_URL = "https://api.example.com/api/public/v1";
    process.env.TRIBOPAY_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: 1000 })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new TriboPayProvider().testConnection();

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/public/v1/balance?api_token=test-token",
      expect.objectContaining({ method: "GET" })
    );
  });
});

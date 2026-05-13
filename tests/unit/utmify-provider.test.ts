import { afterEach, describe, expect, it, vi } from "vitest";
import { UtmifyProvider } from "../../src/providers/tracking/utmify";
import type { UtmifyOrderPayload } from "../../src/providers/tracking/types";

describe("UtmifyProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UTMIFY_API_BASE_URL;
    delete process.env.UTMIFY_ENDPOINT;
    delete process.env.UTMIFY_API_KEY;
    delete process.env.UTMIFY_API_TOKEN;
  });

  it("skips order sync when API key is missing", async () => {
    const result = await new UtmifyProvider().sendOrder(orderPayload());

    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
  });

  it("sends orders to Utmify with x-api-token", async () => {
    process.env.UTMIFY_API_KEY = "utmify-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new UtmifyProvider().sendOrder(orderPayload());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.utmify.com.br/api-credentials/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-api-token": "utmify-token"
        })
      })
    );
  });

  it("accepts a custom Utmify endpoint", async () => {
    process.env.UTMIFY_API_KEY = "utmify-token";
    process.env.UTMIFY_API_BASE_URL = "https://api.example.com";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new UtmifyProvider().sendOrder(orderPayload());

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/api-credentials/orders", expect.any(Object));
  });
});

function orderPayload(): UtmifyOrderPayload {
  return {
    orderId: "LYTRONPAY:tx-123",
    platform: "PayFlow",
    paymentMethod: "pix",
    status: "waiting_payment",
    createdAt: "2026-05-13 22:00:00",
    approvedDate: null,
    refundedAt: null,
    customer: {
      name: "Cliente Real",
      email: "cliente@example.com",
      phone: "5511999999999",
      document: "12345678901",
      country: "BR"
    },
    products: [
      {
        id: "offer-1",
        name: "Oferta teste",
        planId: "offer-1",
        planName: "Oferta teste",
        quantity: 1,
        priceInCents: 100
      }
    ],
    trackingParameters: {
      src: "PF-TESTE-123",
      sck: null,
      utm_source: "meta",
      utm_campaign: "campanha",
      utm_medium: "cpc",
      utm_content: null,
      utm_term: null
    },
    commission: {
      totalPriceInCents: 100,
      gatewayFeeInCents: 0,
      userCommissionInCents: 100,
      currency: "BRL"
    },
    isTest: true
  };
}

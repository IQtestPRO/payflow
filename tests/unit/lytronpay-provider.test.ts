import { afterEach, describe, expect, it, vi } from "vitest";
import { LytronPayProvider } from "../../src/providers/payments/lytronpay";

describe("LytronPayProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LYTRON_API_BASE_URL;
    delete process.env.LYTRON_API_ACCESS_KEY;
    delete process.env.LYTRON_API_KEY;
  });

  it("creates Pix charges with Api-Access-Key header", async () => {
    process.env.LYTRON_API_BASE_URL = "https://api.example.com/api/v1";
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ txid: "tx-123", status: "pending" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      amount: 1000,
      payer: {
        name: "Cliente Real"
      }
    };

    await new LytronPayProvider().createTransaction(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/charges",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Api-Access-Key": "test-access-key",
          "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
      })
    );
  });

  it("fetches charges by txid", async () => {
    process.env.LYTRON_API_BASE_URL = "https://api.example.com/api/v1";
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ txid: "tx-123" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new LytronPayProvider().getTransaction("tx-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/charges/tx-123",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("reports configured credentials without making validation calls", async () => {
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";

    const result = await new LytronPayProvider().testConnection();

    expect(result.ok).toBe(true);
  });
});

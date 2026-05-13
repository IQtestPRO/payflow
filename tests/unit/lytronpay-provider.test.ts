import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { LytronPayProvider } from "../../src/providers/payments/lytronpay";

describe("LytronPayProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LYTRON_API_BASE_URL;
    delete process.env.LYTRON_API_ACCESS_KEY;
    delete process.env.LYTRON_API_KEY;
    delete process.env.LYTRON_API_SECRET_HASH;
    delete process.env.LYTRON_TRANSACTION_SECRET;
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
      customer: {
        name: "Cliente Real",
        document: { type: "cpf" as const, number: "12345678901" }
      }
    };

    await new LytronPayProvider().createTransaction(payload);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/api/v1/charges", expect.objectContaining({ method: "POST" }));
    expect(headers.get("Api-Access-Key")).toBe("test-access-key");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify(payload));
  });

  it("adds Transaction-Hash when Lytron secret hash is configured", async () => {
    process.env.LYTRON_API_BASE_URL = "https://api.example.com/api/v1";
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";
    process.env.LYTRON_API_SECRET_HASH = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ txid: "tx-123", status: "pending" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      amount: 12.5,
      customer: {
        name: "Cliente Real",
        document: { type: "cpf" as const, number: "12345678901" }
      }
    };
    const body = JSON.stringify(payload);

    await new LytronPayProvider().createTransaction(payload);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/api/v1/charges", expect.objectContaining({ body }));
    expect(headers.get("Transaction-Hash")).toBe(createHmac("sha256", "test-secret").update(body).digest("hex"));
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

  it("validates configured credentials with a safe read-only lookup", async () => {
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";
    process.env.LYTRON_API_BASE_URL = "https://api.example.com/api/v1";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Charge not found" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new LytronPayProvider().testConnection();

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/charges/payflow-validation",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("rejects validation when Lytron denies credentials", async () => {
    process.env.LYTRON_API_ACCESS_KEY = "test-access-key";
    process.env.LYTRON_API_BASE_URL = "https://api.example.com/api/v1";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new LytronPayProvider().testConnection();

    expect(result.ok).toBe(false);
  });
});

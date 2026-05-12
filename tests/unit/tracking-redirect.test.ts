import { describe, expect, it } from "vitest";
import { buildTrackingClickId, buildWhatsAppTrackingMessage, buildWhatsAppUrl, trackingParamsFromSearch } from "../../src/server/services/tracking-redirect";

describe("tracking redirect helpers", () => {
  it("builds compact PayFlow click ids from offer slugs", () => {
    expect(buildTrackingClickId("x1", "8k2q")).toBe("PF-X1-8K2Q");
    expect(buildTrackingClickId("Oferta Inicial WhatsApp", "abc123")).toBe("PF-OFERTAINICIA-ABC123");
  });

  it("extracts campaign parameters from redirect URLs", () => {
    const params = trackingParamsFromSearch(
      new URLSearchParams("utm_source=meta&utm_medium=cpc&utm_campaign=x1_teste&utm_content=criativo_01&fbclid=fb-123")
    );

    expect(params).toMatchObject({
      source: "meta",
      medium: "cpc",
      campaign: "x1_teste",
      content: "criativo_01",
      fbclid: "fb-123"
    });
  });

  it("builds a WhatsApp URL with the tracking message", () => {
    const message = buildWhatsAppTrackingMessage({
      offerSlug: "x1",
      clickId: "PF-X1-8K2Q",
      params: {
        campaign: "x1_teste",
        content: "criativo_01"
      }
    });
    const url = buildWhatsAppUrl("55 (19) 99999-4568", message);

    expect(message).toContain("X1");
    expect(message).toContain("PF-X1-8K2Q");
    expect(url).toContain("https://wa.me/5519999994568");
    expect(new URL(url).searchParams.get("text")).toContain("Codigo PF-X1-8K2Q");
  });
});

import { describe, expect, it } from "vitest";
import { getGatewayRegistry } from "../../src/server/gateways/registry";

describe("gateway registry", () => {
  it("registers all payment gateways with documentation metadata", () => {
    const gateways = getGatewayRegistry();

    expect(gateways.map((gateway) => gateway.id)).toEqual(["umbrella", "mangofy", "sigilopay", "lytronpay", "allowpayments"]);
    gateways.forEach((gateway) => {
      expect(gateway.name).toBeTruthy();
      expect(gateway.logo).toMatch(/^\/assets\//);
      expect(gateway.docsReferences.length).toBeGreaterThan(0);
      expect(gateway.docsNotes.length).toBeGreaterThan(0);
      expect(gateway.pendingQuestions.length).toBeGreaterThan(0);
      expect(gateway.safetyNotes.length).toBeGreaterThan(0);
    });
  });

  it("does not expose confirmed fake endpoints for gateways awaiting official docs", () => {
    const gateways = getGatewayRegistry().filter((gateway) => gateway.id !== "umbrella");

    gateways.forEach((gateway) => {
      expect(gateway.status).toBe("awaiting_docs");
      expect(gateway.api?.endpoints?.some((endpoint) => endpoint.confirmed)).not.toBe(true);
      expect(Object.values(gateway.capabilities).some((value) => value === "pending_docs")).toBe(true);
    });
  });
});

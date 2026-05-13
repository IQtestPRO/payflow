import { describe, expect, it } from "vitest";
import { getGatewayRegistry } from "../../src/server/gateways/registry";

describe("gateway registry", () => {
  it("registers all payment gateways with documentation metadata", () => {
    const gateways = getGatewayRegistry();

    expect(gateways.map((gateway) => gateway.id)).toEqual(["umbrella", "mangofy", "tribopay", "sigilopay", "lytronpay", "allowpayments"]);
    gateways.forEach((gateway) => {
      expect(gateway.name).toBeTruthy();
      expect(gateway.logo).toMatch(/^\/assets\//);
      expect(gateway.docsReferences.length).toBeGreaterThan(0);
      expect(gateway.docsNotes.length).toBeGreaterThan(0);
      expect(gateway.pendingQuestions.length).toBeGreaterThan(0);
      expect(gateway.safetyNotes.length).toBeGreaterThan(0);
    });
  });

  it("only exposes confirmed endpoints when public docs were mapped", () => {
    const gateways = getGatewayRegistry().filter((gateway) => gateway.id !== "umbrella");

    gateways.forEach((gateway) => {
      expect(["awaiting_docs", "pending_credentials", "configured"]).toContain(gateway.status);
      const confirmedEndpoints = gateway.api?.endpoints?.filter((endpoint) => endpoint.confirmed) ?? [];
      if (gateway.docsStatus === "ready_public_docs" || gateway.docsStatus === "readme_reference_public") {
        expect(confirmedEndpoints.length).toBeGreaterThan(0);
      } else {
        expect(confirmedEndpoints.length).toBe(0);
      }
      expect(Object.values(gateway.capabilities).some((value) => value === "pending_docs")).toBe(true);
    });
  });
});

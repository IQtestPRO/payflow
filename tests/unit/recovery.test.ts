import { describe, expect, it } from "vitest";
import { isPaymentRecoverable, isWithinAllowedWindow, nextAllowedSendAt, renderRecoveryTemplate } from "../../src/server/services/recovery";

describe("recovery rules", () => {
  it("marks only business-approved statuses as recoverable", () => {
    expect(isPaymentRecoverable({ status: "PENDING" })).toBe(true);
    expect(isPaymentRecoverable({ status: "PIX_GENERATED" })).toBe(true);
    expect(isPaymentRecoverable({ status: "PAID" })).toBe(false);
    expect(isPaymentRecoverable({ status: "REFUNDED" })).toBe(false);
  });

  it("respects offer rule for expired payments", () => {
    expect(isPaymentRecoverable({ status: "EXPIRED" }, { allowExpiredRecovery: true })).toBe(true);
    expect(isPaymentRecoverable({ status: "EXPIRED" }, { allowExpiredRecovery: false })).toBe(false);
  });

  it("blocks sends outside the allowed window and moves to next opening", () => {
    const blocked = new Date("2026-05-08T03:00:00-03:00");
    expect(isWithinAllowedWindow(blocked, 9, 20)).toBe(false);
    const next = nextAllowedSendAt(blocked, 9, 20);
    expect(next.getHours()).toBe(9);
  });

  it("renders recovery templates with customer, offer and checkout data", () => {
    const body = renderRecoveryTemplate("Oi {{customerName}}, conclua {{offerName}} em {{checkoutUrl}} por {{amount}}", {
      customer: { name: "Ana" } as never,
      offer: { name: "Mentoria", checkoutUrl: "https://checkout.local" } as never,
      payment: { amount: 1497, currency: "BRL", checkoutUrl: "https://pix.local" } as never
    });

    expect(body).toContain("Ana");
    expect(body).toContain("Mentoria");
    expect(body).toContain("https://pix.local");
    expect(body).toContain("R$");
  });
});

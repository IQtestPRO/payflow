import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRuntimeStore, runtimeStore } from "../../src/lib/runtime-store";
import { processTriboPayWebhookPayload, processUmbrellaWebhookPayload, processWhatsAppWebhookPayload } from "../../src/server/services/webhooks";

vi.hoisted(() => {
  process.env.DATABASE_URL = "";
  process.env.WHATSAPP_PROVIDER = "mock";
});

describe("webhook processing", () => {
  beforeEach(() => {
    resetRuntimeStore();
    runtimeStore.recoveryFlows.push({
      id: "flow-test",
      workspaceId: "payflow-workspace",
      offerId: null,
      name: "Fluxo de teste",
      status: "ACTIVE",
      firstDelayMinutes: 15,
      secondDelayMinutes: 180,
      thirdDelayMinutes: 1440,
      maxAttempts: 3,
      allowedStartHour: 9,
      allowedEndHour: 20,
      template1: "Teste 1",
      template2: "Teste 2",
      template3: "Teste 3",
      stopOnPaid: true
    });
  });

  it("creates customer, conversation and inbound message from WhatsApp webhook", async () => {
    const result = await processWhatsAppWebhookPayload({
      phone: "551188887777",
      name: "Webhook Cliente",
      text: "Oi, preciso de ajuda no pagamento",
      messageId: "wa-test-1"
    });

    expect(result.received).toBe(1);
    expect(runtimeStore.customers.some((customer) => customer.phone === "551188887777")).toBe(true);
    expect(runtimeStore.conversations.some((conversation) => conversation.messages.some((message) => message.providerMessageId === "wa-test-1"))).toBe(true);
  });

  it("schedules recovery attempts for a pending Umbrella payment", async () => {
    const paymentId = `umb-test-${Date.now()}`;
    const result = await processUmbrellaWebhookPayload({
      id: paymentId,
      status: "pending",
      amount: 297,
      currency: "BRL",
      payment_method: "pix",
      checkout_url: "https://checkout.local/teste",
      customer: {
        name: "Cliente Pendente",
        phone: "551177776666",
        email: "pendente@example.com"
      },
      offer: {
        id: "offer-02",
        name: "Kit Funil WhatsApp"
      }
    });

    expect(result).toHaveProperty("payment");
    const createdPayment = "payment" in result ? result.payment : null;
    if (!createdPayment) throw new Error("Payment was not created");
    expect(runtimeStore.recoveryAttempts.some((attempt) => attempt.paymentId === createdPayment.id && attempt.status === "SCHEDULED")).toBe(true);
  });

  it("marks pending recovery as converted when Umbrella sends paid status", async () => {
    const paymentId = `umb-converted-${Date.now()}`;
    const pending = await processUmbrellaWebhookPayload({
      id: paymentId,
      status: "pending",
      amount: 497,
      currency: "BRL",
      customer: { name: "Cliente Convertido", phone: "551166665555" },
      offer: { id: "offer-05", name: "Diagnóstico Express de Funil" }
    });
    const pendingPayment = "payment" in pending ? pending.payment : null;
    if (!pendingPayment) throw new Error("Payment was not created");

    await processUmbrellaWebhookPayload({
      id: paymentId,
      status: "paid",
      amount: 497,
      currency: "BRL",
      paid_at: new Date().toISOString(),
      customer: { name: "Cliente Convertido", phone: "551166665555" },
      offer: { id: "offer-05", name: "Diagnóstico Express de Funil" }
    });

    expect(runtimeStore.recoveryAttempts.filter((attempt) => attempt.paymentId === pendingPayment.id).every((attempt) => attempt.status === "CONVERTED")).toBe(true);
  });

  it("schedules recovery attempts for a pending TriboPay payment", async () => {
    const paymentId = `tribo-test-${Date.now()}`;
    const result = await processTriboPayWebhookPayload({
      transaction_hash: paymentId,
      status: "pending",
      amount: 19700,
      currency: "BRL",
      payment_method: "pix",
      customer: {
        name: "Cliente TriboPay",
        phone_number: "551155554444",
        email: "tribo@example.com",
        document: "12345678900"
      },
      cart: [
        {
          product_hash: "offer-02",
          title: "Kit Funil WhatsApp",
          price: 19700,
          quantity: 1,
          tangible: false
        }
      ]
    });

    expect(result).toHaveProperty("payment");
    const createdPayment = "payment" in result ? result.payment : null;
    if (!createdPayment) throw new Error("Payment was not created");
    expect(createdPayment.provider).toBe("TRIBOPAY");
    expect(createdPayment.amount).toBe(197);
    expect(runtimeStore.recoveryAttempts.some((attempt) => attempt.paymentId === createdPayment.id && attempt.status === "SCHEDULED")).toBe(true);
  });
});

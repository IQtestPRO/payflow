import { describe, expect, it } from "vitest";
import type { ConversationRecord, CustomerRecord, OfferRecord } from "../../src/lib/types";
import { NOT_FOUND_LABEL, buildInboxChargeDraft, parseMoneyAmount } from "../../src/server/services/inbox-charge-parser";

describe("inbox charge parser", () => {
  it("prefills customer, offer and tracking data from conversation context", () => {
    const draft = buildInboxChargeDraft({
      conversation: conversationRecord([
        "Ola, tenho interesse em MusclePrime Brasil. Codigo PF-MUSCLE-ABC123.",
        "Meu CPF e 123.456.789-01 e meu email cliente@example.com",
        "Endereco: Rua Alpha, 123, bairro Centro, cidade Campinas, uf SP, CEP 13010-001",
        "utm_source=meta&utm_medium=cpc&utm_campaign=x1_whatsapp&utm_content=criativo_01"
      ]),
      customer: customerRecord(),
      offer: offerRecord()
    });

    expect(draft.name).toBe("Lucas Palmeira");
    expect(draft.phone).toBe("5519987264568");
    expect(draft.email).toBe("cliente@example.com");
    expect(draft.document).toBe("12345678901");
    expect(draft.product).toBe("MusclePrime Brasil");
    expect(draft.amount).toBe("297.00");
    expect(draft.address.zipCode).toBe("13010-001");
    expect(draft.tracking).toMatchObject({
      clickId: "PF-MUSCLE-ABC123",
      source: "meta",
      medium: "cpc",
      campaign: "x1_whatsapp",
      content: "criativo_01"
    });
  });

  it("marks missing fields with the product label and keeps them editable", () => {
    const draft = buildInboxChargeDraft({
      conversation: conversationRecord(["Oskeyyyyy"]),
      customer: null,
      offer: null
    });

    expect(draft.document).toBe("Não encontrado");
    expect(draft.product).toBe("Não encontrado");
    expect(draft.fieldState.document.found).toBe(false);
    expect(draft.fieldState.product.source).toBe("fallback");
  });

  it("prefers explicit product and amount labels over generic WhatsApp intent text", () => {
    const draft = buildInboxChargeDraft({
      conversation: conversationRecord([
        [
          "Ola, vim do anuncio da MusclePrime Brasil e quero atendimento pelo WhatsApp.",
          "",
          "Produto: MusclePrime Brasil",
          "Valor: 9,90",
          "Tracking: utm_source=meta&utm_medium=cpc&utm_campaign=muscleprime_x1_realtest&pf_click_id=PF-MPBR-REAL001"
        ].join("\n")
      ]),
      customer: null,
      offer: null
    });

    expect(draft.product).toBe("MusclePrime Brasil");
    expect(draft.amount).toBe("9.90");
    expect(draft.tracking).toMatchObject({
      source: "meta",
      medium: "cpc",
      campaign: "muscleprime_x1_realtest",
      clickId: "PF-MPBR-REAL001"
    });
  });

  it("does not treat generic WhatsApp service intent as a product or amount", () => {
    const draft = buildInboxChargeDraft({
      conversation: conversationRecord(["Ola, vim do anuncio da MusclePrime Brasil e quero atendimento pelo WhatsApp. Codigo PF-MPBR-REAL002."]),
      customer: null,
      offer: null
    });

    expect(draft.product).toBe(NOT_FOUND_LABEL);
    expect(draft.amount).toBe(NOT_FOUND_LABEL);
    expect(draft.tracking.clickId).toBe("PF-MPBR-REAL002");
  });

  it("parses Brazilian currency values safely", () => {
    expect(parseMoneyAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoneyAmount("297,00")).toBe(297);
    expect(parseMoneyAmount("Não encontrado")).toBeNull();
  });
});

function conversationRecord(messages: string[]): ConversationRecord {
  return {
    id: "conv-1",
    workspaceId: "ws-1",
    customerId: "cust-1",
    customerName: "Lucas Palmeira",
    customerPhone: "+55 19 98726-4568",
    assignedToName: null,
    status: "OPEN",
    tags: ["WhatsApp"],
    linkedOfferId: "offer-1",
    linkedPaymentId: null,
    lastMessageAt: "2026-05-13T20:00:00.000Z",
    messages: messages.map((body, index) => ({
      id: `msg-${index}`,
      workspaceId: "ws-1",
      conversationId: "conv-1",
      customerId: "cust-1",
      direction: "INBOUND",
      body,
      status: "RECEIVED",
      providerMessageId: `wa-${index}`,
      createdAt: "2026-05-13T20:00:00.000Z"
    }))
  };
}

function customerRecord(): CustomerRecord {
  return {
    id: "cust-1",
    workspaceId: "ws-1",
    name: "Lucas Palmeira",
    phone: "5519987264568",
    email: null,
    document: null,
    tags: [],
    source: "WhatsApp",
    lastCampaign: null,
    lastOffer: null,
    totalPurchases: 0,
    status: "IN_SERVICE",
    doNotContact: false,
    createdAt: "2026-05-13T20:00:00.000Z",
    updatedAt: "2026-05-13T20:00:00.000Z"
  };
}

function offerRecord(): OfferRecord {
  return {
    id: "offer-1",
    workspaceId: "ws-1",
    productId: null,
    productName: "MusclePrime Brasil",
    name: "MusclePrime Brasil",
    slug: "muscleprime-brasil",
    price: 297,
    salesPageUrl: null,
    checkoutUrl: null,
    status: "ACTIVE",
    tags: [],
    trafficSourceDefault: "Meta Ads",
    defaultUtmSource: null,
    defaultUtmMedium: null,
    defaultUtmCampaign: null,
    visits: 0,
    checkoutStarts: 0,
    paymentsGenerated: 0,
    paymentsApproved: 0,
    abandonments: 0,
    recoveries: 0,
    allowExpiredRecovery: true,
    createdAt: "2026-05-13T20:00:00.000Z",
    updatedAt: "2026-05-13T20:00:00.000Z"
  };
}

import type {
  AppUser,
  CampaignRecord,
  ConversationRecord,
  CustomerRecord,
  IntegrationRecord,
  MessageRecord,
  OfferRecord,
  PaymentRecord,
  ProductRecord,
  RecoveryAttemptRecord,
  RecoveryFlowRecord,
  WorkspaceSummary
} from "@/lib/types";

export const DEMO_WORKSPACE_ID = "demo-workspace";
export const DEMO_USER_ID = "demo-admin";
export const DEMO_USER_EMAIL = "admin@payflow.local";
export const DEMO_USER_PASSWORD = "admin123";

export type TrackingEventRecord = {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  paymentId?: string | null;
  offerId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  clickId?: string | null;
  eventType: string;
  rawPayloadJson?: unknown;
  createdAt: string;
};

type DemoStore = {
  workspace: WorkspaceSummary;
  users: AppUser[];
  products: ProductRecord[];
  offers: OfferRecord[];
  customers: CustomerRecord[];
  conversations: ConversationRecord[];
  payments: PaymentRecord[];
  recoveryFlows: RecoveryFlowRecord[];
  recoveryAttempts: RecoveryAttemptRecord[];
  campaigns: CampaignRecord[];
  integrations: IntegrationRecord[];
  trackingEvents: TrackingEventRecord[];
  webhookExternalIds: Set<string>;
  auditLogs: Array<{ action: string; entity: string; entityId?: string; createdAt: string; metadata?: unknown }>;
};

const day = 24 * 60 * 60 * 1000;

function iso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function id(prefix: string, index: number) {
  return `${prefix}-${String(index).padStart(2, "0")}`;
}

function createDemoStore(): DemoStore {
  const workspace: WorkspaceSummary = {
    id: DEMO_WORKSPACE_ID,
    name: "PayFlow Demo",
    slug: "payflow-demo"
  };

  const users: AppUser[] = [
    {
      id: DEMO_USER_ID,
      name: "Admin PayFlow",
      email: DEMO_USER_EMAIL,
      role: "ADMIN",
      workspaceId: DEMO_WORKSPACE_ID
    },
    {
      id: "demo-attendant",
      name: "Marina Atendimento",
      email: "marina@payflow.local",
      role: "ATTENDANT",
      workspaceId: DEMO_WORKSPACE_ID
    }
  ];

  const products: ProductRecord[] = [
    ["prod-01", "Mentoria Growth", "Programa de mentoria para escalar ofertas digitais.", 1497, "Educação"],
    ["prod-02", "Kit Funil WhatsApp", "Templates e automações para recuperação no WhatsApp.", 297, "Templates"],
    ["prod-03", "Assinatura Analytics", "Painel mensal de métricas para tráfego pago.", 197, "SaaS"],
    ["prod-04", "Curso Tráfego Pago", "Treinamento prático para campanhas Meta Ads.", 697, "Curso"],
    ["prod-05", "Consultoria Express", "Diagnóstico rápido de funil e checkout.", 497, "Serviço"]
  ].map(([productId, name, description, price, category], index) => ({
    id: productId as string,
    workspaceId: DEMO_WORKSPACE_ID,
    name: name as string,
    description: description as string,
    price: price as number,
    category: category as string,
    status: index === 4 ? "PAUSED" : "ACTIVE",
    createdAt: iso(-20 * day + index * day),
    updatedAt: iso(-2 * day + index * 60 * 60 * 1000)
  }));

  const offers: OfferRecord[] = [
    {
      id: "offer-01",
      workspaceId: DEMO_WORKSPACE_ID,
      productId: "prod-01",
      productName: "Mentoria Growth",
      name: "Mentoria Growth - Turma Maio",
      slug: "mentoria-growth-maio",
      price: 1497,
      salesPageUrl: "https://payflow.local/mentoria",
      checkoutUrl: "https://checkout.local/mentoria-growth",
      status: "ACTIVE",
      tags: ["high-ticket", "whatsapp"],
      trafficSourceDefault: "Meta Ads",
      defaultUtmSource: "meta",
      defaultUtmMedium: "paid_social",
      defaultUtmCampaign: "mentoria_maio",
      visits: 3120,
      checkoutStarts: 418,
      paymentsGenerated: 138,
      paymentsApproved: 82,
      abandonments: 41,
      recoveries: 17,
      allowExpiredRecovery: true,
      createdAt: iso(-18 * day),
      updatedAt: iso(-2 * day)
    },
    {
      id: "offer-02",
      workspaceId: DEMO_WORKSPACE_ID,
      productId: "prod-02",
      productName: "Kit Funil WhatsApp",
      name: "Kit Funil WhatsApp",
      slug: "kit-funil-whatsapp",
      price: 297,
      salesPageUrl: "https://payflow.local/kit",
      checkoutUrl: "https://checkout.local/kit-funil",
      status: "ACTIVE",
      tags: ["baixo-ticket", "recuperacao"],
      trafficSourceDefault: "Utmify",
      defaultUtmSource: "meta",
      defaultUtmMedium: "cpc",
      defaultUtmCampaign: "kit_recuperacao",
      visits: 5120,
      checkoutStarts: 891,
      paymentsGenerated: 312,
      paymentsApproved: 201,
      abandonments: 73,
      recoveries: 29,
      allowExpiredRecovery: true,
      createdAt: iso(-16 * day),
      updatedAt: iso(-1 * day)
    },
    {
      id: "offer-03",
      workspaceId: DEMO_WORKSPACE_ID,
      productId: "prod-03",
      productName: "Assinatura Analytics",
      name: "Analytics Pro Mensal",
      slug: "analytics-pro-mensal",
      price: 197,
      salesPageUrl: "https://payflow.local/analytics",
      checkoutUrl: "https://checkout.local/analytics-pro",
      status: "ACTIVE",
      tags: ["assinatura", "dashboard"],
      trafficSourceDefault: "Meta Ads",
      defaultUtmSource: "meta",
      defaultUtmMedium: "paid_social",
      defaultUtmCampaign: "analytics_pro",
      visits: 2280,
      checkoutStarts: 320,
      paymentsGenerated: 104,
      paymentsApproved: 67,
      abandonments: 22,
      recoveries: 8,
      allowExpiredRecovery: false,
      createdAt: iso(-14 * day),
      updatedAt: iso(-1 * day)
    },
    {
      id: "offer-04",
      workspaceId: DEMO_WORKSPACE_ID,
      productId: "prod-04",
      productName: "Curso Tráfego Pago",
      name: "Curso Tráfego Pago 4 Semanas",
      slug: "curso-trafego-pago",
      price: 697,
      salesPageUrl: "https://payflow.local/trafego",
      checkoutUrl: "https://checkout.local/trafego",
      status: "PAUSED",
      tags: ["curso", "meta-ads"],
      trafficSourceDefault: "Meta Ads",
      defaultUtmSource: "meta",
      defaultUtmMedium: "cpc",
      defaultUtmCampaign: "curso_trafego",
      visits: 1720,
      checkoutStarts: 188,
      paymentsGenerated: 59,
      paymentsApproved: 31,
      abandonments: 19,
      recoveries: 5,
      allowExpiredRecovery: true,
      createdAt: iso(-12 * day),
      updatedAt: iso(-3 * day)
    },
    {
      id: "offer-05",
      workspaceId: DEMO_WORKSPACE_ID,
      productId: "prod-05",
      productName: "Consultoria Express",
      name: "Diagnóstico Express de Funil",
      slug: "diagnostico-express-funil",
      price: 497,
      salesPageUrl: "https://payflow.local/diagnostico",
      checkoutUrl: "https://checkout.local/diagnostico",
      status: "ACTIVE",
      tags: ["servico", "urgencia"],
      trafficSourceDefault: "Orgânico",
      defaultUtmSource: "instagram",
      defaultUtmMedium: "bio",
      defaultUtmCampaign: "diagnostico",
      visits: 940,
      checkoutStarts: 121,
      paymentsGenerated: 43,
      paymentsApproved: 26,
      abandonments: 11,
      recoveries: 4,
      allowExpiredRecovery: true,
      createdAt: iso(-10 * day),
      updatedAt: iso(-1 * day)
    }
  ];

  const names = [
    "Ana Lima",
    "Bruno Costa",
    "Camila Rocha",
    "Diego Martins",
    "Elisa Souza",
    "Felipe Alves",
    "Gabriela Nunes",
    "Henrique Dias",
    "Isabela Teixeira",
    "João Ribeiro",
    "Karen Lopes",
    "Lucas Melo",
    "Mariana Castro",
    "Nicolas Vieira",
    "Olívia Duarte",
    "Paulo Mendes",
    "Rafaela Cardoso",
    "Sofia Ramos",
    "Tiago Barros",
    "Vitória Freitas"
  ];

  const statuses: CustomerRecord["status"][] = [
    "PAYMENT_PENDING",
    "IN_SERVICE",
    "BUYER",
    "PAYMENT_PENDING",
    "RECOVERED",
    "NEW",
    "LOST",
    "BUYER",
    "PAYMENT_PENDING",
    "IN_SERVICE",
    "BUYER",
    "RECOVERED",
    "NEW",
    "PAYMENT_PENDING",
    "BUYER",
    "LOST",
    "NEW",
    "PAYMENT_PENDING",
    "IN_SERVICE",
    "BUYER"
  ];

  const customers: CustomerRecord[] = names.map((name, index) => ({
    id: id("cust", index + 1),
    workspaceId: DEMO_WORKSPACE_ID,
    name,
    phone: `55119999${String(1000 + index)}`,
    email: `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".")}@example.com`,
    document: index % 4 === 0 ? `000000000${index}` : null,
    tags: index % 3 === 0 ? ["pix", "lead-quente"] : index % 3 === 1 ? ["boleto"] : ["meta-ads"],
    source: index % 2 === 0 ? "Meta Ads" : "Instagram",
    lastCampaign: index % 2 === 0 ? "mentoria_maio" : "kit_recuperacao",
    lastOffer: offers[index % offers.length].name,
    totalPurchases: statuses[index] === "BUYER" || statuses[index] === "RECOVERED" ? 1 : 0,
    status: statuses[index],
    doNotContact: index === 15,
    createdAt: iso(-(15 - (index % 10)) * day),
    updatedAt: iso(-(index % 5) * 60 * 60 * 1000)
  }));

  const conversationStatuses: ConversationRecord["status"][] = [
    "UNANSWERED",
    "OPEN",
    "WAITING_CUSTOMER",
    "PAYMENT_PENDING",
    "RECOVERY",
    "RESOLVED",
    "OPEN",
    "PAYMENT_PENDING",
    "UNANSWERED",
    "RESOLVED"
  ];

  const conversations: ConversationRecord[] = customers.slice(0, 10).map((customer, index) => {
    const conversationId = id("conv", index + 1);
    const messageBase = new Date(Date.now() - (index + 1) * 45 * 60 * 1000);
    const messages: MessageRecord[] = [
      {
        id: `${conversationId}-msg-01`,
        workspaceId: DEMO_WORKSPACE_ID,
        conversationId,
        customerId: customer.id,
        direction: "INBOUND",
        body: index % 2 === 0 ? "Oi, gerei o Pix mas não encontrei o código aqui." : "Tenho uma dúvida antes de finalizar.",
        status: "RECEIVED",
        createdAt: new Date(messageBase.getTime()).toISOString()
      },
      {
        id: `${conversationId}-msg-02`,
        workspaceId: DEMO_WORKSPACE_ID,
        conversationId,
        customerId: customer.id,
        direction: "OUTBOUND",
        body: "Claro, vou te ajudar. Posso reenviar o link de pagamento por aqui.",
        status: "DELIVERED",
        providerMessageId: `mock-${conversationId}-02`,
        createdAt: new Date(messageBase.getTime() + 7 * 60 * 1000).toISOString()
      },
      {
        id: `${conversationId}-msg-03`,
        workspaceId: DEMO_WORKSPACE_ID,
        conversationId,
        customerId: customer.id,
        direction: index % 3 === 0 ? "INBOUND" : "OUTBOUND",
        body: index % 3 === 0 ? "Pode mandar, por favor?" : "Segue o link seguro para concluir: https://checkout.local/pagar",
        status: index % 3 === 0 ? "RECEIVED" : "SENT",
        providerMessageId: index % 3 === 0 ? null : `mock-${conversationId}-03`,
        createdAt: new Date(messageBase.getTime() + 18 * 60 * 1000).toISOString()
      }
    ];

    return {
      id: conversationId,
      workspaceId: DEMO_WORKSPACE_ID,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      assignedToName: index % 2 === 0 ? "Marina Atendimento" : null,
      status: conversationStatuses[index],
      tags: index % 2 === 0 ? ["pagamento", "whatsapp"] : ["duvida"],
      linkedOfferId: offers[index % offers.length].id,
      linkedPaymentId: id("pay", index + 1),
      lastMessageAt: messages[messages.length - 1]?.createdAt,
      messages
    };
  });

  const paymentStatuses: PaymentRecord["status"][] = [
    "PENDING",
    "WAITING_PAYMENT",
    "PIX_GENERATED",
    "BOLETO_GENERATED",
    "FAILED",
    "PAID",
    "PAID",
    "EXPIRED",
    "CANCELLED",
    "PAID",
    "PENDING",
    "PAID",
    "REFUNDED",
    "CHARGEBACK",
    "PAID",
    "WAITING_PAYMENT",
    "PAID",
    "EXPIRED",
    "PAID",
    "PENDING"
  ];

  const payments: PaymentRecord[] = paymentStatuses.map((status, index) => {
    const customer = customers[index % customers.length];
    const offer = offers[index % offers.length];
    return {
      id: id("pay", index + 1),
      workspaceId: DEMO_WORKSPACE_ID,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      offerId: offer.id,
      offerName: offer.name,
      provider: "UMBRELLA",
      providerPaymentId: `umb-demo-${index + 1}`,
      status,
      amount: offer.price,
      currency: "BRL",
      paymentMethod: index % 2 === 0 ? "pix" : "boleto",
      checkoutUrl: offer.checkoutUrl,
      pixCode: index % 2 === 0 ? `000201010212PAYFLOW${index}` : null,
      boletoUrl: index % 2 === 1 ? `https://boleto.local/${index + 1}` : null,
      createdAt: iso(-(index + 1) * 4 * 60 * 60 * 1000),
      updatedAt: iso(-(index + 1) * 30 * 60 * 1000),
      paidAt: status === "PAID" ? iso(-(index + 1) * 20 * 60 * 1000) : null,
      expiresAt: iso((index + 1) * 60 * 60 * 1000)
    };
  });

  const recoveryFlows: RecoveryFlowRecord[] = offers.slice(0, 3).map((offer, index) => ({
    id: id("flow", index + 1),
    workspaceId: DEMO_WORKSPACE_ID,
    offerId: offer.id,
    name: `Recuperação ${offer.name}`,
    status: "ACTIVE",
    firstDelayMinutes: 15,
    secondDelayMinutes: 180,
    thirdDelayMinutes: 1440,
    maxAttempts: 3,
    allowedStartHour: 9,
    allowedEndHour: 20,
    template1: "Oi, {{customerName}}! Vi que seu pagamento da {{offerName}} ficou pendente. Posso te ajudar a concluir?",
    template2: "Passando para reenviar o link seguro da {{offerName}}: {{checkoutUrl}}",
    template3: "Último lembrete gentil: sua condição da {{offerName}} ainda está disponível por pouco tempo. Quer finalizar agora?",
    stopOnPaid: true
  }));

  const recoverablePayments = payments.filter((payment) =>
    ["PENDING", "WAITING_PAYMENT", "PIX_GENERATED", "BOLETO_GENERATED", "FAILED"].includes(payment.status)
  );

  const recoveryAttempts: RecoveryAttemptRecord[] = recoverablePayments.slice(0, 5).flatMap((payment, index) => {
    const flow = recoveryFlows.find((item) => item.offerId === payment.offerId) ?? recoveryFlows[0];
    const firstAttempt: RecoveryAttemptRecord = {
      id: id("attempt", index * 2 + 1),
      workspaceId: DEMO_WORKSPACE_ID,
      recoveryFlowId: flow.id,
      paymentId: payment.id,
      customerId: payment.customerId,
      conversationId: conversations.find((conversation) => conversation.customerId === payment.customerId)?.id ?? null,
      status: index % 2 === 0 ? "SENT" : "SCHEDULED",
      attemptNumber: 1,
      templateUsed: flow.template1,
      scheduledAt: iso(-30 * 60 * 1000 + index * 5 * 60 * 1000),
      sentAt: index % 2 === 0 ? iso(-20 * 60 * 1000 + index * 5 * 60 * 1000) : null,
      customerName: payment.customerName,
      customerPhone: payment.customerPhone,
      offerName: payment.offerName,
      paymentStatus: payment.status,
      amount: payment.amount
    };

    const secondAttempt: RecoveryAttemptRecord = {
      ...firstAttempt,
      id: id("attempt", index * 2 + 2),
      attemptNumber: 2,
      status: "SCHEDULED",
      templateUsed: flow.template2,
      scheduledAt: iso((index + 2) * 60 * 60 * 1000),
      sentAt: null
    };

    return [firstAttempt, secondAttempt];
  });

  const campaigns: CampaignRecord[] = [
    {
      id: "camp-01",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "META_ADS",
      providerCampaignId: "238-payflow-1",
      name: "Mentoria Maio - Conversões",
      status: "ACTIVE",
      objective: "SALES",
      spend: 6420.55,
      impressions: 184200,
      clicks: 7420,
      ctr: 4.03,
      cpc: 0.87,
      cpm: 34.85,
      revenue: 36540,
      roas: 5.69,
      cpa: 78.3,
      dateStart: iso(-14 * day),
      dateEnd: iso()
    },
    {
      id: "camp-02",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "META_ADS",
      providerCampaignId: "238-payflow-2",
      name: "Kit Recuperação - Remarketing",
      status: "ACTIVE",
      objective: "SALES",
      spend: 2840.2,
      impressions: 93200,
      clicks: 5110,
      ctr: 5.48,
      cpc: 0.56,
      cpm: 30.47,
      revenue: 18117,
      roas: 6.38,
      cpa: 24.07,
      dateStart: iso(-10 * day),
      dateEnd: iso()
    },
    {
      id: "camp-03",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "MOCK",
      providerCampaignId: "mock-organic-1",
      name: "Diagnóstico Express - Conteúdo",
      status: "PAUSED",
      objective: "LEADS",
      spend: 620,
      impressions: 18200,
      clicks: 940,
      ctr: 5.16,
      cpc: 0.66,
      cpm: 34.07,
      revenue: 6461,
      roas: 10.42,
      cpa: 23.85,
      dateStart: iso(-9 * day),
      dateEnd: iso(-1 * day)
    }
  ];

  const integrations: IntegrationRecord[] = [
    {
      id: "int-whatsapp",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "WHATSAPP",
      status: "MOCK",
      lastSyncAt: iso(-11 * 60 * 1000),
      logs: ["Provider mock ativo", "Última mensagem enviada com sucesso"]
    },
    {
      id: "int-meta",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "META_ADS",
      status: "MOCK",
      lastSyncAt: iso(-45 * 60 * 1000),
      logs: ["Campanhas importadas do adapter mock"]
    },
    {
      id: "int-umbrella",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "UMBRELLA",
      status: "MOCK",
      lastSyncAt: iso(-23 * 60 * 1000),
      logs: ["Webhook pronto para receber pagamentos"]
    },
    {
      id: "int-utmify",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "UTMIFY",
      status: "MOCK",
      lastSyncAt: iso(-3 * 60 * 60 * 1000),
      logs: ["Eventos UTM vinculados a ofertas e pagamentos"]
    }
  ];

  const trackingEvents: TrackingEventRecord[] = payments.slice(0, 12).map((payment, index) => ({
    id: id("utm", index + 1),
    workspaceId: DEMO_WORKSPACE_ID,
    customerId: payment.customerId,
    paymentId: payment.id,
    offerId: payment.offerId,
    source: index % 2 === 0 ? "meta" : "instagram",
    medium: index % 2 === 0 ? "cpc" : "bio",
    campaign: index % 2 === 0 ? "mentoria_maio" : "kit_recuperacao",
    content: `criativo-${(index % 4) + 1}`,
    term: index % 3 === 0 ? "whatsapp" : "checkout",
    fbclid: `fbclid-${index + 1}`,
    clickId: `click-${index + 1}`,
    eventType: payment.status === "PAID" ? "purchase" : "checkout_started",
    rawPayloadJson: { demo: true },
    createdAt: iso(-(index + 1) * 2 * 60 * 60 * 1000)
  }));

  return {
    workspace,
    users,
    products,
    offers,
    customers,
    conversations,
    payments,
    recoveryFlows,
    recoveryAttempts,
    campaigns,
    integrations,
    trackingEvents,
    webhookExternalIds: new Set<string>(),
    auditLogs: []
  };
}

const globalForDemo = globalThis as unknown as { payflowDemoStore?: DemoStore };

export const demoStore = globalForDemo.payflowDemoStore ?? createDemoStore();

if (!globalForDemo.payflowDemoStore) {
  globalForDemo.payflowDemoStore = demoStore;
}

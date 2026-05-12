import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const workspaceId = "seed-workspace-payflow";
const adminPassword = "admin123";

const day = 24 * 60 * 60 * 1000;
const iso = (offset = 0) => new Date(Date.now() + offset);
const id = (prefix: string, index: number) => `${prefix}-${String(index).padStart(2, "0")}`;

async function main() {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { email: { in: ["admin@payflow.local", "marina@payflow.local"] } } });

  const workspace = await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: "PayFlow Demo",
      slug: "payflow-demo"
    }
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.createMany({
    data: [
      {
        id: "seed-admin",
        workspaceId: workspace.id,
        name: "Admin PayFlow",
        email: "admin@payflow.local",
        passwordHash,
        role: "ADMIN"
      },
      {
        id: "seed-attendant",
        workspaceId: workspace.id,
        name: "Marina Atendimento",
        email: "marina@payflow.local",
        passwordHash,
        role: "ATTENDANT"
      }
    ]
  });

  await prisma.integrationAccount.createMany({
    data: [
      { id: "seed-int-whatsapp", workspaceId, provider: "WHATSAPP", status: "MOCK", configJson: { provider: "mock" }, lastSyncAt: iso(-12 * 60 * 1000) },
      { id: "seed-int-meta", workspaceId, provider: "META_ADS", status: "MOCK", configJson: { provider: "mock" }, lastSyncAt: iso(-40 * 60 * 1000) },
      { id: "seed-int-umbrella", workspaceId, provider: "UMBRELLA", status: "MOCK", configJson: { provider: "mock" }, lastSyncAt: iso(-20 * 60 * 1000) },
      { id: "seed-int-utmify", workspaceId, provider: "UTMIFY", status: "MOCK", configJson: { provider: "mock" }, lastSyncAt: iso(-3 * 60 * 60 * 1000) }
    ]
  });

  const products = [
    ["prod-01", "Mentoria Growth", "Programa de mentoria para escalar ofertas digitais.", 1497, "Educação"],
    ["prod-02", "Kit Funil WhatsApp", "Templates e automações para recuperação no WhatsApp.", 297, "Templates"],
    ["prod-03", "Assinatura Analytics", "Painel mensal de métricas para tráfego pago.", 197, "SaaS"],
    ["prod-04", "Curso Tráfego Pago", "Treinamento prático para campanhas Meta Ads.", 697, "Curso"],
    ["prod-05", "Consultoria Express", "Diagnóstico rápido de funil e checkout.", 497, "Serviço"]
  ] as const;

  await prisma.product.createMany({
    data: products.map(([productId, name, description, price, category], index) => ({
      id: productId,
      workspaceId,
      name,
      description,
      price,
      category,
      status: index === 4 ? "PAUSED" : "ACTIVE"
    }))
  });

  const offerData = [
    ["offer-01", "prod-01", "Mentoria Growth - Turma Maio", "mentoria-growth-maio", 1497, "mentoria_maio", 3120, 418, 138, 82, 41, 17],
    ["offer-02", "prod-02", "Kit Funil WhatsApp", "kit-funil-whatsapp", 297, "kit_recuperacao", 5120, 891, 312, 201, 73, 29],
    ["offer-03", "prod-03", "Analytics Pro Mensal", "analytics-pro-mensal", 197, "analytics_pro", 2280, 320, 104, 67, 22, 8],
    ["offer-04", "prod-04", "Curso Tráfego Pago 4 Semanas", "curso-trafego-pago", 697, "curso_trafego", 1720, 188, 59, 31, 19, 5],
    ["offer-05", "prod-05", "Diagnóstico Express de Funil", "diagnostico-express-funil", 497, "diagnostico", 940, 121, 43, 26, 11, 4]
  ] as const;

  await prisma.offer.createMany({
    data: offerData.map(([offerId, productId, name, slug, price, campaign, visits, checkoutStarts, paymentsGenerated, paymentsApproved, abandonments, recoveries], index) => ({
      id: offerId,
      workspaceId,
      productId,
      name,
      slug,
      price,
      salesPageUrl: `https://payflow.local/${slug}`,
      checkoutUrl: `https://checkout.local/${slug}`,
      status: index === 3 ? "PAUSED" : "ACTIVE",
      tags: index === 0 ? ["high-ticket", "whatsapp"] : ["recuperacao"],
      trafficSourceDefault: index === 4 ? "Orgânico" : "Meta Ads",
      defaultUtmSource: index === 4 ? "instagram" : "meta",
      defaultUtmMedium: index === 4 ? "bio" : "cpc",
      defaultUtmCampaign: campaign,
      visits,
      checkoutStarts,
      paymentsGenerated,
      paymentsApproved,
      abandonments,
      recoveries,
      allowExpiredRecovery: index !== 2
    }))
  });

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

  const customerStatuses = [
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
  ] as const;

  await prisma.customer.createMany({
    data: names.map((name, index) => ({
      id: id("cust", index + 1),
      workspaceId,
      name,
      phone: `55119999${String(1000 + index)}`,
      email: `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, ".")}@example.com`,
      document: index % 4 === 0 ? `000000000${index}` : null,
      tags: index % 3 === 0 ? ["pix", "lead-quente"] : index % 3 === 1 ? ["boleto"] : ["meta-ads"],
      source: index % 2 === 0 ? "Meta Ads" : "Instagram",
      lastCampaign: index % 2 === 0 ? "mentoria_maio" : "kit_recuperacao",
      lastOffer: offerData[index % offerData.length][2],
      totalPurchases: ["BUYER", "RECOVERED"].includes(customerStatuses[index]) ? 1 : 0,
      status: customerStatuses[index],
      doNotContact: index === 15
    }))
  });

  const conversationStatuses = ["UNANSWERED", "OPEN", "WAITING_CUSTOMER", "PAYMENT_PENDING", "RECOVERY", "RESOLVED", "OPEN", "PAYMENT_PENDING", "UNANSWERED", "RESOLVED"] as const;
  for (let index = 0; index < 10; index += 1) {
    const conversationId = id("conv", index + 1);
    const customerId = id("cust", index + 1);
    const createdAt = iso(-(index + 1) * 45 * 60 * 1000);
    await prisma.conversation.create({
      data: {
        id: conversationId,
        workspaceId,
        customerId,
        assignedToId: index % 2 === 0 ? "seed-attendant" : null,
        status: conversationStatuses[index],
        tags: index % 2 === 0 ? ["pagamento", "whatsapp"] : ["duvida"],
        linkedOfferId: offerData[index % offerData.length][0],
        linkedPaymentId: id("pay", index + 1),
        lastMessageAt: createdAt,
        messages: {
          createMany: {
            data: [
              {
                workspaceId,
                customerId,
                direction: "INBOUND",
                body: index % 2 === 0 ? "Oi, gerei o Pix mas não encontrei o código aqui." : "Tenho uma dúvida antes de finalizar.",
                status: "RECEIVED",
                createdAt
              },
              {
                workspaceId,
                customerId,
                direction: "OUTBOUND",
                body: "Claro, vou te ajudar. Posso reenviar o link de pagamento por aqui.",
                status: "DELIVERED",
                providerMessageId: `mock-${conversationId}-02`,
                createdAt: iso(-(index + 1) * 42 * 60 * 1000)
              },
              {
                workspaceId,
                customerId,
                direction: index % 3 === 0 ? "INBOUND" : "OUTBOUND",
                body: index % 3 === 0 ? "Pode mandar, por favor?" : "Segue o link seguro para concluir: https://checkout.local/pagar",
                status: index % 3 === 0 ? "RECEIVED" : "SENT",
                providerMessageId: index % 3 === 0 ? null : `mock-${conversationId}-03`,
                createdAt: iso(-(index + 1) * 38 * 60 * 1000)
              }
            ]
          }
        }
      }
    });
  }

  const paymentStatuses = ["PENDING", "WAITING_PAYMENT", "PIX_GENERATED", "BOLETO_GENERATED", "FAILED", "PAID", "PAID", "EXPIRED", "CANCELLED", "PAID", "PENDING", "PAID", "REFUNDED", "CHARGEBACK", "PAID", "WAITING_PAYMENT", "PAID", "EXPIRED", "PAID", "PENDING"] as const;
  await prisma.payment.createMany({
    data: paymentStatuses.map((status, index) => {
      const offer = offerData[index % offerData.length];
      return {
        id: id("pay", index + 1),
        workspaceId,
        customerId: id("cust", (index % 20) + 1),
        offerId: offer[0],
        provider: "UMBRELLA",
        providerPaymentId: `umb-demo-${index + 1}`,
        status,
        amount: offer[4],
        currency: "BRL",
        paymentMethod: index % 2 === 0 ? "pix" : "boleto",
        checkoutUrl: `https://checkout.local/${offer[3]}`,
        pixCode: index % 2 === 0 ? `000201010212PAYFLOW${index}` : null,
        boletoUrl: index % 2 === 1 ? `https://boleto.local/${index + 1}` : null,
        paidAt: status === "PAID" ? iso(-(index + 1) * 20 * 60 * 1000) : null,
        expiresAt: iso((index + 1) * 60 * 60 * 1000),
        rawPayloadJson: { seed: true }
      };
    })
  });

  const templates = {
    template1: "Oi, {{customerName}}! Vi que seu pagamento da {{offerName}} ficou pendente. Posso te ajudar a concluir?",
    template2: "Passando para reenviar o link seguro da {{offerName}}: {{checkoutUrl}}",
    template3: "Último lembrete gentil: sua condição da {{offerName}} ainda está disponível por pouco tempo. Quer finalizar agora?"
  };

  await prisma.recoveryFlow.createMany({
    data: offerData.slice(0, 3).map((offer, index) => ({
      id: id("flow", index + 1),
      workspaceId,
      offerId: offer[0],
      name: `Recuperação ${offer[2]}`,
      status: "ACTIVE",
      firstDelayMinutes: 15,
      secondDelayMinutes: 180,
      thirdDelayMinutes: 1440,
      maxAttempts: 3,
      allowedStartHour: 9,
      allowedEndHour: 20,
      ...templates
    }))
  });

  const recoveryPayments = [0, 1, 2, 3, 4];
  await prisma.recoveryAttempt.createMany({
    data: recoveryPayments.flatMap((paymentIndex, index) => [
      {
        id: id("attempt", index * 2 + 1),
        workspaceId,
        recoveryFlowId: id("flow", (index % 3) + 1),
        paymentId: id("pay", paymentIndex + 1),
        customerId: id("cust", paymentIndex + 1),
        conversationId: id("conv", (paymentIndex % 10) + 1),
        status: index % 2 === 0 ? "SENT" : "SCHEDULED",
        attemptNumber: 1,
        templateUsed: templates.template1,
        scheduledAt: iso(-30 * 60 * 1000 + index * 5 * 60 * 1000),
        sentAt: index % 2 === 0 ? iso(-20 * 60 * 1000 + index * 5 * 60 * 1000) : null
      },
      {
        id: id("attempt", index * 2 + 2),
        workspaceId,
        recoveryFlowId: id("flow", (index % 3) + 1),
        paymentId: id("pay", paymentIndex + 1),
        customerId: id("cust", paymentIndex + 1),
        conversationId: id("conv", (paymentIndex % 10) + 1),
        status: "SCHEDULED",
        attemptNumber: 2,
        templateUsed: templates.template2,
        scheduledAt: iso((index + 2) * 60 * 60 * 1000)
      }
    ])
  });

  const campaigns = [
    ["camp-01", "238-payflow-1", "Mentoria Maio - Conversões", "ACTIVE", 6420.55, 184200, 7420, 4.03, 0.87, 34.85, 36540, 5.69, 78.3],
    ["camp-02", "238-payflow-2", "Kit Recuperação - Remarketing", "ACTIVE", 2840.2, 93200, 5110, 5.48, 0.56, 30.47, 18117, 6.38, 24.07],
    ["camp-03", "mock-organic-1", "Diagnóstico Express - Conteúdo", "PAUSED", 620, 18200, 940, 5.16, 0.66, 34.07, 6461, 10.42, 23.85]
  ] as const;

  await prisma.campaign.createMany({
    data: campaigns.map(([campaignId, providerCampaignId, name, status, spend, impressions, clicks, ctr, cpc, cpm, revenue, roas, cpa], index) => ({
      id: campaignId,
      workspaceId,
      provider: index === 2 ? "MOCK" : "META_ADS",
      providerCampaignId,
      name,
      status,
      objective: index === 2 ? "LEADS" : "SALES",
      spend,
      impressions,
      clicks,
      ctr,
      cpc,
      cpm,
      revenue,
      roas,
      cpa,
      dateStart: iso(-14 * day),
      dateEnd: iso()
    }))
  });

  for (let index = 0; index < 3; index += 1) {
    await prisma.adSet.create({
      data: {
        id: id("adset", index + 1),
        workspaceId,
        campaignId: campaigns[index][0],
        providerAdSetId: `adset-${index + 1}`,
        name: `Conjunto ${index + 1}`,
        metricsJson: { audience: "remarketing", seed: true },
        ads: {
          create: [
            {
              workspaceId,
              campaignId: campaigns[index][0],
              providerAdId: `ad-${index + 1}-a`,
              name: `Criativo ${index + 1}A`,
              metricsJson: { clicks: 120 + index * 30 }
            },
            {
              workspaceId,
              campaignId: campaigns[index][0],
              providerAdId: `ad-${index + 1}-b`,
              name: `Criativo ${index + 1}B`,
              metricsJson: { clicks: 90 + index * 20 }
            }
          ]
        }
      }
    });
  }

  await prisma.trackingEvent.createMany({
    data: Array.from({ length: 12 }).map((_, index) => ({
      id: id("utm", index + 1),
      workspaceId,
      customerId: id("cust", (index % 20) + 1),
      paymentId: id("pay", (index % 20) + 1),
      offerId: offerData[index % offerData.length][0],
      source: index % 2 === 0 ? "meta" : "instagram",
      medium: index % 2 === 0 ? "cpc" : "bio",
      campaign: index % 2 === 0 ? "mentoria_maio" : "kit_recuperacao",
      content: `criativo-${(index % 4) + 1}`,
      term: index % 3 === 0 ? "whatsapp" : "checkout",
      fbclid: `fbclid-${index + 1}`,
      clickId: `click-${index + 1}`,
      eventType: index % 4 === 0 ? "purchase" : "checkout_started",
      rawPayloadJson: { seed: true }
    }))
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      userId: "seed-admin",
      action: "seed.created",
      entity: "Workspace",
      entityId: workspaceId,
      metadataJson: { note: "Dados fictícios do MVP PayFlow" }
    }
  });

  console.log(`Seed concluído. Login: admin@payflow.local / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

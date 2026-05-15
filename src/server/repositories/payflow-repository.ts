import { FALLBACK_WORKSPACE_ID, runtimeStore } from "@/lib/runtime-store";
import { hasDatabaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type {
  CampaignRecord,
  ConversationRecord,
  CustomerRecord,
  DashboardMetric,
  DashboardSnapshot,
  IntegrationProvider,
  IntegrationRecord,
  MessageRecord,
  OfferRecord,
  PaymentRecord,
  PaymentStatus,
  ProductRecord,
  RecoveryAttemptRecord,
  RecoveryFlowRecord,
  ReportRow
} from "@/lib/types";
import { nowIso, sanitizeText, slugify } from "@/lib/utils";

export const DEFAULT_WORKSPACE_ID = FALLBACK_WORKSPACE_ID;

type MaybePromise<T> = Promise<T> | T;

async function withDatabase<T>(operation: () => MaybePromise<T>, fallback: () => T): Promise<T> {
  if (!hasDatabaseUrl()) return fallback();

  try {
    return await operation();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn("Database unavailable, using local runtime store", {
      error: error instanceof Error ? error.message : String(error)
    });
    return fallback();
  }
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value ?? 0);
}

function asIso(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function computeMetrics(
  payments: PaymentRecord[],
  conversations: ConversationRecord[],
  campaigns: CampaignRecord[],
  offers: OfferRecord[],
  attempts: RecoveryAttemptRecord[]
): DashboardMetric[] {
  const paid = payments.filter((payment) => payment.status === "PAID");
  const pending = payments.filter((payment) =>
    ["PENDING", "WAITING_PAYMENT", "PIX_GENERATED", "BOLETO_GENERATED"].includes(payment.status)
  );
  const abandoned = payments.filter((payment) => ["FAILED", "EXPIRED", "CANCELLED"].includes(payment.status));
  const revenue = paid.reduce((total, payment) => total + payment.amount, 0);
  const recovered = attempts.filter((attempt) => attempt.status === "CONVERTED").length;
  const spend = campaigns.reduce((total, campaign) => total + campaign.spend, 0);
  const averageTicket = paid.length ? revenue / paid.length : 0;
  const recoveryRate = abandoned.length ? (recovered / abandoned.length) * 100 : 0;

  return [
    { label: "Receita total", value: currency(revenue), delta: paid.length ? `${paid.length} pagamentos` : "sem vendas reais", tone: paid.length ? "success" : undefined },
    { label: "Vendas aprovadas", value: String(paid.length), delta: `${paid.length} pagas`, tone: "success" },
    { label: "Pagamentos pendentes", value: String(pending.length), tone: "warning" },
    { label: "Pagamentos abandonados", value: String(abandoned.length), tone: "danger" },
    { label: "Recuperações realizadas", value: String(recovered), delta: `${recoveryRate.toFixed(1)}%`, tone: "success" },
    { label: "Taxa de recuperação", value: `${recoveryRate.toFixed(1)}%`, tone: "success" },
    { label: "Conversas abertas", value: String(conversations.filter((item) => item.status !== "RESOLVED").length) },
    { label: "Aguardando resposta", value: String(conversations.filter((item) => ["UNANSWERED", "PAYMENT_PENDING"].includes(item.status)).length), tone: "warning" },
    { label: "Investimento em tráfego", value: currency(spend) },
    { label: "ROAS estimado", value: spend ? `${(revenue / spend).toFixed(2)}x` : "0x", tone: "success" },
    { label: "CPA", value: currency(paid.length ? spend / paid.length : 0) },
    { label: "Ticket médio", value: currency(averageTicket) }
  ];
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function revenueByDay(payments: PaymentRecord[]) {
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      revenue: 0
    };
  });

  payments
    .filter((payment) => payment.status === "PAID")
    .forEach((payment) => {
      const key = (payment.paidAt ?? payment.updatedAt).slice(0, 10);
      const target = days.find((day) => day.key === key);
      if (target) target.revenue += payment.amount;
    });

  return days.map(({ label, revenue }) => ({ date: label, revenue }));
}

function countBy<T extends string>(items: T[]) {
  const map = new Map<T, number>();
  items.forEach((item) => map.set(item, (map.get(item) ?? 0) + 1));
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

export async function getWorkspaceId() {
  return withDatabase(
    async () => {
      const workspace = await prisma.workspace.findFirst({ select: { id: true } });
      if (workspace?.id) return workspace.id;

      const created = await prisma.workspace.create({
        data: {
          name: "PayFlow",
          slug: "payflow"
        },
        select: { id: true }
      });
      return created.id;
    },
    () => DEFAULT_WORKSPACE_ID
  );
}

export async function getDashboardSnapshot(workspaceId = DEFAULT_WORKSPACE_ID): Promise<DashboardSnapshot> {
  const snapshot = await withDatabase(
    async () => {
      const [payments, conversations, campaigns, offers, attempts] = await Promise.all([
        prisma.payment.findMany({
          where: { workspaceId, provider: { not: "MOCK" } },
          include: { customer: true, offer: true },
          orderBy: { createdAt: "desc" }
        }),
        prisma.conversation.findMany({
          where: { workspaceId },
          include: { customer: true, assignedTo: true, messages: { orderBy: { createdAt: "asc" } } },
          orderBy: { lastMessageAt: "desc" }
        }),
        prisma.campaign.findMany({ where: { workspaceId, provider: { not: "MOCK" } }, orderBy: { roas: "desc" } }),
        prisma.offer.findMany({ where: { workspaceId }, include: { product: true }, orderBy: { abandonments: "desc" } }),
        prisma.recoveryAttempt.findMany({ where: { workspaceId } })
      ]);

      return buildDashboardSnapshot(
        payments.map(mapPayment),
        conversations.map(mapConversation),
        campaigns.map(mapCampaign),
        offers.map(mapOffer),
        attempts.map(mapRecoveryAttempt)
      );
    },
    () =>
      buildDashboardSnapshot(
        runtimeStore.payments.filter((payment) => payment.provider !== "MOCK"),
        runtimeStore.conversations,
        runtimeStore.campaigns.filter((campaign) => campaign.provider !== "MOCK"),
        runtimeStore.offers,
        runtimeStore.recoveryAttempts
      )
  );

  return snapshot;
}

function buildDashboardSnapshot(
  payments: PaymentRecord[],
  conversations: ConversationRecord[],
  campaigns: CampaignRecord[],
  offers: OfferRecord[],
  attempts: RecoveryAttemptRecord[]
): DashboardSnapshot {
  const offerScope = offers.filter(isMusclePrimeOffer);
  return {
    metrics: computeMetrics(payments, conversations, campaigns, offers, attempts),
    revenueByDay: revenueByDay(payments),
    paymentsByStatus: countBy(payments.map((payment) => payment.status)) as DashboardSnapshot["paymentsByStatus"],
    conversationsByStatus: countBy(conversations.map((conversation) => conversation.status)) as DashboardSnapshot["conversationsByStatus"],
    topCampaigns: [...campaigns].sort((a, b) => b.roas - a.roas).slice(0, 5),
    offersByAbandonment: [...offerScope].sort((a, b) => b.abandonments - a.abandonments).slice(0, 5)
  };
}

export async function getInboxSnapshot(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ConversationRecord[]> {
  return withDatabase(
    async () => {
      const conversations = await prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          customer: true,
          assignedTo: true,
          messages: { orderBy: { createdAt: "asc" } }
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }]
      });
      return conversations.map(mapConversation);
    },
    () => runtimeStore.conversations
  );
}

export async function listProducts(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ProductRecord[]> {
  return withDatabase(
    async () => (await prisma.product.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } })).map(mapProduct),
    () => runtimeStore.products
  );
}

export async function createProduct(input: Pick<ProductRecord, "name" | "description" | "price" | "category" | "status">, workspaceId = DEFAULT_WORKSPACE_ID) {
  const product = {
    id: `prod-${Date.now()}`,
    workspaceId,
    name: sanitizeText(input.name, 160),
    description: input.description ? sanitizeText(input.description, 600) : null,
    price: Number(input.price),
    category: input.category ? sanitizeText(input.category, 80) : null,
    status: input.status,
    createdAt: nowIso(),
    updatedAt: nowIso()
  } satisfies ProductRecord;

  return withDatabase(
    async () =>
      mapProduct(
        await prisma.product.create({
          data: {
            workspaceId,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            status: product.status
          }
        })
      ),
    () => {
      runtimeStore.products.unshift(product);
      return product;
    }
  );
}

export async function updateProduct(id: string, input: Partial<Pick<ProductRecord, "name" | "description" | "price" | "category" | "status">>, workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () =>
      mapProduct(
        await prisma.product.update({
          where: { id },
          data: {
            name: input.name ? sanitizeText(input.name, 160) : undefined,
            description: input.description === undefined ? undefined : sanitizeText(input.description ?? "", 600),
            price: input.price === undefined ? undefined : Number(input.price),
            category: input.category === undefined ? undefined : sanitizeText(input.category ?? "", 80),
            status: input.status
          }
        })
      ),
    () => {
      const product = runtimeStore.products.find((item) => item.id === id && item.workspaceId === workspaceId);
      if (!product) throw new Error("Produto não encontrado");
      Object.assign(product, {
        ...input,
        name: input.name ? sanitizeText(input.name, 160) : product.name,
        updatedAt: nowIso()
      });
      return product;
    }
  );
}

export async function archiveProduct(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return updateProduct(id, { status: "ARCHIVED" }, workspaceId);
}

export async function listOffers(workspaceId = DEFAULT_WORKSPACE_ID): Promise<OfferRecord[]> {
  return withDatabase(
    async () =>
      (
        await prisma.offer.findMany({
          where: { workspaceId },
          include: { product: true },
          orderBy: { createdAt: "desc" }
        })
      ).map(mapOffer),
    () => runtimeStore.offers
  );
}

export async function createOffer(
  input: Pick<
    OfferRecord,
    | "name"
    | "productId"
    | "price"
    | "salesPageUrl"
    | "checkoutUrl"
    | "status"
    | "tags"
    | "trafficSourceDefault"
    | "defaultUtmSource"
    | "defaultUtmMedium"
    | "defaultUtmCampaign"
  >,
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  const product = runtimeStore.products.find((item) => item.id === input.productId);
  const offer: OfferRecord = {
    id: `offer-${Date.now()}`,
    workspaceId,
    productId: input.productId || null,
    productName: product?.name ?? null,
    name: sanitizeText(input.name, 160),
    slug: slugify(input.name),
    price: Number(input.price),
    salesPageUrl: input.salesPageUrl || null,
    checkoutUrl: input.checkoutUrl || null,
    status: input.status,
    tags: input.tags ?? [],
    trafficSourceDefault: input.trafficSourceDefault || null,
    defaultUtmSource: input.defaultUtmSource || null,
    defaultUtmMedium: input.defaultUtmMedium || null,
    defaultUtmCampaign: input.defaultUtmCampaign || null,
    visits: 0,
    checkoutStarts: 0,
    paymentsGenerated: 0,
    paymentsApproved: 0,
    abandonments: 0,
    recoveries: 0,
    allowExpiredRecovery: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  return withDatabase(
    async () =>
      mapOffer(
        await prisma.offer.create({
          data: {
            workspaceId,
            productId: offer.productId,
            name: offer.name,
            slug: offer.slug,
            price: offer.price,
            salesPageUrl: offer.salesPageUrl,
            checkoutUrl: offer.checkoutUrl,
            status: offer.status,
            tags: offer.tags,
            trafficSourceDefault: offer.trafficSourceDefault,
            defaultUtmSource: offer.defaultUtmSource,
            defaultUtmMedium: offer.defaultUtmMedium,
            defaultUtmCampaign: offer.defaultUtmCampaign
          },
          include: { product: true }
        })
      ),
    () => {
      runtimeStore.offers.unshift(offer);
      return offer;
    }
  );
}

export async function updateOffer(id: string, input: Partial<OfferRecord>, workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () =>
      mapOffer(
        await prisma.offer.update({
          where: { id },
          data: {
            productId: input.productId,
            name: input.name ? sanitizeText(input.name, 160) : undefined,
            slug: input.name ? slugify(input.name) : undefined,
            price: input.price === undefined ? undefined : Number(input.price),
            salesPageUrl: input.salesPageUrl,
            checkoutUrl: input.checkoutUrl,
            status: input.status,
            tags: input.tags,
            trafficSourceDefault: input.trafficSourceDefault,
            defaultUtmSource: input.defaultUtmSource,
            defaultUtmMedium: input.defaultUtmMedium,
            defaultUtmCampaign: input.defaultUtmCampaign,
            allowExpiredRecovery: input.allowExpiredRecovery
          },
          include: { product: true }
        })
      ),
    () => {
      const offer = runtimeStore.offers.find((item) => item.id === id && item.workspaceId === workspaceId);
      if (!offer) throw new Error("Oferta não encontrada");
      Object.assign(offer, input, {
        name: input.name ? sanitizeText(input.name, 160) : offer.name,
        slug: input.name ? slugify(input.name) : offer.slug,
        updatedAt: nowIso()
      });
      offer.productName = runtimeStore.products.find((item) => item.id === offer.productId)?.name ?? null;
      return offer;
    }
  );
}

export async function archiveOffer(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return updateOffer(id, { status: "ARCHIVED" }, workspaceId);
}

export async function listCustomers(workspaceId = DEFAULT_WORKSPACE_ID): Promise<CustomerRecord[]> {
  return withDatabase(
    async () => (await prisma.customer.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } })).map(mapCustomer),
    () => runtimeStore.customers
  );
}

export async function anonymizeCustomer(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  const anonymized = {
    name: "Cliente anonimizado",
    phone: null,
    email: null,
    document: null,
    tags: [],
    doNotContact: true
  };

  return withDatabase(
    async () => mapCustomer(await prisma.customer.update({ where: { id }, data: anonymized })),
    () => {
      const customer = runtimeStore.customers.find((item) => item.id === id && item.workspaceId === workspaceId);
      if (!customer) throw new Error("Cliente não encontrado");
      Object.assign(customer, anonymized, { updatedAt: nowIso() });
      return customer;
    }
  );
}

export async function listPayments(workspaceId = DEFAULT_WORKSPACE_ID): Promise<PaymentRecord[]> {
  return withDatabase(
    async () =>
      (
        await prisma.payment.findMany({
          where: { workspaceId, provider: { not: "MOCK" } },
          include: { customer: true, offer: true },
          orderBy: { createdAt: "desc" }
        })
      ).map(mapPayment),
    () => runtimeStore.payments.filter((payment) => payment.provider !== "MOCK")
  );
}

export async function listRecoveryFlows(workspaceId = DEFAULT_WORKSPACE_ID): Promise<RecoveryFlowRecord[]> {
  return withDatabase(
    async () => (await prisma.recoveryFlow.findMany({ where: { workspaceId, status: "ACTIVE" } })).map(mapRecoveryFlow),
    () => runtimeStore.recoveryFlows.filter((flow) => flow.status === "ACTIVE")
  );
}

export async function listRecoveryAttempts(workspaceId = DEFAULT_WORKSPACE_ID): Promise<RecoveryAttemptRecord[]> {
  return withDatabase(
    async () =>
      (
        await prisma.recoveryAttempt.findMany({
          where: { workspaceId },
          include: { customer: true, payment: { include: { offer: true } } },
          orderBy: { scheduledAt: "asc" }
        })
      ).map(mapRecoveryAttempt),
    () => runtimeStore.recoveryAttempts
  );
}

export async function listCampaigns(workspaceId = DEFAULT_WORKSPACE_ID): Promise<CampaignRecord[]> {
  return withDatabase(
    async () => (await prisma.campaign.findMany({ where: { workspaceId, provider: { not: "MOCK" } }, orderBy: { roas: "desc" } })).map(mapCampaign),
    () => runtimeStore.campaigns.filter((campaign) => campaign.provider !== "MOCK")
  );
}

export async function listIntegrations(workspaceId = DEFAULT_WORKSPACE_ID): Promise<IntegrationRecord[]> {
  return withDatabase(
    async () =>
      (
        await prisma.integrationAccount.findMany({
          where: { workspaceId },
          orderBy: { provider: "asc" }
        })
      ).map((item) => ({
        id: item.id,
        workspaceId: item.workspaceId,
        provider: item.provider as IntegrationProvider,
        status: item.status === "MOCK" ? "DISCONNECTED" : item.status,
        lastSyncAt: asIso(item.lastSyncAt),
        errorMessage: item.errorMessage,
        logs: item.errorMessage ? [item.errorMessage] : ["Conta registrada no banco"]
      })),
    () => runtimeStore.integrations.map((integration) => ({ ...integration, status: integration.status === "MOCK" ? "DISCONNECTED" : integration.status }))
  );
}

export async function appendOutboundMessage(
  conversationId: string,
  body: string,
  providerMessageId?: string,
  workspaceId = DEFAULT_WORKSPACE_ID,
  metadataJson?: unknown
) {
  const safeBody = sanitizeText(body, 4000);
  const attendant = readAttendantMetadata(metadataJson);
  return withDatabase(
    async () => {
      const conversation = await prisma.conversation.findFirstOrThrow({
        where: { id: conversationId, workspaceId },
        include: { customer: true }
      });

      const message = await prisma.message.create({
        data: {
          workspaceId,
          conversationId,
          customerId: conversation.customerId,
          direction: "OUTBOUND",
          body: safeBody,
          providerMessageId,
          status: "SENT",
          metadataJson: metadataJson as never
        }
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: "WAITING_CUSTOMER",
          lastMessageAt: message.createdAt,
          ...(attendant?.id ? { assignedToId: attendant.id } : {})
        }
      });

      return mapMessage(message);
    },
    () => {
      const conversation = runtimeStore.conversations.find((item) => item.id === conversationId && item.workspaceId === workspaceId);
      if (!conversation) throw new Error("Conversa não encontrada");
      const message = {
        id: `msg-${Date.now()}`,
        workspaceId,
        conversationId,
        customerId: conversation.customerId,
        direction: "OUTBOUND" as const,
        body: safeBody,
        status: "SENT" as const,
        providerMessageId,
        metadataJson,
        createdAt: nowIso()
      };
      conversation.messages.push(message);
      conversation.status = "WAITING_CUSTOMER";
      conversation.lastMessageAt = message.createdAt;
      conversation.assignedToName = attendant?.name ?? conversation.assignedToName;
      return message;
    }
  );
}

export async function registerInboundWhatsAppMessage(input: {
  workspaceId?: string;
  phone: string;
  name?: string | null;
  body: string;
  providerMessageId?: string | null;
  referral?: {
    ctwaClid?: string | null;
    sourceId?: string | null;
    sourceUrl?: string | null;
    headline?: string | null;
  } | null;
  metadataJson?: unknown;
}) {
  const workspaceId = input.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const phone = input.phone.replace(/\D/g, "");
  const body = sanitizeText(input.body, 4000);
  const referralData = buildCustomerReferralData(input.referral);

  return withDatabase(
    async () => {
      let customer = await prisma.customer.findFirst({ where: { workspaceId, phone } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            workspaceId,
            phone,
            name: input.name || `WhatsApp ${phone.slice(-4)}`,
            status: "IN_SERVICE",
            source: referralData.ctwaClid ? "WhatsApp CTWA" : "WhatsApp",
            ...referralData
          }
        });
      } else if (referralData.ctwaClid && !customer.ctwaClid) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            ...referralData,
            source: customer.source ?? "WhatsApp CTWA"
          }
        });
      }

      let conversation = await prisma.conversation.findFirst({
        where: {
          workspaceId,
          customerId: customer.id,
          channel: "WHATSAPP",
          status: { not: "RESOLVED" }
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            workspaceId,
            customerId: customer.id,
            status: "OPEN",
            lastMessageAt: new Date()
          }
        });
      }

      const message = await prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          customerId: customer.id,
          direction: "INBOUND",
          body,
          providerMessageId: input.providerMessageId,
          status: "RECEIVED",
          metadataJson: input.metadataJson as never
        }
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "UNANSWERED", lastMessageAt: message.createdAt }
      });

      return { customerId: customer.id, conversationId: conversation.id, messageId: message.id };
    },
    () => {
      let customer = runtimeStore.customers.find((item) => item.workspaceId === workspaceId && item.phone === phone);
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          workspaceId,
          name: input.name || `WhatsApp ${phone.slice(-4)}`,
          phone,
          email: null,
          document: null,
          tags: ["whatsapp"],
          source: "WhatsApp",
          lastCampaign: null,
          lastOffer: null,
          ctwaClid: referralData.ctwaClid ?? null,
          ctwaSourceId: referralData.ctwaSourceId ?? null,
          ctwaSourceUrl: referralData.ctwaSourceUrl ?? null,
          ctwaHeadline: referralData.ctwaHeadline ?? null,
          ctwaCapturedAt: referralData.ctwaCapturedAt?.toISOString() ?? null,
          totalPurchases: 0,
          status: "IN_SERVICE",
          doNotContact: false,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        runtimeStore.customers.unshift(customer);
      } else if (referralData.ctwaClid && !customer.ctwaClid) {
        Object.assign(customer, {
          ctwaClid: referralData.ctwaClid,
          ctwaSourceId: referralData.ctwaSourceId ?? null,
          ctwaSourceUrl: referralData.ctwaSourceUrl ?? null,
          ctwaHeadline: referralData.ctwaHeadline ?? null,
          ctwaCapturedAt: referralData.ctwaCapturedAt?.toISOString() ?? nowIso(),
          source: customer.source ?? "WhatsApp CTWA",
          updatedAt: nowIso()
        });
      }

      let conversation = runtimeStore.conversations.find(
        (item) => item.workspaceId === workspaceId && item.customerId === customer?.id && item.status !== "RESOLVED"
      );
      if (!conversation) {
        conversation = {
          id: `conv-${Date.now()}`,
          workspaceId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          assignedToName: null,
          status: "OPEN",
          tags: ["whatsapp"],
          lastMessageAt: nowIso(),
          messages: []
        };
        runtimeStore.conversations.unshift(conversation);
      }

      const message = {
        id: `msg-${Date.now()}`,
        workspaceId,
        conversationId: conversation.id,
        customerId: customer.id,
        direction: "INBOUND" as const,
        body,
        providerMessageId: input.providerMessageId,
        status: "RECEIVED" as const,
        metadataJson: input.metadataJson,
        createdAt: nowIso()
      };
      conversation.messages.push(message);
      conversation.status = "UNANSWERED";
      conversation.lastMessageAt = message.createdAt;
      return { customerId: customer.id, conversationId: conversation.id, messageId: message.id };
    }
  );
}

export async function createRecoveryAttempts(attempts: RecoveryAttemptRecord[], workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () => {
      await prisma.recoveryAttempt.createMany({
        data: attempts.map((attempt) => ({
          workspaceId,
          recoveryFlowId: attempt.recoveryFlowId,
          paymentId: attempt.paymentId,
          customerId: attempt.customerId,
          conversationId: attempt.conversationId,
          status: attempt.status,
          attemptNumber: attempt.attemptNumber,
          templateUsed: attempt.templateUsed,
          scheduledAt: new Date(attempt.scheduledAt),
          sentAt: attempt.sentAt ? new Date(attempt.sentAt) : undefined,
          convertedAt: attempt.convertedAt ? new Date(attempt.convertedAt) : undefined,
          errorMessage: attempt.errorMessage
        }))
      });
      return attempts;
    },
    () => {
      runtimeStore.recoveryAttempts.push(...attempts);
      return attempts;
    }
  );
}

export async function updateRecoveryAttempt(id: string, input: Partial<RecoveryAttemptRecord>, workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () =>
      mapRecoveryAttempt(
        await prisma.recoveryAttempt.update({
          where: { id },
          data: {
            status: input.status,
            sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
            convertedAt: input.convertedAt ? new Date(input.convertedAt) : undefined,
            errorMessage: input.errorMessage,
            conversationId: input.conversationId
          },
          include: { customer: true, payment: { include: { offer: true } } }
        })
      ),
    () => {
      const attempt = runtimeStore.recoveryAttempts.find((item) => item.id === id && item.workspaceId === workspaceId);
      if (!attempt) throw new Error("Tentativa não encontrada");
      Object.assign(attempt, input);
      return attempt;
    }
  );
}

export async function cancelRecoveryForPayment(paymentId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () => {
      await prisma.recoveryAttempt.updateMany({
        where: { workspaceId, paymentId, status: "SCHEDULED" },
        data: { status: "CANCELLED" }
      });
    },
    () => {
      runtimeStore.recoveryAttempts.forEach((attempt) => {
        if (attempt.paymentId === paymentId && attempt.workspaceId === workspaceId && attempt.status === "SCHEDULED") {
          attempt.status = "CANCELLED";
        }
      });
    }
  );
}

export async function upsertPayment(
  payment: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    rawPayloadJson?: unknown;
  },
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  return withDatabase(
    async () => {
      const saved = await prisma.payment.upsert({
        where: {
          workspaceId_provider_providerPaymentId: {
            workspaceId,
            provider: payment.provider,
            providerPaymentId: payment.providerPaymentId
          }
        },
        create: {
          workspaceId,
          customerId: payment.customerId,
          offerId: payment.offerId,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          checkoutUrl: payment.checkoutUrl,
          pixCode: payment.pixCode,
          boletoUrl: payment.boletoUrl,
          paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
          expiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
          rawPayloadJson: (payment.rawPayloadJson ?? payment) as never
        },
        update: {
          customerId: payment.customerId,
          offerId: payment.offerId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          checkoutUrl: payment.checkoutUrl,
          pixCode: payment.pixCode,
          boletoUrl: payment.boletoUrl,
          paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
          expiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
          rawPayloadJson: (payment.rawPayloadJson ?? payment) as never
        },
        include: { customer: true, offer: true }
      });

      return mapPayment(saved);
    },
    () => {
      const existing = runtimeStore.payments.find((item) => item.provider === payment.provider && item.providerPaymentId === payment.providerPaymentId);
      if (existing) {
        Object.assign(existing, payment, { updatedAt: nowIso() });
        return existing;
      }
      const record: PaymentRecord = {
        ...payment,
        id: payment.id ?? `pay-${Date.now()}`,
        workspaceId,
        createdAt: payment.createdAt ?? nowIso(),
        updatedAt: payment.updatedAt ?? nowIso()
      };
      runtimeStore.payments.unshift(record);
      return record;
    }
  );
}

export async function linkPaymentToConversation(
  conversationId: string,
  paymentId: string,
  workspaceId = DEFAULT_WORKSPACE_ID,
  offerId?: string | null
) {
  return withDatabase(
    async () => {
      const existing = await prisma.conversation.findFirstOrThrow({ where: { id: conversationId, workspaceId } });
      const conversation = await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          linkedPaymentId: paymentId,
          linkedOfferId: offerId === undefined ? undefined : offerId,
          status: "PAYMENT_PENDING",
          lastMessageAt: new Date()
        },
        include: { customer: true, assignedTo: true, messages: { orderBy: { createdAt: "asc" } } }
      });
      return mapConversation(conversation);
    },
    () => {
      const conversation = runtimeStore.conversations.find((item) => item.id === conversationId && item.workspaceId === workspaceId);
      if (!conversation) throw new Error("Conversa nao encontrada");
      conversation.linkedPaymentId = paymentId;
      if (offerId !== undefined) conversation.linkedOfferId = offerId;
      conversation.status = "PAYMENT_PENDING";
      conversation.lastMessageAt = nowIso();
      return conversation;
    }
  );
}

export async function linkConversationContext(
  input: {
    conversationId: string;
    customer: {
      name: string;
      phone?: string | null;
      email?: string | null;
      document?: string | null;
    };
    offerId?: string | null;
    paymentId?: string | null;
    actor: { id: string; name: string };
  },
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  const phone = input.customer.phone?.replace(/\D/g, "") || null;
  const name = sanitizeText(input.customer.name || "Cliente sem nome", 160);
  const email = input.customer.email ? sanitizeText(input.customer.email, 180) : null;
  const document = input.customer.document ? input.customer.document.replace(/\D/g, "") : null;
  const offerId = input.offerId || null;
  const paymentId = input.paymentId || null;
  const note = `Atendente ${input.actor.name} vinculou esta conversa${offerId ? " a uma oferta" : ""}${paymentId ? " e a uma cobranca" : ""}.`;

  return withDatabase(
    async () =>
      prisma.$transaction(async (tx) => {
        const current = await tx.conversation.findFirstOrThrow({
          where: { id: input.conversationId, workspaceId },
          include: { customer: true }
        });
        const existing = phone ? await tx.customer.findFirst({ where: { workspaceId, phone } }) : null;
        const customer = existing
          ? await tx.customer.update({
              where: { id: existing.id },
              data: {
                name,
                phone,
                email,
                document,
                source: existing.source ?? "WhatsApp",
                status: existing.status === "NEW" ? "IN_SERVICE" : existing.status
              }
            })
          : await tx.customer.create({
              data: {
                workspaceId,
                name,
                phone,
                email,
                document,
                source: "WhatsApp",
                status: "IN_SERVICE"
              }
            });

        if (paymentId) {
          await tx.payment.updateMany({
            where: { id: paymentId, workspaceId },
            data: {
              customerId: customer.id,
              offerId: offerId ?? undefined
            }
          });
        }

        await tx.message.create({
          data: {
            workspaceId,
            conversationId: current.id,
            customerId: customer.id,
            direction: "INTERNAL",
            body: note,
            status: "SENT",
            metadataJson: {
              attendant: input.actor,
              action: "conversation_linked",
              previousCustomerId: current.customerId,
              offerId,
              paymentId
            } as never
          }
        });

        const conversation = await tx.conversation.update({
          where: { id: current.id },
          data: {
            customerId: customer.id,
            assignedToId: input.actor.id,
            linkedOfferId: offerId,
            linkedPaymentId: paymentId,
            status: paymentId ? "PAYMENT_PENDING" : "OPEN",
            tags: Array.from(new Set([...(current.tags ?? []), "vinculado"])),
            lastMessageAt: new Date()
          },
          include: { customer: true, assignedTo: true, messages: { orderBy: { createdAt: "asc" } } }
        });

        return mapConversation(conversation);
      }),
    () => {
      const conversation = runtimeStore.conversations.find((item) => item.id === input.conversationId && item.workspaceId === workspaceId);
      if (!conversation) throw new Error("Conversa nao encontrada");
      let customer = phone ? runtimeStore.customers.find((item) => item.workspaceId === workspaceId && item.phone === phone) : null;
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          workspaceId,
          name,
          phone,
          email,
          document,
          tags: [],
          source: "WhatsApp",
          lastCampaign: null,
          lastOffer: null,
          totalPurchases: 0,
          status: "IN_SERVICE",
          doNotContact: false,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        runtimeStore.customers.unshift(customer);
      } else {
        Object.assign(customer, { name, phone, email, document, updatedAt: nowIso() });
      }
      conversation.customerId = customer.id;
      conversation.customerName = customer.name;
      conversation.customerPhone = customer.phone;
      conversation.assignedToName = input.actor.name;
      conversation.linkedOfferId = offerId;
      conversation.linkedPaymentId = paymentId;
      conversation.status = paymentId ? "PAYMENT_PENDING" : "OPEN";
      conversation.tags = Array.from(new Set([...(conversation.tags ?? []), "vinculado"]));
      conversation.lastMessageAt = nowIso();
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        workspaceId,
        conversationId: conversation.id,
        customerId: customer.id,
        direction: "INTERNAL",
        body: note,
        status: "SENT",
        metadataJson: { attendant: input.actor, action: "conversation_linked", offerId, paymentId },
        createdAt: nowIso()
      });
      return conversation;
    }
  );
}

export async function resolveConversation(
  conversationId: string,
  actor: { id: string; name: string },
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  const note = `Atendente ${actor.name} resolveu este atendimento.`;

  return withDatabase(
    async () =>
      prisma.$transaction(async (tx) => {
        const current = await tx.conversation.findFirstOrThrow({
          where: { id: conversationId, workspaceId }
        });
        await tx.message.create({
          data: {
            workspaceId,
            conversationId: current.id,
            customerId: current.customerId,
            direction: "INTERNAL",
            body: note,
            status: "SENT",
            metadataJson: { attendant: actor, action: "conversation_resolved" } as never
          }
        });
        const conversation = await tx.conversation.update({
          where: { id: current.id },
          data: {
            status: "RESOLVED",
            assignedToId: actor.id,
            lastMessageAt: new Date()
          },
          include: { customer: true, assignedTo: true, messages: { orderBy: { createdAt: "asc" } } }
        });
        return mapConversation(conversation);
      }),
    () => {
      const conversation = runtimeStore.conversations.find((item) => item.id === conversationId && item.workspaceId === workspaceId);
      if (!conversation) throw new Error("Conversa nao encontrada");
      conversation.status = "RESOLVED";
      conversation.assignedToName = actor.name;
      conversation.lastMessageAt = nowIso();
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        workspaceId,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        direction: "INTERNAL",
        body: note,
        status: "SENT",
        metadataJson: { attendant: actor, action: "conversation_resolved" },
        createdAt: nowIso()
      });
      return conversation;
    }
  );
}

export async function findCustomerByPhone(phone?: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "");

  return withDatabase(
    async () => {
      const customer = await prisma.customer.findFirst({ where: { workspaceId, phone: normalized } });
      return customer ? mapCustomer(customer) : null;
    },
    () => runtimeStore.customers.find((customer) => customer.phone === normalized && customer.workspaceId === workspaceId) ?? null
  );
}

export async function createOrUpdateCustomer(
  input: Omit<Partial<CustomerRecord>, "phone" | "name"> & { phone?: string | null; name?: string | null },
  workspaceId = DEFAULT_WORKSPACE_ID
) {
  const phone = input.phone?.replace(/\D/g, "") || null;
  return withDatabase(
    async () => {
      const existing = phone ? await prisma.customer.findFirst({ where: { workspaceId, phone } }) : null;
      const data = {
        name: input.name || existing?.name || "Cliente sem nome",
        phone,
        email: input.email,
        document: input.document,
        source: input.source,
        status: input.status,
        ctwaClid: existing?.ctwaClid ? undefined : input.ctwaClid,
        ctwaSourceId: existing?.ctwaSourceId ? undefined : input.ctwaSourceId,
        ctwaSourceUrl: existing?.ctwaSourceUrl ? undefined : input.ctwaSourceUrl,
        ctwaHeadline: existing?.ctwaHeadline ? undefined : input.ctwaHeadline,
        ctwaCapturedAt: existing?.ctwaCapturedAt ? undefined : input.ctwaCapturedAt ? new Date(input.ctwaCapturedAt) : undefined
      };
      const customer = existing
        ? await prisma.customer.update({ where: { id: existing.id }, data })
        : await prisma.customer.create({ data: { workspaceId, ...data } });
      return mapCustomer(customer);
    },
    () => {
      let customer = phone ? runtimeStore.customers.find((item) => item.workspaceId === workspaceId && item.phone === phone) : null;
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          workspaceId,
          name: input.name || "Cliente sem nome",
          phone,
          email: input.email ?? null,
          document: input.document ?? null,
          tags: input.tags ?? [],
          source: input.source ?? null,
          lastCampaign: input.lastCampaign ?? null,
          lastOffer: input.lastOffer ?? null,
          ctwaClid: input.ctwaClid ?? null,
          ctwaSourceId: input.ctwaSourceId ?? null,
          ctwaSourceUrl: input.ctwaSourceUrl ?? null,
          ctwaHeadline: input.ctwaHeadline ?? null,
          ctwaCapturedAt: input.ctwaCapturedAt ?? null,
          totalPurchases: input.totalPurchases ?? 0,
          status: input.status ?? "NEW",
          doNotContact: Boolean(input.doNotContact),
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        runtimeStore.customers.unshift(customer);
      } else {
        Object.assign(customer, {
          ...input,
          phone,
          ctwaClid: customer.ctwaClid ?? input.ctwaClid ?? null,
          ctwaSourceId: customer.ctwaSourceId ?? input.ctwaSourceId ?? null,
          ctwaSourceUrl: customer.ctwaSourceUrl ?? input.ctwaSourceUrl ?? null,
          ctwaHeadline: customer.ctwaHeadline ?? input.ctwaHeadline ?? null,
          ctwaCapturedAt: customer.ctwaCapturedAt ?? input.ctwaCapturedAt ?? null,
          updatedAt: nowIso()
        });
      }
      return customer;
    }
  );
}

function buildCustomerReferralData(referral?: {
  ctwaClid?: string | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  headline?: string | null;
} | null) {
  const ctwaClid = sanitizeText(referral?.ctwaClid ?? "", 700);
  if (!ctwaClid) return {};

  return {
    ctwaClid,
    ctwaSourceId: sanitizeText(referral?.sourceId ?? "", 180) || null,
    ctwaSourceUrl: sanitizeText(referral?.sourceUrl ?? "", 700) || null,
    ctwaHeadline: sanitizeText(referral?.headline ?? "", 260) || null,
    ctwaCapturedAt: new Date()
  };
}

export async function recordWebhookEvent(input: {
  workspaceId?: string;
  provider: "WHATSAPP" | "UMBRELLA" | "TRIBOPAY" | "MANGOFY" | "SIGILOPAY" | "LYTRONPAY" | "ALLOWPAYMENTS" | "UTMIFY" | "META_ADS";
  eventType: string;
  externalId?: string | null;
  rawPayloadJson: unknown;
  errorMessage?: string | null;
}) {
  const workspaceId = input.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const dedupeKey = `${workspaceId}:${input.provider}:${input.eventType}:${input.externalId ?? ""}`;
  if (input.externalId && runtimeStore.webhookExternalIds.has(dedupeKey)) {
    return { duplicated: true };
  }

  return withDatabase(
    async () => {
      if (input.externalId) {
        const existing = await prisma.webhookEvent.findFirst({
          where: {
            workspaceId,
            provider: input.provider,
            eventType: input.eventType,
            externalId: input.externalId
          }
        });
        if (existing?.processedAt && !input.errorMessage) return { duplicated: true };
      }

      await prisma.webhookEvent.upsert({
        where: {
          workspaceId_provider_eventType_externalId: {
            workspaceId,
            provider: input.provider,
            eventType: input.eventType,
            externalId: input.externalId ?? ""
          }
        },
        create: {
          workspaceId,
          provider: input.provider,
          eventType: input.eventType,
          externalId: input.externalId ?? "",
          rawPayloadJson: input.rawPayloadJson as never,
          processedAt: input.errorMessage ? null : new Date(),
          errorMessage: input.errorMessage
        },
        update: {
          rawPayloadJson: input.rawPayloadJson as never,
          processedAt: input.errorMessage ? null : new Date(),
          errorMessage: input.errorMessage
        }
      });
      return { duplicated: false };
    },
    () => {
      if (input.externalId) runtimeStore.webhookExternalIds.add(dedupeKey);
      return { duplicated: false };
    }
  );
}

export async function recordTrackingEvent(input: {
  workspaceId?: string;
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
  rawPayloadJson: unknown;
}) {
  const workspaceId = input.workspaceId ?? DEFAULT_WORKSPACE_ID;
  return withDatabase(
    async () => {
      await prisma.trackingEvent.create({
        data: {
          workspaceId,
          customerId: input.customerId,
          paymentId: input.paymentId,
          offerId: input.offerId,
          source: input.source,
          medium: input.medium,
          campaign: input.campaign,
          content: input.content,
          term: input.term,
          fbclid: input.fbclid,
          clickId: input.clickId,
          eventType: input.eventType,
          rawPayloadJson: input.rawPayloadJson as never
        }
      });
    },
    () => {
      runtimeStore.trackingEvents.unshift({
        id: `utm-${Date.now()}`,
        workspaceId,
        customerId: input.customerId,
        paymentId: input.paymentId,
        offerId: input.offerId,
        source: input.source,
        medium: input.medium,
        campaign: input.campaign,
        content: input.content,
        term: input.term,
        fbclid: input.fbclid,
        clickId: input.clickId,
        eventType: input.eventType,
        rawPayloadJson: input.rawPayloadJson,
        createdAt: nowIso()
      });
    }
  );
}

export async function findTrackingEventByClickId(clickId?: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  const normalized = sanitizeText(clickId ?? "", 180);
  if (!normalized) return null;

  return withDatabase(
    async () => {
      const event = await prisma.trackingEvent.findFirst({
        where: {
          workspaceId,
          clickId: normalized
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return event
        ? {
            id: event.id,
            workspaceId: event.workspaceId,
            customerId: event.customerId,
            paymentId: event.paymentId,
            offerId: event.offerId,
            source: event.source,
            medium: event.medium,
            campaign: event.campaign,
            content: event.content,
            term: event.term,
            fbclid: event.fbclid,
            clickId: event.clickId,
            eventType: event.eventType,
            rawPayloadJson: event.rawPayloadJson,
            createdAt: event.createdAt.toISOString()
          }
        : null;
    },
    () => runtimeStore.trackingEvents.find((event) => event.workspaceId === workspaceId && event.clickId === normalized) ?? null
  );
}

export async function getReportRows(workspaceId = DEFAULT_WORKSPACE_ID): Promise<ReportRow[]> {
  const [payments, offers] = await Promise.all([listPayments(workspaceId), listOffers(workspaceId)]);
  return offers.filter(isMusclePrimeOffer).map((offer) => {
    const offerPayments = payments.filter((payment) => payment.offerId === offer.id);
    return {
      group: offer.name,
      revenue: offerPayments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amount, 0),
      abandonments: offerPayments.filter((payment) => ["FAILED", "EXPIRED", "CANCELLED"].includes(payment.status)).length,
      recoveries: offer.recoveries,
      conversions: offerPayments.filter((payment) => payment.status === "PAID").length
    };
  });
}

function isMusclePrimeOffer(offer: OfferRecord) {
  return offer.slug === "muscleprime-brasil" || offer.name.toLowerCase() === "muscleprime brasil";
}

export async function findPayment(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  const payments = await listPayments(workspaceId);
  return payments.find((payment) => payment.id === id) ?? null;
}

export async function findCustomer(id?: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (!id) return null;
  const customers = await listCustomers(workspaceId);
  return customers.find((customer) => customer.id === id) ?? null;
}

export async function findOffer(id?: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (!id) return null;
  const offers = await listOffers(workspaceId);
  return offers.find((offer) => offer.id === id) ?? null;
}

export async function findConversationByCustomer(customerId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  const conversations = await getInboxSnapshot(workspaceId);
  return conversations.find((conversation) => conversation.customerId === customerId && conversation.status !== "RESOLVED") ?? null;
}

export async function ensureConversationForCustomer(customer: { id: string; name: string; phone?: string | null }, workspaceId = DEFAULT_WORKSPACE_ID) {
  const existing = await findConversationByCustomer(customer.id, workspaceId);
  if (existing) return existing;

  return withDatabase(
    async () =>
      mapConversation(
        await prisma.conversation.create({
          data: {
            workspaceId,
            customerId: customer.id,
            status: "RECOVERY",
            tags: ["recuperacao"],
            lastMessageAt: new Date()
          },
          include: { customer: true, assignedTo: true, messages: true }
        })
      ),
    () => {
      const conversation: ConversationRecord = {
        id: `conv-${Date.now()}`,
        workspaceId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        assignedToName: null,
        status: "RECOVERY",
        tags: ["recuperacao"],
        lastMessageAt: nowIso(),
        messages: []
      };
      runtimeStore.conversations.unshift(conversation);
      return conversation;
    }
  );
}

export async function markRecoveryConvertedForPayment(paymentId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return withDatabase(
    async () => {
      await prisma.recoveryAttempt.updateMany({
        where: {
          workspaceId,
          paymentId,
          status: { in: ["SCHEDULED", "SENT"] }
        },
        data: {
          status: "CONVERTED",
          convertedAt: new Date()
        }
      });
    },
    () => {
      runtimeStore.recoveryAttempts.forEach((attempt) => {
        if (attempt.paymentId === paymentId && attempt.workspaceId === workspaceId && ["SCHEDULED", "SENT"].includes(attempt.status)) {
          attempt.status = "CONVERTED";
          attempt.convertedAt = nowIso();
        }
      });
    }
  );
}

function mapProduct(item: {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  price: unknown;
  category?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProductRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    description: item.description,
    price: toNumber(item.price),
    category: item.category,
    status: item.status as ProductRecord["status"],
    createdAt: asIso(item.createdAt) ?? nowIso(),
    updatedAt: asIso(item.updatedAt) ?? nowIso()
  };
}

function mapOffer(item: {
  id: string;
  workspaceId: string;
  productId?: string | null;
  product?: { name: string } | null;
  name: string;
  slug: string;
  price: unknown;
  salesPageUrl?: string | null;
  checkoutUrl?: string | null;
  status: string;
  tags?: string[];
  trafficSourceDefault?: string | null;
  defaultUtmSource?: string | null;
  defaultUtmMedium?: string | null;
  defaultUtmCampaign?: string | null;
  visits?: number;
  checkoutStarts?: number;
  paymentsGenerated?: number;
  paymentsApproved?: number;
  abandonments?: number;
  recoveries?: number;
  allowExpiredRecovery?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): OfferRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    productId: item.productId,
    productName: item.product?.name,
    name: item.name,
    slug: item.slug,
    price: toNumber(item.price),
    salesPageUrl: item.salesPageUrl,
    checkoutUrl: item.checkoutUrl,
    status: item.status as OfferRecord["status"],
    tags: item.tags ?? [],
    trafficSourceDefault: item.trafficSourceDefault,
    defaultUtmSource: item.defaultUtmSource,
    defaultUtmMedium: item.defaultUtmMedium,
    defaultUtmCampaign: item.defaultUtmCampaign,
    visits: item.visits ?? 0,
    checkoutStarts: item.checkoutStarts ?? 0,
    paymentsGenerated: item.paymentsGenerated ?? 0,
    paymentsApproved: item.paymentsApproved ?? 0,
    abandonments: item.abandonments ?? 0,
    recoveries: item.recoveries ?? 0,
    allowExpiredRecovery: item.allowExpiredRecovery ?? true,
    createdAt: asIso(item.createdAt) ?? nowIso(),
    updatedAt: asIso(item.updatedAt) ?? nowIso()
  };
}

function mapCustomer(item: {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  tags?: string[];
  source?: string | null;
  lastCampaign?: string | null;
  lastOffer?: string | null;
  ctwaClid?: string | null;
  ctwaSourceId?: string | null;
  ctwaSourceUrl?: string | null;
  ctwaHeadline?: string | null;
  ctwaCapturedAt?: Date | string | null;
  totalPurchases?: number;
  status: string;
  doNotContact?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): CustomerRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    phone: item.phone,
    email: item.email,
    document: item.document,
    tags: item.tags ?? [],
    source: item.source,
    lastCampaign: item.lastCampaign,
    lastOffer: item.lastOffer,
    ctwaClid: item.ctwaClid,
    ctwaSourceId: item.ctwaSourceId,
    ctwaSourceUrl: item.ctwaSourceUrl,
    ctwaHeadline: item.ctwaHeadline,
    ctwaCapturedAt: asIso(item.ctwaCapturedAt),
    totalPurchases: item.totalPurchases ?? 0,
    status: item.status as CustomerRecord["status"],
    doNotContact: item.doNotContact ?? false,
    createdAt: asIso(item.createdAt) ?? nowIso(),
    updatedAt: asIso(item.updatedAt) ?? nowIso()
  };
}

function mapMessage(item: {
  id: string;
  workspaceId: string;
  conversationId: string;
  customerId: string;
  direction: string;
  body: string;
  providerMessageId?: string | null;
  status: string;
  metadataJson?: unknown;
  createdAt: Date | string;
}): MessageRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    conversationId: item.conversationId,
    customerId: item.customerId,
    direction: item.direction as MessageRecord["direction"],
    body: item.body,
    providerMessageId: item.providerMessageId,
    status: item.status as MessageRecord["status"],
    metadataJson: item.metadataJson,
    createdAt: asIso(item.createdAt) ?? nowIso()
  };
}

function readAttendantMetadata(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) return null;
  const attendant = (metadataJson as Record<string, unknown>).attendant;
  if (!attendant || typeof attendant !== "object" || Array.isArray(attendant)) return null;
  const id = (attendant as Record<string, unknown>).id;
  const name = (attendant as Record<string, unknown>).name;
  return typeof id === "string" && typeof name === "string" && id.trim() && name.trim()
    ? { id: id.trim(), name: name.trim() }
    : null;
}

function mapConversation(item: {
  id: string;
  workspaceId: string;
  customerId: string;
  customer: { name: string; phone?: string | null };
  assignedTo?: { name: string } | null;
  status: string;
  tags?: string[];
  linkedOfferId?: string | null;
  linkedPaymentId?: string | null;
  lastMessageAt?: Date | string | null;
  messages?: Parameters<typeof mapMessage>[0][];
}): ConversationRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    customerId: item.customerId,
    customerName: item.customer.name,
    customerPhone: item.customer.phone,
    assignedToName: item.assignedTo?.name,
    status: item.status as ConversationRecord["status"],
    tags: item.tags ?? [],
    linkedOfferId: item.linkedOfferId,
    linkedPaymentId: item.linkedPaymentId,
    lastMessageAt: asIso(item.lastMessageAt),
    messages: (item.messages ?? []).map(mapMessage)
  };
}

function mapPayment(item: {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  offerId?: string | null;
  offer?: { name: string } | null;
  provider: string;
  providerPaymentId: string;
  status: string;
  amount: unknown;
  currency: string;
  paymentMethod?: string | null;
  checkoutUrl?: string | null;
  pixCode?: string | null;
  boletoUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  paidAt?: Date | string | null;
  expiresAt?: Date | string | null;
}): PaymentRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    customerId: item.customerId,
    customerName: item.customer?.name,
    customerPhone: item.customer?.phone,
    offerId: item.offerId,
    offerName: item.offer?.name,
    provider: item.provider as PaymentRecord["provider"],
    providerPaymentId: item.providerPaymentId,
    status: item.status as PaymentStatus,
    amount: toNumber(item.amount),
    currency: item.currency,
    paymentMethod: item.paymentMethod,
    checkoutUrl: item.checkoutUrl,
    pixCode: item.pixCode,
    boletoUrl: item.boletoUrl,
    createdAt: asIso(item.createdAt) ?? nowIso(),
    updatedAt: asIso(item.updatedAt) ?? nowIso(),
    paidAt: asIso(item.paidAt),
    expiresAt: asIso(item.expiresAt)
  };
}

function mapRecoveryFlow(item: {
  id: string;
  workspaceId: string;
  offerId?: string | null;
  name: string;
  status: string;
  firstDelayMinutes: number;
  secondDelayMinutes: number;
  thirdDelayMinutes: number;
  maxAttempts: number;
  allowedStartHour: number;
  allowedEndHour: number;
  template1: string;
  template2: string;
  template3: string;
  stopOnPaid?: boolean;
}): RecoveryFlowRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    offerId: item.offerId,
    name: item.name,
    status: item.status as RecoveryFlowRecord["status"],
    firstDelayMinutes: item.firstDelayMinutes,
    secondDelayMinutes: item.secondDelayMinutes,
    thirdDelayMinutes: item.thirdDelayMinutes,
    maxAttempts: item.maxAttempts,
    allowedStartHour: item.allowedStartHour,
    allowedEndHour: item.allowedEndHour,
    template1: item.template1,
    template2: item.template2,
    template3: item.template3,
    stopOnPaid: item.stopOnPaid ?? true
  };
}

function mapRecoveryAttempt(item: {
  id: string;
  workspaceId: string;
  recoveryFlowId?: string | null;
  paymentId: string;
  customerId?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  conversationId?: string | null;
  status: string;
  attemptNumber: number;
  templateUsed?: string | null;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  convertedAt?: Date | string | null;
  errorMessage?: string | null;
  payment?: { status: string; amount: unknown; offer?: { name: string } | null } | null;
}): RecoveryAttemptRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    recoveryFlowId: item.recoveryFlowId,
    paymentId: item.paymentId,
    customerId: item.customerId,
    conversationId: item.conversationId,
    status: item.status as RecoveryAttemptRecord["status"],
    attemptNumber: item.attemptNumber,
    templateUsed: item.templateUsed,
    scheduledAt: asIso(item.scheduledAt) ?? nowIso(),
    sentAt: asIso(item.sentAt),
    convertedAt: asIso(item.convertedAt),
    errorMessage: item.errorMessage,
    customerName: item.customer?.name,
    customerPhone: item.customer?.phone,
    offerName: item.payment?.offer?.name,
    paymentStatus: item.payment?.status as PaymentStatus | undefined,
    amount: item.payment ? toNumber(item.payment.amount) : undefined
  };
}

function mapCampaign(item: {
  id: string;
  workspaceId: string;
  provider: string;
  providerCampaignId?: string | null;
  name: string;
  status: string;
  objective?: string | null;
  spend: unknown;
  impressions: number;
  clicks: number;
  ctr: unknown;
  cpc: unknown;
  cpm: unknown;
  revenue: unknown;
  roas: unknown;
  cpa: unknown;
  dateStart?: Date | string | null;
  dateEnd?: Date | string | null;
}): CampaignRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    provider: item.provider as CampaignRecord["provider"],
    providerCampaignId: item.providerCampaignId,
    name: item.name,
    status: item.status as CampaignRecord["status"],
    objective: item.objective,
    spend: toNumber(item.spend),
    impressions: item.impressions,
    clicks: item.clicks,
    ctr: toNumber(item.ctr),
    cpc: toNumber(item.cpc),
    cpm: toNumber(item.cpm),
    revenue: toNumber(item.revenue),
    roas: toNumber(item.roas),
    cpa: toNumber(item.cpa),
    dateStart: asIso(item.dateStart),
    dateEnd: asIso(item.dateEnd)
  };
}

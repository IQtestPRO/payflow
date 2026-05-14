import { toDataURL } from "qrcode";
import type { CustomerRecord, OfferRecord, PaymentRecord } from "@/lib/types";
import { appUrl } from "@/lib/env";
import { sanitizeText } from "@/lib/utils";
import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { getPaymentGatewayAdapter } from "@/server/gateways/adapters";
import { getGatewayRegistry } from "@/server/gateways/registry";
import {
  createOrUpdateCustomer,
  findCustomer,
  findOffer,
  findPayment,
  findTrackingEventByClickId,
  getInboxSnapshot,
  linkPaymentToConversation,
  recordTrackingEvent,
  upsertPayment
} from "@/server/repositories/payflow-repository";
import {
  buildInboxChargeDraft,
  isNotFound,
  normalizeDocument,
  normalizePhone,
  parseMoneyAmount,
  type InboxChargeAddressDraft,
  type InboxChargeDraft,
  type InboxChargeTrackingDraft
} from "@/server/services/inbox-charge-parser";
import { sendConversationMediaMessage, sendConversationMessage } from "@/server/services/messaging";
import { syncPaymentToUtmify } from "@/server/services/utmify-orders";

export const inboxChargeGatewayIds = ["umbrella", "mangofy", "sigilopay", "lytronpay", "allowpayments"] as const;
export type InboxChargeGatewayId = (typeof inboxChargeGatewayIds)[number];

export type InboxChargeGatewayOption = {
  id: InboxChargeGatewayId;
  name: string;
  logo: string;
  logoAlt: string;
  status: "available" | "not_configured" | "pending";
  statusLabel: string;
  reason: string;
};

export type InboxChargePreview = {
  draft: InboxChargeDraft;
  gateways: InboxChargeGatewayOption[];
};

export type InboxChargeCreateInput = {
  conversationId: string;
  gateway: InboxChargeGatewayId;
  draft: InboxChargeDraft;
};

export type InboxChargeResult = {
  payment: Pick<PaymentRecord, "id" | "provider" | "providerPaymentId" | "status" | "amount" | "paymentMethod" | "pixCode" | "checkoutUrl" | "createdAt">;
  transaction: {
    id: string;
    status: string | null;
    gateway: InboxChargeGatewayId;
    pixCopyPaste: string | null;
    qrCodeDataUrl: string | null;
    paymentUrl: string | null;
    expiresAt: string | null;
  };
  customer: Pick<CustomerRecord, "id" | "name" | "phone" | "email" | "document">;
  utmify: unknown;
  sendTemplates: {
    qrCaption: string;
    pixText: string;
  };
};

export async function getInboxChargePreview(conversationId: string, workspaceId: string): Promise<InboxChargePreview> {
  const context = await resolveConversationContext(conversationId, workspaceId);
  const draft = await enrichDraftFromTrackingRedirect(buildInboxChargeDraft(context), workspaceId);

  return {
    draft,
    gateways: buildGatewayOptions()
  };
}

export async function createInboxCharge(input: InboxChargeCreateInput, workspaceId: string): Promise<InboxChargeResult> {
  const context = await resolveConversationContext(input.conversationId, workspaceId);
  const gateway = normalizeInboxGateway(input.gateway);
  if (!gateway) throw new Error("Gateway invalido para cobrancas da inbox.");

  const gatewayOption = buildGatewayOptions().find((item) => item.id === gateway);
  if (!gatewayOption || gatewayOption.status !== "available") {
    throw new Error(gatewayOption?.reason ?? "Gateway ainda nao operacional para cobrancas.");
  }

  const normalized = normalizeDraft(input.draft, gateway);
  const customer = await createOrUpdateCustomer(
    {
      name: normalized.name,
      phone: normalized.phone,
      email: normalized.email || undefined,
      document: normalized.document,
      status: "PAYMENT_PENDING",
      source: normalized.tracking.source ?? gatewayOption.name,
      lastCampaign: normalized.tracking.campaign ?? undefined,
      lastOffer: normalized.product
    },
    workspaceId
  );

  const rawTransaction = gateway === "umbrella" ? await createUmbrellaCharge(normalized, context.offer, workspaceId) : await createLytronCharge(normalized);
  const transaction = normalizeGatewayTransaction(rawTransaction, gateway, normalized.amount);
  if (!transaction.id) throw new Error(`${gatewayOption.name} nao retornou identificador da transacao.`);

  const qrCodeDataUrl = transaction.pixCopyPaste ? await toDataURL(transaction.pixCopyPaste, { margin: 2, width: 320 }) : null;
  const offerId = context.offer?.id ?? null;
  const payment = await upsertPayment(
    {
      workspaceId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      offerId,
      offerName: context.offer?.name ?? normalized.product,
      provider: gateway === "umbrella" ? "UMBRELLA" : "LYTRONPAY",
      providerPaymentId: transaction.id,
      status: transaction.status === "PAID" ? "PAID" : transaction.pixCopyPaste ? "PIX_GENERATED" : "PENDING",
      amount: transaction.amount ?? normalized.amount,
      currency: "BRL",
      paymentMethod: "PIX",
      checkoutUrl: transaction.paymentUrl,
      pixCode: transaction.pixCopyPaste,
      boletoUrl: null,
      paidAt: null,
      expiresAt: transaction.expiresAt,
      rawPayloadJson: {
        source: "inbox_charge",
        gateway,
        transaction: rawTransaction,
        tracking: normalized.tracking,
        conversationId: input.conversationId
      }
    },
    workspaceId
  );

  await linkPaymentToConversation(input.conversationId, payment.id, workspaceId, offerId);
  await recordTrackingEvent({
    workspaceId,
    customerId: customer.id,
    paymentId: payment.id,
    offerId,
    source: normalized.tracking.source ?? context.offer?.defaultUtmSource ?? null,
    medium: normalized.tracking.medium ?? context.offer?.defaultUtmMedium ?? null,
    campaign: normalized.tracking.campaign ?? context.offer?.defaultUtmCampaign ?? null,
    content: normalized.tracking.content ?? null,
    term: normalized.tracking.term ?? null,
    fbclid: normalized.tracking.fbclid ?? null,
    clickId: normalized.tracking.clickId ?? null,
    eventType: "inbox_charge_created",
    rawPayloadJson: {
      gateway,
      conversationId: input.conversationId,
      providerPaymentId: transaction.id,
      product: normalized.product,
      amount: normalized.amount
    }
  });

  const utmify = await syncPaymentToUtmify({
    payment,
    customer,
    offer: context.offer,
    tracking: normalized.tracking,
    itemTitle: normalized.product,
    rawSource: rawTransaction,
    isTest: false
  });

  return {
    payment: {
      id: payment.id,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      status: payment.status,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      pixCode: payment.pixCode,
      checkoutUrl: payment.checkoutUrl,
      createdAt: payment.createdAt
    },
    transaction: {
      id: transaction.id,
      status: transaction.status,
      gateway,
      pixCopyPaste: transaction.pixCopyPaste,
      qrCodeDataUrl,
      paymentUrl: transaction.paymentUrl,
      expiresAt: transaction.expiresAt
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      document: customer.document
    },
    utmify,
    sendTemplates: buildSendTemplates({
      gatewayName: gatewayOption.name,
      product: normalized.product,
      amount: transaction.amount ?? normalized.amount,
      pixCopyPaste: transaction.pixCopyPaste,
      paymentUrl: transaction.paymentUrl
    })
  };
}

export async function sendInboxChargeArtifact(input: {
  conversationId: string;
  paymentId: string;
  artifact: "qr_code" | "pix_copy_paste";
}, workspaceId: string) {
  const conversations = await getInboxSnapshot(workspaceId);
  const conversation = conversations.find((item) => item.id === input.conversationId);
  if (!conversation) throw new Error("Conversa nao encontrada");

  const payment = await findPayment(input.paymentId, workspaceId);
  if (!payment) throw new Error("Pagamento nao encontrado");
  if (payment.customerId && payment.customerId !== conversation.customerId) throw new Error("Pagamento nao pertence a esta conversa");
  if (conversation.linkedPaymentId && conversation.linkedPaymentId !== payment.id) throw new Error("Esta conversa esta vinculada a outra cobranca");
  if (!payment.pixCode) throw new Error("Pagamento sem Pix copia e cola");

  if (input.artifact === "pix_copy_paste") {
    return {
      ...(await sendConversationMessage(input.conversationId, buildPixMessage(payment), workspaceId)),
      sentAs: "text" as const
    };
  }

  const qrCodeDataUrl = await toDataURL(payment.pixCode, { margin: 2, width: 320 });
  const caption = `QR Code Pix - ${payment.offerName ?? "cobranca PayFlow"}\nValor: ${formatCurrency(payment.amount)}`;

  try {
    return {
      ...(await sendConversationMediaMessage(input.conversationId, {
        caption,
        mediaBase64: qrCodeDataUrl,
        fileName: `payflow-pix-${payment.providerPaymentId}.png`,
        metadata: {
          paymentId: payment.id,
          providerPaymentId: payment.providerPaymentId,
          artifact: input.artifact
        }
      }, workspaceId)),
      sentAs: "media" as const
    };
  } catch {
    return {
      ...(await sendConversationMessage(
        input.conversationId,
        `${caption}\n\nNao consegui enviar a imagem do QR automaticamente por este provider. Use o Pix copia e cola que enviarei em separado.`,
        workspaceId
      )),
      sentAs: "text" as const
    };
  }
}

function buildGatewayOptions(): InboxChargeGatewayOption[] {
  const registry = getGatewayRegistry();
  return registry
    .filter((gateway) => inboxChargeGatewayIds.includes(gateway.id as InboxChargeGatewayId))
    .map((gateway) => {
      const id = gateway.id as InboxChargeGatewayId;
      const adapter = getPaymentGatewayAdapter(id);
      const configured = adapter.isConfigured();
      const realCreate = id === "umbrella" || id === "lytronpay";
      return {
        id,
        name: gateway.uiLabel,
        logo: gateway.logo,
        logoAlt: gateway.logoAlt,
        status: realCreate && configured ? "available" : realCreate ? "not_configured" : "pending",
        statusLabel: realCreate && configured ? "Operacional" : realCreate ? "Nao configurado" : "Pendente",
        reason: realCreate
          ? configured
            ? "Gateway pronto para gerar Pix real."
            : "Credenciais ainda nao configuradas no servidor."
          : "Documentacao/adapter real pendente. Nao vou inventar payload de producao."
      };
    });
}

async function resolveConversationContext(conversationId: string, workspaceId: string) {
  const conversations = await getInboxSnapshot(workspaceId);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) throw new Error("Conversa nao encontrada");

  const [customer, offer] = await Promise.all([findCustomer(conversation.customerId, workspaceId), findOffer(conversation.linkedOfferId, workspaceId)]);
  return { conversation, customer, offer };
}

async function enrichDraftFromTrackingRedirect(draft: InboxChargeDraft, workspaceId: string): Promise<InboxChargeDraft> {
  const clickId = cleanOptional(draft.tracking.clickId);
  if (!clickId) return draft;

  const trackingEvent = await findTrackingEventByClickId(clickId, workspaceId);
  if (!trackingEvent) return draft;

  const offer = await findOffer(trackingEvent.offerId, workspaceId);
  const shouldUseOfferProduct = isNotFound(draft.product) && offer?.name;
  const shouldUseOfferAmount = isNotFound(draft.amount) && typeof offer?.price === "number" && offer.price > 0;

  return {
    ...draft,
    product: shouldUseOfferProduct ? offer.name : draft.product,
    amount: shouldUseOfferAmount ? offer.price.toFixed(2) : draft.amount,
    tracking: {
      ...draft.tracking,
      offerId: draft.tracking.offerId ?? trackingEvent.offerId ?? offer?.id ?? null,
      offerSlug: draft.tracking.offerSlug ?? offer?.slug ?? null,
      source: draft.tracking.source ?? trackingEvent.source ?? null,
      medium: draft.tracking.medium ?? trackingEvent.medium ?? null,
      campaign: draft.tracking.campaign ?? trackingEvent.campaign ?? null,
      content: draft.tracking.content ?? trackingEvent.content ?? null,
      term: draft.tracking.term ?? trackingEvent.term ?? null,
      fbclid: draft.tracking.fbclid ?? trackingEvent.fbclid ?? null,
      clickId
    },
    fieldState: {
      ...draft.fieldState,
      ...(shouldUseOfferProduct ? { product: { found: true, source: "offer" as const } } : {}),
      ...(shouldUseOfferAmount ? { amount: { found: true, source: "offer" as const } } : {})
    }
  };
}

function normalizeInboxGateway(value: string): InboxChargeGatewayId | null {
  return inboxChargeGatewayIds.includes(value as InboxChargeGatewayId) ? (value as InboxChargeGatewayId) : null;
}

function normalizeDraft(draft: InboxChargeDraft, gateway: InboxChargeGatewayId) {
  const amount = parseMoneyAmount(draft.amount);
  const document = normalizeDocument(draft.document);
  const phone = normalizePhone(draft.phone);
  const email = cleanField(draft.email);
  const name = cleanField(draft.name);
  const product = cleanField(draft.product);

  if (!name) throw new Error("Informe o nome do cliente.");
  if (!phone || phone.length < 10) throw new Error("Informe um telefone valido.");
  if (!document || ![11, 14].includes(document.length)) throw new Error("Informe CPF/CNPJ valido.");
  if (gateway === "lytronpay" && document.length !== 11) throw new Error("LytronPay exige CPF valido do cliente.");
  if (!product) throw new Error("Informe o produto da cobranca.");
  if (!amount) throw new Error("Informe um valor valido.");

  if (gateway === "umbrella") {
    if (!email || !email.includes("@")) throw new Error("Umbrella exige e-mail real do cliente.");
    validateUmbrellaAddress(draft.address);
  }

  return {
    name,
    phone,
    email,
    document,
    product,
    amount,
    address: normalizeAddress(draft.address),
    tracking: sanitizeTracking(draft.tracking)
  };
}

function validateUmbrellaAddress(address: InboxChargeAddressDraft) {
  const normalized = normalizeAddress(address);
  if (normalized.zipCode.length !== 8) throw new Error("Umbrella exige CEP valido.");
  if (!normalized.street || !normalized.streetNumber || !normalized.neighborhood || !normalized.city || !/^[A-Z]{2}$/.test(normalized.state)) {
    throw new Error("Umbrella exige endereco completo: rua, numero, bairro, cidade e UF.");
  }
}

function normalizeAddress(address: InboxChargeAddressDraft) {
  return {
    zipCode: cleanField(address.zipCode).replace(/\D/g, ""),
    street: cleanField(address.street),
    streetNumber: cleanField(address.streetNumber),
    neighborhood: cleanField(address.neighborhood),
    complement: cleanField(address.complement),
    city: cleanField(address.city),
    state: cleanField(address.state).toUpperCase(),
    country: "BR"
  };
}

async function createUmbrellaCharge(
  normalized: ReturnType<typeof normalizeDraft>,
  offer: OfferRecord | null | undefined,
  workspaceId: string
) {
  const provider = new UmbrellaProvider();
  const externalRef = `payflow-inbox-${Date.now()}`;
  const amountInCents = Math.round(normalized.amount * 100);

  return provider.createTransaction({
    amount: amountInCents,
    currency: "BRL",
    paymentMethod: "PIX",
    installments: 1,
    customer: {
      name: normalized.name,
      email: normalized.email,
      document: {
        number: normalized.document,
        type: normalized.document.length === 14 ? "CNPJ" : "CPF"
      },
      phone: normalized.phone,
      externalRef,
      address: normalized.address
    },
    items: [
      {
        title: normalized.product,
        unitPrice: amountInCents,
        quantity: 1,
        tangible: false,
        externalRef: offer?.slug ?? normalized.tracking.offerSlug ?? "payflow-inbox"
      }
    ],
    pix: { expiresInDays: 1 },
    postbackUrl: `${appUrl().replace(/\/$/, "")}/api/webhooks/umbrella`,
    metadata: JSON.stringify({
      source: "payflow_inbox",
      workspaceId,
      externalRef,
      offerId: offer?.id ?? normalized.tracking.offerId ?? null,
      offerSlug: offer?.slug ?? normalized.tracking.offerSlug ?? null,
      clickId: normalized.tracking.clickId ?? null,
      fbclid: normalized.tracking.fbclid ?? null,
      src: normalized.tracking.src ?? null,
      sck: normalized.tracking.sck ?? null,
      utm: {
        source: normalized.tracking.source ?? null,
        medium: normalized.tracking.medium ?? null,
        campaign: normalized.tracking.campaign ?? null,
        content: normalized.tracking.content ?? null,
        term: normalized.tracking.term ?? null
      }
    }),
    traceable: true
  });
}

async function createLytronCharge(normalized: ReturnType<typeof normalizeDraft>) {
  const adapter = getPaymentGatewayAdapter("lytronpay");
  if (!adapter.createTransaction) throw new Error("Adapter LytronPay indisponivel.");
  return adapter.createTransaction({
    amount: normalized.amount,
    description: normalized.product,
    customer: {
      name: normalized.name,
      email: normalized.email || undefined,
      phone: normalized.phone,
      document: {
        type: "cpf" as const,
        number: normalized.document
      }
    }
  });
}

function normalizeGatewayTransaction(raw: unknown, gateway: InboxChargeGatewayId, fallbackAmount: number) {
  const root = isRecord(raw) ? raw : {};
  const data = isRecord(root.data) ? root.data : root;
  const pix = isRecord(data.pix) ? data.pix : {};
  const boleto = isRecord(data.boleto) ? data.boleto : {};
  const pixCopyPaste =
    stringValue(data.copyPaste) ??
    stringValue(data.pixCode) ??
    stringValue(data.pix_code) ??
    stringValue(data.qrCode) ??
    stringValue(data.qrcode) ??
    stringValue(data.brCode) ??
    stringValue(pix.qrcode) ??
    stringValue(pix.qrCode) ??
    stringValue(pix.payload) ??
    stringValue(pix.emv);

  return {
    id:
      stringValue(data.txid) ??
      stringValue(data.id) ??
      stringValue(data.transactionId) ??
      stringValue(data.transaction_id) ??
      stringValue(data.paymentId) ??
      stringValue(data.payment_id) ??
      `${gateway}-${Date.now()}`,
    status: mapProviderStatus(stringValue(data.status)),
    amount: normalizeProviderAmount(numberValue(data.amount) ?? numberValue(data.totalAmount), fallbackAmount, gateway),
    pixCopyPaste,
    paymentUrl:
      stringValue(data.checkoutUrl) ??
      stringValue(data.checkout_url) ??
      stringValue(data.secureUrl) ??
      stringValue(data.payUrl) ??
      stringValue(data.webUrl) ??
      stringValue(data.appUrl) ??
      stringValue(boleto.url),
    expiresAt: isoDateValue(data.expiresAt ?? data.expires_at)
  };
}

function buildSendTemplates(input: {
  gatewayName: string;
  product: string;
  amount: number;
  pixCopyPaste: string | null;
  paymentUrl: string | null;
}) {
  return {
    qrCaption: `QR Code Pix - ${input.product}\nValor: ${formatCurrency(input.amount)}\nGateway: ${input.gatewayName}`,
    pixText:
      `Pix copia e cola - ${input.product}\n` +
      `Valor: ${formatCurrency(input.amount)}\n\n` +
      `${input.pixCopyPaste ?? input.paymentUrl ?? "Pix indisponivel no retorno do gateway."}`
  };
}

function buildPixMessage(payment: PaymentRecord) {
  return payment.pixCode ?? "";
}

function mapProviderStatus(value: string | null) {
  const normalized = value?.toLowerCase();
  if (!normalized) return null;
  if (["paid", "approved", "completed", "pago"].includes(normalized)) return "PAID";
  if (["expired", "expirado"].includes(normalized)) return "EXPIRED";
  if (["cancelled", "canceled", "cancelado"].includes(normalized)) return "CANCELLED";
  if (["failed", "rejected", "refused", "falhou"].includes(normalized)) return "FAILED";
  return value;
}

function normalizeProviderAmount(value: number | null, fallbackAmount: number, gateway: InboxChargeGatewayId) {
  if (!value) return fallbackAmount;
  if (gateway === "umbrella" && Number.isInteger(value) && value > fallbackAmount * 10) return value / 100;
  return value;
}

function sanitizeTracking(tracking: InboxChargeTrackingDraft): InboxChargeTrackingDraft {
  return {
    offerId: cleanOptional(tracking.offerId),
    offerSlug: cleanOptional(tracking.offerSlug),
    clickId: cleanOptional(tracking.clickId),
    fbclid: cleanOptional(tracking.fbclid),
    source: cleanOptional(tracking.source),
    medium: cleanOptional(tracking.medium),
    campaign: cleanOptional(tracking.campaign),
    content: cleanOptional(tracking.content),
    term: cleanOptional(tracking.term),
    src: cleanOptional(tracking.src),
    sck: cleanOptional(tracking.sck)
  };
}

function cleanField(value?: string | null) {
  const cleaned = sanitizeText(value ?? "", 500);
  return cleaned && !isNotFound(cleaned) ? cleaned : "";
}

function cleanOptional(value?: string | null) {
  const cleaned = cleanField(value);
  return cleaned || null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isoDateValue(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

import type { CustomerRecord, OfferRecord, PaymentRecord, PaymentStatus, RecoveryAttemptRecord } from "@/lib/types";
import { addMinutes, nowIso } from "@/lib/utils";
import { getWhatsAppProvider } from "@/providers/whatsapp";
import { getRecoveryQueue } from "@/server/automation/recovery-queue";
import {
  appendOutboundMessage,
  cancelRecoveryForPayment,
  createRecoveryAttempts,
  ensureConversationForCustomer,
  findCustomer,
  findOffer,
  findPayment,
  listRecoveryAttempts,
  listRecoveryFlows,
  markRecoveryConvertedForPayment,
  updateRecoveryAttempt
} from "@/server/repositories/payflow-repository";

export const recoverablePaymentStatuses: PaymentStatus[] = [
  "PENDING",
  "WAITING_PAYMENT",
  "PIX_GENERATED",
  "BOLETO_GENERATED",
  "FAILED",
  "EXPIRED"
];

export function isPaymentRecoverable(payment: Pick<PaymentRecord, "status">, offer?: Pick<OfferRecord, "allowExpiredRecovery"> | null) {
  if (!recoverablePaymentStatuses.includes(payment.status)) return false;
  if (payment.status === "EXPIRED" && offer?.allowExpiredRecovery === false) return false;
  return true;
}

export function isWithinAllowedWindow(date: Date, startHour: number, endHour: number) {
  const hour = date.getHours();
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

export function nextAllowedSendAt(date: Date, startHour: number, endHour: number) {
  if (isWithinAllowedWindow(date, startHour, endHour)) return date;

  const next = new Date(date);
  next.setHours(startHour, 0, 0, 0);
  if (next <= date) next.setDate(next.getDate() + 1);
  return next;
}

export function renderRecoveryTemplate(template: string, input: { customer?: CustomerRecord | null; offer?: OfferRecord | null; payment: PaymentRecord }) {
  return template
    .replaceAll("{{customerName}}", input.customer?.name ?? "tudo bem")
    .replaceAll("{{offerName}}", input.offer?.name ?? "sua oferta")
    .replaceAll("{{checkoutUrl}}", input.payment.checkoutUrl ?? input.offer?.checkoutUrl ?? "")
    .replaceAll("{{amount}}", new Intl.NumberFormat("pt-BR", { style: "currency", currency: input.payment.currency }).format(input.payment.amount));
}

export async function scheduleRecoveryForPayment(payment: PaymentRecord, workspaceId = payment.workspaceId) {
  const [customer, offer, attempts, flows] = await Promise.all([
    findCustomer(payment.customerId, workspaceId),
    findOffer(payment.offerId, workspaceId),
    listRecoveryAttempts(workspaceId),
    listRecoveryFlows(workspaceId)
  ]);

  if (payment.status === "PAID") {
    await markRecoveryConvertedForPayment(payment.id, workspaceId);
    return { scheduled: 0, reason: "paid" };
  }

  if (!isPaymentRecoverable(payment, offer)) {
    return { scheduled: 0, reason: "not_recoverable" };
  }

  if (!customer?.phone) {
    return { scheduled: 0, reason: "missing_phone" };
  }

  if (customer.doNotContact) {
    return { scheduled: 0, reason: "do_not_contact" };
  }

  if (attempts.some((attempt) => attempt.paymentId === payment.id && ["SCHEDULED", "SENT"].includes(attempt.status))) {
    return { scheduled: 0, reason: "already_scheduled" };
  }

  const flow =
    flows.find((candidate) => candidate.offerId === payment.offerId && candidate.status === "ACTIVE") ??
    flows.find((candidate) => candidate.status === "ACTIVE");

  if (!flow) {
    return { scheduled: 0, reason: "missing_flow" };
  }

  const conversation = await ensureConversationForCustomer(customer, workspaceId);
  const now = new Date();
  const delays = [flow.firstDelayMinutes, flow.secondDelayMinutes, flow.thirdDelayMinutes].slice(0, flow.maxAttempts);
  const templates = [flow.template1, flow.template2, flow.template3];

  const scheduledAttempts = delays.map((delay, index): RecoveryAttemptRecord => {
    const scheduledAt = nextAllowedSendAt(addMinutes(now, delay), flow.allowedStartHour, flow.allowedEndHour);
    return {
      id: `attempt-${Date.now()}-${index + 1}`,
      workspaceId,
      recoveryFlowId: flow.id,
      paymentId: payment.id,
      customerId: customer.id,
      conversationId: conversation.id,
      status: "SCHEDULED",
      attemptNumber: index + 1,
      templateUsed: renderRecoveryTemplate(templates[index] ?? templates[0], { customer, offer, payment }),
      scheduledAt: scheduledAt.toISOString(),
      sentAt: null,
      convertedAt: null,
      errorMessage: null,
      customerName: customer.name,
      customerPhone: customer.phone,
      offerName: offer?.name,
      paymentStatus: payment.status,
      amount: payment.amount
    };
  });

  await createRecoveryAttempts(scheduledAttempts, workspaceId);
  const queue = getRecoveryQueue();
  await Promise.all(scheduledAttempts.map((attempt) => queue.enqueueAttempt(attempt)));
  return { scheduled: scheduledAttempts.length, reason: "scheduled" };
}

export async function sendRecoveryForPaymentNow(paymentId: string, workspaceId?: string) {
  const payment = await findPayment(paymentId, workspaceId);
  if (!payment) throw new Error("Pagamento não encontrado");

  const customer = await findCustomer(payment.customerId, payment.workspaceId);
  const offer = await findOffer(payment.offerId, payment.workspaceId);
  const flows = await listRecoveryFlows(payment.workspaceId);
  const flow = flows.find((candidate) => candidate.offerId === payment.offerId) ?? flows[0];

  if (!customer?.phone) throw new Error("Cliente sem WhatsApp");
  if (customer.doNotContact) throw new Error("Cliente marcou opt-out");
  if (!flow) throw new Error("Nenhum fluxo de recuperação ativo");
  if (!isPaymentRecoverable(payment, offer)) throw new Error("Pagamento não é recuperável");
  if (!isWithinAllowedWindow(new Date(), flow.allowedStartHour, flow.allowedEndHour)) {
    throw new Error(`Envio bloqueado fora do horário permitido (${flow.allowedStartHour}h-${flow.allowedEndHour}h)`);
  }

  const conversation = await ensureConversationForCustomer(customer, payment.workspaceId);
  const attempts = await listRecoveryAttempts(payment.workspaceId);
  let attempt = attempts.find((candidate) => candidate.paymentId === payment.id && candidate.status === "SCHEDULED");

  if (!attempt) {
    attempt = {
      id: `attempt-${Date.now()}`,
      workspaceId: payment.workspaceId,
      recoveryFlowId: flow.id,
      paymentId: payment.id,
      customerId: customer.id,
      conversationId: conversation.id,
      status: "SCHEDULED",
      attemptNumber: attempts.filter((candidate) => candidate.paymentId === payment.id).length + 1,
      templateUsed: renderRecoveryTemplate(flow.template1, { customer, offer, payment }),
      scheduledAt: nowIso(),
      customerName: customer.name,
      customerPhone: customer.phone,
      offerName: offer?.name,
      paymentStatus: payment.status,
      amount: payment.amount
    };
    await createRecoveryAttempts([attempt], payment.workspaceId);
  }

  const body = attempt.templateUsed || renderRecoveryTemplate(flow.template1, { customer, offer, payment });
  const provider = getWhatsAppProvider();
  const result = await provider.sendMessage({ to: customer.phone, body, metadata: { paymentId: payment.id, recoveryAttemptId: attempt.id } });
  const message = await appendOutboundMessage(conversation.id, body, result.providerMessageId, payment.workspaceId);
  await updateRecoveryAttempt(
    attempt.id,
    {
      status: "SENT",
      sentAt: nowIso(),
      conversationId: conversation.id
    },
    payment.workspaceId
  );

  return { message, attemptId: attempt.id, providerMessageId: result.providerMessageId };
}

export async function cancelRecoveryBecausePaid(payment: Pick<PaymentRecord, "id" | "workspaceId">) {
  await markRecoveryConvertedForPayment(payment.id, payment.workspaceId);
  await cancelRecoveryForPayment(payment.id, payment.workspaceId);
}

export async function pauseRecoveryForPayment(paymentId: string, workspaceId?: string) {
  const payment = await findPayment(paymentId, workspaceId);
  if (!payment) throw new Error("Pagamento não encontrado");
  await cancelRecoveryForPayment(payment.id, payment.workspaceId);
  await getRecoveryQueue().cancelPayment(payment.id);
  return { ok: true };
}

import { createOrUpdateCustomer, getWorkspaceId, recordTrackingEvent, recordWebhookEvent, registerInboundWhatsAppMessage, upsertPayment } from "@/server/repositories/payflow-repository";
import { cancelRecoveryBecausePaid, scheduleRecoveryForPayment } from "@/server/services/recovery";
import { getWhatsAppProvider } from "@/providers/whatsapp";
import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { TriboPayProvider } from "@/providers/payments/tribopay";
import { UtmifyProvider } from "@/providers/tracking/utmify";

export async function processWhatsAppWebhookPayload(payload: unknown, workspaceId?: string) {
  const targetWorkspaceId = workspaceId ?? (await getWorkspaceId());
  const provider = getWhatsAppProvider();
  const messages = provider.parseWebhook(payload);
  const results = [];

  for (const message of messages) {
    const event = await recordWebhookEvent({
      workspaceId: targetWorkspaceId,
      provider: "WHATSAPP",
      eventType: message.eventType,
      externalId: message.providerMessageId,
      rawPayloadJson: message.raw
    });

    if (event.duplicated) {
      results.push({ duplicated: true, providerMessageId: message.providerMessageId });
      continue;
    }

    results.push(await registerInboundWhatsAppMessage({ ...message, workspaceId: targetWorkspaceId, metadataJson: message.raw }));
  }

  return { received: messages.length, results };
}

export async function processUmbrellaWebhookPayload(payload: unknown, workspaceId?: string) {
  const targetWorkspaceId = workspaceId ?? (await getWorkspaceId());
  const provider = new UmbrellaProvider();
  const normalized = provider.normalizeWebhook(payload);

  const webhook = await recordWebhookEvent({
    workspaceId: targetWorkspaceId,
    provider: "UMBRELLA",
    eventType: normalized.eventType,
    externalId: normalized.externalId,
    rawPayloadJson: normalized.raw
  });

  if (webhook.duplicated) {
    return { duplicated: true };
  }

  const customer = await createOrUpdateCustomer(
    {
      name: normalized.customer.name,
      phone: normalized.customer.phone,
      email: normalized.customer.email,
      document: normalized.customer.document,
      status: normalized.payment.status === "PAID" ? "BUYER" : "PAYMENT_PENDING",
      source: "Umbrella"
    },
    targetWorkspaceId
  );

  const payment = await upsertPayment(
    {
      ...normalized.payment,
      workspaceId: targetWorkspaceId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone
    },
    targetWorkspaceId
  );

  if (payment.status === "PAID") {
    await cancelRecoveryBecausePaid(payment);
    return { payment, recovery: "converted" };
  }

  const recovery = await scheduleRecoveryForPayment(payment, targetWorkspaceId);
  return { payment, recovery };
}

export async function processTriboPayWebhookPayload(payload: unknown, workspaceId?: string) {
  const targetWorkspaceId = workspaceId ?? (await getWorkspaceId());
  const provider = new TriboPayProvider();
  const normalized = provider.normalizeWebhook(payload);

  const webhook = await recordWebhookEvent({
    workspaceId: targetWorkspaceId,
    provider: "TRIBOPAY",
    eventType: normalized.eventType,
    externalId: normalized.externalId,
    rawPayloadJson: normalized.raw
  });

  if (webhook.duplicated) {
    return { duplicated: true };
  }

  const customer = await createOrUpdateCustomer(
    {
      name: normalized.customer.name,
      phone: normalized.customer.phone,
      email: normalized.customer.email,
      document: normalized.customer.document,
      status: normalized.payment.status === "PAID" ? "BUYER" : "PAYMENT_PENDING",
      source: "TriboPay"
    },
    targetWorkspaceId
  );

  const payment = await upsertPayment(
    {
      ...normalized.payment,
      workspaceId: targetWorkspaceId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone
    },
    targetWorkspaceId
  );

  if (payment.status === "PAID") {
    await cancelRecoveryBecausePaid(payment);
    return { payment, recovery: "converted" };
  }

  const recovery = await scheduleRecoveryForPayment(payment, targetWorkspaceId);
  return { payment, recovery };
}

export async function processUtmifyWebhookPayload(payload: unknown, workspaceId?: string) {
  const targetWorkspaceId = workspaceId ?? (await getWorkspaceId());
  const provider = new UtmifyProvider();
  const normalized = provider.normalizeWebhook(payload);

  const webhook = await recordWebhookEvent({
    workspaceId: targetWorkspaceId,
    provider: "UTMIFY",
    eventType: normalized.eventType,
    externalId: normalized.externalId,
    rawPayloadJson: normalized.raw
  });

  if (webhook.duplicated) {
    return { duplicated: true };
  }

  let customerId: string | null = null;
  if (normalized.customerPhone || normalized.customerEmail) {
    const customer = await createOrUpdateCustomer(
      {
        phone: normalized.customerPhone,
        email: normalized.customerEmail,
        source: normalized.source,
        lastCampaign: normalized.campaign,
        status: "NEW"
      },
      targetWorkspaceId
    );
    customerId = customer.id;
  }

  await recordTrackingEvent({
    workspaceId: targetWorkspaceId,
    customerId,
    paymentId: normalized.paymentId,
    offerId: normalized.offerId,
    source: normalized.source,
    medium: normalized.medium,
    campaign: normalized.campaign,
    content: normalized.content,
    term: normalized.term,
    fbclid: normalized.fbclid,
    clickId: normalized.clickId,
    eventType: normalized.eventType,
    rawPayloadJson: normalized.raw
  });

  return { ok: true };
}

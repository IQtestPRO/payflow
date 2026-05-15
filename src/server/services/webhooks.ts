import { createOrUpdateCustomer, getWorkspaceId, recordTrackingEvent, recordWebhookEvent, registerInboundWhatsAppMessage, upsertPayment } from "@/server/repositories/payflow-repository";
import { cancelRecoveryBecausePaid, scheduleRecoveryForPayment } from "@/server/services/recovery";
import { getWhatsAppProvider } from "@/providers/whatsapp";
import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { TriboPayProvider } from "@/providers/payments/tribopay";
import { UtmifyProvider } from "@/providers/tracking/utmify";
import { syncPaymentToUtmify } from "@/server/services/utmify-orders";
import { sendMetaBusinessMessagingEvent } from "@/server/services/meta-capi";

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

    const registered = await registerInboundWhatsAppMessage({
      ...message,
      workspaceId: targetWorkspaceId,
      referral: message.referral,
      metadataJson: message.raw
    });

    if (message.referral?.ctwaClid) {
      await recordTrackingEvent({
        workspaceId: targetWorkspaceId,
        customerId: registered.customerId,
        source: "meta_ads",
        medium: "ctwa",
        campaign: message.referral.sourceId ?? null,
        content: message.referral.headline ?? null,
        clickId: message.referral.ctwaClid,
        eventType: "whatsapp_ctwa_referral",
        rawPayloadJson: {
          providerMessageId: message.providerMessageId,
          referral: message.referral
        }
      });

      const capi = await sendMetaBusinessMessagingEvent({
        eventName: "Contact",
        eventId: `contact_${registered.customerId}_${message.referral.ctwaClid}`,
        ctwaClid: message.referral.ctwaClid,
        phone: message.phone,
        externalId: registered.customerId,
        customData: {
          currency: "BRL",
          value: 0,
          lead_source: "whatsapp_ctwa",
          source_id: message.referral.sourceId ?? null
        }
      });

      await recordTrackingEvent({
        workspaceId: targetWorkspaceId,
        customerId: registered.customerId,
        source: "meta_ads",
        medium: "capi",
        campaign: message.referral.sourceId ?? null,
        clickId: message.referral.ctwaClid,
        eventType: capi.ok ? "meta_capi_contact_sent" : "meta_capi_contact_skipped",
        rawPayloadJson: {
          status: capi.status,
          providerMessageId: message.providerMessageId
        }
      });
    }

    results.push(registered);
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
  const utmify = await syncPaymentToUtmify({
    payment,
    customer,
    rawSource: normalized.raw,
    itemTitle: normalized.payment.offerName,
    isTest: false
  });

  if (payment.status === "PAID") {
    await sendPaymentPurchaseToMeta(payment, customer, targetWorkspaceId);
    await cancelRecoveryBecausePaid(payment);
    return { payment, recovery: "converted", utmify };
  }

  const recovery = await scheduleRecoveryForPayment(payment, targetWorkspaceId);
  return { payment, recovery, utmify };
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
  const utmify = await syncPaymentToUtmify({
    payment,
    customer,
    rawSource: normalized.raw,
    itemTitle: normalized.payment.offerName,
    isTest: false
  });

  if (payment.status === "PAID") {
    await sendPaymentPurchaseToMeta(payment, customer, targetWorkspaceId);
    await cancelRecoveryBecausePaid(payment);
    return { payment, recovery: "converted", utmify };
  }

  const recovery = await scheduleRecoveryForPayment(payment, targetWorkspaceId);
  return { payment, recovery, utmify };
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

async function sendPaymentPurchaseToMeta(
  payment: { id: string; providerPaymentId: string; amount: number; currency: string; offerName?: string | null },
  customer: { id: string; phone?: string | null; email?: string | null; ctwaClid?: string | null },
  workspaceId: string
) {
  const capi = await sendMetaBusinessMessagingEvent({
    eventName: "Purchase",
    eventId: `purchase_${customer.id}_${payment.providerPaymentId || payment.id}`,
    ctwaClid: customer.ctwaClid,
    phone: customer.phone,
    email: customer.email,
    externalId: customer.id,
    customData: {
      currency: payment.currency || "BRL",
      value: payment.amount,
      lead_source: "whatsapp_ctwa",
      content_name: payment.offerName ?? "PayFlow payment"
    }
  });

  await recordTrackingEvent({
    workspaceId,
    customerId: customer.id,
    paymentId: payment.id,
    source: "meta_ads",
    medium: "capi",
    clickId: customer.ctwaClid ?? null,
    eventType: capi.ok ? "meta_capi_purchase_sent" : "meta_capi_purchase_skipped",
    rawPayloadJson: {
      status: capi.status,
      providerPaymentId: payment.providerPaymentId
    }
  });
}

import type { ParsedWhatsAppMessage, WhatsAppProvider, WhatsAppReferral, WhatsAppSendInput, WhatsAppSendResult, WhatsAppTemplateSendInput } from "@/providers/whatsapp/types";

export class MetaWhatsAppProvider implements WhatsAppProvider {
  name = "meta";

  async sendMessage(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    return this.postMessage({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { body: input.body }
    });
  }

  async sendTemplateMessage(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult> {
    const components = input.bodyParameters?.length
      ? [
          {
            type: "body",
            parameters: input.bodyParameters.map((text) => ({ type: "text", text }))
          }
        ]
      : undefined;

    return this.postMessage({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        ...(components ? { components } : {})
      }
    });
  }

  private async postMessage(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      throw new Error("Credenciais da WhatsApp Cloud API ausentes");
    }

    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const raw = await response.json();
    if (!response.ok) {
      throw new Error(raw?.error?.message ?? "Falha ao enviar WhatsApp");
    }

    return {
      providerMessageId: raw.messages?.[0]?.id ?? `meta-${Date.now()}`,
      status: "SENT",
      raw
    };
  }

  parseWebhook(payload: unknown): ParsedWhatsAppMessage[] {
    const entries = (payload as { entry?: Array<{ changes?: Array<{ value?: unknown }> }> }).entry ?? [];

    return entries.flatMap((entry) =>
      (entry.changes ?? []).flatMap((change) => {
        const value = change.value as {
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<{ id?: string; from?: string; text?: { body?: string }; type?: string; referral?: Record<string, unknown> }>;
        };

        return (value.messages ?? [])
          .filter((message) => message.type === "text" && message.from && message.text?.body)
          .map((message) => ({
            phone: message.from as string,
            name: value.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name,
            body: message.text?.body ?? "",
            providerMessageId: message.id,
            eventType: "message",
            referral: mapMetaReferral(message.referral),
            raw: payload
          }));
      })
    );
  }

  async testConnection() {
    return {
      ok: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      status: process.env.WHATSAPP_ACCESS_TOKEN ? "Credenciais presentes" : "Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID"
    };
  }
}

function mapMetaReferral(referral?: Record<string, unknown>): WhatsAppReferral | null {
  if (!referral) return null;
  const ctwaClid = stringValue(referral.ctwa_clid) ?? stringValue(referral.ctwaClid);
  const sourceId = stringValue(referral.source_id) ?? stringValue(referral.sourceId);
  const sourceUrl = stringValue(referral.source_url) ?? stringValue(referral.sourceUrl);
  if (!ctwaClid && !sourceId && !sourceUrl) return null;

  return {
    ctwaClid,
    sourceId,
    sourceUrl,
    headline: stringValue(referral.headline),
    body: stringValue(referral.body),
    mediaType: stringValue(referral.media_type) ?? stringValue(referral.mediaType),
    imageUrl: stringValue(referral.image_url) ?? stringValue(referral.imageUrl)
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

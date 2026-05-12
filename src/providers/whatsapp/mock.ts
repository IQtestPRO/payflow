import type { ParsedWhatsAppMessage, WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult, WhatsAppTemplateSendInput } from "@/providers/whatsapp/types";

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "mock";

  async sendMessage(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    return {
      providerMessageId: `mock-wa-${Date.now()}-${input.to.slice(-4)}`,
      status: "SENT",
      raw: { mock: true, to: input.to }
    };
  }

  async sendTemplateMessage(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult> {
    return {
      providerMessageId: `mock-wa-template-${Date.now()}-${input.to.slice(-4)}`,
      status: "SENT",
      raw: { mock: true, to: input.to, templateName: input.templateName, languageCode: input.languageCode }
    };
  }

  parseWebhook(payload: unknown): ParsedWhatsAppMessage[] {
    const data = payload as {
      phone?: string;
      from?: string;
      name?: string;
      text?: string;
      body?: string;
      messageId?: string;
      eventType?: string;
    };

    if (data.phone || data.from) {
      return [
        {
          phone: String(data.phone ?? data.from),
          name: data.name,
          body: String(data.text ?? data.body ?? ""),
          providerMessageId: data.messageId ?? `mock-in-${Date.now()}`,
          eventType: data.eventType ?? "message",
          raw: payload
        }
      ];
    }

    return [];
  }

  async testConnection() {
    return { ok: true, status: "Mock WhatsApp pronto para envio e webhooks" };
  }
}

export type WhatsAppSendInput = {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type WhatsAppSendResult = {
  providerMessageId: string;
  status: "SENT" | "QUEUED";
  raw?: unknown;
};

export type WhatsAppTemplateSendInput = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
  metadata?: Record<string, unknown>;
};

export type ParsedWhatsAppMessage = {
  phone: string;
  name?: string | null;
  body: string;
  providerMessageId?: string | null;
  eventType: string;
  raw: unknown;
};

export interface WhatsAppProvider {
  name: string;
  sendMessage(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
  sendTemplateMessage(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult>;
  parseWebhook(payload: unknown): ParsedWhatsAppMessage[];
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

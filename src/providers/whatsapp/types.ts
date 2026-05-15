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

export type WhatsAppMediaSendInput = {
  to: string;
  mediaType: "image";
  mediaBase64?: string;
  mediaUrl?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
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
  referral?: WhatsAppReferral | null;
  raw: unknown;
};

export type WhatsAppReferral = {
  ctwaClid?: string | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  headline?: string | null;
  body?: string | null;
  mediaType?: string | null;
  imageUrl?: string | null;
};

export interface WhatsAppProvider {
  name: string;
  sendMessage(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
  sendMediaMessage?(input: WhatsAppMediaSendInput): Promise<WhatsAppSendResult>;
  sendTemplateMessage(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult>;
  parseWebhook(payload: unknown): ParsedWhatsAppMessage[];
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

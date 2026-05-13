import { appUrl } from "@/lib/env";
import { toDataURL } from "qrcode";
import type {
  ParsedWhatsAppMessage,
  WhatsAppMediaSendInput,
  WhatsAppProvider,
  WhatsAppSendInput,
  WhatsAppSendResult,
  WhatsAppTemplateSendInput
} from "@/providers/whatsapp/types";

const DEFAULT_EVOLUTION_BASE_URL = "http://localhost:8080";
const DEFAULT_EVOLUTION_INSTANCE = "payflow-local";
const DEFAULT_EVOLUTION_API_KEY = "payflow-evolution-local-key";

export const EVOLUTION_WEBHOOK_EVENTS = ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"] as const;

type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
};

type EvolutionWebhookData = {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    buttonsResponseMessage?: { selectedDisplayText?: string };
    listResponseMessage?: { title?: string; description?: string };
    templateButtonReplyMessage?: { selectedDisplayText?: string };
  };
  messageType?: string;
};

type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: EvolutionWebhookData | EvolutionWebhookData[];
};

type EvolutionQrPayload = {
  base64?: string;
  code?: string;
  pairingCode?: string;
  qrcode?: string | {
    base64?: string;
    code?: string;
    pairingCode?: string;
  };
};

export function getEvolutionConfig(): EvolutionConfig {
  return {
    baseUrl: process.env.EVOLUTION_API_BASE_URL || DEFAULT_EVOLUTION_BASE_URL,
    apiKey: process.env.EVOLUTION_API_KEY || DEFAULT_EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || DEFAULT_EVOLUTION_INSTANCE
  };
}

export function evolutionWebhookUrl() {
  const configured = process.env.WHATSAPP_WEBHOOK_URL;
  if (configured) return configured;

  const baseUrl = getDockerReachableAppUrl(appUrl());
  return `${baseUrl}/api/webhooks/whatsapp`;
}

export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  name = "evolution";

  private readonly config: EvolutionConfig;

  constructor(config = getEvolutionConfig()) {
    this.config = config;
  }

  async sendMessage(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const raw = await this.request(`/message/sendText/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        number: normalizePhone(input.to),
        text: input.body,
        linkPreview: true
      })
    });

    return {
      providerMessageId: extractEvolutionMessageId(raw) ?? `evolution-${Date.now()}`,
      status: "SENT",
      raw
    };
  }

  async sendMediaMessage(input: WhatsAppMediaSendInput): Promise<WhatsAppSendResult> {
    const media = input.mediaBase64 ?? input.mediaUrl;
    if (!media) throw new Error("Midia ausente para envio pelo WhatsApp");

    const raw = await this.request(`/message/sendMedia/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        number: normalizePhone(input.to),
        mediatype: input.mediaType,
        mimetype: input.mimetype ?? "image/png",
        caption: input.caption,
        media: stripDataUrlPrefix(media),
        fileName: input.fileName ?? "payflow-pix-qrcode.png"
      })
    });

    return {
      providerMessageId: extractEvolutionMessageId(raw) ?? `evolution-media-${Date.now()}`,
      status: "SENT",
      raw
    };
  }

  async sendTemplateMessage(input: WhatsAppTemplateSendInput): Promise<WhatsAppSendResult> {
    const body = renderEvolutionTemplateFallback(input);
    return this.sendMessage({ to: input.to, body, metadata: input.metadata });
  }

  parseWebhook(payload: unknown): ParsedWhatsAppMessage[] {
    const eventPayload = payload as EvolutionWebhookPayload;
    const eventType = String(eventPayload.event ?? "MESSAGES_UPSERT");
    const data = Array.isArray(eventPayload.data) ? eventPayload.data : eventPayload.data ? [eventPayload.data] : [];

    return data
      .filter((item) => !item.key?.fromMe)
      .map((item): ParsedWhatsAppMessage | null => {
        const remoteJid = item.key?.remoteJid;
        if (!remoteJid || remoteJid.endsWith("@g.us")) return null;

        const body = extractEvolutionMessageBody(item);
        const phone = normalizeEvolutionJid(remoteJid);
        if (!body || !phone) return null;

        return {
          phone,
          name: item.pushName ?? null,
          body,
          providerMessageId: item.key?.id ?? null,
          eventType,
          raw: payload
        };
      })
      .filter((message): message is ParsedWhatsAppMessage => Boolean(message));
  }

  async testConnection() {
    try {
      const raw = (await this.request(`/instance/connectionState/${this.config.instanceName}`, { method: "GET" })) as {
        instance?: { state?: string; instanceName?: string };
      };
      const state = raw.instance?.state ?? "unknown";

      return {
        ok: state === "open",
        status: state === "open" ? `Instancia ${this.config.instanceName} conectada` : `Instancia ${this.config.instanceName}: ${state}`
      };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof Error ? error.message : "Evolution API indisponivel"
      };
    }
  }

  async createInstance() {
    const raw = await this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: this.config.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: true,
        readStatus: true,
        syncFullHistory: false,
        webhook: {
          url: evolutionWebhookUrl(),
          byEvents: false,
          base64: false,
          events: [...EVOLUTION_WEBHOOK_EVENTS]
        }
      })
    });

    return enrichEvolutionQrResponse(raw);
  }

  async connectInstance(phone?: string) {
    const query = phone ? `?number=${encodeURIComponent(normalizePhone(phone))}` : "";
    const raw = await this.request(`/instance/connect/${this.config.instanceName}${query}`, { method: "GET" });

    return enrichEvolutionQrResponse(raw);
  }

  async setWebhook(url = evolutionWebhookUrl()) {
    const webhook = {
      enabled: true,
      url,
      webhookByEvents: false,
      webhookBase64: false,
      webhook_by_events: false,
      webhook_base64: false,
      events: [...EVOLUTION_WEBHOOK_EVENTS]
    };

    return this.request(`/webhook/set/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        ...webhook,
        webhook
      })
    });
  }

  private async request(path: string, init: RequestInit) {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        apikey: this.config.apiKey,
        "Content-Type": "application/json",
        ...init.headers
      },
      cache: "no-store"
    });

    const text = await response.text();
    const raw = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const message = extractEvolutionError(raw) ?? `Evolution API retornou HTTP ${response.status}`;
      throw new Error(message);
    }

    return raw;
  }
}

export async function enrichEvolutionQrResponse(raw: unknown) {
  if (!isRecord(raw)) return raw;

  const qr = raw as EvolutionQrPayload;
  const code = extractEvolutionQrCode(qr);
  const existingImage = normalizeQrImage(extractEvolutionQrImage(qr));
  const image = existingImage ?? (code ? await toDataURL(code, { margin: 2, width: 320 }) : undefined);

  if (!image) return raw;

  const qrcode = isRecord(qr.qrcode) ? qr.qrcode : {};

  return {
    ...raw,
    base64: image,
    qrcode: {
      ...qrcode,
      base64: image,
      code: code ?? readString(qrcode, "code")
    }
  };
}

function renderEvolutionTemplateFallback(input: WhatsAppTemplateSendInput) {
  if (input.templateName === "hello_world") {
    return "Ola! Esta e uma mensagem de teste do PayFlow via Evolution API.";
  }

  const parameters = input.bodyParameters?.join(" ") ?? "";
  return parameters ? `${input.templateName}: ${parameters}` : `Mensagem PayFlow: ${input.templateName}`;
}

function extractEvolutionMessageBody(item: EvolutionWebhookData) {
  return (
    item.message?.conversation ??
    item.message?.extendedTextMessage?.text ??
    item.message?.imageMessage?.caption ??
    item.message?.videoMessage?.caption ??
    item.message?.buttonsResponseMessage?.selectedDisplayText ??
    item.message?.listResponseMessage?.description ??
    item.message?.listResponseMessage?.title ??
    item.message?.templateButtonReplyMessage?.selectedDisplayText ??
    ""
  ).trim();
}

function normalizeEvolutionJid(remoteJid: string) {
  return normalizePhone(remoteJid.split("@")[0] ?? remoteJid);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getDockerReachableAppUrl(value: string) {
  if (!isLocalEvolutionApi()) return value;

  try {
    const url = new URL(value);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = "host.docker.internal";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return value;
  }

  return value;
}

function isLocalEvolutionApi() {
  try {
    const url = new URL(getEvolutionConfig().baseUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function extractEvolutionMessageId(raw: unknown) {
  return (raw as { key?: { id?: string } } | null)?.key?.id;
}

function extractEvolutionError(raw: unknown) {
  const data = raw as { message?: unknown; error?: unknown; response?: { message?: unknown } } | null;
  const message = data?.message ?? data?.response?.message ?? data?.error;
  return formatEvolutionErrorMessage(message);
}

function stripDataUrlPrefix(value: string) {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function formatEvolutionErrorMessage(message: unknown): string | undefined {
  if (!message) return undefined;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.map(formatEvolutionErrorMessage).filter(Boolean).join(", ");
  }

  if (isRecord(message)) {
    const number = readString(message, "number");
    const exists = message.exists;
    if (number && exists === false) return `Numero ${number} nao encontrado no WhatsApp`;

    return JSON.stringify(message);
  }

  return String(message);
}

function extractEvolutionQrCode(data: EvolutionQrPayload) {
  const qrcode = data.qrcode;
  if (typeof qrcode === "string" && !looksLikeImageData(qrcode)) return qrcode;
  if (isRecord(qrcode)) return readString(qrcode, "code") ?? data.code;

  return data.code;
}

function extractEvolutionQrImage(data: EvolutionQrPayload) {
  const qrcode = data.qrcode;
  if (typeof qrcode === "string" && looksLikeImageData(qrcode)) return qrcode;
  if (isRecord(qrcode)) return readString(qrcode, "base64");

  return data.base64;
}

function normalizeQrImage(value?: string) {
  if (!value) return undefined;
  return value.startsWith("data:image") ? value : `data:image/png;base64,${value}`;
}

function looksLikeImageData(value: string) {
  return value.startsWith("data:image") || value.startsWith("iVBOR") || value.startsWith("/9j/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

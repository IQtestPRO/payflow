import { appUrl } from "@/lib/env";
import type {
  ParsedWhatsAppMessage,
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

export function getEvolutionConfig(): EvolutionConfig {
  return {
    baseUrl: process.env.EVOLUTION_API_BASE_URL || DEFAULT_EVOLUTION_BASE_URL,
    apiKey: process.env.EVOLUTION_API_KEY || DEFAULT_EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || DEFAULT_EVOLUTION_INSTANCE
  };
}

export function evolutionWebhookUrl() {
  return `${appUrl()}/api/webhooks/whatsapp`;
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
    return this.request("/instance/create", {
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
  }

  async connectInstance(phone?: string) {
    const query = phone ? `?number=${encodeURIComponent(normalizePhone(phone))}` : "";
    return this.request(`/instance/connect/${this.config.instanceName}${query}`, { method: "GET" });
  }

  async setWebhook(url = evolutionWebhookUrl()) {
    return this.request(`/webhook/set/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        url,
        webhook_by_events: false,
        webhook_base64: false,
        events: [...EVOLUTION_WEBHOOK_EVENTS]
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

function extractEvolutionMessageId(raw: unknown) {
  return (raw as { key?: { id?: string } } | null)?.key?.id;
}

function extractEvolutionError(raw: unknown) {
  const data = raw as { message?: string | string[]; error?: string; response?: { message?: string | string[] } } | null;
  const message = data?.message ?? data?.response?.message ?? data?.error;
  return Array.isArray(message) ? message.join(", ") : message;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

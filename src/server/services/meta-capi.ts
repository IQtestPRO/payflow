import { createHash } from "crypto";
import { logger } from "@/lib/logger";

export type MetaCapiEventName =
  | "Contact"
  | "Lead"
  | "Schedule"
  | "Purchase"
  | "SubmitApplication"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "PageView";

type MetaCapiEventInput = {
  eventName: MetaCapiEventName;
  eventId: string;
  actionSource?: "website" | "business_messaging";
  messagingChannel?: "whatsapp";
  eventSourceUrl?: string;
  request?: Request;
  fbclid?: string | null;
  ctwaClid?: string | null;
  phone?: string | null;
  email?: string | null;
  externalId?: string | null;
  pageId?: string | null;
  customData?: Record<string, unknown>;
};

type MetaBusinessMessagingInput = Omit<MetaCapiEventInput, "actionSource" | "messagingChannel" | "eventSourceUrl" | "request" | "fbclid"> & {
  ctwaClid?: string | null;
};

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const PARTNER_AGENT = "payflow_capi_business_messaging_v1";

export async function sendMetaBusinessMessagingEvent(input: MetaBusinessMessagingInput) {
  if (!input.ctwaClid) {
    return { ok: false, skipped: true, status: "Meta CAPI Business Messaging ignorado: ctwa_clid ausente" };
  }

  return sendMetaCapiEvent({
    ...input,
    actionSource: "business_messaging",
    messagingChannel: "whatsapp",
    pageId: input.pageId ?? process.env.META_PAGE_ID
  });
}

export async function sendMetaCapiEvent(input: MetaCapiEventInput) {
  const datasetId = process.env.META_DATASET_ID || process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

  if (!datasetId || !accessToken) {
    return { ok: false, skipped: true, status: "Meta CAPI nao configurado" };
  }

  const actionSource = input.actionSource ?? "website";
  const graphVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${datasetId}/events`);
  endpoint.searchParams.set("access_token", accessToken);

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: actionSource,
    user_data: buildUserData(input),
    custom_data: input.customData
  };

  if (actionSource === "business_messaging") {
    event.messaging_channel = input.messagingChannel ?? "whatsapp";
  } else if (input.eventSourceUrl) {
    event.event_source_url = input.eventSourceUrl;
  }

  const payload = {
    data: [event],
    partner_agent: PARTNER_AGENT,
    test_event_code: process.env.META_CAPI_TEST_EVENT_CODE || process.env.META_TEST_EVENT_CODE || undefined
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(2200)
    });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      logger.warn("Meta CAPI recusou evento", {
        status: response.status,
        eventName: input.eventName,
        eventId: input.eventId,
        actionSource,
        error: readMetaError(json)
      });
      return { ok: false, skipped: false, status: `Meta CAPI respondeu ${response.status}` };
    }

    return { ok: true, skipped: false, status: "Meta CAPI enviado", response: json };
  } catch (error) {
    logger.warn("Falha nao bloqueante no Meta CAPI", {
      eventName: input.eventName,
      eventId: input.eventId,
      actionSource,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
    return { ok: false, skipped: false, status: "Falha ao enviar Meta CAPI" };
  }
}

function buildUserData(input: MetaCapiEventInput) {
  const userData: Record<string, string | string[]> = {};
  const ip = input.request ? readClientIp(input.request) : null;
  const userAgent = input.request?.headers.get("user-agent")?.trim();
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const externalId = input.externalId?.trim();

  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (input.fbclid) userData.fbc = `fb.1.${Date.now()}.${input.fbclid}`;
  if (input.ctwaClid) userData.ctwa_clid = input.ctwaClid;
  if (input.pageId) userData.page_id = input.pageId;
  if (phone) userData.ph = [hashSHA256(phone)];
  if (email) userData.em = [hashSHA256(email)];
  if (externalId) userData.external_id = [hashSHA256(externalId)];

  return userData;
}

function hashSHA256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") || null;
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function readClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

function readMetaError(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}

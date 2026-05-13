import { logger } from "@/lib/logger";

type MetaCapiEventInput = {
  eventName: "Contact" | "Lead" | "PageView";
  eventId: string;
  eventSourceUrl: string;
  request: Request;
  fbclid?: string | null;
  customData?: Record<string, unknown>;
};

const DEFAULT_GRAPH_API_VERSION = "v25.0";

export async function sendMetaCapiEvent(input: MetaCapiEventInput) {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { ok: false, status: "Meta CAPI nao configurado" };
  }

  const graphVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const endpoint = new URL(`https://graph.facebook.com/${graphVersion}/${pixelId}/events`);
  endpoint.searchParams.set("access_token", accessToken);

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: buildUserData(input.request, input.fbclid),
        custom_data: input.customData
      }
    ],
    test_event_code: process.env.META_CAPI_TEST_EVENT_CODE || undefined
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(1800)
    });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      logger.warn("Meta CAPI recusou evento", {
        status: response.status,
        eventName: input.eventName,
        eventId: input.eventId,
        error: readMetaError(json)
      });
      return { ok: false, status: `Meta CAPI respondeu ${response.status}` };
    }

    return { ok: true, status: "Meta CAPI enviado" };
  } catch (error) {
    logger.warn("Falha nao bloqueante no Meta CAPI", {
      eventName: input.eventName,
      eventId: input.eventId,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
    return { ok: false, status: "Falha ao enviar Meta CAPI" };
  }
}

function buildUserData(request: Request, fbclid?: string | null) {
  const userData: Record<string, string> = {};
  const ip = readClientIp(request);
  const userAgent = request.headers.get("user-agent")?.trim();

  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbclid) userData.fbc = `fb.1.${Date.now()}.${fbclid}`;

  return userData;
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

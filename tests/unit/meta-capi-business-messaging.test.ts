import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMetaBusinessMessagingEvent } from "@/server/services/meta-capi";

describe("Meta CAPI Business Messaging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends WhatsApp business messaging events with raw ctwa_clid and hashed PII", async () => {
    vi.stubEnv("META_DATASET_ID", "dataset-123");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "token-123");
    vi.stubEnv("META_PAGE_ID", "page-123");
    vi.stubEnv("META_GRAPH_API_VERSION", "v25.0");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMetaBusinessMessagingEvent({
      eventName: "Lead",
      eventId: "lead-contact-1",
      ctwaClid: "RAW_CTWA_CLID",
      phone: "+55 21 99999-8888",
      email: "Lead@Example.com",
      externalId: "customer-1",
      customData: { currency: "BRL", value: 0, lead_source: "whatsapp_ctwa" }
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const calls = fetchMock.mock.calls as unknown as Array<[unknown, RequestInit]>;
    const payload = JSON.parse(String(calls[0][1].body));
    const event = payload.data[0];

    expect(event.event_name).toBe("Lead");
    expect(event.action_source).toBe("business_messaging");
    expect(event.messaging_channel).toBe("whatsapp");
    expect(event.user_data.ctwa_clid).toBe("RAW_CTWA_CLID");
    expect(event.user_data.page_id).toBe("page-123");
    expect(event.user_data.ph[0]).toHaveLength(64);
    expect(event.user_data.ph[0]).not.toContain("5521999998888");
    expect(event.user_data.em[0]).toHaveLength(64);
    expect(payload.partner_agent).toBe("payflow_capi_business_messaging_v1");
  });

  it("skips business messaging events without ctwa_clid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMetaBusinessMessagingEvent({
      eventName: "Lead",
      eventId: "lead-without-ctwa"
    });

    expect(result.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

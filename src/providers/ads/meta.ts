import type { CampaignRecord } from "@/lib/types";
import type { AdsProvider } from "@/providers/ads/types";

export class MetaAdsProvider implements AdsProvider {
  name = "meta-ads";

  async importCampaigns(workspaceId: string): Promise<CampaignRecord[]> {
    const accessToken = process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const accountId = normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID);
    if (!accessToken || !accountId) return [];

    const graphVersion = process.env.META_GRAPH_API_VERSION || "v25.0";
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${accountId}/campaigns`);
    url.searchParams.set("fields", "id,name,status,objective,insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm}");
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as MetaCampaignsResponse;
    if (!response.ok) throw new Error(readMetaError(payload) ?? `Meta Ads respondeu ${response.status}`);

    return (payload.data ?? []).map((campaign) => mapMetaCampaign(campaign, workspaceId));
  }

  async testConnection() {
    const hasToken = Boolean(process.env.META_MARKETING_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN);
    const hasAccount = Boolean(process.env.META_AD_ACCOUNT_ID);
    return {
      ok: hasToken && hasAccount,
      status: hasToken && hasAccount ? "Credenciais Meta Ads presentes" : "Configure META_ACCESS_TOKEN/META_MARKETING_ACCESS_TOKEN e META_AD_ACCOUNT_ID"
    };
  }
}

type MetaCampaignsResponse = {
  data?: MetaCampaign[];
  error?: { message?: string };
};

type MetaCampaign = {
  id?: string;
  name?: string;
  status?: string;
  objective?: string;
  insights?: {
    data?: Array<{
      spend?: string;
      impressions?: string;
      clicks?: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
    }>;
  };
};

function mapMetaCampaign(campaign: MetaCampaign, workspaceId: string): CampaignRecord {
  const insight = campaign.insights?.data?.[0] ?? {};
  const spend = numberValue(insight.spend);
  const clicks = Math.round(numberValue(insight.clicks));
  const revenue = 0;

  return {
    id: `meta-${campaign.id ?? crypto.randomUUID()}`,
    workspaceId,
    provider: "META_ADS",
    providerCampaignId: campaign.id ?? null,
    name: campaign.name ?? "Campanha sem nome",
    status: mapMetaStatus(campaign.status),
    objective: campaign.objective ?? null,
    spend,
    impressions: Math.round(numberValue(insight.impressions)),
    clicks,
    ctr: numberValue(insight.ctr),
    cpc: numberValue(insight.cpc),
    cpm: numberValue(insight.cpm),
    revenue,
    roas: spend ? revenue / spend : 0,
    cpa: 0,
    dateStart: null,
    dateEnd: null
  };
}

function normalizeAdAccountId(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.startsWith("act_") ? normalized : `act_${normalized.replace(/\D/g, "")}`;
}

function mapMetaStatus(value?: string | null): CampaignRecord["status"] {
  if (value === "ACTIVE") return "ACTIVE";
  if (value === "PAUSED") return "PAUSED";
  if (value === "ARCHIVED") return "ARCHIVED";
  if (value === "DELETED") return "DELETED";
  return "PAUSED";
}

function numberValue(value?: string | number | null) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function readMetaError(payload: MetaCampaignsResponse) {
  return payload.error?.message;
}

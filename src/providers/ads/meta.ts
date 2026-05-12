import { demoStore } from "@/lib/demo-data";
import type { CampaignRecord } from "@/lib/types";
import type { AdsProvider } from "@/providers/ads/types";

export class MetaAdsProvider implements AdsProvider {
  name = "meta-ads";

  async importCampaigns(workspaceId: string): Promise<CampaignRecord[]> {
    // TODO: trocar por chamadas Graph API /act_{ad_account_id}/campaigns + insights.
    return demoStore.campaigns.filter((campaign) => campaign.workspaceId === workspaceId);
  }

  async testConnection() {
    return {
      ok: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
      status: process.env.META_ACCESS_TOKEN ? "Credenciais Meta Ads presentes" : "Provider mock aguardando credenciais"
    };
  }
}

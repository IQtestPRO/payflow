import type { CampaignRecord } from "@/lib/types";

export interface AdsProvider {
  name: string;
  importCampaigns(workspaceId: string): Promise<CampaignRecord[]>;
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { CampaignMetricsTable } from "@/components/campaigns/campaign-metrics-table";
import { PageHeader } from "@/components/ui/page-header";
import { getAdsProvider } from "@/providers/ads";
import { listCampaigns } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  const persistedCampaigns = await listCampaigns(user?.workspaceId);
  const adsProvider = getAdsProvider();
  const connection = await adsProvider.testConnection();
  const campaigns = persistedCampaigns.length || !connection.ok ? persistedCampaigns : await safeImportMetaCampaigns(adsProvider, user?.workspaceId);
  const meta = integrationBrands.META_ADS;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Campanhas"
        description="Trafego pago real por Meta Ads, sem campanhas ficticias. Enquanto nao houver sincronizacao, a tela permanece vazia."
        actions={<IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} />}
      />
      <section className="toolbar">
        <div className="mb-4 flex items-center gap-3">
          <IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} className="h-10 w-10 rounded-md" imageClassName="h-6 w-6" />
          <div>
            <p className="section-label">Meta Ads</p>
            <h2 className="font-extrabold">{connection.ok ? "Conexao pronta para leitura real" : "Integracao aguardando credenciais"}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{connection.status}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input className="field" type="date" aria-label="Data inicial" />
          <input className="field" type="date" aria-label="Data final" />
          <select className="field" defaultValue="META_ADS" aria-label="Plataforma">
            <option value="META_ADS">Meta Ads</option>
          </select>
          <input className="field" placeholder="UTM campaign" aria-label="UTM campaign" />
          <input className="field" placeholder="Oferta" aria-label="Oferta" />
        </div>
      </section>
      <CampaignMetricsTable campaigns={campaigns} />
    </div>
  );
}

async function safeImportMetaCampaigns(adsProvider: ReturnType<typeof getAdsProvider>, workspaceId?: string) {
  try {
    return await adsProvider.importCampaigns(workspaceId ?? "payflow-workspace");
  } catch {
    return [];
  }
}

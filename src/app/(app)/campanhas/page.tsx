import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { CampaignMetricsTable } from "@/components/campaigns/campaign-metrics-table";
import { PageHeader } from "@/components/ui/page-header";
import { listCampaigns } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  const campaigns = await listCampaigns(user?.workspaceId);
  const meta = integrationBrands.META_ADS;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Campanhas"
        description="Trafego pago com gasto, cliques, CTR, CPC, CPA, ROAS e receita atribuida por campanha."
        actions={<IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} />}
      />
      <section className="toolbar">
        <div className="mb-4 flex items-center gap-3">
          <IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} className="h-10 w-10 rounded-md" imageClassName="h-6 w-6" />
          <div>
            <p className="section-label">Meta Ads e UTM</p>
            <h2 className="font-extrabold">Filtros de performance</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input className="field" type="date" aria-label="Data inicial" />
          <input className="field" type="date" aria-label="Data final" />
          <select className="field" defaultValue="" aria-label="Plataforma">
            <option value="">Todas as plataformas</option>
            <option value="META_ADS">Meta Ads</option>
          </select>
          <input className="field" placeholder="UTM campaign" />
          <input className="field" placeholder="Oferta" />
        </div>
      </section>
      <CampaignMetricsTable campaigns={campaigns} />
    </div>
  );
}

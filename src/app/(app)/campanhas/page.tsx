import { CampaignMetricsTable } from "@/components/campaigns/campaign-metrics-table";
import { PageHeader } from "@/components/ui/page-header";
import { listCampaigns } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  const campaigns = await listCampaigns(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Campanhas"
        description="Dashboard de tráfego pago com gasto, cliques, CTR, CPC, CPA, ROAS e receita atribuída por campanha."
      />
      <section className="surface grid gap-3 p-4 md:grid-cols-5">
        <input className="field" type="date" aria-label="Data inicial" />
        <input className="field" type="date" aria-label="Data final" />
        <select className="field" defaultValue="" aria-label="Plataforma">
          <option value="">Todas as plataformas</option>
          <option value="META_ADS">Meta Ads</option>
        </select>
        <input className="field" placeholder="UTM campaign" />
        <input className="field" placeholder="Oferta" />
      </section>
      <CampaignMetricsTable campaigns={campaigns} />
    </div>
  );
}

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { getDashboardSnapshot } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const snapshot = await getDashboardSnapshot(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard principal"
        description="Receita, pagamentos pendentes, recuperacao, conversas e trafego pago em uma visao operacional clara."
        actions={
          <Link className="btn-primary" href="/integracoes">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Revisar integracoes
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        {(["WHATSAPP", "UMBRELLA", "UTMIFY", "META_ADS"] as const).map((provider) => {
          const meta = integrationBrands[provider];
          return (
            <Link key={provider} href={meta.detailsHref} className="operational-card group">
              <div className="flex items-center gap-3">
                <IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} className="h-11 w-11 rounded-md" imageClassName="h-6 w-6" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{meta.shortLabel}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{meta.category}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <DashboardCharts snapshot={snapshot} />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-3">
          <div>
            <p className="section-label">Risco comercial</p>
            <h2 className="mt-1 text-lg font-bold">Ofertas com maior abandono</h2>
          </div>
          <DataTable headers={["Oferta", "Status", "Abandono", "Recuperacoes"]}>
            {snapshot.offersByAbandonment.map((offer) => (
              <tr key={offer.id}>
                <td className="px-4 py-3 font-semibold">{offer.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={offer.status} />
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">{offer.abandonments}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{offer.recoveries}</td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div className="grid gap-3">
          <div>
            <p className="section-label">Aquisicao</p>
            <h2 className="mt-1 text-lg font-bold">Campanhas em destaque</h2>
          </div>
          <DataTable headers={["Campanha", "Gasto", "Receita", "ROAS"]}>
            {snapshot.topCampaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-4 py-3 font-semibold">{campaign.name}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(campaign.spend)}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(campaign.revenue)}</td>
                <td className="px-4 py-3 font-bold text-emerald-700 tabular-nums">{campaign.roas.toFixed(2)}x</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>
    </div>
  );
}

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
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
        description="Metricas de receita, pagamentos pendentes, recuperacao, conversas e trafego pago em um unico painel operacional."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <DashboardCharts snapshot={snapshot} />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-primary">Risco comercial</p>
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
            <p className="text-xs font-bold uppercase tracking-normal text-primary">Aquisicao</p>
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

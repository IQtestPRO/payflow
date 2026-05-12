import { Activity, ArrowRight, CreditCard, MessageCircle, ShieldCheck, TrendingUp } from "lucide-react";
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
  const primaryMetrics = snapshot.metrics.slice(0, 4);
  const secondaryMetrics = snapshot.metrics.slice(4);
  const revenueMetric = snapshot.metrics.find((metric) => metric.label.toLowerCase().includes("receita")) ?? snapshot.metrics[0];
  const recoveryMetric = snapshot.metrics.find((metric) => metric.label.toLowerCase().includes("recupera")) ?? snapshot.metrics[4];
  const conversationsMetric = snapshot.metrics.find((metric) => metric.label.toLowerCase().includes("conversas")) ?? snapshot.metrics[6];
  const pendingMetric = snapshot.metrics.find((metric) => metric.label.toLowerCase().includes("pendentes")) ?? snapshot.metrics[2];
  const trafficMetric = snapshot.metrics.find((metric) => metric.label.toLowerCase().includes("roas")) ?? snapshot.metrics[9];

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

      <section className="command-panel overflow-hidden">
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
          <div className="border-b border-white/10 p-5 md:border-r xl:border-b-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-brand-green">
              <span className="live-dot" />
              centro de receita online
            </div>
            <h2 className="mt-4 max-w-sm text-xl font-extrabold leading-tight text-white 2xl:text-2xl">Operação, recuperação e tracking no mesmo cockpit.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
              A tela prioriza sinais acionáveis: conversas abertas, cobranças pendentes, recuperação e performance de mídia.
            </p>
          </div>
          {[
            { label: "Receita monitorada", value: revenueMetric?.value ?? "-", hint: revenueMetric?.delta ?? "últimos eventos", icon: TrendingUp },
            { label: "Conversas abertas", value: conversationsMetric?.value ?? "-", hint: "inbox e recuperação", icon: MessageCircle },
            { label: "Pagamentos pendentes", value: pendingMetric?.value ?? "-", hint: "janela de conversão", icon: CreditCard },
            { label: "Performance", value: trafficMetric?.value ?? "-", hint: recoveryMetric?.value ? `${recoveryMetric.value} recuperações` : "ROAS e tracking", icon: Activity }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="border-b border-white/10 p-5 md:border-r xl:border-b-0 xl:last:border-r-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.08] text-brand-cyan">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-normal text-white/40">{item.label}</p>
                <p className="num mt-2 text-2xl font-extrabold leading-none text-white">{item.value}</p>
                <p className="mt-2 text-xs font-semibold text-white/60">{item.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

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
        {primaryMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {secondaryMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <DashboardCharts snapshot={snapshot} />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-3">
          <div>
            <p className="section-label">Risco comercial</p>
            <h2 className="mt-1 text-xl font-extrabold">Ofertas com maior abandono</h2>
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
            <p className="section-label">Aquisição</p>
            <h2 className="mt-1 text-xl font-extrabold">Campanhas em destaque</h2>
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

import { CreditCard, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { PaymentRecord } from "@/lib/types";
import { listPayments } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

type PaymentsPageProps = {
  searchParams?: Promise<{
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
};

const gatewayLabels: Record<PaymentRecord["provider"], string> = {
  UMBRELLA: "Umbrella",
  TRIBOPAY: "TriboPay",
  MANGOFY: "Mangofy",
  SIGILOPAY: "SigiloPay",
  LYTRONPAY: "LytronPay",
  ALLOWPAYMENTS: "AllowPayments",
  MOCK: "Legado local"
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const user = await getCurrentUser();
  const params = (await searchParams) ?? {};
  const range = readParam(params.range) ?? "30d";
  const interval = resolveDateRange(range, readParam(params.from), readParam(params.to));
  const payments = filterPaymentsByDate(await listPayments(user?.workspaceId), interval);
  const gatewayStats = buildGatewayStats(payments);
  const totals = buildTotals(payments);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pagamentos"
        description="Transacoes reais geradas por gateway, status de Pix, links e conversao por processadora."
        actions={
          <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-sm font-bold text-muted-foreground">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
            Gateway em cada pagamento
          </span>
        }
      />

      <section className="toolbar">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
          <select className="field" name="range" defaultValue={range} aria-label="Periodo">
            <option value="today">Hoje</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="month">Este mes</option>
            <option value="custom">Personalizado</option>
          </select>
          <input className="field" type="date" name="from" defaultValue={interval.fromInput} aria-label="Data inicial" />
          <input className="field" type="date" name="to" defaultValue={interval.toInput} aria-label="Data final" />
          <button className="btn-primary" type="submit">
            Filtrar
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard metric={{ label: "Pagamentos gerados", value: String(totals.generated), tone: totals.generated ? "success" : undefined }} />
        <MetricCard metric={{ label: "Pagamentos pagos", value: String(totals.paid), tone: totals.paid ? "success" : undefined }} />
        <MetricCard metric={{ label: "Conversao geral", value: `${totals.conversion.toFixed(1)}%`, tone: totals.conversion ? "success" : undefined }} />
      </section>

      <section className="data-panel overflow-hidden">
        <div className="border-b border-border/80 bg-white/[0.96] p-4">
          <p className="section-label">Conversao por gateway</p>
          <h2 className="mt-1 text-xl font-extrabold">Leitura real por processadora</h2>
        </div>
        {gatewayStats.length ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {gatewayStats.map((stat) => (
              <article key={stat.provider} className="rounded-lg border border-border/80 bg-slate-50/75 p-4 shadow-inner-line">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold">{gatewayLabels[stat.provider]}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{stat.generated} gerados, {stat.paid} pagos</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <p className="num mt-4 text-2xl font-extrabold">{stat.conversion.toFixed(1)}%</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-md border border-border/80 bg-white px-2 py-1 font-semibold">Gerado: {formatCurrency(stat.generatedAmount)}</span>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Pago: {formatCurrency(stat.paidAmount)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem pagamentos reais no periodo" description="Quando Umbrella, LytronPay ou outro gateway gerar cobrancas, a conversao por gateway aparece aqui." framed={false} />
        )}
      </section>

      {payments.length ? (
        <DataTable headers={["Cliente", "Oferta", "Gateway", "Valor", "Metodo", "Status", "Criado", "ID no gateway"]}>
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold">{payment.customerName ?? "Cliente sem nome"}</p>
                <p className="text-xs text-muted-foreground">{payment.customerPhone ?? "sem WhatsApp"}</p>
              </td>
              <td className="px-4 py-3">{payment.offerName ?? "-"}</td>
              <td className="px-4 py-3 font-semibold">{gatewayLabels[payment.provider]}</td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(payment.amount, payment.currency)}</td>
              <td className="px-4 py-3">{payment.paymentMethod ?? "-"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={payment.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</td>
              <td className="px-4 py-3 font-mono text-xs">{payment.providerPaymentId}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="Nenhum pagamento real registrado" description="Os pagamentos gerados no Inbox ou pelos webhooks dos gateways aparecerao aqui com gateway, status e valor." />
      )}
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "custom" && from && to) {
    return {
      from: new Date(`${from}T00:00:00`),
      to: new Date(`${to}T23:59:59`),
      fromInput: from,
      toInput: to
    };
  } else {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return {
    from: start,
    to: end,
    fromInput: start.toISOString().slice(0, 10),
    toInput: end.toISOString().slice(0, 10)
  };
}

function filterPaymentsByDate(payments: PaymentRecord[], interval: { from: Date; to: Date }) {
  return payments.filter((payment) => {
    const createdAt = new Date(payment.createdAt);
    return createdAt >= interval.from && createdAt <= interval.to;
  });
}

function buildTotals(payments: PaymentRecord[]) {
  const generated = payments.length;
  const paid = payments.filter((payment) => payment.status === "PAID").length;
  return {
    generated,
    paid,
    conversion: generated ? (paid / generated) * 100 : 0
  };
}

function buildGatewayStats(payments: PaymentRecord[]) {
  const byGateway = new Map<PaymentRecord["provider"], PaymentRecord[]>();
  payments.forEach((payment) => byGateway.set(payment.provider, [...(byGateway.get(payment.provider) ?? []), payment]));

  return Array.from(byGateway.entries()).map(([provider, items]) => {
    const paidItems = items.filter((payment) => payment.status === "PAID");
    return {
      provider,
      generated: items.length,
      paid: paidItems.length,
      conversion: items.length ? (paidItems.length / items.length) * 100 : 0,
      generatedAmount: items.reduce((sum, payment) => sum + payment.amount, 0),
      paidAmount: paidItems.reduce((sum, payment) => sum + payment.amount, 0)
    };
  });
}

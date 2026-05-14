import { CreditCard, ListChecks, ShieldCheck } from "lucide-react";
import { GatewayCard } from "@/components/gateways/gateway-card";
import { GatewayActionPanel, type GatewayPanelMode } from "@/components/gateways/gateway-action-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getPaymentGatewayAdapter } from "@/server/gateways/adapters";
import { getGatewayRegistry, type GatewayId } from "@/server/gateways/registry";

type GetwaysPageProps = {
  searchParams?: Promise<{
    gateway?: string | string[];
    panel?: string | string[];
  }>;
};

export default async function GetwaysPage({ searchParams }: GetwaysPageProps) {
  const gateways = getGatewayRegistry();
  const params = (await searchParams) ?? {};
  const selectedGatewayId = normalizeGatewayId(readParam(params.gateway));
  const selectedPanel = normalizePanel(readParam(params.panel));
  const selectedGateway = selectedGatewayId ? gateways.find((gateway) => gateway.id === selectedGatewayId) ?? null : null;
  const activePanel = selectedGateway ? selectedPanel : null;
  const readinessReport = gateways.map((gateway) => {
    const adapterConfigured = getPaymentGatewayAdapter(gateway.id).isConfigured();
    return {
      id: gateway.id,
      name: gateway.uiLabel,
      configured: adapterConfigured,
      status: adapterConfigured ? "Configurado" : gateway.status === "awaiting_docs" ? "Aguardando docs" : "Pendente",
      missing: gateway.id === "umbrella" && adapterConfigured ? "Validar ambiente de producao, postback e User-Agent definitivo." : gateway.pendingQuestions.slice(0, 3).join("; "),
      nextStep: gateway.id === "umbrella" && adapterConfigured ? "Gerar cobranca real controlada e conferir webhook." : "Enviar docs oficiais, credenciais e payload de criacao de cobranca."
    };
  });
  const configuredCount = readinessReport.filter((gateway) => gateway.configured).length;
  const pendingCount = gateways.length - configuredCount;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Getways"
        description="Processadoras de pagamento conectadas ao PayFlow, com espaco preparado para credenciais, documentacao, endpoints e regras de integracao."
        eyebrow="Comando financeiro"
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {configuredCount} configurado
            </span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-sm font-bold text-muted-foreground">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {pendingCount} pendentes
            </span>
          </div>
        }
      />

      <section>
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label">Processadoras</p>
            <h2 className="mt-1 text-xl font-extrabold">Gateways preparados para a operacao</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            A lista abre limpa. Use Configurar ou Docs para abrir apenas o gateway selecionado.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {gateways.map((gateway) => (
            <GatewayCard
              key={gateway.id}
              gateway={gateway}
              activePanel={selectedGateway?.id === gateway.id ? activePanel : null}
            />
          ))}
        </div>
      </section>

      <section className="data-panel p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label">Relatorio rapido</p>
            <h2 className="mt-1 text-xl font-extrabold">O que falta para cada gateway ficar real</h2>
          </div>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs font-extrabold uppercase tracking-normal text-muted-foreground">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
            Sem integracao simulada
          </span>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {readinessReport.map((item) => (
            <article key={item.id} className="rounded-lg border border-border/80 bg-white p-4 shadow-inner-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">{item.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.missing}</p>
                </div>
                <span className={item.configured ? "rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-emerald-700" : "rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-amber-700"}>
                  {item.status}
                </span>
              </div>
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                Proximo passo: {item.nextStep}
              </p>
            </article>
          ))}
        </div>
      </section>

      <GatewayActionPanel gateway={selectedGateway} panel={activePanel} />
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePanel(value: string | undefined): GatewayPanelMode | null {
  return value === "config" || value === "docs" ? value : null;
}

function normalizeGatewayId(value: string | undefined): GatewayId | null {
  if (value === "umbrella" || value === "tribopay" || value === "mangofy" || value === "sigilopay" || value === "lytronpay" || value === "allowpayments") return value;
  return null;
}

import { PayFlowMark } from "@/components/brand/payflow-logo";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { IntegrationLogo, supportingIntegrationBrands } from "@/components/integrations/integration-brand";
import { UmbrellaQuickstart } from "@/components/integrations/umbrella-quickstart";
import { WhatsAppQuickstart } from "@/components/integrations/whatsapp-quickstart";
import { StatusBadge } from "@/components/ui/status-badge";
import { listIntegrations } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const integrations = await listIntegrations(user?.workspaceId);
  const mockCount = integrations.filter((integration) => integration.status === "MOCK").length;
  const connectedCount = integrations.filter((integration) => integration.status === "CONNECTED").length;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-payflow-sidebar text-white shadow-premium">
        <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
          <div className="p-6 md:p-7">
            <div className="flex items-center gap-3">
              <PayFlowMark className="h-12 w-12" />
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-brand-green">Central de integracoes</p>
                <h1 className="text-2xl font-bold md:text-3xl">Conectores da operacao PayFlow</h1>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/75">
              WhatsApp sustenta atendimento e recuperacao. UmbrellaPag alimenta pagamentos. UTMify e Meta fecham rastreamento, midia e atribuicao.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {["Canal", "Pagamento", "Tracking", "Automacao"].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-semibold text-white/80">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 bg-white/5 lg:border-l lg:border-t-0">
            <SummaryMetric label="Conectores" value={integrations.length} />
            <SummaryMetric label="Modo mock" value={mockCount} />
            <SummaryMetric label="Conectados" value={connectedCount} />
            <div className="border-l border-t border-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-white/55">Prioridade</p>
              <div className="mt-3">
                <StatusBadge status="RECOVERY" className="border-brand-green/30 bg-brand-green/10 text-brand-green" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <WhatsAppQuickstart />

      <UmbrellaQuickstart />

      <section>
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Conectores principais</h2>
            <p className="text-sm text-muted-foreground">Logos, status e acoes organizadas por funcao da operacao.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </section>

      <section className="surface p-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-primary">Mecanismos suportados</p>
            <h2 className="mt-1 text-xl font-bold">Canais, pixel, API e automacoes</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Nem todo mecanismo precisa de uma credencial propria hoje, mas todos aparecem com funcao clara para orientar implantacao e suporte.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {supportingIntegrationBrands.map((item) => (
            <article key={item.label} className="rounded-lg border border-border/80 bg-white p-4 shadow-inner-line transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <IntegrationLogo src={item.asset} alt={item.assetAlt} icon={item.icon} className="h-11 w-11 rounded-md" imageClassName="h-6 w-6" />
                <div>
                  <h3 className="font-bold">{item.label}</h3>
                  <p className={`${item.accent} mt-0.5 text-xs font-bold uppercase tracking-normal`}>PayFlow</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-t border-white/10 p-4 first:border-l-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-white/55">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

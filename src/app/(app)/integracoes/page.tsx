import { PayFlowMark } from "@/components/brand/payflow-logo";
import { IntegrationCard } from "@/components/integrations/integration-card";
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
      <section className="overflow-hidden rounded-lg border border-white/10 bg-payflow-sidebar text-white shadow-premium">
        <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
          <div className="p-6 md:p-7">
            <div className="flex items-center gap-3">
              <PayFlowMark className="h-12 w-12" />
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-brand-green">Central de integrações</p>
                <h1 className="text-2xl font-bold md:text-3xl">Conectores da operação PayFlow</h1>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/75">
              WhatsApp fica em primeiro plano porque é o canal que sustenta atendimento e recuperação. Os demais conectores entram como camada de atribuição, pagamento e performance.
            </p>
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

      <section>
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Demais conectores</h2>
            <p className="text-sm text-muted-foreground">Preparados para ligar pagamento, atribuição e mídia paga quando o WhatsApp estiver estável.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
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

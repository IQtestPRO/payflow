import { CreditCard, ShieldCheck } from "lucide-react";
import { GatewayCard } from "@/components/gateways/gateway-card";
import { GatewayDocsPanel } from "@/components/gateways/gateway-docs-panel";
import { UmbrellaQuickstart } from "@/components/integrations/umbrella-quickstart";
import { PageHeader } from "@/components/ui/page-header";
import { getGatewayRegistry } from "@/server/gateways/registry";

export default function GetwaysPage() {
  const gateways = getGatewayRegistry();
  const configuredCount = gateways.filter((gateway) => gateway.isConfigured).length;
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
            Umbrella continua com a configuracao funcional atual. Os demais cards organizam a fila de integracao sem alterar regras de negocio.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {gateways.map((gateway) => (
            <GatewayCard key={gateway.id} gateway={gateway} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-label">Documentacao tecnica</p>
            <h2 className="mt-1 text-xl font-extrabold">Credenciais, capacidades e pendencias</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            O PayFlow mostra somente dados confirmados. Onde a documentacao publica nao abre endpoints completos, a integracao fica bloqueada ate envio das docs oficiais.
          </p>
        </div>
        <div className="grid gap-4">
          {gateways.map((gateway) => (
            <GatewayDocsPanel key={gateway.id} gateway={gateway} />
          ))}
        </div>
      </section>

      <section id="umbrella-configuracao" className="scroll-mt-6">
        <UmbrellaQuickstart />
      </section>
    </div>
  );
}

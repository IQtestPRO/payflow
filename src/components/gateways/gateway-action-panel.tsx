import { ArrowRight, BookOpen, ExternalLink, KeyRound, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GatewayDocsPanel } from "@/components/gateways/gateway-docs-panel";
import { GatewayTestLead } from "@/components/gateways/gateway-test-lead";
import { UmbrellaQuickstart } from "@/components/integrations/umbrella-quickstart";
import type { GatewayCredentialField, GatewayRegistryItem } from "@/server/gateways/registry";

export type GatewayPanelMode = "config" | "docs";

export function GatewayActionPanel({ gateway, panel }: { gateway: GatewayRegistryItem | null; panel: GatewayPanelMode | null }) {
  if (!gateway || !panel) return <GatewaySelectionEmptyState />;

  return (
    <section id="gateway-panel" className="scroll-mt-6">
      {panel === "docs" ? <GatewayDocsPanel gateway={gateway} /> : <GatewayConfigPanel gateway={gateway} />}
    </section>
  );
}

function GatewaySelectionEmptyState() {
  return (
    <section id="gateway-panel" className="data-panel scroll-mt-6 overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="section-label">Painel fechado</p>
          <h2 className="mt-1 text-xl font-extrabold">Escolha um gateway para continuar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A tela inicial fica limpa por padrao. Configuracoes e documentos abrem somente para o gateway selecionado.
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-slate-50/75 p-4 shadow-inner-line">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-primary">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Fluxo de trabalho</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Clique em Configurar para credenciais ou Docs para a documentacao daquele gateway.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GatewayConfigPanel({ gateway }: { gateway: GatewayRegistryItem }) {
  if (gateway.id === "umbrella") return <UmbrellaQuickstart />;
  const hasServerAdapter = gateway.id === "tribopay" || gateway.id === "lytronpay";
  const supportsTestLead = gateway.id === "lytronpay";

  return (
    <article className="data-panel overflow-hidden">
      <div className="border-b border-border/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white shadow-sm ring-1 ring-slate-900/5">
              <Image className="h-7 w-7 object-contain" src={gateway.logo} alt={gateway.logoAlt} width={28} height={28} unoptimized />
            </span>
            <div className="min-w-0">
              <p className="section-label">Configuracao</p>
              <h2 className="mt-1 text-xl font-extrabold">{gateway.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {gateway.isConfigured && supportsTestLead
                  ? "Gateway configurado. Use o teste operacional para gerar um lead real e validar a criacao de Pix sem sair do PayFlow."
                  : gateway.isConfigured
                  ? "Gateway configurado no servidor. As credenciais ficam protegidas no ambiente e os testes reais aparecem quando o adapter estiver liberado."
                  : hasServerAdapter
                  ? "Adapter server-side iniciado. Configure as credenciais no ambiente da Vercel antes de ativar chamadas reais."
                  : "Configuracao deste gateway ainda nao implementada. Adicione as credenciais conforme a documentacao oficial antes de ativar chamadas reais."}
              </p>
            </div>
          </div>
          <span
            className={
              gateway.isConfigured
                ? "inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal text-emerald-700 shadow-sm ring-1 ring-white/60"
                : "inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal text-amber-700 shadow-sm ring-1 ring-white/60"
            }
          >
            {gateway.isConfigured ? "Configurado" : "Nao configurado"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          {gateway.isConfigured ? <GatewayTestLead gateway={gateway} /> : null}

          <section className="rounded-lg border border-border/70 bg-slate-50/75 p-4 shadow-inner-line">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="font-bold">{gateway.isConfigured ? "Credenciais ativas no servidor" : "Credenciais previstas"}</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {gateway.credentialFields.map((field) => (
                <CredentialFieldPreview key={field.key} field={field} />
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-border/70 bg-white p-4 shadow-inner-line">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-bold">Implementacao segura</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>Nenhum campo da Umbrella e reutilizado aqui.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>
                {hasServerAdapter
                  ? "As chamadas reais ficam restritas ao servidor e dependem das variaveis de ambiente configuradas."
                  : "O adapter deste gateway permanece bloqueado ate a API oficial ser validada."}
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>Credenciais reais devem ficar apenas em variaveis de ambiente no servidor.</span>
            </li>
          </ul>
          <div className="mt-4 grid gap-2">
            <Link className="btn-secondary w-full" href={`/getways?gateway=${gateway.id}&panel=docs#gateway-panel`}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Ver docs internas
            </Link>
            <a className="control-chip justify-between" href={gateway.docsUrl ?? gateway.websiteUrl} target="_blank" rel="noreferrer">
              <span>Documento oficial</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}

function CredentialFieldPreview({ field }: { field: GatewayCredentialField }) {
  return (
    <div className="rounded-md border border-border/80 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-bold text-foreground">{field.label}</label>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
          {field.secret ? "Secret" : "Publico"}
        </span>
      </div>
      <div className="mt-2 h-10 rounded-md border border-dashed border-border/90 bg-slate-50/80 px-3 py-2 text-sm font-medium text-muted-foreground">
        {field.placeholder ?? "Aguardando implementacao"}
      </div>
      {field.helpText ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

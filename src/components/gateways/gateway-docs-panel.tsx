import { ArrowUpRight, BookOpen, Clock, FileText, KeyRound, Link2, ShieldAlert, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { GatewayCapabilityValue, GatewayDocsStatus, GatewayRegistryItem, GatewayUiStatus, PaymentMethod } from "@/server/gateways/registry";
import { cn } from "@/lib/utils";

const docsStatusView: Record<GatewayDocsStatus, { label: string; className: string }> = {
  ready_public_docs: {
    label: "Docs publicas",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  partial_public_spa: {
    label: "Docs parciais",
    className: "border-amber-200 bg-amber-50 text-amber-700"
  },
  tutorial_public_reference_pending: {
    label: "Tutorial localizado",
    className: "border-blue-200 bg-blue-50 text-blue-700"
  },
  readme_reference_gated: {
    label: "API Reference localizada",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700"
  },
  readme_reference_public: {
    label: "API Reference publica",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700"
  },
  public_marketing_only: {
    label: "Docs pendentes",
    className: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

const uiStatusView: Record<GatewayUiStatus, { label: string; className: string }> = {
  configured: {
    label: "Configurado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  awaiting_docs: {
    label: "Nao configurado",
    className: "border-amber-200 bg-amber-50 text-amber-700"
  },
  pending_credentials: {
    label: "Credenciais pendentes",
    className: "border-blue-200 bg-blue-50 text-blue-700"
  },
  disabled: {
    label: "Desativado",
    className: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

const methodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartao",
  debit_card: "Debito",
  boleto: "Boleto",
  bank_transfer: "Transferencia",
  crypto: "Crypto"
};

export function GatewayDocsPanel({ gateway }: { gateway: GatewayRegistryItem }) {
  const docsStatus = docsStatusView[gateway.docsStatus];
  const uiStatus = uiStatusView[gateway.status];
  const hasConfirmedEndpoints = Boolean(gateway.api?.endpoints?.some((endpoint) => endpoint.confirmed));

  return (
    <article id={`docs-${gateway.id}`} className="data-panel scroll-mt-6 overflow-hidden">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <div className="border-b border-border/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5 xl:border-b-0 xl:border-r">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white shadow-sm ring-1 ring-slate-900/5">
              <Image className="h-7 w-7 object-contain" src={gateway.logo} alt={gateway.logoAlt} width={28} height={28} unoptimized />
            </span>
            <div className="min-w-0">
              <p className="section-label">Documentacao</p>
              <h3 className="mt-1 text-xl font-extrabold">{gateway.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{gateway.description}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className={uiStatus.className}>{uiStatus.label}</Badge>
            <Badge className={docsStatus.className}>{docsStatus.label}</Badge>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Metodos mapeados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {gateway.methods.length ? (
                gateway.methods.map((method) => (
                  <span key={method} className="rounded-md border border-border/80 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                    {methodLabels[method]}
                  </span>
                ))
              ) : (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">A confirmar</span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {gateway.docsReferences.map((reference) => (
              <a key={reference.url} className="control-chip justify-between" href={reference.url} target="_blank" rel="noreferrer">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{reference.label}</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <section className="grid gap-3 md:grid-cols-2">
            <InfoBlock icon={KeyRound} title="Credenciais">
              {gateway.credentialFields.map((field) => (
                <li key={field.key}>
                  <span className="font-semibold text-foreground">{field.label}</span>
                  <span className="text-muted-foreground">, {field.secret ? "secret" : "nao secreto"}{field.required ? ", obrigatorio" : ", pendente"}</span>
                  {field.helpText ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.helpText}</p> : null}
                </li>
              ))}
            </InfoBlock>

            <InfoBlock icon={FileText} title="Capacidades">
              {Object.entries(gateway.capabilities).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold text-foreground">{formatCapabilityKey(key)}</span>
                  <CapabilityBadge value={value} />
                </li>
              ))}
            </InfoBlock>
          </section>

          <section className="rounded-lg border border-border/70 bg-slate-50/75 p-4 shadow-inner-line">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Endpoints</p>
                <h4 className="mt-1 font-bold text-foreground">{hasConfirmedEndpoints ? "Rotas confirmadas" : "Aguardando documentacao oficial"}</h4>
              </div>
              {gateway.api?.baseUrl ? <code className="rounded-md border border-border/80 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">{gateway.api.baseUrl}</code> : null}
            </div>

            {gateway.api?.endpoints?.length ? (
              <div className="mt-4 grid gap-2">
                {gateway.api.endpoints.map((endpoint) => (
                  <div key={endpoint.key} className="rounded-md border border-border/80 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-brand-navy px-2 py-1 text-[11px] font-black text-white">{endpoint.method}</span>
                      <code className="text-xs font-bold text-slate-700">{endpoint.path}</code>
                      {endpoint.confirmed ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Confirmado</Badge> : <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pendente</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Nenhum endpoint foi cadastrado porque a documentacao publica nao expoe base URL, headers e payloads completos com seguranca.</p>
            )}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <ListBlock title="Notas" items={gateway.docsNotes} />
            <ListBlock title="Pendencias" items={gateway.pendingQuestions} tone="warning" />
            <ListBlock title="Seguranca" items={gateway.safetyNotes} tone="danger" />
          </section>
        </div>
      </div>
    </article>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal shadow-sm ring-1 ring-white/60", className)}>{children}</span>;
}

function InfoBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white p-4 shadow-inner-line">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="font-bold">{title}</h4>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6">{children}</ul>
    </div>
  );
}

function ListBlock({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "warning" | "danger" }) {
  const Icon = tone === "default" ? BookOpen : tone === "warning" ? Clock : ShieldAlert;
  const iconClassName = tone === "default" ? "text-primary" : tone === "warning" ? "text-amber-700" : "text-red-700";

  return (
    <div className="rounded-lg border border-border/70 bg-white p-4 shadow-inner-line">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
        <h4 className="font-bold">{title}</h4>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapabilityBadge({ value }: { value: GatewayCapabilityValue }) {
  if (value === true) return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">OK</Badge>;
  if (value === false) return <Badge className="border-slate-200 bg-slate-50 text-slate-700">Nao</Badge>;
  if (value === "not_confirmed") return <Badge className="border-slate-200 bg-slate-50 text-slate-700">A confirmar</Badge>;
  return <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pendente</Badge>;
}

function formatCapabilityKey(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace("Pix", "PIX")
    .replace("Api", "API");
}

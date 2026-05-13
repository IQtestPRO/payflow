import { ArrowUpRight, BookOpen, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { GatewayRegistryItem } from "@/server/gateways/registry";
import { cn } from "@/lib/utils";

const statusView: Record<GatewayRegistryItem["status"], { label: string; className: string }> = {
  configured: {
    label: "Configurado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  pending: {
    label: "Pendente",
    className: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

export function GatewayCard({ gateway }: { gateway: GatewayRegistryItem }) {
  const status = statusView[gateway.status];
  const Icon = gateway.icon;
  const configIsExternal = gateway.configAction.kind === "external";
  const docsIsExternal = gateway.docsUrl?.startsWith("http");

  return (
    <article className="data-panel group flex min-h-[280px] flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft">
      <div className="relative border-b border-border/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-navy via-brand-blue to-brand-cyan" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white shadow-sm ring-1 ring-slate-900/5">
              <Image className="h-7 w-7 object-contain" src={gateway.logo} alt={gateway.logoAlt} width={28} height={28} unoptimized />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-normal text-primary">Gateway</p>
              <h2 className="mt-0.5 truncate font-bold text-foreground">{gateway.name}</h2>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal shadow-sm ring-1 ring-white/60", status.className)}>
            {status.label}
          </span>
        </div>
        <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{gateway.description}</p>
      </div>

      <div className="flex flex-1 flex-col justify-between bg-white/[0.92] p-5">
        <div className="rounded-lg border border-border/70 bg-slate-50/75 p-3 shadow-inner-line">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Base futura</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Credenciais, endpoints e webhooks dedicados.</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link className="btn-primary w-full" href={gateway.configAction.href} target={configIsExternal ? "_blank" : undefined} rel={configIsExternal ? "noreferrer" : undefined}>
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            {gateway.configAction.label}
          </Link>
          <Link
            className="btn-secondary w-full"
            href={gateway.docsUrl ?? gateway.websiteUrl}
            target={docsIsExternal || !gateway.docsUrl ? "_blank" : undefined}
            rel={docsIsExternal || !gateway.docsUrl ? "noreferrer" : undefined}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Docs
          </Link>
        </div>

        <a className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-muted-foreground transition hover:text-primary" href={gateway.websiteUrl} target="_blank" rel="noreferrer">
          Site oficial
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

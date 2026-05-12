import { Activity, Radio, ShieldCheck } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow = "PayFlow Command Center"
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="data-panel overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
        <div className="relative p-5 md:p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-blue via-brand-cyan to-transparent" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-xs font-bold uppercase tracking-normal text-primary">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              {eyebrow}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <span className="live-dot" />
              live ops
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-2xl font-extrabold leading-tight text-foreground md:text-[2rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex min-w-[220px] flex-col justify-between border-t border-border/80 bg-slate-50/70 p-5 md:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            seguranca operacional
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            eventos, filas e receita em leitura unica
          </div>
          {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}

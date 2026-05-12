import { Activity, ShieldCheck, Sparkles } from "lucide-react";

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
    <header className="premium-panel p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-normal text-primary">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-foreground md:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Operacao segura
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-blue-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Painel em tempo real
            </span>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

import { Inbox, Sparkles } from "lucide-react";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-blue-50 to-emerald-50 shadow-inner-line">
        <Inbox className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Pronto para configurar
      </div>
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

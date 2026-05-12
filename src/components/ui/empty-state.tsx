import { Inbox } from "lucide-react";
import { PayFlowMark } from "@/components/brand/payflow-logo";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  framed = true
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  framed?: boolean;
}) {
  return (
    <div className={cn("flex min-h-64 flex-col items-center justify-center overflow-hidden p-8 text-center", framed && "data-panel")}>
      <div className="relative flex h-16 w-16 items-center justify-center rounded-lg border border-border/80 bg-white shadow-command">
        <span aria-hidden="true">
          <PayFlowMark className="h-10 w-10 opacity-95" />
        </span>
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-primary">
          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden="true" />
        playbook pronto
      </div>
      <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

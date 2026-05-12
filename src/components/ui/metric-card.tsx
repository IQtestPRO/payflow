import { AlertTriangle, Banknote, CreditCard, Gauge, MessageCircle, MousePointerClick, Receipt, RefreshCcw, TrendingUp } from "lucide-react";
import type { DashboardMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass = {
  default: {
    text: "text-brand-navy",
    icon: "text-primary",
    bg: "bg-white/[0.96]",
    delta: "border-blue-200 bg-blue-50 text-blue-700",
    line: "from-brand-blue to-brand-cyan"
  },
  success: {
    text: "text-emerald-700",
    icon: "text-emerald-700",
    bg: "bg-emerald-50/[0.55]",
    delta: "border-emerald-200 bg-emerald-50 text-emerald-700",
    line: "from-brand-green to-brand-cyan"
  },
  warning: {
    text: "text-amber-700",
    icon: "text-amber-700",
    bg: "bg-amber-50/[0.60]",
    delta: "border-amber-200 bg-amber-50 text-amber-700",
    line: "from-amber-400 to-orange-400"
  },
  danger: {
    text: "text-red-700",
    icon: "text-red-700",
    bg: "bg-red-50/[0.55]",
    delta: "border-red-200 bg-red-50 text-red-700",
    line: "from-red-500 to-rose-400"
  }
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const tone = toneClass[metric.tone ?? "default"];
  const Icon = iconForMetric(metric.label);

  return (
    <article className={cn("data-panel group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft", tone.bg)}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", tone.line)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white/90 shadow-inner-line transition group-hover:scale-[1.03]">
          <Icon className={cn("h-5 w-5", tone.icon)} aria-hidden="true" />
        </div>
        {metric.delta ? <span className={cn("rounded-md border px-2.5 py-1 text-xs font-bold tabular-nums", tone.delta)}>{metric.delta}</span> : null}
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">{metric.label}</p>
        <p className={cn("num mt-2 text-2xl font-extrabold leading-none md:text-[1.75rem]", tone.text)}>{metric.value}</p>
      </div>
    </article>
  );
}

function iconForMetric(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("receita") || normalized.includes("ticket")) return Banknote;
  if (normalized.includes("vendas") || normalized.includes("aprovadas")) return Receipt;
  if (normalized.includes("abandonados")) return AlertTriangle;
  if (normalized.includes("pendentes") || normalized.includes("pagamentos")) return CreditCard;
  if (normalized.includes("recuper")) return RefreshCcw;
  if (normalized.includes("conversas") || normalized.includes("resposta")) return MessageCircle;
  if (normalized.includes("tr") || normalized.includes("cpa")) return MousePointerClick;
  if (normalized.includes("roas")) return TrendingUp;
  return Gauge;
}

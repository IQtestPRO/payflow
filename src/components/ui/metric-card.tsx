import { AlertTriangle, Banknote, CreditCard, Gauge, MessageCircle, MousePointerClick, Receipt, RefreshCcw, TrendingUp } from "lucide-react";
import type { DashboardMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass = {
  default: {
    text: "text-brand-navy",
    icon: "text-primary",
    bg: "from-blue-500/10 to-cyan-400/10",
    delta: "border-blue-200 bg-blue-50 text-blue-700",
    line: "from-brand-blue to-brand-cyan"
  },
  success: {
    text: "text-emerald-700",
    icon: "text-emerald-700",
    bg: "from-emerald-500/10 to-brand-green/10",
    delta: "border-emerald-200 bg-emerald-50 text-emerald-700",
    line: "from-brand-green to-brand-cyan"
  },
  warning: {
    text: "text-amber-700",
    icon: "text-amber-700",
    bg: "from-amber-400/15 to-orange-300/10",
    delta: "border-amber-200 bg-amber-50 text-amber-700",
    line: "from-amber-400 to-orange-400"
  },
  danger: {
    text: "text-red-700",
    icon: "text-red-700",
    bg: "from-red-500/10 to-rose-400/10",
    delta: "border-red-200 bg-red-50 text-red-700",
    line: "from-red-500 to-rose-400"
  }
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const tone = toneClass[metric.tone ?? "default"];
  const Icon = iconForMetric(metric.label);

  return (
    <article className={cn("surface group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-glow", `bg-gradient-to-br ${tone.bg}`)}>
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tone.line)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/80 bg-white/80 shadow-sm transition group-hover:scale-[1.03]">
          <Icon className={cn("h-5 w-5", tone.icon)} aria-hidden="true" />
        </div>
        {metric.delta ? <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums", tone.delta)}>{metric.delta}</span> : null}
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
        <p className={cn("mt-2 text-2xl font-black leading-none tracking-normal tabular-nums md:text-[1.7rem]", tone.text)}>{metric.value}</p>
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

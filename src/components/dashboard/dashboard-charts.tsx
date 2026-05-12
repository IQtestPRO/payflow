"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardSnapshot } from "@/lib/types";

const statusColors = ["#0967FF", "#3BEA8D", "#16C8C7", "#EF4444", "#06245B", "#64748B"];
const axisStyle = { fill: "#64748B", fontSize: 11, fontWeight: 600 };
const chartMargin = { top: 12, right: 18, left: 0, bottom: 8 };

export function DashboardCharts({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Receita por dia" eyebrow="Tendencia diaria">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={snapshot.revenueByDay} margin={chartMargin}>
            <CartesianGrid stroke="#D9E5F4" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisStyle} dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={72} />
            <Tooltip content={<PremiumTooltip currency />} cursor={{ stroke: "#0967FF", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0967FF"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3BEA8D", stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#0967FF", stroke: "#B7FFE0", strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Pagamentos por status" eyebrow="Saude do checkout">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={snapshot.paymentsByStatus} dataKey="count" nameKey="status" innerRadius={62} outerRadius={94} paddingAngle={3} stroke="#FFFFFF" strokeWidth={3}>
              {snapshot.paymentsByStatus.map((entry, index) => (
                <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<PremiumTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "#475569" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Conversas por status" eyebrow="Carga da inbox">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={snapshot.conversationsByStatus} margin={chartMargin}>
            <CartesianGrid stroke="#D9E5F4" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="status" tickLine={false} axisLine={false} interval={0} tick={axisStyle} dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={44} />
            <Tooltip content={<PremiumTooltip />} cursor={{ fill: "rgba(9, 103, 255, 0.06)" }} />
            <Bar dataKey="count" fill="#16C8C7" radius={[8, 8, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Campanhas com melhor desempenho" eyebrow="Performance de midia">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={snapshot.topCampaigns} margin={chartMargin}>
            <CartesianGrid stroke="#D9E5F4" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={axisStyle} dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={44} />
            <Tooltip content={<PremiumTooltip suffix="x" />} cursor={{ fill: "rgba(59, 234, 141, 0.08)" }} />
            <Bar dataKey="roas" fill="#3BEA8D" radius={[8, 8, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function ChartFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="surface overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-primary">{eyebrow}</p>
          <h2 className="mt-1 text-base font-bold text-foreground">{title}</h2>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand-blue to-brand-green shadow-[0_0_0_5px_rgb(9_103_255/0.08)]" />
      </div>
      <div className="mt-4 h-[260px] rounded-md border border-border/60 bg-white/60 p-2">{children}</div>
    </section>
  );
}

type TooltipPayload = {
  name?: string;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
};

function PremiumTooltip({
  active,
  payload,
  label,
  currency = false,
  suffix = ""
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  currency?: boolean;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-white/10 bg-brand-deep/95 px-3 py-2 text-xs text-white shadow-premium">
      {label ? <p className="mb-1 font-bold text-white/70">{label}</p> : null}
      {payload.map((item) => (
        <div key={`${item.name ?? item.dataKey}`} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#3BEA8D" }} />
          <span className="font-semibold">{item.name ?? item.dataKey}</span>
          <span className="font-mono font-bold text-brand-green">{formatTooltipValue(item.value, currency, suffix)}</span>
        </div>
      ))}
    </div>
  );
}

function formatTooltipValue(value: string | number | undefined, currency: boolean, suffix: string) {
  if (value === undefined) return "-";
  if (currency) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  }
  return `${value}${suffix}`;
}

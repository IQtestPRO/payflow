"use client";

import { Activity, ArrowRight, RefreshCcw, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo } from "@/lib/format";
import type { IntegrationRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IntegrationCard({ integration }: { integration: IntegrationRecord }) {
  const [status, setStatus] = useState<string | null>(null);
  const meta = integrationBrands[integration.provider];
  const cta = ctaForStatus(integration.status);

  async function test() {
    setStatus("Testando conexao...");
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: integration.provider })
    });
    const json = (await response.json()) as { status?: string; error?: string };
    setStatus(json.status ?? json.error ?? (response.ok ? "Teste concluido" : "Falha no teste"));
  }

  return (
    <article className="surface group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-glow">
      <div className={cn("relative border-b border-border/80 bg-gradient-to-br p-5", meta.softBg)}>
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", meta.line)} />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <IntegrationLogo src={meta.asset} alt={meta.assetAlt} icon={meta.fallbackIcon} />
            <div>
              <p className={cn("text-[11px] font-bold uppercase tracking-normal", meta.accent)}>{meta.category}</p>
              <h2 className="mt-0.5 font-bold text-foreground">{meta.label}</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Ultima sync {timeAgo(integration.lastSyncAt)}</p>
            </div>
          </div>
          <StatusBadge status={integration.status} />
        </div>
        <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{meta.description}</p>
      </div>

      <div className="bg-white/80 p-5">
        <div className="grid gap-2">
          <Link className={cn("btn-primary w-full", integration.status === "ERROR" && "from-red-500 via-red-500 to-orange-400")} href={meta.detailsHref}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {cta}
          </Link>
          <button className="btn-secondary w-full" type="button" onClick={test}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Testar conexao
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Eventos recentes</p>
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {(status ? [status, ...integration.logs] : integration.logs).slice(0, 3).map((log) => (
              <li key={log} className="flex gap-2">
                <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br", meta.line)} />
                <span className="leading-5 text-slate-700">{log}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          Configuravel por ambiente e webhooks
        </div>
      </div>
    </article>
  );
}

function ctaForStatus(status: IntegrationRecord["status"]) {
  if (status === "CONNECTED") return "Ver detalhes";
  if (status === "ERROR") return "Reconectar";
  if (status === "DISCONNECTED") return "Configurar";
  return "Configurar";
}

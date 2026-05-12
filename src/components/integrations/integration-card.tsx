"use client";

import { Activity, CreditCard, LineChart, Megaphone, MessageCircle, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo } from "@/lib/format";
import type { IntegrationRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const providerMeta = {
  WHATSAPP: {
    label: "WhatsApp",
    description: "Inbox, mensagens recebidas, envio e recuperação.",
    icon: MessageCircle,
    tone: "from-brand-green/15 to-brand-cyan/10 text-emerald-700"
  },
  META_ADS: {
    label: "Meta Ads",
    description: "Campanhas, investimento, CPA e ROAS.",
    icon: Megaphone,
    tone: "from-blue-500/15 to-brand-electric/10 text-primary"
  },
  UMBRELLA: {
    label: "UmbrellaPag",
    description: "Pagamentos, Pix, boleto e status transacional.",
    icon: CreditCard,
    tone: "from-slate-900/10 to-brand-navy/5 text-brand-navy"
  },
  UTMIFY: {
    label: "Utmify",
    description: "UTMs, click IDs e origem das conversões.",
    icon: LineChart,
    tone: "from-brand-cyan/15 to-brand-blue/10 text-cyan-700"
  }
};

export function IntegrationCard({ integration }: { integration: IntegrationRecord }) {
  const [status, setStatus] = useState<string | null>(null);
  const meta = providerMeta[integration.provider];
  const Icon = meta.icon;

  async function test() {
    setStatus("Testando conexão...");
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: integration.provider })
    });
    const json = (await response.json()) as { status?: string; error?: string };
    setStatus(json.status ?? json.error ?? (response.ok ? "Teste concluído" : "Falha no teste"));
  }

  return (
    <article className="surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-glow">
      <div className={cn("border-b border-border/80 bg-gradient-to-br p-5", meta.tone)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/80 bg-white/90 shadow-sm">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{meta.label}</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Última sync {timeAgo(integration.lastSyncAt)}</p>
            </div>
          </div>
          <StatusBadge status={integration.status} />
        </div>
        <p className="mt-4 min-h-10 text-sm leading-5 text-muted-foreground">{meta.description}</p>
      </div>

      <div className="bg-white/70 p-5">
        <div className="grid gap-2">
          <button className="btn-secondary w-full" type="button" onClick={test}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Testar conexão
          </button>
          <button className="btn-secondary w-full" type="button">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Ver logs
          </button>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Eventos recentes</p>
          <ul className="mt-2 space-y-2 text-sm">
            {(status ? [status, ...integration.logs] : integration.logs).slice(0, 3).map((log) => (
              <li key={log} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{log}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Copy, CreditCard, KeyRound, Play, RefreshCcw, ShieldCheck, Webhook } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type UmbrellaStatus = {
  provider: string;
  readyForRealApi: boolean;
  hasApiBaseUrl: boolean;
  hasApiKey: boolean;
  webhookSecretConfigured: boolean;
  apiBaseUrl: string;
  webhookUrl: string;
};

type ActionNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  document: string;
};

type SimulateResponse = {
  ok?: boolean;
  error?: string;
  payload?: {
    data?: {
      id?: string;
      status?: string;
    };
  };
  result?: {
    duplicated?: boolean;
    payment?: {
      id: string;
      status: string;
      amount: number;
      providerPaymentId: string;
    };
    recovery?: unknown;
  };
};

const steps = [
  {
    title: "Chave de API",
    description: "Ativa consulta real e teste de credencial Umbrella.",
    icon: KeyRound
  },
  {
    title: "Webhook de pagamento",
    description: "Recebe Pix gerado, pago, expirado e recusado.",
    icon: Webhook
  },
  {
    title: "Recuperacao",
    description: "Pagamento pendente agenda tentativa automaticamente.",
    icon: RefreshCcw
  },
  {
    title: "Conversao",
    description: "Pagamento pago cancela/fecha tentativas pendentes.",
    icon: ShieldCheck
  }
];

export function UmbrellaQuickstart() {
  const [status, setStatus] = useState<UmbrellaStatus | null>(null);
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastSimulation, setLastSimulation] = useState<SimulateResponse | null>(null);
  const [lead, setLead] = useState<LeadForm>({ name: "", phone: "", email: "", document: "" });

  useEffect(() => {
    fetch("/api/integrations/umbrella/status")
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setNotice({ tone: "error", text: "Nao foi possivel ler o status da Umbrella." }));
  }, []);

  const completion = useMemo(() => {
    const checks = [status?.hasApiBaseUrl, status?.hasApiKey, Boolean(status?.webhookUrl), status?.webhookSecretConfigured];
    return checks.filter(Boolean).length;
  }, [status]);

  const leadReady = lead.name.trim().length >= 2 && lead.phone.replace(/\D/g, "").length >= 10 && lead.email.includes("@");

  async function copy(value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "success", text: "Copiado para a area de transferencia." });
  }

  async function testConnection() {
    setLoadingAction("test");
    setNotice(null);
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "UMBRELLA" })
    });
    const json = (await response.json()) as { ok?: boolean; status?: string; error?: string };
    setLoadingAction(null);
    setNotice({
      tone: response.ok && json.ok ? "success" : "error",
      text: json.status ?? json.error ?? "Teste concluido."
    });
  }

  async function simulate(type: "pending" | "paid" | "failed" | "expired") {
    if (!leadReady) {
      setNotice({ tone: "error", text: "Preencha nome, telefone e email reais do lead antes de testar a Umbrella." });
      return;
    }

    setLoadingAction(type);
    setNotice(null);
    const previousPaymentId = lastSimulation?.result?.payment?.providerPaymentId;
    const leadPayload = {
      name: lead.name.trim(),
      phone: lead.phone.replace(/\D/g, ""),
      email: lead.email.trim(),
      document: lead.document.replace(/\D/g, "")
    };
    const response = await fetch("/api/integrations/umbrella/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "pending" || !previousPaymentId ? { type, lead: leadPayload } : { type, lead: leadPayload, externalId: previousPaymentId })
    });
    const json = (await response.json()) as SimulateResponse;
    setLastSimulation(json);
    setLoadingAction(null);
    setNotice({
      tone: response.ok && json.ok ? "success" : "error",
      text: response.ok && json.ok ? simulationMessage(type, json) : json.error ?? "Falha na simulacao Umbrella."
    });
  }

  const envBlock = `UMBRELLA_API_BASE_URL=${status?.apiBaseUrl || "https://api.umbrellapag.com.br"}
UMBRELLA_API_KEY=<sua-chave-umbrella>
UMBRELLA_WEBHOOK_SECRET=<secret-opcional>
APP_URL=https://pay-flow.shop`;

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-payflow-sidebar text-white shadow-premium">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-bold text-brand-cyan">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              UmbrellaPag agora
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-bold md:text-3xl">Pagamentos alimentando recuperacao</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
              Este bloco valida credenciais, mostra o callback oficial e testa eventos usando dados reais do lead, do mesmo jeito que a Umbrella exige para gerar pagamento.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn min-h-10 border border-white/10 bg-white text-brand-navy hover:bg-white/90" type="button" onClick={() => copy(status?.webhookUrl)}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar webhook
              </button>
              <a className="btn min-h-10 border border-white/10 bg-white/10 text-white hover:bg-white/15" href="/pagamentos">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Ver pagamentos
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 p-5 md:p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-white/70">Prontidao Umbrella</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{completion}/4</span>
              <span className="pb-1 text-sm text-white/60">itens configurados</span>
            </div>
            <div className="mt-5 grid gap-2">
              <ConnectionRow label="URL da API" ready={Boolean(status?.hasApiBaseUrl)} />
              <ConnectionRow label="API key" ready={Boolean(status?.hasApiKey)} />
              <ConnectionRow label="Webhook publico" ready={Boolean(status?.webhookUrl)} />
              <ConnectionRow label="Secret HMAC" ready={Boolean(status?.webhookSecretConfigured)} optional />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="surface p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold">Ativacao Umbrella</h3>
              <p className="mt-1 text-sm text-muted-foreground">O caminho minimo para pagamentos entrarem no PayFlow.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Lead real obrigatorio
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-normal text-primary">Passo {index + 1}</p>
                      <h4 className="mt-1 font-semibold">{step.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Webhook oficial</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use esta URL no painel da UmbrellaPag como postback/callback de pagamentos.</p>
          <CopyField label="Callback URL" value={status?.webhookUrl ?? ""} onCopy={copy} />
          <div className="mt-4 grid gap-2">
            <button className="btn-secondary w-full" type="button" onClick={testConnection} disabled={loadingAction === "test"}>
              {loadingAction === "test" ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {loadingAction === "test" ? "Testando..." : "Testar credenciais"}
            </button>
          </div>
          {notice ? <NoticeCard notice={notice} /> : null}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Teste com lead real</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A Umbrella nao gera pagamento com dados ficticios. Preencha um lead real para validar pagamentos, dashboard e recuperacoes no banco atual.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-semibold">
              Nome real do lead
              <input className="field" value={lead.name} onChange={(event) => setLeadField(setLead, "name", event.target.value)} placeholder="Nome completo" autoComplete="name" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Telefone com DDI
                <input className="field" value={lead.phone} onChange={(event) => setLeadField(setLead, "phone", event.target.value)} placeholder="5511999999999" inputMode="tel" autoComplete="tel" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Email real
                <input className="field" value={lead.email} onChange={(event) => setLeadField(setLead, "email", event.target.value)} placeholder="lead@email.com" type="email" autoComplete="email" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              CPF/CNPJ opcional
              <input className="field" value={lead.document} onChange={(event) => setLeadField(setLead, "document", event.target.value)} placeholder="Somente numeros" inputMode="numeric" />
            </label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ActionButton loading={loadingAction === "pending"} disabled={!leadReady} onClick={() => simulate("pending")}>
              Testar pendente
            </ActionButton>
            <ActionButton loading={loadingAction === "paid"} disabled={!leadReady} onClick={() => simulate("paid")}>
              Testar pago
            </ActionButton>
            <ActionButton loading={loadingAction === "failed"} disabled={!leadReady} onClick={() => simulate("failed")}>
              Testar recusado
            </ActionButton>
            <ActionButton loading={loadingAction === "expired"} disabled={!leadReady} onClick={() => simulate("expired")}>
              Testar expirado
            </ActionButton>
          </div>
          {lastSimulation?.result?.payment ? (
            <div className="mt-4 rounded-md border border-border bg-white p-3 text-sm">
              <p className="font-semibold">Ultimo pagamento: {lastSimulation.result.payment.status}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{lastSimulation.result.payment.providerPaymentId}</p>
            </div>
          ) : null}
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold">Variaveis de producao</h3>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-slate-950 p-4 text-xs leading-6 text-brand-green">{envBlock}</pre>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Sem UMBRELLA_WEBHOOK_SECRET o PayFlow aceita webhook sem assinatura. Funciona para teste, mas o secret e recomendado em producao.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ConnectionRow({ label, ready, optional }: { label: string; ready: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/8 px-3 py-2">
      <span className="text-sm text-white/75">{label}</span>
      <span className={cn("inline-flex items-center gap-1 text-xs font-bold", ready ? "text-brand-green" : optional ? "text-white/55" : "text-amber-200")}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {ready ? "pronto" : optional ? "opcional" : "pendente"}
      </span>
    </div>
  );
}

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (value?: string) => void }) {
  return (
    <label className="mt-4 grid gap-2 text-sm font-semibold">
      {label}
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="field font-mono text-xs" value={value} readOnly />
        <button type="button" className="btn-secondary" onClick={() => onCopy(value)} disabled={!value}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
      </div>
    </label>
  );
}

function ActionButton({ children, loading, disabled, onClick }: { children: ReactNode; loading: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn-secondary w-full" disabled={loading || disabled} onClick={onClick}>
      {loading ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
      {loading ? "Aguarde" : children}
    </button>
  );
}

function setLeadField(setLead: Dispatch<SetStateAction<LeadForm>>, key: keyof LeadForm, value: string) {
  setLead((current) => ({ ...current, [key]: value }));
}

function NoticeCard({ notice }: { notice: ActionNotice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : notice.tone === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";
  const Icon = notice.tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={cn("mt-3 flex items-start gap-2 rounded-md border p-3 text-sm font-medium", toneClass)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{notice.text}</span>
    </div>
  );
}

function simulationMessage(type: "pending" | "paid" | "failed" | "expired", json: SimulateResponse) {
  if (json.result?.duplicated) return "Evento duplicado recebido e ignorado.";
  if (type === "pending") return "Pagamento pendente criado e recuperacao avaliada.";
  if (type === "paid") return "Pagamento pago criado e recuperacoes relacionadas fechadas.";
  if (type === "expired") return "Pagamento expirado criado para validar abandono.";
  return "Pagamento recusado criado para validar abandono.";
}

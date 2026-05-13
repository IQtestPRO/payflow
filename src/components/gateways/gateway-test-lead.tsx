"use client";

import { CheckCircle2, Clipboard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { GatewayRegistryItem } from "@/server/gateways/registry";

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  document: string;
};

type TestLeadResponse = {
  ok?: boolean;
  error?: string;
  transaction?: {
    id?: string | null;
    status?: string | null;
    amount?: number | null;
    pixCode?: string | null;
    copyPaste?: string | null;
    qrcode?: string | null;
    expiresAt?: string | null;
  };
  payment?: {
    id?: string;
  };
};

const defaultLead: LeadForm = {
  name: "",
  phone: "",
  email: "",
  document: ""
};

export function GatewayTestLead({ gateway }: { gateway: GatewayRegistryItem }) {
  const [lead, setLead] = useState(defaultLead);
  const [amount, setAmount] = useState("1.00");
  const [itemTitle, setItemTitle] = useState(`Lead teste ${gateway.name}`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestLeadResponse | null>(null);

  const isSupported = gateway.id === "lytronpay";
  const canSubmit = useMemo(() => {
    return Boolean(
      isSupported &&
        itemTitle.trim().length >= 2 &&
        Number(amount) > 0 &&
        lead.name.trim().length >= 2 &&
        lead.phone.replace(/\D/g, "").length >= 10 &&
        lead.email.includes("@") &&
        lead.document.replace(/\D/g, "").length === 11
    );
  }, [amount, isSupported, itemTitle, lead]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/gateways/${gateway.id}/test-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          itemTitle,
          lead
        })
      });
      const json = (await response.json().catch(() => ({}))) as TestLeadResponse;
      setResult(response.ok ? json : { ok: false, error: json.error ?? "Falha ao gerar lead teste." });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Falha ao gerar lead teste." });
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported) {
    return (
      <section className="rounded-lg border border-border/70 bg-white p-4 shadow-inner-line">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="font-bold">Lead teste</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Teste operacional ainda nao habilitado para {gateway.name}. O painel ja esta preparado para receber o fluxo real quando a API for validada.
        </p>
      </section>
    );
  }

  const pixCode = result?.transaction?.copyPaste ?? result?.transaction?.pixCode ?? result?.transaction?.qrcode ?? null;

  return (
    <section className="rounded-lg border border-primary/15 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/35 p-4 shadow-inner-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-bold">Lead teste com Pix real</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Use dados reais e autorizados. Em ambiente de producao, este teste cria uma cobranca Pix real na LytronPay e registra o pagamento no PayFlow.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Operacional
        </span>
      </div>

      <form className="mt-4 grid gap-3 lg:grid-cols-2" onSubmit={submit}>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">Nome do lead</span>
          <input className="field" value={lead.name} onChange={(event) => updateLead(setLead, "name", event.target.value)} placeholder="Nome completo" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">Telefone</span>
          <input className="field" value={lead.phone} onChange={(event) => updateLead(setLead, "phone", event.target.value)} placeholder="+55 19 99999-9999" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">E-mail</span>
          <input className="field" type="email" value={lead.email} onChange={(event) => updateLead(setLead, "email", event.target.value)} placeholder="cliente@email.com" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">CPF</span>
          <input className="field" value={lead.document} onChange={(event) => updateLead(setLead, "document", event.target.value)} placeholder="Somente CPF real" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">Item</span>
          <input className="field" value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder="Lead teste LytronPay" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase text-muted-foreground">Valor R$</span>
          <input className="field" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1.00" />
        </label>
        <div className="lg:col-span-2">
          <button className="btn-primary w-full" type="submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
            Gerar lead teste
          </button>
        </div>
      </form>

      {result ? (
        <div
          className={`mt-4 rounded-lg border p-4 ${
            result.ok ? "border-emerald-200 bg-emerald-50/80 text-emerald-950" : "border-red-200 bg-red-50/80 text-red-900"
          }`}
        >
          {result.ok ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-extrabold">Pix gerado e registrado</p>
                <p className="mt-1 text-sm">
                  TXID: <span className="font-mono">{result.transaction?.id ?? "-"}</span> - Status:{" "}
                  <span className="font-mono">{result.transaction?.status ?? "pending"}</span>
                </p>
              </div>
              {pixCode ? (
                <div className="rounded-md border border-emerald-200 bg-white/85 p-3">
                  <p className="text-xs font-bold uppercase text-emerald-700">Pix copia e cola</p>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-700">{pixCode}</p>
                  <button className="btn-secondary mt-3 min-h-9 px-3" type="button" onClick={() => copyToClipboard(pixCode)}>
                    <Clipboard className="h-4 w-4" aria-hidden="true" />
                    Copiar Pix
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-bold">{result.error}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function updateLead(setLead: Dispatch<SetStateAction<LeadForm>>, key: keyof LeadForm, value: string) {
  setLead((current) => ({ ...current, [key]: value }));
}

async function copyToClipboard(value: string) {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(value);
}

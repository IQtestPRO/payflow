"use client";

import { AlertCircle, CheckCircle2, CreditCard, Loader2, QrCode, Send, X } from "lucide-react";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ConversationRecord, MessageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type GatewayId = "umbrella" | "mangofy" | "sigilopay" | "lytronpay" | "allowpayments";

type FieldState = {
  found: boolean;
  source: string;
};

type ChargeDraft = {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: {
    zipCode: string;
    street: string;
    streetNumber: string;
    neighborhood: string;
    complement: string;
    city: string;
    state: string;
  };
  product: string;
  amount: string;
  tracking: {
    offerId?: string | null;
    offerSlug?: string | null;
    clickId?: string | null;
    fbclid?: string | null;
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
    src?: string | null;
    sck?: string | null;
  };
  fieldState: Record<string, FieldState>;
};

type GatewayOption = {
  id: GatewayId;
  name: string;
  logo: string;
  logoAlt: string;
  status: "available" | "not_configured" | "pending";
  statusLabel: string;
  reason: string;
};

type PreviewResponse = {
  ok?: boolean;
  error?: string;
  draft?: ChargeDraft;
  gateways?: GatewayOption[];
};

type ChargeResponse = {
  ok?: boolean;
  error?: string;
  payment?: {
    id: string;
    provider: string;
    providerPaymentId: string;
    status: string;
    amount: number;
    pixCode?: string | null;
    checkoutUrl?: string | null;
  };
  transaction?: {
    id: string;
    status: string | null;
    gateway: GatewayId;
    pixCopyPaste: string | null;
    qrCodeDataUrl: string | null;
    paymentUrl: string | null;
    expiresAt: string | null;
  };
  sendTemplates?: {
    qrCaption: string;
    pixText: string;
  };
  utmify?: {
    ok?: boolean;
    skipped?: boolean;
    status?: string;
  };
};

type SendResponse = {
  ok?: boolean;
  error?: string;
  message?: MessageRecord;
  sentAs?: "media" | "text";
};

export function InboxChargePanel({
  conversation,
  open,
  onClose,
  onMessageSent,
  onPaymentLinked
}: {
  conversation: ConversationRecord;
  open: boolean;
  onClose: () => void;
  onMessageSent: (message: MessageRecord) => void;
  onPaymentLinked: (paymentId: string) => void;
}) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingArtifact, setSendingArtifact] = useState<"qr_code" | "pix_copy_paste" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<GatewayId | null>(null);
  const [draft, setDraft] = useState<ChargeDraft | null>(null);
  const [charge, setCharge] = useState<ChargeResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingPreview(true);
    setError(null);
    setCharge(null);
    setSelectedGateway(null);

    fetch("/api/inbox/charges/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id })
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => ({}))) as PreviewResponse;
        if (!response.ok || !json.draft || !json.gateways) throw new Error(json.error ?? "Nao foi possivel preparar a cobranca.");
        setDraft(json.draft);
        setGateways(json.gateways);
        setSelectedGateway(json.gateways.find((gateway) => gateway.status === "available")?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel preparar a cobranca."))
      .finally(() => setLoadingPreview(false));
  }, [conversation.id, open]);

  const selectedGatewayOption = useMemo(() => gateways.find((gateway) => gateway.id === selectedGateway) ?? null, [gateways, selectedGateway]);
  const trackingCount = draft
    ? Object.values(draft.tracking).filter((value) => typeof value === "string" && value.trim()).length
    : 0;

  if (!open) return null;

  async function generateCharge() {
    if (!draft || !selectedGateway) return;
    setGenerating(true);
    setError(null);
    setCharge(null);

    try {
      const response = await fetch("/api/inbox/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          gateway: selectedGateway,
          draft
        })
      });
      const json = (await response.json().catch(() => ({}))) as ChargeResponse;
      if (!response.ok || !json.payment || !json.transaction) throw new Error(json.error ?? "Falha ao gerar cobranca.");
      setCharge(json);
      onPaymentLinked(json.payment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar cobranca.");
    } finally {
      setGenerating(false);
    }
  }

  async function sendArtifact(artifact: "qr_code" | "pix_copy_paste") {
    if (!charge?.payment?.id) return;
    setSendingArtifact(artifact);
    setError(null);

    try {
      const response = await fetch("/api/inbox/charges/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          paymentId: charge.payment.id,
          artifact
        })
      });
      const json = (await response.json().catch(() => ({}))) as SendResponse;
      if (!response.ok || !json.message) throw new Error(json.error ?? "Falha ao enviar a cobranca.");
      onMessageSent(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar a cobranca.");
    } finally {
      setSendingArtifact(null);
    }
  }

  return (
    <section className="border-b border-border/80 bg-white/[0.96] p-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-white via-blue-50/45 to-cyan-50/35 p-4 shadow-inner-line">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-label">Cobrança pelo WhatsApp</p>
            <h3 className="mt-1 text-lg font-extrabold">Gerar Pix vinculado a esta conversa</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Os dados captados no chat entram como rascunho. Revise antes de gerar a cobrança real.
            </p>
          </div>
          <button className="btn-secondary min-h-9 px-3" type="button" onClick={onClose} aria-label="Fechar cobranças">
            <X className="h-4 w-4" aria-hidden="true" />
            Fechar
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {loadingPreview ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-border/70 bg-white p-4 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Preparando payload da conversa...
          </div>
        ) : draft ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.25fr)]">
            <div className="grid content-start gap-3">
              {gateways.map((gateway) => {
                const active = selectedGateway === gateway.id;
                const available = gateway.status === "available";
                return (
                  <button
                    key={gateway.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md",
                      active && "border-primary/70 ring-2 ring-primary/10",
                      !available && "cursor-not-allowed opacity-70"
                    )}
                    disabled={!available}
                    onClick={() => setSelectedGateway(gateway.id)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white">
                      <Image src={gateway.logo} alt={gateway.logoAlt} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-foreground">{gateway.name}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{gateway.reason}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase",
                        available ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                      )}
                    >
                      {gateway.statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-border/70 bg-white p-4 shadow-inner-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="section-label">Payload da cobrança</p>
                    <h4 className="mt-1 font-extrabold">{selectedGatewayOption ? selectedGatewayOption.name : "Escolha um gateway"}</h4>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {trackingCount} parâmetros UTM
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <Field label="Nome" value={draft.name} state={draft.fieldState.name} onChange={(value) => updateDraft(setDraft, "name", value)} />
                  <Field label="Telefone" value={draft.phone} state={draft.fieldState.phone} onChange={(value) => updateDraft(setDraft, "phone", value)} />
                  <Field label="E-mail" value={draft.email} state={draft.fieldState.email} onChange={(value) => updateDraft(setDraft, "email", value)} />
                  <Field label="CPF/CNPJ" value={draft.document} state={draft.fieldState.document} onChange={(value) => updateDraft(setDraft, "document", value)} />
                  <Field label="Produto" value={draft.product} state={draft.fieldState.product} onChange={(value) => updateDraft(setDraft, "product", value)} />
                  <Field label="Valor R$" value={draft.amount} state={draft.fieldState.amount} onChange={(value) => updateDraft(setDraft, "amount", value)} />
                </div>

                <details className="mt-4 rounded-lg border border-border/70 bg-slate-50/70 p-3">
                  <summary className="cursor-pointer text-sm font-extrabold text-foreground">Endereço e tracking</summary>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <Field label="CEP" value={draft.address.zipCode} state={draft.fieldState["address.zipCode"]} onChange={(value) => updateAddress(setDraft, "zipCode", value)} />
                    <Field label="Rua" value={draft.address.street} state={draft.fieldState["address.street"]} onChange={(value) => updateAddress(setDraft, "street", value)} />
                    <Field label="Número" value={draft.address.streetNumber} state={draft.fieldState["address.streetNumber"]} onChange={(value) => updateAddress(setDraft, "streetNumber", value)} />
                    <Field label="Bairro" value={draft.address.neighborhood} state={draft.fieldState["address.neighborhood"]} onChange={(value) => updateAddress(setDraft, "neighborhood", value)} />
                    <Field label="Cidade" value={draft.address.city} state={draft.fieldState["address.city"]} onChange={(value) => updateAddress(setDraft, "city", value)} />
                    <Field label="UF" value={draft.address.state} state={draft.fieldState["address.state"]} onChange={(value) => updateAddress(setDraft, "state", value)} maxLength={2} />
                    <Field label="Complemento" value={draft.address.complement} onChange={(value) => updateAddress(setDraft, "complement", value)} />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <Field label="utm_source" value={draft.tracking.source ?? ""} onChange={(value) => updateTracking(setDraft, "source", value)} />
                    <Field label="utm_medium" value={draft.tracking.medium ?? ""} onChange={(value) => updateTracking(setDraft, "medium", value)} />
                    <Field label="utm_campaign" value={draft.tracking.campaign ?? ""} onChange={(value) => updateTracking(setDraft, "campaign", value)} />
                    <Field label="utm_content" value={draft.tracking.content ?? ""} onChange={(value) => updateTracking(setDraft, "content", value)} />
                    <Field label="utm_term" value={draft.tracking.term ?? ""} onChange={(value) => updateTracking(setDraft, "term", value)} />
                    <Field label="clickId" value={draft.tracking.clickId ?? ""} onChange={(value) => updateTracking(setDraft, "clickId", value)} />
                    <Field label="fbclid" value={draft.tracking.fbclid ?? ""} onChange={(value) => updateTracking(setDraft, "fbclid", value)} />
                    <Field label="src" value={draft.tracking.src ?? ""} onChange={(value) => updateTracking(setDraft, "src", value)} />
                    <Field label="sck" value={draft.tracking.sck ?? ""} onChange={(value) => updateTracking(setDraft, "sck", value)} />
                  </div>
                </details>

                <button className="btn-primary mt-4 w-full" type="button" disabled={!selectedGateway || generating} onClick={generateCharge}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                  {generating ? "Gerando cobrança..." : "Gerar cobrança"}
                </button>
              </div>

              {charge?.payment && charge.transaction ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-inner-line">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold">Cobrança gerada</p>
                      <p className="mt-1 text-sm">
                        TXID: <span className="font-mono">{charge.transaction.id}</span> · Status:{" "}
                        <span className="font-mono">{charge.payment.status}</span>
                      </p>
                      {charge.utmify?.status ? <p className="mt-1 text-xs font-semibold text-emerald-800">Utmify: {charge.utmify.status}</p> : null}
                    </div>
                    {charge.transaction.qrCodeDataUrl ? (
                      <Image
                        className="h-28 w-28 rounded-md border border-emerald-200 bg-white p-1"
                        src={charge.transaction.qrCodeDataUrl}
                        alt="QR Code Pix gerado"
                        width={112}
                        height={112}
                        unoptimized
                      />
                    ) : null}
                  </div>
                  {charge.transaction.pixCopyPaste ? (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-white/90 p-3">
                      <p className="text-xs font-bold uppercase text-emerald-700">Pix copia e cola</p>
                      <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-700">{charge.transaction.pixCopyPaste}</p>
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button className="btn-secondary bg-white" type="button" disabled={Boolean(sendingArtifact)} onClick={() => sendArtifact("qr_code")}>
                      {sendingArtifact === "qr_code" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
                      Enviar QR Code
                    </button>
                    <button className="btn-primary" type="button" disabled={Boolean(sendingArtifact)} onClick={() => sendArtifact("pix_copy_paste")}>
                      {sendingArtifact === "pix_copy_paste" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      Enviar Pix copia e cola
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  state,
  onChange,
  maxLength
}: {
  label: string;
  value: string;
  state?: FieldState;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const missing = value === "Não encontrado" || state?.found === false;
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase text-muted-foreground">
        {label}
        {missing ? <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">Nao encontrado</span> : null}
      </span>
      <input
        className={cn("field", missing && "border-amber-300 bg-amber-50/40")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
      />
    </label>
  );
}

function updateDraft(setDraft: Dispatch<SetStateAction<ChargeDraft | null>>, key: keyof Pick<ChargeDraft, "name" | "phone" | "email" | "document" | "product" | "amount">, value: string) {
  setDraft((current) => (current ? { ...current, [key]: value, fieldState: { ...current.fieldState, [key]: { found: true, source: "manual" } } } : current));
}

function updateAddress(setDraft: Dispatch<SetStateAction<ChargeDraft | null>>, key: keyof ChargeDraft["address"], value: string) {
  setDraft((current) =>
    current
      ? {
          ...current,
          address: { ...current.address, [key]: value },
          fieldState: { ...current.fieldState, [`address.${key}`]: { found: true, source: "manual" } }
        }
      : current
  );
}

function updateTracking(setDraft: Dispatch<SetStateAction<ChargeDraft | null>>, key: keyof ChargeDraft["tracking"], value: string) {
  setDraft((current) => (current ? { ...current, tracking: { ...current.tracking, [key]: value || null } } : current));
}

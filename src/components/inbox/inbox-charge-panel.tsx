"use client";

import { AlertCircle, CheckCircle2, Copy, CreditCard, FileText, Loader2, QrCode, Send, X } from "lucide-react";
import Image from "next/image";
import type { Dispatch, ReactNode, SetStateAction } from "react";
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

type ChargeArtifact = "qr_code" | "pix_copy_paste";
type DraftFieldKey =
  | keyof Pick<ChargeDraft, "name" | "phone" | "email" | "document" | "product" | "amount">
  | `address.${keyof ChargeDraft["address"]}`;

type RequiredField = {
  key: DraftFieldKey;
  label: string;
};

type ZipLookupState = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const baseRequiredFields: RequiredField[] = [
  { key: "name", label: "nome" },
  { key: "phone", label: "telefone" },
  { key: "email", label: "e-mail" },
  { key: "document", label: "CPF/CNPJ" },
  { key: "product", label: "produto" },
  { key: "amount", label: "valor" }
];

const umbrellaRequiredFields: RequiredField[] = [
  { key: "address.zipCode", label: "CEP" },
  { key: "address.street", label: "rua" },
  { key: "address.streetNumber", label: "numero" },
  { key: "address.neighborhood", label: "bairro" },
  { key: "address.city", label: "cidade" },
  { key: "address.state", label: "UF" }
];

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
  const [sendingArtifact, setSendingArtifact] = useState<ChargeArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<GatewayId | null>(null);
  const [draft, setDraft] = useState<ChargeDraft | null>(null);
  const [charge, setCharge] = useState<ChargeResponse | null>(null);
  const [invalidFields, setInvalidFields] = useState<DraftFieldKey[]>([]);
  const [zipLookup, setZipLookup] = useState<ZipLookupState>({ status: "idle", message: null });
  const [sentArtifacts, setSentArtifacts] = useState<Record<ChargeArtifact, boolean>>({
    qr_code: false,
    pix_copy_paste: false
  });

  useEffect(() => {
    if (!open) return;
    setLoadingPreview(true);
    setError(null);
    setNotice(null);
    setCharge(null);
    setInvalidFields([]);
    setZipLookup({ status: "idle", message: null });
    setSentArtifacts({ qr_code: false, pix_copy_paste: false });
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
  const trackingCount = draft ? Object.values(draft.tracking).filter((value) => typeof value === "string" && value.trim()).length : 0;
  const missingRequiredFields = useMemo(() => (draft ? getMissingRequiredFields(draft, selectedGateway) : []), [draft, selectedGateway]);
  const missingRequiredCount = missingRequiredFields.length;
  const invalidFieldSet = useMemo(() => new Set(invalidFields), [invalidFields]);
  const zipCodeForLookup = draft?.address.zipCode ?? "";

  useEffect(() => {
    if (!open) return;
    if (!zipCodeForLookup) {
      setZipLookup({ status: "idle", message: null });
      return;
    }

    const digits = zipCodeForLookup.replace(/\D/g, "");
    if (digits.length !== 8) {
      setZipLookup({ status: "idle", message: null });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setZipLookup({ status: "loading", message: "Buscando endereco pelo CEP..." });

      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
        const json = (await response.json().catch(() => ({}))) as ViaCepResponse;
        if (!response.ok || json.erro) throw new Error("CEP nao encontrado.");

        setDraft((current) => applyCepAddress(current, digits, json));
        setInvalidFields((current) => current.filter((key) => !["address.zipCode", "address.street", "address.neighborhood", "address.city", "address.state"].includes(key)));
        setZipLookup({ status: "success", message: "Endereco preenchido pelo CEP. Informe apenas o numero, se necessario." });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setZipLookup({ status: "error", message: "Nao foi possivel preencher este CEP automaticamente." });
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, zipCodeForLookup]);

  if (!open) return null;

  function clearInvalidField(...keys: DraftFieldKey[]) {
    setInvalidFields((current) => current.filter((key) => !keys.includes(key)));
    if (error?.includes("campos marcados")) setError(null);
  }

  async function generateCharge() {
    if (!draft || !selectedGateway) return;
    if (missingRequiredFields.length > 0) {
      setInvalidFields(missingRequiredFields.map((field) => field.key));
      setError(`Preencha os campos marcados como insuficientes: ${missingRequiredFields.map((field) => field.label).join(", ")}.`);
      setNotice(null);
      return;
    }

    setGenerating(true);
    setError(null);
    setNotice(null);
    setInvalidFields([]);
    setCharge(null);
    setSentArtifacts({ qr_code: false, pix_copy_paste: false });

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
      setNotice("Cobranca gerada e vinculada a esta conversa.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar cobranca.");
    } finally {
      setGenerating(false);
    }
  }

  async function sendArtifact(artifact: ChargeArtifact) {
    if (!charge?.payment?.id) return;
    setSendingArtifact(artifact);
    setError(null);
    setNotice(null);

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
      setSentArtifacts((current) => ({ ...current, [artifact]: true }));
      setNotice(artifact === "qr_code" ? "QR Code enviado na conversa." : "Pix copia e cola enviado na conversa.");
      onMessageSent(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar a cobranca.");
    } finally {
      setSendingArtifact(null);
    }
  }

  async function copyPix() {
    const pix = charge?.transaction?.pixCopyPaste;
    if (!pix) return;

    try {
      await navigator.clipboard.writeText(pix);
      setNotice("Pix copia e cola copiado.");
    } catch {
      setError("Nao foi possivel copiar o Pix automaticamente.");
    }
  }

  return (
    <section className="border-b border-border/80 bg-white/[0.96] p-4">
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-white via-blue-50/45 to-cyan-50/35 p-4 shadow-inner-line md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="section-label">Cobranca pelo WhatsApp</p>
            <h3 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">Gerar Pix vinculado a esta conversa</h3>
            <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">
              Revise gateway, dados captados, payload e envio final antes de mandar o QR Code ou Pix copia e cola ao cliente.
            </p>
          </div>
          <button className="btn-secondary min-h-9 shrink-0 px-3" type="button" onClick={onClose} aria-label="Fechar cobrancas">
            <X className="h-4 w-4" aria-hidden="true" />
            Fechar
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
          {notice ? <MessageBanner tone="success">{notice}</MessageBanner> : null}
        </div>

        {loadingPreview ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-white p-4">
            <div className="skeleton h-4 w-44" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
            </div>
            <div className="skeleton h-11" />
          </div>
        ) : draft ? (
          <div className="mt-5 grid min-w-0 gap-4 2xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
            <aside className="grid min-w-0 content-start gap-4">
              <PanelCard eyebrow="1. Selecao" title="Gateway de cobranca">
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
                  {gateways.map((gateway) => (
                    <GatewayButton
                      key={gateway.id}
                      gateway={gateway}
                      active={selectedGateway === gateway.id}
                      onSelect={() => {
                        setSelectedGateway(gateway.id);
                        setInvalidFields([]);
                        setError(null);
                      }}
                    />
                  ))}
                </div>
              </PanelCard>

              <PanelCard eyebrow="Fluxo" title="Status operacional">
                <div className="grid gap-2 text-sm">
                  <FlowRow label="Gateway" value={selectedGatewayOption?.name ?? "Nao selecionado"} done={Boolean(selectedGatewayOption)} />
                  <FlowRow label="Campos obrigatorios" value={missingRequiredCount === 0 ? "Completos" : `${missingRequiredCount} pendente(s)`} done={missingRequiredCount === 0} />
                  <FlowRow label="UTMs" value={`${trackingCount} parametro(s)`} done={trackingCount > 0} />
                  <FlowRow label="Cobranca" value={charge?.payment ? "Gerada" : "Aguardando"} done={Boolean(charge?.payment)} />
                </div>
              </PanelCard>
            </aside>

            <div className="grid min-w-0 gap-4">
              <PanelCard
                eyebrow="2. Dados captados"
                title="Cliente, produto e valor"
                action={
                  missingRequiredCount > 0 ? (
                    <StatusPill tone="warning">{missingRequiredCount} campo(s) pendente(s)</StatusPill>
                  ) : (
                    <StatusPill tone="success">Payload pronto</StatusPill>
                  )
                }
              >
                <FormSection title="Cliente">
                  <AutoGrid>
                    <Field
                      label="Nome"
                      value={draft.name}
                      state={draft.fieldState.name}
                      invalid={invalidFieldSet.has("name")}
                      onChange={(value) => {
                        updateDraft(setDraft, "name", value);
                        clearInvalidField("name");
                      }}
                    />
                    <Field
                      label="Telefone"
                      value={draft.phone}
                      state={draft.fieldState.phone}
                      invalid={invalidFieldSet.has("phone")}
                      onChange={(value) => {
                        updateDraft(setDraft, "phone", value);
                        clearInvalidField("phone");
                      }}
                    />
                    <Field
                      label="E-mail"
                      value={draft.email}
                      state={draft.fieldState.email}
                      invalid={invalidFieldSet.has("email")}
                      onChange={(value) => {
                        updateDraft(setDraft, "email", value);
                        clearInvalidField("email");
                      }}
                    />
                    <Field
                      label="CPF/CNPJ"
                      value={draft.document}
                      state={draft.fieldState.document}
                      invalid={invalidFieldSet.has("document")}
                      onChange={(value) => {
                        updateDraft(setDraft, "document", value);
                        clearInvalidField("document");
                      }}
                    />
                  </AutoGrid>
                </FormSection>

                <FormSection title="Cobranca" className="mt-5">
                  <AutoGrid>
                    <Field
                      label="Produto"
                      value={draft.product}
                      state={draft.fieldState.product}
                      invalid={invalidFieldSet.has("product")}
                      onChange={(value) => {
                        updateDraft(setDraft, "product", value);
                        clearInvalidField("product");
                      }}
                    />
                    <Field
                      label="Valor R$"
                      value={draft.amount}
                      state={draft.fieldState.amount}
                      invalid={invalidFieldSet.has("amount")}
                      onChange={(value) => {
                        updateDraft(setDraft, "amount", value);
                        clearInvalidField("amount");
                      }}
                    />
                  </AutoGrid>
                </FormSection>

                <details className="mt-5 rounded-lg border border-border/70 bg-slate-50/70 p-3">
                  <summary className="cursor-pointer select-none text-sm font-extrabold text-foreground">Endereco e tracking</summary>
                  <div className="mt-4 grid gap-5">
                    <FormSection title="Endereco">
                      <AutoGrid>
                        <Field
                          label="CEP"
                          value={draft.address.zipCode}
                          state={draft.fieldState["address.zipCode"]}
                          invalid={invalidFieldSet.has("address.zipCode")}
                          helpText={zipLookup.message}
                          helpTone={zipLookup.status === "error" ? "error" : zipLookup.status === "success" ? "success" : "muted"}
                          onChange={(value) => {
                            updateAddress(setDraft, "zipCode", value.replace(/\D/g, "").slice(0, 8));
                            clearInvalidField("address.zipCode");
                            setZipLookup({ status: "idle", message: null });
                          }}
                        />
                        <Field
                          label="Rua"
                          value={draft.address.street}
                          state={draft.fieldState["address.street"]}
                          invalid={invalidFieldSet.has("address.street")}
                          onChange={(value) => {
                            updateAddress(setDraft, "street", value);
                            clearInvalidField("address.street");
                          }}
                        />
                        <Field
                          label="Numero"
                          value={draft.address.streetNumber}
                          state={draft.fieldState["address.streetNumber"]}
                          invalid={invalidFieldSet.has("address.streetNumber")}
                          onChange={(value) => {
                            updateAddress(setDraft, "streetNumber", value);
                            clearInvalidField("address.streetNumber");
                          }}
                        />
                        <Field
                          label="Bairro"
                          value={draft.address.neighborhood}
                          state={draft.fieldState["address.neighborhood"]}
                          invalid={invalidFieldSet.has("address.neighborhood")}
                          onChange={(value) => {
                            updateAddress(setDraft, "neighborhood", value);
                            clearInvalidField("address.neighborhood");
                          }}
                        />
                        <Field
                          label="Cidade"
                          value={draft.address.city}
                          state={draft.fieldState["address.city"]}
                          invalid={invalidFieldSet.has("address.city")}
                          onChange={(value) => {
                            updateAddress(setDraft, "city", value);
                            clearInvalidField("address.city");
                          }}
                        />
                        <Field
                          label="UF"
                          value={draft.address.state}
                          state={draft.fieldState["address.state"]}
                          invalid={invalidFieldSet.has("address.state")}
                          onChange={(value) => {
                            updateAddress(setDraft, "state", value.toUpperCase());
                            clearInvalidField("address.state");
                          }}
                          maxLength={2}
                        />
                        <Field label="Complemento" value={draft.address.complement} onChange={(value) => updateAddress(setDraft, "complement", value)} />
                      </AutoGrid>
                    </FormSection>

                    <FormSection title="Tracking e UTMs">
                      <AutoGrid>
                        <Field label="utm_source" value={draft.tracking.source ?? ""} onChange={(value) => updateTracking(setDraft, "source", value)} />
                        <Field label="utm_medium" value={draft.tracking.medium ?? ""} onChange={(value) => updateTracking(setDraft, "medium", value)} />
                        <Field label="utm_campaign" value={draft.tracking.campaign ?? ""} onChange={(value) => updateTracking(setDraft, "campaign", value)} />
                        <Field label="utm_content" value={draft.tracking.content ?? ""} onChange={(value) => updateTracking(setDraft, "content", value)} />
                        <Field label="utm_term" value={draft.tracking.term ?? ""} onChange={(value) => updateTracking(setDraft, "term", value)} />
                        <Field label="clickId" value={draft.tracking.clickId ?? ""} onChange={(value) => updateTracking(setDraft, "clickId", value)} />
                        <Field label="fbclid" value={draft.tracking.fbclid ?? ""} onChange={(value) => updateTracking(setDraft, "fbclid", value)} />
                        <Field label="src" value={draft.tracking.src ?? ""} onChange={(value) => updateTracking(setDraft, "src", value)} />
                        <Field label="sck" value={draft.tracking.sck ?? ""} onChange={(value) => updateTracking(setDraft, "sck", value)} />
                      </AutoGrid>
                    </FormSection>
                  </div>
                </details>
              </PanelCard>

              <PanelCard
                eyebrow="3. Revisao"
                title="Payload da cobranca"
                action={
                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {trackingCount} parametro(s) UTM
                  </span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewItem label="Gateway" value={selectedGatewayOption?.name ?? "Escolha um gateway"} />
                  <ReviewItem label="Produto" value={draft.product} warning={isMissingValue(draft.product, draft.fieldState.product)} />
                  <ReviewItem label="Valor" value={draft.amount} warning={isMissingValue(draft.amount, draft.fieldState.amount)} />
                  <ReviewItem label="Cliente" value={draft.name} warning={isMissingValue(draft.name, draft.fieldState.name)} />
                </div>

                <details className="mt-4 rounded-lg border border-border/70 bg-slate-950/[0.03] p-3">
                  <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-extrabold text-foreground">
                    <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                    Ver payload estruturado
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border/70 bg-white p-3 text-xs leading-5 text-slate-700">
                    {JSON.stringify(buildReviewPayload(draft, selectedGatewayOption), null, 2)}
                  </pre>
                </details>

                <button className="btn-primary mt-4 w-full" type="button" disabled={!selectedGateway || generating} onClick={generateCharge}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                  {generating ? "Gerando cobranca..." : "Gerar cobranca"}
                </button>
              </PanelCard>

              {charge?.payment && charge.transaction ? (
                <PanelCard
                  eyebrow="4. Envio"
                  title="Cobranca gerada"
                  tone="success"
                  action={charge.utmify?.status ? <StatusPill tone="success">Utmify: {charge.utmify.status}</StatusPill> : null}
                >
                  <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                    <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-white p-3 text-center">
                      {charge.transaction.qrCodeDataUrl ? (
                        <Image
                          className="h-32 w-32 rounded-md border border-emerald-200 bg-white p-1"
                          src={charge.transaction.qrCodeDataUrl}
                          alt="QR Code Pix gerado"
                          width={128}
                          height={128}
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                          QR indisponivel
                        </div>
                      )}
                      <p className="mt-2 text-xs font-bold uppercase text-emerald-700">QR Code Pix</p>
                    </div>

                    <div className="grid min-w-0 gap-3">
                      <div className="rounded-lg border border-emerald-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase text-emerald-700">Transacao</p>
                        <p className="mt-2 break-all text-sm font-semibold text-emerald-950">
                          TXID: <span className="font-mono">{charge.transaction.id}</span>
                        </p>
                        <p className="mt-1 text-sm text-emerald-900">
                          Status: <span className="font-mono font-semibold">{charge.payment.status}</span>
                        </p>
                      </div>

                      {charge.transaction.pixCopyPaste ? (
                        <div className="rounded-lg border border-emerald-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase text-emerald-700">Pix copia e cola</p>
                            <button className="btn-secondary min-h-8 px-2.5 text-xs" type="button" onClick={copyPix}>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              Copiar Pix
                            </button>
                          </div>
                          <p className="mt-2 max-h-28 overflow-auto break-all rounded-md bg-slate-50 p-2 font-mono text-xs leading-5 text-slate-700">{charge.transaction.pixCopyPaste}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button className="btn-secondary bg-white" type="button" disabled={Boolean(sendingArtifact)} onClick={() => sendArtifact("qr_code")}>
                      {sendingArtifact === "qr_code" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
                      {sentArtifacts.qr_code ? "QR Code enviado" : "Enviar QR Code na conversa"}
                    </button>
                    <button className="btn-primary" type="button" disabled={Boolean(sendingArtifact)} onClick={() => sendArtifact("pix_copy_paste")}>
                      {sendingArtifact === "pix_copy_paste" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      {sentArtifacts.pix_copy_paste ? "Pix enviado" : "Enviar Pix copia e cola"}
                    </button>
                  </div>
                </PanelCard>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GatewayButton({ gateway, active, onSelect }: { gateway: GatewayOption; active: boolean; onSelect: () => void }) {
  const available = gateway.status === "available";

  return (
    <button
      type="button"
      className={cn(
        "group grid min-w-0 gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md",
        "sm:grid-cols-[44px_minmax(0,1fr)] sm:items-center",
        active && "border-primary/70 ring-2 ring-primary/10",
        !available && "cursor-not-allowed opacity-70"
      )}
      disabled={!available}
      onClick={onSelect}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white">
        <Image src={gateway.logo} alt={gateway.logoAlt} width={30} height={30} className="h-7 w-7 object-contain" unoptimized />
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-extrabold text-foreground">{gateway.name}</span>
          <StatusPill tone={available ? "success" : "warning"}>{gateway.statusLabel}</StatusPill>
        </span>
        <span className="text-xs leading-5 text-muted-foreground">{gateway.reason}</span>
        <span className={cn("text-xs font-extrabold text-primary transition", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{active ? "Selecionado" : "Selecionar"}</span>
      </span>
    </button>
  );
}

function PanelCard({
  eyebrow,
  title,
  children,
  action,
  tone = "default"
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "default" | "success";
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border bg-white p-4 shadow-inner-line",
        tone === "success" ? "border-emerald-200 bg-emerald-50/80 text-emerald-950" : "border-border/70"
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={cn("text-xs font-bold uppercase tracking-normal", tone === "success" ? "text-emerald-700" : "text-primary")}>{eyebrow}</p>
          <h4 className="mt-1 truncate text-base font-extrabold text-foreground">{title}</h4>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function FormSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-normal text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function AutoGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">{children}</div>;
}

function Field({
  label,
  value,
  state,
  onChange,
  maxLength,
  invalid = false,
  helpText,
  helpTone = "muted"
}: {
  label: string;
  value: string;
  state?: FieldState;
  onChange: (value: string) => void;
  maxLength?: number;
  invalid?: boolean;
  helpText?: string | null;
  helpTone?: "muted" | "success" | "error";
}) {
  const missing = isMissingValue(value, state);
  const displayValue = displayFieldValue(value);

  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
        <span className="truncate">{label}</span>
        {invalid ? (
          <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">Insuficiente</span>
        ) : missing ? (
          <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">Nao encontrado</span>
        ) : null}
      </span>
      <input
        className={cn("field min-w-0", missing && "border-amber-300 bg-amber-50/40", invalid && "border-red-400 bg-red-50/45 text-red-950 focus:border-red-500 focus:ring-red-200")}
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        aria-invalid={invalid}
      />
      {helpText ? (
        <span className={cn("text-xs font-semibold", helpTone === "success" && "text-emerald-700", helpTone === "error" && "text-red-700", helpTone === "muted" && "text-muted-foreground")}>
          {helpText}
        </span>
      ) : invalid ? (
        <span className="text-xs font-semibold text-red-700">Preencha este campo para gerar a cobranca.</span>
      ) : null}
    </label>
  );
}

function ReviewItem({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  const displayValue = displayFieldValue(value);

  return (
    <div className={cn("min-w-0 rounded-lg border bg-slate-50/75 p-3", warning ? "border-amber-200 bg-amber-50/50" : "border-border/70")}>
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-extrabold", warning ? "text-amber-800" : "text-foreground")}>{displayValue || "Nao informado"}</p>
    </div>
  );
}

function FlowRow({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-slate-50/70 px-3 py-2">
      <span className="min-w-0 truncate font-semibold text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 font-extrabold", done ? "text-emerald-700" : "text-amber-700")}>{value}</span>
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase",
        tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
      )}
    >
      {children}
    </span>
  );
}

function MessageBanner({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-md border p-3 text-sm font-semibold",
        tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      )}
    >
      {tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

function isMissingValue(value: string, state?: FieldState) {
  return isNotFoundLabel(value) || state?.found === false;
}

function isNotFoundLabel(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "nao encontrado" || normalized === "não encontrado" || normalized === "nÃ£o encontrado";
}

function displayFieldValue(value: string) {
  return isNotFoundLabel(value) ? "" : value;
}

function hasUsableValue(value?: string | null) {
  return Boolean(displayFieldValue(String(value ?? "")).trim());
}

function getMissingRequiredFields(draft: ChargeDraft, gateway: GatewayId | null): RequiredField[] {
  const fields = gateway === "umbrella" ? [...baseRequiredFields, ...umbrellaRequiredFields] : baseRequiredFields;
  return fields.filter((field) => !hasUsableValue(readDraftField(draft, field.key)));
}

function readDraftField(draft: ChargeDraft, key: DraftFieldKey) {
  if (key.startsWith("address.")) {
    const addressKey = key.replace("address.", "") as keyof ChargeDraft["address"];
    return draft.address[addressKey] ?? "";
  }

  return draft[key as keyof Pick<ChargeDraft, "name" | "phone" | "email" | "document" | "product" | "amount">] ?? "";
}

function applyCepAddress(current: ChargeDraft | null, zipCode: string, response: ViaCepResponse): ChargeDraft | null {
  if (!current) return current;

  const street = cleanCepValue(response.logradouro);
  const neighborhood = cleanCepValue(response.bairro);
  const city = cleanCepValue(response.localidade);
  const state = cleanCepValue(response.uf)?.toUpperCase();
  const complement = cleanCepValue(response.complemento);

  return {
    ...current,
    address: {
      ...current.address,
      zipCode,
      street: street || current.address.street,
      neighborhood: neighborhood || current.address.neighborhood,
      city: city || current.address.city,
      state: state || current.address.state,
      complement: complement || current.address.complement
    },
    fieldState: {
      ...current.fieldState,
      "address.zipCode": { found: true, source: "manual" },
      ...(street ? { "address.street": { found: true, source: "manual" as const } } : {}),
      ...(neighborhood ? { "address.neighborhood": { found: true, source: "manual" as const } } : {}),
      ...(city ? { "address.city": { found: true, source: "manual" as const } } : {}),
      ...(state ? { "address.state": { found: true, source: "manual" as const } } : {})
    }
  };
}

function cleanCepValue(value?: string | null) {
  return String(value ?? "").trim();
}

function buildReviewPayload(draft: ChargeDraft, gateway: GatewayOption | null) {
  return {
    gateway: gateway
      ? {
          id: gateway.id,
          name: gateway.name,
          status: gateway.statusLabel
        }
      : null,
    customer: {
      name: displayFieldValue(draft.name),
      phone: displayFieldValue(draft.phone),
      email: displayFieldValue(draft.email),
      document: displayFieldValue(draft.document)
    },
    address: Object.fromEntries(Object.entries(draft.address).map(([key, value]) => [key, displayFieldValue(value)])),
    charge: {
      product: displayFieldValue(draft.product),
      amountBRL: displayFieldValue(draft.amount)
    },
    tracking: Object.fromEntries(Object.entries(draft.tracking).filter(([, value]) => typeof value === "string" && value.trim()))
  };
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

"use client";

import { Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ConversationRecord, PaymentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type OfferOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type PaymentOption = Pick<PaymentRecord, "id" | "provider" | "providerPaymentId" | "status" | "amount" | "customerName" | "offerName">;

type LinkPreview = {
  conversation: ConversationRecord;
  offers: OfferOption[];
  payments: PaymentOption[];
};

type LinkForm = {
  name: string;
  phone: string;
  email: string;
  document: string;
  offerId: string;
  paymentId: string;
};

export function InboxLinkPanel({
  conversation,
  open,
  onClose,
  onLinked
}: {
  conversation: ConversationRecord;
  open: boolean;
  onClose: () => void;
  onLinked: (conversation: ConversationRecord) => void;
}) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [form, setForm] = useState<LinkForm>(() => buildInitialForm(conversation));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessage(null);
    fetch(`/api/inbox/link?conversationId=${encodeURIComponent(conversation.id)}`)
      .then((response) => response.json().then((json) => ({ response, json })))
      .then(({ response, json }) => {
        if (cancelled) return;
        if (!response.ok) {
          setError(json.error ?? "Nao foi possivel carregar dados de vinculo.");
          return;
        }
        const nextPreview = json as LinkPreview & { ok: boolean };
        setPreview(nextPreview);
        setForm(buildInitialForm(nextPreview.conversation));
      })
      .catch(() => {
        if (!cancelled) setError("Nao foi possivel conectar ao PayFlow.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation.id, open]);

  const selectedPayment = useMemo(
    () => preview?.payments.find((payment) => payment.id === form.paymentId) ?? null,
    [form.paymentId, preview?.payments]
  );

  if (!open) return null;

  async function submit() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/inbox/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversation.id,
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          document: form.document || null
        },
        offerId: form.offerId || null,
        paymentId: form.paymentId || null
      })
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string; conversation?: ConversationRecord };
    setSaving(false);
    if (!response.ok || !json.conversation) {
      setError(json.error ?? "Nao foi possivel vincular.");
      return;
    }
    onLinked(json.conversation);
    setMessage("Conversa vinculada com sucesso.");
  }

  return (
    <section className="border-b border-border/80 bg-blue-50/45 p-4">
      <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-inner-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-label">Vincular conversa</p>
            <h3 className="mt-1 text-lg font-extrabold">Cliente, oferta e cobranca</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Use este bloco para organizar a conversa sem disparar nenhuma automacao.
            </p>
          </div>
          <button className="btn-secondary px-3" type="button" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
            Fechar
          </button>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-border/80 bg-slate-50 p-3 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando dados de vinculo...
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

        {!loading ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Field label="Telefone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field label="E-mail" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Field label="CPF/CNPJ" value={form.document} onChange={(value) => setForm((current) => ({ ...current, document: value }))} />

              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                Oferta
                <select className="field" value={form.offerId} onChange={(event) => setForm((current) => ({ ...current, offerId: event.target.value }))}>
                  <option value="">Sem oferta vinculada</option>
                  {preview?.offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                Cobranca
                <select className="field" value={form.paymentId} onChange={(event) => setForm((current) => ({ ...current, paymentId: event.target.value }))}>
                  <option value="">Sem cobranca vinculada</option>
                  {preview?.payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.provider} - {formatCurrency(payment.amount)} - {payment.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <aside className="rounded-lg border border-border/70 bg-slate-50/80 p-4">
              <p className="section-label">Resumo</p>
              <h4 className="mt-1 font-extrabold">O que sera registrado</h4>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                <li>Cliente sera criado ou atualizado pelo telefone informado.</li>
                <li>Atendente logado fica responsavel pela conversa.</li>
                <li>Historico recebe uma nota interna do vinculo.</li>
                {selectedPayment ? <li>Cobranca selecionada sera associada ao cliente e a conversa.</li> : null}
              </ul>
              <button
                className={cn("btn-primary mt-4 w-full", saving && "opacity-70")}
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={submit}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Salvando..." : "Salvar vinculo"}
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function buildInitialForm(conversation: ConversationRecord): LinkForm {
  return {
    name: conversation.customerName || "",
    phone: conversation.customerPhone || "",
    email: "",
    document: "",
    offerId: conversation.linkedOfferId || "",
    paymentId: conversation.linkedPaymentId || ""
  };
}

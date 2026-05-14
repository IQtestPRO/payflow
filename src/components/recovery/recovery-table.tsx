"use client";

import { Link2, Loader2, MessageCircle, QrCode, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RecoveryStatusBadge } from "@/components/recovery/recovery-status-badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { PaymentRecord, RecoveryAttemptRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type ManualArtifact = "pix_copy_paste" | "qr_code" | "checkout_url";

type ManualSendResponse = {
  ok?: boolean;
  error?: string;
  attempt?: RecoveryAttemptRecord;
};

export function RecoveryTable({ payments, initialAttempts }: { payments: PaymentRecord[]; initialAttempts: RecoveryAttemptRecord[] }) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const [message, setMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const pending = payments.filter((payment) => ["PENDING", "WAITING_PAYMENT", "PIX_GENERATED", "BOLETO_GENERATED", "FAILED", "EXPIRED"].includes(payment.status));

  async function sendManual(payment: PaymentRecord, artifact: ManualArtifact) {
    setMessage(null);
    const actionId = `${payment.id}:${artifact}`;
    setActiveAction(actionId);

    try {
      const response = await fetch("/api/recovery/manual-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, artifact })
      });
      const json = (await response.json().catch(() => ({}))) as ManualSendResponse;
      if (!response.ok || !json.attempt) throw new Error(json.error ?? "Nao foi possivel enviar a recuperacao.");
      setAttempts((current) => [...current, json.attempt as RecoveryAttemptRecord]);
      setMessage(labelForArtifact(artifact) + " enviado na conversa do cliente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel enviar a recuperacao.");
    } finally {
      setActiveAction(null);
    }
  }

  async function markLost(paymentId: string) {
    setMessage(null);
    setActiveAction(`${paymentId}:lost`);
    const response = await fetch("/api/recovery/mark-lost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });
    const json = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Pagamento marcado como perdido para recuperacao." : json.error ?? "Nao foi possivel marcar como perdido.");
    if (response.ok) {
      setAttempts((current) => current.map((attempt) => (attempt.paymentId === paymentId && attempt.status === "SCHEDULED" ? { ...attempt, status: "CANCELLED" } : attempt)));
    }
    setActiveAction(null);
  }

  if (!pending.length) {
    return (
      <EmptyState
        title="Nenhum pagamento pendente para recuperar"
        description="Quando uma cobranca real ficar pendente, ela aparece aqui para envio manual de Pix copia e cola, QR Code ou link de pagamento pelo WhatsApp."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-800">{message}</p> : null}
      <DataTable headers={["Cliente", "Oferta", "Gateway", "Valor", "Status", "Gerado", "Tentativas", "Acoes"]}>
        {pending.map((payment) => {
          const paymentAttempts = attempts.filter((attempt) => attempt.paymentId === payment.id);
          const sentAttempts = paymentAttempts.filter((attempt) => attempt.status === "SENT").length;
          return (
            <tr key={payment.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold">{payment.customerName ?? "Cliente sem nome"}</p>
                <p className="text-xs text-muted-foreground">{payment.customerPhone ?? "sem WhatsApp"}</p>
              </td>
              <td className="px-4 py-3">{payment.offerName ?? "-"}</td>
              <td className="px-4 py-3">
                <span className="rounded-md border border-border/70 bg-slate-50 px-2 py-1 text-xs font-extrabold">{gatewayLabel(payment.provider)}</span>
              </td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(payment.amount, payment.currency)}</td>
              <td className="px-4 py-3">
                <RecoveryStatusBadge status={payment.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</td>
              <td className="px-4 py-3 tabular-nums">{sentAttempts}/{paymentAttempts.length}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <ManualButton
                    label="Pix"
                    icon={MessageCircle}
                    disabled={!payment.pixCode}
                    loading={activeAction === `${payment.id}:pix_copy_paste`}
                    onClick={() => sendManual(payment, "pix_copy_paste")}
                  />
                  <ManualButton
                    label="QR Code"
                    icon={QrCode}
                    disabled={!payment.pixCode}
                    loading={activeAction === `${payment.id}:qr_code`}
                    onClick={() => sendManual(payment, "qr_code")}
                  />
                  <ManualButton
                    label="Link"
                    icon={Link2}
                    disabled={!payment.checkoutUrl}
                    loading={activeAction === `${payment.id}:checkout_url`}
                    onClick={() => sendManual(payment, "checkout_url")}
                  />
                  <button className="btn-secondary px-3" type="button" disabled={activeAction === `${payment.id}:lost`} onClick={() => markLost(payment.id)}>
                    {activeAction === `${payment.id}:lost` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    Perdido
                  </button>
                  <Link className="btn-secondary px-3" href="/inbox">Abrir conversa</Link>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

function ManualButton({
  label,
  icon: Icon,
  disabled,
  loading,
  onClick
}: {
  label: string;
  icon: typeof MessageCircle;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={cn("btn-secondary px-3", disabled && "opacity-55")} type="button" disabled={disabled || loading} onClick={onClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );
}

function labelForArtifact(artifact: ManualArtifact) {
  if (artifact === "qr_code") return "QR Code";
  if (artifact === "checkout_url") return "Link de pagamento";
  return "Pix copia e cola";
}

function gatewayLabel(provider: PaymentRecord["provider"]) {
  const labels: Record<PaymentRecord["provider"], string> = {
    UMBRELLA: "Umbrella",
    TRIBOPAY: "TriboPay",
    MANGOFY: "Mangofy",
    SIGILOPAY: "SigiloPay",
    LYTRONPAY: "LytronPay",
    ALLOWPAYMENTS: "AllowPayments",
    MOCK: "Mock"
  };
  return labels[provider] ?? provider;
}

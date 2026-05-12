"use client";

import { MessageCircle, PauseCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { RecoveryStatusBadge } from "@/components/recovery/recovery-status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { PaymentRecord, RecoveryAttemptRecord } from "@/lib/types";

export function RecoveryTable({ payments, initialAttempts }: { payments: PaymentRecord[]; initialAttempts: RecoveryAttemptRecord[] }) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const [message, setMessage] = useState<string | null>(null);
  const pending = payments.filter((payment) => ["PENDING", "WAITING_PAYMENT", "PIX_GENERATED", "BOLETO_GENERATED", "FAILED", "EXPIRED"].includes(payment.status));

  async function action(endpoint: string, paymentId: string) {
    setMessage(null);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });
    const json = await response.json();
    setMessage(response.ok ? "Ação realizada com sucesso." : json.error ?? "Não foi possível concluir.");
    if (endpoint.includes("pause") || endpoint.includes("mark-lost")) {
      setAttempts((current) => current.map((attempt) => (attempt.paymentId === paymentId && attempt.status === "SCHEDULED" ? { ...attempt, status: "CANCELLED" } : attempt)));
    }
  }

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800">{message}</p> : null}
      <DataTable headers={["Cliente", "Oferta", "Valor", "Status", "Gerado", "Tentativas", "Próxima", "Ações"]}>
        {pending.map((payment) => {
          const paymentAttempts = attempts.filter((attempt) => attempt.paymentId === payment.id);
          const nextAttempt = paymentAttempts.find((attempt) => attempt.status === "SCHEDULED");
          return (
            <tr key={payment.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold">{payment.customerName ?? "Cliente sem nome"}</p>
                <p className="text-xs text-muted-foreground">{payment.customerPhone ?? "sem WhatsApp"}</p>
              </td>
              <td className="px-4 py-3">{payment.offerName ?? "-"}</td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(payment.amount)}</td>
              <td className="px-4 py-3"><RecoveryStatusBadge status={payment.status} /></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</td>
              <td className="px-4 py-3 tabular-nums">{paymentAttempts.filter((attempt) => attempt.status === "SENT").length}/{paymentAttempts.length}</td>
              <td className="px-4 py-3 text-xs">{nextAttempt ? timeAgo(nextAttempt.scheduledAt) : "sem tentativa"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary px-3" type="button" onClick={() => action("/api/recovery/send-now", payment.id)}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Enviar agora
                  </button>
                  <button className="btn-secondary px-3" type="button" onClick={() => action("/api/recovery/pause", payment.id)}>
                    <PauseCircle className="h-4 w-4" aria-hidden="true" />
                    Pausar
                  </button>
                  <button className="btn-secondary px-3" type="button" onClick={() => action("/api/recovery/mark-lost", payment.id)}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
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

import { AlertCircle, CheckCircle2, Clock, PauseCircle, Radio, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const toneByStatus: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONNECTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BUYER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RECOVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_SERVICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  WAITING_CUSTOMER: "bg-cyan-50 text-cyan-700 border-cyan-200",
  UNANSWERED: "bg-amber-50 text-amber-700 border-amber-200",
  PAYMENT_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
  PIX_GENERATED: "bg-amber-50 text-amber-700 border-amber-200",
  BOLETO_GENERATED: "bg-amber-50 text-amber-700 border-amber-200",
  RECOVERY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MOCK: "bg-slate-50 text-slate-700 border-slate-200",
  PAUSED: "bg-slate-50 text-slate-700 border-slate-200",
  DISCONNECTED: "bg-slate-50 text-slate-700 border-slate-200",
  RESOLVED: "bg-slate-50 text-slate-700 border-slate-200",
  ARCHIVED: "bg-slate-50 text-slate-700 border-slate-200",
  REFUNDED: "bg-slate-50 text-slate-700 border-slate-200",
  ERROR: "bg-red-50 text-red-700 border-red-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  CHARGEBACK: "bg-red-50 text-red-700 border-red-200",
  LOST: "bg-red-50 text-red-700 border-red-200"
};

const labelByStatus: Record<string, string> = {
  ACTIVE: "Ativo",
  CONNECTED: "Conectado",
  PAID: "Pago",
  SENT: "Enviado",
  CONVERTED: "Convertido",
  BUYER: "Comprador",
  RECOVERED: "Recuperado",
  OPEN: "Aberta",
  NEW: "Novo",
  SCHEDULED: "Agendado",
  IN_SERVICE: "Em atendimento",
  UNANSWERED: "Nao respondida",
  WAITING_CUSTOMER: "Aguardando cliente",
  PAYMENT_PENDING: "Pagamento pendente",
  PENDING: "Pendente",
  WAITING_PAYMENT: "Aguardando pagamento",
  PIX_GENERATED: "Pix gerado",
  BOLETO_GENERATED: "Boleto gerado",
  RECOVERY: "Recuperacao",
  MOCK: "Mock",
  PAUSED: "Pausado",
  DISCONNECTED: "Desconectado",
  RESOLVED: "Resolvida",
  ARCHIVED: "Arquivado",
  ERROR: "Erro",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Chargeback",
  LOST: "Perdido"
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const Icon =
    status === "PAID" || status === "CONNECTED" || status === "ACTIVE"
      ? CheckCircle2
      : status === "FAILED" || status === "ERROR" || status === "EXPIRED" || status === "CANCELLED"
        ? XCircle
        : status === "PAUSED"
          ? PauseCircle
          : status === "SCHEDULED" || status === "PENDING"
            ? Clock
            : status === "UNANSWERED"
              ? AlertCircle
              : Radio;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal shadow-sm ring-1 ring-white/60", toneByStatus[status] ?? "bg-slate-50 text-slate-700 border-slate-200", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {labelByStatus[status] ?? status}
    </span>
  );
}

import { AlertCircle, CheckCircle2, Clock, PauseCircle, Radio, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const toneByStatus: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-900/5",
  CONNECTED: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-900/5",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-900/5",
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-900/5",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-900/5",
  OPEN: "bg-blue-50 text-blue-700 border-blue-200 shadow-blue-900/5",
  UNANSWERED: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  WAITING_CUSTOMER: "bg-slate-50 text-slate-700 border-slate-200 shadow-slate-900/5",
  PAYMENT_PENDING: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  RECOVERY: "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-900/5",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  WAITING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  PIX_GENERATED: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  BOLETO_GENERATED: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-900/5",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 shadow-blue-900/5",
  MOCK: "bg-violet-50 text-violet-700 border-violet-200 shadow-violet-900/5",
  PAUSED: "bg-slate-50 text-slate-700 border-slate-200 shadow-slate-900/5",
  DISCONNECTED: "bg-slate-50 text-slate-700 border-slate-200 shadow-slate-900/5",
  RESOLVED: "bg-slate-50 text-slate-700 border-slate-200 shadow-slate-900/5",
  ARCHIVED: "bg-slate-50 text-slate-700 border-slate-200 shadow-slate-900/5",
  ERROR: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5",
  FAILED: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5",
  EXPIRED: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5",
  CHARGEBACK: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5",
  LOST: "bg-red-50 text-red-700 border-red-200 shadow-red-900/5"
};

const labelByStatus: Record<string, string> = {
  ACTIVE: "Ativo",
  CONNECTED: "Conectado",
  PAID: "Pago",
  SENT: "Enviado",
  CONVERTED: "Convertido",
  OPEN: "Aberta",
  UNANSWERED: "Não respondida",
  WAITING_CUSTOMER: "Aguardando cliente",
  PAYMENT_PENDING: "Pagamento pendente",
  RECOVERY: "Recuperação",
  PENDING: "Pendente",
  WAITING_PAYMENT: "Aguardando pagamento",
  PIX_GENERATED: "Pix gerado",
  BOLETO_GENERATED: "Boleto gerado",
  SCHEDULED: "Agendado",
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
  NEW: "Novo",
  IN_SERVICE: "Em atendimento",
  BUYER: "Comprador",
  RECOVERED: "Recuperado",
  LOST: "Perdido"
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const Icon = status === "PAID" || status === "CONNECTED" ? CheckCircle2 : status === "FAILED" || status === "ERROR" ? XCircle : status === "PAUSED" ? PauseCircle : status === "SCHEDULED" ? Clock : status === "UNANSWERED" ? AlertCircle : Radio;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm", toneByStatus[status] ?? "bg-slate-50 text-slate-700 border-slate-200", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {labelByStatus[status] ?? status}
    </span>
  );
}

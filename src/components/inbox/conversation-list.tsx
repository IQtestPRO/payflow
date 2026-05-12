"use client";

import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo } from "@/lib/format";
import type { ConversationRecord, ConversationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: Array<{ label: string; value: "ALL" | ConversationStatus }> = [
  { label: "Todas", value: "ALL" },
  { label: "Abertas", value: "OPEN" },
  { label: "Não respondidas", value: "UNANSWERED" },
  { label: "Aguardando cliente", value: "WAITING_CUSTOMER" },
  { label: "Resolvidas", value: "RESOLVED" },
  { label: "Pagamento pendente", value: "PAYMENT_PENDING" },
  { label: "Recuperações", value: "RECOVERY" }
];

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilter,
  search,
  onSearch
}: {
  conversations: ConversationRecord[];
  selectedId?: string;
  onSelect: (conversation: ConversationRecord) => void;
  filter: "ALL" | ConversationStatus;
  onFilter: (filter: "ALL" | ConversationStatus) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <aside className="data-panel flex min-h-[680px] flex-col overflow-hidden">
      <div className="border-b border-border/80 bg-white/[0.96] p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="section-label">Fila WhatsApp</p>
            <h2 className="mt-1 text-lg font-extrabold">Atendimento ativo</h2>
          </div>
          <span className="rounded-md border border-border/80 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-muted-foreground">{conversations.length}</span>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input className="field pl-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar nome, telefone, tag ou status" />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              className={cn(
                "min-h-10 shrink-0 rounded-md border px-3 text-xs font-bold shadow-sm transition duration-200",
                filter === item.value ? "border-primary bg-primary text-primary-foreground shadow-blue-900/10" : "border-border/80 bg-white/90 text-muted-foreground hover:border-primary/25 hover:text-primary"
              )}
              onClick={() => onFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/40">
        {conversations.length ? (
          conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={cn(
                "block w-full border-b border-border/70 p-4 text-left transition duration-200 hover:bg-blue-50/50 focus-visible:ring-2 focus-visible:ring-primary/30",
                selectedId === conversation.id ? "bg-white shadow-[inset_0_0_0_1px_rgb(9_103_255/0.22)]" : "bg-white/[0.78]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{conversation.customerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{conversation.customerPhone}</p>
                </div>
                <StatusBadge status={conversation.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{conversation.messages.at(-1)?.body ?? "Sem mensagens"}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{conversation.tags.join(", ") || "sem tags"}</span>
                <span className="shrink-0 font-semibold">{timeAgo(conversation.lastMessageAt)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="p-5 text-sm font-medium leading-6 text-muted-foreground">Nenhuma conversa corresponde ao filtro atual.</div>
        )}
      </div>
    </aside>
  );
}

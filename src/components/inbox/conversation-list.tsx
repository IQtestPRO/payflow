"use client";

import { Search } from "lucide-react";
import type { ConversationRecord, ConversationStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { timeAgo } from "@/lib/format";
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
    <aside className="surface flex min-h-[680px] flex-col overflow-hidden">
      <div className="border-b border-border/80 bg-gradient-to-br from-white to-blue-50/40 p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            className="field pl-9"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar nome, telefone, tag ou status"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
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

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            type="button"
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={cn(
              "block w-full border-b border-border/70 p-4 text-left transition duration-200 hover:bg-blue-50/50 focus-visible:ring-2 focus-visible:ring-primary/30",
              selectedId === conversation.id ? "bg-blue-50/90 shadow-[inset_3px_0_0_#0967FF]" : "bg-white/80"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{conversation.customerName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{conversation.customerPhone}</p>
              </div>
              <StatusBadge status={conversation.status} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{conversation.messages.at(-1)?.body ?? "Sem mensagens"}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{conversation.tags.join(", ") || "sem tags"}</span>
              <span>{timeAgo(conversation.lastMessageAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

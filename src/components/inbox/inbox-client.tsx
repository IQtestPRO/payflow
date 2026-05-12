"use client";

import { CheckCircle2, CreditCard, Link2, Send, Tag, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConversationRecord, ConversationStatus, MessageRecord } from "@/lib/types";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function InboxClient({ initialConversations }: { initialConversations: ConversationRecord[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id);
  const [filter, setFilter] = useState<"ALL" | ConversationStatus>("ALL");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return conversations.filter((conversation) => {
      const matchesFilter = filter === "ALL" || conversation.status === filter;
      const matchesSearch =
        !query ||
        [conversation.customerName, conversation.customerPhone, conversation.status, conversation.tags.join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, filter, search]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? filtered[0];

  async function send() {
    if (!selected || !body.trim()) return;
    setSending(true);
    setError(null);

    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected.id, body })
    });
    const json = (await response.json()) as { message?: MessageRecord; error?: string };
    setSending(false);

    if (!response.ok || !json.message) {
      setError(json.error ?? "Não foi possível enviar.");
      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              status: "WAITING_CUSTOMER",
              lastMessageAt: json.message?.createdAt,
              messages: [...conversation.messages, json.message as MessageRecord]
            }
          : conversation
      )
    );
    setBody("");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <ConversationList
        conversations={filtered}
        selectedId={selected?.id}
        onSelect={(conversation) => setSelectedId(conversation.id)}
        filter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
      />

      <section className="surface flex min-h-[680px] flex-col overflow-hidden">
        {selected ? (
          <>
            <header className="border-b border-border/80 bg-gradient-to-br from-white to-blue-50/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{selected.customerName}</h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.customerPhone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary px-3" type="button"><CreditCard className="h-4 w-4" aria-hidden="true" />Cobrança</button>
                  <button className="btn-secondary px-3" type="button"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Resolver</button>
                  <button className="btn-secondary px-3" type="button"><Link2 className="h-4 w-4" aria-hidden="true" />Vincular</button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {tag}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <UserRound className="h-3 w-3" aria-hidden="true" />
                  {selected.assignedToName ?? "Sem atendente"}
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,251,255,0.85),rgba(241,246,253,0.9))] p-4">
              {selected.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            <footer className="border-t border-border/80 bg-white/95 p-4 backdrop-blur">
              {error ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  className="field min-h-24 resize-none py-3"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Digite sua resposta pelo WhatsApp"
                />
                <button type="button" onClick={send} className={cn("btn-primary md:self-end", sending && "opacity-70")} disabled={sending || !body.trim()}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Enviar
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">Nenhuma conversa encontrada.</div>
        )}
      </section>
    </div>
  );
}

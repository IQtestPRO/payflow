"use client";

import { CheckCircle2, CreditCard, Link2, RefreshCcw, Send, Tag, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ConversationRecord, ConversationStatus, MessageRecord } from "@/lib/types";
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
  const priority = selected ? priorityForStatus(selected.status) : null;

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selected || !body.trim()) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, body: body.trim() })
      });
      const json = (await response.json().catch(() => ({}))) as { message?: MessageRecord; error?: string };

      if (!response.ok || !json.message) {
        const staleConversation = json.error?.includes("Conversa");
        setError(staleConversation ? "Essa conversa ficou desatualizada. Recarregue a inbox e tente responder novamente." : json.error ?? "Não foi possível enviar.");
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
    } catch {
      setError("Não foi possível conectar ao servidor. Recarregue a inbox e tente novamente.");
    } finally {
      setSending(false);
    }
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

      <section className="data-panel flex min-h-[680px] flex-col overflow-hidden">
        {selected ? (
          <>
            <header className="border-b border-border/80 bg-white/[0.96] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold">{selected.customerName}</h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.customerPhone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary px-3" type="button">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Cobrança
                  </button>
                  <button className="btn-secondary px-3" type="button">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Resolver
                  </button>
                  <button className="btn-secondary px-3" type="button">
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    Vincular
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-border/80 bg-slate-50/80 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-normal text-muted-foreground">Prioridade</p>
                  <p className="mt-1 text-sm font-extrabold text-foreground">{priority}</p>
                </div>
                <div className="rounded-md border border-border/80 bg-slate-50/80 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-normal text-muted-foreground">Origem</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-foreground">{selected.tags[0] ?? "WhatsApp"}</p>
                </div>
                <div className="rounded-md border border-border/80 bg-slate-50/80 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-normal text-muted-foreground">Atendente</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-foreground">{selected.assignedToName ?? "Sem atendente"}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {tag}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <UserRound className="h-3 w-3" aria-hidden="true" />
                  {selected.assignedToName ?? "Sem atendente"}
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,251,255,0.86),rgba(239,246,253,0.92))] p-4">
              {selected.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            <footer className="border-t border-border/80 bg-white/[0.96] p-4 backdrop-blur">
              {error ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
              <form onSubmit={send} className="grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea className="field min-h-24 resize-none py-3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite sua resposta pelo WhatsApp" />
                <button type="submit" className={cn("btn-primary min-w-32 md:self-end", sending && "opacity-70")} disabled={sending} aria-busy={sending}>
                  {sending ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState title="Nenhuma conversa encontrada" description="Quando uma mensagem chegar pelo WhatsApp, ela aparece aqui com status, histórico e opção de resposta." framed={false} />
          </div>
        )}
      </section>
    </div>
  );
}

function priorityForStatus(status: ConversationStatus) {
  if (status === "UNANSWERED") return "Responder agora";
  if (status === "PAYMENT_PENDING" || status === "RECOVERY") return "Recuperar receita";
  if (status === "WAITING_CUSTOMER") return "Acompanhar retorno";
  if (status === "RESOLVED") return "Resolvida";
  return "Monitorar";
}

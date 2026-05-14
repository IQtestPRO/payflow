import { CheckCircle2, Link2 } from "lucide-react";
import { InboxClient } from "@/components/inbox/inbox-client";
import { PageHeader } from "@/components/ui/page-header";
import { getInboxSnapshot } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

const linkIdeas = [
  "Vincular conversa a cliente, oferta, cobranca, LP ou campanha.",
  "Criar cliente real usando nome, telefone, CPF e endereco captados no chat.",
  "Associar a conversa a um atendente para controle de responsavel."
];

const resolveIdeas = [
  "Marcar atendimento como resolvido e registrar usuario, data e hora.",
  "Mover conversa para historico e liberar a fila principal.",
  "Reabrir automaticamente se o cliente enviar nova mensagem."
];

export default async function InboxPage() {
  const user = await getCurrentUser();
  const conversations = await getInboxSnapshot(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Inbox WhatsApp"
        description="Central de atendimento com conversas reais do WhatsApp, tags, status, cobrancas e historico por atendente."
      />
      <InboxClient initialConversations={conversations} />
      <section className="grid gap-4 lg:grid-cols-2">
        <InboxDecisionCard icon={Link2} title="Vincular: proposta aguardando aprovacao" items={linkIdeas} />
        <InboxDecisionCard icon={CheckCircle2} title="Resolver: proposta aguardando aprovacao" items={resolveIdeas} />
      </section>
    </div>
  );
}

function InboxDecisionCard({ icon: Icon, title, items }: { icon: typeof Link2; title: string; items: string[] }) {
  return (
    <article className="data-panel p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="section-label">Sem logica nova ainda</p>
          <h2 className="mt-1 text-base font-extrabold">{title}</h2>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

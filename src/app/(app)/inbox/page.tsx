import { InboxClient } from "@/components/inbox/inbox-client";
import { PageHeader } from "@/components/ui/page-header";
import { getInboxSnapshot } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function InboxPage() {
  const user = await getCurrentUser();
  const conversations = await getInboxSnapshot(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Inbox WhatsApp"
        description="Central de atendimento com conversas reais do WhatsApp, cobrancas, vinculos operacionais e historico por atendente."
      />
      <InboxClient initialConversations={conversations} />
    </div>
  );
}

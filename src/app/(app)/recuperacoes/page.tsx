import { RecoveryTable } from "@/components/recovery/recovery-table";
import { PageHeader } from "@/components/ui/page-header";
import { listPayments, listRecoveryAttempts } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function RecoveriesPage() {
  const user = await getCurrentUser();
  const [payments, attempts] = await Promise.all([listPayments(user?.workspaceId), listRecoveryAttempts(user?.workspaceId)]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Recuperações"
        description="Pipeline de pagamentos gerados e não finalizados, com tentativas por WhatsApp, opt-out e bloqueio de horário."
      />
      <RecoveryTable payments={payments} initialAttempts={attempts} />
    </div>
  );
}

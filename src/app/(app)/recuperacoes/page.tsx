import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { RecoveryTable } from "@/components/recovery/recovery-table";
import { PageHeader } from "@/components/ui/page-header";
import { listPayments, listRecoveryAttempts } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function RecoveriesPage() {
  const user = await getCurrentUser();
  const [payments, attempts] = await Promise.all([listPayments(user?.workspaceId), listRecoveryAttempts(user?.workspaceId)]);
  const whatsapp = integrationBrands.WHATSAPP;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Recuperacoes"
        description="Pagamentos gerados e nao finalizados, com tentativas por WhatsApp, opt-out e bloqueio de horario."
        actions={<IntegrationLogo src={whatsapp.asset} alt={whatsapp.assetAlt} icon={whatsapp.fallbackIcon} />}
      />
      <RecoveryTable payments={payments} initialAttempts={attempts} />
    </div>
  );
}

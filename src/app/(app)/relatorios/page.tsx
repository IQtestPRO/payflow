import { ReportsTable } from "@/components/reports/reports-table";
import { PageHeader } from "@/components/ui/page-header";
import { getReportRows } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const rows = await getReportRows(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Relatórios"
        description="Receita, abandono, recuperação, conversões por origem UTM, campanhas por ROAS e exportação CSV básica."
      />
      <ReportsTable rows={rows} />
    </div>
  );
}

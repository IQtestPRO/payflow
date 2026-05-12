import { CustomersTable } from "@/components/customers/customers-table";
import { PageHeader } from "@/components/ui/page-header";
import { listCustomers } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const customers = await listCustomers(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader title="Clientes" description="Cadastro comercial com origem, tags, histórico operacional e opt-out para respeitar privacidade." />
      <CustomersTable initialCustomers={customers} />
    </div>
  );
}

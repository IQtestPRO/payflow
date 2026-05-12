import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import { listPayments } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  const payments = await listPayments(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader title="Pagamentos" description="Histórico de transações recebidas via Umbrella/UmbrellaPag, status e links de checkout." />
      <DataTable headers={["Cliente", "Oferta", "Valor", "Método", "Status", "Criado", "Provider"]}>
        {payments.map((payment) => (
          <tr key={payment.id} className="hover:bg-muted/50">
            <td className="px-4 py-3">
              <p className="font-semibold">{payment.customerName ?? "Cliente sem nome"}</p>
              <p className="text-xs text-muted-foreground">{payment.customerPhone ?? "sem WhatsApp"}</p>
            </td>
            <td className="px-4 py-3">{payment.offerName ?? "-"}</td>
            <td className="px-4 py-3 tabular-nums">{formatCurrency(payment.amount, payment.currency)}</td>
            <td className="px-4 py-3">{payment.paymentMethod ?? "-"}</td>
            <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</td>
            <td className="px-4 py-3 text-xs">{payment.providerPaymentId}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

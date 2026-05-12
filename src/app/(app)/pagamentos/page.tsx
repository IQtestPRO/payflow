import { IntegrationLogo, integrationBrands } from "@/components/integrations/integration-brand";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import { listPayments } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  const payments = await listPayments(user?.workspaceId);
  const umbrella = integrationBrands.UMBRELLA;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pagamentos"
        description="Transacoes recebidas via UmbrellaPag, status de checkout, Pix, boleto e links usados em recuperacao."
        actions={<IntegrationLogo src={umbrella.asset} alt={umbrella.assetAlt} icon={umbrella.fallbackIcon} />}
      />
      <DataTable headers={["Cliente", "Oferta", "Valor", "Metodo", "Status", "Criado", "Provider"]}>
        {payments.map((payment) => (
          <tr key={payment.id} className="hover:bg-muted/50">
            <td className="px-4 py-3">
              <p className="font-semibold">{payment.customerName ?? "Cliente sem nome"}</p>
              <p className="text-xs text-muted-foreground">{payment.customerPhone ?? "sem WhatsApp"}</p>
            </td>
            <td className="px-4 py-3">{payment.offerName ?? "-"}</td>
            <td className="px-4 py-3 tabular-nums">{formatCurrency(payment.amount, payment.currency)}</td>
            <td className="px-4 py-3">{payment.paymentMethod ?? "-"}</td>
            <td className="px-4 py-3">
              <StatusBadge status={payment.status} />
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</td>
            <td className="px-4 py-3 font-mono text-xs">{payment.providerPaymentId}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

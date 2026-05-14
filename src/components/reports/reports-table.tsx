import { Download } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import type { ReportRow } from "@/lib/types";

export function ReportsTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="grid gap-4">
      <div className="toolbar grid gap-3 md:grid-cols-4">
        <input className="field" type="date" aria-label="Data inicial" />
        <input className="field" type="date" aria-label="Data final" />
        <select className="field" aria-label="Status de pagamento" defaultValue="">
          <option value="">Todos os status</option>
          <option value="PAID">Pago</option>
          <option value="PENDING">Pendente</option>
          <option value="EXPIRED">Expirado</option>
        </select>
        <a className="btn-primary" href="/api/reports/export">
          <Download className="h-4 w-4" aria-hidden="true" />
          Exportar CSV
        </a>
      </div>

      {rows.length ? (
        <DataTable headers={["Grupo", "Receita", "Abandono", "Recuperacao", "Conversoes"]}>
          {rows.map((row) => (
            <tr key={row.group} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-semibold">{row.group}</td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-3 tabular-nums">{row.abandonments}</td>
              <td className="px-4 py-3 tabular-nums">{row.recoveries}</td>
              <td className="px-4 py-3 tabular-nums">{row.conversions}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="MusclePrime Brasil ainda sem dados reais" description="Os relatorios ficam vazios ate a oferta receber pagamentos, UTMs e eventos reais." />
      )}
    </div>
  );
}

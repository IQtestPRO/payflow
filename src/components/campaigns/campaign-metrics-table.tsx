import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CampaignRecord } from "@/lib/types";

export function CampaignMetricsTable({ campaigns }: { campaigns: CampaignRecord[] }) {
  return (
    <DataTable headers={["Campanha", "Plataforma", "Gasto", "Cliques", "CTR", "CPC", "Receita", "CPA", "ROAS", "Status"]}>
      {campaigns.map((campaign) => (
        <tr key={campaign.id} className="hover:bg-muted/50">
          <td className="px-4 py-3">
            <p className="font-semibold">{campaign.name}</p>
            <p className="text-xs text-muted-foreground">{campaign.objective}</p>
          </td>
          <td className="px-4 py-3">{campaign.provider}</td>
          <td className="px-4 py-3 tabular-nums">{formatCurrency(campaign.spend)}</td>
          <td className="px-4 py-3 tabular-nums">{formatNumber(campaign.clicks)}</td>
          <td className="px-4 py-3 tabular-nums">{campaign.ctr.toFixed(2)}%</td>
          <td className="px-4 py-3 tabular-nums">{formatCurrency(campaign.cpc)}</td>
          <td className="px-4 py-3 tabular-nums">{formatCurrency(campaign.revenue)}</td>
          <td className="px-4 py-3 tabular-nums">{formatCurrency(campaign.cpa)}</td>
          <td className="px-4 py-3 font-semibold tabular-nums">{campaign.roas.toFixed(2)}x</td>
          <td className="px-4 py-3"><StatusBadge status={campaign.status} /></td>
        </tr>
      ))}
    </DataTable>
  );
}

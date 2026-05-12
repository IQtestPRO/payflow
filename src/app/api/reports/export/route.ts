import { getReportRows } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const rows = await getReportRows(auth.user.workspaceId);
  const header = ["grupo", "receita", "abandonos", "recuperacoes", "conversoes"];
  const csv = [header.join(","), ...rows.map((row) => [row.group, row.revenue, row.abandonments, row.recoveries, row.conversions].join(","))].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=payflow-relatorio.csv"
    }
  });
}

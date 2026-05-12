"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CustomerRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function CustomersTable({ initialCustomers }: { initialCustomers: CustomerRecord[] }) {
  const [customers, setCustomers] = useState(initialCustomers);

  async function anonymize(id: string) {
    const response = await fetch(`/api/customers/${id}/anonymize`, { method: "POST" });
    const json = (await response.json()) as CustomerRecord;
    if (response.ok) setCustomers((current) => current.map((customer) => (customer.id === id ? json : customer)));
  }

  return (
    <DataTable headers={["Cliente", "Contato", "Origem", "Última oferta", "Compras", "Status", "LGPD"]}>
      {customers.map((customer) => (
        <tr key={customer.id} className="hover:bg-muted/50">
          <td className="px-4 py-3">
            <p className="font-semibold">{customer.name}</p>
            <p className="text-xs text-muted-foreground">{customer.tags.join(", ") || "sem tags"}</p>
          </td>
          <td className="px-4 py-3">
            <p>{customer.phone ?? "sem telefone"}</p>
            <p className="text-xs text-muted-foreground">{customer.email ?? "sem e-mail"}</p>
          </td>
          <td className="px-4 py-3">{customer.source ?? "-"}</td>
          <td className="px-4 py-3">{customer.lastOffer ?? "-"}</td>
          <td className="px-4 py-3 tabular-nums">{customer.totalPurchases} · {formatCurrency(customer.totalPurchases * 197)}</td>
          <td className="px-4 py-3"><StatusBadge status={customer.status} /></td>
          <td className="px-4 py-3">
            <button className="btn-secondary px-3" type="button" onClick={() => anonymize(customer.id)}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Anonimizar
            </button>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

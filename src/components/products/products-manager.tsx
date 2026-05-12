"use client";

import { Archive, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import type { ProductRecord } from "@/lib/types";

export function ProductsManager({ initialProducts }: { initialProducts: ProductRecord[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);

  async function create(formData: FormData) {
    setError(null);
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        price: formData.get("price"),
        category: formData.get("category"),
        status: "ACTIVE"
      })
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Erro ao criar produto");
      return;
    }
    setProducts((current) => [json as ProductRecord, ...current]);
  }

  async function patch(id: string, status: ProductRecord["status"]) {
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const json = (await response.json()) as ProductRecord;
    if (response.ok) setProducts((current) => current.map((product) => (product.id === id ? json : product)));
  }

  async function archive(id: string) {
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = (await response.json()) as ProductRecord;
    if (response.ok) setProducts((current) => current.map((product) => (product.id === id ? json : product)));
  }

  return (
    <div className="grid gap-4">
      <form action={create} className="surface grid gap-3 p-4 lg:grid-cols-[1fr_1fr_120px_160px_auto]">
        <input className="field" name="name" placeholder="Nome do produto" required />
        <input className="field" name="description" placeholder="Descrição curta" />
        <input className="field" name="price" type="number" step="0.01" placeholder="Preço" required />
        <input className="field" name="category" placeholder="Categoria" />
        <button className="btn-primary" type="submit"><Plus className="h-4 w-4" aria-hidden="true" />Criar</button>
      </form>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
      <DataTable headers={["Produto", "Categoria", "Preço", "Status", "Ações"]}>
        {products.map((product) => (
          <tr key={product.id} className="hover:bg-muted/50">
            <td className="px-4 py-3">
              <p className="font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.description}</p>
            </td>
            <td className="px-4 py-3">{product.category}</td>
            <td className="px-4 py-3 tabular-nums">{formatCurrency(product.price)}</td>
            <td className="px-4 py-3"><StatusBadge status={product.status} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button className="btn-secondary px-3" type="button" onClick={() => patch(product.id, product.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {product.status === "ACTIVE" ? "Pausar" : "Ativar"}
                </button>
                <button className="btn-secondary px-3" type="button" onClick={() => archive(product.id)}>
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Arquivar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

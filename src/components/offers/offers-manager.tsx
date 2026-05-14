"use client";

import { Archive, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import type { OfferRecord } from "@/lib/types";

export function OffersManager({ initialOffers }: { initialOffers: OfferRecord[] }) {
  const [offers, setOffers] = useState(initialOffers);
  const [error, setError] = useState<string | null>(null);

  async function create(formData: FormData) {
    setError(null);
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        productId: null,
        price: formData.get("price"),
        salesPageUrl: formData.get("salesPageUrl"),
        checkoutUrl: formData.get("checkoutUrl"),
        status: "ACTIVE",
        tags,
        trafficSourceDefault: formData.get("trafficSourceDefault"),
        defaultUtmSource: formData.get("defaultUtmSource"),
        defaultUtmMedium: formData.get("defaultUtmMedium"),
        defaultUtmCampaign: formData.get("defaultUtmCampaign")
      })
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Erro ao criar oferta");
      return;
    }
    setOffers((current) => [json as OfferRecord, ...current].filter((offer) => offer.slug === "muscleprime-brasil" || offer.name.toLowerCase() === "muscleprime brasil"));
  }

  async function patch(id: string, status: OfferRecord["status"]) {
    const response = await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const json = (await response.json()) as OfferRecord;
    if (response.ok) setOffers((current) => current.map((offer) => (offer.id === id ? json : offer)));
  }

  async function archive(id: string) {
    const response = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    const json = (await response.json()) as OfferRecord;
    if (response.ok) setOffers((current) => current.map((offer) => (offer.id === id ? json : offer)));
  }

  return (
    <div className="grid gap-4">
      <form action={create} className="toolbar grid gap-3 xl:grid-cols-4">
        <input className="field" name="name" placeholder="Nome da oferta" defaultValue="MusclePrime Brasil" required />
        <input className="field" name="price" type="number" step="0.01" placeholder="Preco base" required />
        <input className="field" name="tags" placeholder="Tags separadas por virgula" />
        <input className="field" name="salesPageUrl" placeholder="URL da LP multiproduto" />
        <input className="field" name="checkoutUrl" placeholder="URL do checkout" />
        <input className="field" name="trafficSourceDefault" placeholder="Origem padrao" defaultValue="Meta Ads" />
        <input className="field" name="defaultUtmSource" placeholder="UTM source" defaultValue="meta" />
        <input className="field" name="defaultUtmMedium" placeholder="UTM medium" defaultValue="cpc" />
        <input className="field" name="defaultUtmCampaign" placeholder="UTM campaign" />
        <button className="btn-primary xl:col-span-3" type="submit">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Criar/registrar oferta
        </button>
      </form>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      {offers.length ? (
        <DataTable headers={["Oferta", "LP multiproduto", "Preco base", "Funil", "Metricas", "Status", "Acoes"]}>
          {offers.map((offer) => (
            <tr key={offer.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold">{offer.name}</p>
                <p className="text-xs text-muted-foreground">/{offer.slug}</p>
              </td>
              <td className="px-4 py-3">
                {offer.salesPageUrl ? (
                  <a className="font-semibold text-primary hover:underline" href={offer.salesPageUrl} target="_blank" rel="noreferrer">
                    Abrir LP
                  </a>
                ) : (
                  "LP nao informada"
                )}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(offer.price)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{offer.defaultUtmSource ?? "-"}/{offer.defaultUtmCampaign ?? "-"}</td>
              <td className="px-4 py-3 text-xs tabular-nums">
                {offer.visits} visitas / {offer.paymentsApproved} pagas / {offer.abandonments} abandono
              </td>
              <td className="px-4 py-3"><StatusBadge status={offer.status} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className="btn-secondary px-3" type="button" onClick={() => patch(offer.id, offer.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {offer.status === "ACTIVE" ? "Pausar" : "Ativar"}
                  </button>
                  <button className="btn-secondary px-3" type="button" onClick={() => archive(offer.id)}>
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Arquivar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          title="MusclePrime Brasil ainda nao foi registrada"
          description="Crie a oferta operacional para receber UTMs, pagamentos e tracking sem depender de cadastro de produto unico."
        />
      )}
    </div>
  );
}

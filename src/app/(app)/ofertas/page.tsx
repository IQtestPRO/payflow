import { OffersManager } from "@/components/offers/offers-manager";
import { PageHeader } from "@/components/ui/page-header";
import { listOffers } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function OffersPage() {
  const user = await getCurrentUser();
  const offers = (await listOffers(user?.workspaceId)).filter((offer) => offer.slug === "muscleprime-brasil" || offer.name.toLowerCase() === "muscleprime brasil");

  return (
    <div className="grid gap-6">
      <PageHeader title="Ofertas" description="Gerencie LPs multiproduto, checkout, tags, UTMs e metricas agregadas de abandono e recuperacao." />
      <OffersManager initialOffers={offers} />
    </div>
  );
}

import { OffersManager } from "@/components/offers/offers-manager";
import { PageHeader } from "@/components/ui/page-header";
import { listOffers, listProducts } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function OffersPage() {
  const user = await getCurrentUser();
  const [offers, products] = await Promise.all([listOffers(user?.workspaceId), listProducts(user?.workspaceId)]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Ofertas" description="Gerencie páginas, checkout, preço, tags, UTMs e métricas agregadas de abandono e recuperação." />
      <OffersManager initialOffers={offers} products={products} />
    </div>
  );
}

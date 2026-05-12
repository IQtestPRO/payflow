import { ProductsManager } from "@/components/products/products-manager";
import { PageHeader } from "@/components/ui/page-header";
import { listProducts } from "@/server/repositories/payflow-repository";
import { getCurrentUser } from "@/server/services/auth";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  const products = await listProducts(user?.workspaceId);

  return (
    <div className="grid gap-6">
      <PageHeader title="Produtos" description="Cadastro base dos produtos que podem ser vinculados a uma ou mais ofertas." />
      <ProductsManager initialProducts={products} />
    </div>
  );
}

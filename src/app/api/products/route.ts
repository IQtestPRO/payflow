import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";
import { productSchema } from "@/server/validation/schemas";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await listProducts(auth.user.workspaceId));
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Produto inválido" }, { status: 422 });
  return NextResponse.json(await createProduct(parsed.data, auth.user.workspaceId));
}

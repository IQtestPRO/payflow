import { NextResponse } from "next/server";
import { archiveProduct, updateProduct } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";
import { productSchema } from "@/server/validation/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = productSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Produto inválido" }, { status: 422 });
  return NextResponse.json(await updateProduct(id, parsed.data, auth.user.workspaceId));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  return NextResponse.json(await archiveProduct(id, auth.user.workspaceId));
}

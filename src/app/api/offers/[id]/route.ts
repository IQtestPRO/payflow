import { NextResponse } from "next/server";
import { archiveOffer, updateOffer } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";
import { offerSchema } from "@/server/validation/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = offerSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Oferta inválida" }, { status: 422 });
  return NextResponse.json(await updateOffer(id, parsed.data, auth.user.workspaceId));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  return NextResponse.json(await archiveOffer(id, auth.user.workspaceId));
}

import { NextResponse } from "next/server";
import { createOffer, listOffers } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";
import { offerSchema } from "@/server/validation/schemas";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await listOffers(auth.user.workspaceId));
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = offerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Oferta inválida" }, { status: 422 });
  return NextResponse.json(await createOffer(parsed.data, auth.user.workspaceId));
}

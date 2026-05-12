import { NextResponse } from "next/server";
import { anonymizeCustomer } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  return NextResponse.json(await anonymizeCustomer(id, auth.user.workspaceId));
}

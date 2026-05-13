import { NextResponse } from "next/server";
import { getPaymentGatewayAdapter } from "@/server/gateways/adapters";
import type { GatewayId } from "@/server/gateways/registry";
import { requireApiUser } from "@/server/services/api-auth";

const gatewayIds: GatewayId[] = ["umbrella", "tribopay", "mangofy", "sigilopay", "lytronpay", "allowpayments"];

type RouteContext = {
  params: Promise<{
    gateway: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { gateway: rawGateway } = await context.params;
  const gateway = normalizeGatewayId(rawGateway);
  if (!gateway) return NextResponse.json({ error: "Gateway invalido" }, { status: 404 });

  const adapter = getPaymentGatewayAdapter(gateway);
  const shouldTest = new URL(request.url).searchParams.get("test") === "1";
  const test = shouldTest && adapter.validateCredentials ? await safeValidate(() => adapter.validateCredentials?.(undefined) ?? Promise.resolve(false)) : null;

  return NextResponse.json({
    gateway,
    configured: adapter.isConfigured(),
    docsStatus: adapter.getDocs().docsStatus,
    status: adapter.getDocs().status,
    test
  });
}

function normalizeGatewayId(value: string): GatewayId | null {
  return gatewayIds.includes(value as GatewayId) ? (value as GatewayId) : null;
}

async function safeValidate(validate: () => Promise<boolean>) {
  try {
    return { ok: await validate() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha ao validar gateway" };
  }
}

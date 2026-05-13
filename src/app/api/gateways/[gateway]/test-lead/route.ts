import { NextResponse } from "next/server";
import { z } from "zod";
import type { PaymentStatus } from "@/lib/types";
import { getPaymentGatewayAdapter } from "@/server/gateways/adapters";
import type { GatewayId } from "@/server/gateways/registry";
import { createOrUpdateCustomer, upsertPayment } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";

const gatewayIds: GatewayId[] = ["umbrella", "tribopay", "mangofy", "sigilopay", "lytronpay", "allowpayments"];

const leadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length >= 10 && value.length <= 15, "Telefone invalido"),
  email: z.string().trim().email().max(160),
  document: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 11, "CPF invalido")
});

const schema = z.object({
  amount: z.coerce.number().positive().max(100000),
  itemTitle: z.string().trim().min(2).max(160),
  lead: leadSchema
});

type RouteContext = {
  params: Promise<{
    gateway: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { gateway: rawGateway } = await context.params;
  const gateway = normalizeGatewayId(rawGateway);
  if (!gateway) return NextResponse.json({ error: "Gateway invalido" }, { status: 404 });

  const adapter = getPaymentGatewayAdapter(gateway);
  if (!adapter.isConfigured()) {
    return NextResponse.json({ error: "Gateway ainda nao configurado no ambiente do servidor." }, { status: 409 });
  }

  if (gateway !== "lytronpay") {
    return NextResponse.json({ error: "Lead teste operacional ainda nao esta implementado para este gateway." }, { status: 501 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados reais do lead, item e valor sao obrigatorios para gerar o teste." }, { status: 422 });
  }

  const { amount, itemTitle, lead } = parsed.data;
  const payload = {
    amount,
    description: itemTitle,
    customer: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      document: {
        type: "cpf" as const,
        number: lead.document
      }
    }
  };

  try {
    const rawTransaction = await adapter.createTransaction?.(payload);
    const transaction = extractLytronTransaction(rawTransaction, amount);
    if (!transaction.id) throw new Error("LytronPay nao retornou TXID para o Pix gerado.");

    const customer = await createOrUpdateCustomer(
      {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        document: lead.document,
        source: "gateway-test-lytronpay",
        status: "PAYMENT_PENDING"
      },
      auth.user.workspaceId
    );

    const payment = await upsertPayment(
      {
        workspaceId: auth.user.workspaceId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        offerId: null,
        provider: "LYTRONPAY",
        providerPaymentId: transaction.id,
        status: mapLytronStatus(transaction.status, Boolean(transaction.pixCode)),
        amount: transaction.amount ?? amount,
        currency: "BRL",
        paymentMethod: "PIX",
        checkoutUrl: null,
        pixCode: transaction.pixCode,
        boletoUrl: null,
        paidAt: null,
        expiresAt: transaction.expiresAt
      },
      auth.user.workspaceId
    );

    return NextResponse.json({ ok: true, gateway, transaction, customer: { id: customer.id }, payment: { id: payment.id } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao gerar lead teste no gateway." },
      { status: 422 }
    );
  }
}

function normalizeGatewayId(value: string): GatewayId | null {
  return gatewayIds.includes(value as GatewayId) ? (value as GatewayId) : null;
}

function extractLytronTransaction(response: unknown, fallbackAmount: number) {
  const root = isRecord(response) ? response : {};
  const data = isRecord(root.data) ? root.data : root;
  const pixCode =
    stringValue(read(data, "copyPaste")) ??
    stringValue(read(data, "qrcode")) ??
    stringValue(read(data, "qrCode")) ??
    stringValue(read(data, "brCode"));

  return {
    id: stringValue(read(data, "txid")) ?? stringValue(read(data, "id")),
    status: stringValue(read(data, "status")),
    amount: numberValue(read(data, "amount")) ?? fallbackAmount,
    pixCode,
    qrcode: stringValue(read(data, "qrcode")) ?? stringValue(read(data, "qrCode")),
    copyPaste: stringValue(read(data, "copyPaste")) ?? pixCode,
    expiresAt: isoDateValue(read(data, "expiresAt") ?? read(data, "expires_at"))
  };
}

function mapLytronStatus(status: string | null, hasPixCode: boolean): PaymentStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "paid" || normalized === "approved" || normalized === "completed") return "PAID";
  if (normalized === "expired") return "EXPIRED";
  if (normalized === "cancelled" || normalized === "canceled") return "CANCELLED";
  if (normalized === "failed" || normalized === "rejected") return "FAILED";
  return hasPixCode ? "PIX_GENERATED" : "PENDING";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function read(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDateValue(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

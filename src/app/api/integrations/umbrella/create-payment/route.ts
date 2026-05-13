import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { requireApiUser } from "@/server/services/api-auth";
import { processUmbrellaWebhookPayload } from "@/server/services/webhooks";

const paymentMethodSchema = z.enum(["PIX", "BOLETO"]);

const addressSchema = z.object({
  street: z.string().trim().min(2).max(180),
  streetNumber: z.string().trim().min(1).max(40),
  complement: z.string().trim().max(120).optional().or(z.literal("")),
  zipCode: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 8, "CEP invalido"),
  neighborhood: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{2}$/.test(value), "UF invalida"),
  country: z.string().trim().default("BR")
});

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
    .refine((value) => value.length === 11 || value.length === 14, "CPF/CNPJ invalido"),
  address: addressSchema
});

const trackingSchema = z.object({
  offerId: z.string().trim().min(1).max(120).optional().nullable(),
  offerSlug: z.string().trim().min(1).max(160).optional().nullable(),
  clickId: z.string().trim().min(1).max(160).optional().nullable(),
  fbclid: z.string().trim().min(1).max(500).optional().nullable(),
  utmSource: z.string().trim().max(160).optional().nullable(),
  utmMedium: z.string().trim().max(160).optional().nullable(),
  utmCampaign: z.string().trim().max(260).optional().nullable(),
  utmContent: z.string().trim().max(260).optional().nullable(),
  utmTerm: z.string().trim().max(260).optional().nullable()
});

const schema = z.object({
  amount: z.coerce.number().positive().max(100000),
  itemTitle: z.string().trim().min(2).max(160),
  paymentMethod: paymentMethodSchema.default("PIX"),
  lead: leadSchema,
  tracking: trackingSchema.optional()
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados reais do lead, endereco, item e valor sao obrigatorios para gerar pagamento Umbrella." }, { status: 422 });
  }

  const { amount, itemTitle, lead, paymentMethod, tracking } = parsed.data;
  const amountInCents = Math.round(amount * 100);
  const externalRef = `payflow-${Date.now()}`;
  const provider = new UmbrellaProvider();
  const postbackUrl = `${appUrl().replace(/\/$/, "")}/api/webhooks/umbrella`;

  try {
    const umbrellaResponse = await provider.createTransaction({
      amount: amountInCents,
      currency: "BRL",
      paymentMethod,
      installments: 1,
      customer: {
        name: lead.name,
        email: lead.email,
        document: {
          number: lead.document,
          type: lead.document.length === 14 ? "CNPJ" : "CPF"
        },
        phone: lead.phone,
        externalRef,
        address: {
          street: lead.address.street,
          streetNumber: lead.address.streetNumber,
          complement: lead.address.complement || undefined,
          zipCode: lead.address.zipCode,
          neighborhood: lead.address.neighborhood,
          city: lead.address.city,
          state: lead.address.state,
          country: lead.address.country || "BR"
        }
      },
      items: [
        {
          title: itemTitle,
          unitPrice: amountInCents,
          quantity: 1,
          tangible: false,
          externalRef: tracking?.offerSlug || "payflow-item"
        }
      ],
      pix: paymentMethod === "PIX" ? { expiresInDays: 1 } : undefined,
      boleto: paymentMethod === "BOLETO" ? { expiresInDays: 3 } : undefined,
      postbackUrl,
      metadata: JSON.stringify({
        source: "payflow",
        workspaceId: auth.user.workspaceId,
        externalRef,
        offerId: tracking?.offerId || null,
        offerSlug: tracking?.offerSlug || null,
        clickId: tracking?.clickId || null,
        fbclid: tracking?.fbclid || null,
        utm: tracking
          ? {
              source: tracking.utmSource || null,
              medium: tracking.utmMedium || null,
              campaign: tracking.utmCampaign || null,
              content: tracking.utmContent || null,
              term: tracking.utmTerm || null
            }
          : null
      }),
      traceable: true,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
    });

    const transactionPayload = extractTransactionPayload(umbrellaResponse);
    const result = await processUmbrellaWebhookPayload(transactionPayload, auth.user.workspaceId);
    const transaction = extractTransactionSummary(umbrellaResponse);

    return NextResponse.json({ ok: true, transaction, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao gerar pagamento Umbrella" },
      { status: 422 }
    );
  }
}

function extractTransactionSummary(response: unknown) {
  const data = extractTransactionPayload(response);
  return {
    id: stringValue(data.id),
    status: stringValue(data.status),
    paymentMethod: stringValue(data.paymentMethod),
    secureUrl: stringValue(data.secureUrl),
    payUrl: stringValue(data.payUrl),
    webUrl: stringValue(data.webUrl),
    appUrl: stringValue(data.appUrl),
    qrCode: stringValue(data.qrCode),
    boletoUrl: isRecord(data.boleto) ? stringValue(data.boleto.url) : null
  };
}

function extractTransactionPayload(response: unknown) {
  const root = isRecord(response) ? response : {};
  return isRecord(root.data) ? root.data : root;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

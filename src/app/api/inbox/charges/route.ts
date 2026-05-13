import { NextResponse } from "next/server";
import { z } from "zod";
import { inboxChargeGatewayIds, createInboxCharge } from "@/server/services/inbox-charges";
import { requireApiUser } from "@/server/services/api-auth";

const notFound = z.literal("Não encontrado");

const trackingSchema = z.object({
  offerId: z.string().trim().max(160).optional().nullable(),
  offerSlug: z.string().trim().max(180).optional().nullable(),
  clickId: z.string().trim().max(180).optional().nullable(),
  fbclid: z.string().trim().max(500).optional().nullable(),
  source: z.string().trim().max(160).optional().nullable(),
  medium: z.string().trim().max(160).optional().nullable(),
  campaign: z.string().trim().max(260).optional().nullable(),
  content: z.string().trim().max(260).optional().nullable(),
  term: z.string().trim().max(260).optional().nullable(),
  src: z.string().trim().max(260).optional().nullable(),
  sck: z.string().trim().max(260).optional().nullable()
});

const draftSchema = z.object({
  name: z.string().trim().min(1).max(160).or(notFound),
  phone: z.string().trim().min(1).max(30).or(notFound),
  email: z.string().trim().min(1).max(180).or(notFound),
  document: z.string().trim().min(1).max(30).or(notFound),
  address: z.object({
    zipCode: z.string().trim().min(0).max(20),
    street: z.string().trim().min(0).max(180),
    streetNumber: z.string().trim().min(0).max(40),
    neighborhood: z.string().trim().min(0).max(120),
    complement: z.string().trim().max(120).optional().default(""),
    city: z.string().trim().min(0).max(120),
    state: z.string().trim().min(0).max(2)
  }),
  product: z.string().trim().min(1).max(180).or(notFound),
  amount: z.string().trim().min(1).max(40).or(notFound),
  tracking: trackingSchema.default({}),
  fieldState: z
    .record(z.object({ found: z.boolean(), source: z.enum(["customer", "offer", "chat", "fallback", "manual"]) }))
    .default({})
});

const schema = z.object({
  conversationId: z.string().trim().min(1),
  gateway: z.enum(inboxChargeGatewayIds),
  draft: draftSchema
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.role === "VIEWER") return NextResponse.json({ error: "Usuario sem permissao para gerar cobrancas." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados da cobranca antes de gerar o Pix." }, { status: 422 });

  try {
    const result = await createInboxCharge(parsed.data, auth.user.workspaceId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao gerar cobranca." }, { status: 422 });
  }
}

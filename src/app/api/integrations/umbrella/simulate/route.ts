import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { processUmbrellaWebhookPayload } from "@/server/services/webhooks";
import { requireApiUser } from "@/server/services/api-auth";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length >= 10 && value.length <= 15, "Telefone do lead invalido"),
  email: z.string().trim().email().max(160),
  document: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .optional()
});

const schema = z.object({
  type: z.enum(["pending", "paid", "failed", "expired"]).default("pending"),
  externalId: z.string().min(3).max(120).optional(),
  lead: leadSchema
});

type LeadInput = z.infer<typeof leadSchema>;

const statusByType = {
  pending: "pix_generated",
  paid: "paid",
  failed: "failed",
  expired: "expired"
} as const;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe nome, telefone e email reais do lead para testar a Umbrella." }, { status: 422 });
  }

  const payload = buildSimulationPayload(parsed.data.type, parsed.data.lead, parsed.data.externalId);

  try {
    const result = await processUmbrellaWebhookPayload(payload, auth.user.workspaceId);
    return NextResponse.json({ ok: true, payload, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao simular webhook Umbrella" },
      { status: 422 }
    );
  }
}

function buildSimulationPayload(type: z.infer<typeof schema>["type"], lead: LeadInput, externalId?: string) {
  const id = externalId || `umb-sim-${type}-${Date.now()}`;
  const now = new Date().toISOString();
  const document = lead.document ? { number: lead.document, type: lead.document.length > 11 ? "cnpj" : "cpf" } : undefined;

  return {
    data: {
      id,
      status: statusByType[type],
      amount: 29700,
      currency: "BRL",
      paymentMethod: "PIX",
      secureUrl: `https://checkout.umbrellapag.com/${id}`,
      postbackUrl: `${appUrl().replace(/\/$/, "")}/api/webhooks/umbrella`,
      pix: {
        qrCode: "00020101021226880014br.gov.bcb.pix2566pay-flow.shop/simulacao-umbrella"
      },
      metadata: JSON.stringify({
        linkId: "offer-02",
        orderId: id,
        source: "payflow-simulation"
      }),
      customer: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        document
      },
      items: [
        {
          title: "Kit Funil WhatsApp",
          quantity: 1,
          unitPrice: 29700
        }
      ],
      createdAt: now,
      paidAt: type === "paid" ? now : null
    }
  };
}

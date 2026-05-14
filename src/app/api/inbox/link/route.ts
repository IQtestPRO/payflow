import { NextResponse } from "next/server";
import { z } from "zod";
import { getInboxSnapshot, linkConversationContext, listOffers, listPayments } from "@/server/repositories/payflow-repository";
import { requireApiUser } from "@/server/services/api-auth";

const postSchema = z.object({
  conversationId: z.string().trim().min(1),
  customer: z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().max(180).optional().nullable(),
    document: z.string().trim().max(30).optional().nullable()
  }),
  offerId: z.string().trim().min(1).optional().nullable(),
  paymentId: z.string().trim().min(1).optional().nullable()
});

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Informe a conversa." }, { status: 422 });

  const [conversations, offers, payments] = await Promise.all([
    getInboxSnapshot(auth.user.workspaceId),
    listOffers(auth.user.workspaceId),
    listPayments(auth.user.workspaceId)
  ]);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversa nao encontrada." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    conversation,
    offers: offers.map((offer) => ({ id: offer.id, name: offer.name, slug: offer.slug, status: offer.status })),
    payments: payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      status: payment.status,
      amount: payment.amount,
      customerName: payment.customerName,
      offerName: payment.offerName
    }))
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.role === "VIEWER") return NextResponse.json({ error: "Usuario sem permissao para vincular conversas." }, { status: 403 });

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados antes de vincular." }, { status: 422 });

  try {
    const conversation = await linkConversationContext(
      {
        ...parsed.data,
        actor: { id: auth.user.sub, name: auth.user.name }
      },
      auth.user.workspaceId
    );
    return NextResponse.json({ ok: true, conversation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao vincular conversa." }, { status: 400 });
  }
}

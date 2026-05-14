import { z } from "zod";

export const offerSchema = z.object({
  name: z.string().min(2).max(160),
  productId: z.string().optional().nullable(),
  price: z.coerce.number().positive(),
  salesPageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  checkoutUrl: z.string().url().optional().or(z.literal("")).nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  tags: z.array(z.string()).default([]),
  trafficSourceDefault: z.string().optional().nullable(),
  defaultUtmSource: z.string().optional().nullable(),
  defaultUtmMedium: z.string().optional().nullable(),
  defaultUtmCampaign: z.string().optional().nullable()
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(1).max(4000)
});

export const whatsappWebhookSchema = z
  .object({
    object: z.string().optional(),
    entry: z.array(z.unknown()).optional(),
    phone: z.string().optional(),
    from: z.string().optional(),
    name: z.string().optional(),
    text: z.string().optional(),
    body: z.string().optional(),
    messageId: z.string().optional(),
    eventType: z.string().optional()
  })
  .passthrough();

export const umbrellaWebhookSchema = z
  .object({
    id: z.string().optional(),
    transaction_id: z.string().optional(),
    transactionId: z.string().optional(),
    payment_id: z.string().optional(),
    paymentId: z.string().optional(),
    externalRef: z.string().optional().nullable(),
    status: z.string().optional(),
    amount: z.coerce.number().nonnegative().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    amount_total: z.coerce.number().nonnegative().optional(),
    value_cents: z.coerce.number().nonnegative().optional(),
    currency: z.string().default("BRL"),
    payment_method: z.string().optional(),
    paymentMethod: z.string().optional(),
    checkout_url: z.string().optional(),
    checkoutUrl: z.string().optional(),
    secureUrl: z.string().optional().nullable(),
    postbackUrl: z.string().optional().nullable(),
    pix_code: z.string().optional(),
    pixCode: z.string().optional(),
    boleto_url: z.string().optional(),
    boletoUrl: z.string().optional(),
    expires_at: z.string().optional(),
    expiresAt: z.string().optional(),
    paid_at: z.string().optional(),
    paidAt: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    metadata: z.unknown().optional(),
    pix: z.unknown().optional(),
    boleto: z.unknown().optional(),
    items: z.array(z.unknown()).optional(),
    data: z.unknown().optional(),
    payload: z.unknown().optional(),
    transaction: z.unknown().optional(),
    customer: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        document: z
          .union([
            z.string(),
            z.object({
              number: z.string().optional(),
              type: z.string().optional()
            }).passthrough()
          ])
          .optional()
      })
      .passthrough()
      .optional(),
    offer: z
      .object({
        id: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional()
      })
      .optional()
  })
  .passthrough();

export const triboPayWebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    hash: z.union([z.string(), z.number()]).optional(),
    transaction_hash: z.union([z.string(), z.number()]).optional(),
    transactionHash: z.union([z.string(), z.number()]).optional(),
    transaction_id: z.union([z.string(), z.number()]).optional(),
    transactionId: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    transaction_status: z.string().optional(),
    transactionStatus: z.string().optional(),
    amount: z.coerce.number().nonnegative().optional(),
    total_amount: z.coerce.number().nonnegative().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    value: z.coerce.number().nonnegative().optional(),
    currency: z.string().default("BRL"),
    payment_method: z.string().optional(),
    paymentMethod: z.string().optional(),
    checkout_url: z.string().optional(),
    checkoutUrl: z.string().optional(),
    payment_url: z.string().optional(),
    pix_code: z.string().optional(),
    pixCode: z.string().optional(),
    qr_code: z.string().optional(),
    boleto_url: z.string().optional(),
    boletoUrl: z.string().optional(),
    billet_url: z.string().optional(),
    expires_at: z.string().optional(),
    expiresAt: z.string().optional(),
    paid_at: z.string().optional(),
    paidAt: z.string().optional(),
    postback_url: z.string().optional(),
    postbackUrl: z.string().optional(),
    tracking: z.unknown().optional(),
    metadata: z.unknown().optional(),
    pix: z.unknown().optional(),
    billet: z.unknown().optional(),
    boleto: z.unknown().optional(),
    customer: z.unknown().optional(),
    cart: z.array(z.unknown()).optional(),
    data: z.unknown().optional(),
    payload: z.unknown().optional(),
    transaction: z.unknown().optional()
  })
  .passthrough();

export const utmifyWebhookSchema = z
  .object({
    eventType: z.string().default("tracking_event"),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
    paymentId: z.string().optional(),
    offerId: z.string().optional(),
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    term: z.string().optional(),
    fbclid: z.string().optional(),
    clickId: z.string().optional()
  })
  .passthrough();

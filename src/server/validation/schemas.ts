import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(600).optional().nullable(),
  price: z.coerce.number().positive(),
  category: z.string().max(80).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE")
});

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
    payment_id: z.string().optional(),
    status: z.string(),
    amount: z.coerce.number().nonnegative(),
    currency: z.string().default("BRL"),
    payment_method: z.string().optional(),
    checkout_url: z.string().optional(),
    pix_code: z.string().optional(),
    boleto_url: z.string().optional(),
    expires_at: z.string().optional(),
    paid_at: z.string().optional(),
    customer: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        document: z.string().optional()
      })
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

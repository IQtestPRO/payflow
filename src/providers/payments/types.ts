import type { PaymentRecord } from "@/lib/types";

export type NormalizedPaymentWebhook = {
  eventType: string;
  externalId: string;
  payment: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">;
  customer: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
  };
  raw: unknown;
};

export interface PaymentProvider {
  name: string;
  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook;
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

export type NormalizedTrackingWebhook = {
  eventType: string;
  externalId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  paymentId?: string | null;
  offerId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  clickId?: string | null;
  raw: unknown;
};

export interface TrackingProvider {
  name: string;
  normalizeWebhook(payload: unknown): NormalizedTrackingWebhook;
  testConnection(): Promise<{ ok: boolean; status: string }>;
}

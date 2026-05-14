import { randomBytes } from "crypto";
import { getEvolutionConfig } from "@/providers/whatsapp/evolution";
import type { OfferRecord } from "@/lib/types";
import { slugify } from "@/lib/utils";

type TrackingParams = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  raw: Record<string, string>;
};

type EvolutionInstance = {
  ownerJid?: string | null;
  number?: string | null;
  connectionStatus?: string | null;
  name?: string | null;
};

const CLICK_CODE_MAX_SLUG_LENGTH = 12;

export function normalizePhoneNumber(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

export function trackingParamsFromSearch(searchParams: URLSearchParams): TrackingParams {
  const raw = Object.fromEntries(searchParams.entries());

  return {
    source: readSearchParam(searchParams, "utm_source"),
    medium: readSearchParam(searchParams, "utm_medium"),
    campaign: readSearchParam(searchParams, "utm_campaign"),
    content: readSearchParam(searchParams, "utm_content"),
    term: readSearchParam(searchParams, "utm_term"),
    fbclid: readSearchParam(searchParams, "fbclid"),
    gclid: readSearchParam(searchParams, "gclid"),
    ttclid: readSearchParam(searchParams, "ttclid"),
    raw
  };
}

export function buildTrackingClickId(offerSlug: string, entropy = randomBytes(3).toString("hex")) {
  const slugPart = slugify(offerSlug).replace(/-/g, "").toUpperCase().slice(0, CLICK_CODE_MAX_SLUG_LENGTH) || "OFERTA";
  return `PF-${slugPart}-${entropy.toUpperCase()}`;
}

export function buildWhatsAppTrackingMessage(input: {
  offerSlug: string;
  offer?: OfferRecord | null;
  clickId: string;
  params?: Pick<TrackingParams, "campaign" | "content">;
}) {
  const offerName = input.offer?.name?.trim() || humanizeSlug(input.offerSlug);

  return `Ola, tenho interesse em ${offerName}. Ref: ${input.clickId}.`;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) throw new Error("Numero de WhatsApp invalido");

  const url = new URL(`https://wa.me/${normalized}`);
  url.searchParams.set("text", message);
  return url.toString();
}

export async function resolveTrackingWhatsAppNumber() {
  const configured =
    process.env.WHATSAPP_REDIRECT_NUMBER ||
    process.env.WHATSAPP_PUBLIC_NUMBER ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.WHATSAPP_PHONE_NUMBER;
  const configuredNumber = normalizePhoneNumber(configured);
  if (configuredNumber) return configuredNumber;

  if (process.env.WHATSAPP_PROVIDER !== "evolution") return null;
  if (!process.env.EVOLUTION_API_BASE_URL || !process.env.EVOLUTION_API_KEY) return null;

  const evolution = getEvolutionConfig();
  const endpoint = new URL(`/instance/fetchInstances?instanceName=${encodeURIComponent(evolution.instanceName)}`, evolution.baseUrl);
  const response = await fetch(endpoint, {
    headers: {
      apikey: evolution.apiKey,
      "Content-Type": "application/json"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(3500)
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as unknown;
  const instances = normalizeEvolutionInstances(payload);
  const activeInstance = instances.find((item) => item.name === evolution.instanceName || item.connectionStatus === "open") ?? instances[0];
  const ownerJidNumber = normalizePhoneNumber(activeInstance?.ownerJid?.split("@")[0]);
  const directNumber = normalizePhoneNumber(activeInstance?.number);

  return ownerJidNumber || directNumber || null;
}

function normalizeEvolutionInstances(payload: unknown): EvolutionInstance[] {
  if (Array.isArray(payload)) return payload.filter(isRecord).map(mapEvolutionInstance);
  if (isRecord(payload)) {
    const instances = payload.instances ?? payload.data ?? payload.instance;
    if (Array.isArray(instances)) return instances.filter(isRecord).map(mapEvolutionInstance);
    if (isRecord(instances)) return [mapEvolutionInstance(instances)];
    return [mapEvolutionInstance(payload)];
  }

  return [];
}

function mapEvolutionInstance(value: Record<string, unknown>): EvolutionInstance {
  const nested = isRecord(value.instance) ? value.instance : value;

  return {
    ownerJid: readString(nested, "ownerJid") ?? readString(value, "ownerJid"),
    number: readString(nested, "number") ?? readString(value, "number"),
    connectionStatus: readString(nested, "connectionStatus") ?? readString(value, "connectionStatus"),
    name: readString(nested, "name") ?? readString(value, "name")
  };
}

function readSearchParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key)?.trim();
  return value || null;
}

function humanizeSlug(value: string) {
  const slug = slugify(value);
  if (!slug) return "esta oferta";

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

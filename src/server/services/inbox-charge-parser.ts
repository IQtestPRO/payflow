import type { ConversationRecord, CustomerRecord, OfferRecord } from "@/lib/types";

export const NOT_FOUND_LABEL = "Não encontrado";

export type InboxChargeFieldSource = "customer" | "offer" | "chat" | "fallback" | "manual";

export type InboxChargeFieldState = {
  found: boolean;
  source: InboxChargeFieldSource;
};

export type InboxChargeAddressDraft = {
  zipCode: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
};

export type InboxChargeTrackingDraft = {
  offerId?: string | null;
  offerSlug?: string | null;
  clickId?: string | null;
  fbclid?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  src?: string | null;
  sck?: string | null;
};

export type InboxChargeDraft = {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: InboxChargeAddressDraft;
  product: string;
  amount: string;
  tracking: InboxChargeTrackingDraft;
  fieldState: Record<string, InboxChargeFieldState>;
};

type Candidate = {
  value?: string | null;
  source: InboxChargeFieldSource;
};

export function buildInboxChargeDraft(input: {
  conversation: ConversationRecord;
  customer?: CustomerRecord | null;
  offer?: OfferRecord | null;
}): InboxChargeDraft {
  const messages = input.conversation.messages.map((message) => message.body).filter(Boolean);
  const text = messages.join("\n");
  const tracking = extractTrackingFromMessages(messages, input.offer);
  const address = extractAddressFromText(text);

  const name = chooseValue([
    { value: input.customer?.name, source: "customer" },
    { value: input.conversation.customerName, source: "customer" },
    { value: extractNameFromText(text), source: "chat" }
  ]);
  const phone = chooseValue([
    { value: input.customer?.phone, source: "customer" },
    { value: input.conversation.customerPhone, source: "customer" },
    { value: extractPhoneFromText(text), source: "chat" }
  ]);
  const email = chooseValue([{ value: input.customer?.email, source: "customer" }, { value: extractEmailFromText(text), source: "chat" }]);
  const document = chooseValue([{ value: input.customer?.document, source: "customer" }, { value: extractDocumentFromText(text), source: "chat" }]);
  const product = chooseValue([{ value: input.offer?.name, source: "offer" }, { value: extractProductFromText(text), source: "chat" }]);
  const amount = chooseValue([{ value: input.offer?.price ? formatAmount(input.offer.price) : null, source: "offer" }, { value: extractAmountFromText(text), source: "chat" }]);

  const draft: InboxChargeDraft = {
    name: name.value,
    phone: normalizePhoneForDraft(phone.value),
    email: email.value,
    document: normalizeDocumentForDraft(document.value),
    address: {
      zipCode: address.zipCode.value,
      street: address.street.value,
      streetNumber: address.streetNumber.value,
      neighborhood: address.neighborhood.value,
      complement: address.complement.value === NOT_FOUND_LABEL ? "" : address.complement.value,
      city: address.city.value,
      state: address.state.value,
    },
    product: product.value,
    amount: amount.value,
    tracking,
    fieldState: {
      name: fieldState(name),
      phone: fieldState(phone),
      email: fieldState(email),
      document: fieldState(document),
      "address.zipCode": fieldState(address.zipCode),
      "address.street": fieldState(address.street),
      "address.streetNumber": fieldState(address.streetNumber),
      "address.neighborhood": fieldState(address.neighborhood),
      "address.city": fieldState(address.city),
      "address.state": fieldState(address.state),
      product: fieldState(product),
      amount: fieldState(amount)
    }
  };

  return draft;
}

export function parseMoneyAmount(value?: string | number | null): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const raw = cleanValue(value);
  if (!raw || isNotFound(raw)) return null;

  const normalized = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function isNotFound(value?: string | null) {
  return cleanValue(value).toLowerCase() === NOT_FOUND_LABEL.toLowerCase();
}

export function normalizeDocument(value?: string | null) {
  return cleanValue(value).replace(/\D/g, "");
}

export function normalizePhone(value?: string | null) {
  return cleanValue(value).replace(/\D/g, "");
}

function chooseValue(candidates: Candidate[]) {
  const candidate = candidates.find((item) => cleanValue(item.value) && !isNotFound(item.value));
  if (!candidate) return { value: NOT_FOUND_LABEL, source: "fallback" as const };
  return { value: cleanValue(candidate.value), source: candidate.source };
}

function fieldState(candidate: { value: string; source: InboxChargeFieldSource }): InboxChargeFieldState {
  return {
    found: candidate.source !== "fallback" && !isNotFound(candidate.value),
    source: candidate.source
  };
}

function extractAddressFromText(text: string) {
  const zipCode = chooseValue([{ value: text.match(/\b\d{5}-?\d{3}\b/)?.[0], source: "chat" }]);
  const streetLine = text
    .split(/\r?\n|[,;]/)
    .map((line) => line.trim())
    .find((line) => /(?:rua|avenida|av\.?|alameda|travessa|estrada|rodovia)\s+/i.test(line));
  const streetNumber = chooseValue([
    { value: text.match(/\b(?:numero|n[uú]mero|nro|n\.?|num)\s*[:.-]?\s*(\d+[a-zA-Z]?)/i)?.[1], source: "chat" },
    { value: streetLine?.match(/,\s*(\d+[a-zA-Z]?)/)?.[1], source: "chat" }
  ]);

  return {
    zipCode,
    street: chooseValue([{ value: streetLine?.replace(/,\s*\d+[a-zA-Z]?.*$/, ""), source: "chat" }]),
    streetNumber,
    neighborhood: chooseValue([{ value: text.match(/\b(?:bairro)\s*[:.-]?\s*([^\n,;]+)/i)?.[1], source: "chat" }]),
    complement: chooseValue([{ value: text.match(/\b(?:complemento|apto|apartamento|bloco)\s*[:.-]?\s*([^\n,;]+)/i)?.[1], source: "chat" }]),
    city: chooseValue([{ value: text.match(/\b(?:cidade)\s*[:.-]?\s*([^\n,;]+)/i)?.[1], source: "chat" }]),
    state: chooseValue([{ value: text.match(/\b(?:uf|estado)\s*[:.-]?\s*([A-Za-z]{2})\b/i)?.[1]?.toUpperCase(), source: "chat" }])
  };
}

function extractTrackingFromMessages(messages: string[], offer?: OfferRecord | null): InboxChargeTrackingDraft {
  const tracking: InboxChargeTrackingDraft = {
    offerId: offer?.id ?? null,
    offerSlug: offer?.slug ?? null,
    source: offer?.defaultUtmSource ?? null,
    medium: offer?.defaultUtmMedium ?? null,
    campaign: offer?.defaultUtmCampaign ?? null
  };

  for (const message of messages) {
    const clickId = message.match(/\bPF-[A-Z0-9-]{6,}\b/i)?.[0];
    if (clickId && !tracking.clickId) tracking.clickId = clickId.toUpperCase();
    mergeTrackingFromText(tracking, message);

    for (const rawUrl of message.match(/https?:\/\/[^\s]+/gi) ?? []) {
      try {
        const url = new URL(rawUrl.replace(/[),.]+$/, ""));
        mergeTrackingFromSearchParams(tracking, url.searchParams);
      } catch {
        // Ignore malformed links pasted in chat.
      }
    }
  }

  return tracking;
}

function mergeTrackingFromText(tracking: InboxChargeTrackingDraft, text: string) {
  const pairs = text.match(/\b(?:utm_source|utm_medium|utm_campaign|utm_content|utm_term|fbclid|pf_click_id|clickId|src|sck)=([^\s&]+)/gi) ?? [];
  const params = new URLSearchParams();
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    params.set(key, rest.join("="));
  }
  mergeTrackingFromSearchParams(tracking, params);
}

function mergeTrackingFromSearchParams(tracking: InboxChargeTrackingDraft, params: URLSearchParams) {
  tracking.source = tracking.source ?? readParam(params, "utm_source");
  tracking.medium = tracking.medium ?? readParam(params, "utm_medium");
  tracking.campaign = tracking.campaign ?? readParam(params, "utm_campaign");
  tracking.content = tracking.content ?? readParam(params, "utm_content");
  tracking.term = tracking.term ?? readParam(params, "utm_term");
  tracking.fbclid = tracking.fbclid ?? readParam(params, "fbclid");
  tracking.clickId = tracking.clickId ?? readParam(params, "pf_click_id") ?? readParam(params, "clickId");
  tracking.src = tracking.src ?? readParam(params, "src");
  tracking.sck = tracking.sck ?? readParam(params, "sck");
}

function readParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || null;
}

function extractNameFromText(text: string) {
  return text.match(/\b(?:meu nome e|me chamo|sou o|sou a|nome)\s*[:.-]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s']{2,80})/i)?.[1];
}

function extractEmailFromText(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractDocumentFromText(text: string) {
  return text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/)?.[0] ?? text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)?.[0];
}

function extractPhoneFromText(text: string) {
  return text.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/)?.[0];
}

function extractAmountFromText(text: string) {
  const labelMatch = text.match(/\b(?:valor|pre[cç]o|preco|total|pix)\s*[:=-]?\s*(?:R\$\s*)?(\d{1,6}(?:\.\d{3})*(?:,\d{2})?|\d{1,6}(?:\.\d{2})?)/i);
  const explicitCurrencyMatch = text.match(/R\$\s*(\d{1,6}(?:\.\d{3})*(?:,\d{2})?|\d{1,6}(?:\.\d{2})?)/i);
  const amount = parseMoneyAmount(labelMatch?.[1] ?? explicitCurrencyMatch?.[0]);
  return amount ? formatAmount(amount) : null;
}

function extractProductFromText(text: string) {
  const explicit = text.match(/\b(?:produto|pedido|item|oferta|f[aá]rmaco|farmaco)\s*[:=-]\s*([^\n.]{2,120})/i)?.[1];
  if (explicit) return cleanProductCandidate(explicit);

  const interest = text.match(/\b(?:tenho interesse em|interesse em)\s+([^\n.]{2,100})/i)?.[1];
  return cleanProductCandidate(interest);
}

function cleanProductCandidate(value?: string | null) {
  const cleaned = cleanValue(value)
    .replace(/\b(?:codigo|valor|cpf|telefone|tracking|catalogo|cat[aá]logo)\b.*$/i, "")
    .trim();
  if (!cleaned || /atendimento\s+(?:pelo\s+)?whatsapp/i.test(cleaned)) return null;
  return cleaned;
}

function normalizeDocumentForDraft(value: string) {
  return isNotFound(value) ? value : normalizeDocument(value);
}

function normalizePhoneForDraft(value: string) {
  return isNotFound(value) ? value : normalizePhone(value);
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function cleanValue(value?: string | number | null) {
  return String(value ?? "").trim();
}

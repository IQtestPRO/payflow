import { NextResponse } from "next/server";
import { getWorkspaceId, listOffers, recordTrackingEvent } from "@/server/repositories/payflow-repository";
import {
  buildTrackingClickId,
  buildWhatsAppTrackingMessage,
  buildWhatsAppUrl,
  resolveTrackingWhatsAppNumber,
  trackingParamsFromSearch
} from "@/server/services/tracking-redirect";
import { sendMetaCapiEvent } from "@/server/services/meta-capi";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offerSlug = slugify(decodeURIComponent(slug)) || "oferta";
  const url = new URL(request.url);
  const trackingParams = trackingParamsFromSearch(url.searchParams);
  const clickId = trackingParams.raw.pf_click_id || buildTrackingClickId(offerSlug);
  const workspaceId = await getWorkspaceId();
  const offers = await listOffers(workspaceId);
  const offer = offers.find((item) => item.slug === offerSlug || item.slug === slug || item.id === slug) ?? null;
  const whatsappNumber = await resolveTrackingWhatsAppNumber();

  await recordTrackingEvent({
    workspaceId,
    offerId: offer?.id ?? null,
    source: trackingParams.source,
    medium: trackingParams.medium,
    campaign: trackingParams.campaign,
    content: trackingParams.content,
    term: trackingParams.term,
    fbclid: trackingParams.fbclid,
    clickId,
    eventType: "whatsapp_redirect_click",
    rawPayloadJson: {
      offerSlug,
      offerName: offer?.name ?? null,
      clickId,
      gclid: trackingParams.gclid,
      ttclid: trackingParams.ttclid,
      query: trackingParams.raw,
      referer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent")
    }
  });

  await sendMetaCapiEvent({
    eventName: "Contact",
    eventId: clickId,
    eventSourceUrl: url.toString(),
    request,
    fbclid: trackingParams.fbclid,
    customData: {
      content_name: offer?.name ?? offerSlug,
      content_category: "whatsapp_offer",
      currency: "BRL",
      offer_slug: offerSlug,
      utm_source: trackingParams.source,
      utm_medium: trackingParams.medium,
      utm_campaign: trackingParams.campaign,
      utm_content: trackingParams.content,
      utm_term: trackingParams.term
    }
  });

  if (!whatsappNumber) {
    return NextResponse.json(
      {
        error: "WhatsApp de destino nao configurado",
        action: "Configure WHATSAPP_REDIRECT_NUMBER ou mantenha a instancia Evolution conectada."
      },
      { status: 503 }
    );
  }

  const message = buildWhatsAppTrackingMessage({
    offerSlug,
    offer,
    clickId,
    params: trackingParams
  });

  return NextResponse.redirect(buildWhatsAppUrl(whatsappNumber, message), { status: 302 });
}

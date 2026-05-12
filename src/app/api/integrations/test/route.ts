import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdsProvider } from "@/providers/ads";
import { UmbrellaProvider } from "@/providers/payments/umbrella";
import { UtmifyProvider } from "@/providers/tracking/utmify";
import { getWhatsAppProvider } from "@/providers/whatsapp";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({ provider: z.enum(["WHATSAPP", "META_ADS", "UMBRELLA", "UTMIFY"]) });

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provider inválido" }, { status: 422 });

  const provider = parsed.data.provider;
  const result =
    provider === "WHATSAPP"
      ? await getWhatsAppProvider().testConnection()
      : provider === "META_ADS"
        ? await getAdsProvider().testConnection()
        : provider === "UMBRELLA"
          ? await new UmbrellaProvider().testConnection()
          : await new UtmifyProvider().testConnection();

  return NextResponse.json(result);
}

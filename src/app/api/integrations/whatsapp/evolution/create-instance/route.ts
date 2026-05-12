import { NextResponse } from "next/server";
import { EvolutionWhatsAppProvider } from "@/providers/whatsapp/evolution";
import { requireApiUser } from "@/server/services/api-auth";

export async function POST() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  try {
    const provider = new EvolutionWhatsAppProvider();
    const result = await provider.createInstance();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao criar instancia Evolution"
      },
      { status: 400 }
    );
  }
}

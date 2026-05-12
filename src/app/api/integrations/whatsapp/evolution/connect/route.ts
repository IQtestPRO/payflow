import { NextResponse } from "next/server";
import { z } from "zod";
import { EvolutionWhatsAppProvider } from "@/providers/whatsapp/evolution";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({
  phone: z.string().optional()
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para conexao Evolution" }, { status: 422 });
  }

  try {
    const provider = new EvolutionWhatsAppProvider();
    const result = await provider.connectInstance(parsed.data.phone);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao gerar QR Code"
      },
      { status: 400 }
    );
  }
}

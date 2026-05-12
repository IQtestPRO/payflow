import { NextResponse } from "next/server";
import { z } from "zod";
import { getWhatsAppProvider } from "@/providers/whatsapp";
import { requireApiUser } from "@/server/services/api-auth";

const schema = z.object({
  to: z.string().min(8),
  mode: z.enum(["template", "text"]).default("template"),
  body: z.string().min(1).max(1000).optional(),
  templateName: z.string().min(1).default("hello_world"),
  languageCode: z.string().min(2).default("en_US")
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do teste inválidos" }, { status: 422 });
  }

  const to = parsed.data.to.replace(/\D/g, "");
  const provider = getWhatsAppProvider();

  try {
    const result =
      parsed.data.mode === "template"
        ? await provider.sendTemplateMessage({
            to,
            templateName: parsed.data.templateName,
            languageCode: parsed.data.languageCode,
            metadata: { source: "payflow-whatsapp-setup" }
          })
        : await provider.sendMessage({
            to,
            body: parsed.data.body || "Teste de envio pelo PayFlow.",
            metadata: { source: "payflow-whatsapp-setup" }
          });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao enviar teste WhatsApp"
      },
      { status: 400 }
    );
  }
}

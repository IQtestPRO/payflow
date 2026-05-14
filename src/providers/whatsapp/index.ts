import { EvolutionWhatsAppProvider } from "@/providers/whatsapp/evolution";
import { MetaWhatsAppProvider } from "@/providers/whatsapp/meta";
import { MockWhatsAppProvider } from "@/providers/whatsapp/mock";
import type { WhatsAppProvider } from "@/providers/whatsapp/types";

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || "evolution";

  if (provider === "evolution") {
    return new EvolutionWhatsAppProvider();
  }

  if (provider === "meta") {
    return new MetaWhatsAppProvider();
  }

  if (provider === "mock" && process.env.NODE_ENV !== "production") {
    return new MockWhatsAppProvider();
  }

  if (provider === "mock") {
    throw new Error("WHATSAPP_PROVIDER=mock nao pode ser usado em producao.");
  }

  throw new Error(`WHATSAPP_PROVIDER invalido: ${provider}`);
}

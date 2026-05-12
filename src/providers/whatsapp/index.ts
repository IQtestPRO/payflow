import { EvolutionWhatsAppProvider } from "@/providers/whatsapp/evolution";
import { MetaWhatsAppProvider } from "@/providers/whatsapp/meta";
import { MockWhatsAppProvider } from "@/providers/whatsapp/mock";
import type { WhatsAppProvider } from "@/providers/whatsapp/types";

export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === "evolution") {
    return new EvolutionWhatsAppProvider();
  }

  if (process.env.WHATSAPP_PROVIDER === "meta") {
    return new MetaWhatsAppProvider();
  }

  return new MockWhatsAppProvider();
}

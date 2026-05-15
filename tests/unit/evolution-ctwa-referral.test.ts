import { describe, expect, it } from "vitest";
import { EvolutionWhatsAppProvider } from "@/providers/whatsapp/evolution";

describe("Evolution CTWA referral parsing", () => {
  it("extracts ctwa_clid from nested externalAdReply payloads", () => {
    const provider = new EvolutionWhatsAppProvider();
    const parsed = provider.parseWebhook({
      event: "MESSAGES_UPSERT",
      data: {
        key: {
          remoteJid: "5521999998888@s.whatsapp.net",
          fromMe: false,
          id: "msg-1"
        },
        pushName: "Lucas Lead",
        message: {
          conversation: "Tenho interesse",
          contextInfo: {
            externalAdReply: {
              sourceId: "120210000000000000",
              sourceUrl: "https://fb.me/ad",
              title: "MusclePrime Brasil",
              body: "Clique para WhatsApp",
              ctwa_clid: "ARACTWA123"
            }
          }
        }
      }
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0].phone).toBe("5521999998888");
    expect(parsed[0].referral?.ctwaClid).toBe("ARACTWA123");
    expect(parsed[0].referral?.sourceId).toBe("120210000000000000");
    expect(parsed[0].referral?.headline).toBe("MusclePrime Brasil");
  });
});

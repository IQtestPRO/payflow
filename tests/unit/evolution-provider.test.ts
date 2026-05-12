import { describe, expect, it } from "vitest";
import { EvolutionWhatsAppProvider, enrichEvolutionQrResponse } from "../../src/providers/whatsapp/evolution";

describe("EvolutionWhatsAppProvider", () => {
  it("normalizes inbound text messages from Evolution webhooks", () => {
    const provider = new EvolutionWhatsAppProvider();
    const messages = provider.parseWebhook({
      event: "MESSAGES_UPSERT",
      instance: "payflow-local",
      data: {
        key: {
          remoteJid: "5511999999999@s.whatsapp.net",
          fromMe: false,
          id: "BAE5F5A632EAE722"
        },
        pushName: "Cliente Teste",
        message: {
          conversation: "Oi, quero concluir meu pagamento"
        },
        messageType: "conversation"
      }
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      phone: "5511999999999",
      name: "Cliente Teste",
      body: "Oi, quero concluir meu pagamento",
      providerMessageId: "BAE5F5A632EAE722",
      eventType: "MESSAGES_UPSERT"
    });
  });

  it("ignores own messages and group messages", () => {
    const provider = new EvolutionWhatsAppProvider();
    const messages = provider.parseWebhook({
      event: "MESSAGES_UPSERT",
      data: [
        {
          key: {
            remoteJid: "5511999999999@s.whatsapp.net",
            fromMe: true,
            id: "sent-by-me"
          },
          message: { conversation: "Mensagem enviada por mim" }
        },
        {
          key: {
            remoteJid: "120363000000000000@g.us",
            fromMe: false,
            id: "group-message"
          },
          message: { conversation: "Mensagem em grupo" }
        }
      ]
    });

    expect(messages).toHaveLength(0);
  });

  it("generates a QR image when Evolution returns only the connection code", async () => {
    const response = await enrichEvolutionQrResponse({
      pairingCode: "WZYEH1YY",
      code: "2@y8eK+bjtEjUWy9/FOM...",
      count: 1
    });

    expect(response).toMatchObject({
      pairingCode: "WZYEH1YY",
      code: "2@y8eK+bjtEjUWy9/FOM...",
      qrcode: {
        code: "2@y8eK+bjtEjUWy9/FOM..."
      }
    });
    expect((response as { base64?: string }).base64).toMatch(/^data:image\/png;base64,/);
    expect((response as { qrcode?: { base64?: string } }).qrcode?.base64).toMatch(/^data:image\/png;base64,/);
  });
});

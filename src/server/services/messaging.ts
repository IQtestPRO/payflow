import { getWhatsAppProvider } from "@/providers/whatsapp";
import { appendOutboundMessage, findCustomer, getInboxSnapshot } from "@/server/repositories/payflow-repository";
import { sanitizeText } from "@/lib/utils";

type ConversationMediaMessageInput = {
  caption: string;
  mediaBase64: string;
  fileName?: string;
  metadata?: Record<string, unknown>;
};

export async function sendConversationMessage(conversationId: string, body: string, workspaceId?: string) {
  const conversations = await getInboxSnapshot(workspaceId);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) throw new Error("Conversa não encontrada");

  const customer = await findCustomer(conversation.customerId, conversation.workspaceId);
  if (!customer?.phone) throw new Error("Cliente sem telefone");
  if (customer.doNotContact) throw new Error("Cliente marcou opt-out");

  const safeBody = sanitizeText(body, 4000);
  const provider = getWhatsAppProvider();
  const result = await provider.sendMessage({ to: customer.phone, body: safeBody, metadata: { conversationId } });
  const message = await appendOutboundMessage(conversation.id, safeBody, result.providerMessageId, conversation.workspaceId);

  return { message, providerMessageId: result.providerMessageId };
}

export async function sendConversationMediaMessage(conversationId: string, input: ConversationMediaMessageInput, workspaceId?: string) {
  const conversations = await getInboxSnapshot(workspaceId);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) throw new Error("Conversa nao encontrada");

  const customer = await findCustomer(conversation.customerId, conversation.workspaceId);
  if (!customer?.phone) throw new Error("Cliente sem telefone");
  if (customer.doNotContact) throw new Error("Cliente marcou opt-out");

  const provider = getWhatsAppProvider();
  if (!provider.sendMediaMessage) throw new Error("Provider de WhatsApp nao suporta envio de midia");

  const safeCaption = sanitizeText(input.caption, 1000);
  const result = await provider.sendMediaMessage({
    to: customer.phone,
    mediaType: "image",
    mediaBase64: input.mediaBase64,
    mimetype: "image/png",
    fileName: input.fileName ?? "payflow-pix-qrcode.png",
    caption: safeCaption,
    metadata: input.metadata
  });
  const message = await appendOutboundMessage(conversation.id, safeCaption || "[QR Code Pix]", result.providerMessageId, conversation.workspaceId, {
    ...input.metadata,
    mediaType: "image",
    fileName: input.fileName ?? "payflow-pix-qrcode.png"
  });

  return { message, providerMessageId: result.providerMessageId };
}

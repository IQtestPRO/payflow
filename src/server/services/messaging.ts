import { getWhatsAppProvider } from "@/providers/whatsapp";
import { appendOutboundMessage, findCustomer, getInboxSnapshot } from "@/server/repositories/payflow-repository";
import { sanitizeText } from "@/lib/utils";

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

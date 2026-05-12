# Arquitetura PayFlow

## Módulos

- Autenticação: login, cadastro, logout, sessão JWT em cookie HTTP-only e middleware protegendo rotas.
- Dashboard: métricas agregadas de receita, pagamentos, conversas, tráfego, CPA, ROAS e ticket médio.
- WhatsApp Inbox: lista de conversas, filtros, busca, mensagens cronológicas e envio por provider.
- Ofertas e produtos: CRUD básico com status, UTMs, tags e métricas agregadas.
- Clientes: cadastro comercial, origem, tags, status, opt-out e anonimização.
- Pagamentos: histórico de transações Umbrella/UmbrellaPag.
- Recuperações: pipeline de tentativas, templates, janela de envio e cancelamento por pagamento aprovado.
- Campanhas: métricas de tráfego pago e estrutura para Meta Ads.
- Integrações: status, última sincronização, teste de conexão e logs recentes.
- Relatórios: tabela por oferta e exportação CSV.

## Providers

Cada integração externa tem contrato isolado:

- `WhatsAppProvider`: `sendMessage`, `sendTemplateMessage`, `parseWebhook`, `testConnection`.
  - `MockWhatsAppProvider`: demo local sem credenciais.
  - `EvolutionWhatsAppProvider`: modo local via QR code e Evolution API.
  - `MetaWhatsAppProvider`: WhatsApp Cloud API para uso futuro com BM/numero aprovado.
- `PaymentProvider`: normalização de webhooks de pagamento.
- `TrackingProvider`: normalização de eventos UTM.
- `AdsProvider`: importação de campanhas e teste de conexão.

Os mocks mantêm o MVP funcional sem credenciais. Providers reais entram trocando a implementação interna, sem alterar telas ou serviços.

## Webhooks

- `GET /api/webhooks/whatsapp`: validação de webhook da Meta por `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/webhooks/whatsapp`: recebe mensagens, cria cliente/conversa/mensagem e marca como não respondida.
- `POST /api/integrations/whatsapp/evolution/create-instance`: cria instancia Evolution local.
- `POST /api/integrations/whatsapp/evolution/connect`: solicita QR code/codigo de pareamento.
- `POST /api/integrations/whatsapp/evolution/webhook`: registra o webhook do PayFlow na instancia Evolution.
- `POST /api/webhooks/umbrella`: cria/atualiza cliente e pagamento, agenda recuperação quando pendente e converte/cancela quando pago.
- `POST /api/webhooks/utmify`: registra evento de tracking e associa cliente/pagamento/oferta quando informado.

Quando secrets estão configurados, os endpoints validam assinatura HMAC.

## Fluxo de Recuperação

1. Webhook de pagamento chega pelo `UmbrellaProvider`.
2. O payload é validado e normalizado.
3. Cliente e pagamento são criados ou atualizados.
4. Se o status for recuperável, `scheduleRecoveryForPayment` busca fluxo ativo, checa telefone, opt-out e oferta.
5. Tentativas são agendadas conforme delays e janela permitida.
6. O botão “Enviar agora” usa o `WhatsAppProvider`, cria mensagem outbound e marca a tentativa como enviada.
7. Quando o pagamento chega como `PAID`, tentativas pendentes/enviadas são marcadas como convertidas.

Estados recuperáveis: `PENDING`, `WAITING_PAYMENT`, `PIX_GENERATED`, `BOLETO_GENERATED`, `FAILED` e `EXPIRED` quando a oferta permitir.

## Modelo de Dados

O schema Prisma contém:

- `Workspace`, `User`, `IntegrationAccount`
- `Product`, `Offer`
- `Customer`, `Conversation`, `Message`
- `Payment`, `RecoveryFlow`, `RecoveryAttempt`
- `Campaign`, `AdSet`, `Ad`
- `TrackingEvent`, `WebhookEvent`, `AuditLog`

O banco oficial é PostgreSQL. O repositório `src/server/repositories/payflow-repository.ts` faz fallback para demo em memória quando o banco não estiver configurado.

## Pontos de Extensão

- Substituir `MockWhatsAppProvider` por Evolution API local, Meta Cloud API ou outro provedor intermediário.
- Completar `MetaAdsProvider.importCampaigns` com Graph API e insights.
- Expandir `UmbrellaProvider` para validação de assinatura específica se o provedor exigir formato próprio.
- Persistir credenciais criptografadas em `IntegrationAccount.configEncrypted`.
- Trocar scheduler mock/síncrono por BullMQ/Redis mantendo a mesma camada de serviço.
- Adicionar RBAC fino por papel em ações administrativas.

# Arquitetura PayFlow

## Modulos

- Autenticacao: login, cadastro, logout, sessao JWT em cookie HTTP-only e middleware protegendo rotas.
- Dashboard: metricas agregadas de receita, pagamentos, conversas, trafego, CPA, ROAS e ticket medio.
- WhatsApp Inbox: conversas reais, filtros, busca, mensagens cronologicas, cobrancas e envio por provider.
- Ofertas: LPs multiproduto com status, UTMs, tags e metricas agregadas.
- Clientes: cadastro comercial, origem, tags, status, opt-out e anonimizacao.
- Pagamentos: historico de transacoes por gateway.
- Recuperacoes: area preparada para fluxo manual/automatico, aguardando aprovacao de regras novas.
- Campanhas: leitura de Meta Ads real quando credenciais estiverem configuradas.
- Integracoes: status, ultima sincronizacao, teste de conexao e logs recentes.
- Relatorios: foco operacional na oferta MusclePrime Brasil ate novas ofertas reais serem aprovadas.

## Providers

Cada integracao externa tem contrato isolado:

- `WhatsAppProvider`: `sendMessage`, `sendTemplateMessage`, `parseWebhook`, `testConnection`.
  - `EvolutionWhatsAppProvider`: QR code e Evolution API.
  - `MetaWhatsAppProvider`: WhatsApp Cloud API.
  - `MockWhatsAppProvider`: duplo de teste local, bloqueado em producao.
- `PaymentProvider`: normalizacao de webhooks de pagamento.
- `TrackingProvider`: normalizacao de eventos UTM.
- `AdsProvider`: importacao de campanhas e teste de conexao.

Providers reais entram por contrato isolado. Duplos locais ficam restritos a testes automatizados e desenvolvimento isolado.

## Webhooks

- `GET /api/webhooks/whatsapp`: validacao de webhook da Meta por `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/webhooks/whatsapp`: recebe mensagens, cria cliente/conversa/mensagem e marca como nao respondida.
  - Quando o payload traz `ctwa_clid`, o identificador CTWA e salvo no cliente e dispara `Contact` via Meta CAPI Business Messaging.
- `POST /api/integrations/whatsapp/evolution/create-instance`: cria instancia Evolution.
- `POST /api/integrations/whatsapp/evolution/connect`: solicita QR code/codigo de pareamento.
- `POST /api/integrations/whatsapp/evolution/webhook`: registra o webhook do PayFlow na instancia Evolution.
- `POST /api/webhooks/umbrella`: cria/atualiza cliente e pagamento, agenda recuperacao quando permitido e converte/cancela quando pago.
- `POST /api/webhooks/utmify`: registra evento de tracking e associa cliente/pagamento/oferta quando informado.
- Meta CAPI Business Messaging dispara `Lead` ao gerar cobranca no Inbox e `Purchase` quando um gateway confirma pagamento de cliente com `ctwa_clid`.

Quando secrets estao configurados, endpoints sensiveis validam assinatura HMAC.

## Dados

O banco oficial e PostgreSQL. Sem `DATABASE_URL`, o repositorio usa um runtime store local vazio apenas para desenvolvimento isolado.

O seed oficial nao cria campanhas, clientes, pagamentos, conversas ou ofertas ficticias. Ele cria o workspace e usuarios reais quando as variaveis `PAYFLOW_LUCAS_*` e `PAYFLOW_ARTHUR_*` estiverem preenchidas.

## Modelo

O schema Prisma contem:

- `Workspace`, `User`, `IntegrationAccount`
- `Product`, `Offer`
- `Customer`, `Conversation`, `Message`
- `Payment`, `RecoveryFlow`, `RecoveryAttempt`
- `Campaign`, `AdSet`, `Ad`
- `TrackingEvent`, `WebhookEvent`, `AuditLog`

`Product` permanece no schema por compatibilidade historica, mas a UI operacional removeu a sessao Produto e trata oferta como LP multiproduto.

## Extensoes

- Completar importacao Meta Ads com insights adicionais.
- Persistir credenciais criptografadas em `IntegrationAccount.configEncrypted`.
- Trocar scheduler local/sincrono por BullMQ/Redis mantendo a camada de servico.
- Adicionar RBAC fino por papel em acoes administrativas.

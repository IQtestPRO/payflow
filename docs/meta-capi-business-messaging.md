# Meta CAPI Business Messaging

O PayFlow suporta envio server-side de eventos do WhatsApp CTWA para a Meta Conversions API for Business Messaging.

## Variaveis

Configure no ambiente de producao:

```bash
META_DATASET_ID=
META_CAPI_ACCESS_TOKEN=
META_PAGE_ID=
META_GRAPH_API_VERSION=v21.0
META_CAPI_TEST_EVENT_CODE=
META_TEST_EVENT_CODE=
```

`META_PIXEL_ID` continua aceito como fallback para `META_DATASET_ID`.
`META_ACCESS_TOKEN` continua aceito como fallback para `META_CAPI_ACCESS_TOKEN`.
Para Test Events, o PayFlow aceita `META_CAPI_TEST_EVENT_CODE` ou `META_TEST_EVENT_CODE`.

## Captura CTWA

Quando o webhook da Evolution recebe uma mensagem originada de anuncio Click-to-WhatsApp, o PayFlow procura `ctwa_clid` em estruturas como:

- `message.contextInfo.externalAdReply`
- `referral`
- campos aninhados repassados pelo Baileys/Evolution

O `ctwa_clid` e salvo no cliente somente se ainda estiver vazio. Mensagens futuras do mesmo contato nao sobrescrevem o identificador original.

## Eventos enviados

- `Contact`: primeira mensagem WhatsApp com `ctwa_clid`.
- `Lead`: cobranca gerada no Inbox para contato com `ctwa_clid`.
- `Purchase`: webhook de gateway confirma pagamento `PAID` para contato com `ctwa_clid`.

Os eventos usam:

- `action_source: business_messaging`
- `messaging_channel: whatsapp`
- `user_data.ctwa_clid` sem hash
- `user_data.ph`, `user_data.em` e `user_data.external_id` com SHA-256

Se `ctwa_clid` estiver ausente, o evento Business Messaging e ignorado e registrado como skipped em `TrackingEvent`.

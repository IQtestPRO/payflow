# Implementacao real de gateways

Este documento registra o estado seguro da implementacao dos gateways de pagamento no PayFlow.

## Fonte local sensivel

A pasta local indicada para documentos sensiveis e `C:\Users\Arthu\OneDrive\Área de Trabalho\Docs API`.
Na primeira auditoria de 2026-05-13, os arquivos existiam, mas estavam vazios.
Na segunda leitura, os arquivos foram preenchidos com credenciais reais e dados parciais de API.
Nenhuma chave real foi copiada para o repositorio.

- `allowpay.txt`: secret key e company id. Sem endpoints.
- `lytron pay.txt`: base URL, endpoints Pix/payouts e credenciais. Segredos mantidos fora do repo.
- `sigilo pay.txt`: chave publica e privada. Sem endpoints.
- `tribopay.txt`: segredo/token. Segredo mantido fora do repo.

## TriboPay

Status: adapter real iniciado.

Implementado:

- Provider server-side `TriboPayProvider`.
- Autenticacao por `api_token` em query string.
- Base URL padrao `https://api.tribopay.com.br/api/public/v1`.
- Teste de conexao via `GET /balance`.
- Criacao de transacao via `POST /transactions`.
- Consulta de transacao via `GET /transactions/{hash}`.
- Listagem de transacoes via `GET /transactions`.
- Reembolso via `POST /transactions/{hash}/refund`.
- Normalizacao de webhook/postback para o fluxo de pagamentos e recuperacao.
- Rota publica de webhook `POST /api/webhooks/tribopay`.
- Suporte de enum no Prisma para pagamentos e webhooks TriboPay.

Variaveis:

```bash
TRIBOPAY_API_BASE_URL=https://api.tribopay.com.br/api/public/v1
TRIBOPAY_API_TOKEN=
TRIBOPAY_WEBHOOK_SECRET=
```

Seguranca:

- O token nao deve ser exposto no frontend.
- `TRIBOPAY_WEBHOOK_SECRET`, se configurado, exige HMAC SHA-256 nos headers `x-tribopay-signature` ou `x-signature`.
- Se a TriboPay fornecer assinatura oficial diferente, ajustar a verificacao antes de ativar em producao.

## Mangofy, SigiloPay, LytronPay e AllowPayments

Status:

- LytronPay: adapter real iniciado para endpoints confirmados no material local.
- Mangofy, SigiloPay e AllowPayments: bloqueados para chamada real ate receber documentacao completa.

O PayFlow ja possui registry visual e slots de credenciais. Gateways sem endpoints completos continuam em modo pendente para evitar chamadas com payloads ou autenticacao incompletos.

## LytronPay

Status: adapter real iniciado.

Implementado:

- Base URL padrao `https://api.lytronpay.com/api/v1`.
- Header documentado `Api-Access-Key`.
- Criacao de cobranca Pix via `POST /v1/charges`.
- Consulta por TXID via `GET /v1/charges/{txid}`.
- Saque/payout via `POST /v1/payouts`.
- Adapter server-side conectado ao registry.

Variaveis:

```bash
LYTRON_API_BASE_URL=https://api.lytronpay.com/api/v1
LYTRON_API_ACCESS_KEY=
LYTRON_API_SECRET_HASH=
LYTRON_SELLER_ID=
```

Seguranca:

- `LYTRON_API_ACCESS_KEY` nao deve ser exposta no frontend.
- O material local cita API secret hash, mas nao confirma o header. O PayFlow ainda nao envia esse valor em requests.
- Webhook LytronPay segue bloqueado ate receber payload oficial e assinatura.

Pendencias:

- Documentacao oficial completa.
- Payloads completos de criacao de pagamento.
- Lista de status.
- Webhook/postback e assinatura.
- Consulta de transacao.
- Reembolso/estorno.

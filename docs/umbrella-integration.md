# UmbrellaPag no PayFlow

Este guia deixa a integracao de pagamentos pronta antes da Meta Cloud API. O objetivo e receber eventos da UmbrellaPag, criar/atualizar pagamentos no PayFlow e acionar recuperacao quando o status for recuperavel.

## URLs

Producao:

```text
https://pay-flow.shop/api/webhooks/umbrella
```

Local:

```text
http://localhost:3000/api/webhooks/umbrella
```

## Variaveis

Configure no Vercel e no `.env` local quando for testar fora do teste interno:

```env
UMBRELLA_API_BASE_URL=https://api.umbrellapag.com.br
UMBRELLA_API_KEY=<sua-chave-umbrella>
UMBRELLA_WEBHOOK_SECRET=<secret-opcional>
APP_URL=https://pay-flow.shop
NEXT_PUBLIC_APP_URL=https://pay-flow.shop
```

`UMBRELLA_WEBHOOK_SECRET` e opcional para desenvolvimento. Quando estiver configurado, o webhook exige assinatura HMAC no header `x-umbrella-signature` ou `x-signature`.

## Como testar pelo painel

1. Entre em `/integracoes`.
2. No bloco `UmbrellaPag agora`, copie o webhook oficial.
3. Preencha nome, telefone e email reais do lead.
4. Preencha CPF/CNPJ, endereco, item, valor e metodo de pagamento.
5. Clique em `Gerar pagamento real` para chamar a API da Umbrella.
6. Abra `/pagamentos` e confira o pagamento criado.
7. Abra `/recuperacoes` e confira se a tentativa foi agendada quando houver fluxo ativo.
8. Use `Registrar pendente/pago/recusado/expirado` apenas para validar o processamento interno sem nova cobranca.
9. Quando quiser validar credenciais sem criar transacao, clique em `Testar credenciais`.

Importante: a UmbrellaPag so gera dados de pagamento com informacoes reais do lead. O PayFlow nao deve chamar a API real usando nome, telefone, email, documento ou endereco ficticios.

## Gerar pagamento real

Endpoint Umbrella:

```text
POST /api/user/transactions
```

Headers obrigatorios:

```text
x-api-key: <api-key>
User-Agent: UMBRELLAB2B/1.0
Content-Type: application/json
```

Payload minimo usado pelo PayFlow:

```json
{
  "amount": 29700,
  "currency": "BRL",
  "paymentMethod": "PIX",
  "installments": 1,
  "customer": {
    "name": "<nome-real-do-lead>",
    "email": "<email-real-do-lead>",
    "document": {
      "number": "<cpf-ou-cnpj-real>",
      "type": "CPF"
    },
    "phone": "<telefone-real-com-ddi>",
    "externalRef": "payflow-<timestamp>",
    "address": {
      "street": "<rua>",
      "streetNumber": "<numero>",
      "complement": "<complemento>",
      "zipCode": "<cep>",
      "neighborhood": "<bairro>",
      "city": "<cidade>",
      "state": "<uf>",
      "country": "BR"
    }
  },
  "items": [
    {
      "title": "<nome-do-produto-ou-oferta>",
      "unitPrice": 29700,
      "quantity": 1,
      "tangible": false,
      "externalRef": "payflow-item"
    }
  ],
  "pix": {
    "expiresInDays": 1
  },
  "postbackUrl": "https://pay-flow.shop/api/webhooks/umbrella",
  "metadata": "{\"source\":\"payflow\"}",
  "traceable": true,
  "ip": "<ip-do-cliente>"
}
```

Para boleto, use `"paymentMethod": "BOLETO"` e envie:

```json
{
  "boleto": {
    "expiresInDays": 3
  }
}
```

## Payload aceito

O PayFlow aceita payloads simples e payloads aninhados em `data`, `payload` ou `transaction`.

Exemplo simples:

```json
{
  "id": "pay-local-1",
  "status": "pending",
  "amount": 297,
  "currency": "BRL",
  "payment_method": "pix",
  "checkout_url": "https://pay-flow.shop/checkout",
  "customer": {
      "name": "<nome-real-do-lead>",
      "phone": "<telefone-real-com-ddi>",
      "email": "<email-real-do-lead>"
  },
  "offer": {
    "id": "offer-02",
    "name": "Kit Funil WhatsApp"
  }
}
```

Exemplo estilo API:

```json
{
  "data": {
    "id": "tx-123",
    "status": "APPROVED",
    "amount": 29700,
    "paymentMethod": "PIX",
    "secureUrl": "https://checkout.umbrellapag.com/tx-123",
    "pix": {
      "qrCode": "000201..."
    },
    "metadata": "{\"linkId\":\"offer-02\",\"orderId\":\"order-123\"}",
    "customer": {
      "name": "<nome-real-do-lead>",
      "phone": "<telefone-real-com-ddi>",
      "email": "<email-real-do-lead>",
      "document": {
        "number": "12345678900",
        "type": "cpf"
      }
    },
    "items": [
      {
        "title": "Kit Funil WhatsApp"
      }
    ]
  }
}
```

## Mapeamento de status

- `created` vira `CREATED`
- `processing` e `pending` viram `PENDING`
- `waiting_payment` vira `WAITING_PAYMENT`
- `pix_generated` vira `PIX_GENERATED`
- `boleto_generated` vira `BOLETO_GENERATED`
- `paid`, `approved` e `authorized` viram `PAID`
- `failed` e `refused` viram `FAILED`
- `expired` vira `EXPIRED`
- `cancelled` e `canceled` viram `CANCELLED`
- `refunded` vira `REFUNDED`
- `chargeback` vira `CHARGEBACK`

## Observacoes

- Valores em centavos sao convertidos para reais quando o payload tem formato de transacao API (`paymentMethod`, `secureUrl`, `postbackUrl`, `createdAt`) ou campos explicitos como `amount_cents`, `amountInCents` e `value_cents`.
- Webhooks sao deduplicados por workspace, provider, tipo de evento e id externo.
- O webhook delega para `src/server/services/webhooks.ts`; a regra de recuperacao continua em `src/server/services/recovery.ts`.

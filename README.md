# PayFlow

Identidade visual: a marca usa azul-marinho, azul eletrico e acento cyan-verde inspirados no logo PayFlow. As regras ficam em `docs/brand.md`, e o componente reutilizavel de marca fica em `src/components/brand/payflow-logo.tsx`.

PayFlow e um MVP SaaS para centralizar WhatsApp, ofertas, clientes, pagamentos pendentes, recuperacao e campanhas de trafego pago.

## Stack

- Next.js App Router, React, TypeScript e Tailwind CSS
- Prisma ORM com PostgreSQL
- Autenticacao propria por cookie HTTP-only + JWT
- Zod para validacao
- Providers mockados e contratos para WhatsApp, Evolution API, Umbrella/UmbrellaPag, Utmify e Meta Ads
- Vitest para regras criticas e webhooks

## Instalacao

```bash
npm install
cp .env.example .env
npm run db:generate
```

No Windows PowerShell com execucao de scripts bloqueada, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run db:generate
```

## Banco

Configure `DATABASE_URL` apontando para PostgreSQL.

Para subir um PostgreSQL local:

```bash
docker compose up -d postgres
```

Para subir a Evolution API local com QR code:

```bash
docker compose up -d evolution-api
```

O compose usa `evoapicloud/evolution-api:v2.3.7`. Se um container antigo ficar preso em `{"count":0}` ao gerar QR, rode `docker compose pull evolution-api` e depois `docker compose up -d evolution-api`.

```bash
npm run db:migrate
npm run db:seed
```

Login seed:

- E-mail: `admin@payflow.local`
- Senha: `admin123`

Sem `DATABASE_URL`, o app usa dados demo em memoria para permitir navegacao, envio mockado e testes de webhook.

## Rodar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Rotas principais

- `/dashboard`
- `/inbox`
- `/clientes`
- `/ofertas`
- `/produtos`
- `/pagamentos`
- `/recuperacoes`
- `/campanhas`
- `/relatorios`
- `/integracoes`
- `/configuracoes`

## Webhooks locais

WhatsApp mock:

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"5511999999999\",\"name\":\"Cliente Teste\",\"text\":\"Oi, preciso de ajuda\",\"messageId\":\"local-1\"}"
```

WhatsApp Evolution API envia payloads de mensagem para o mesmo endpoint. Para usar a ponte local, configure `WHATSAPP_PROVIDER=evolution`, suba `evolution-api`, crie a instancia em `/integracoes` e escaneie o QR code.

Umbrella pendente:

```bash
curl -X POST http://localhost:3000/api/webhooks/umbrella \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"pay-local-1\",\"status\":\"pending\",\"amount\":297,\"currency\":\"BRL\",\"payment_method\":\"pix\",\"checkout_url\":\"https://checkout.local/pay\",\"customer\":{\"name\":\"Cliente Pix\",\"phone\":\"5511888888888\",\"email\":\"pix@example.com\"},\"offer\":{\"id\":\"offer-02\",\"name\":\"Kit Funil WhatsApp\"}}"
```

Umbrella pago:

```bash
curl -X POST http://localhost:3000/api/webhooks/umbrella \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"pay-local-1\",\"status\":\"paid\",\"amount\":297,\"currency\":\"BRL\",\"paid_at\":\"2026-05-08T12:00:00.000Z\",\"customer\":{\"name\":\"Cliente Pix\",\"phone\":\"5511888888888\"},\"offer\":{\"id\":\"offer-02\",\"name\":\"Kit Funil WhatsApp\"}}"
```

O painel `/integracoes` tambem tem um bloco da UmbrellaPag com webhook copiavel, teste de credenciais e teste interno de eventos pendente/pago/recusado/expirado. Para manter compatibilidade com a regra da UmbrellaPag, o teste exige nome, telefone e email reais do lead.

Utmify:

```bash
curl -X POST http://localhost:3000/api/webhooks/utmify \
  -H "Content-Type: application/json" \
  -d "{\"eventType\":\"checkout_started\",\"customerPhone\":\"5511777777777\",\"source\":\"meta\",\"medium\":\"cpc\",\"campaign\":\"kit_recuperacao\",\"content\":\"criativo-1\",\"clickId\":\"click-local\"}"
```

## Providers reais

Os contratos ficam em:

- `src/providers/whatsapp`
- `src/providers/payments`
- `src/providers/tracking`
- `src/providers/ads`

Para o caminho local com QR code, configure:

- `WHATSAPP_PROVIDER=evolution`
- `EVOLUTION_API_BASE_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE_NAME`
- `WHATSAPP_WEBHOOK_URL`
- `CONFIG_SESSION_PHONE_CLIENT`
- `CONFIG_SESSION_PHONE_NAME`
- `QRCODE_LIMIT`
- `QRCODE_COLOR`

Veja o passo a passo em `docs/evolution-local-quickstart.md`.

Para demo sem credenciais, use `WHATSAPP_PROVIDER=mock`.

Para Meta Cloud API, configure:

- `WHATSAPP_PROVIDER=meta`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WEBHOOK_SECRET`

UmbrellaPag ja normaliza payloads simples e payloads aninhados da API, cria/atualiza pagamentos e aciona recuperacoes. Configure:

- `UMBRELLA_API_BASE_URL`
- `UMBRELLA_API_KEY`
- `UMBRELLA_WEBHOOK_SECRET`

Veja o guia em `docs/umbrella-integration.md`.

Utmify e Meta Ads ja tem adapters iniciais e TODOs nos pontos de integracao real.

Com BM ainda nao verificada, comece por `docs/evolution-local-quickstart.md`. O guia antigo da Cloud API segue em `docs/whatsapp-cloud-api-quickstart.md` para migracao futura.

## Hospedagem futura

A Evolution API pode rodar depois em uma VM na AWS, mas trate Free Tier/creditos como ambiente de teste com limite, nao como garantia de custo zero permanente. Antes de publicar, configure alertas de billing, HTTPS, backup dos volumes, API key forte e dominio proprio.

## Deploy na Vercel

O app Next.js pode ser hospedado na Vercel com dominio proprio. Use o guia em `docs/vercel-deploy.md`.

Para a publicacao oficial em `pay-flow.shop`, use tambem `docs/production-launch-checklist.md`.
Para hospedar a Evolution API na Oracle Always Free, use `docs/oracle-evolution-free-tier.md`.

Resumo:

- configure `DATABASE_URL` com PostgreSQL gerenciado;
- configure `APP_URL` e `NEXT_PUBLIC_APP_URL` com o dominio final;
- rode migrations com `npm run db:deploy`;
- use `/api/health` para validar o deploy;
- nao use `localhost` para `EVOLUTION_API_BASE_URL` na Vercel.

## Seguranca

- Secrets ficam apenas em variaveis de ambiente.
- Cookies de sessao sao HTTP-only.
- Webhooks validam HMAC quando o secret correspondente estiver configurado.
- Payloads sao validados com Zod.
- Ha deduplicacao basica de webhook por provider, tipo de evento e id externo.
- Clientes tem `doNotContact` e acao de anonimizacao.
- Envios de recuperacao respeitam janela de horario.

## Validacao

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Se `prisma validate` for executado sem `.env`, ele falha por falta de `DATABASE_URL`. Use uma URL local ou exporte a variavel antes do comando.

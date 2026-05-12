# Checklist de publicacao - PayFlow

Dominio oficial do app: `https://pay-flow.shop`

Prioridade desta publicacao:

1. PayFlow online na Vercel.
2. WhatsApp online e funcional na inbox.
3. Meta, Umbrella e pagamentos em uma etapa posterior.

## 1. Vercel

Importe o repositorio GitHub `IQtestPRO/payflow` na Vercel.

Configuracao do projeto:

- Framework: `Next.js`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: padrao da Vercel

## 2. Banco Postgres

Crie um Postgres gerenciado e copie a string `DATABASE_URL`.

Depois de configurar a `DATABASE_URL`, aplique as migrations:

```bash
npm run db:deploy
```

Para criar o usuario demo inicial, rode o seed uma vez:

```bash
npm run db:seed
```

Login seed:

- E-mail: `admin@payflow.local`
- Senha: `admin123`

## 3. Variaveis de ambiente da Vercel

Configure em `Project Settings > Environment Variables`, ambiente `Production`:

```env
NEXT_PUBLIC_APP_URL=https://pay-flow.shop
APP_URL=https://pay-flow.shop
AUTH_SECRET=gere-um-secret-forte
CONFIG_ENCRYPTION_KEY=gere-outro-secret-forte
DATABASE_URL=postgresql://...
```

Gere secrets localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. WhatsApp via Evolution

A Evolution API precisa rodar fora da Vercel, em uma VM ou servico persistente com HTTPS publico.

Sugestao de subdominio:

```text
https://evolution.pay-flow.shop
```

Variaveis para Production:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_BASE_URL=https://evolution.pay-flow.shop
EVOLUTION_API_KEY=gere-uma-chave-forte
EVOLUTION_INSTANCE_NAME=payflow
WHATSAPP_WEBHOOK_URL=https://pay-flow.shop/api/webhooks/whatsapp
WHATSAPP_WEBHOOK_SECRET=
WHATSAPP_VERIFY_TOKEN=payflow-production-verify
```

Depois do deploy:

1. Acesse `https://pay-flow.shop/integracoes`.
2. Crie/conecte a instancia Evolution.
3. Escaneie o QR code.
4. Envie uma mensagem para o numero conectado.
5. Confirme que a conversa aparece em `https://pay-flow.shop/inbox`.
6. Responda pela inbox e confirme recebimento no WhatsApp.

## 5. Dominio

Na Vercel, adicione:

- `pay-flow.shop`
- `www.pay-flow.shop`

No DNS do dominio, aplique exatamente os registros que a Vercel indicar.

Em geral:

- Apex `pay-flow.shop`: registro `A` apontando para a Vercel.
- `www.pay-flow.shop`: registro `CNAME` apontando para a Vercel.

Valide:

```text
https://pay-flow.shop/api/health
```

## 6. Checklist de aceite

- `/api/health` responde `ok: true`.
- `/login` abre.
- Login seed funciona.
- `/dashboard` abre sem erro.
- `/integracoes` mostra `provider: evolution`.
- QR code conecta o numero.
- Mensagem recebida aparece na `/inbox`.
- Resposta enviada pela `/inbox` chega no WhatsApp.
- `DATABASE_URL` nao aponta para localhost.
- `EVOLUTION_API_BASE_URL` nao aponta para localhost.
- `.env` local nao foi commitado.

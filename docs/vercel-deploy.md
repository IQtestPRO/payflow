# Deploy do PayFlow na Vercel

Deploy oficial atual:

- App: `https://pay-flow.shop`
- Webhook WhatsApp: `https://pay-flow.shop/api/webhooks/whatsapp`
- Subdominio sugerido para Evolution: `https://evolution.pay-flow.shop`

Este guia prepara o PayFlow para rodar o app Next.js na Vercel com domínio próprio.

## Arquitetura recomendada

- **Vercel**: hospeda o app Next.js, páginas, API routes e webhooks.
- **PostgreSQL gerenciado**: Vercel/Neon/Supabase/Railway/AWS RDS ou equivalente.
- **Evolution API**: não deve rodar dentro da Vercel. Para WhatsApp via QR, hospede a Evolution em uma VM/serviço persistente com HTTPS público.
- **Domínio**: aponta para a Vercel no app principal. Um subdomínio separado pode apontar para Evolution se necessário, por exemplo `evolution.seudominio.com`.

## Antes de conectar a Vercel

1. Suba o código para um repositório GitHub.
2. Crie um banco PostgreSQL gerenciado.
3. Tenha a string `DATABASE_URL`.
4. Defina o domínio principal que será usado pelo app, por exemplo `https://app.seudominio.com` ou `https://seudominio.com`.

## Configuração do projeto na Vercel

Na Vercel:

1. Clique em `Add New Project`.
2. Importe o repositório do PayFlow.
3. Framework: `Next.js`.
4. Install command: `npm install`.
5. Build command: `npm run build`.
6. Output directory: deixe padrão.

O `package.json` contém `postinstall: prisma generate`, necessário para gerar Prisma Client durante o build da Vercel.

## Variáveis de ambiente obrigatórias

Configure em `Project Settings > Environment Variables`:

```bash
NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO
APP_URL=https://SEU_DOMINIO
AUTH_SECRET=gere-um-secret-forte
CONFIG_ENCRYPTION_KEY=gere-outro-secret-forte
DATABASE_URL=postgresql://...
```

Gere secrets localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## WhatsApp em produção

Para publicar agora sem WhatsApp real:

```bash
WHATSAPP_PROVIDER=mock
```

Para usar Evolution em produção:

```bash
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_BASE_URL=https://evolution.SEUDOMINIO.com
EVOLUTION_API_KEY=uma-chave-forte
EVOLUTION_INSTANCE_NAME=payflow
WHATSAPP_WEBHOOK_SECRET=
```

Importante: `EVOLUTION_API_BASE_URL=http://localhost:8080` só funciona no seu computador. Dentro da Vercel, `localhost` seria a própria função serverless, não a sua máquina.

Para usar WhatsApp Cloud API no futuro:

```bash
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_SECRET=
```

## Webhooks após domínio

Depois do domínio apontar para a Vercel, use estas URLs:

```text
https://SEU_DOMINIO/api/webhooks/whatsapp
https://SEU_DOMINIO/api/webhooks/umbrella
https://SEU_DOMINIO/api/webhooks/utmify
```

Também valide:

```text
https://SEU_DOMINIO/api/health
```

## Domínio próprio

Na Vercel:

1. Abra o projeto.
2. Vá em `Settings > Domains`.
3. Adicione o domínio comprado.
4. Siga os registros DNS que a Vercel mostrar.

Você pode:

- trocar os nameservers do domínio para a Vercel; ou
- manter o DNS no registrador atual e criar os registros indicados pela Vercel.

Se o domínio usar e-mail no mesmo domínio, cuidado ao trocar nameservers: preserve registros MX, SPF, DKIM e DMARC.

## Banco, migrations e seed

Rode migrations no banco de produção antes ou logo após o primeiro deploy:

```bash
npm run db:deploy
```

Para rodar localmente contra o banco remoto:

```powershell
$env:DATABASE_URL="postgresql://..."
npm.cmd run db:deploy
```

Seed em produção é opcional. Use apenas se quiser dados demo:

```powershell
$env:DATABASE_URL="postgresql://..."
npm.cmd run db:seed
```

## Checklist de validação em produção

- `/api/health` responde `{ ok: true }`.
- `/login` abre.
- Login funciona com usuário real/seed.
- `/dashboard` abre sem erro.
- `/integracoes` mostra provider correto.
- Webhooks usam `https://SEU_DOMINIO/...`.
- `APP_URL` e `NEXT_PUBLIC_APP_URL` apontam para o domínio final.
- `DATABASE_URL` não é banco local.
- Secrets não foram commitados.

## Observação sobre custos

Vercel pode ter plano gratuito para o app em limites de hobby, mas banco, domínio, Evolution API, volume e tráfego podem gerar custo. Configure alertas de billing no provedor escolhido.

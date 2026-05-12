# AGENTS.md

Branding: respeite `docs/brand.md` e use `PayFlowLogo` ou `PayFlowMark` de `src/components/brand/payflow-logo.tsx` para pontos de marca. Não substitua o logo por texto simples em áreas de branding.

Orientações para futuras execuções do Codex no projeto PayFlow.

## Visão Geral

PayFlow é uma plataforma SaaS para centralizar:

- Atendimento e respostas via WhatsApp.
- Monitoramento de ofertas, produtos e funis.
- Pagamentos gerados e não finalizados.
- Fluxos de recuperação de pagamento por WhatsApp.
- Campanhas de tráfego pago, UTMs e integrações externas.

Prioridade do produto:

1. WhatsApp primeiro.
2. Recuperação de pagamentos em segundo.
3. Campanhas, relatórios e integrações em seguida.

Ao implementar novas funcionalidades, preserve essa ordem de decisão. Se houver conflito de escopo, favoreça estabilidade da inbox, envio/recebimento de mensagens e recuperação de pagamentos.

## Stack

- Next.js com App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Prisma ORM.
- PostgreSQL.
- Zod para validação.
- Cookies HTTP-only + JWT para autenticação própria.
- Vitest para testes unitários e integração.
- Providers mockados para desenvolvimento sem credenciais externas.

## Estrutura de Pastas

- `src/app`: rotas App Router, páginas e API routes.
- `src/components`: componentes visuais reutilizáveis.
- `src/components/layout`: shell, sidebar e formulários de autenticação.
- `src/components/ui`: componentes genéricos como cards, badges, tables e estados.
- `src/providers`: contratos e adapters externos.
- `src/providers/whatsapp`: `WhatsAppProvider`, mock, Evolution API e Meta Cloud API.
- `src/providers/payments`: `PaymentProvider` e Umbrella/UmbrellaPag.
- `src/providers/tracking`: `TrackingProvider` e Utmify.
- `src/providers/ads`: `AdsProvider` e Meta Ads.
- `src/server/services`: regras de negócio e orquestração.
- `src/server/repositories`: acesso a dados e fallback demo.
- `src/server/validation`: schemas Zod.
- `src/server/automation`: fila/automação de recuperação.
- `src/lib`: utilitários, auth token, env, logger, tipos e dados demo.
- `prisma`: schema e seed.
- `tests/unit`: testes de regras puras.
- `tests/integration`: testes de fluxos e webhooks.
- `docs`: documentação técnica.

## Convenções de Código

- Use TypeScript estrito.
- Prefira funções pequenas, tipadas e com responsabilidades claras.
- Não coloque regra de negócio em componentes visuais.
- Componentes React devem chamar APIs, receber dados ou disparar ações; regras devem viver em `src/server/services`.
- Validação de entrada deve usar Zod em `src/server/validation`.
- Acesso a banco e fallback demo devem ficar em `src/server/repositories`.
- Providers externos devem ser acessados por interfaces, nunca diretamente dentro de páginas.
- Use `apply_patch` para edições manuais.
- Não faça refactors amplos fora do escopo da tarefa.
- Não reverta alterações do usuário sem pedido explícito.
- Mantenha UI responsiva, acessível e consistente com o dashboard operacional existente.

## Comandos de Desenvolvimento

Instalar dependências:

```bash
npm install
```

Gerar Prisma Client:

```bash
npm run db:generate
```

Subir app local:

```bash
npm run dev
```

Subir PostgreSQL local:

```bash
docker compose up -d postgres
```

Rodar migração e seed:

```bash
npm run db:migrate
npm run db:seed
```

No Windows PowerShell, se `npm` estiver bloqueado por política de scripts, use `npm.cmd`.

## Comandos de Teste

Rodar testes:

```bash
npm run test
```

Rodar typecheck:

```bash
npm run typecheck
```

Rodar lint:

```bash
npm run lint
```

## Comandos de Build

Build de produção:

```bash
npm run build
```

Start após build:

```bash
npm run start
```

## Regras Para Providers Externos

- Sempre use interfaces para integrações:
  - `WhatsAppProvider`
  - `PaymentProvider`
  - `AdsProvider`
  - `TrackingProvider`
- Não chame APIs externas diretamente em componentes React.
- Não espalhe lógica de provider em API routes; API routes devem delegar para services/providers.
- Mantenha provider mock funcional quando credenciais reais não existirem.
- Ao adicionar um provider real, preserve o contrato existente para não reescrever telas.
- Para WhatsApp local sem BM verificada, priorize `EvolutionWhatsAppProvider` com QR code antes de Meta Cloud API.
- Se a documentação externa estiver incompleta, implemente adapter mockado e deixe TODO explícito no provider.

## Regras Para Webhooks

- Webhooks devem ficar em `src/app/api/webhooks/*`.
- Sempre valide payloads com Zod.
- Sempre registre eventos recebidos em `WebhookEvent` quando usar banco.
- Sempre implemente deduplicação por provider, tipo de evento e id externo.
- Nunca confie cegamente no payload recebido.
- Valide assinatura HMAC quando o secret correspondente estiver configurado.
- Webhooks devem delegar processamento para `src/server/services/webhooks.ts`.
- Webhook de WhatsApp deve criar cliente, conversa e mensagem quando necessário.
- Webhook de Umbrella deve criar/atualizar pagamento e disparar/cancelar recuperação.
- Webhook de Utmify deve registrar tracking e associar cliente/pagamento/oferta quando possível.

## Segurança

- Nunca exponha secrets no frontend.
- Nunca hardcode tokens, API keys, webhook secrets ou senhas reais.
- Use variáveis de ambiente e mantenha `.env.example` atualizado.
- Cookies de sessão devem permanecer HTTP-only.
- Logs devem mascarar dados sensíveis.
- Respeite `doNotContact` antes de qualquer envio.
- Não envie recuperação fora da janela permitida.
- Mantenha ação de anonimização de cliente funcional.
- Sanitizar entradas de usuário antes de persistir ou renderizar quando aplicável.

## Secrets

Variáveis sensíveis devem ser lidas apenas no servidor:

- `AUTH_SECRET`
- `CONFIG_ENCRYPTION_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WEBHOOK_SECRET`
- `UMBRELLA_API_KEY`
- `UMBRELLA_WEBHOOK_SECRET`
- `UTMIFY_API_KEY`
- `UTMIFY_WEBHOOK_SECRET`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN`

Ao adicionar nova integração, inclua a variável em `.env.example` e documente no README.

## Fluxo de Recuperação de Pagamentos

1. Pagamento chega via webhook ou é criado no sistema.
2. Status recuperáveis:
   - `PENDING`
   - `WAITING_PAYMENT`
   - `PIX_GENERATED`
   - `BOLETO_GENERATED`
   - `FAILED`
   - `EXPIRED`, se a oferta permitir.
3. Serviço de recuperação verifica:
   - Cliente existe.
   - Cliente tem telefone.
   - Cliente não está em `doNotContact`.
   - Oferta permite recuperação.
   - Existe `RecoveryFlow` ativo.
   - Horário de envio está dentro da janela permitida.
4. Sistema agenda `RecoveryAttempt`.
5. Envio usa `WhatsAppProvider`.
6. Ao detectar pagamento `PAID`, tentativas pendentes/enviadas são marcadas como convertidas/canceladas.
7. Toda alteração crítica deve ser testada.

Regras desse fluxo ficam em `src/server/services/recovery.ts`. Não duplique essa lógica em páginas, componentes ou API routes.

## Como Validar Uma Mudança

Antes de finalizar qualquer alteração, execute:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Quando mexer em Prisma:

```bash
npm run db:generate
```

Quando houver PostgreSQL local disponível:

```bash
npm run db:migrate
npm run db:seed
```

Também faça smoke test manual quando a mudança afetar UX crítica:

- Login.
- Dashboard.
- Inbox WhatsApp.
- Envio de mensagem mockada.
- Webhook de WhatsApp.
- Webhook de Umbrella pendente.
- Webhook de Umbrella pago.
- Tela de recuperações.

## Checklist Obrigatório Para Codex

Antes de concluir uma tarefa:

- Respeitou a arquitetura modular?
- Evitou regra de negócio em componente visual?
- Usou interfaces para providers externos?
- Escreveu ou atualizou testes para regras críticas?
- Atualizou `README.md` ou `docs/*` quando criou feature nova?
- Atualizou `.env.example` quando adicionou configuração?
- Rodou typecheck, lint, testes e build?
- Documentou qualquer falha de validação que dependa de serviço externo ou credencial?

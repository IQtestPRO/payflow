# WhatsApp local com Evolution API

Este é o caminho recomendado para validar o WhatsApp do PayFlow enquanto a BM do Facebook ainda não está verificada.

O fluxo usa a Evolution API como ponte de WhatsApp Web:

1. Evolution API roda localmente em Docker.
2. PayFlow cria uma instância chamada `payflow-local`.
3. Você escaneia o QR code pelo aplicativo do WhatsApp.
4. A Evolution envia mensagens recebidas para `POST /api/webhooks/whatsapp`.
5. A inbox do PayFlow registra e responde pela interface.

## Variáveis locais

Use estas variáveis no ambiente em que o Next.js roda:

```bash
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=payflow-evolution-local-key
EVOLUTION_INSTANCE_NAME=payflow-local
APP_URL=http://localhost:3000
WHATSAPP_WEBHOOK_SECRET=
```

Para desenvolvimento local, deixe `WHATSAPP_WEBHOOK_SECRET` vazio. Se configurar um secret, o webhook passa a exigir assinatura HMAC e a Evolution precisa enviar essa assinatura.

## Subir a Evolution local

```bash
docker compose up -d evolution-api
```

O Compose também sobe `evolution-postgres` e `evolution-redis`.

Abra:

```text
http://localhost:8080
```

Se a API estiver viva, ela responde com status e links do manager/docs.

## Conectar o WhatsApp

1. Rode o PayFlow com `npm run dev`.
2. Acesse `/integracoes`.
3. Na seção WhatsApp, clique em `Criar`.
4. Clique em `Gerar QR`.
5. Escaneie pelo app do WhatsApp em `Aparelhos conectados`.
6. Clique em `Webhook`.
7. Envie uma mensagem para o número conectado.
8. Confira a conversa em `/inbox`.

## Testar envio

Na própria tela `/integracoes`, informe um telefone com DDI e clique em `Enviar mensagem`.

Também é possível responder uma conversa real em `/inbox`; o envio passa por `WhatsAppProvider`, então a tela não conhece detalhes da Evolution.

## Limitações do modo local

- Depende do WhatsApp Web permanecer conectado.
- Não substitui a Cloud API oficial para escala e uso corporativo.
- Não deve ser usado para spam.
- Recuperações respeitam `doNotContact`, janela permitida e limite de tentativas.
- Para produção, use HTTPS, API key forte, backups, logs e monitoramento.

## Produção futura

Quando o MVP estiver validado, há dois caminhos:

- manter Evolution API em um servidor barato com HTTPS e domínio próprio;
- migrar para WhatsApp Cloud API quando a BM/número estiverem prontos.

A interface do PayFlow não precisa ser reescrita, porque a troca acontece dentro de `src/providers/whatsapp`.

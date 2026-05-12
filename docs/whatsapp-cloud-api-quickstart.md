# WhatsApp Cloud API: início rápido para PayFlow

Objetivo: colocar o WhatsApp funcionando no PayFlow da forma mais simples, oficial e gratuita possível para teste, mesmo com a Business Manager ainda não verificada.

## Estratégia Recomendada Agora

Começar com o número de teste da Meta.

Esse caminho permite validar:

- Envio de mensagem pelo PayFlow.
- Recebimento de mensagem via webhook.
- Criação automática de cliente/conversa.
- Resposta pela inbox.

Depois que o fluxo estiver validado, trocamos para número real, token permanente e templates próprios aprovados.

## Limitações com BM Não Verificada

- Comece em modo teste para evitar bloqueios iniciais.
- Para produção, a conta pode ter limite reduzido de mensagens iniciadas pela empresa.
- Respostas dentro da janela de atendimento continuam sendo o uso mais simples.
- Mensagens ativas de recuperação fora da janela de 24h devem usar templates aprovados.
- O número de teste da Meta só envia para destinatários de teste adicionados no painel.

## Dados Necessários

No `.env`:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=cole_o_temporary_access_token
WHATSAPP_PHONE_NUMBER_ID=cole_o_phone_number_id
WHATSAPP_VERIFY_TOKEN=payflow-whatsapp-local
WHATSAPP_WEBHOOK_SECRET=
```

Para produção, `WHATSAPP_WEBHOOK_SECRET` deve ser o segredo usado para validar assinatura, normalmente alinhado ao app secret/estratégia definida.

## Passo a Passo Meta

1. Acesse `https://developers.facebook.com/apps`.
2. Crie um app do tipo Business.
3. Adicione o produto WhatsApp.
4. Vá em WhatsApp > API Setup.
5. Use o número de teste da Meta.
6. Adicione seu telefone pessoal como destinatário de teste.
7. Copie:
   - Temporary access token.
   - Phone number ID.
8. Coloque os valores no `.env`.
9. Reinicie `npm run dev`.

## Configurar Webhook

Na tela `/integracoes`, copie:

- Webhook URL.
- Verify token.

Na Meta:

1. Abra a configuração de Webhooks do app.
2. Cole a Callback URL do PayFlow.
3. Cole o Verify Token.
4. Clique em Verify and Save.
5. Assine o campo `messages`.

Para webhook local, use uma URL pública via deploy, ngrok ou Cloudflare Tunnel. `localhost` não funciona direto para a Meta.

## Teste de Envio

Na tela `/integracoes`, use “Enviar hello_world”.

Esse teste usa:

- Template: `hello_world`
- Idioma: `en_US`

É o caminho mais seguro para o primeiro envio, porque mensagem de texto livre só funciona quando já existe janela de atendimento aberta.

## Teste de Recebimento

Depois do webhook configurado:

1. Responda pelo WhatsApp à mensagem recebida.
2. Abra `/inbox`.
3. A conversa deve aparecer automaticamente.

## Próxima Etapa

Quando o teste estiver funcionando:

1. Criar token permanente via System User.
2. Adicionar número real.
3. Criar templates de recuperação.
4. Validar opt-out.
5. Ativar recuperação de pagamentos pendentes por WhatsApp.

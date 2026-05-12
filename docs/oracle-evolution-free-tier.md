# Evolution API na Oracle Always Free

Objetivo: hospedar a Evolution API em uma VM Oracle Cloud Always Free para o PayFlow usar WhatsApp 24/7.

Arquitetura:

```text
pay-flow.shop                 -> Vercel / PayFlow
Neon Postgres                 -> banco do PayFlow
evolution.pay-flow.shop       -> Oracle VM / Evolution API
WhatsApp webhook              -> https://pay-flow.shop/api/webhooks/whatsapp
```

## Escolha recomendada

Use uma VM Oracle Cloud Always Free:

- Shape: `VM.Standard.A1.Flex`
- Arquitetura: ARM64
- Sistema: Ubuntu 24.04 LTS ou Ubuntu 22.04 LTS
- CPU: `1 OCPU`
- RAM: `6 GB`
- Disco: `50 GB`

A imagem `evoapicloud/evolution-api:v2.3.7` tem build `arm64`, portanto funciona na Ampere A1.

## O que o usuario precisa fazer

### 1. Criar conta Oracle Cloud

Crie uma conta Oracle Cloud Free Tier. A Oracle pode pedir telefone e cartao para validacao.

### 2. Criar a VM

No painel da Oracle:

1. Acesse `Compute > Instances`.
2. Clique em `Create instance`.
3. Nome: `payflow-evolution`.
4. Image: `Ubuntu 24.04` ou `Ubuntu 22.04`.
5. Shape: `VM.Standard.A1.Flex`.
6. OCPU: `1`.
7. Memory: `6 GB`.
8. Networking: crie ou use uma VCN com subnet publica.
9. Marque para atribuir IPv4 publico.
10. SSH key: cole a chave publica gerada pelo Codex.
11. Boot volume: deixe `50 GB`.
12. Crie a instancia.

Se aparecer `Out of host capacity`, tente outra availability domain na mesma regiao ou aguarde. Isso e comum no Always Free.

### 3. Liberar portas

Na security list ou NSG da VCN, liberar entrada:

```text
TCP 22   origem seu IP ou 0.0.0.0/0 temporariamente
TCP 80   origem 0.0.0.0/0
TCP 443  origem 0.0.0.0/0
```

Nao libere `8080` publicamente. A Evolution ficara atras do Caddy em HTTPS.

### 4. Criar DNS

No DNS do dominio:

```text
A  evolution.pay-flow.shop  IP_PUBLICO_DA_VM
```

## O que o Codex faz depois

Depois que o usuario informar o IP publico da VM, o Codex executa:

```powershell
.\infra\evolution\deploy-to-oracle.ps1 -HostName IP_PUBLICO_DA_VM
```

Esse script:

1. Envia os arquivos para a VM.
2. Gera secrets fortes para Evolution e Postgres.
3. Instala Docker se necessario.
4. Libera firewall local da VM.
5. Sobe Caddy, Evolution API, Postgres e Redis.
6. Exibe o `EVOLUTION_API_KEY` para configurar na Vercel.

Depois disso, configure na Vercel:

```env
EVOLUTION_API_BASE_URL=https://evolution.pay-flow.shop
EVOLUTION_API_KEY=valor-gerado-pelo-script
EVOLUTION_INSTANCE_NAME=payflow
WHATSAPP_WEBHOOK_URL=https://pay-flow.shop/api/webhooks/whatsapp
```

## Validacao

1. `https://evolution.pay-flow.shop` deve responder.
2. `https://pay-flow.shop/api/health` deve responder.
3. Em `https://pay-flow.shop/integracoes`, criar/conectar instancia.
4. Escanear QR.
5. Enviar mensagem para o numero conectado.
6. Confirmar conversa em `https://pay-flow.shop/inbox`.
7. Responder pela inbox.

# Evolution API no Google Cloud Always Free

Este e o plano gratuito 24/7 recomendado quando Oracle Cloud bloqueia a criacao da conta.

## Por que Google Cloud

O Google Cloud Free Tier inclui uma VM `e2-micro` nao preemptiva por mes em regioes especificas dos EUA, alem de `30 GB-months` de disco persistente padrao e `1 GB` de transferencia de saida por mes. O limite de horas do `e2-micro` equivale ao total de horas do mes, ou seja, uma VM rodando 24/7 dentro das regioes elegiveis.

Fonte oficial: https://cloud.google.com/free/docs/free-cloud-features

## Limites importantes

A VM gratuita e fraca:

- `e2-micro`
- 1 GB RAM
- disco padrao de ate 30 GB dentro do free tier
- regioes elegiveis: `us-west1`, `us-central1`, `us-east1`

Por isso, nesta arquitetura a VM roda apenas:

- Evolution API
- Caddy para HTTPS
- swap de 2 GB

O banco da Evolution usa Postgres gerenciado externo, preferencialmente o Neon ja criado para o PayFlow. Redis fica desligado.

## Configuracao recomendada da VM

No Google Cloud:

1. Crie ou selecione um projeto.
2. Ative billing no projeto.
3. Ative Compute Engine API.
4. Crie uma VM em uma das regioes Always Free:
   - `us-central1`
   - `us-east1`
   - `us-west1`
5. Machine type: `e2-micro`.
6. Boot disk:
   - Ubuntu 24.04 LTS ou Ubuntu 22.04 LTS
   - Standard persistent disk
   - 30 GB ou menos
7. Firewall:
   - Allow HTTP traffic
   - Allow HTTPS traffic
8. SSH key: use a chave publica gerada pelo Codex.

## DNS

Quando a VM tiver IP publico, crie:

```text
A  evolution.pay-flow.shop  IP_PUBLICO_DA_VM
```

## Deploy

Depois que o usuario enviar o IP publico da VM, o Codex executa:

```powershell
.\infra\evolution-gcp-lite\deploy-to-gcp.ps1 -HostName IP_PUBLICO_DA_VM -DatabaseUrl "postgresql://..."
```

O script:

1. Envia os arquivos para a VM.
2. Gera `EVOLUTION_API_KEY`.
3. Instala Docker.
4. Cria swap de 2 GB.
5. Sobe Evolution + Caddy.
6. Mostra os valores para configurar na Vercel.

## Vercel

Depois do deploy da Evolution, configure:

```env
EVOLUTION_API_BASE_URL=https://evolution.pay-flow.shop
EVOLUTION_API_KEY=valor-gerado-pelo-script
EVOLUTION_INSTANCE_NAME=payflow
WHATSAPP_WEBHOOK_URL=https://pay-flow.shop/api/webhooks/whatsapp
```

Depois rode um redeploy de producao.

## Validacao

1. `https://evolution.pay-flow.shop` responde.
2. `https://pay-flow.shop/api/health` responde.
3. `https://pay-flow.shop/integracoes` abre.
4. Criar/conectar instancia.
5. Escanear QR.
6. Enviar mensagem para o numero.
7. Conferir `/inbox`.
8. Responder pela inbox.

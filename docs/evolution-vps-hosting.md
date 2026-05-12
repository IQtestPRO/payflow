# Evolution API em VPS KVM

Objetivo: manter o WhatsApp do PayFlow 24/7 em um servidor barato, usando Evolution API atrás de HTTPS.

Servidor alvo atual:

- 2048 MB RAM
- 20 GB SSD
- 1 vCPU
- 1 IPv4
- Linux
- Chicago, IL

Essa máquina é suficiente para um MVP com uma instância WhatsApp, desde que o servidor rode apenas Evolution API, Caddy, Postgres e Redis. O script cria 2 GB de swap para reduzir risco de queda por memória.

## Arquitetura

```text
pay-flow.shop                 -> Vercel / PayFlow
evolution.pay-flow.shop       -> VPS / Caddy / Evolution API
Postgres Evolution            -> container local na VPS
Redis Evolution               -> container local na VPS
Webhook WhatsApp              -> https://pay-flow.shop/api/webhooks/whatsapp
```

## DNS

No DNS do domínio, crie:

```text
A  evolution.pay-flow.shop  IP_PUBLICO_DA_VPS
```

Se o provedor exigir painel separado para IPv6, ignore por enquanto. O IPv4 público é suficiente.

## Firewall do provedor

Libere entrada:

```text
TCP 22   seu IP ou temporariamente 0.0.0.0/0
TCP 80   0.0.0.0/0
TCP 443  0.0.0.0/0
```

Não libere `8080` publicamente. A Evolution fica atrás do Caddy.

## SSH

Adicione esta chave pública no painel do servidor, se o painel permitir SSH keys:

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPUgDZGU13wlJvGNoZ1CzKB81Z2hXurCPwSUZe2Lj2Nj payflow-vps-evolution
```

Se o servidor já foi criado apenas com senha de root, faça login uma vez pelo console/painel e coloque essa chave em:

```text
/root/.ssh/authorized_keys
```

## Deploy

Depois que DNS e SSH estiverem prontos:

```powershell
.\infra\evolution\deploy-to-vps.ps1 -HostName IP_PUBLICO_DA_VPS -User root -Domain evolution.pay-flow.shop
```

O script:

1. Gera `EVOLUTION_API_KEY` forte.
2. Gera senha forte para Postgres da Evolution.
3. Sobe `.env`, `docker-compose.yml`, `Caddyfile` e `install.sh`.
4. Instala Docker quando necessário.
5. Cria swap de 2 GB se ainda não existir.
6. Libera firewall local para SSH, HTTP e HTTPS.
7. Sobe Caddy, Evolution API, Postgres e Redis.
8. Exibe os valores que precisam entrar na Vercel.

## Variáveis na Vercel

Configure em produção:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_BASE_URL=https://evolution.pay-flow.shop
EVOLUTION_API_KEY=<valor-gerado-pelo-script>
EVOLUTION_INSTANCE_NAME=payflow
WHATSAPP_WEBHOOK_URL=https://pay-flow.shop/api/webhooks/whatsapp
WHATSAPP_WEBHOOK_SECRET=
```

Depois do deploy da Vercel, entre em `/integracoes`:

1. Clique em `Criar`.
2. Clique em `Gerar QR`.
3. Escaneie pelo WhatsApp.
4. Clique em `Webhook`.
5. Envie mensagem para o número conectado.
6. Confira `/inbox`.
7. Responda pela inbox.

## Manutenção

Com 20 GB de disco, evite guardar logs grandes. O compose limita logs Docker a 3 arquivos de 10 MB por container.

Comandos úteis na VPS:

```bash
cd ~/payflow-evolution
docker compose ps
docker compose logs -f --tail=100 evolution-api
docker compose pull
docker compose up -d
df -h
free -h
```

Backup mínimo antes de mudanças grandes:

```bash
docker compose stop
tar -czf payflow-evolution-backup-$(date +%F).tar.gz .
docker compose start
```

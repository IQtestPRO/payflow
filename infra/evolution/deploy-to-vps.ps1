param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [string]$User = "root",
  [string]$Domain = "evolution.pay-flow.shop",
  [string]$KeyPath = "$HOME\.ssh\payflow_vps_ed25519",
  [string]$RemoteDir = "~/payflow-evolution",
  [string]$ApiKey = "",
  [string]$PostgresPassword = ""
)

$ErrorActionPreference = "Stop"

function New-Secret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($buffer).TrimEnd("=")
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

if (-not $ApiKey) {
  $ApiKey = New-Secret 36
}

if (-not $PostgresPassword) {
  $PostgresPassword = New-Secret 36
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$compose = Join-Path $root "docker-compose.yml"
$caddy = Join-Path $root "Caddyfile"
$install = Join-Path $root "install.sh"

foreach ($file in @($compose, $caddy, $install)) {
  if (-not (Test-Path $file)) {
    throw "Required file not found: $file"
  }
}

$envFile = New-TemporaryFile
@"
EVOLUTION_DOMAIN=$Domain
EVOLUTION_API_KEY=$ApiKey

EVOLUTION_POSTGRES_DB=evolution
EVOLUTION_POSTGRES_USER=evolution
EVOLUTION_POSTGRES_PASSWORD=$PostgresPassword

CONFIG_SESSION_PHONE_CLIENT=PayFlow
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=60
QRCODE_COLOR=#001A42

LOG_LEVEL=ERROR,WARN,INFO
"@ | Set-Content -Path $envFile -Encoding utf8

try {
  $target = "$User@$HostName"
  ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $target "mkdir -p $RemoteDir"
  scp -i $KeyPath $compose $caddy $install $envFile "${target}:$RemoteDir/"
  ssh -i $KeyPath $target "mv $RemoteDir/$($envFile.Name) $RemoteDir/.env && chmod +x $RemoteDir/install.sh && cd $RemoteDir && ./install.sh"

  Write-Host ""
  Write-Host "Evolution deployed."
  Write-Host "Domain: https://$Domain"
  Write-Host "EVOLUTION_API_KEY=$ApiKey"
  Write-Host ""
  Write-Host "Next Vercel env values:"
  Write-Host "WHATSAPP_PROVIDER=evolution"
  Write-Host "EVOLUTION_API_BASE_URL=https://$Domain"
  Write-Host "EVOLUTION_API_KEY=$ApiKey"
  Write-Host "EVOLUTION_INSTANCE_NAME=payflow"
  Write-Host "WHATSAPP_WEBHOOK_URL=https://pay-flow.shop/api/webhooks/whatsapp"
} finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}

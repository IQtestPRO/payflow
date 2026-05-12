param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [string]$User = "ubuntu",
  [string]$Domain = "evolution.pay-flow.shop",
  [string]$KeyPath = "$HOME\.ssh\payflow_oracle_ed25519",
  [string]$RemoteDir = "~/payflow-evolution",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

function New-Secret([int]$Bytes = 36) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd("=")
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

if (-not $ApiKey) {
  $ApiKey = New-Secret 36
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
EVOLUTION_DATABASE_URL=$DatabaseUrl

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
  Write-Host "EVOLUTION_API_BASE_URL=https://$Domain"
  Write-Host "EVOLUTION_API_KEY=$ApiKey"
} finally {
  Remove-Item -LiteralPath $envFile -Force -ErrorAction SilentlyContinue
}

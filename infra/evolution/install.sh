#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created infra/evolution/.env. Edit it before running this script again."
  exit 1
fi

if grep -q "change-me-" .env; then
  echo "infra/evolution/.env still contains placeholder values."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl gnupg ufw
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO systemctl enable --now docker
fi

if [ ! -f /swapfile ]; then
  $SUDO fallocate -l 2G /swapfile || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile
  $SUDO swapon /swapfile
  echo "/swapfile none swap sw 0 0" | $SUDO tee -a /etc/fstab >/dev/null
fi

$SUDO ufw allow OpenSSH
$SUDO ufw allow 80/tcp
$SUDO ufw allow 443/tcp
$SUDO ufw --force enable

$SUDO docker compose pull
$SUDO docker compose up -d
$SUDO docker compose ps

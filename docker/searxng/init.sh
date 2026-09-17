#!/usr/bin/env bash
# Сгенерировать .env с SEARXNG_SECRET, если его ещё нет.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/.env"

if [[ -f "$ENV_FILE" ]] && grep -q '^SEARXNG_SECRET=.\+' "$ENV_FILE"; then
  echo ".env уже есть: $ENV_FILE"
  exit 0
fi

SECRET="$(openssl rand -hex 32)"
printf 'SEARXNG_SECRET=%s\n' "$SECRET" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "Создан $ENV_FILE"

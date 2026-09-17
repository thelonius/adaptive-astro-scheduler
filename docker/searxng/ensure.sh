#!/usr/bin/env bash
# Поднять SearXNG после перезагрузки, когда Docker ещё не готов.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="$DIR/docker-compose.yml"
HEALTH_URL="http://127.0.0.1:8888/healthz"

for _ in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker недоступен" >&2
  exit 1
fi

if [[ ! -f "$DIR/.env" ]]; then
  "$DIR/init.sh"
fi

docker compose -f "$COMPOSE" up -d --remove-orphans

for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "контейнер запущен, но $HEALTH_URL не отвечает" >&2
exit 1

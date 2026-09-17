#!/usr/bin/env bash
# Сгенерировать Caddyfile.clients для доступа клиентов по HTTP Basic Auth.
#
# В .env задайте:
#   SEARXNG_CLIENT_BIND=192.168.1.86:8890   # LAN Mattahu (рекомендуется)
#   SEARXNG_CLIENT_USER=search
#   SEARXNG_CLIENT_PASSWORD=ваш_пароль
#
# Затем: docker compose -f docker/searxng/docker-compose.yml --profile clients up -d

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/.env"
CADDYFILE="$DIR/Caddyfile.clients"

[[ -f "$ENV_FILE" ]] || { echo "Нет $ENV_FILE — скопируйте из .env.example" >&2; exit 1; }

get_env() {
  local key="$1"
  grep -m1 "^${key}=" "$ENV_FILE" | sed "s/^${key}=//" | tr -d '\r'
}

USER_NAME="$(get_env SEARXNG_CLIENT_USER)"
PASSWORD="$(get_env SEARXNG_CLIENT_PASSWORD)"

if [[ -z "$USER_NAME" || -z "$PASSWORD" ]]; then
  echo "Задайте SEARXNG_CLIENT_USER и SEARXNG_CLIENT_PASSWORD в $ENV_FILE" >&2
  exit 1
fi

HASH="$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$PASSWORD")"

cat > "$CADDYFILE" <<EOF
# Сгенерировано init-clients.sh — не коммитить.
:8890 {
  basic_auth /* {
    ${USER_NAME} ${HASH}
  }
  reverse_proxy searxng:8080
}
EOF

chmod 600 "$CADDYFILE" 2>/dev/null || true
echo "OK: $CADDYFILE (bind: $(get_env SEARXNG_CLIENT_BIND || echo 127.0.0.1:8890))"

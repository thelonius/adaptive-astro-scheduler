#!/usr/bin/env bash
# Start bundled ephemeris + backend stack (Docker required).
set -euo pipefail
SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$SKILL_ROOT/stack"
ENV_FILE="$STACK/.env"
EXAMPLE="$STACK/.env.example"

if ! command -v docker >/dev/null; then
  echo "Docker is required to run the ephemeris + backend stack." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  if command -v openssl >/dev/null; then
    pw="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
    if sed --version 2>/dev/null | grep -q GNU; then
      sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pw}|" "$ENV_FILE"
    else
      sed -i '' "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pw}|" "$ENV_FILE"
    fi
    echo "Created $ENV_FILE with a random POSTGRES_PASSWORD"
  else
    echo "Created $ENV_FILE — set POSTGRES_PASSWORD before continuing" >&2
    exit 1
  fi
  chmod 600 "$ENV_FILE" 2>/dev/null || true
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PORT="${ASTRO_BIND_PORT:-3000}"
echo "--- pull images (backend + ephemeris from ghcr) ---"
(
  cd "$STACK"
  docker compose -f docker-compose.yml --env-file .env pull
  docker compose -f docker-compose.yml --env-file .env up -d
)

echo "--- wait for API on 127.0.0.1:${PORT} ---"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "OK $(curl -sf "http://127.0.0.1:${PORT}/health")"
    echo "Export: ASTRO_API_URL=http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 3
done

echo "API not healthy yet. Check: docker compose -f $STACK/docker-compose.yml logs backend" >&2
exit 1

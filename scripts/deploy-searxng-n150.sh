#!/usr/bin/env bash
# Деплой SearXNG на n150 (Mattahu). Конфиг из репозитория, образ searxng/searxng:latest.
#
#   ./scripts/deploy-searxng-n150.sh
#
# SSH: developer@95.165.10.115:22299, ключ ~/.ssh/id_ed25519_n150_server2_developer
# Чекout: ~/apps/astro, compose: docker/searxng/docker-compose.yml

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"
OLD_SEARXNG_DIR="${N150_OLD_SEARXNG_DIR:-~/apps/searxng}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

echo "Деплой SearXNG на n150"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
SEARXNG_DIR="docker/searxng"
COMPOSE="docker compose -f \$SEARXNG_DIR/docker-compose.yml"
COMPOSE_CLIENTS="\$COMPOSE --profile clients"
OLD_DIR="\${HOME}/apps/searxng"

echo "--- git sync ---"
git fetch origin main
git reset --hard origin/main

echo "--- .env ---"
if [[ ! -f "\$SEARXNG_DIR/.env" && -f "\$OLD_DIR/.env" ]]; then
  cp "\$OLD_DIR/.env" "\$SEARXNG_DIR/.env"
  chmod 600 "\$SEARXNG_DIR/.env"
  echo "перенесён .env из \$OLD_DIR"
fi
if [[ ! -f "\$SEARXNG_DIR/.env" ]]; then
  "\$SEARXNG_DIR/init.sh"
fi

echo "--- pull & up ---"
\$COMPOSE pull
\$COMPOSE up -d --remove-orphans

if grep -q '^SEARXNG_CLIENT_PASSWORD=.\+' "\$SEARXNG_DIR/.env" 2>/dev/null; then
  echo "--- clients gateway (Basic Auth) ---"
  chmod +x "\$SEARXNG_DIR/init-clients.sh"
  "\$SEARXNG_DIR/init-clients.sh"
  \$COMPOSE_CLIENTS pull
  \$COMPOSE_CLIENTS up -d --remove-orphans
  BIND=\$(grep -m1 '^SEARXNG_CLIENT_BIND=' "\$SEARXNG_DIR/.env" | cut -d= -f2-)
  echo "Клиентский URL: http://\${BIND%:*}:\${BIND#*:} (логин в .env SEARXNG_CLIENT_USER)"
else
  echo "Клиентский шлюз выключен — задайте SEARXNG_CLIENT_PASSWORD в \$SEARXNG_DIR/.env и init-clients.sh"
fi

echo "--- sync websearch skill ---"
mkdir -p ~/.agents/skills
rsync -a --delete skills/websearch/ ~/.agents/skills/websearch/ 2>/dev/null || cp -a skills/websearch ~/.agents/skills/

echo "--- status ---"
\$COMPOSE ps
for _ in \$(seq 1 30); do
  if curl -fsS http://127.0.0.1:8888/healthz >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -sf http://127.0.0.1:8888/healthz
echo
python3 ~/.agents/skills/websearch/search.py search "test searxng" -n 2
REMOTE

echo "Готово."

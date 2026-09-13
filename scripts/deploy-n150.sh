#!/usr/bin/env bash
# Деплой API-стека на n150 (Mattahu). Образы из ghcr, код — в контейнерах.
#
#   ./scripts/deploy-n150.sh              # origin/main
#   ./scripts/deploy-n150.sh 97c6785     # конкретный SHA
#
# SSH: developer@95.165.10.115:22299, ключ ~/.ssh/id_ed25519_n150_server2_developer
# Чекout на сервере: ~/apps/astro, compose: docker/docker-compose.n150.yml

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"
IMAGE_PREFIX="ghcr.io/thelonius/adaptive-astro-scheduler"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  echo "Windows: %USERPROFILE%\\.ssh\\id_ed25519_n150_server2_developer" >&2
  exit 1
fi

SHA="${1:-}"
if [[ -z "$SHA" ]]; then
  SHA="$(git -C "$(dirname "$0")/.." rev-parse origin/main)"
fi

echo "Деплой на n150, образы: $SHA"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
COMPOSE="docker compose -p astro -f docker/docker-compose.n150.yml"
SHA="${SHA}"
IMAGE_PREFIX="${IMAGE_PREFIX}"

echo "--- git sync ---"
git fetch origin main
git reset --hard origin/main

echo "--- .env image tags (root + docker/) ---"
for f in .env docker/.env; do
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=\${IMAGE_PREFIX}/backend:\${SHA}|" "\$f"
  sed -i "s|^EPHEMERIS_IMAGE=.*|EPHEMERIS_IMAGE=\${IMAGE_PREFIX}/ephemeris:\${SHA}|" "\$f"
done
grep BACKEND .env docker/.env

echo "--- pull & up ---"
\$COMPOSE pull
\$COMPOSE up -d --remove-orphans

echo "--- migrate ---"
\$COMPOSE exec -T backend npm run migrate 2>/dev/null || true

echo "--- status ---"
\$COMPOSE ps
curl -sf http://127.0.0.1:3000/health
echo
REMOTE

echo "Готово."

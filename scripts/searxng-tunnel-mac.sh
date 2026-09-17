#!/usr/bin/env bash
# SSH-туннель: SearXNG n150 → localhost:8888 на Mac.
#
#   ./scripts/searxng-tunnel-mac.sh
#
# Пока скрипт работает: http://127.0.0.1:8888
# Ctrl+C — туннель закрывается.

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
LOCAL_PORT="${SEARXNG_LOCAL_PORT:-8888}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

echo "Туннель: http://127.0.0.1:${LOCAL_PORT} → n150:127.0.0.1:8888"
echo "Проверка (в другом терминале): curl -s http://127.0.0.1:${LOCAL_PORT}/healthz"
echo "Остановка: Ctrl+C"
echo

exec ssh -N \
  -L "${LOCAL_PORT}:127.0.0.1:8888" \
  -i "$SSH_KEY" \
  -p "$SSH_PORT" \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=60 \
  "${SSH_USER}@${SSH_HOST}"

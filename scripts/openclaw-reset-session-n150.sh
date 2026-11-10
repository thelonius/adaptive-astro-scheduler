#!/usr/bin/env bash
# Сброс зависшей Telegram-сессии OpenClaw на n150.
#
# Симптом: бот молчит, в логах
#   dispatch failed: attempt disposed before transcript write
#
#   ./scripts/openclaw-reset-session-n150.sh
#   OPENCLAW_RESET_TEST=0 ./scripts/openclaw-reset-session-n150.sh

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
KEEP_LINES="${OPENCLAW_RESET_LINES:-5}"
DO_TEST="${OPENCLAW_RESET_TEST:-1}"
TELEGRAM_CHAT="${OPENCLAW_TELEGRAM_CHAT:-263567616}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

echo "=== OpenClaw session reset (n150) ==="

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=30 \
  "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
KEEP_LINES="${KEEP_LINES}"
DO_TEST="${DO_TEST}"
TELEGRAM_CHAT="${TELEGRAM_CHAT}"

echo "1/3 restart gateway"
systemctl --user restart openclaw-gateway.service
sleep 5
systemctl --user is-active openclaw-gateway.service

echo "2/3 compact agent:main:main (keep \${KEEP_LINES} lines)"
openclaw sessions compact "agent:main:main" --max-lines "\${KEEP_LINES}" --timeout 120000

echo "3/3 session state"
openclaw sessions list 2>&1 | head -8

if [[ "\${DO_TEST}" == "1" ]]; then
  echo "test ping -> telegram:\${TELEGRAM_CHAT}"
  openclaw agent -m "пинг: ответь одним словом «жив»" \
    --channel telegram --to "\${TELEGRAM_CHAT}" --deliver \
    --model anthropic/claude-sonnet-4-6 --timeout 60
fi

echo "done"
REMOTE

echo "Готово. Если бот всё ещё молчит — в Telegram отправь /new."

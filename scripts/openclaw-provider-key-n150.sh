#!/usr/bin/env bash
# Подключить/обновить провайдер OpenClaw на n150 по API-ключу.
#
#   OPENCLAW_PROVIDER=rusgpt OPENCLAW_API_KEY=sk-... ./scripts/openclaw-provider-key-n150.sh
#   ./scripts/openclaw-provider-key-n150.sh rusgpt sk-...
#
# Сделать модель основной и перезапустить gateway:
#   OPENCLAW_PRIMARY_MODEL=rusgpt/z-ai/glm-4.7-flash OPENCLAW_RESTART=1 \
#     OPENCLAW_PROVIDER=rusgpt OPENCLAW_API_KEY=sk-... ./scripts/openclaw-provider-key-n150.sh

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"

PROVIDER="${1:-${OPENCLAW_PROVIDER:-}}"
API_KEY="${2:-${OPENCLAW_API_KEY:-}}"
PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-}"
RESTART="${OPENCLAW_RESTART:-0}"

if [[ -z "$PROVIDER" || -z "$API_KEY" ]]; then
  echo "Нужны провайдер и ключ." >&2
  echo "  OPENCLAW_PROVIDER=rusgpt OPENCLAW_API_KEY=sk-... $0" >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

echo "OpenClaw n150: провайдер=$PROVIDER"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
PROVIDER='$PROVIDER'
API_KEY='$API_KEY'
PRIMARY_MODEL='$PRIMARY_MODEL'
RESTART='$RESTART'

echo "--- auth profiles (до) ---"
openclaw models auth list 2>&1 || true

echo "--- сохраняем ключ ---"
printf '%s' "\$API_KEY" | openclaw models auth paste-api-key --provider "\$PROVIDER"

if openclaw config get "models.providers.\$PROVIDER" >/dev/null 2>&1; then
  openclaw config set "models.providers.\$PROVIDER.apiKey" "\$API_KEY"
  echo "обновлён models.providers.\$PROVIDER.apiKey"
fi

if [[ -n "\$PRIMARY_MODEL" ]]; then
  echo "--- primary model: \$PRIMARY_MODEL ---"
  openclaw config set agents.defaults.model.primary "\$PRIMARY_MODEL"
fi

echo "--- auth profiles (после) ---"
openclaw models auth list 2>&1

echo "--- тест ---"
if [[ -n "\$PRIMARY_MODEL" ]]; then
  openclaw agent --local -m "ответь одним словом: ок" --model "\$PRIMARY_MODEL" 2>&1 | tail -8
else
  echo "OPENCLAW_PRIMARY_MODEL не задан — тест пропущен"
fi

if [[ "\$RESTART" == "1" ]]; then
  systemctl --user enable openclaw-gateway.service
  systemctl --user restart openclaw-gateway.service
  sleep 2
  systemctl --user is-active openclaw-gateway.service
fi
REMOTE

echo "Готово."

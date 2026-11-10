#!/usr/bin/env bash
# Переавторизация Anthropic для OpenClaw на n150.
#
#   ./scripts/openclaw-auth-n150.sh              # setup-token с Mac → paste на n150
#   ./scripts/openclaw-auth-n150.sh --paste      # вставить токен вручную на сервере
#   ./scripts/openclaw-auth-n150.sh --cli        # openclaw models auth login --method cli
#
# Запускайте в Terminal.app на Mac (нужен TTY).
#
# API key (без OAuth):
#   OPENCLAW_PROVIDER=anthropic OPENCLAW_API_KEY=sk-ant-... ./scripts/openclaw-provider-key-n150.sh

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"
MODE="${1:-setup-token}"
PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-anthropic/claude-sonnet-4-6}"
RESTART="${OPENCLAW_RESTART:-1}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

if [[ ! -t 0 ]]; then
  echo "Нужен интерактивный терминал (TTY)." >&2
  echo "Запустите в Terminal.app: cd ~/adaptive-astro-scheduler && ./scripts/openclaw-auth-n150.sh" >&2
  exit 1
fi

SSH_CMD=(ssh -t -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}")

proxy_prefix='if curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 8 https://1.1.1.1 2>/dev/null; then source ./scripts/n150-proxy-env.sh && echo "Прокси: HTTP_PROXY=$HTTP_PROXY"; else echo "WARN: sing-box не отвечает" >&2; fi'

case "$MODE" in
  --paste)
    echo "=== Вставьте OAuth-токен (Ctrl+D после вставки) ==="
    "${SSH_CMD[@]}" "cd ${REMOTE_DIR} && ${proxy_prefix} && openclaw models auth paste-token --provider anthropic"
    ;;
  --cli)
    echo "=== OpenClaw auth login (method cli) ==="
    "${SSH_CMD[@]}" "cd ${REMOTE_DIR} && ${proxy_prefix} && openclaw models auth login --provider anthropic --method cli --force"
    ;;
  setup-token|--setup-token|"")
    echo "=== 1/2: claude setup-token на Mac (откроется браузер) ==="
    if ! command -v claude >/dev/null 2>&1; then
      echo "Нет claude CLI на Mac. Установите или используйте: $0 --paste" >&2
      exit 1
    fi
    TOKEN="$(claude setup-token 2>/dev/null | tail -1 | tr -d '[:space:]')"
    if [[ -z "$TOKEN" ]]; then
      echo "Не получил токен. Запустите вручную: claude setup-token" >&2
      exit 1
    fi
    echo "=== 2/2: сохраняем на n150 ==="
    printf '%s' "$TOKEN" | ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no \
      "${SSH_USER}@${SSH_HOST}" \
      "cd ${REMOTE_DIR} && ${proxy_prefix} && openclaw models auth paste-token --provider anthropic"
    ;;
  *)
    echo "Неизвестный режим: $MODE (setup-token | --paste | --cli)" >&2
    exit 1
    ;;
esac

echo
echo "=== Проверка и переключение primary → ${PRIMARY_MODEL} ==="
ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
openclaw models auth list 2>&1 | grep -i anthropic || openclaw models auth list
openclaw config set agents.defaults.model.primary "${PRIMARY_MODEL}"
if [[ "${RESTART}" == "1" ]]; then
  systemctl --user restart openclaw-gateway.service
  sleep 2
  systemctl --user is-active openclaw-gateway.service
fi
openclaw config get agents.defaults.model
REMOTE

echo "Готово."

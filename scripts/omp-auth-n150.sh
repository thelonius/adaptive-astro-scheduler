#!/usr/bin/env bash
# Anthropic OAuth для omp на n150.
#
#   ./scripts/omp-auth-n150.sh              # claude setup-token на Mac → n150
#   ./scripts/omp-auth-n150.sh --paste      # вставить токен вручную (TTY)
#   ./scripts/omp-auth-n150.sh --from-openclaw  # скопировать токен из OpenClaw (на сервере)
#
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
MODE="${1:-setup-token}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

SSH_BASE=(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}")

save_token_remote() {
  local token="$1"
  "${SSH_BASE[@]}" "mkdir -p ~/.config/omp && printf '%s\n' \"export ANTHROPIC_OAUTH_TOKEN='${token}'\" > ~/.config/omp/anthropic.env && chmod 600 ~/.config/omp/anthropic.env"
}

case "$MODE" in
  --from-openclaw)
    echo "=== Копируем Anthropic OAuth из OpenClaw → omp (та же сессия) ==="
    LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
    scp -i "$SSH_KEY" -P "$SSH_PORT" -o StrictHostKeyChecking=no \
      "$LOCAL_REPO/scripts/omp-sync-auth-from-openclaw.sh" \
      "${SSH_USER}@${SSH_HOST}:/tmp/omp-sync-auth-from-openclaw.sh"
    "${SSH_BASE[@]}" "chmod +x /tmp/omp-sync-auth-from-openclaw.sh && /tmp/omp-sync-auth-from-openclaw.sh && rm -f /tmp/omp-sync-auth-from-openclaw.sh"
    ;;
  --paste)
    if [[ ! -t 0 ]]; then
      echo "Запустите в Terminal.app: cd ~/adaptive-astro-scheduler && ./scripts/omp-auth-n150.sh --paste" >&2
      exit 1
    fi
    echo "=== Вставьте OAuth-токен (Ctrl+D после вставки) ==="
    TOKEN="$(cat)"
    TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"
    if [[ -z "$TOKEN" ]]; then
      echo "Пустой токен" >&2
      exit 1
    fi
    save_token_remote "$TOKEN"
    ;;
  setup-token|--setup-token|"")
    if [[ ! -t 0 ]]; then
      echo "Запустите в Terminal.app: cd ~/adaptive-astro-scheduler && ./scripts/omp-auth-n150.sh" >&2
      exit 1
    fi
    if ! command -v claude >/dev/null 2>&1; then
      echo "Нужен claude CLI на Mac (claude setup-token)" >&2
      exit 1
    fi
    echo "=== 1/2: claude setup-token на Mac ==="
    TOKEN="$(claude setup-token 2>/dev/null | tail -1 | tr -d '[:space:]')"
    if [[ -z "$TOKEN" ]]; then
      echo "Не получил токен" >&2
      exit 1
    fi
    echo "=== 2/2: сохраняем для omp на n150 ==="
    save_token_remote "$TOKEN"
    ;;
  *)
    echo "Неизвестный режим: $MODE (setup-token | --paste | --from-openclaw)" >&2
    exit 1
    ;;
esac

echo "Готово. Проверка: ./scripts/omp-n150.sh -p 'ответь одним словом: ок'"

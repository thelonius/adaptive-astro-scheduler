#!/usr/bin/env bash
# Локальный запуск omp на n150 (вызывается из omp-n150.sh или по SSH).
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"

# Anthropic OAuth (omp-auth-n150.sh)
if [[ -f "${HOME}/.config/omp/anthropic.env" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.config/omp/anthropic.env"
fi

if ! command -v omp >/dev/null 2>&1; then
  echo "omp не установлен. С Mac: ./scripts/install-omp-n150.sh" >&2
  exit 1
fi

# sing-box → VLESS (тот же путь, что openclaw-gateway)
if curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 8 https://1.1.1.1 2>/dev/null; then
  # shellcheck source=/dev/null
  source "$DIR/scripts/n150-proxy-env.sh"
else
  echo "WARN: sing-box :7890 не отвечает — API без прокси" >&2
fi

OVERLAY="${HOME}/.omp/agent/config.overlay.n150.yml"
CONFIG_ARGS=()
if [[ -f "$OVERLAY" ]]; then
  CONFIG_ARGS+=(--config "$OVERLAY")
fi

cd "$DIR"
exec omp "${CONFIG_ARGS[@]}" --cwd "$DIR" "$@"

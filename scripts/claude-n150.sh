#!/usr/bin/env bash
# Claude Code на n150. Если sing-box поднят — трафик через VLESS-прокси.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"

if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:7890 2>/dev/null; then
  # shellcheck source=/dev/null
  source "$DIR/scripts/n150-proxy-env.sh"
elif [[ -f "$DIR/docker/sing-box-proxy/config.json" ]]; then
  echo "Прокси настроен, но не запущен. Запустите: $DIR/docker/sing-box-proxy/ensure.sh" >&2
  exit 1
fi

exec claude "$@"

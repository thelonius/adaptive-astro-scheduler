#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$DIR/scripts/n150-proxy-env.sh"
if ! curl -fsS -x "$HTTPS_PROXY" -o /dev/null --max-time 8 https://api.anthropic.com 2>/dev/null; then
  echo "Прокси не отвечает. Запустите: $DIR/docker/sing-box-proxy/ensure.sh" >&2
  exit 1
fi
exec claude "$@"

#!/usr/bin/env bash
# Вход Claude Code на n150 без браузера на сервере.
#
# Запуск на сервере:
#   ./scripts/claude-auth-n150.sh
#   ./scripts/claude-auth-n150.sh dubnitsky@gmail.com
#
# Claude выведет ссылку — откройте её на Mac или телефоне, подтвердите email/OAuth.

set -euo pipefail

EMAIL="${1:-dubnitsky@gmail.com}"

echo "=== Claude Code: текущая сессия ==="
claude auth status 2>&1 || true
echo

if claude auth status 2>/dev/null | grep -q '"loggedIn": true'; then
  echo "Уже залогинен. Для перелогина: claude auth logout && $0"
  exit 0
fi

echo "=== Вход (подтверждение по email / OAuth в вашем браузере) ==="
echo "Email: $EMAIL"
echo
echo "Сейчас появится ссылка — откройте её на Mac или телефоне, не на сервере."
echo

unset DISPLAY BROWSER 2>/dev/null || true

DIR="$(cd "$(dirname "$0")/.." && pwd)"
if curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 8 https://1.1.1.1 2>/dev/null; then
  # shellcheck source=/dev/null
  source "$DIR/scripts/n150-proxy-env.sh"
  echo "Прокси: HTTP_PROXY=$HTTP_PROXY"
else
  echo "WARN: sing-box не отвечает — login пойдёт напрямую с IP сервера" >&2
fi

exec claude auth login --email "$EMAIL"

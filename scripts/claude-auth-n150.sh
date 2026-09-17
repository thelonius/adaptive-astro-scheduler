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
exec claude auth login --email "$EMAIL"

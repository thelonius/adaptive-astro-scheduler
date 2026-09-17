#!/usr/bin/env bash
# Вход Claude на n150 с Mac: ссылку открываете локально.
#
#   ./scripts/n150-claude-auth-from-mac.sh
#   ./scripts/n150-claude-auth-from-mac.sh you@example.com

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
EMAIL="${1:-dubnitsky@gmail.com}"

exec ssh -t -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no \
  "${SSH_USER}@${SSH_HOST}" \
  "cd ~/apps/astro && git pull -q && ./scripts/claude-auth-n150.sh '$EMAIL'"

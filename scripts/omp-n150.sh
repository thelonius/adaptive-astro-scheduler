#!/usr/bin/env bash
# Oh My Pi на n150 с sing-box-прокси (как claude-n150.sh / openclaw-gateway).
#
#   ./scripts/omp-n150.sh                    # интерактивно (ssh -t)
#   ./scripts/omp-n150.sh -p "какой лунный день?"
#
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

REMOTE_ARGS=()
for arg in "$@"; do
  REMOTE_ARGS+=("$(printf '%q' "$arg")")
done
REMOTE_CMD="cd ${REMOTE_DIR} && ./scripts/omp-server.sh"
if ((${#REMOTE_ARGS[@]})); then
  REMOTE_CMD+=" ${REMOTE_ARGS[*]}"
fi

if [[ " $* " == *" -p "* ]] || [[ " $* " == *" --print "* ]]; then
  exec ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no \
    "${SSH_USER}@${SSH_HOST}" "$REMOTE_CMD"
fi

exec ssh -t -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no \
  "${SSH_USER}@${SSH_HOST}" "$REMOTE_CMD"

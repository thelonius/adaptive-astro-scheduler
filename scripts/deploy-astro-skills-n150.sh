#!/usr/bin/env bash
set -euo pipefail
SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}")
"${SSH[@]}" "mkdir -p ~/.agents/skills/astro-todo"
scp -i "$SSH_KEY" -P "$SSH_PORT" \
  "$LOCAL_REPO/skills/astro-todo/SKILL.md" \
  "$LOCAL_REPO/skills/astro-todo/astro_todos.py" \
  "${SSH_USER}@${SSH_HOST}:~/.agents/skills/astro-todo/"
"${SSH[@]}" 'chmod +x ~/.agents/skills/astro-todo/astro_todos.py
mkdir -p ~/apps/astro/skills/astro-todo
cp -f ~/.agents/skills/astro-todo/* ~/apps/astro/skills/astro-todo/
rm -rf ~/.openclaw/workspace/.skills/astro-todo
ln -sfn ~/apps/astro/skills/astro-todo ~/.openclaw/workspace/.skills/astro-todo
rm -rf ~/apps/astro/adaptive-astro-scheduler 2>/dev/null || true
openclaw skills list 2>&1 | grep -iE "astro|websearch" || true'

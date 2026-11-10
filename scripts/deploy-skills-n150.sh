#!/usr/bin/env bash
set -euo pipefail
SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
RESTART_GATEWAY="${OPENCLAW_RESTART:-1}"
SSH=(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}")
SCP=(scp -i "$SSH_KEY" -P "$SSH_PORT")
echo "=== deploy skills to n150 ==="
"${SSH[@]}" "mkdir -p ~/.agents/skills/astro-todo ~/.agents/skills/websearch ~/.agents/skills/astro-scheduler ~/apps/astro/skills"
"${SCP[@]}" "$LOCAL_REPO/skills/astro-todo/SKILL.md" "$LOCAL_REPO/skills/astro-todo/astro_todos.py" "${SSH_USER}@${SSH_HOST}:~/.agents/skills/astro-todo/"
"${SCP[@]}" "$LOCAL_REPO/skills/websearch/SKILL.md" "$LOCAL_REPO/skills/websearch/search.py" "${SSH_USER}@${SSH_HOST}:~/.agents/skills/websearch/"
ASTRO_SCHED="$HOME/.agents/skills/astro-scheduler"
if [[ -f "$ASTRO_SCHED/astro.py" && -f "$ASTRO_SCHED/SKILL.md" ]]; then
  "${SCP[@]}" "$ASTRO_SCHED/SKILL.md" "$ASTRO_SCHED/astro.py" "${SSH_USER}@${SSH_HOST}:~/.agents/skills/astro-scheduler/"
else
  echo "skip astro-scheduler (нет $ASTRO_SCHED)"
fi
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
chmod +x ~/.agents/skills/astro-todo/astro_todos.py ~/.agents/skills/websearch/search.py
chmod +x ~/.agents/skills/astro-scheduler/astro.py 2>/dev/null || true
mkdir -p ~/apps/astro/skills/astro-todo ~/apps/astro/skills/websearch
cp -f ~/.agents/skills/astro-todo/* ~/apps/astro/skills/astro-todo/
cp -f ~/.agents/skills/websearch/* ~/apps/astro/skills/websearch/
rm -rf ~/.openclaw/workspace/.skills/astro-todo
ln -sfn ~/apps/astro/skills/astro-todo ~/.openclaw/workspace/.skills/astro-todo
rm -rf ~/apps/astro/adaptive-astro-scheduler 2>/dev/null || true
echo "=== registry ==="
openclaw skills list 2>&1 | grep -iE 'astro|websearch' || true
echo "=== smoke ==="
curl -sf http://127.0.0.1:3000/health | head -c 80; echo
curl -sf http://127.0.0.1:8888/healthz; echo
python3 ~/.agents/skills/websearch/search.py search "test" -n 2 | head -6
REMOTE
if [[ "$RESTART_GATEWAY" == "1" ]]; then
  "${SSH[@]}" 'systemctl --user restart openclaw-gateway.service && sleep 2 && systemctl --user is-active openclaw-gateway.service'
  "${SSH[@]}" 'openclaw skills list 2>&1 | grep -iE "astro|websearch"'
fi
echo "Done."

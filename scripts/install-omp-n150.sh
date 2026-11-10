#!/usr/bin/env bash
# Установка Oh My Pi (omp) на n150 рядом с OpenClaw.
#
#   ./scripts/install-omp-n150.sh
#
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_HOME="${N150_REMOTE_HOME:-/home/developer}"
REMOTE_ASTRO="${REMOTE_HOME}/apps/astro"
LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"

OVERLAY_B64="$(base64 < "$LOCAL_REPO/deploy/n150/omp.config.overlay.yml" | tr -d '\n')"
SERVER_B64="$(base64 < "$LOCAL_REPO/scripts/omp-server.sh" | tr -d '\n')"

echo "=== Install Oh My Pi on n150 ==="

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=30 \
  "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
REMOTE_ASTRO="${REMOTE_ASTRO}"
OVERLAY_B64='${OVERLAY_B64}'
SERVER_B64='${SERVER_B64}'

cd "\${REMOTE_ASTRO}" 2>/dev/null || mkdir -p "\${REMOTE_ASTRO}"
cd "\${REMOTE_ASTRO}"
git fetch origin main -q 2>/dev/null || true
git reset --hard origin/main -q 2>/dev/null || true

mkdir -p ~/.local/bin ~/.omp/agent "\${REMOTE_ASTRO}/scripts"
echo "\${OVERLAY_B64}" | base64 -d > ~/.omp/agent/config.overlay.n150.yml
echo "\${SERVER_B64}" | base64 -d > "\${REMOTE_ASTRO}/scripts/omp-server.sh"
chmod 755 "\${REMOTE_ASTRO}/scripts/omp-server.sh"

for rc in ~/.bashrc ~/.profile; do
  if [[ -f "\$rc" ]] && ! grep -q '.local/bin' "\$rc"; then
    echo 'export PATH="\$HOME/.local/bin:\$PATH"' >> "\$rc"
  fi
done
export PATH="\$HOME/.local/bin:\$PATH"

echo "--- install omp binary ---"
if command -v omp >/dev/null 2>&1; then
  echo "уже есть: \$(omp --version 2>&1 | head -1)"
else
  curl -fsSL --connect-timeout 20 --max-time 300 https://omp.sh/install | sh -s -- --binary
fi

echo "--- version ---"
omp --version 2>&1 | head -3

echo "--- skills ---"
mkdir -p ~/.agents/skills
for skill in astro-scheduler astro-todo websearch; do
  if [[ -d "\${REMOTE_ASTRO}/skills/\${skill}" ]]; then
    ln -sfn "\${REMOTE_ASTRO}/skills/\${skill}" ~/.agents/skills/\${skill} 2>/dev/null || \
      cp -rf "\${REMOTE_ASTRO}/skills/\${skill}" ~/.agents/skills/\${skill}
  fi
done
ls -la ~/.agents/skills 2>/dev/null || true

echo "--- smoke ---"
"\${REMOTE_ASTRO}/scripts/omp-server.sh" --version 2>&1 | head -3

echo
echo "Готово."
echo "  На сервере:  cd ~/apps/astro && ./scripts/omp-server.sh"
echo "  С Mac:       ./scripts/omp-n150.sh"
echo "  Auth:        ./scripts/omp-auth-n150.sh"
REMOTE

echo "Done."

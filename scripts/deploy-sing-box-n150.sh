#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_ENV="$ROOT/docker/sing-box-proxy/.env"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

if [[ -f "$LOCAL_ENV" ]] && grep -q '^VLESS_URI=.\+' "$LOCAL_ENV"; then
  echo "Копирую локальный docker/sing-box-proxy/.env на сервер"
  scp -i "$SSH_KEY" -P "$SSH_PORT" -o StrictHostKeyChecking=no \
    "$LOCAL_ENV" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/docker/sing-box-proxy/.env"
fi

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
PROXY_DIR="docker/sing-box-proxy"
COMPOSE="docker compose -f \$PROXY_DIR/docker-compose.yml"

git fetch origin main
git reset --hard origin/main

if [[ ! -f "\$PROXY_DIR/.env" ]] || ! grep -q '^VLESS_URI=.\+' "\$PROXY_DIR/.env"; then
  echo "Нет VLESS_URI в \$PROXY_DIR/.env" >&2
  exit 1
fi

chmod +x "\$PROXY_DIR/init.sh" "\$PROXY_DIR/ensure.sh" scripts/n150-proxy-env.sh scripts/claude-n150.sh
"\$PROXY_DIR/init.sh"
\$COMPOSE pull
\$COMPOSE up -d --remove-orphans

mkdir -p ~/.config/systemd/user/openclaw-gateway.service.d
cp deploy/n150/openclaw-gateway.proxy.conf ~/.config/systemd/user/openclaw-gateway.service.d/proxy.conf
systemctl --user daemon-reload

for _ in \$(seq 1 25); do
  curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 10 https://1.1.1.1 2>/dev/null && echo "прокси OK" && break
  sleep 1
done
curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 15 https://api.anthropic.com && echo "anthropic via proxy OK"
\$COMPOSE ps
REMOTE

echo "Готово. На сервере: ~/apps/astro/scripts/claude-n150.sh"
echo "OpenClaw: systemctl --user restart openclaw-gateway.service"

#!/usr/bin/env bash
# Статус OpenClaw на n150.

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<'REMOTE'
set -euo pipefail
echo "=== gateway ==="
systemctl --user is-enabled openclaw-gateway.service 2>&1 || true
systemctl --user is-active openclaw-gateway.service 2>&1 || true
echo
echo "=== primary model ==="
openclaw config get agents.defaults.model 2>&1
echo
echo "=== auth profiles ==="
openclaw models auth list 2>&1
echo
echo "=== providers ==="
python3 <<'PY'
import json
c = json.load(open("/home/developer/.openclaw/openclaw.json"))
for name, p in c.get("models", {}).get("providers", {}).items():
    key = p.get("apiKey", "")
    print(f"  {name}: {p.get('baseUrl')} key={'yes len='+str(len(key)) if key else 'NO'} models={len(p.get('models', []))}")
PY
REMOTE

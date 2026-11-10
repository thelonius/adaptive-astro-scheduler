#!/usr/bin/env bash
# Убрать Claude/Anthropic из OpenClaw на n150 и перезапустить gateway.
# Идемпотентно. Один SSH-сеанс (меньше шансов упереться в UFW LIMIT).
#
#   ./scripts/openclaw-remove-claude-n150.sh
#   OPENCLAW_RESTART=0 ./scripts/openclaw-remove-claude-n150.sh

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
RESTART="${OPENCLAW_RESTART:-1}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=30 \
  -o ControlMaster=auto -o "ControlPath=/tmp/n150-openclaw-%C" -o ControlPersist=300 \
  "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
RESTART=${RESTART}
python3 <<'PY'
import json, shutil, glob
from datetime import datetime, timezone

p = "/home/developer/.openclaw/openclaw.json"
shutil.copy2(p, p + ".bak-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-remove-claude-script")

with open(p) as f:
    c = json.load(f)

def is_claude_ref(s: str) -> bool:
    if not isinstance(s, str):
        return False
    s = s.lower()
    return "claude" in s or s.startswith("anthropic/")

for _prov, pdata in c.get("models", {}).get("providers", {}).items():
    models = pdata.get("models")
    if models:
        pdata["models"] = [m for m in models if not is_claude_ref(m.get("id", ""))]

dm = c.get("agents", {}).get("defaults", {}).get("models", {})
if dm:
    c["agents"]["defaults"]["models"] = {
        k: v for k, v in dm.items()
        if not is_claude_ref(k) and "anthropic" not in k.lower()
    }

def fix_model_block(block):
    if not isinstance(block, dict):
        return
    m = block.get("model")
    if isinstance(m, dict):
        if is_claude_ref(m.get("primary", "")):
            m["primary"] = "cursor-cli-native/auto"
        fb = m.get("fallbacks")
        if isinstance(fb, list):
            m["fallbacks"] = [x for x in fb if not is_claude_ref(x)]

fix_model_block(c.get("agents", {}).get("defaults", {}))
for entry in c.get("agents", {}).get("entries", {}).values():
    fix_model_block(entry)

mp = c.setdefault("agents", {}).setdefault("defaults", {}).setdefault("modelPolicy", {})
mp["allow"] = [
    x for x in mp.get("allow", [])
    if not is_claude_ref(x) and "anthropic" not in str(x).lower()
]
for must in ("cursor-cli-native/*", "aivex/*"):
    if must not in mp["allow"]:
        mp["allow"].append(must)

plugins = c.setdefault("plugins", {})
if isinstance(plugins.get("allow"), list):
    plugins["allow"] = [x for x in plugins["allow"] if x != "anthropic"]
plugins.setdefault("entries", {})["anthropic"] = {"enabled": False}
c.get("auth", {}).setdefault("profiles", {}).pop("anthropic:manual", None)

with open(p, "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("primary:", c["agents"]["defaults"]["model"])
print("modelPolicy:", c["agents"]["defaults"]["modelPolicy"])
PY

if [[ "\$RESTART" == "1" ]]; then
  systemctl --user stop openclaw-gateway.service 2>/dev/null || true
  sleep 2
  systemctl --user reset-failed openclaw-gateway.service 2>/dev/null || true
  systemctl --user start openclaw-gateway.service
  for i in \$(seq 1 15); do
    s=\$(systemctl --user is-active openclaw-gateway.service 2>/dev/null || echo dead)
    echo "gateway: \$s"
    [[ "\$s" == active ]] && break
    sleep 2
  done
fi

openclaw models list 2>&1 | grep -i claude || echo "(claude в списке нет)"
REMOTE

echo "Готово."

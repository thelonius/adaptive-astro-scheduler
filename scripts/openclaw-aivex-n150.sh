#!/usr/bin/env bash
# Подключить AIvex к OpenClaw на n150.
#
#   OPENCLAW_API_KEY=sk-... ./scripts/openclaw-aivex-n150.sh
#   OPENCLAW_API_KEY=sk-... OPENCLAW_PRIMARY_MODEL=aivex/claude-sonnet-4-5 OPENCLAW_RESTART=1 ./scripts/openclaw-aivex-n150.sh
#
#   AIVEX_BASE_URL=https://api.aivex.work/v1  (по умолчанию)

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"

API_KEY="${OPENCLAW_API_KEY:-${AIVEX_API_KEY:-}}"
BASE_URL="${AIVEX_BASE_URL:-https://api.aivex.work/v1}"
PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-}"
RESTART="${OPENCLAW_RESTART:-0}"

if [[ -z "$API_KEY" ]]; then
  echo "Нужен OPENCLAW_API_KEY (или AIVEX_API_KEY)." >&2
  echo "  OPENCLAW_API_KEY=sk-... $0" >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

echo "OpenClaw n150: AIvex $BASE_URL"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
git fetch origin main -q || true
git reset --hard origin/main -q || true

API_KEY='$API_KEY'
BASE_URL='$BASE_URL'
PRIMARY_MODEL='$PRIMARY_MODEL'
RESTART='$RESTART'
PATCH="deploy/n150/openclaw-aivex.patch.json5"

if [[ ! -f "\$PATCH" ]]; then
  echo "Нет \$PATCH — сначала git pull на сервере" >&2
  exit 1
fi

TMP_PATCH="\$(mktemp)"
sed "s|https://api.aivex.work/v1|\${BASE_URL}|g" "\$PATCH" > "\$TMP_PATCH"

echo "--- patch provider aivex ---"
openclaw config patch --file "\$TMP_PATCH"
rm -f "\$TMP_PATCH"

echo "--- save api key ---"
printf '%s' "\$API_KEY" | openclaw models auth paste-api-key --provider aivex
openclaw config set models.providers.aivex.apiKey "\$API_KEY"
openclaw config set models.providers.aivex.baseUrl "\$BASE_URL"

echo "--- fetch /v1/models ---"
MODELS_JSON="\$(curl -fsS -H "Authorization: Bearer \$API_KEY" "\${BASE_URL%/}/models" 2>/dev/null || true)"
if [[ -n "\$MODELS_JSON" ]]; then
  python3 - <<'PY' "\$MODELS_JSON" "\$BASE_URL"
import json, subprocess, sys, tempfile, os
raw, base = sys.argv[1], sys.argv[2].rstrip("/")
data = json.loads(raw)
ids = [m.get("id") for m in data.get("data", []) if m.get("id")]
if not ids:
    print("модели из API не получены — оставляем дефолт из patch")
    raise SystemExit(0)
models = []
defaults = {}
for mid in ids[:24]:
    name = mid.split("/")[-1]
    models.append({
        "id": mid,
        "name": f"{name} (aivex)",
        "reasoning": any(x in mid.lower() for x in ("claude", "o1", "o3", "reason")),
        "input": ["text", "image"],
        "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
        "contextWindow": 200000,
        "maxTokens": 64000,
        "api": "openai-completions",
    })
    defaults[f"aivex/{mid}"] = {}
patch = {
    "models": {"providers": {"aivex": {"baseUrl": base, "api": "openai-completions", "models": models}}},
    "agents": {"defaults": {"models": defaults}},
}
fd, path = tempfile.mkstemp(suffix=".json")
os.close(fd)
with open(path, "w") as f:
    json.dump(patch, f)
subprocess.run(["openclaw", "config", "patch", "--file", path, "--replace-path", "models.providers.aivex.models"], check=True)
subprocess.run(["openclaw", "config", "patch", "--file", path, "--replace-path", "agents.defaults.models"], check=True)
os.remove(path)
print(f"импортировано моделей: {len(ids)} (в конфиг до 24)")
print("примеры:", ", ".join(ids[:5]))
PY
else
  echo "GET /models недоступен — используем модели из patch"
fi

if [[ -z "\$PRIMARY_MODEL" ]]; then
  PRIMARY_MODEL="\$(openclaw models list 2>/dev/null | awk '/^aivex\\// {print \$1; exit}')"
fi
if [[ -n "\$PRIMARY_MODEL" ]]; then
  echo "--- primary: \$PRIMARY_MODEL ---"
  openclaw config set agents.defaults.model.primary "\$PRIMARY_MODEL"
fi

echo "--- auth ---"
openclaw models auth list 2>&1 | sed -n '1,12p'

echo "--- test ---"
if [[ -n "\$PRIMARY_MODEL" ]]; then
  openclaw agent --local -m "ответь одним словом: ок" --model "\$PRIMARY_MODEL" 2>&1 | tail -10
fi

if [[ "\$RESTART" == "1" ]]; then
  systemctl --user enable openclaw-gateway.service
  systemctl --user restart openclaw-gateway.service
  sleep 2
  systemctl --user is-active openclaw-gateway.service
fi
REMOTE

echo "Готово."

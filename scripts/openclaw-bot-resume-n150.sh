#!/usr/bin/env bash
# Почему молчит Telegram-бот на n150 после снятия Claude:
#   1) openclaw-gateway не active (завис в deactivating)
#   2) primary = cursor-cli-native/auto, но на СЕРВЕРЕ нет cursor-agent login
#      (логин Cursor на Mac не считается)
#
#   ./scripts/openclaw-bot-resume-n150.sh
#   OPENCLAW_FALLBACK_AIVEX=1 ./scripts/openclaw-bot-resume-n150.sh  # primary -> AIvex
#   OPENCLAW_AUTO_AIVEX_IF_NO_CURSOR=1 ./scripts/openclaw-bot-resume-n150.sh  # AIvex только если нет login

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
FALLBACK_AIVEX="${OPENCLAW_FALLBACK_AIVEX:-0}"
AUTO_AIVEX_IF_NO_CURSOR="${OPENCLAW_AUTO_AIVEX_IF_NO_CURSOR:-1}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

if ! ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=30 \
  -o ControlMaster=auto -o "ControlPath=/tmp/n150-openclaw-%C" -o ControlPersist=300 \
  -o BatchMode=yes \
  "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE
set -euo pipefail
FALLBACK_AIVEX=${FALLBACK_AIVEX}
AUTO_AIVEX_IF_NO_CURSOR=${AUTO_AIVEX_IF_NO_CURSOR}

echo "=== 0. telegram channel (n150 bot) ==="
python3 <<'PY'
import json
p = "/home/developer/.openclaw/openclaw.json"
with open(p) as f:
    c = json.load(f)
ch = c.setdefault("channels", {}).setdefault("telegram", {})
if ch.get("enabled") is not True:
    ch["enabled"] = True
    with open(p, "w") as f:
        json.dump(c, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("telegram.enabled -> true")
else:
    print("telegram.enabled already true")
PY

echo "=== 1. gateway ==="
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
sleep 2
systemctl --user reset-failed openclaw-gateway.service 2>/dev/null || true
systemctl --user start openclaw-gateway.service
for i in \$(seq 1 20); do
  s=\$(systemctl --user is-active openclaw-gateway.service 2>/dev/null || echo dead)
  echo "  attempt \$i: \$s"
  [[ "\$s" == active ]] && break
  sleep 2
done

echo
echo "=== 2. primary model ==="
openclaw config get agents.defaults.model 2>&1 || true

echo
echo "=== 3. cursor-agent on THIS host (n150) ==="
if command -v cursor-agent >/dev/null 2>&1; then
  cursor-agent --version 2>&1 | head -1 || true
  cursor-agent status 2>&1 || true
  if ! cursor-agent status 2>&1 | grep -qi 'logged in'; then
    echo "WARN: cursor-agent на n150 не залогинен. Бот с primary cursor-cli-native/* отвечать не будет."
    echo "  На сервере: cursor-agent login   (браузер на Mac через SSH -t или URL)"
    echo "  Проверка:   cursor-agent -p 'say ok'"
  fi
else
  echo "WARN: cursor-agent не найден в PATH на n150."
  NEED_AIVEX=1
fi

CURSOR_OK=0
if command -v cursor-agent >/dev/null 2>&1 && cursor-agent status 2>&1 | grep -qi 'logged in'; then
  CURSOR_OK=1
fi
if [[ "\$CURSOR_OK" != "1" && "\$AUTO_AIVEX_IF_NO_CURSOR" == "1" ]]; then
  NEED_AIVEX=1
fi

if [[ "\${NEED_AIVEX:-0}" == "1" || "\$FALLBACK_AIVEX" == "1" ]]; then
  echo
  echo "=== 4. primary -> aivex (бот снова отвечает; Cursor на n150 потом: cursor-agent login) ==="
  python3 <<'PY'
import json
p = "/home/developer/.openclaw/openclaw.json"
with open(p) as f:
    c = json.load(f)
c["agents"]["defaults"]["model"] = {
    "primary": "aivex/gpt-5.6-sol",
    "fallbacks": ["cursor-cli-native/auto"],
}
mp = c.setdefault("agents", {}).setdefault("defaults", {}).setdefault("modelPolicy", {})
allow = mp.setdefault("allow", [])
for x in ("aivex/*", "cursor-cli-native/*"):
    if x not in allow:
        allow.append(x)
with open(p, "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("primary set to aivex/gpt-5.6-sol")
PY
  systemctl --user restart openclaw-gateway.service
  sleep 4
  systemctl --user is-active openclaw-gateway.service
fi

echo
echo "=== 5. последние ошибки gateway ==="
journalctl --user -u openclaw-gateway.service -n 25 --no-pager 2>&1 | tail -25

echo
echo "=== 6. channels ==="
openclaw channels status 2>&1 | head -20 || true

echo
echo "=== 7. smoke (локально на n150) ==="
openclaw agent --local --agent main --message "ответь одним словом: ок" 2>&1 | tail -15 || true
REMOTE
then
  echo "Готово."
else
  echo "SSH на n150 не прошёл (часто UFW LIMIT: >6 connect/30s)." >&2
  echo "Подожди 2–3 минуты без ssh, затем запусти скрипт снова из Terminal.app." >&2
  exit 1
fi

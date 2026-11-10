#!/usr/bin/env bash
# Запускать НА n150 (уже в SSH на сервере).
set -euo pipefail
AUTO_AIVEX_IF_NO_CURSOR="${OPENCLAW_AUTO_AIVEX_IF_NO_CURSOR:-1}"

python3 <<'PY'
import json, os
p = os.path.expanduser("~/.openclaw/openclaw.json")
with open(p) as f:
    c = json.load(f)
ch = c.setdefault("channels", {}).setdefault("telegram", {})
if ch.get("enabled") is not True:
    ch["enabled"] = True
    with open(p, "w") as f:
        json.dump(c, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("telegram.enabled -> true")
PY

systemctl --user stop openclaw-gateway.service 2>/dev/null || true
sleep 2
systemctl --user reset-failed openclaw-gateway.service 2>/dev/null || true
systemctl --user start openclaw-gateway.service
for i in $(seq 1 20); do
  s=$(systemctl --user is-active openclaw-gateway.service 2>/dev/null || echo dead)
  echo "gateway $i: $s"
  [[ "$s" == active ]] && break
  sleep 2
done

NEED_AIVEX=0
if command -v cursor-agent >/dev/null 2>&1 && cursor-agent status 2>&1 | grep -qi 'logged in'; then
  cursor-agent status 2>&1 | head -3
else
  echo "cursor-agent not ready on n150"
  NEED_AIVEX=1
fi

if [[ "$NEED_AIVEX" == "1" && "$AUTO_AIVEX_IF_NO_CURSOR" == "1" ]]; then
  python3 <<'PY'
import json, os
p = os.path.expanduser("~/.openclaw/openclaw.json")
with open(p) as f:
    c = json.load(f)
c["agents"]["defaults"]["model"] = {"primary": "aivex/gpt-5.6-sol", "fallbacks": ["cursor-cli-native/auto"]}
mp = c.setdefault("agents", {}).setdefault("defaults", {}).setdefault("modelPolicy", {})
for x in ("aivex/*", "cursor-cli-native/*"):
    if x not in mp.setdefault("allow", []):
        mp["allow"].append(x)
with open(p, "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("primary -> aivex/gpt-5.6-sol")
PY
  systemctl --user restart openclaw-gateway.service
  sleep 4
fi

openclaw config get agents.defaults.model
systemctl --user is-active openclaw-gateway.service
openclaw channels status 2>&1 | head -12

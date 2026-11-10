#!/usr/bin/env bash
# На n150: скопировать Anthropic OAuth из OpenClaw → omp (та же подписка).
# Вызывается локально на сервере или через omp-auth-n150.sh --from-openclaw
set -euo pipefail

python3 - <<'PY'
import json
import os
import sqlite3

STATE_DB = os.path.expanduser("~/.openclaw/state/openclaw.sqlite")
AGENT_DB = os.path.expanduser("~/.openclaw/agents/main/agent/openclaw-agent.sqlite")
OUT = os.path.expanduser("~/.config/omp/anthropic.env")


def load_state_profiles() -> dict:
    if not os.path.exists(STATE_DB):
        return {}
    con = sqlite3.connect(STATE_DB)
    row = con.execute(
        'SELECT value_json FROM config_machine_state WHERE state_key="authProfiles.store"'
    ).fetchone()
    if not row:
        return {}
    return (json.loads(row[0]).get("profiles") or {})


def load_agent_profiles() -> dict:
    if not os.path.exists(AGENT_DB):
        return {}
    con = sqlite3.connect(AGENT_DB)
    row = con.execute(
        'SELECT store_json FROM auth_profile_store WHERE store_key="primary"'
    ).fetchone()
    if not row:
        return {}
    return (json.loads(row[0]).get("profiles") or {})


def pick_token(profiles: dict):
    for pid in ("anthropic:manual", "anthropic:default"):
        prof = profiles.get(pid) or {}
        token = prof.get("token") or prof.get("accessToken") or prof.get("access_token")
        if token:
            return token
    return None


token = None
for profiles in (load_state_profiles(), load_agent_profiles()):
    token = pick_token(profiles)
    if token:
        break

if not token:
    raise SystemExit("Не найден anthropic:manual в OpenClaw (openclaw models auth list)")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(f'export ANTHROPIC_OAUTH_TOKEN="{token}"\n')
os.chmod(OUT, 0o600)
print(f"OK: {OUT} (prefix {token[:15]}…)")
PY

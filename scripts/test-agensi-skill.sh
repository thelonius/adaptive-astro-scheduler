#!/usr/bin/env bash
# Smoke-test Agensi skill: stack + API + CLI.
#
#   ./scripts/test-agensi-skill.sh              # assume stack already up
#   ./scripts/test-agensi-skill.sh --boot       # stack-up.sh first
#   ASTRO_API_URL=http://127.0.0.1:3999 ./scripts/test-agensi-skill.sh  # remote via tunnel
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$ROOT/skills/adaptive-astro-optimal-timing"
PY="${PYTHON:-python3}"
API="${ASTRO_API_URL:-http://127.0.0.1:3000}"
BOOT=0

for arg in "$@"; do
  case "$arg" in
    --boot) BOOT=1 ;;
    -h|--help)
      grep '^#' "$0" | head -8 | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

say() { printf '==> %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

say "compile skill scripts"
$PY -m py_compile "$SKILL/scripts/plan_best_days.py" "$SKILL/scripts/task_planner.py"

if [[ "$BOOT" -eq 1 ]]; then
  say "start bundled stack"
  "$SKILL/scripts/stack-up.sh"
fi

export ASTRO_API_URL="$API"
say "health ($API)"
$PY "$SKILL/scripts/plan_best_days.py" health | $PY -c "import json,sys; d=json.load(sys.stdin); assert d.get('status')=='healthy', d" \
  || fail "health not healthy"

say "list recipes"
$PY "$SKILL/scripts/plan_best_days.py" recipes | grep -q mercury_matters \
  || fail "recipes missing mercury_matters"

FROM="$(date +%Y-%m-%d)"
TO="$(date -v+10d +%Y-%m-%d 2>/dev/null || date -d '+10 days' +%Y-%m-%d)"
say "recipe smoke $FROM .. $TO"
out="$($PY "$SKILL/scripts/plan_best_days.py" recipe mercury_matters --from "$FROM" --to "$TO" --top 3)"
echo "$out" | grep -qE 'score=' || fail "no scored windows in output"
echo "$out" | head -12

say "hybrid task_planner (temp workspace)"
TMP_WS="$(mktemp -d)"
export ASTRO_AGENT_WORKSPACE="$TMP_WS"
$PY "$SKILL/scripts/task_planner.py" add "smoke test lease" --astro \
  --recipe mercury_matters --from "$FROM" --to "$TO" --top 3 >/dev/null \
  || fail "task_planner add --astro"
$PY "$SKILL/scripts/task_planner.py" list | grep -q "smoke test" \
  || fail "task_planner list"
rm -rf "$TMP_WS"

if [[ -n "${TEST_AGENSI_INTENT:-}" ]]; then
  say "intent mode (needs NVIDIA_API_KEY on server)"
  $PY "$SKILL/scripts/plan_best_days.py" intent "schedule a short business call" \
    --from "$FROM" --to "$TO" --top 2 --language en | head -15
else
  say "skip intent (set TEST_AGENSI_INTENT=1 to enable)"
fi

say "zip package"
"$ROOT/scripts/package-agensi-skill.sh" >/dev/null
test -f "$ROOT/dist/adaptive-astro-optimal-timing.zip"

say "OK — skill smoke passed"

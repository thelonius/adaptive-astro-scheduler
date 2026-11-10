#!/usr/bin/env bash
# Build Agensi upload zip: SKILL.md + scripts + reference/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/skills/adaptive-astro-optimal-timing"
OUT="$ROOT/dist"
NAME="adaptive-astro-optimal-timing"
ZIP="$OUT/$NAME.zip"

mkdir -p "$OUT"
rm -f "$ZIP"
(
  cd "$SRC"
  zip -r "$ZIP" SKILL.md scripts stack reference -x '**/__pycache__/*' -x '**/*.pyc' -x 'stack/.env'
)
echo "Wrote $ZIP"
unzip -l "$ZIP"

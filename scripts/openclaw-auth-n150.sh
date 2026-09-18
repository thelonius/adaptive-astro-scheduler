#!/usr/bin/env bash
# Переавторизация Anthropic для OpenClaw на n150 (OAuth device code).
#
#   ./scripts/openclaw-auth-n150.sh
#
# API key (без OAuth) — отдельный скрипт:
#   OPENCLAW_PROVIDER=anthropic OPENCLAW_API_KEY=sk-ant-... ./scripts/openclaw-provider-key-n150.sh
#
# Другие провайдеры с ключом (rusgpt, nim, openai, …):
#   ./scripts/openclaw-provider-key-n150.sh <provider> <api-key>
#   ./scripts/openclaw-status-n150.sh

set -euo pipefail

echo "=== OpenClaw: профили Anthropic ==="
openclaw models auth list 2>&1 | grep -i anthropic || openclaw models auth list
echo
echo "=== Device code ==="
exec openclaw models auth login --provider anthropic --device-code --force

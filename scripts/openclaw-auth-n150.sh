#!/usr/bin/env bash
# Переавторизация Anthropic для OpenClaw на n150.
#
# Device code (код вводится на claude.ai):
#   ./scripts/openclaw-auth-n150.sh
#
# API key без браузера:
#   openclaw models auth login --provider anthropic --help

set -euo pipefail

echo "=== OpenClaw: профили Anthropic ==="
openclaw models auth list 2>&1 | grep -i anthropic || openclaw models auth list
echo
echo "=== Device code ==="
exec openclaw models auth login --provider anthropic --device-code --force

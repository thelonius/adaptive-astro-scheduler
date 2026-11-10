#!/usr/bin/env bash
set -euo pipefail
SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$SKILL_ROOT/stack"
ENV_FILE="$STACK/.env"
(
  cd "$STACK"
  docker compose -f docker-compose.yml --env-file .env down "$@"
)

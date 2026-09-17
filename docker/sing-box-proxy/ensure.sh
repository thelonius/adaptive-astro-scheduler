#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
docker info >/dev/null 2>&1 || exit 1
[[ -f "$DIR/config.json" ]] || "$DIR/init.sh"
docker compose -f "$DIR/docker-compose.yml" up -d --remove-orphans
for _ in $(seq 1 30); do
  curl -fsS -x http://127.0.0.1:7890 -o /dev/null --max-time 10 https://1.1.1.1 2>/dev/null && exit 0
  sleep 1
done
echo "прокси не отвечает" >&2; exit 1

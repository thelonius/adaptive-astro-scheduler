#!/usr/bin/env bash
# Заливка zet/corpus.jsonl в Postgres на n150 (том postgres_data, не образ).
#
#   ./scripts/load-corpus-n150.sh
#
# Нужны: локальный zet/corpus.jsonl, python3 + psycopg, SSH к n150.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
LOCAL_JSONL="$ROOT/zet/corpus.jsonl"
TUNNEL_PORT="${CORPUS_TUNNEL_PORT:-15432}"

if [[ ! -f "$LOCAL_JSONL" ]]; then
  echo "Нет $LOCAL_JSONL — сначала python3 -m scripts.ml.parse_zet" >&2
  exit 1
fi

if ! python3 -c "import psycopg" 2>/dev/null; then
  echo "Нужен psycopg: pip install 'psycopg[binary]'" >&2
  exit 1
fi

PG_IP="$(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
  "docker inspect astro_postgres --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")"
PW="$(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
  "docker exec astro_postgres printenv POSTGRES_PASSWORD")"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -f -N -L "${TUNNEL_PORT}:${PG_IP}:5432" "${SSH_USER}@${SSH_HOST}"
trap 'pkill -f "${TUNNEL_PORT}:${PG_IP}" || true' EXIT

sleep 1
python3 -m scripts.ml.load_corpus \
  --input "$LOCAL_JSONL" \
  --dsn "postgresql://postgres:${PW}@127.0.0.1:${TUNNEL_PORT}/adaptive_astro"

echo "Готово. Проверка на сервере: curl -s http://127.0.0.1:3000/api/corpus/stats"

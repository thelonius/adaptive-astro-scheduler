#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/.env"
CONFIG="$DIR/config.json"
[[ -f "$ENV_FILE" ]] || { echo "Создайте $ENV_FILE из .env.example" >&2; exit 1; }
# Не source: в vless:// есть & и ?, bash воспримет их как фоновые команды.
VLESS_URI="$(grep -m1 '^VLESS_URI=' "$ENV_FILE" | sed 's/^VLESS_URI=//' | tr -d '\r')"
[[ -n "$VLESS_URI" ]] || { echo "VLESS_URI пуст" >&2; exit 1; }
python3 "$DIR/gen_config.py" "$VLESS_URI" "$CONFIG"
chmod 600 "$ENV_FILE" "$CONFIG" 2>/dev/null || true
echo "OK: $CONFIG"

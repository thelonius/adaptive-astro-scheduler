#!/usr/bin/env bash
# Очищает диск на удалённом сервере перед деплоем.
# Использование: SERVER=user@host REMOTE_DIR=/path bash cleanup-server.sh
#
# ОСТОРОЖНО. Скрипт писался под одиночный сервер, где кроме астро ничего не
# было. Текущий прод (31.130.130.11) делит бокс с ssd-radar, gpx-tracker,
# 3x-ui и shadowbox, а `docker system prune -a --volumes` сносит неиспользуемые
# образы и тома ВСЕХ стеков на хосте, не только астро. На общем сервере это
# уничтожит чужие данные.
#
# Поэтому: хост больше не зашит в код, а prune ограничен висячими слоями.
# Если действительно нужна агрессивная чистка — делай её руками, глядя на
# `docker system df` и понимая, чьи это гигабайты.
set -euo pipefail

SERVER="${SERVER:?укажи SERVER=user@host}"
REMOTE_DIR="${REMOTE_DIR:?укажи REMOTE_DIR=/path/to/repo}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"

echo "🧹 Очистка диска на $SERVER..."

ssh -i "$SSH_KEY" "$SERVER" REMOTE_DIR="$REMOTE_DIR" bash -s <<'REMOTE'
    echo "=== Текущее использование диска ==="
    df -h /

    echo ""
    echo "=== Что занимает место в docker ==="
    docker system df

    echo ""
    echo "=== Удаление висячих слоёв (только они: -a затронул бы соседние стеки) ==="
    docker image prune -f
    docker builder prune -f

    echo ""
    echo "=== Удаление временных файлов ==="
    rm -rf "$REMOTE_DIR/zet/chroma_db" 2>/dev/null || true
    rm -rf "$REMOTE_DIR/lunar-calendar-api/swisseph_data"/*.se1 2>/dev/null || true
    rm -rf "$REMOTE_DIR/lunar-calendar-api/venv" 2>/dev/null || true
    rm -rf "$REMOTE_DIR/lunar-calendar-api/__pycache__" 2>/dev/null || true

    echo ""
    echo "=== Топ-10 самых больших директорий ==="
    du -sh "$REMOTE_DIR"/* 2>/dev/null | sort -rh | head -10

    echo ""
    echo "=== Диск после очистки ==="
    df -h /
REMOTE

echo "✅ Готово"

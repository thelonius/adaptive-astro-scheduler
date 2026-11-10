#!/bin/sh
set -eu

# Миграции идут до старта API: в production-образе есть только dist, без tsx/scripts.
if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "--- database migrate ---"
  (cd /app/backend && node dist/database/migrate.js)
fi

exec "$@"

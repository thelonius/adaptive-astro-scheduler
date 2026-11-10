-- Первичная инициализация тома Postgres (только при пустом data dir).
-- Таблицы и корпус — backend/src/database/migrations через entrypoint migrate.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

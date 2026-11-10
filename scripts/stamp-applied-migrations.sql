-- Однократно: БД накатывали вручную (psql / init), а таблицы migrations нет.
-- После этого runner считает 001–005 уже применёнными.

CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(255) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migrations (id, filename)
VALUES
  ('001_initial_schema', '001_initial_schema.sql'),
  ('002_add_chart_metadata', '002_add_chart_metadata.sql'),
  ('003_add_notifications', '003_add_notifications.sql'),
  ('004_corpus_interpretations', '004_corpus_interpretations.sql'),
  ('005_corpus_cycle_keys', '005_corpus_cycle_keys.sql')
ON CONFLICT (id) DO NOTHING;

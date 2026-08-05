-- Разделы с односоставным ключом: лунные дни, солнечные дни зороастрийского
-- календаря, стоянки и дома Луны, планетные часы. Раньше они лежали в
-- таблице без разобранного ключа, потому что подписей в файлах нет и
-- раскладку не на чем было подгонять. Расшифровка у них по соглашению
-- раздела: `[1]` в разделе лунных дней — это первый лунный день.

ALTER TABLE corpus_interpretations
  ADD COLUMN IF NOT EXISTS moon_day    SMALLINT,   -- 1..30
  ADD COLUMN IF NOT EXISTS solar_day   SMALLINT,   -- 1..32, календарь ариев
  ADD COLUMN IF NOT EXISTS mansion     SMALLINT,   -- 1..28, стоянки Луны
  ADD COLUMN IF NOT EXISTS moon_house  SMALLINT,   -- 1..28, халдейские дома Луны
  ADD COLUMN IF NOT EXISTS hour_index  SMALLINT;   -- 1..24, планетные часы

CREATE INDEX IF NOT EXISTS idx_corpus_moon_day
  ON corpus_interpretations (moon_day) WHERE moon_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corpus_solar_day
  ON corpus_interpretations (solar_day) WHERE solar_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corpus_mansion
  ON corpus_interpretations (mansion) WHERE mansion IS NOT NULL;

-- Глоссарий: общие описания планет, знаков и домов. Отдельный индекс, потому
-- что тултипы дёргают его на каждое наведение и хотят короткий текст.
CREATE INDEX IF NOT EXISTS idx_corpus_glossary
  ON corpus_interpretations (code, planet, sign, house, body_length)
  WHERE code IN ('P', 'S', 'H');

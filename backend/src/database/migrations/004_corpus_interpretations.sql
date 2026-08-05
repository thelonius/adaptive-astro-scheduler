-- Корпус интерпретаций ZET: адресуемые ключом толкования от разных авторов.
--
-- Строка = один блок текста из исходного .txt. Адресация двойная: сырой тег
-- источника (`tag`) на случай, если декодер ошибся, и разобранные поля
-- (planet/sign/house/aspect), по которым идёт реальный поиск из карты.
--
-- Наполняется скриптом scripts/ml/load_corpus.py из zet/corpus.jsonl,
-- который в свою очередь собирает scripts/ml/parse_zet.py. В git корпус
-- не хранится: пересобирается из zet/Txt4.rar за пару минут.

CREATE TABLE IF NOT EXISTS corpus_interpretations (
  id            BIGSERIAL PRIMARY KEY,

  -- Раздел базы ZET: AP аспекты, PS планета в знаке, PH планета в доме,
  -- DG градусы, TR транзиты, SNPP синастрия и так далее.
  code          TEXT   NOT NULL,
  source_file   TEXT   NOT NULL,
  author        TEXT,
  source_title  TEXT   NOT NULL,

  tag           TEXT   NOT NULL,
  label         TEXT,

  -- Разобранные координаты. NULL там, где роль неприменима: у планеты в
  -- знаке нет дома, у лунного дня нет ничего кроме номера.
  planet        TEXT,
  planet2       TEXT,
  planet3       TEXT,
  sign          TEXT,
  house         SMALLINT,
  house2        SMALLINT,
  aspect_deg    SMALLINT,
  degree        SMALLINT,           -- градус внутри знака, 1..30
  abs_degree    SMALLINT,           -- он же от 0° Овна, 1..360

  -- Откуда взялась расшифровка: fitted — подобрана по подписям самого
  -- файла, borrowed — одолжена у другого файла того же раздела,
  -- mnemonic — прочитана из буквенного ключа вроде JU.CNJ.AS.
  -- Нужно, чтобы можно было отсечь менее надёжные источники в выдаче.
  decode_source TEXT,
  decode_score  REAL,

  body          TEXT   NOT NULL,
  body_length   INT    NOT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Уникальность через COALESCE, а не через UNIQUE(source_file, tag, degree):
-- в Postgres NULL-ы в уникальном ограничении считаются различными, а degree
-- пуст у всего, кроме градусных файлов. С обычным UNIQUE повторная заливка
-- не обновляла бы строки, а дублировала их.
CREATE UNIQUE INDEX IF NOT EXISTS uq_corpus_source_tag_degree
  ON corpus_interpretations (source_file, tag, COALESCE(degree, 0));

-- Основной путь запроса: «дай толкования для этого фактора карты».
CREATE INDEX IF NOT EXISTS idx_corpus_planet_sign
  ON corpus_interpretations (code, planet, sign) WHERE planet IS NOT NULL AND sign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corpus_planet_house
  ON corpus_interpretations (code, planet, house) WHERE planet IS NOT NULL AND house IS NOT NULL;

-- Пара планет в аспекте несимметрична в ключе источника, но симметрична по
-- смыслу: «Солнце квадрат Сатурн» и «Сатурн квадрат Солнце» — одно и то же.
-- Индекс по least/greatest даёт один вход независимо от порядка.
CREATE INDEX IF NOT EXISTS idx_corpus_aspect_pair
  ON corpus_interpretations (
    code,
    LEAST(planet, planet2),
    GREATEST(planet, planet2),
    aspect_deg
  ) WHERE planet IS NOT NULL AND planet2 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corpus_degree
  ON corpus_interpretations (abs_degree) WHERE abs_degree IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corpus_code_tag
  ON corpus_interpretations (code, tag);

CREATE INDEX IF NOT EXISTS idx_corpus_author
  ON corpus_interpretations (author) WHERE author IS NOT NULL;

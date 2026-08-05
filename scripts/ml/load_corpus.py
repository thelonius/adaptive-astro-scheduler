"""Заливка zet/corpus.jsonl в таблицу corpus_interpretations.

    python -m scripts.ml.parse_zet                 # .txt → zet/corpus.jsonl
    python -m scripts.ml.load_corpus               # jsonl → Postgres

Строка адресуется парой (source_file, tag, degree), поэтому повторный
запуск не плодит дубли: ON CONFLICT обновляет текст на месте. Это важно,
потому что декодер ещё будет уточняться, а перезаливать всё с нуля при
каждой правке лексикона не хочется.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Iterator

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover
    raise SystemExit("нужен psycopg 3: pip install 'psycopg[binary]'")

COLUMNS = (
    "code", "source_file", "author", "source_title", "tag", "label",
    "planet", "planet2", "planet3", "sign", "house", "house2",
    "aspect_deg", "degree", "abs_degree",
    "moon_day", "solar_day", "mansion", "moon_house", "hour_index",
    "decode_source", "decode_score", "body", "body_length",
)

_INSERT = f"""
INSERT INTO corpus_interpretations ({", ".join(COLUMNS)})
VALUES ({", ".join("%s" for _ in COLUMNS)})
ON CONFLICT (source_file, tag, COALESCE(degree, 0)) DO UPDATE SET
  body = EXCLUDED.body,
  body_length = EXCLUDED.body_length,
  planet = EXCLUDED.planet, planet2 = EXCLUDED.planet2, planet3 = EXCLUDED.planet3,
  sign = EXCLUDED.sign, house = EXCLUDED.house, house2 = EXCLUDED.house2,
  aspect_deg = EXCLUDED.aspect_deg,
  degree = EXCLUDED.degree, abs_degree = EXCLUDED.abs_degree,
  moon_day = EXCLUDED.moon_day, solar_day = EXCLUDED.solar_day,
  mansion = EXCLUDED.mansion, moon_house = EXCLUDED.moon_house,
  hour_index = EXCLUDED.hour_index,
  decode_source = EXCLUDED.decode_source, decode_score = EXCLUDED.decode_score,
  label = EXCLUDED.label, author = EXCLUDED.author
"""


def _first(value: Any) -> Any:
    """Ключ вида `01.060,120.02` даёт список углов; в колонку кладём первый,
    остальные восстанавливаются из tag. Многоаспектных ключей мало, и
    отдельная таблица связей ради них не окупается."""
    return value[0] if isinstance(value, list) and value else (None if isinstance(value, list) else value)


def to_row(rec: dict) -> tuple:
    d = rec.get("decoded") or {}
    body = rec["text"]
    return (
        rec["code"], rec["source_file"], rec.get("author"), rec.get("source_title", ""),
        rec["tag"], rec.get("label"),
        _first(d.get("planet")), _first(d.get("planet2")), _first(d.get("planet3")),
        _first(d.get("sign")),
        _first(d.get("house")), _first(d.get("house2")),
        _first(d.get("aspect")),
        _first(d.get("degree")), _first(d.get("absolute_degree")),
        _first(d.get("moon_day")), _first(d.get("solar_day")),
        _first(d.get("mansion")), _first(d.get("moon_house")), _first(d.get("hour")),
        rec.get("decode_source"), rec.get("decode_score"),
        body, len(body),
    )


def read_jsonl(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="zet/corpus.jsonl")
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--batch", type=int, default=1000)
    ap.add_argument("--truncate", action="store_true",
                    help="снести таблицу перед заливкой (когда изменилась схема декодера)")
    args = ap.parse_args()

    if not args.dsn:
        raise SystemExit("нет DSN: задай DATABASE_URL или --dsn")
    src = Path(args.input)
    if not src.exists():
        raise SystemExit(f"нет {src}; сначала запусти python -m scripts.ml.parse_zet")

    total = 0
    with psycopg.connect(args.dsn, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            if args.truncate:
                cur.execute("TRUNCATE corpus_interpretations RESTART IDENTITY")
            batch: list[tuple] = []
            for rec in read_jsonl(src):
                if not rec.get("text"):
                    continue
                batch.append(to_row(rec))
                if len(batch) >= args.batch:
                    cur.executemany(_INSERT, batch)
                    total += len(batch)
                    batch.clear()
            if batch:
                cur.executemany(_INSERT, batch)
                total += len(batch)
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("""
                SELECT code,
                       count(*) AS records,
                       count(*) FILTER (WHERE planet IS NOT NULL
                                          OR sign IS NOT NULL
                                          OR house IS NOT NULL
                                          OR abs_degree IS NOT NULL) AS decoded
                FROM corpus_interpretations GROUP BY code ORDER BY count(*) DESC LIMIT 15
            """)
            rows = cur.fetchall()

    print(f"залито строк: {total}\n")
    print(f'{"код":<8}{"строк":>9}{"с ключом":>10}')
    for r in rows:
        print(f'{r["code"]:<8}{r["records"]:>9}{r["decoded"]:>10}')


if __name__ == "__main__":
    main()

import { pool } from '../connection';

export interface CorpusEntry {
  id: number;
  code: string;
  author: string | null;
  sourceTitle: string;
  label: string | null;
  body: string;
  bodyLength: number;
  decodeSource: string | null;
  decodeScore: number | null;
}

export interface AspectQuery {
  planet1: string;
  planet2: string;
  aspectDeg: number;
}

/** Толкования разных авторов на один фактор карты, сгруппированные по ключу. */
export interface CorpusBundle<K> {
  key: K;
  entries: CorpusEntry[];
}

export interface GlossaryTerm {
  kind: 'planet' | 'sign' | 'house';
  /** SUN / LEO / '5' — канонический идентификатор, каким он лежит в базе. */
  term: string;
  /** Короткая версия для подсказки при наведении. */
  short: { body: string; author: string | null };
  /** Развёрнутая версия для раскрытия; null, если в корпусе она одна. */
  long: { body: string; author: string | null } | null;
}

const SELECT = `
  id, code, author, source_title, label, body, body_length,
  decode_source, decode_score
`;

function toEntry(row: Record<string, unknown>): CorpusEntry {
  return {
    id: Number(row.id),
    code: String(row.code),
    author: (row.author as string | null) ?? null,
    sourceTitle: String(row.source_title ?? ''),
    label: (row.label as string | null) ?? null,
    body: String(row.body ?? ''),
    bodyLength: Number(row.body_length ?? 0),
    decodeSource: (row.decode_source as string | null) ?? null,
    decodeScore: row.decode_score === null ? null : Number(row.decode_score),
  };
}

/**
 * Толкования интерпретаций корпуса ZET.
 *
 * Поиск идёт по разобранным полям, а не по тексту: ключ вычисляется из карты,
 * дальше обычный индексный доступ. Ни LLM, ни эмбеддингов на этом пути нет.
 */
export class CorpusRepository {
  /**
   * Аспект пары планет. Пара несимметрична в ключе источника, но симметрична
   * по смыслу, поэтому сравнение идёт через LEAST/GREATEST — под это заточен
   * индекс idx_corpus_aspect_pair.
   */
  async findAspects(queries: AspectQuery[], limitPerKey = 4): Promise<CorpusBundle<AspectQuery>[]> {
    if (queries.length === 0) return [];

    const pairs = queries.map((q) => ({
      lo: q.planet1 < q.planet2 ? q.planet1 : q.planet2,
      hi: q.planet1 < q.planet2 ? q.planet2 : q.planet1,
      deg: q.aspectDeg,
    }));

    const { rows } = await pool.query(
      `
      WITH wanted AS (
        SELECT * FROM unnest($1::text[], $2::text[], $3::int[]) AS t(lo, hi, deg)
      ),
      matched AS (
        SELECT w.lo, w.hi, w.deg, ${SELECT},
               -- Один автор представлен один раз: у Подводного в корпусе
               -- две редакции «Аспектов» с почти совпадающим текстом, и без
               -- этого он занимает половину выдачи.
               row_number() OVER (
                 PARTITION BY w.lo, w.hi, w.deg, coalesce(c.author, c.source_title)
                 ORDER BY (c.decode_source = 'fitted') DESC, c.body_length DESC
               ) AS per_author
        FROM wanted w
        JOIN corpus_interpretations c
          ON c.code = 'AP'
         AND c.aspect_deg = w.deg
         AND LEAST(c.planet, c.planet2) = w.lo
         AND GREATEST(c.planet, c.planet2) = w.hi
      ),
      ranked AS (
        SELECT *, row_number() OVER (
                 PARTITION BY lo, hi, deg
                 -- Длинные разборы информативнее односложных помет, а
                 -- подобранная расшифровка надёжнее одолженной.
                 ORDER BY (decode_source = 'fitted') DESC, body_length DESC
               ) AS rn
          FROM matched WHERE per_author = 1
      )
      SELECT * FROM ranked WHERE rn <= $4
      `,
      [pairs.map((p) => p.lo), pairs.map((p) => p.hi), pairs.map((p) => p.deg), limitPerKey],
    );

    const byKey = new Map<string, CorpusBundle<AspectQuery>>();
    for (const q of queries) {
      const lo = q.planet1 < q.planet2 ? q.planet1 : q.planet2;
      const hi = q.planet1 < q.planet2 ? q.planet2 : q.planet1;
      byKey.set(`${lo}|${hi}|${q.aspectDeg}`, { key: q, entries: [] });
    }
    for (const row of rows) {
      byKey.get(`${row.lo}|${row.hi}|${row.deg}`)?.entries.push(toEntry(row));
    }
    return [...byKey.values()].filter((b) => b.entries.length > 0);
  }

  /** Планета в знаке. */
  async findPlanetInSign(planet: string, sign: string, limit = 4): Promise<CorpusEntry[]> {
    const { rows } = await pool.query(
      `SELECT ${SELECT} FROM corpus_interpretations
        WHERE code = 'PS' AND planet = $1 AND sign = $2
        ORDER BY (decode_source = 'fitted') DESC, body_length DESC
        LIMIT $3`,
      [planet, sign, limit],
    );
    return rows.map(toEntry);
  }

  /** Планета в доме. */
  async findPlanetInHouse(planet: string, house: number, limit = 4): Promise<CorpusEntry[]> {
    const { rows } = await pool.query(
      `SELECT ${SELECT} FROM corpus_interpretations
        WHERE code = 'PH' AND planet = $1 AND house = $2
        ORDER BY (decode_source = 'fitted') DESC, body_length DESC
        LIMIT $3`,
      [planet, house, limit],
    );
    return rows.map(toEntry);
  }

  /**
   * Управитель дома в домах (раздел RHH). Пакетно: карта даёт сразу
   * двенадцать пар, и по одной их дёргать незачем.
   */
  async findHouseRulers(
    pairs: { house: number; rulerHouse: number }[],
    limitPerKey = 4,
  ): Promise<Map<string, CorpusEntry[]>> {
    if (pairs.length === 0) return new Map();

    const { rows } = await pool.query(
      `
      WITH wanted AS (
        SELECT * FROM unnest($1::int[], $2::int[]) AS t(h, rh)
      ),
      matched AS (
        SELECT w.h, w.rh, ${SELECT},
               row_number() OVER (
                 PARTITION BY w.h, w.rh, coalesce(c.author, c.source_title)
                 ORDER BY c.body_length DESC
               ) AS per_author
          FROM wanted w
          JOIN corpus_interpretations c
            ON c.code = 'RHH' AND c.house = w.h AND c.house2 = w.rh
      ),
      ranked AS (
        SELECT *, row_number() OVER (PARTITION BY h, rh ORDER BY body_length DESC) AS rn
          FROM matched WHERE per_author = 1
      )
      SELECT * FROM ranked WHERE rn <= $3
      `,
      [pairs.map((p) => p.house), pairs.map((p) => p.rulerHouse), limitPerKey],
    );

    const out = new Map<string, CorpusEntry[]>();
    for (const row of rows) {
      const key = `${row.h}|${row.rh}`;
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(toEntry(row));
    }
    return out;
  }

  /** Символика градуса. absoluteDegree считается от 0° Овна, 1..360. */
  async findDegree(absoluteDegree: number, limit = 4): Promise<CorpusEntry[]> {
    const { rows } = await pool.query(
      `SELECT ${SELECT} FROM corpus_interpretations
        WHERE abs_degree = $1
        ORDER BY body_length DESC
        LIMIT $2`,
      [absoluteDegree, limit],
    );
    return rows.map(toEntry);
  }

  /**
   * Глоссарий: общие описания планет, знаков и домов для тултипов.
   *
   * Отдаёт весь словарь одним запросом. Терминов меньше полусотни, вместе
   * они укладываются в считанные килобайты, а тултип должен появляться без
   * похода на сервер — иначе он не тултип, а модалка.
   *
   * На каждый термин берутся две записи: самая короткая (в подсказку) и
   * самая длинная (в раскрытие). Порог в 60 символов отсекает обрубки вроде
   * односложных помет, которые в подсказке выглядят как ошибка.
   */
  async glossary(): Promise<GlossaryTerm[]> {
    const { rows } = await pool.query(`
      WITH terms AS (
        SELECT
          CASE code WHEN 'P' THEN 'planet' WHEN 'S' THEN 'sign' ELSE 'house' END AS kind,
          coalesce(planet, sign, house::text) AS term,
          author, source_title, body, body_length,
          row_number() OVER (PARTITION BY code, coalesce(planet, sign, house::text)
                             ORDER BY body_length ASC)  AS shortest,
          row_number() OVER (PARTITION BY code, coalesce(planet, sign, house::text)
                             ORDER BY body_length DESC) AS longest
        FROM corpus_interpretations
        WHERE code IN ('P', 'S', 'H')
          AND coalesce(planet, sign, house::text) IS NOT NULL
          AND body_length >= 60
      )
      SELECT kind, term,
             max(body)        FILTER (WHERE shortest = 1) AS short_body,
             max(author)      FILTER (WHERE shortest = 1) AS short_author,
             max(source_title) FILTER (WHERE shortest = 1) AS short_source,
             max(body)        FILTER (WHERE longest = 1)  AS long_body,
             max(author)      FILTER (WHERE longest = 1)  AS long_author,
             max(source_title) FILTER (WHERE longest = 1) AS long_source,
             count(*)::int AS variants
        FROM terms
       WHERE shortest = 1 OR longest = 1
       GROUP BY kind, term
       ORDER BY kind, term
    `);

    return rows.map((r) => ({
      kind: r.kind as GlossaryTerm['kind'],
      term: String(r.term),
      short: { body: String(r.short_body ?? ''), author: r.short_author ?? r.short_source ?? null },
      long:
        r.long_body && r.long_body !== r.short_body
          ? { body: String(r.long_body), author: r.long_author ?? r.long_source ?? null }
          : null,
    }));
  }

  /** Сводка по таблице: сколько чего лежит. Нужна для health и диагностики. */
  async stats(): Promise<{ code: string; records: number; decoded: number }[]> {
    const { rows } = await pool.query(`
      SELECT code, count(*)::int AS records,
             count(*) FILTER (
               WHERE planet IS NOT NULL OR sign IS NOT NULL
                  OR house IS NOT NULL OR abs_degree IS NOT NULL
             )::int AS decoded
        FROM corpus_interpretations
       GROUP BY code ORDER BY count(*) DESC
    `);
    return rows.map((r) => ({ code: r.code, records: r.records, decoded: r.decoded }));
  }
}

export const corpusRepository = new CorpusRepository();

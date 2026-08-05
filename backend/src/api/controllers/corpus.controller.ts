import { Request, Response } from 'express';
import { corpusRepository, type AspectQuery } from '../../database/repositories/corpus.repository';

/**
 * Имена планет в приложении и в корпусе не совпадают: shared-типы держат
 * 'Sun'/'Rahu', корпус — 'SUN'/'NODE'. Перевод здесь, а не в SQL, чтобы
 * запрос оставался индексируемым.
 */
const PLANET_TO_CORPUS: Record<string, string> = {
  sun: 'SUN', moon: 'MOON', mercury: 'MERCURY', venus: 'VENUS', mars: 'MARS',
  jupiter: 'JUPITER', saturn: 'SATURN', uranus: 'URANUS', neptune: 'NEPTUNE',
  pluto: 'PLUTO',
  rahu: 'NODE', ketu: 'SOUTH_NODE', lilith: 'LILITH', chiron: 'CHIRON',
  ascendant: 'ASC', asc: 'ASC', mc: 'MC', midheaven: 'MC',
};

const SIGN_TO_CORPUS: Record<string, string> = {
  aries: 'ARIES', taurus: 'TAURUS', gemini: 'GEMINI', cancer: 'CANCER',
  leo: 'LEO', virgo: 'VIRGO', libra: 'LIBRA', scorpio: 'SCORPIO',
  sagittarius: 'SAGITTARIUS', capricorn: 'CAPRICORN', aquarius: 'AQUARIUS',
  pisces: 'PISCES',
  овен: 'ARIES', телец: 'TAURUS', близнецы: 'GEMINI', рак: 'CANCER',
  лев: 'LEO', дева: 'VIRGO', весы: 'LIBRA', скорпион: 'SCORPIO',
  стрелец: 'SAGITTARIUS', козерог: 'CAPRICORN', водолей: 'AQUARIUS',
  рыбы: 'PISCES',
};

const ASPECT_TO_DEGREES: Record<string, number> = {
  conjunction: 0, sextile: 60, square: 90, trine: 120,
  quincunx: 150, opposition: 180,
};

function toPlanet(name: unknown): string | null {
  return typeof name === 'string' ? PLANET_TO_CORPUS[name.trim().toLowerCase()] ?? null : null;
}

function toSign(name: unknown): string | null {
  return typeof name === 'string' ? SIGN_TO_CORPUS[name.trim().toLowerCase()] ?? null : null;
}

function toAspectDegrees(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const byName = ASPECT_TO_DEGREES[value.trim().toLowerCase()];
    if (byName !== undefined) return byName;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

export class CorpusController {
  /**
   * POST /api/corpus/aspects
   * body: { aspects: [{ planet1, planet2, aspect }], limit? }
   *
   * Пакетный запрос: колесо рисует до полутора десятков аспектов сразу, и
   * дёргать эндпойнт по одному значит получить столько же round-trip'ов.
   */
  async aspects(req: Request, res: Response): Promise<void> {
    const raw = Array.isArray(req.body?.aspects) ? req.body.aspects : [];
    const limit = Math.min(Number(req.body?.limit) || 4, 10);

    const queries: AspectQuery[] = [];
    const skipped: unknown[] = [];
    for (const item of raw.slice(0, 60)) {
      const p1 = toPlanet(item?.planet1);
      const p2 = toPlanet(item?.planet2);
      const deg = toAspectDegrees(item?.aspect ?? item?.type ?? item?.angle);
      if (p1 && p2 && deg !== null) queries.push({ planet1: p1, planet2: p2, aspectDeg: deg });
      else skipped.push(item);
    }

    if (queries.length === 0) {
      res.json({ success: true, bundles: [], skipped });
      return;
    }

    try {
      const bundles = await corpusRepository.findAspects(queries, limit);
      res.json({ success: true, bundles, skipped });
    } catch (error) {
      console.error('❌ corpus/aspects failed:', error);
      res.status(500).json({ success: false, error: 'corpus lookup failed' });
    }
  }

  /** GET /api/corpus/planet?planet=Sun&sign=Leo | &house=5 */
  async planet(req: Request, res: Response): Promise<void> {
    const planet = toPlanet(req.query.planet);
    if (!planet) {
      res.status(400).json({ success: false, error: 'unknown planet' });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 4, 10);
    const sign = toSign(req.query.sign);
    const house = Number(req.query.house);

    try {
      if (sign) {
        res.json({ success: true, entries: await corpusRepository.findPlanetInSign(planet, sign, limit) });
      } else if (Number.isInteger(house) && house >= 1 && house <= 12) {
        res.json({ success: true, entries: await corpusRepository.findPlanetInHouse(planet, house, limit) });
      } else {
        res.status(400).json({ success: false, error: 'need sign or house (1..12)' });
      }
    } catch (error) {
      console.error('❌ corpus/planet failed:', error);
      res.status(500).json({ success: false, error: 'corpus lookup failed' });
    }
  }

  /** GET /api/corpus/degree?absolute=135 — символика градуса зодиака. */
  async degree(req: Request, res: Response): Promise<void> {
    const abs = Number(req.query.absolute);
    if (!Number.isFinite(abs) || abs < 1 || abs > 360) {
      res.status(400).json({ success: false, error: 'absolute must be 1..360' });
      return;
    }
    try {
      const entries = await corpusRepository.findDegree(Math.round(abs), Math.min(Number(req.query.limit) || 4, 10));
      res.json({ success: true, entries });
    } catch (error) {
      console.error('❌ corpus/degree failed:', error);
      res.status(500).json({ success: false, error: 'corpus lookup failed' });
    }
  }

  /**
   * GET /api/corpus/glossary
   *
   * Весь словарь терминов одним ответом: клиент кэширует его на сессию и
   * рисует тултипы без похода на сервер.
   */
  async glossary(_req: Request, res: Response): Promise<void> {
    try {
      const terms = await corpusRepository.glossary();
      // Словарь меняется только при перезаливке корпуса.
      res.set('Cache-Control', 'public, max-age=3600');
      res.json({ success: true, terms });
    } catch (error) {
      console.error('❌ corpus/glossary failed:', error);
      res.status(500).json({ success: false, error: 'corpus lookup failed' });
    }
  }

  /** GET /api/corpus/stats */
  async stats(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, stats: await corpusRepository.stats() });
    } catch (error) {
      console.error('❌ corpus/stats failed:', error);
      res.status(500).json({ success: false, error: 'corpus lookup failed' });
    }
  }
}

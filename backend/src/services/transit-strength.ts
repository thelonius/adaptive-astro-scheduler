/**
 * Вес транзита: чем его ранжировать, когда активны десятки сразу.
 *
 * Задача не в том, чтобы сказать «этот транзит хороший», а в том, чтобы из
 * тридцати активных выбрать три, которые вообще стоит показывать. Раньше
 * transit-calculator сортировал по орбису и всё: медленный Плутон в орбисе
 * 3° проигрывал Луне в орбисе 1°, хотя лунный транзит длится часы, а
 * плутонианский — годы.
 *
 * Все субъективные коэффициенты собраны в WEIGHTS и SPEED_SCALE. Объективные
 * величины (орбис, скорость, сходимость, угловость) считаются из эфемерид.
 * Появится внешняя методика для калибровки — меняются числа, не структура.
 */

import type { AspectType } from '@adaptive-astro/shared/types/astrology';

export interface TransitInput {
  transitingPlanet: string;
  natalPlanet: string;
  aspectType: AspectType;
  /** Эклиптическая долгота транзитной планеты, градусы 0..360. */
  transitLongitude: number;
  /** Долгота натальной планеты, градусы 0..360. */
  natalLongitude: number;
  /** Суточное движение транзитной планеты, градусы/сутки. Отрицательное = ретро. */
  transitSpeed: number;
  /**
   * Номер прохода: 1 — первый, 2 — ретроградный возврат, 3 — финальный.
   * Считается сканированием окна транзита; если не передан, выводится грубо
   * по знаку скорости (ретроградность = почти наверняка повторный проход).
   */
  passIndex?: 1 | 2 | 3;
  /** Угловые точки натальной карты для проверки попадания. */
  natalAngles?: { asc?: number; mc?: number };
}

export interface TransitFactors {
  /** Плотность орбиса, 0..1. */
  orbTightness: number;
  /** Медленная планета весит больше: транзит длиннее и заметнее. */
  slowness: number;
  /** Сила самого аспекта. */
  aspectPower: number;
  /** Значимость натальной планеты, на которую приходит транзит. */
  natalImportance: number;
  /** Сходящийся аспект набирает силу, расходящийся отпускает. */
  applyingBonus: number;
  /** Попадание транзитной планеты на ASC или MC. */
  angularityBonus: number;
  /** Второй и третий проходы весомее первого: тема возвращается. */
  passBonus: number;
}

export interface ScoredTransit extends TransitInput {
  orb: number;
  isExact: boolean;
  isApplying: boolean;
  isAngular: boolean;
  effectivePass: 1 | 2 | 3;
  /** Сколько суток до точного аспекта при текущей скорости. */
  daysToExact: number;
  /**
   * Значимость: насколько транзит вообще весом. У Плутона она высокая
   * месяцами подряд.
   */
  strength: number;
  /**
   * Актуальность: происходит ли это именно сегодня. Плутон в орбисе 0.5°
   * держится там сто с лишним дней, и как новость дня он мёртв.
   */
  topicality: number;
  /** Значимость × актуальность. По ней сортируется дневная выдача. */
  dailyScore: number;
  factors: TransitFactors;
  rank: 'weak' | 'moderate' | 'strong' | 'very-strong';
}

/** Доли в итоговой сумме. Сумма первых четырёх — 1.0, дальше бонусы. */
export const WEIGHTS = {
  orbTightness: 0.30,
  slowness: 0.30,
  aspectPower: 0.22,
  natalImportance: 0.18,
  applying: 0.08,
  angularity: 0.12,
  pass: 0.06,
} as const;

export const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  quincunx: 150,
  opposition: 180,
};

export const MAX_ORB: Record<AspectType, number> = {
  conjunction: 8,
  sextile: 6,
  square: 8,
  trine: 8,
  quincunx: 3,
  opposition: 8,
};

const ASPECT_POWER: Record<AspectType, number> = {
  conjunction: 1.0,
  opposition: 0.9,
  square: 0.85,
  trine: 0.75,
  sextile: 0.55,
  quincunx: 0.45,
};

/**
 * Значимость натальной планеты как мишени транзита. Транзит на Солнце или
 * Луну переживается лично; транзит на чужой Нептун — фоновое поколенческое
 * влияние, которое человек на себе не выделяет.
 */
const NATAL_IMPORTANCE: Record<string, number> = {
  Sun: 1.0, Moon: 1.0, Ascendant: 1.0, ASC: 1.0, MC: 0.95, Midheaven: 0.95,
  Mercury: 0.8, Venus: 0.8, Mars: 0.8,
  Jupiter: 0.65, Saturn: 0.65,
  Uranus: 0.45, Neptune: 0.45, Pluto: 0.45,
  Rahu: 0.5, Ketu: 0.5, Lilith: 0.35, Chiron: 0.4,
};

/**
 * Границы шкалы медленности в градусах в сутки. Луна проходит ~13°/сут и
 * получает минимум, Плутон ~0.01°/сут — максимум. Шкала логарифмическая:
 * разница между Луной и Меркурием важнее, чем между Ураном и Нептуном.
 */
const SPEED_SCALE = { fastest: 13.2, slowest: 0.008 } as const;

const ANGULAR_ORB = 3;

/**
 * Горизонт актуальности в сутках. Транзит, точный в пределах суток, — новость
 * дня; тот, до точки которого две недели, — фон. Половина веса приходится на
 * TOPICALITY_HALFLIFE суток.
 */
const TOPICALITY_HALFLIFE = 4;

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Разность долгот в (-180, 180]. */
function signedSeparation(from: number, to: number): number {
  const d = norm360(from - to);
  return d > 180 ? d - 360 : d;
}

/**
 * Точный орбис и направление.
 *
 * Натальная точка неподвижна, движется только транзитная планета, поэтому
 * знак производной отклонения совпадает со знаком её скорости. Аспект
 * сходится, когда отклонение и скорость разнонаправлены.
 *
 * Прежний код в transit-calculator считал `isApplying = speed > 0`, то есть
 * путал сходимость с отсутствием ретроградности: расходящийся директный
 * аспект помечался сходящимся.
 */
export function orbAndDirection(
  transitLongitude: number,
  natalLongitude: number,
  aspectType: AspectType,
  transitSpeed: number,
): { orb: number; isApplying: boolean } {
  const angle = ASPECT_ANGLES[aspectType];
  const sep = signedSeparation(transitLongitude, natalLongitude);

  // Точных точек две: +angle и -angle. Берём ближнюю.
  const candidates = angle === 0 || angle === 180 ? [angle, -angle] : [angle, -angle];
  let target = candidates[0];
  let offset = sep - target;
  for (const c of candidates) {
    const o = sep - c;
    if (Math.abs(o) < Math.abs(offset)) {
      target = c;
      offset = o;
    }
  }

  // Отклонение уменьшается, если оно и скорость смотрят в разные стороны.
  const isApplying = offset !== 0 && Math.sign(offset) !== Math.sign(transitSpeed);
  return { orb: Math.abs(offset), isApplying: transitSpeed === 0 ? false : isApplying };
}

function orbTightness(orb: number, maxOrb: number): number {
  if (orb <= 0) return 1;
  if (orb >= maxOrb) return 0.2;
  return 1 - (orb / maxOrb) * 0.8;
}

/** Логарифмическая шкала: 0 у Луны, 1 у Плутона. */
function slowness(speed: number): number {
  const abs = Math.max(Math.abs(speed), SPEED_SCALE.slowest);
  const clamped = Math.min(abs, SPEED_SCALE.fastest);
  const ratio =
    Math.log(SPEED_SCALE.fastest / clamped) /
    Math.log(SPEED_SCALE.fastest / SPEED_SCALE.slowest);
  return Math.min(1, Math.max(0, ratio));
}

function angularity(longitude: number, angles?: { asc?: number; mc?: number }): boolean {
  if (!angles) return false;
  for (const point of [angles.asc, angles.mc]) {
    if (point === undefined) continue;
    const sep = Math.abs(signedSeparation(longitude, point));
    // Ось работает целиком: попадание на DSC/IC равносильно попаданию на ASC/MC.
    if (sep <= ANGULAR_ORB || Math.abs(sep - 180) <= ANGULAR_ORB) return true;
  }
  return false;
}

function determineRank(strength: number): ScoredTransit['rank'] {
  if (strength >= 0.75) return 'very-strong';
  if (strength >= 0.55) return 'strong';
  if (strength >= 0.35) return 'moderate';
  return 'weak';
}

export function scoreTransit(input: TransitInput): ScoredTransit {
  const { orb, isApplying } = orbAndDirection(
    input.transitLongitude,
    input.natalLongitude,
    input.aspectType,
    input.transitSpeed,
  );

  // Полноценный подсчёт проходов требует скана окна транзита. Пока его нет,
  // ретроградность транзитной планеты — надёжный признак повторного прохода:
  // первый проход почти всегда директный.
  const effectivePass: 1 | 2 | 3 = input.passIndex ?? (input.transitSpeed < 0 ? 2 : 1);

  const isAngular = angularity(input.transitLongitude, input.natalAngles);

  const factors: TransitFactors = {
    orbTightness: orbTightness(orb, MAX_ORB[input.aspectType]),
    slowness: slowness(input.transitSpeed),
    aspectPower: ASPECT_POWER[input.aspectType],
    natalImportance: NATAL_IMPORTANCE[input.natalPlanet] ?? 0.5,
    applyingBonus: isApplying ? WEIGHTS.applying : 0,
    angularityBonus: isAngular ? WEIGHTS.angularity : 0,
    passBonus: effectivePass > 1 ? WEIGHTS.pass : 0,
  };

  const strength = Math.min(
    1,
    factors.orbTightness * WEIGHTS.orbTightness +
      factors.slowness * WEIGHTS.slowness +
      factors.aspectPower * WEIGHTS.aspectPower +
      factors.natalImportance * WEIGHTS.natalImportance +
      factors.applyingBonus +
      factors.angularityBonus +
      factors.passBonus,
  );

  // Сколько суток до точки при текущей скорости. Для натальной мишени
  // натальная точка неподвижна, так что относительная скорость — это
  // скорость транзитной планеты.
  const speed = Math.abs(input.transitSpeed);
  const daysToExact = speed > 0 ? orb / speed : Number.POSITIVE_INFINITY;

  // Экспоненциальный спад: 1 в точке, 0.5 через TOPICALITY_HALFLIFE суток.
  const topicality = Number.isFinite(daysToExact)
    ? Math.pow(0.5, daysToExact / TOPICALITY_HALFLIFE)
    : 0;

  return {
    ...input,
    orb,
    isExact: orb < 1,
    isApplying,
    isAngular,
    effectivePass,
    daysToExact,
    strength,
    topicality,
    dailyScore: strength * topicality,
    factors,
    rank: determineRank(strength),
  };
}

/**
 * Ранжирует и отрезает хвост.
 *
 * Сортировка детерминирована: при равной силе порядок задаётся именами, а не
 * порядком поступления, иначе один и тот же день выдавал бы разный список
 * между прогонами.
 */
function stableSort(
  inputs: TransitInput[],
  key: (t: ScoredTransit) => number,
  limit?: number,
): ScoredTransit[] {
  const scored = inputs.map(scoreTransit).sort((a, b) => {
    const diff = key(b) - key(a);
    if (diff !== 0) return diff;
    if (a.orb !== b.orb) return a.orb - b.orb;
    const byTransit = a.transitingPlanet.localeCompare(b.transitingPlanet);
    if (byTransit !== 0) return byTransit;
    const byNatal = a.natalPlanet.localeCompare(b.natalPlanet);
    if (byNatal !== 0) return byNatal;
    return a.aspectType.localeCompare(b.aspectType);
  });
  return limit === undefined ? scored : scored.slice(0, limit);
}

/**
 * По значимости. Это «что вообще сейчас происходит в жизни»: список меняется
 * медленно, месяцами, и для фонового блока это правильно.
 */
export function rankTransits(inputs: TransitInput[], limit?: number): ScoredTransit[] {
  return stableSort(inputs, (t) => t.strength, limit);
}

/**
 * По значимости с поправкой на актуальность. Это «что сегодня»: медленный
 * Плутон, застрявший в орбисе на полгода, уступает место тому, что реально
 * подходит к точке именно сейчас.
 */
export function rankDailyTransits(inputs: TransitInput[], limit?: number): ScoredTransit[] {
  return stableSort(inputs, (t) => t.dailyScore, limit);
}

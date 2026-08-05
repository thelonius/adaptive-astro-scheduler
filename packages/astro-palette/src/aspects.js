/**
 * Аспекты между планетами — углы по эклиптике (0/60/90/120/180°, орб ±5°).
 * Используются не для текстов, а для «вибрации» палитры:
 *   harmonic (trine, sextile, conjunction) → +chroma на accent (насыщеннее)
 *   tense    (square, opposition)          → +lightness-контраст (фон жёстче)
 * Второе измерение уникальности палитры поверх hue.
 * @module aspects
 */
import { planetEclipticLongitude } from './ephemerides.js';

const ASPECT_TYPES = [
  { name: 'conjunction', angle: 0,   harmonic: 1 },
  { name: 'sextile',     angle: 60,  harmonic: 1 },
  { name: 'square',      angle: 90,  harmonic: -1 },
  { name: 'trine',       angle: 120, harmonic: 1 },
  { name: 'opposition',  angle: 180, harmonic: -1 },
];

const ORB = 5;
/** @type {import('./data.js').PlanetName[]} */
const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

/**
 * @typedef {Object} ActiveAspect
 * @property {import('./data.js').PlanetName} a
 * @property {import('./data.js').PlanetName} b
 * @property {'conjunction'|'sextile'|'square'|'trine'|'opposition'} type
 * @property {number} exactAngle
 * @property {number} actualAngle
 * @property {number} orbDistance абс. отклонение от точного угла
 * @property {number} harmonic    +1 (гармоничный) | -1 (напряжённый)
 */

/** Угол между двумя долготами, нормализованный к [0..180°]. */
function angleBetween(a, b) {
  const diff = Math.abs(((a - b) % 360 + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Все активные аспекты между парами планет на момент jd (по одному ближайшему
 * на пару).
 * @param {number} jd
 * @returns {ActiveAspect[]}
 */
export function activeAspects(jd) {
  /** @type {Record<string, number>} */
  const longitudes = {};
  for (const p of PLANETS) longitudes[p] = planetEclipticLongitude(p, jd);

  /** @type {ActiveAspect[]} */
  const out = [];
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const a = PLANETS[i];
      const b = PLANETS[j];
      const angle = angleBetween(longitudes[a], longitudes[b]);
      /** @type {ActiveAspect|null} */
      let best = null;
      for (const aspect of ASPECT_TYPES) {
        const dist = Math.abs(angle - aspect.angle);
        if (dist <= ORB && (best === null || dist < best.orbDistance)) {
          best = {
            a, b,
            type: aspect.name,
            exactAngle: aspect.angle,
            actualAngle: angle,
            orbDistance: dist,
            harmonic: aspect.harmonic,
          };
        }
      }
      if (best) out.push(best);
    }
  }
  return out;
}

/**
 * @typedef {Object} AspectModulation
 * @property {number} chromaBoost    +X к C accent'а (0..0.04)
 * @property {number} lightnessBoost +X к L-разнице bg (0..3)
 * @property {ActiveAspect[]} aspects
 */

/**
 * Суммирует активные аспекты в модуляторы палитры. Вес — обратный orb (точные
 * аспекты влияют сильнее). Кэп: chroma ≤ +0.04, L ≤ +3 (остаёмся в gamut'е).
 * @param {number} jd
 * @returns {AspectModulation}
 */
export function aspectModulation(jd) {
  const aspects = activeAspects(jd);
  let chromaBoost = 0;
  let lightnessBoost = 0;
  for (const a of aspects) {
    const tightness = 1 - a.orbDistance / ORB;
    if (a.harmonic > 0) chromaBoost += 0.012 * tightness;
    else lightnessBoost += 1.2 * tightness;
  }
  return {
    chromaBoost: Math.min(chromaBoost, 0.04),
    lightnessBoost: Math.min(lightnessBoost, 3),
    aspects,
  };
}

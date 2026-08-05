/**
 * Фаза Луны из угла Солнце–Луна.
 * @module moon
 */
import { moonLongitude, sunLongitude, rad, norm360 } from './ephemerides.js';

/**
 * @typedef {Object} MoonPhase
 * @property {number} angle        угол (Луна−Солнце), 0=новолуние … 180=полнолуние
 * @property {number} illumination доля освещённости 0..1
 * @property {string} name         русское название фазы
 * @property {string} emoji        эмодзи фазы
 * @property {boolean} waxing      растущая ли Луна
 * @property {number} moonLong     эклиптическая долгота Луны (°)
 */

/**
 * Параметры фазы Луны на момент jd.
 * @param {number} jd
 * @returns {MoonPhase}
 */
export function moonPhaseInfo(jd) {
  const moon = moonLongitude(jd);
  const sun = sunLongitude(jd);
  const angle = norm360(moon - sun);
  const illumination = (1 - Math.cos(rad(angle))) / 2;
  const PHASES = [
    { max: 22.5,  name: 'новолуние',          emoji: '🌑', waxing: true },
    { max: 67.5,  name: 'растущий серп',      emoji: '🌒', waxing: true },
    { max: 112.5, name: 'первая четверть',    emoji: '🌓', waxing: true },
    { max: 157.5, name: 'растущая луна',      emoji: '🌔', waxing: true },
    { max: 202.5, name: 'полнолуние',         emoji: '🌕', waxing: false },
    { max: 247.5, name: 'убывающая луна',     emoji: '🌖', waxing: false },
    { max: 292.5, name: 'последняя четверть', emoji: '🌗', waxing: false },
    { max: 337.5, name: 'убывающий серп',     emoji: '🌘', waxing: false },
    { max: 360.1, name: 'новолуние',          emoji: '🌑', waxing: true },
  ];
  const phase = PHASES.find((p) => angle < p.max);
  return { angle, illumination, name: phase.name, emoji: phase.emoji, waxing: phase.waxing, moonLong: moon };
}

/**
 * Эфемериды: видимые геоцентрические эклиптические долготы Солнца, Луны и
 * планет. Усечённые ряды Meeus (Astronomical Algorithms) — точности ~0.1–0.3°
 * хватает для выбора hue и фазы. Не для эфемеридных таблиц.
 * @module ephemerides
 */
import { ZODIAC_RU } from './data.js';

export const J2000 = 2451545.0;
export const rad = (x) => (x * Math.PI) / 180;
export const norm360 = (x) => ((x % 360) + 360) % 360;

/**
 * Юлианская дата из JS Date.
 * @param {Date} d
 * @returns {number}
 */
export function toJulianDate(d) {
  return d.getTime() / 86400000 + 2440587.5;
}

/**
 * Видимая эклиптическая долгота Солнца (°).
 * @param {number} jd
 * @returns {number}
 */
export function sunLongitude(jd) {
  const T = (jd - J2000) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const Mdeg = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const M = rad(Mdeg);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return norm360(L0 + C);
}

/**
 * Геоцентрическая эклиптическая долгота Луны (°), 4 главных члена.
 * @param {number} jd
 * @returns {number}
 */
export function moonLongitude(jd) {
  const T = (jd - J2000) / 36525;
  const L = 218.3164591 + 481267.88134236 * T;
  const D = rad(297.8501921 + 445267.1114034 * T);
  const M = rad(357.5291092 + 35999.0502909 * T);
  const Mp = rad(134.9633964 + 477198.8675055 * T);
  const dL =
    6.288774 * Math.sin(Mp) +
    1.274027 * Math.sin(2 * D - Mp) +
    0.658314 * Math.sin(2 * D) -
    0.185116 * Math.sin(M);
  return norm360(L + dL);
}

const SEMI_AXIS = {
  Mercury: 0.38710, Venus: 0.72333, Mars: 1.52371,
  Jupiter: 5.20289, Saturn: 9.53668,
};
const PLANET_ELEMENTS = {
  Mercury: { L0: 252.25032350, dL: 149472.67411175, e: 0.20563593, varpi: 77.45779628 },
  Venus:   { L0: 181.97909950, dL: 58517.81538729,  e: 0.00677672, varpi: 131.60246718 },
  Mars:    { L0: 355.43299958, dL: 19140.30268499,  e: 0.09339410, varpi: 336.04084084 },
  Jupiter: { L0: 34.39644051,  dL: 3034.74612775,   e: 0.04838624, varpi: 14.72847983 },
  Saturn:  { L0: 49.95424423,  dL: 1222.49362201,   e: 0.05386179, varpi: 92.59887831 },
};

function planetHelioState(name, jd) {
  const el = PLANET_ELEMENTS[name];
  const T = (jd - J2000) / 36525;
  const L = el.L0 + el.dL * T;
  const M = rad(L - el.varpi);
  const e = el.e;
  const Crad =
    (2 * e - (e * e * e) / 4) * Math.sin(M) +
    (5 / 4) * e * e * Math.sin(2 * M);
  return {
    trueLongDeg: norm360(L + (Crad * 180) / Math.PI),
    trueAnomaly: M + Crad,
    e,
    a: SEMI_AXIS[name],
  };
}

function helioXY(s) {
  const r = (s.a * (1 - s.e * s.e)) / (1 + s.e * Math.cos(s.trueAnomaly));
  const L = rad(s.trueLongDeg);
  return { x: r * Math.cos(L), y: r * Math.sin(L) };
}

function planetGeoLongitude(name, jd) {
  const p = helioXY(planetHelioState(name, jd));
  const Le = rad(norm360(sunLongitude(jd) + 180));
  const earth = { x: Math.cos(Le), y: Math.sin(Le) };
  return norm360((Math.atan2(p.y - earth.y, p.x - earth.x) * 180) / Math.PI);
}

/**
 * Видимая эклиптическая долгота тела (°). Sun/Moon — геоцентрические напрямую,
 * планеты — через гелиоцентрику + параллакс Земли.
 * @param {import('./data.js').PlanetName} name
 * @param {number} jd
 * @returns {number}
 */
export function planetEclipticLongitude(name, jd) {
  if (name === 'Sun') return sunLongitude(jd);
  if (name === 'Moon') return moonLongitude(jd);
  return planetGeoLongitude(name, jd);
}

/**
 * Русское имя знака зодиака по долготе.
 * @param {number} longitude
 * @returns {string}
 */
export function zodiacSign(longitude) {
  return ZODIAC_RU[Math.floor(norm360(longitude) / 30)];
}

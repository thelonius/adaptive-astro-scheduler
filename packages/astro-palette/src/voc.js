/**
 * Void-of-course Луны: интервал от последнего точного аспекта Луны к одному из
 * 6 традиционных управителей (Sun, Mercury, Venus, Mars, Jupiter, Saturn) до
 * входа Луны в следующий знак. Аспекты — 5 Птолемеевых (0/60/90/120/180°).
 * @module voc
 */
import { toJulianDate, moonLongitude, planetEclipticLongitude } from './ephemerides.js';
import { ZODIAC_RU } from './data.js';

const VOC_PLANETS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const VOC_ASPECTS = [0, 60, 90, 120, 180];
// Русские сокращения вместо астро-глифов: ☌/☍/⚹ часто нет в системных шрифтах.
const ASPECT_GLYPHS = { 0: 'соед.', 60: 'секст.', 90: 'квадр.', 120: 'тригон', 180: 'оппоз.' };

function signedMin(x) {
  return ((x + 180) % 360 + 360) % 360 - 180;
}

/**
 * @typedef {Object} VocAspect
 * @property {number} ts
 * @property {string} planet
 * @property {number} aspect
 * @property {string} glyph
 *
 * @typedef {Object} VocResult
 * @property {boolean} isCurrent  Луна без курса прямо сейчас
 * @property {number} endTs       вход в следующий знак (конец VoC)
 * @property {string} nextSign    следующий знак
 * @property {number} [startTs]    начало будущего VoC (если !isCurrent)
 * @property {VocAspect} [lastAspect] последний аспект перед VoC (если !isCurrent)
 */

/**
 * Текущий или ближайший интервал VoC.
 *
 * Forward-scan от now шагом 10 мин до смены знака Луны (макс 3 дня). Для каждой
 * пары (планета × угол) ловим zero-crossing signed delta = точный аспект, время
 * уточняем интерполяцией. Нет будущих аспектов в текущем знаке → Луна уже VoC.
 * @param {Date} now
 * @returns {VocResult|null}
 */
export function findVoC(now) {
  const STEP_MS = 10 * 60 * 1000;
  const MAX_MS = 3 * 24 * 60 * 60 * 1000;

  const targets = [];
  for (const p of VOC_PLANETS) {
    for (const a of VOC_ASPECTS) {
      targets.push({ planet: p, target: a, glyph: ASPECT_GLYPHS[a] });
      if (a !== 0 && a !== 180) {
        targets.push({ planet: p, target: -a, glyph: ASPECT_GLYPHS[a] });
      }
    }
  }

  const startTs = now.getTime();
  const startJD = toJulianDate(now);
  const moonStart = moonLongitude(startJD);
  const startSign = Math.floor(moonStart / 30);

  let prevTs = startTs;
  let prevDeltas = targets.map(({ planet, target }) =>
    signedMin(moonStart - planetEclipticLongitude(planet, startJD) - target)
  );

  const aspectsAhead = [];
  let signChangeTs = null;

  for (let dt = STEP_MS; dt <= MAX_MS; dt += STEP_MS) {
    const ts = startTs + dt;
    const jd = toJulianDate(new Date(ts));
    const moon = moonLongitude(jd);

    if (Math.floor(moon / 30) !== startSign) {
      let lo = prevTs, hi = ts;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        const mLong = moonLongitude(toJulianDate(new Date(mid)));
        if (Math.floor(mLong / 30) === startSign) lo = mid;
        else hi = mid;
      }
      signChangeTs = hi;
      break;
    }

    for (let i = 0; i < targets.length; i++) {
      const { planet, target, glyph } = targets[i];
      const delta = signedMin(moon - planetEclipticLongitude(planet, jd) - target);
      if (Math.sign(prevDeltas[i]) !== Math.sign(delta) &&
          Math.abs(prevDeltas[i]) + Math.abs(delta) < 30) {
        const frac = Math.abs(prevDeltas[i]) / (Math.abs(prevDeltas[i]) + Math.abs(delta));
        const aspectTs = prevTs + (ts - prevTs) * frac;
        aspectsAhead.push({ ts: aspectTs, planet, aspect: Math.abs(target), glyph });
      }
      prevDeltas[i] = delta;
    }
    prevTs = ts;
  }

  if (signChangeTs === null) return null;

  const nextSign = ZODIAC_RU[(startSign + 1) % 12];

  if (aspectsAhead.length === 0) {
    return { isCurrent: true, endTs: signChangeTs, nextSign };
  }
  aspectsAhead.sort((a, b) => a.ts - b.ts);
  const last = aspectsAhead[aspectsAhead.length - 1];
  return { isCurrent: false, startTs: last.ts, endTs: signChangeTs, lastAspect: last, nextSign };
}

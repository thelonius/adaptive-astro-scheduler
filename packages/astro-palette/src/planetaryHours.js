/**
 * Солнечные времена (NOAA Spencer 1971) и халдейские планетарные часы.
 * @module planetaryHours
 */
import { CHALDEAN_ORDER, WEEKDAY_RULERS } from './data.js';

/**
 * @typedef {Object} SolarTimes
 * @property {number} sunriseMin минуты от полуночи до восхода
 * @property {number} sunsetMin  минуты от полуночи до заката
 */

/**
 * Приближённые восход/закат (NOAA Spencer 1971).
 * @param {Date} date
 * @param {number} lat
 * @param {number} lon
 * @returns {SolarTimes}
 */
export function computeSolarTimes(date, lat, lon) {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      - Date.UTC(date.getFullYear(), 0, 0)) / 86400000
  );
  const latRad = lat * Math.PI / 180;
  const B = 2 * Math.PI * (dayOfYear - 1) / 365;
  const eqOfTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(B)
    - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B)
    - 0.040849 * Math.sin(2 * B)
  );
  const decl = 0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B)
    - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B)
    - 0.002697 * Math.cos(3 * B) + 0.00148 * Math.sin(3 * B);
  const tzOffsetMin = -date.getTimezoneOffset();
  const cosHA = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(decl))
    / (Math.cos(latRad) * Math.cos(decl));
  const ha = Math.acos(Math.max(-1, Math.min(1, cosHA))) * 180 / Math.PI;
  const solarNoonMin = 720 - 4 * lon - eqOfTime + tzOffsetMin;
  return { sunriseMin: solarNoonMin - ha * 4, sunsetMin: solarNoonMin + ha * 4 };
}

function midnightTs(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * @typedef {Object} PlanetaryHour
 * @property {import('./data.js').PlanetName} ruler    управитель текущего часа
 * @property {import('./data.js').PlanetName} dayRuler управитель дня
 * @property {number} phaseStartTs ms — начало текущего планетарного часа
 * @property {number} phaseEndTs   ms — конец текущего планетарного часа
 * @property {number} totalIdx     индекс часа от восхода (0..23)
 * @property {number} weekday      день недели базового астро-дня (0=вс)
 * @property {SolarTimes} solar      восход/закат базового дня
 * @property {SolarTimes} nextSolar  восход/закат следующего дня
 */

/**
 * Халдейский планетарный час для момента `now`.
 *
 * Астрологический день начинается с восхода. День — 12 неравных «дневных
 * часов» (1/12 от восход→закат), затем 12 «ночных» до следующего восхода.
 * Первый дневной час правит управитель дня недели, дальше — по халдейскому ряду.
 * @param {Date} now
 * @param {number} lat
 * @param {number} lon
 * @returns {PlanetaryHour}
 */
export function getPlanetaryHour(now, lat, lon) {
  let dayBase = new Date(now);
  let solar = computeSolarTimes(dayBase, lat, lon);
  const sunriseTsToday = midnightTs(dayBase) + solar.sunriseMin * 60000;
  if (now.getTime() < sunriseTsToday) {
    dayBase = new Date(now);
    dayBase.setDate(dayBase.getDate() - 1);
    solar = computeSolarTimes(dayBase, lat, lon);
  }
  const tomorrow = new Date(dayBase);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextSolar = computeSolarTimes(tomorrow, lat, lon);
  const sunriseTs = midnightTs(dayBase) + solar.sunriseMin * 60000;
  const sunsetTs = midnightTs(dayBase) + solar.sunsetMin * 60000;
  const nextSunriseTs = midnightTs(tomorrow) + nextSolar.sunriseMin * 60000;

  let phaseStartTs, phaseEndTs, totalIdx;
  if (now.getTime() < sunsetTs) {
    const hourLen = (sunsetTs - sunriseTs) / 12;
    const hourIdx = Math.floor((now.getTime() - sunriseTs) / hourLen);
    phaseStartTs = sunriseTs + hourIdx * hourLen;
    phaseEndTs = phaseStartTs + hourLen;
    totalIdx = hourIdx;
  } else {
    const hourLen = (nextSunriseTs - sunsetTs) / 12;
    const hourIdx = Math.floor((now.getTime() - sunsetTs) / hourLen);
    phaseStartTs = sunsetTs + hourIdx * hourLen;
    phaseEndTs = phaseStartTs + hourLen;
    totalIdx = 12 + hourIdx;
  }

  const dayRuler = WEEKDAY_RULERS[dayBase.getDay()];
  const startIdx = CHALDEAN_ORDER.indexOf(dayRuler);
  const ruler = CHALDEAN_ORDER[(startIdx + totalIdx) % 7];
  return {
    ruler, dayRuler, phaseStartTs, phaseEndTs, totalIdx,
    weekday: dayBase.getDay(), solar, nextSolar,
  };
}

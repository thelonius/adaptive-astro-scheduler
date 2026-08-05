/**
 * astro-palette — автономный движок планетарно-часовой OKLCH-палитры.
 *
 * Без сети и зависимостей: эфемериды, халдейские планетарные часы, OKLCH-
 * палитра, фаза Луны, void-of-course — всё считается локально из Date + коорд.
 *
 * @example
 * import { computeState, coordsForTimezone } from 'astro-palette';
 * const [lat, lon] = coordsForTimezone();
 * const mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
 * const st = computeState(new Date(), lat, lon, { mode });
 * for (const [k, v] of Object.entries(st.palette)) root.style.setProperty(k, v);
 *
 * @module astro-palette
 */
import { PLANET_HUES } from './data.js';
import { toJulianDate, planetEclipticLongitude } from './ephemerides.js';
import { getPlanetaryHour } from './planetaryHours.js';
import { computePalette } from './palette.js';
import { moonPhaseInfo } from './moon.js';
import { findVoC } from './voc.js';
import { aspectModulation } from './aspects.js';

export * from './data.js';
export * from './ephemerides.js';
export * from './planetaryHours.js';
export * from './palette.js';
export * from './moon.js';
export * from './voc.js';
export * from './aspects.js';

/**
 * @typedef {Object} ComputeOptions
 * @property {'dark'|'light'} [mode] цветовой режим (по умолчанию 'dark')
 * @property {'geocentric'|'fixed'} [hueSource] откуда брать hue планет:
 *   'geocentric' — реальная эклиптическая долгота (палитра уникальна каждый
 *   день; конвенция mlops_tutor / расширения); 'fixed' — таблица PLANET_HUES
 *   (повтор по неделе; конвенция portfolio-site). По умолчанию 'geocentric'.
 * @property {boolean} [applyAspects] применять ли аспектную модуляцию к палитре
 *   (chroma/lightness boost). По умолчанию false. Аспекты считаются и
 *   возвращаются всегда — флаг управляет только применением к цветам.
 *
 * @typedef {Object} AstroState
 * @property {Record<string,string>} palette map '--color-*' → 'oklch(...)'
 * @property {import('./planetaryHours.js').PlanetaryHour} hour
 * @property {import('./moon.js').MoonPhase} moon
 * @property {import('./voc.js').VocResult|null} voc
 * @property {number} dayHue
 * @property {number} hourHue
 * @property {'dark'|'light'} mode
 * @property {number} jd
 * @property {number} lat
 * @property {number} lon
 * @property {import('./aspects.js').ActiveAspect[]} aspects
 * @property {number} chromaBoost
 * @property {number} lightnessBoost
 */

/**
 * Полное состояние палитры на момент времени и координаты.
 * @param {Date} date
 * @param {number} lat
 * @param {number} lon
 * @param {ComputeOptions} [opts]
 * @returns {AstroState}
 */
export function computeState(date, lat, lon, opts = {}) {
  const mode = opts.mode === 'light' ? 'light' : 'dark';
  const hueSource = opts.hueSource === 'fixed' ? 'fixed' : 'geocentric';
  const applyAspects = opts.applyAspects === true;

  const jd = toJulianDate(date);
  const hour = getPlanetaryHour(date, lat, lon);

  const dayHue = hueSource === 'fixed'
    ? PLANET_HUES[hour.dayRuler]
    : planetEclipticLongitude(hour.dayRuler, jd);
  const hourHue = hueSource === 'fixed'
    ? PLANET_HUES[hour.ruler]
    : planetEclipticLongitude(hour.ruler, jd);

  // Аспекты считаем всегда (дёшево) — приложения могут их показывать. К палитре
  // применяем только если applyAspects (иначе цвета как без модуляции).
  const mod = aspectModulation(jd);
  const palette = computePalette(dayHue, hourHue, mode,
    applyAspects ? { chromaBoost: mod.chromaBoost, lightnessBoost: mod.lightnessBoost } : {});

  return {
    palette,
    hour,
    moon: moonPhaseInfo(jd),
    voc: findVoC(date),
    dayHue,
    hourHue,
    mode,
    jd,
    lat,
    lon,
    aspects: mod.aspects,
    chromaBoost: mod.chromaBoost,
    lightnessBoost: mod.lightnessBoost,
  };
}

/**
 * Справочные таблицы: планеты, дни недели, знаки, фиксированные hue,
 * координаты часовых поясов.
 * @module data
 */

/** @typedef {'Sun'|'Moon'|'Mercury'|'Venus'|'Mars'|'Jupiter'|'Saturn'} PlanetName */

/** @type {Record<PlanetName, string>} */
export const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀',
  Mars: '♂', Jupiter: '♃', Saturn: '♄',
};

/** @type {Record<PlanetName, string>} */
export const PLANET_NAMES_RU = {
  Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера',
  Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн',
};

/**
 * Фиксированные hue планет (для hueSource: 'fixed' — конвенция portfolio-site).
 * @type {Record<PlanetName, number>}
 */
export const PLANET_HUES = {
  Sun: 85, Moon: 245, Mercury: 220, Venus: 340,
  Mars: 25, Jupiter: 295, Saturn: 255,
};

/** Халдейский порядок планет, медленные → быстрые. @type {PlanetName[]} */
export const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

/** День недели (0=вс) → планета-управитель дня. @type {Record<number, PlanetName>} */
export const WEEKDAY_RULERS = {
  0: 'Sun', 1: 'Moon', 2: 'Mars', 3: 'Mercury',
  4: 'Jupiter', 5: 'Venus', 6: 'Saturn',
};

export const WEEKDAY_RU = [
  'воскресенье', 'понедельник', 'вторник', 'среда',
  'четверг', 'пятница', 'суббота',
];

export const ZODIAC_RU = [
  'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
  'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы',
];

/** Часовой пояс IANA → [широта, долгота]. @type {Record<string, [number, number]>} */
export const TZ_COORDS = {
  'Europe/Moscow': [55.75, 37.62],
  'Europe/London': [51.51, -0.13],
  'Europe/Berlin': [52.52, 13.40],
  'Europe/Paris': [48.85, 2.35],
  'Europe/Madrid': [40.42, -3.70],
  'Europe/Rome': [41.90, 12.50],
  'Europe/Amsterdam': [52.37, 4.90],
  'Europe/Brussels': [50.85, 4.35],
  'Europe/Stockholm': [59.33, 18.07],
  'Europe/Oslo': [59.91, 10.75],
  'Europe/Copenhagen': [55.68, 12.57],
  'Europe/Helsinki': [60.17, 24.94],
  'Europe/Athens': [37.98, 23.73],
  'Europe/Istanbul': [41.01, 28.98],
  'Europe/Kyiv': [50.45, 30.52],
  'Europe/Kiev': [50.45, 30.52],
  'Europe/Warsaw': [52.23, 21.01],
  'Europe/Lisbon': [38.72, -9.14],
  'Europe/Dublin': [53.35, -6.26],
  'Europe/Zurich': [47.38, 8.55],
  'Europe/Vienna': [48.21, 16.37],
  'Europe/Prague': [50.08, 14.44],
  'Europe/Bucharest': [44.43, 26.10],
  'Europe/Belgrade': [44.79, 20.45],
  'Europe/Sofia': [42.70, 23.32],
  'Europe/Minsk': [53.90, 27.57],
  'Europe/Riga': [56.95, 24.11],
  'Europe/Tallinn': [59.44, 24.75],
  'Europe/Vilnius': [54.69, 25.28],
  'America/New_York': [40.71, -74.01],
  'America/Chicago': [41.88, -87.63],
  'America/Denver': [39.74, -104.99],
  'America/Los_Angeles': [34.05, -118.24],
  'America/Phoenix': [33.45, -112.07],
  'America/Anchorage': [61.22, -149.90],
  'America/Honolulu': [21.31, -157.86],
  'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12],
  'America/Mexico_City': [19.43, -99.13],
  'America/Sao_Paulo': [-23.55, -46.63],
  'America/Buenos_Aires': [-34.61, -58.38],
  'Asia/Tokyo': [35.68, 139.69],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Bangkok': [13.76, 100.50],
  'Asia/Jakarta': [-6.21, 106.85],
  'Asia/Kolkata': [22.57, 88.36],
  'Asia/Dubai': [25.20, 55.27],
  'Asia/Jerusalem': [31.78, 35.22],
  'Asia/Tbilisi': [41.72, 44.78],
  'Asia/Yekaterinburg': [56.84, 60.61],
  'Asia/Novosibirsk': [55.04, 82.93],
  'Africa/Cairo': [30.04, 31.24],
  'Africa/Lagos': [6.46, 3.40],
  'Africa/Johannesburg': [-26.20, 28.04],
  'Australia/Sydney': [-33.87, 151.21],
  'Australia/Melbourne': [-37.81, 144.96],
  'Pacific/Auckland': [-36.85, 174.76],
};

/** Фолбэк-координаты (Москва). @type {[number, number]} */
export const FALLBACK_COORDS = [55.75, 37.62];

/**
 * Координаты по IANA-таймзоне с фолбэком на Москву.
 * @param {string|null} [tz] таймзона; если не передана — определяется из Intl
 * @returns {[number, number]}
 */
export function coordsForTimezone(tz) {
  let zone = tz ?? null;
  if (zone == null) {
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { zone = null; }
  }
  return (zone && TZ_COORDS[zone]) || FALLBACK_COORDS;
}

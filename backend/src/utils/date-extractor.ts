import * as chrono from 'chrono-node';
import {
  addDays, addWeeks, addMonths,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  endOfYear,
  nextSaturday, nextSunday,
} from 'date-fns';

export interface ExtractedRange {
  startDate: Date;
  endDate: Date;
  isExplicit: boolean;
}

const MONTHS_RU = [
  'январ', 'феврал', 'март', 'апрел', 'ма', 'июн',
  'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр',
];

/**
 * Natural Language Date Extractor
 * Handles Russian temporal phrases + delegates English to chrono-node.
 */
export class DateExtractor {

  static extract(text: string, ref: Date = new Date()): ExtractedRange | null {
    const low = text.toLowerCase();

    // Ranges must come before single-date patterns to avoid partial matches
    const ruRange = tryRuRange(low, ref);
    if (ruRange) return ruRange;

    // Exact date: "25 апреля", "25 апреля 2026"
    const exactDate = tryRuExactDate(low, ref);
    if (exactDate) return exactDate;

    // Today / tomorrow / day-after
    if (/сегодня/.test(low)) return single(ref);
    if (/завтра/.test(low) && !/послезавтра/.test(low)) return single(addDays(ref, 1));
    if (/послезавтра/.test(low)) return single(addDays(ref, 2));

    // "через N дней/недель/месяцев"
    const inN = tryRuInN(low, ref);
    if (inN) return inN;

    // "в ближайшие N дней"
    const nextN = tryRuNextN(low, ref);
    if (nextN) return nextN;

    // "до конца недели / месяца"
    if (/до конца недели/.test(low))
      return range(ref, endOfWeek(ref, { weekStartsOn: 1 }));
    if (/до конца месяца/.test(low))
      return range(ref, endOfMonth(ref));

    // Week references
    if (/на этой неделе|эта неделя/.test(low))
      return range(ref, endOfWeek(ref, { weekStartsOn: 1 }));
    if (/следующ.{0,4}недел/.test(low)) {
      const s = addDays(endOfWeek(ref, { weekStartsOn: 1 }), 1);
      return range(s, endOfWeek(s, { weekStartsOn: 1 }));
    }
    if (/прошл.{0,4}недел/.test(low)) {
      const s = addDays(startOfWeek(ref, { weekStartsOn: 1 }), -7);
      return range(s, addDays(s, 6));
    }

    // Weekends
    if (/выходны/.test(low)) {
      const sat = nextSaturday(ref);
      return range(sat, nextSunday(ref));
    }

    // Month references
    if (/следующ.{0,4}месяц/.test(low)) {
      const m = addMonths(ref, 1);
      return range(startOfMonth(m), endOfMonth(m));
    }
    if (/этот месяц|в этом месяце|текущ.{0,4}месяц/.test(low))
      return range(ref, endOfMonth(ref));

    // Named months: "в мае", "майский", etc.
    const namedMonth = tryRuNamedMonth(low, ref);
    if (namedMonth) return namedMonth;

    // Seasons
    const season = tryRuSeason(low, ref);
    if (season) return season;

    // Year
    if (/в этом году/.test(low))
      return range(ref, endOfYear(ref));
    if (/следующ.{0,4}год/.test(low)) {
      const y = utcDate(ref.getFullYear() + 1, 0, 1);
      return range(y, endOfYear(y));
    }

    // --- English: delegate to chrono-node ---
    return tryChronoEn(text, ref);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Create date in UTC to avoid timezone shift on .toISOString() */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function single(d: Date): ExtractedRange {
  return { startDate: d, endDate: d, isExplicit: true };
}

function range(s: Date, e: Date): ExtractedRange {
  return { startDate: s, endDate: e, isExplicit: true };
}

// "через 3 дня", "через 2 недели", "через месяц"
function tryRuInN(low: string, ref: Date): ExtractedRange | null {
  const m = low.match(/через\s+(\d+|один|одну|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)?\s*(день|дня|дней|неделю|недели|недель|месяц|месяца|месяцев)/);
  if (!m) return null;
  const n = parseRuNum(m[1] ?? '1');
  const unit = m[2];
  let d: Date;
  if (/день|дня|дней/.test(unit)) d = addDays(ref, n);
  else if (/недел/.test(unit)) d = addWeeks(ref, n);
  else d = addMonths(ref, n);
  return single(d);
}

// "в ближайшие 7 дней / 2 недели"
function tryRuNextN(low: string, ref: Date): ExtractedRange | null {
  const m = low.match(/ближайши[ехй]\s+(\d+)\s*(дн|недел|месяц)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  let end: Date;
  if (unit === 'дн') end = addDays(ref, n);
  else if (/недел/.test(unit)) end = addWeeks(ref, n);
  else end = addMonths(ref, n);
  return range(ref, end);
}

// "25 апреля", "25 апреля 2026" — only if no range detected first
function tryRuExactDate(low: string, ref: Date): ExtractedRange | null {
  for (let i = 0; i < MONTHS_RU.length; i++) {
    const re = new RegExp(`(\\d{1,2})\\s+${MONTHS_RU[i]}[а-яё]*(?:\\s+(\\d{4}))?`);
    const m = low.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = m[2] ? parseInt(m[2], 10) : ref.getFullYear();
      return single(utcDate(year, i, day));
    }
  }
  return null;
}

// "с 1 по 15 мая", "с 25 апреля по 10 мая"
function tryRuRange(low: string, ref: Date): ExtractedRange | null {
  const year = ref.getFullYear();

  // Same month: "с 1 по 15 мая"
  for (let i = 0; i < MONTHS_RU.length; i++) {
    const re = new RegExp(`с\\s+(\\d{1,2})\\s+по\\s+(\\d{1,2})\\s+${MONTHS_RU[i]}[а-яё]*`);
    const m = low.match(re);
    if (m) {
      return range(
        utcDate(year, i, parseInt(m[1], 10)),
        utcDate(year, i, parseInt(m[2], 10)),
      );
    }
  }

  // Cross-month: "с 25 апреля по 10 мая"
  const monthPat = MONTHS_RU.join('|');
  const crossRe = new RegExp(
    `с\\s+(\\d{1,2})\\s+(${monthPat})[а-яё]*\\s+по\\s+(\\d{1,2})\\s+(${monthPat})[а-яё]*`
  );
  const cm = low.match(crossRe);
  if (cm) {
    const mi1 = MONTHS_RU.findIndex(m => cm[2].startsWith(m));
    const mi2 = MONTHS_RU.findIndex(m => cm[4].startsWith(m));
    if (mi1 >= 0 && mi2 >= 0) {
      return range(
        utcDate(year, mi1, parseInt(cm[1], 10)),
        utcDate(year, mi2, parseInt(cm[3], 10)),
      );
    }
  }

  return null;
}

// Named months: "в мае", "в январе"
function tryRuNamedMonth(low: string, ref: Date): ExtractedRange | null {
  for (let i = 0; i < MONTHS_RU.length; i++) {
    if (new RegExp(MONTHS_RU[i] + '[а-яё]*').test(low)) {
      let year = ref.getFullYear();
      if (ref.getMonth() > i) year++;
      const start = utcDate(year, i, 1);
      const end = utcDate(year, i + 1, 0); // last day of month
      return range(start, end);
    }
  }
  return null;
}

// Seasons (Northern hemisphere)
function tryRuSeason(low: string, ref: Date): ExtractedRange | null {
  const y = ref.getFullYear();
  if (/весн/.test(low)) return range(utcDate(y, 2, 1), utcDate(y, 4, 31));
  if (/лет|летом/.test(low)) return range(utcDate(y, 5, 1), utcDate(y, 7, 31));
  if (/осен/.test(low)) return range(utcDate(y, 8, 1), utcDate(y, 10, 30));
  if (/зим/.test(low)) return range(utcDate(y, 11, 1), utcDate(y + 1, 1, 28));
  return null;
}

// English via chrono-node
function tryChronoEn(text: string, ref: Date): ExtractedRange | null {
  const results = chrono.parse(text, ref, { forwardDate: true });
  if (!results.length) return null;

  if (results.length === 1) {
    const r = results[0];
    const start = r.start.date();
    const end = r.end ? r.end.date() : start;
    return { startDate: start, endDate: end, isExplicit: true };
  }

  // Multiple results → take full span
  const starts = results.map(r => r.start.date().getTime());
  const ends = results.map(r => (r.end ?? r.start).date().getTime());
  return {
    startDate: new Date(Math.min(...starts)),
    endDate: new Date(Math.max(...ends)),
    isExplicit: true,
  };
}

function parseRuNum(word: string): number {
  const map: Record<string, number> = {
    один: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4,
    пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  };
  return map[word] ?? (parseInt(word, 10) || 1);
}

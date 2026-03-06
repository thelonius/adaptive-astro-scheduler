/**
 * Antigravity VS Code Extension
 * Planet Color Engine — pure Node.js, без браузерных зависимостей
 */

export type PlanetName =
    | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
    | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

export interface PlanetColorSet {
    base: string;
    dark: string;
    light: string;
    symbol: string;
    nameRu: string;
    archetype: string;
}

export const PLANET_COLORS: Record<PlanetName, PlanetColorSet> = {
    Sun: { base: '#FFD700', dark: '#FFA500', light: '#E8950A', symbol: '☀️', nameRu: 'Солнце', archetype: 'Витальность, воля' },
    Moon: { base: '#C0C0C0', dark: '#A8B8D0', light: '#6B7E9C', symbol: '🌙', nameRu: 'Луна', archetype: 'Интуиция, эмоции' },
    Mercury: { base: '#00D4FF', dark: '#00C4EF', light: '#0086CC', symbol: '☿', nameRu: 'Меркурий', archetype: 'Мышление, коммуникация' },
    Venus: { base: '#FF69B4', dark: '#FF1493', light: '#C2185B', symbol: '♀', nameRu: 'Венера', archetype: 'Красота, любовь' },
    Mars: { base: '#FF4500', dark: '#E03000', light: '#B71C1C', symbol: '♂', nameRu: 'Марс', archetype: 'Энергия, действие' },
    Jupiter: { base: '#9B59B6', dark: '#8E44AD', light: '#5E2D91', symbol: '♃', nameRu: 'Юпитер', archetype: 'Мудрость, рост' },
    Saturn: { base: '#5B6EAE', dark: '#4B5A9C', light: '#2C3E80', symbol: '♄', nameRu: 'Сатурн', archetype: 'Структура, карма' },
    Uranus: { base: '#00E5E5', dark: '#00FFFF', light: '#006CAA', symbol: '⛢', nameRu: 'Уран', archetype: 'Революция, свобода' },
    Neptune: { base: '#3A5FC8', dark: '#4169E1', light: '#1A237E', symbol: '♆', nameRu: 'Нептун', archetype: 'Мистика, интуиция' },
    Pluto: { base: '#8B008B', dark: '#9C00B0', light: '#4A004A', symbol: '♇', nameRu: 'Плутон', archetype: 'Трансформация' },
};

/** Управители знаков зодиака */
export const SIGN_RULERS: Record<string, PlanetName> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

/** Хальдейский порядок планет */
const CHALDEAN_ORDER: PlanetName[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

/** Управители дней недели (0=Вс, 1=Пн, ...) */
export const WEEKDAY_RULERS: Record<number, { planet: PlanetName; nameRu: string; nameEn: string }> = {
    0: { planet: 'Sun', nameRu: 'Воскресенье', nameEn: 'Sunday' },
    1: { planet: 'Moon', nameRu: 'Понедельник', nameEn: 'Monday' },
    2: { planet: 'Mars', nameRu: 'Вторник', nameEn: 'Tuesday' },
    3: { planet: 'Mercury', nameRu: 'Среда', nameEn: 'Wednesday' },
    4: { planet: 'Jupiter', nameRu: 'Четверг', nameEn: 'Thursday' },
    5: { planet: 'Venus', nameRu: 'Пятница', nameEn: 'Friday' },
    6: { planet: 'Saturn', nameRu: 'Суббота', nameEn: 'Saturday' },
};

export function getWeekdayRuler(date: Date) {
    return WEEKDAY_RULERS[date.getDay()];
}

/** Управитель хальдейского планетарного часа */
export function getPlanetaryHourRuler(date: Date): PlanetName {
    const dayInfo = WEEKDAY_RULERS[date.getDay()];
    const startIdx = CHALDEAN_ORDER.indexOf(dayInfo.planet);
    const hour = date.getHours();
    return CHALDEAN_ORDER[(startIdx + hour) % 7];
}

/** Hex → RGB */
export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
    ];
}

/** RGB → Hex */
export function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/** Блендинг нескольких цветов с весами */
export function blendColors(inputs: Array<{ color: string; weight: number }>): string {
    const total = inputs.reduce((s, i) => s + i.weight, 0);
    let r = 0, g = 0, b = 0;
    for (const { color, weight } of inputs) {
        const [cr, cg, cb] = hexToRgb(color);
        const w = weight / total;
        r += cr * w; g += cg * w; b += cb * w;
    }
    return rgbToHex(r, g, b);
}

/** Линейная интерполяция цвета (для анимации перехода) */
export function lerpColor(from: string, to: string, t: number): string {
    const [r1, g1, b1] = hexToRgb(from);
    const [r2, g2, b2] = hexToRgb(to);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Сдвиг оттенка (HSL) */
export function shiftHue(hex: string, degrees: number): string {
    const [r, g, b] = hexToRgb(hex);
    // RGB → HSL
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
        else if (max === gf) h = ((bf - rf) / d + 2) / 6;
        else h = ((rf - gf) / d + 4) / 6;
    }
    h = (h + degrees / 360 + 1) % 1;
    // HSL → RGB
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return rgbToHex(hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255);
}

/** Затемнить цвет */
export function darken(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const f = Math.max(0, 1 - amount);
    return rgbToHex(r * f, g * f, b * f);
}

/** Осветлить цвет (смешать с белым) */
export function lighten(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Добавить прозрачность (вернуть как RGBA строку) */
export function alpha(hex: string, a: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
}

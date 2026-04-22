/**
 * Antigravity — Natal Day Color Engine
 *
 * Вычисляет персонализированные цвета дня на основе:
 * 1. Управителя дня недели (хальдейская система) — вес 35%
 * 2. Личного управителя ASC из натальной карты — вес 30%
 * 3. Доминирующего транзита дня — вес 25%
 * 4. Цветов лунного дня — вес 10%
 */

import chroma from 'chroma-js';
import { PLANET_COLORS, SIGN_RULERS, getPlanetColor } from './planetColors';
import { getWeekdayRuler } from './weekdayRulers';
import type { PlanetName } from './planetColors';
import type { NatalChartData } from '../hooks/useNatalChart';

export type ColorMode = 'dark' | 'light';

export interface DayColorSource {
    planet: PlanetName;
    weight: number;
    label: string;
    reason: string;
}

export interface DayColorPalette {
    /** Источники цветов (для объяснения пользователю) */
    sources: DayColorSource[];

    /** Финальные блендированные цвета */
    primary: string;
    secondary: string;
    accent: string;

    /** Вариант для тёмной темы */
    dark: DayThemeVariant;
    /** Вариант для светлой темы */
    light: DayThemeVariant;

    /** CSS gradient для фона/хедера */
    backgroundGradientDark: string;
    backgroundGradientLight: string;

    /** Метаинформация */
    weekdayRuler: PlanetName;
    personalRuler: PlanetName | null;
    transitRuler: PlanetName | null;
    date: Date;
}

export interface DayThemeVariant {
    bg: string;
    bgSubtle: string;        // чуть светлее/темнее bg
    surface: string;
    surfaceHover: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textAccent: string;
    glow: string;
    glowStrong: string;
}

// Веса для блендинга
const WEIGHTS = {
    weekday: 0.35,
    personal: 0.30,
    transit: 0.25,
    lunar: 0.10,
} as const;

/**
 * Определить знак ASC из данных натальной карты
 */
function getAscendantSign(natalChart: NatalChartData): string | null {
    // ASC находится в домах — куспид первого дома
    const firstHouse = natalChart.houses?.find?.(
        (h: any) => h.number === 1 || h.houseNumber === 1
    );
    if (firstHouse) {
        // House.sign — это объект ZodiacSign, нужно .name; но данные могут быть разными
        const sign = firstHouse.sign;
        if (typeof sign === 'string') return sign;
        if (sign && typeof sign === 'object') return (sign as any).name || null;
        // HouseApiData возвращает zodiacSign как строку
        return (firstHouse as any).zodiacSign || null;
    }
    // Также может быть как планета с именем 'Ascendant'
    const asc = natalChart.planets?.find?.(
        (p: any) => p.name === 'Ascendant' || p.name === 'ASC'
    );
    if (asc) {
        const sign = (asc as any).zodiacSign;
        if (typeof sign === 'string') return sign;
        if (sign && typeof sign === 'object') return (sign as any).name || null;
    }
    return null;
}

/**
 * Определить доминирующую транзитную планету дня
 * (с наименьшим орбисом из significantTransits)
 */
function getDominantTransitPlanet(transits: any): PlanetName | null {
    if (!transits?.significantTransits?.length) return null;

    const sorted = [...transits.significantTransits].sort(
        (a: any, b: any) => Math.abs(a.orb || 0) - Math.abs(b.orb || 0)
    );

    const planet = sorted[0]?.transitingPlanet as PlanetName;
    return PLANET_COLORS[planet] ? planet : null;
}

/**
 * Получить базовый цвет лунного дня (из colorPalette если есть)
 */
function getLunarDayBaseColor(lunarDay: any): string | null {
    if (!lunarDay) return null;
    const colors = lunarDay.colorPalette?.base_colors || lunarDay.colorPalette?.baseColors;
    return colors?.[0] || null;
}

/**
 * Создать тёмный вариант темы из основного цвета
 */
function buildDarkTheme(primaryHex: string, _accentHex: string): DayThemeVariant {
    const p = chroma(primaryHex);

    return {
        bg: '#080c18',
        bgSubtle: chroma('#080c18').brighten(0.3).hex(),
        surface: chroma.mix('#0f1626', primaryHex, 0.04, 'rgb').hex(),
        surfaceHover: chroma.mix('#0f1626', primaryHex, 0.09, 'rgb').hex(),
        border: chroma.mix('#1a2235', primaryHex, 0.15, 'rgb').hex(),
        borderStrong: chroma.mix('#1a2235', primaryHex, 0.35, 'rgb').hex(),
        text: '#e8edf7',
        textMuted: '#6b7fa8',
        textAccent: p.brighten(0.5).saturate(0.3).hex(),
        glow: p.alpha(0.15).css(),
        glowStrong: p.alpha(0.3).css(),
    };
}

/**
 * Создать светлый вариант темы из основного цвета
 */
function buildLightTheme(primaryHex: string, _accentHex: string): DayThemeVariant {
    const p = chroma(primaryHex);

    return {
        bg: chroma.mix('#f0f4fc', primaryHex, 0.04, 'rgb').hex(),
        bgSubtle: chroma.mix('#e8eef8', primaryHex, 0.06, 'rgb').hex(),
        surface: '#ffffff',
        surfaceHover: chroma.mix('#f8faff', primaryHex, 0.06, 'rgb').hex(),
        border: chroma.mix('#dde3f0', primaryHex, 0.12, 'rgb').hex(),
        borderStrong: chroma.mix('#b8c5dc', primaryHex, 0.2, 'rgb').hex(),
        text: '#1a2035',
        textMuted: '#5a6a8a',
        textAccent: p.darken(0.5).hex(),
        glow: p.alpha(0.1).css(),
        glowStrong: p.alpha(0.2).css(),
    };
}

/**
 * Основная функция — вычислить палитру цветов дня
 */
export function computeDayColorPalette(
    date: Date,
    natalChart?: NatalChartData | null,
    transits?: any,
    lunarDay?: any
): DayColorPalette {
    const sources: DayColorSource[] = [];
    const colorInputs: Array<{ color: string; weight: number }> = [];

    // 1. Управитель дня недели (всегда есть)
    const weekdayInfo = getWeekdayRuler(date);
    const weekdayPlanet = weekdayInfo.planet;
    const weekdayColor = getPlanetColor(weekdayPlanet, 'base');
    sources.push({
        planet: weekdayPlanet,
        weight: WEIGHTS.weekday,
        label: `${weekdayInfo.dayNameRu}`,
        reason: `${PLANET_COLORS[weekdayPlanet].symbol} ${PLANET_COLORS[weekdayPlanet].nameRu} управляет ${weekdayInfo.dayNameRu}`,
    });
    colorInputs.push({ color: weekdayColor, weight: WEIGHTS.weekday });

    // 2. Личный управитель ASC
    let personalPlanet: PlanetName | null = null;
    if (natalChart) {
        const ascSign = getAscendantSign(natalChart);
        if (ascSign) {
            const planetKey = ascSign.charAt(0).toUpperCase() + ascSign.slice(1).toLowerCase();
            personalPlanet = SIGN_RULERS[planetKey] || null;
        }
        // Fallback: управитель знака Солнца
        if (!personalPlanet) {
            const sunPlanet = natalChart.planets?.find?.((p: any) => p.name === 'Sun');
            const rawSign = sunPlanet?.zodiacSign;
            // zodiacSign — объект ZodiacSign или строка в зависимости от контекста
            let sunSign: string | null = null;
            if (typeof rawSign === 'string') {
                sunSign = rawSign;
            } else if (rawSign && typeof rawSign === 'object') {
                sunSign = (rawSign as any).name || null;
            }
            if (sunSign) {
                const planetKey = sunSign.charAt(0).toUpperCase() + sunSign.slice(1).toLowerCase();
                personalPlanet = SIGN_RULERS[planetKey] || null;
            }
        }
    }

    if (personalPlanet) {
        const personalColor = getPlanetColor(personalPlanet, 'base');
        sources.push({
            planet: personalPlanet,
            weight: WEIGHTS.personal,
            label: 'Личный управитель',
            reason: `${PLANET_COLORS[personalPlanet].symbol} ${PLANET_COLORS[personalPlanet].nameRu} — управитель вашего ASC`,
        });
        colorInputs.push({ color: personalColor, weight: WEIGHTS.personal });
    } else {
        // Перераспределить вес на управителя дня
        colorInputs[0].weight += WEIGHTS.personal;
    }

    // 3. Доминирующий транзит
    let transitPlanet: PlanetName | null = null;
    if (transits) {
        transitPlanet = getDominantTransitPlanet(transits);
    }

    if (transitPlanet) {
        const transitColor = getPlanetColor(transitPlanet, 'base');
        sources.push({
            planet: transitPlanet,
            weight: WEIGHTS.transit,
            label: 'Доминирующий транзит',
            reason: `${PLANET_COLORS[transitPlanet].symbol} ${PLANET_COLORS[transitPlanet].nameRu} — точный транзит дня`,
        });
        colorInputs.push({ color: transitColor, weight: WEIGHTS.transit });
    } else {
        colorInputs[0].weight += WEIGHTS.transit;
    }

    // 4. Лунный день (уже есть цвет из lunar_days.json)
    const lunarBaseColor = getLunarDayBaseColor(lunarDay);
    if (lunarBaseColor) {
        sources.push({
            planet: 'Moon', // Лунный день всегда под Луной
            weight: WEIGHTS.lunar,
            label: 'Лунный день',
            reason: `Цвет ${lunarDay?.number || '?'}-го лунного дня`,
        });
        colorInputs.push({ color: lunarBaseColor, weight: WEIGHTS.lunar });
    } else {
        colorInputs[0].weight += WEIGHTS.lunar;
    }

    // Нормализуем веса
    const totalWeight = colorInputs.reduce((sum, ci) => sum + ci.weight, 0);
    const normalized = colorInputs.map(ci => ({
        ...ci,
        weight: ci.weight / totalWeight,
    }));

    // Блендируем все цвета с chroma-js
    let blendedR = 0, blendedG = 0, blendedB = 0;
    for (const { color, weight } of normalized) {
        const [r, g, b] = chroma(color).rgb();
        blendedR += r * weight;
        blendedG += g * weight;
        blendedB += b * weight;
    }
    const primary = chroma(blendedR, blendedG, blendedB, 'rgb').hex();

    // Secondary — сдвиг оттенка на +30°
    const secondary = chroma(primary).set('hsl.h', '+30').hex();
    // Accent — комплементарный (+150°)
    const accent = chroma(primary).set('hsl.h', '+150').saturate(0.5).hex();

    // CSS Gradients
    const backgroundGradientDark = [
        `linear-gradient(135deg,`,
        `  #080c18 0%,`,
        `  ${chroma(primary).alpha(0.08).css()} 50%,`,
        `  ${chroma(secondary).alpha(0.04).css()} 100%`,
        `)`,
    ].join('\n');

    const backgroundGradientLight = [
        `linear-gradient(135deg,`,
        `  #f0f4fc 0%,`,
        `  ${chroma(primary).brighten(2.5).desaturate(0.5).alpha(0.4).css()} 50%,`,
        `  ${chroma(secondary).brighten(2.8).desaturate(0.6).alpha(0.3).css()} 100%`,
        `)`,
    ].join('\n');

    return {
        sources,
        primary,
        secondary,
        accent,
        dark: buildDarkTheme(primary, accent),
        light: buildLightTheme(primary, accent),
        backgroundGradientDark,
        backgroundGradientLight,
        weekdayRuler: weekdayPlanet,
        personalRuler: personalPlanet,
        transitRuler: transitPlanet,
        date,
    };
}

/**
 * Применить палитру как CSS-переменные на :root
 */
export function applyDayPaletteToCSS(
    palette: DayColorPalette,
    mode: ColorMode
): void {
    const root = document.documentElement;
    const theme = mode === 'dark' ? palette.dark : palette.light;

    // Динамические переменные дня
    root.style.setProperty('--ag-day-primary', palette.primary);
    root.style.setProperty('--ag-day-secondary', palette.secondary);
    root.style.setProperty('--ag-day-accent', palette.accent);

    // Переменные темы
    root.style.setProperty('--ag-bg', theme.bg);
    root.style.setProperty('--ag-bg-subtle', theme.bgSubtle);
    root.style.setProperty('--ag-surface', theme.surface);
    root.style.setProperty('--ag-surface-hover', theme.surfaceHover);
    root.style.setProperty('--ag-border', theme.border);
    root.style.setProperty('--ag-border-strong', theme.borderStrong);
    root.style.setProperty('--ag-text', theme.text);
    root.style.setProperty('--ag-text-muted', theme.textMuted);
    root.style.setProperty('--ag-text-accent', theme.textAccent);
    root.style.setProperty('--ag-day-glow', theme.glow);
    root.style.setProperty('--ag-day-glow-strong', theme.glowStrong);
    root.style.setProperty(
        '--ag-bg-gradient',
        mode === 'dark' ? palette.backgroundGradientDark : palette.backgroundGradientLight
    );

    // data-theme атрибут для CSS-селекторов
    root.setAttribute('data-theme', mode);

    // Статичные цвета планет
    const planetEntries = Object.entries(PLANET_COLORS) as Array<[PlanetName, any]>;
    for (const [name, colors] of planetEntries) {
        const varName = `--ag-${name.toLowerCase()}`;
        root.style.setProperty(varName, colors[mode === 'dark' ? 'dark' : 'light']);
    }
}

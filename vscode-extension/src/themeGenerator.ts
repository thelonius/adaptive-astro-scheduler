/**
 * Antigravity VS Code Extension
 * Theme Generator — генерирует полные VS Code colorCustomizations
 * на основе текущей планетарной конфигурации
 */

import {
    PLANET_COLORS,
    WEEKDAY_RULERS,
    getPlanetaryHourRuler,
    blendColors,
    shiftHue,
    darken,
    lighten,
    alpha,
    lerpColor,
    hexToRgb,
    rgbToHex,
    type PlanetName,
} from './colors';

export type ColorMode = 'dark' | 'light';

export interface SolarTimes {
    sunrise: Date;
    sunset: Date;
    civilDawn: Date;   // -6°
    civilDusk: Date;
    solarNoon: Date;
    dayLengthMinutes: number;
}

/**
 * Рассчитать восход и закат по формуле NOAA (Spencer, 1971)
 * Погрешность ≤ 2 минуты для широт < 72°
 */
export function computeSolarTimes(date: Date, lat: number, lon: number): SolarTimes {
    const dayOfYear = getDayOfYear(date);
    const latRad = lat * Math.PI / 180;

    // Уравнение времени (минуты)
    const B = 2 * Math.PI * (dayOfYear - 1) / 365;
    const eqOfTime = 229.18 * (
        0.000075 +
        0.001868 * Math.cos(B) -
        0.032077 * Math.sin(B) -
        0.014615 * Math.cos(2 * B) -
        0.04089 * Math.sin(2 * B)
    );

    // Склонение Солнца (радианы)
    const declination = (0.006918 - 0.399912 * Math.cos(B) + 0.070257 * Math.sin(B)
        - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B)
        - 0.002697 * Math.cos(3 * B) + 0.00148 * Math.sin(3 * B));

    // Часовой угол восхода (солнца на горизонте: 0°)
    const cosHourAngle = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declination))
        / (Math.cos(latRad) * Math.cos(declination));

    // Гражданские сумерки: -6°
    const cosHourAngleCivil = (Math.cos(96 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declination))
        / (Math.cos(latRad) * Math.cos(declination));

    const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) * 180 / Math.PI;
    const hourAngleCivil = Math.acos(Math.max(-1, Math.min(1, cosHourAngleCivil))) * 180 / Math.PI;

    // Часовой пояс из смещения UTC
    const tzOffsetMin = -date.getTimezoneOffset();

    // Солнечный полдень (минуты от полночи, местное время)
    const solarNoonMin = 720 - 4 * lon - eqOfTime + tzOffsetMin;
    const sunriseMin = solarNoonMin - hourAngle * 4;
    const sunsetMin = solarNoonMin + hourAngle * 4;
    const civilDawnMin = solarNoonMin - hourAngleCivil * 4;
    const civilDuskMin = solarNoonMin + hourAngleCivil * 4;

    const minToDate = (base: Date, mins: number) => {
        const d = new Date(base);
        d.setHours(0, 0, 0, 0);
        d.setTime(d.getTime() + mins * 60_000);
        return d;
    };

    const base = new Date(date);
    const sunrise = minToDate(base, sunriseMin);
    const sunset = minToDate(base, sunsetMin);

    return {
        sunrise,
        sunset,
        civilDawn: minToDate(base, civilDawnMin),
        civilDusk: minToDate(base, civilDuskMin),
        solarNoon: minToDate(base, solarNoonMin),
        dayLengthMinutes: Math.max(0, sunsetMin - sunriseMin),
    };
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Определить ColorMode по реальному восходу/закату
 * (использует гражданские сумерки — civil twilight — как порог)
 *
 * @param date - текущее время
 * @param lat  - широта (из настроек расширения)
 * @param lon  - долгота (из настроек расширения)
 * @param policy - 'civil' (default) | 'strict' | 'nautical'
 */
export function getAutoColorMode(
    date: Date,
    lat?: number,
    lon?: number,
    policy: 'strict' | 'civil' | 'nautical' = 'civil'
): ColorMode {
    // Если координаты не заданы — примитивный фолбэк
    if (lat === undefined || lon === undefined) {
        const h = date.getHours();
        return (h >= 7 && h < 19) ? 'light' : 'dark';
    }

    const solar = computeSolarTimes(date, lat, lon);
    const now = date.getTime();

    if (policy === 'strict') {
        return (now >= solar.sunrise.getTime() && now <= solar.sunset.getTime()) ? 'light' : 'dark';
    }
    if (policy === 'civil') {
        return (now >= solar.civilDawn.getTime() && now <= solar.civilDusk.getTime()) ? 'light' : 'dark';
    }
    // nautical — упрощённо добавляем 1ч к гражданским
    const nautDawn = new Date(solar.civilDawn.getTime() - 60 * 60_000);
    const nautDusk = new Date(solar.civilDusk.getTime() + 60 * 60_000);
    return (now >= nautDawn.getTime() && now <= nautDusk.getTime()) ? 'light' : 'dark';
}

/**
 * Время (мс) до следующего перехода (восход или закат)
 * Используется для планирования таймера в extension.ts
 */
export function getMsUntilNextSolarTransition(
    date: Date,
    lat: number,
    lon: number,
    policy: 'strict' | 'civil' | 'nautical' = 'civil'
): number {
    const solar = computeSolarTimes(date, lat, lon);
    const now = date.getTime();

    const transitions: number[] = [];

    if (policy === 'strict') {
        transitions.push(solar.sunrise.getTime(), solar.sunset.getTime());
    } else if (policy === 'civil') {
        transitions.push(solar.civilDawn.getTime(), solar.civilDusk.getTime());
    } else {
        const nd = new Date(solar.civilDawn.getTime() - 3600_000).getTime();
        const nk = new Date(solar.civilDusk.getTime() + 3600_000).getTime();
        transitions.push(nd, nk);
    }

    const future = transitions.filter(t => t > now);
    if (future.length === 0) {
        // Всё сегодня прошло — следующий восход завтра
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowSolar = computeSolarTimes(tomorrow, lat, lon);
        return tomorrowSolar.sunrise.getTime() - now;
    }
    return Math.min(...future) - now;
}

export interface AstroThemeColors {

    /** Основной цвет дня (блендинг управителей) */
    primary: string;
    secondary: string;
    accent: string;
    /** Планета-управитель текущего часа */
    hourRuler: PlanetName;
    /** Планета-управитель дня */
    dayRuler: PlanetName;
    /** Режим (темная/светлая) */
    mode: ColorMode;
    /** Timestamp вычисления */
    computedAt: Date;
    /** Человекочитаемое описание */
    description: string;
}

/**
 * Вычислить астро-цвета для заданной даты
 */
export function computeAstroThemeColors(
    date: Date,
    mode: ColorMode,
    personalPlanet?: PlanetName | null,
): AstroThemeColors {
    const dayInfo = WEEKDAY_RULERS[date.getDay()];
    const hourRuler = getPlanetaryHourRuler(date);
    const dayRuler = dayInfo.planet;

    // Веса: управитель дня 40%, планетарный час 35%, личная планета 25%
    const colorInputs: Array<{ color: string; weight: number }> = [
        { color: PLANET_COLORS[dayRuler].base, weight: 0.40 },
        { color: PLANET_COLORS[hourRuler].base, weight: 0.35 },
    ];
    if (personalPlanet) {
        colorInputs.push({ color: PLANET_COLORS[personalPlanet].base, weight: 0.25 });
    } else {
        colorInputs[0].weight += 0.125;
        colorInputs[1].weight += 0.125;
    }

    const primary = blendColors(colorInputs);
    const secondary = shiftHue(primary, 30);
    const accent = shiftHue(primary, 150);

    const hour = date.getHours();
    const dayName = dayInfo.nameRu;
    const hourPlanetName = PLANET_COLORS[hourRuler].nameRu;
    const description = `${dayName} · Час ${PLANET_COLORS[hourRuler].symbol} ${hourPlanetName} · ${hour}:00`;

    return { primary, secondary, accent, hourRuler, dayRuler, mode, computedAt: date, description };
}

/**
 * Генерировать полный объект workbench.colorCustomizations
 * на основе астро-цветов для тёмной темы
 */
export function generateDarkColorCustomizations(colors: AstroThemeColors): Record<string, string> {
    const { primary, secondary, accent } = colors;
    const p = primary;

    // Базовые фоны (очень тёмные, с лёгким оттенком планеты)
    const bg0 = '#080c18';        // самый тёмный
    const bg1 = mix(bg0, p, 0.04); // фон редактора
    const bg2 = mix(bg0, p, 0.07); // сайдбар
    const bg3 = mix(bg0, p, 0.10); // активити бар
    const bg4 = mix(bg0, p, 0.13); // хедер вкладок
    const bg5 = mix(bg0, p, 0.18); // активная вкладка

    // Акцентные (планетарный цвет)
    const accent1 = lighten(p, 0.1);     // мягкий акцент
    const accent2 = p;                   // основной акцент
    const accent3 = darken(p, 0.15);    // тёмный акцент

    // Текст
    const text0 = '#e8edf7';             // основной
    const text1 = mix('#8899bb', p, 0.25); // вторичный
    const text2 = mix('#4a5a72', p, 0.2);  // задний план

    // Рамки
    const border0 = mix('#1a2235', p, 0.2);
    const border1 = mix('#243049', p, 0.3);

    return {
        // --- Editor ---
        'editor.background': bg1,
        'editor.foreground': text0,
        'editor.lineHighlightBackground': alpha(p, 0.06),
        'editor.lineHighlightBorder': alpha(p, 0.12),
        'editor.selectionBackground': alpha(p, 0.25),
        'editor.selectionHighlightBackground': alpha(p, 0.12),
        'editor.findMatchBackground': alpha(accent, 0.4),
        'editor.findMatchHighlightBackground': alpha(accent, 0.2),
        'editor.wordHighlightBackground': alpha(secondary, 0.15),
        'editor.wordHighlightStrongBackground': alpha(secondary, 0.25),
        'editorCursor.foreground': accent2,
        'editorWhitespace.foreground': alpha(p, 0.18),

        // --- Gutter ---
        'editorGutter.background': bg1,
        'editorLineNumber.foreground': text2,
        'editorLineNumber.activeForeground': accent1,

        // --- Activity Bar ---
        'activityBar.background': bg3,
        'activityBar.foreground': accent1,
        'activityBar.inactiveForeground': text2,
        'activityBar.border': border0,
        'activityBarBadge.background': accent2,
        'activityBarBadge.foreground': '#ffffff',

        // --- Side Bar ---
        'sideBar.background': bg2,
        'sideBar.foreground': text0,
        'sideBar.border': border0,
        'sideBarTitle.foreground': accent1,
        'sideBarSectionHeader.background': bg3,
        'sideBarSectionHeader.foreground': text1,
        'sideBarSectionHeader.border': border0,

        // --- File Tree ---
        'list.activeSelectionBackground': alpha(p, 0.2),
        'list.activeSelectionForeground': text0,
        'list.hoverBackground': alpha(p, 0.1),
        'list.hoverForeground': text0,
        'list.inactiveSelectionBackground': alpha(p, 0.12),
        'list.focusBackground': alpha(p, 0.15),
        'list.highlightForeground': accent2,

        // --- Tabs ---
        'editorGroupHeader.tabsBackground': bg4,
        'editorGroupHeader.tabsBorder': border0,
        'tab.activeBackground': bg5,
        'tab.activeForeground': text0,
        'tab.activeBorder': accent2,
        'tab.activeBorderTop': accent2,
        'tab.inactiveBackground': bg4,
        'tab.inactiveForeground': text2,
        'tab.hoverBackground': alpha(p, 0.12),
        'tab.border': border0,

        // --- Title Bar ---
        'titleBar.activeBackground': bg3,
        'titleBar.activeForeground': text0,
        'titleBar.inactiveBackground': bg3,
        'titleBar.inactiveForeground': text1,
        'titleBar.border': border0,

        // --- Status Bar ---
        'statusBar.background': accent3,
        'statusBar.foreground': '#ffffff',
        'statusBar.border': border0,
        'statusBar.noFolderBackground': darken(accent3, 0.2),
        'statusBarItem.hoverBackground': alpha('#ffffff', 0.15),
        'statusBarItem.prominentBackground': accent2,

        // --- Panel (Terminal etc) ---
        'panel.background': bg0,
        'panel.border': border0,
        'panelTitle.activeForeground': accent1,
        'panelTitle.activeBorder': accent2,
        'panelTitle.inactiveForeground': text2,

        // --- Terminal ---
        'terminal.background': bg0,
        'terminal.foreground': text0,
        'terminal.ansiBlack': '#1a2235',
        'terminal.ansiRed': PLANET_COLORS.Mars.dark,
        'terminal.ansiGreen': '#32CD32',
        'terminal.ansiYellow': PLANET_COLORS.Sun.dark,
        'terminal.ansiBlue': PLANET_COLORS.Saturn.dark,
        'terminal.ansiMagenta': PLANET_COLORS.Pluto.dark,
        'terminal.ansiCyan': PLANET_COLORS.Mercury.dark,
        'terminal.ansiWhite': text0,
        'terminal.ansiBrightBlack': text2,
        'terminal.ansiBrightRed': PLANET_COLORS.Mars.base,
        'terminal.ansiBrightGreen': '#4ADE80',
        'terminal.ansiBrightYellow': PLANET_COLORS.Sun.base,
        'terminal.ansiBrightBlue': PLANET_COLORS.Neptune.dark,
        'terminal.ansiBrightMagenta': PLANET_COLORS.Pluto.base,
        'terminal.ansiBrightCyan': PLANET_COLORS.Mercury.base,
        'terminal.ansiBrightWhite': '#ffffff',
        'terminal.ansiCursor': accent2,

        // --- Input & Widgets ---
        'input.background': bg2,
        'input.foreground': text0,
        'input.border': border0,
        'input.placeholderForeground': text2,
        'inputOption.activeBorder': accent2,
        'inputOption.activeBackground': alpha(p, 0.2),
        'dropdown.background': bg2,
        'dropdown.border': border0,
        'dropdown.foreground': text0,

        // --- Scrollbar ---
        'scrollbar.shadow': alpha(p, 0.2),
        'scrollbarSlider.background': alpha(p, 0.15),
        'scrollbarSlider.hoverBackground': alpha(p, 0.3),
        'scrollbarSlider.activeBackground': alpha(p, 0.45),

        // --- Buttons ---
        'button.background': accent2,
        'button.foreground': '#ffffff',
        'button.hoverBackground': lighten(accent2, 0.1),
        'button.secondaryBackground': alpha(p, 0.2),
        'button.secondaryForeground': text0,

        // --- Progress ---
        'progressBar.background': accent2,
        'notificationCenterHeader.background': bg3,
        'notifications.background': bg2,
        'notifications.border': border0,

        // --- Badges / Highlights ---
        'badge.background': accent2,
        'badge.foreground': '#ffffff',
        'activityBar.activeBorder': accent2,

        // --- Diff ---
        'diffEditor.insertedTextBackground': alpha('#32CD32', 0.12),
        'diffEditor.removedTextBackground': alpha(PLANET_COLORS.Mars.dark, 0.12),

        // --- Minimap ---
        'minimap.background': bg0,
        'minimap.selectionHighlight': alpha(p, 0.3),
        'minimapSlider.background': alpha(p, 0.1),
        'minimapSlider.hoverBackground': alpha(p, 0.2),

        // --- Breadcrumbs ---
        'breadcrumb.background': bg2,
        'breadcrumb.foreground': text1,
        'breadcrumb.focusForeground': accent1,

        // --- Search ---
        'search.resultsInfoForeground': text1,

        // --- Peek View ---
        'peekView.border': border1,
        'peekViewResult.background': bg2,
        'peekViewEditor.background': bg1,
        'peekViewTitle.background': bg3,
        'peekViewTitleLabel.foreground': accent1,
        'peekViewResult.selectionBackground': alpha(p, 0.2),
        'peekViewResult.matchHighlightBackground': alpha(accent, 0.3),

        // --- Git ---
        'gitDecoration.addedResourceForeground': '#32CD32',
        'gitDecoration.modifiedResourceForeground': accent1,
        'gitDecoration.deletedResourceForeground': PLANET_COLORS.Mars.dark,
        'gitDecoration.untrackedResourceForeground': PLANET_COLORS.Mercury.dark,
        'gitDecoration.conflictingResourceForeground': PLANET_COLORS.Saturn.dark,

        // --- Workbench ---
        'focusBorder': alpha(p, 0.5),
        'selection.background': alpha(p, 0.3),
        'widget.shadow': alpha(bg0, 0.6),
        'editorWidget.background': bg3,
        'editorWidget.border': border1,
        'quickInput.background': bg3,
        'quickInput.foreground': text0,
        'quickInputList.focusBackground': alpha(p, 0.2),
        'commandCenter.background': bg3,
        'commandCenter.border': border1,
        'commandCenter.activeBackground': alpha(p, 0.15),
    };
}

/**
 * Генерировать colorCustomizations для светлой темы
 */
export function generateLightColorCustomizations(colors: AstroThemeColors): Record<string, string> {
    const { primary, secondary, accent } = colors;
    const p = primary;

    const bg0 = '#f0f4fc';
    const bg1 = mix('#ffffff', p, 0.03);
    const bg2 = mix('#f8faff', p, 0.05);
    const bg3 = mix('#eef2fa', p, 0.08);
    const bg4 = mix('#e8eef8', p, 0.1);
    const bg5 = mix('#f5f8ff', p, 0.04);

    const accent1 = darken(p, 0.1);
    const accent2 = darken(p, 0.2);
    const accent3 = darken(p, 0.3);

    const text0 = '#1a2035';
    const text1 = mix('#4a5a72', p, 0.2);
    const text2 = mix('#8899aa', p, 0.15);

    const border0 = mix('#dde3f0', p, 0.15);
    const border1 = mix('#b8c5dc', p, 0.2);

    return {
        'editor.background': bg1,
        'editor.foreground': text0,
        'editor.lineHighlightBackground': alpha(p, 0.05),
        'editor.lineHighlightBorder': alpha(p, 0.10),
        'editor.selectionBackground': alpha(p, 0.18),
        'editor.selectionHighlightBackground': alpha(p, 0.08),
        'editor.findMatchBackground': alpha(accent, 0.3),
        'editor.findMatchHighlightBackground': alpha(accent, 0.15),
        'editor.wordHighlightBackground': alpha(secondary, 0.12),
        'editorCursor.foreground': accent2,
        'editorLineNumber.foreground': text2,
        'editorLineNumber.activeForeground': accent1,
        'editorGutter.background': bg1,

        'activityBar.background': bg4,
        'activityBar.foreground': accent2,
        'activityBar.inactiveForeground': text2,
        'activityBar.border': border0,
        'activityBarBadge.background': accent2,
        'activityBarBadge.foreground': '#ffffff',

        'sideBar.background': bg2,
        'sideBar.foreground': text0,
        'sideBar.border': border0,
        'sideBarTitle.foreground': accent2,
        'sideBarSectionHeader.background': bg3,
        'sideBarSectionHeader.foreground': text1,

        'list.activeSelectionBackground': alpha(p, 0.14),
        'list.activeSelectionForeground': text0,
        'list.hoverBackground': alpha(p, 0.07),
        'list.inactiveSelectionBackground': alpha(p, 0.08),
        'list.highlightForeground': accent2,

        'editorGroupHeader.tabsBackground': bg3,
        'tab.activeBackground': '#ffffff',
        'tab.activeForeground': text0,
        'tab.activeBorder': accent2,
        'tab.inactiveBackground': bg3,
        'tab.inactiveForeground': text2,
        'tab.border': border0,

        'titleBar.activeBackground': bg4,
        'titleBar.activeForeground': text0,
        'titleBar.border': border0,

        'statusBar.background': accent2,
        'statusBar.foreground': '#ffffff',
        'statusBar.border': border0,

        'panel.background': bg0,
        'panel.border': border0,
        'panelTitle.activeForeground': accent2,
        'panelTitle.activeBorder': accent2,

        'terminal.background': bg5,
        'terminal.foreground': text0,
        'terminal.ansiBlack': '#2d3748',
        'terminal.ansiRed': PLANET_COLORS.Mars.light,
        'terminal.ansiGreen': '#22543d',
        'terminal.ansiYellow': PLANET_COLORS.Sun.light,
        'terminal.ansiBlue': PLANET_COLORS.Saturn.light,
        'terminal.ansiMagenta': PLANET_COLORS.Pluto.light,
        'terminal.ansiCyan': PLANET_COLORS.Mercury.light,
        'terminal.ansiWhite': '#e2e8f0',

        'input.background': '#ffffff',
        'input.border': border0,
        'input.foreground': text0,
        'inputOption.activeBackground': alpha(p, 0.15),
        'inputOption.activeBorder': accent2,

        'scrollbarSlider.background': alpha(p, 0.1),
        'scrollbarSlider.hoverBackground': alpha(p, 0.22),
        'scrollbarSlider.activeBackground': alpha(p, 0.35),

        'button.background': accent2,
        'button.foreground': '#ffffff',
        'button.hoverBackground': accent3,

        'badge.background': accent2,
        'badge.foreground': '#ffffff',
        'progressBar.background': accent2,

        'breadcrumb.foreground': text1,
        'breadcrumb.background': bg2,
        'breadcrumb.focusForeground': accent2,

        'focusBorder': alpha(p, 0.4),
        'widget.shadow': alpha('#b8c5dc', 0.4),
        'editorWidget.background': bg3,
        'editorWidget.border': border1,
        'quickInput.background': '#ffffff',
        'quickInputList.focusBackground': alpha(p, 0.12),

        'gitDecoration.addedResourceForeground': '#22543d',
        'gitDecoration.modifiedResourceForeground': accent1,
        'gitDecoration.deletedResourceForeground': PLANET_COLORS.Mars.light,

        'diffEditor.insertedTextBackground': alpha('#22543d', 0.1),
        'diffEditor.removedTextBackground': alpha(PLANET_COLORS.Mars.light, 0.1),
        'minimap.background': bg2,
        'minimapSlider.background': alpha(p, 0.08),
    };
}

/** Простой RGB-блендинг двух hex строк с весом */
function mix(hex1: string, hex2: string, t: number): string {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Генерировать промежуточные шаги для анимированного перехода
 * VS Code не поддерживает CSS transitions, но мы можем применять цвета пошагово.
 */
export function generateTransitionSteps(
    fromColors: Record<string, string>,
    toColors: Record<string, string>,
    steps: number
): Array<Record<string, string>> {
    const allKeys = new Set([...Object.keys(fromColors), ...Object.keys(toColors)]);
    const frames: Array<Record<string, string>> = [];

    for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        const frame: Record<string, string> = {};

        for (const key of allKeys) {
            const from = fromColors[key] || toColors[key];
            const to = toColors[key] || fromColors[key];

            // Только hex цвета интерполируем, rgba оставляем как есть
            if (from?.startsWith('#') && to?.startsWith('#')) {
                frame[key] = lerpColor(from, to, t);
            } else {
                frame[key] = t > 0.5 ? to : from;
            }
        }
        frames.push(frame);
    }

    return frames;
}

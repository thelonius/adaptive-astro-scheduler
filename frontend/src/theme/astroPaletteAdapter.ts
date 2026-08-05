/**
 * Мост между общим движком astro-palette и токенами темы проекта (--ag-*).
 *
 * astro-palette отдаёт 8 OKLCH-ролей под именами --color-*. Здесь они
 * ремапятся в наш неймспейс --ag-* плюс достраиваются производные роли,
 * которых у пакета нет (bg-subtle, surface-hover, border-strong, glow).
 *
 * Режим (день/ночь) приходит снаружи — он завязан на тему ОС/Chakra, не на
 * исследуемый момент. hue по умолчанию геоцентрический (управитель дня → фон,
 * управитель часа → accent); при желании можно прокинуть готовый hue из
 * natalDayColorEngine для сохранения натальной персонализации.
 */
import { computeState, computePalette, coordsForTimezone } from 'astro-palette';

export type ColorMode = 'dark' | 'light';
export type DayNight = 'day' | 'night';

export interface AstroMoment {
    /** Дневной или ночной планетарный час в выбранный момент и локацию */
    dayNight: DayNight;
    /** Управитель текущего планетарного часа (гонит accent) */
    hourRuler: string;
    /** Управитель астродня */
    dayRuler: string;
    moon: { name: string; emoji: string; illumination: number; waxing: boolean };
    voc: unknown | null;
    /** Применённая OKLCH-палитра момента: '--color-*' → 'oklch(...)' */
    palette: Record<string, string>;
}

/** --color-* (роли пакета) → наш --ag-* */
const ROLE_MAP: Record<string, string> = {
    '--color-bg': '--ag-bg',
    '--color-surface': '--ag-surface',
    '--color-text': '--ag-text',
    '--color-text-muted': '--ag-text-muted',
    '--color-accent': '--ag-day-accent',
    '--color-border': '--ag-border',
};

export interface ApplyOptions {
    /** Готовый hue из natalDayColorEngine — включает гибридный режим */
    blendedHue?: { dayHue: number; hourHue: number };
}

/**
 * Считает палитру момента и применяет её на :root в токены --ag-*.
 * Возвращает метаданные момента (для опциональной инфо-панели).
 */
export function applyAstroPalette(
    date: Date,
    lat: number,
    lon: number,
    mode: ColorMode,
    opts: ApplyOptions = {},
): AstroMoment {
    const st = computeState(date, lat, lon, { mode });
    const palette = opts.blendedHue
        ? computePalette(opts.blendedHue.dayHue, opts.blendedHue.hourHue, mode)
        : st.palette;

    const root = document.documentElement;
    for (const [from, to] of Object.entries(ROLE_MAP)) {
        const value = palette[from];
        if (value) root.style.setProperty(to, value);
    }

    // Производные роли поверх базовых через relative-color OKLCH.
    const lSign = mode === 'dark' ? '+' : '-';
    root.style.setProperty('--ag-day-primary', 'var(--ag-day-accent)');
    root.style.setProperty('--ag-text-accent', 'var(--ag-day-accent)');
    root.style.setProperty('--ag-bg-subtle', `oklch(from var(--ag-bg) calc(l ${lSign} 0.02) c h)`);
    root.style.setProperty('--ag-surface-hover', `oklch(from var(--ag-surface) calc(l + 0.03) c h)`);
    root.style.setProperty('--ag-border-strong', `oklch(from var(--ag-border) calc(l + 0.08) c h)`);
    root.style.setProperty('--ag-day-glow', `oklch(from var(--ag-day-accent) l c h / 0.15)`);
    root.style.setProperty('--ag-day-glow-strong', `oklch(from var(--ag-day-accent) l c h / 0.3)`);

    return {
        dayNight: st.hour.totalIdx < 12 ? 'day' : 'night',
        hourRuler: st.hour.ruler,
        dayRuler: st.hour.dayRuler,
        moon: {
            name: st.moon.name,
            emoji: st.moon.emoji,
            illumination: st.moon.illumination,
            waxing: st.moon.waxing,
        },
        voc: st.voc,
        palette,
    };
}

export { coordsForTimezone };

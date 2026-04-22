/**
 * useSolarTheme — автоматическое переключение dark/light темы
 * по точным данным восхода и заката (NASA JPL)
 *
 * Логика переключения:
 *   civil_dawn  → начинается переход к светлой теме (рассвет)
 *   sunrise     → полностью светлая тема
 *   sunset      → начинается переход к тёмной теме  
 *   civil_dusk  → полностью тёмная тема
 *
 * Использует useColorTransition для плавной анимации через requestAnimationFrame.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useSolarTimes, type SolarPeriod, type UserLocation } from './useSolarTimes';
import { useColorTransition } from '../theme/useColorTransition';
import { useDynamicTheme } from '../theme/DynamicThemeProvider';
import type { ColorMode } from '../theme/natalDayColorEngine';

export type SolarThemePolicy =
    | 'strict'        // светлая только когда Солнце над горизонтом
    | 'civil'         // светлая с гражданских сумерек до гражданских сумерек
    | 'nautical';     // светлая с морских сумерек (ещё шире)

export interface SolarThemeOptions {
    /** Политика определения "светлого" периода */
    policy?: SolarThemePolicy;
    /** Локация пользователя */
    location?: UserLocation;
    /** Автогеолокация */
    autoGeolocate?: boolean;
    /** Длительность анимации перехода в мс */
    transitionDuration?: number;
    /** Разрешить авто-переключение (false = только ручное) */
    enabled?: boolean;
}

export interface SolarThemeState {
    /** Расчётный режим по солнцу */
    solarMode: ColorMode;
    /** Реальный текущий период */
    solarPeriod: SolarPeriod;
    /** Восход (ISO) */
    sunrise: string | null;
    /** Закат (ISO) */
    sunset: string | null;
    /** Длина дня в минутах */
    dayLengthMinutes: number | null;
    /** Идёт переход темы прямо сейчас */
    isTransitioning: boolean;
    /** Совпадает ли текущий режим Chakra с солнечным расчётом */
    isInSync: boolean;
    /** Принудительно применить тему сейчас */
    applySolarTheme: () => void;
    /** Геолокация пользователя */
    location: UserLocation | null;
}

/**
 * Определить нужный ColorMode по солнечному периоду и политике
 */
function getSolarColorMode(period: SolarPeriod, policy: SolarThemePolicy): ColorMode {
    switch (policy) {
        case 'strict':
            return period === 'day' ? 'light' : 'dark';
        case 'civil':
            return (period === 'day' || period === 'civil_twilight') ? 'light' : 'dark';
        case 'nautical':
            return (period === 'day' || period === 'civil_twilight' || period === 'nautical_twilight')
                ? 'light' : 'dark';
    }
}

/**
 * Вычислить переменные CSS для промежуточного состояния перехода
 * При рассвете: тёмная → рассветные оранжевые/розовые → светлая
 * При закате: светлая → закатные оранжевые/красные → тёмная
 */
function getSolarTransitionVars(
    period: SolarPeriod,
    targetMode: ColorMode,
    _primaryColor: string
): Record<string, string> {
    if (period === 'civil_twilight' && targetMode === 'light') {
        // Рассвет — розово-золотые тона
        return {
            '--ag-day-primary': '#FF9060',
            '--ag-day-secondary': '#FFB080',
            '--ag-day-accent': '#FF6040',
            '--ag-bg': '#1a0f0a',
            '--ag-surface': '#251510',
            '--ag-day-glow': 'rgba(255,140,80,0.2)',
        };
    }
    if (period === 'civil_twilight' && targetMode === 'dark') {
        // Закат — малиново-оранжевые тона
        return {
            '--ag-day-primary': '#FF6030',
            '--ag-day-secondary': '#FF4070',
            '--ag-day-accent': '#FF8020',
            '--ag-bg': '#150a08',
            '--ag-surface': '#200e0a',
            '--ag-day-glow': 'rgba(255,80,30,0.25)',
        };
    }
    if (period === 'nautical_twilight') {
        // Морские сумерки — тёмно-синие
        return {
            '--ag-day-primary': '#3060C0',
            '--ag-day-secondary': '#4080D0',
            '--ag-bg': '#070c18',
            '--ag-day-glow': 'rgba(60,120,220,0.15)',
        };
    }
    return {};
}

export function useSolarTheme(options: SolarThemeOptions = {}): SolarThemeState {
    const {
        policy = 'civil',
        location,
        autoGeolocate = true,
        transitionDuration = 1200,
        enabled = true,
    } = options;

    const { colorMode, setColorMode } = useColorMode();
    const { transitionCssVars } = useColorTransition();
    const { dayPalette, applyNatalDayTheme: _applyNatalDayTheme } = useDynamicTheme();
    const [isTransitioning, setIsTransitioning] = useState(false);

    const { solarTimes, userLocation } = useSolarTimes({
        location,
        autoGeolocate,
        updateIntervalMs: 30_000, // проверяем каждые 30 секунд
    });

    const lastPeriodRef = useRef<SolarPeriod | null>(null);
    const scheduledRef = useRef<NodeJS.Timeout | null>(null);

    /** Выполнить плавный переход к нужной теме */
    const performThemeTransition = useCallback(async (
        nextMode: ColorMode,
        period: SolarPeriod,
        primary: string
    ) => {
        if (isTransitioning) return;
        setIsTransitioning(true);

        try {
            // Шаг 1: Промежуточные "закатные/рассветные" цвета (если это twilight)
            const twilightVars = getSolarTransitionVars(period, nextMode, primary);

            if (Object.keys(twilightVars).length > 0) {
                await transitionCssVars(twilightVars, { duration: transitionDuration * 0.4 });
                // Небольшая пауза на пике перехода
                await new Promise(r => setTimeout(r, transitionDuration * 0.2));
            }

            // Шаг 2: Переключить Chakra ColorMode (это тоже немного анимируется)
            setColorMode(nextMode);

            // Шаг 3: Применить финальные цвета через плавный переход
            if (dayPalette) {
                const themeVars = nextMode === 'dark'
                    ? {
                        '--ag-bg': dayPalette.dark.bg,
                        '--ag-bg-subtle': dayPalette.dark.bgSubtle,
                        '--ag-surface': dayPalette.dark.surface,
                        '--ag-day-primary': dayPalette.primary,
                        '--ag-day-secondary': dayPalette.secondary,
                        '--ag-day-accent': dayPalette.accent,
                        '--ag-text': dayPalette.dark.text,
                        '--ag-text-muted': dayPalette.dark.textMuted,
                        '--ag-border': dayPalette.dark.border,
                        '--ag-day-glow': dayPalette.dark.glow,
                    }
                    : {
                        '--ag-bg': dayPalette.light.bg,
                        '--ag-bg-subtle': dayPalette.light.bgSubtle,
                        '--ag-surface': dayPalette.light.surface,
                        '--ag-day-primary': dayPalette.primary,
                        '--ag-day-secondary': dayPalette.secondary,
                        '--ag-day-accent': dayPalette.accent,
                        '--ag-text': dayPalette.light.text,
                        '--ag-text-muted': dayPalette.light.textMuted,
                        '--ag-border': dayPalette.light.border,
                        '--ag-day-glow': dayPalette.light.glow,
                    };

                await transitionCssVars(themeVars, {
                    duration: transitionDuration * 0.6,
                    easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, // ease-in-out quad
                });
            }
        } finally {
            setIsTransitioning(false);
        }
    }, [isTransitioning, transitionCssVars, transitionDuration, setColorMode, dayPalette]);

    /** Запланировать переход точно в момент восхода/заката */
    const scheduleNextTransition = useCallback(() => {
        if (!solarTimes || !enabled) return;
        if (scheduledRef.current) clearTimeout(scheduledRef.current);

        const now = Date.now();
        const transitions: Array<{ at: number; period: SolarPeriod; mode: ColorMode }> = [];

        const addTransition = (isoStr: string | null, period: SolarPeriod, mode: ColorMode) => {
            if (!isoStr) return;
            const ts = new Date(isoStr).getTime();
            if (ts > now) transitions.push({ at: ts, period, mode });
        };

        if (policy === 'strict') {
            addTransition(solarTimes.sunrise, 'day', 'light');
            addTransition(solarTimes.sunset, 'civil_twilight', 'dark');
        } else if (policy === 'civil') {
            addTransition(solarTimes.civilDawn, 'civil_twilight', 'light');
            addTransition(solarTimes.civilDusk, 'civil_twilight', 'dark');
        } else {
            addTransition(solarTimes.nauticalDawn, 'nautical_twilight', 'light');
            addTransition(solarTimes.nauticalDusk, 'nautical_twilight', 'dark');
        }

        // Находим ближайший переход
        transitions.sort((a, b) => a.at - b.at);
        const next = transitions[0];
        if (!next) return;

        const delay = next.at - now;
        scheduledRef.current = setTimeout(() => {
            const primary = dayPalette?.primary || '#4B5A9C';
            performThemeTransition(next.mode, next.period, primary);
        }, delay);

        console.log(`🌅 Solar theme: next transition in ${Math.round(delay / 60000)}min → ${next.mode}`);
    }, [solarTimes, enabled, policy, dayPalette, performThemeTransition]);

    // Реагируем на изменение периода
    useEffect(() => {
        if (!solarTimes || !enabled) return;

        const newPeriod = solarTimes.currentPeriod;
        const prevPeriod = lastPeriodRef.current;

        if (prevPeriod !== null && newPeriod !== prevPeriod) {
            // Период изменился — запускаем переход
            const nextMode = getSolarColorMode(newPeriod, policy);
            const currentMode = colorMode as ColorMode;

            if (nextMode !== currentMode) {
                const primary = dayPalette?.primary || '#4B5A9C';
                performThemeTransition(nextMode, newPeriod, primary);
            }
        }

        lastPeriodRef.current = newPeriod;

        // Планируем следующий переход
        scheduleNextTransition();
    }, [solarTimes?.currentPeriod, enabled]);

    // Очистка таймеров
    useEffect(() => {
        return () => {
            if (scheduledRef.current) clearTimeout(scheduledRef.current);
        };
    }, []);

    // Инициализация: применить тему при первой загрузке
    useEffect(() => {
        if (!solarTimes || !enabled || lastPeriodRef.current !== null) return;

        const solarMode = getSolarColorMode(solarTimes.currentPeriod, policy);
        const chakraMode = colorMode as ColorMode;

        if (solarMode !== chakraMode) {
            // Мгновенное применение при инициализации (без анимации)
            setColorMode(solarMode);
        }
        lastPeriodRef.current = solarTimes.currentPeriod;
        scheduleNextTransition();
    }, [solarTimes?.date, enabled]);

    const applySolarTheme = useCallback(() => {
        if (!solarTimes) return;
        const nextMode = getSolarColorMode(solarTimes.currentPeriod, policy);
        const primary = dayPalette?.primary || '#4B5A9C';
        performThemeTransition(nextMode, solarTimes.currentPeriod, primary);
    }, [solarTimes, policy, dayPalette, performThemeTransition]);

    const solarMode = solarTimes
        ? getSolarColorMode(solarTimes.currentPeriod, policy)
        : (colorMode as ColorMode);

    return {
        solarMode,
        solarPeriod: solarTimes?.currentPeriod ?? 'night',
        sunrise: solarTimes?.sunrise ?? null,
        sunset: solarTimes?.sunset ?? null,
        dayLengthMinutes: solarTimes?.dayLengthMinutes ?? null,
        isTransitioning,
        isInSync: solarMode === colorMode,
        applySolarTheme,
        location: userLocation,
    };
}

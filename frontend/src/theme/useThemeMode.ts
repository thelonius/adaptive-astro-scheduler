/**
 * Antigravity — useThemeMode hook
 *
 * Хук для управления тёмной/светлой темой + персонализированными цветами дня.
 * Сохраняет выбор пользователя в localStorage.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ColorMode, DayColorPalette } from './natalDayColorEngine';
import { computeDayColorPalette, applyDayPaletteToCSS } from './natalDayColorEngine';
import type { NatalChartData } from '../hooks/useNatalChart';

const STORAGE_KEY = 'ag-color-mode';

export interface UseThemeModeReturn {
    colorMode: ColorMode;
    toggleColorMode: () => void;
    setColorMode: (mode: ColorMode) => void;
    currentPalette: DayColorPalette | null;
    applyNatalDayColors: (
        date: Date,
        natalChart?: NatalChartData | null,
        transits?: any,
        lunarDay?: any
    ) => DayColorPalette;
    resetToDefault: () => void;
    isNatalApplied: boolean;
}

export function useThemeMode(): UseThemeModeReturn {
    // Инициализируем из localStorage или системных предпочтений
    const getInitialMode = (): ColorMode => {
        const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
        if (saved === 'dark' || saved === 'light') return saved;
        // Системные предпочтения
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const [colorMode, setColorModeState] = useState<ColorMode>(getInitialMode);
    const [currentPalette, setCurrentPalette] = useState<DayColorPalette | null>(null);
    const [isNatalApplied, setIsNatalApplied] = useState(false);

    // Применить режим при изменении
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', colorMode);
        if (currentPalette) {
            applyDayPaletteToCSS(currentPalette, colorMode);
        } else {
            // Применить дефолтный цвет (управитель текущего дня без натальной карты)
            const defaultPalette = computeDayColorPalette(new Date());
            applyDayPaletteToCSS(defaultPalette, colorMode);
            setCurrentPalette(defaultPalette);
        }
    }, [colorMode]);

    // Инициализация при монтировании
    useEffect(() => {
        const defaultPalette = computeDayColorPalette(new Date());
        applyDayPaletteToCSS(defaultPalette, colorMode);
        setCurrentPalette(defaultPalette);
    }, []);

    const setColorMode = useCallback((mode: ColorMode) => {
        setColorModeState(mode);
        localStorage.setItem(STORAGE_KEY, mode);
    }, []);

    const toggleColorMode = useCallback(() => {
        setColorMode(colorMode === 'dark' ? 'light' : 'dark');
    }, [colorMode, setColorMode]);

    const applyNatalDayColors = useCallback(
        (
            date: Date,
            natalChart?: NatalChartData | null,
            transits?: any,
            lunarDay?: any
        ): DayColorPalette => {
            const palette = computeDayColorPalette(date, natalChart, transits, lunarDay);
            applyDayPaletteToCSS(palette, colorMode);
            setCurrentPalette(palette);
            setIsNatalApplied(true);
            return palette;
        },
        [colorMode]
    );

    const resetToDefault = useCallback(() => {
        const defaultPalette = computeDayColorPalette(new Date());
        applyDayPaletteToCSS(defaultPalette, colorMode);
        setCurrentPalette(defaultPalette);
        setIsNatalApplied(false);
    }, [colorMode]);

    return {
        colorMode,
        toggleColorMode,
        setColorMode,
        currentPalette,
        applyNatalDayColors,
        resetToDefault,
        isNatalApplied,
    };
}

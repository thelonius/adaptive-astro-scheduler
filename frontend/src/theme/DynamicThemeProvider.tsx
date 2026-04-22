
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorMode } from '@chakra-ui/react';
import chroma from 'chroma-js';
import { LunarDay } from '@adaptive-astro/shared/types/astrology';
import { computeDayColorPalette, applyDayPaletteToCSS } from './natalDayColorEngine';
import type { DayColorPalette } from './natalDayColorEngine';
import type { NatalChartData } from '../hooks/useNatalChart';

interface DynamicThemeContextType {
    // Старый API (лунные цвета) — оставляем для обратной совместимости
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    applyLunarTheme: (lunarDay: LunarDay) => void;
    resetTheme: () => void;

    // Новый API (натальные цвета дня)
    dayPalette: DayColorPalette | null;
    applyNatalDayTheme: (
        date: Date,
        natalChart?: NatalChartData | null,
        transits?: any,
        lunarDay?: any
    ) => DayColorPalette;
    isNatalThemeActive: boolean;
}

const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined);

export const useDynamicTheme = () => {
    const context = useContext(DynamicThemeContext);
    if (!context) {
        throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
    }
    return context;
};

interface DynamicThemeProviderProps {
    children: React.ReactNode;
}

export const DynamicThemeProvider: React.FC<DynamicThemeProviderProps> = ({ children }) => {
    const { colorMode } = useColorMode();
    const isDark = colorMode === 'dark';

    // --- Старый API ---
    const defaultPrimary = isDark ? '#63B3ED' : '#3182CE';
    const defaultSecondary = isDark ? '#B794F4' : '#805AD5';

    const [primaryColor, setPrimaryColor] = useState<string>(defaultPrimary);
    const [secondaryColor, setSecondaryColor] = useState<string>(defaultSecondary);
    const [accentColor, setAccentColor] = useState<string>(isDark ? '#F687B3' : '#D53F8C');
    const [backgroundColor, setBackgroundColor] = useState<string>(isDark ? '#080c18' : '#f0f4fc');

    // --- Новый API ---
    const [dayPalette, setDayPalette] = useState<DayColorPalette | null>(null);
    const [isNatalThemeActive, setIsNatalThemeActive] = useState(false);

    // Старая функция обновления CSS-переменных (совместимость)
    const updateCssVariables = (primary: string, secondary: string, accent: string, bg: string) => {
        const root = document.documentElement;
        root.style.setProperty('--dynamic-primary', primary);
        root.style.setProperty('--dynamic-secondary', secondary);
        root.style.setProperty('--dynamic-accent', accent);
        root.style.setProperty('--dynamic-bg', bg);
        root.style.setProperty('--dynamic-primary-light', chroma(primary).brighten(1).hex());
        root.style.setProperty('--dynamic-primary-dark', chroma(primary).darken(1).hex());
        root.style.setProperty('--dynamic-bg-transparent', chroma(bg).alpha(0.8).css());
    };

    // Старая функция — применение лунной темы
    const applyLunarTheme = (lunarDay: LunarDay) => {
        if (!lunarDay.colorPalette || !lunarDay.colorPalette.base_colors || lunarDay.colorPalette.base_colors.length === 0) {
            return;
        }
        const baseColors = lunarDay.colorPalette.base_colors;
        const primary = baseColors[0];
        const secondary = baseColors.length > 1 ? baseColors[1] : chroma(primary).set('hsl.h', '+180').hex();
        const accent = chroma(primary).set('hsl.h', '+120').hex();
        let bg = isDark ? '#080c18' : '#f0f4fc';
        if (lunarDay.energy === 'Dark') {
            bg = isDark
                ? chroma(primary).darken(2.5).desaturate(0.5).hex()
                : chroma(primary).brighten(3).desaturate(0.8).hex();
        }
        setPrimaryColor(primary);
        setSecondaryColor(secondary);
        setAccentColor(accent);
        setBackgroundColor(bg);
        updateCssVariables(primary, secondary, accent, bg);
    };

    const resetTheme = () => {
        setPrimaryColor(defaultPrimary);
        setSecondaryColor(defaultSecondary);
        const defaultPalette = computeDayColorPalette(new Date());
        applyDayPaletteToCSS(defaultPalette, isDark ? 'dark' : 'light');
        setDayPalette(defaultPalette);
        setIsNatalThemeActive(false);
        updateCssVariables(defaultPrimary, defaultSecondary, isDark ? '#F687B3' : '#D53F8C', isDark ? '#080c18' : '#f0f4fc');
    };

    // Новая функция — применение натальной темы дня
    const applyNatalDayTheme = useCallback((
        date: Date,
        natalChart?: NatalChartData | null,
        transits?: any,
        lunarDay?: any
    ): DayColorPalette => {
        const palette = computeDayColorPalette(date, natalChart, transits, lunarDay);
        applyDayPaletteToCSS(palette, isDark ? 'dark' : 'light');
        setDayPalette(palette);
        setIsNatalThemeActive(true);

        // Обновляем старые переменные для совместимости
        setPrimaryColor(palette.primary);
        setSecondaryColor(palette.secondary);
        setAccentColor(palette.accent);
        updateCssVariables(
            palette.primary,
            palette.secondary,
            palette.accent,
            isDark ? palette.dark.bg : palette.light.bg
        );
        return palette;
    }, [isDark]);

    // Инициализация при монтировании — применяем дефолт по управителю дня
    useEffect(() => {
        const mode = isDark ? 'dark' : 'light';
        const defaultPalette = computeDayColorPalette(new Date());
        applyDayPaletteToCSS(defaultPalette, mode);
        setDayPalette(defaultPalette);
        updateCssVariables(defaultPrimary, defaultSecondary, isDark ? '#F687B3' : '#D53F8C', isDark ? '#080c18' : '#f0f4fc');
    }, [isDark]);

    // Когда меняется colorMode — переприменяем палитру с правильным режимом
    useEffect(() => {
        const mode = isDark ? 'dark' : 'light';
        // Always update data-theme attribute regardless of whether palette is ready
        document.documentElement.setAttribute('data-theme', mode);
        const palette = dayPalette ?? computeDayColorPalette(new Date());
        applyDayPaletteToCSS(palette, mode);
        if (!dayPalette) setDayPalette(palette);
    }, [colorMode]);

    return (
        <DynamicThemeContext.Provider value={{
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            applyLunarTheme,
            resetTheme,
            dayPalette,
            applyNatalDayTheme,
            isNatalThemeActive,
        }}>
            {children}
        </DynamicThemeContext.Provider>
    );
};

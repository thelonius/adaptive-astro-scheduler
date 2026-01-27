
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '@chakra-ui/react';
import chroma from 'chroma-js';
import { LunarDay } from '@adaptive-astro/shared/types/astrology';

interface DynamicThemeContextType {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    applyLunarTheme: (lunarDay: LunarDay) => void;
    resetTheme: () => void;
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
    const chakraTheme = useTheme();
    const defaultPrimary = chakraTheme.colors.teal[500];
    const defaultSecondary = chakraTheme.colors.purple[500];

    const [primaryColor, setPrimaryColor] = useState<string>(defaultPrimary);
    const [secondaryColor, setSecondaryColor] = useState<string>(defaultSecondary);
    const [accentColor, setAccentColor] = useState<string>(chakraTheme.colors.pink[500]);
    const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');

    // Function to update CSS variables for global usage
    const updateCssVariables = (primary: string, secondary: string, accent: string, bg: string) => {
        const root = document.documentElement;
        root.style.setProperty('--dynamic-primary', primary);
        root.style.setProperty('--dynamic-secondary', secondary);
        root.style.setProperty('--dynamic-accent', accent);
        root.style.setProperty('--dynamic-bg', bg);

        // Also generate lighter/darker variants
        root.style.setProperty('--dynamic-primary-light', chroma(primary).brighten(1).hex());
        root.style.setProperty('--dynamic-primary-dark', chroma(primary).darken(1).hex());
        root.style.setProperty('--dynamic-bg-transparent', chroma(bg).alpha(0.8).css());
    };

    const applyLunarTheme = (lunarDay: LunarDay) => {
        if (!lunarDay.colorPalette || !lunarDay.colorPalette.base_colors || lunarDay.colorPalette.base_colors.length === 0) {
            return;
        }

        const baseColors = lunarDay.colorPalette.base_colors;
        const primary = baseColors[0];
        // Use second color if available, otherwise complement of primary
        const secondary = baseColors.length > 1 ? baseColors[1] : chroma(primary).set('hsl.h', '+180').hex();

        // Generate an accent color (triadic)
        const accent = chroma(primary).set('hsl.h', '+120').hex();

        // Determine background based on lunar energy
        let bg = '#ffffff';
        if (lunarDay.energy === 'Dark') {
            bg = chroma(primary).darken(2.5).desaturate(0.5).hex();
            // Ensure text contrast if needed (handled by components but good to know)
        } else {
            bg = chroma(primary).brighten(3).desaturate(0.8).hex();
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
        updateCssVariables(defaultPrimary, defaultSecondary, chakraTheme.colors.pink[500], '#ffffff');
    };

    // Initialize CSS variables
    useEffect(() => {
        updateCssVariables(primaryColor, secondaryColor, accentColor, backgroundColor);
    }, []);

    return (
        <DynamicThemeContext.Provider value={{
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            applyLunarTheme,
            resetTheme
        }}>
            {children}
        </DynamicThemeContext.Provider>
    );
};

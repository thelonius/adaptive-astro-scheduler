/**
 * Antigravity — Planetary Color System
 *
 * Архетипические цвета планет для тёмной и светлой тем.
 * Используются для вычисления персонализированных цветов дня.
 */

export type PlanetName =
    | 'Sun'
    | 'Moon'
    | 'Mercury'
    | 'Venus'
    | 'Mars'
    | 'Jupiter'
    | 'Saturn'
    | 'Uranus'
    | 'Neptune'
    | 'Pluto';

export interface PlanetColorSet {
    /** Основной цвет планеты (нейтральный, используется для блендинга) */
    base: string;
    /** Вариант для тёмной темы — ярче, насыщеннее */
    dark: string;
    /** Вариант для светлой темы — темнее, глубже */
    light: string;
    /** Символ планеты */
    symbol: string;
    /** Русское название */
    nameRu: string;
    /** Архетип */
    archetype: string;
    /** CSS glow цвет (rgba) */
    glow: string;
}

export const PLANET_COLORS: Record<PlanetName, PlanetColorSet> = {
    Sun: {
        base: '#FFD700',
        dark: '#FFA500',
        light: '#E8950A',
        symbol: '☀️',
        nameRu: 'Солнце',
        archetype: 'Витальность, воля, творчество',
        glow: 'rgba(255, 215, 0, 0.25)',
    },
    Moon: {
        base: '#C0C0C0',
        dark: '#A8B8D0',
        light: '#6B7E9C',
        symbol: '🌙',
        nameRu: 'Луна',
        archetype: 'Интуиция, эмоции, цикличность',
        glow: 'rgba(192, 192, 192, 0.2)',
    },
    Mercury: {
        base: '#00D4FF',
        dark: '#00C4EF',
        light: '#0086CC',
        symbol: '☿',
        nameRu: 'Меркурий',
        archetype: 'Мышление, коммуникация, адаптация',
        glow: 'rgba(0, 212, 255, 0.22)',
    },
    Venus: {
        base: '#FF69B4',
        dark: '#FF1493',
        light: '#C2185B',
        symbol: '♀',
        nameRu: 'Венера',
        archetype: 'Красота, любовь, гармония',
        glow: 'rgba(255, 105, 180, 0.22)',
    },
    Mars: {
        base: '#FF4500',
        dark: '#E03000',
        light: '#B71C1C',
        symbol: '♂',
        nameRu: 'Марс',
        archetype: 'Энергия, действие, воля',
        glow: 'rgba(255, 69, 0, 0.22)',
    },
    Jupiter: {
        base: '#9B59B6',
        dark: '#8E44AD',
        light: '#5E2D91',
        symbol: '♃',
        nameRu: 'Юпитер',
        archetype: 'Мудрость, рост, удача',
        glow: 'rgba(155, 89, 182, 0.22)',
    },
    Saturn: {
        base: '#5B6EAE',
        dark: '#4B5A9C',
        light: '#2C3E80',
        symbol: '♄',
        nameRu: 'Сатурн',
        archetype: 'Структура, дисциплина, карма',
        glow: 'rgba(91, 110, 174, 0.22)',
    },
    Uranus: {
        base: '#00E5E5',
        dark: '#00FFFF',
        light: '#006CAA',
        symbol: '⛢',
        nameRu: 'Уран',
        archetype: 'Революция, свобода, инновации',
        glow: 'rgba(0, 229, 229, 0.22)',
    },
    Neptune: {
        base: '#3A5FC8',
        dark: '#4169E1',
        light: '#1A237E',
        symbol: '♆',
        nameRu: 'Нептун',
        archetype: 'Мистика, интуиция, воображение',
        glow: 'rgba(65, 105, 225, 0.22)',
    },
    Pluto: {
        base: '#8B008B',
        dark: '#9C00B0',
        light: '#4A004A',
        symbol: '♇',
        nameRu: 'Плутон',
        archetype: 'Трансформация, власть, возрождение',
        glow: 'rgba(139, 0, 139, 0.22)',
    },
};

/**
 * Маппинг знаков зодиака на управляющие планеты (классическая система)
 */
export const SIGN_RULERS: Record<string, PlanetName> = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Pluto',   // Плутон (Марс — классический)
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Uranus', // Уран (Сатурн — классический)
    Pisces: 'Neptune',  // Нептун (Юпитер — классический)
};

/**
 * Получить цвет планеты по теме
 */
export function getPlanetColor(
    planet: PlanetName,
    theme: 'base' | 'dark' | 'light' = 'base'
): string {
    return PLANET_COLORS[planet]?.[theme] ?? '#808080';
}

/**
 * Получить планету для знака ASC
 */
export function getSignRuler(sign: string): PlanetName {
    // Нормализуем знак
    const normalized = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();
    return SIGN_RULERS[normalized] ?? 'Sun';
}

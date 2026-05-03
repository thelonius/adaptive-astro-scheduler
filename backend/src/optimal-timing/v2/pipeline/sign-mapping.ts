/**
 * Sign-name normalization.
 *
 * The shared types in this project use Russian zodiac names
 * ('Овен', 'Телец', ...) at the API boundary. The v2 DSL uses
 * English ('Aries', 'Taurus', ...) because the schema is consumed
 * by LLMs and the wider ecosystem expects English labels. This
 * module is the single mapping point.
 */

import type { Sign } from '../schema/dsl';

const RU_TO_EN: Record<string, Sign> = {
    'Овен': 'Aries',
    'Телец': 'Taurus',
    'Близнецы': 'Gemini',
    'Рак': 'Cancer',
    'Лев': 'Leo',
    'Дева': 'Virgo',
    'Весы': 'Libra',
    'Скорпион': 'Scorpio',
    'Стрелец': 'Sagittarius',
    'Козерог': 'Capricorn',
    'Водолей': 'Aquarius',
    'Рыбы': 'Pisces',
};

const EN_SIGNS = new Set<Sign>([
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]);

/**
 * Normalize a sign string from any supported source to canonical English.
 * Throws if the input is not a recognized sign in any language.
 */
export function normalizeSign(raw: string): Sign {
    if (EN_SIGNS.has(raw as Sign)) return raw as Sign;
    const mapped = RU_TO_EN[raw];
    if (mapped) return mapped;
    throw new Error(`Unrecognized sign name: ${raw}`);
}

/**
 * Compute zodiac sign from ecliptic longitude (0-360°).
 * Used as fallback when the API doesn't return a sign string.
 */
export function signFromLongitude(longitudeDeg: number): Sign {
    const normalized = ((longitudeDeg % 360) + 360) % 360;
    const idx = Math.floor(normalized / 30);
    const order: Sign[] = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];
    return order[idx];
}

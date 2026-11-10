/**
 * Fact-check for generated narratives.
 *
 * The narrative prompt asks the model to name the planets, signs and
 * aspects of the day. Schema validation only checks the shape of the
 * JSON, so a text that says "Меркурий ретроградный" on a day when
 * Mercury is direct passes untouched. This module extracts the
 * astrological claims from the text and confronts each one with the
 * day's `DayEphemerisSummary`, which comes straight from the ephemeris
 * service.
 *
 * Claims the facts say nothing about (a planet the snapshot lacks, a
 * lunar day number) count as violations too: without data the model is
 * guessing, and guessing is the thing this module exists to stop.
 */

import type { DayEphemerisSummary } from '../schema/trace';

export type ClaimKind =
    | 'planet_in_sign'
    | 'retrograde'
    | 'aspect'
    | 'moon_waxing'
    | 'void_of_course'
    | 'lunar_day';

export type ClaimVerdict = 'supported' | 'contradicted' | 'unsupported';

export interface Claim {
    kind: ClaimKind;
    /** The fragment of the narrative this claim was read from. */
    fragment: string;
    planet?: string;
    planet2?: string;
    sign?: string;
    aspect?: string;
    /** For boolean claims: what the text asserts. */
    value?: boolean;
    /** For lunar_day: the number the text asserts. */
    number?: number;
}

export interface VerifiedClaim extends Claim {
    verdict: ClaimVerdict;
    /** English explanation with the real numbers, fed back to the model. */
    reason?: string;
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

type TokenType =
    | 'planet' | 'sign' | 'aspect'
    | 'retro' | 'direct' | 'waxing' | 'waning' | 'voc' | 'lunar_day';

interface Token {
    type: TokenType;
    /** Canonical value: English planet/sign/aspect name, or the lunar day number. */
    value: string;
    start: number;
    end: number;
    raw: string;
}

interface Pattern {
    type: TokenType;
    value: string;
    re: RegExp;
}

// Cyrillic word ending guard: the stem must not run into more letters,
// otherwise "Дев" would match inside "девушка" and "Лун" inside "лунный".
const RU_END = '(?![а-яё])';

function ru(stem: string): string {
    return `${stem}${RU_END}`;
}

const PLANET_PATTERNS: Pattern[] = [
    { type: 'planet', value: 'Sun', re: new RegExp(ru('Солнц[ауе]?'), 'giu') },
    { type: 'planet', value: 'Moon', re: new RegExp(ru('Лун(?!н)[аыеуой]?'), 'giu') },
    { type: 'planet', value: 'Mercury', re: new RegExp(ru('Меркури[йяюе]'), 'giu') },
    { type: 'planet', value: 'Venus', re: new RegExp(ru('Венер[аыуеой]?'), 'giu') },
    { type: 'planet', value: 'Mars', re: new RegExp(ru('Марс[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Jupiter', re: new RegExp(ru('Юпитер[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Saturn', re: new RegExp(ru('Сатурн[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Uranus', re: new RegExp(ru('Уран[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Neptune', re: new RegExp(ru('Нептун[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Pluto', re: new RegExp(ru('Плутон[ауеом]?'), 'giu') },
    { type: 'planet', value: 'Sun', re: /\bsun\b/giu },
    { type: 'planet', value: 'Moon', re: /\bmoon\b/giu },
    { type: 'planet', value: 'Mercury', re: /\bmercury\b/giu },
    { type: 'planet', value: 'Venus', re: /\bvenus\b/giu },
    { type: 'planet', value: 'Mars', re: /\bmars\b/giu },
    { type: 'planet', value: 'Jupiter', re: /\bjupiter\b/giu },
    { type: 'planet', value: 'Saturn', re: /\bsaturn\b/giu },
    { type: 'planet', value: 'Uranus', re: /\buranus\b/giu },
    { type: 'planet', value: 'Neptune', re: /\bneptune\b/giu },
    { type: 'planet', value: 'Pluto', re: /\bpluto\b/giu },
];

const SIGN_PATTERNS: Pattern[] = [
    { type: 'sign', value: 'Aries', re: new RegExp(ru('Ов(?:ен|н[аеу])'), 'giu') },
    { type: 'sign', value: 'Taurus', re: new RegExp(ru('Тел(?:ец|ьц[аеу])'), 'giu') },
    { type: 'sign', value: 'Gemini', re: new RegExp(ru('Близнец[ахуов]{0,2}'), 'giu') },
    { type: 'sign', value: 'Cancer', re: new RegExp(ru('Рак[аеу]?'), 'giu') },
    { type: 'sign', value: 'Leo', re: new RegExp(ru('(?:Лев|Льв[аеу])'), 'giu') },
    { type: 'sign', value: 'Virgo', re: new RegExp(ru('Дев[аеыу]'), 'giu') },
    { type: 'sign', value: 'Libra', re: new RegExp(ru('Вес(?:ы|ах|ов|ам|ами)'), 'giu') },
    { type: 'sign', value: 'Scorpio', re: new RegExp(ru('Скорпион[аеу]?'), 'giu') },
    { type: 'sign', value: 'Sagittarius', re: new RegExp(ru('Стрел(?:ец|ьц[аеу])'), 'giu') },
    { type: 'sign', value: 'Capricorn', re: new RegExp(ru('Козерог[аеу]?'), 'giu') },
    { type: 'sign', value: 'Aquarius', re: new RegExp(ru('Водоле[йяеюм]'), 'giu') },
    { type: 'sign', value: 'Pisces', re: new RegExp(ru('Рыб[аыхм]{1,2}'), 'giu') },
    { type: 'sign', value: 'Aries', re: /\baries\b/giu },
    { type: 'sign', value: 'Taurus', re: /\btaurus\b/giu },
    { type: 'sign', value: 'Gemini', re: /\bgemini\b/giu },
    { type: 'sign', value: 'Cancer', re: /\bcancer\b/giu },
    { type: 'sign', value: 'Leo', re: /\bleo\b/giu },
    { type: 'sign', value: 'Virgo', re: /\bvirgo\b/giu },
    { type: 'sign', value: 'Libra', re: /\blibra\b/giu },
    { type: 'sign', value: 'Scorpio', re: /\bscorpio\b/giu },
    { type: 'sign', value: 'Sagittarius', re: /\bsagittarius\b/giu },
    { type: 'sign', value: 'Capricorn', re: /\bcapricorn\b/giu },
    { type: 'sign', value: 'Aquarius', re: /\baquarius\b/giu },
    { type: 'sign', value: 'Pisces', re: /\bpisces\b/giu },
];

const OTHER_PATTERNS: Pattern[] = [
    { type: 'aspect', value: 'conjunction', re: /соединени[а-яё]*|соединён[а-яё]*|конъюнкц[а-яё]*|conjunct[a-z]*/giu },
    { type: 'aspect', value: 'sextile', re: /секстил[а-яё]*|sextile[a-z]*/giu },
    { type: 'aspect', value: 'square', re: /квадрат[а-яё]*|square[a-z]*/giu },
    { type: 'aspect', value: 'trine', re: /тригон[а-яё]*|трин(?![а-яё])|trine[a-z]*/giu },
    { type: 'aspect', value: 'opposition', re: /оппозици[а-яё]*|противостояни[а-яё]*|opposition|opposed/giu },
    { type: 'retro', value: 'retro', re: /ретроград[а-яё]*|retrograde/giu },
    { type: 'direct', value: 'direct', re: /директн[а-яё]*|прямом ходе|direct motion/giu },
    { type: 'waxing', value: 'waxing', re: /растущ[а-яё]*|waxing/giu },
    { type: 'waning', value: 'waning', re: /убывающ[а-яё]*|waning/giu },
    { type: 'voc', value: 'voc', re: /холост[а-яё]*|без курса|void[\s-]of[\s-]course|void moon/giu },
    { type: 'lunar_day', value: '', re: /(\d{1,2})[-\s]*(?:[а-яё]{1,2}\s+)?лунн[а-яё]*\s*(?:день|дня|сутк[а-яё]*)|lunar day\s*(\d{1,2})/giu },
];

const ALL_PATTERNS = [...PLANET_PATTERNS, ...SIGN_PATTERNS, ...OTHER_PATTERNS];

const RU_PLANET_LABEL: Record<string, string> = {
    Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера', Mars: 'Марс',
    Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран', Neptune: 'Нептун', Pluto: 'Плутон',
};

const RU_SIGN_LABEL: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

const RU_ASPECT_LABEL: Record<string, string> = {
    conjunction: 'соединение', sextile: 'секстиль', square: 'квадрат',
    trine: 'тригон', opposition: 'оппозиция',
};

// ─── Tokenizing ──────────────────────────────────────────────────────────────

function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    for (const pattern of ALL_PATTERNS) {
        const re = new RegExp(pattern.re.source, pattern.re.flags);
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            if (m[0].length === 0) { re.lastIndex++; continue; }
            const value = pattern.type === 'lunar_day'
                ? String(m[1] ?? m[2] ?? '')
                : pattern.value;
            tokens.push({
                type: pattern.type,
                value,
                start: m.index,
                end: m.index + m[0].length,
                raw: m[0],
            });
        }
    }
    // Longest match wins on overlap: "Стрельце" must not also register as a
    // shorter competing stem, and an EN pattern must not double a RU hit.
    tokens.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const kept: Token[] = [];
    for (const token of tokens) {
        const overlaps = kept.some((k) => token.start < k.end && k.start < token.end);
        if (!overlaps) kept.push(token);
    }
    return kept.sort((a, b) => a.start - b.start);
}

/** "не ретроградный", "not retrograde" flips the asserted value. */
function isNegated(text: string, token: Token): boolean {
    const before = text.slice(Math.max(0, token.start - 14), token.start).toLowerCase();
    return /(?:^|[\s(,])(?:не|not|no)\s+$/u.test(before);
}

function fragmentAround(text: string, start: number, end: number): string {
    return text.slice(Math.max(0, start - 25), Math.min(text.length, end + 25)).trim();
}

function nearestPlanet(
    tokens: Token[],
    index: number,
    direction: -1 | 1,
    maxGap: number,
    text: string,
): Token | null {
    const anchor = tokens[index];
    for (let i = index + direction; i >= 0 && i < tokens.length; i += direction) {
        const candidate = tokens[i];
        const gap = direction === -1 ? anchor.start - candidate.end : candidate.start - anchor.end;
        if (gap > maxGap) return null;
        // A sentence boundary between them means they are not the same statement.
        const between = direction === -1
            ? text.slice(candidate.end, anchor.start)
            : text.slice(anchor.end, candidate.start);
        if (/[.!?;]/u.test(between)) return null;
        if (candidate.type === 'planet') return candidate;
    }
    return null;
}

export function extractClaims(text: string): Claim[] {
    const tokens = tokenize(text);
    const claims: Claim[] = [];

    tokens.forEach((token, i) => {
        switch (token.type) {
            case 'sign': {
                // "<planet> ... в <sign>": the preposition is what makes it a
                // placement claim rather than a passing mention of the sign.
                const prefix = text.slice(Math.max(0, token.start - 16), token.start).toLowerCase();
                if (!/(?:^|[\s(,«"—-])(?:во?|in(?:to)?)\s+(?:знаке\s+)?$/u.test(prefix)) return;
                const planet = nearestPlanet(tokens, i, -1, 60, text);
                if (!planet) return;
                claims.push({
                    kind: 'planet_in_sign',
                    planet: planet.value,
                    sign: token.value,
                    fragment: fragmentAround(text, planet.start, token.end),
                });
                return;
            }
            case 'retro':
            case 'direct': {
                const planet =
                    nearestPlanet(tokens, i, -1, 30, text) ?? nearestPlanet(tokens, i, 1, 30, text);
                if (!planet) return;
                const asserted = token.type === 'retro';
                claims.push({
                    kind: 'retrograde',
                    planet: planet.value,
                    value: isNegated(text, token) ? !asserted : asserted,
                    fragment: fragmentAround(text, token.start, token.end),
                });
                return;
            }
            case 'aspect': {
                const before = nearestPlanet(tokens, i, -1, 40, text);
                const after = nearestPlanet(tokens, i, 1, 40, text);
                // "Луна в тригоне к Марсу" puts one planet on each side,
                // "квадрат Луны к Марсу" puts both after the aspect word.
                const from = before ?? after;
                const to = before
                    ? after
                    : (after ? nearestPlanet(tokens, tokens.indexOf(after), 1, 40, text) : null);
                if (!from || !to || from.value === to.value) return;
                claims.push({
                    kind: 'aspect',
                    planet: from.value,
                    planet2: to.value,
                    aspect: token.value,
                    fragment: fragmentAround(text, from.start, to.end),
                });
                return;
            }
            case 'waxing':
            case 'waning': {
                // Only count it when the Moon is what is growing or fading.
                const moon =
                    nearestPlanet(tokens, i, 1, 20, text) ?? nearestPlanet(tokens, i, -1, 20, text);
                if (!moon || moon.value !== 'Moon') return;
                claims.push({
                    kind: 'moon_waxing',
                    value: token.type === 'waxing',
                    fragment: fragmentAround(text, token.start, token.end),
                });
                return;
            }
            case 'voc': {
                claims.push({
                    kind: 'void_of_course',
                    value: !isNegated(text, token),
                    fragment: fragmentAround(text, token.start, token.end),
                });
                return;
            }
            case 'lunar_day': {
                claims.push({
                    kind: 'lunar_day',
                    number: Number(token.value),
                    fragment: fragmentAround(text, token.start, token.end),
                });
                return;
            }
            default:
        }
    });

    return claims;
}

// ─── Verification ────────────────────────────────────────────────────────────

function findPlanet(facts: DayEphemerisSummary, planet: string) {
    return facts.planets.find((p) => p.planet === planet) ?? null;
}

function aspectsBetween(facts: DayEphemerisSummary, a: string, b: string) {
    return facts.aspects.filter(
        (asp) => (asp.from === a && asp.to === b) || (asp.from === b && asp.to === a),
    );
}

export function verifyClaim(claim: Claim, facts: DayEphemerisSummary): VerifiedClaim {
    switch (claim.kind) {
        case 'planet_in_sign': {
            const fact = findPlanet(facts, claim.planet!);
            if (!fact) {
                return {
                    ...claim,
                    verdict: 'unsupported',
                    reason: `the snapshot has no position for ${claim.planet}, so its sign cannot be claimed`,
                };
            }
            if (fact.sign !== claim.sign) {
                return {
                    ...claim,
                    verdict: 'contradicted',
                    reason: `${claim.planet} is in ${fact.sign} at ${fact.degree_in_sign.toFixed(1)}°, not in ${claim.sign}`,
                };
            }
            return { ...claim, verdict: 'supported' };
        }
        case 'retrograde': {
            const fact = findPlanet(facts, claim.planet!);
            if (!fact) {
                return {
                    ...claim,
                    verdict: 'unsupported',
                    reason: `the snapshot has no motion data for ${claim.planet}`,
                };
            }
            if (fact.retrograde !== claim.value) {
                return {
                    ...claim,
                    verdict: 'contradicted',
                    reason: `${claim.planet} is ${fact.retrograde ? 'retrograde' : 'direct'} (speed ${fact.speed.toFixed(3)}°/day)`,
                };
            }
            return { ...claim, verdict: 'supported' };
        }
        case 'aspect': {
            const from = findPlanet(facts, claim.planet!);
            const to = findPlanet(facts, claim.planet2!);
            if (!from || !to) {
                return {
                    ...claim,
                    verdict: 'unsupported',
                    reason: `the snapshot has no position for ${!from ? claim.planet : claim.planet2}`,
                };
            }
            const between = aspectsBetween(facts, claim.planet!, claim.planet2!);
            if (between.some((asp) => asp.type === claim.aspect)) {
                return { ...claim, verdict: 'supported' };
            }
            const actual = between.length
                ? between.map((asp) => `${asp.type} (orb ${asp.orb_deg.toFixed(1)}°)`).join(', ')
                : 'no aspect at all';
            return {
                ...claim,
                verdict: 'contradicted',
                reason: `${claim.planet} and ${claim.planet2} form ${actual} on this day, not a ${claim.aspect}`,
            };
        }
        case 'moon_waxing': {
            if (facts.moon.waxing !== claim.value) {
                return {
                    ...claim,
                    verdict: 'contradicted',
                    reason: `the Moon is ${facts.moon.waxing ? 'waxing' : 'waning'} (phase ${facts.moon.phase}, illumination ${(facts.moon.illumination * 100).toFixed(0)}%)`,
                };
            }
            return { ...claim, verdict: 'supported' };
        }
        case 'void_of_course': {
            if (facts.moon.void_of_course !== claim.value) {
                return {
                    ...claim,
                    verdict: 'contradicted',
                    reason: `the Moon is ${facts.moon.void_of_course ? 'void of course' : 'not void of course'} on this day`,
                };
            }
            return { ...claim, verdict: 'supported' };
        }
        case 'lunar_day': {
            // The day snapshot carries no lunar-day number, so any figure in
            // the text was invented. Grounding it needs the ephemeris
            // lunar-day endpoint in the snapshot first.
            return {
                ...claim,
                verdict: 'unsupported',
                reason: 'the snapshot carries no lunar day number; do not mention lunar days',
            };
        }
        default:
            return { ...claim, verdict: 'unsupported', reason: 'unknown claim kind' };
    }
}

export function verifyText(text: string, facts: DayEphemerisSummary): VerifiedClaim[] {
    return extractClaims(text).map((claim) => verifyClaim(claim, facts));
}

export function violationsOf(verified: VerifiedClaim[]): VerifiedClaim[] {
    return verified.filter((c) => c.verdict !== 'supported');
}

/** One line per violation, addressed to the model in the repair round. */
export function describeViolation(v: VerifiedClaim): string {
    return `"${v.fragment}" → ${v.reason ?? 'not supported by the day facts'}`;
}

// ─── Deterministic fallback ──────────────────────────────────────────────────

/**
 * Last-resort replacement for a cell the model kept getting wrong: dry,
 * but every word of it comes from the ephemeris.
 */
export function composeFactSentence(facts: DayEphemerisSummary, language: 'ru' | 'en'): string {
    const retro = facts.planets.filter((p) => p.retrograde).map((p) => p.planet);
    const tight = facts.notable_aspects.slice(0, 2);

    if (language === 'en') {
        const parts = [
            `Moon in ${facts.moon.sign}, ${facts.moon.waxing ? 'waxing' : 'waning'}, ${(facts.moon.illumination * 100).toFixed(0)}% lit`,
            `Sun in ${facts.sun_sign}`,
        ];
        if (facts.moon.void_of_course) parts.push('Moon void of course');
        if (retro.length) parts.push(`retrograde: ${retro.join(', ')}`);
        for (const asp of tight) {
            parts.push(`${asp.from} ${asp.type} ${asp.to} (orb ${asp.orb_deg.toFixed(1)}°)`);
        }
        return `${parts.join('; ')}.`;
    }

    const parts = [
        `Луна в ${RU_SIGN_LABEL[facts.moon.sign] ?? facts.moon.sign}, ${facts.moon.waxing ? 'растущая' : 'убывающая'}, освещена на ${(facts.moon.illumination * 100).toFixed(0)}%`,
        `Солнце в ${RU_SIGN_LABEL[facts.sun_sign] ?? facts.sun_sign}`,
    ];
    if (facts.moon.void_of_course) parts.push('Луна холостая');
    if (retro.length) {
        parts.push(`ретроградны: ${retro.map((p) => RU_PLANET_LABEL[p] ?? p).join(', ')}`);
    }
    for (const asp of tight) {
        const from = RU_PLANET_LABEL[asp.from] ?? asp.from;
        const to = RU_PLANET_LABEL[asp.to] ?? asp.to;
        parts.push(`${from} ${RU_ASPECT_LABEL[asp.type] ?? asp.type} ${to} (орб ${asp.orb_deg.toFixed(1)}°)`);
    }
    return `${parts.join('; ')}.`;
}

// ─── Cache fingerprint ───────────────────────────────────────────────────────

/**
 * Stable digest of the facts a narrative was built on. Without it the
 * narrative cache keys on dates alone, so the same intent asked from a
 * different location, or asked again after the ephemeris adapter
 * changed, gets someone else's text back.
 */
export function factsFingerprint(facts: DayEphemerisSummary): string {
    const planets = facts.planets
        .map((p) => `${p.planet}:${p.longitude.toFixed(2)}:${p.retrograde ? 'R' : 'D'}`)
        .sort()
        .join(',');
    const aspects = facts.aspects
        .map((a) => [a.from, a.to].sort().join('-') + `:${a.type}:${a.orb_deg.toFixed(1)}`)
        .sort()
        .join(',');
    const moon = `${facts.moon.sign}:${facts.moon.longitude.toFixed(2)}:${facts.moon.phase}:${facts.moon.void_of_course ? 'v' : '-'}`;
    return djb2(`${moon}|${facts.sun_sign}|${planets}|${aspects}`);
}

function djb2(s: string): string {
    let hash = 5381;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

export const __testing__ = { tokenize };

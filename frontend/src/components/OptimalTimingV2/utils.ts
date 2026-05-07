export const MOON_PHASE_LABEL_RU: Record<string, string> = {
    new: 'новолуние',
    waxing_crescent: 'растущий серп',
    first_quarter: 'первая четверть',
    waxing_gibbous: 'растущая Луна',
    full: 'полнолуние',
    waning_gibbous: 'убывающая Луна',
    last_quarter: 'последняя четверть',
    waning_crescent: 'убывающий серп',
};

export const SIGN_LABEL_RU: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

export function scoreColor(score: number): string {
    if (score >= 80) return 'otv2-score--great';
    if (score >= 60) return 'otv2-score--good';
    if (score >= 40) return 'otv2-score--mid';
    return 'otv2-score--low';
}

export function formatDate(iso: string, lang: string): string {
    const d = new Date(`${iso}T12:00:00Z`);
    const opts: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
    };
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', opts);
}

export function moonSummary(sign: string, phase: string, lang: string): string {
    if (lang === 'ru') {
        const phaseRu = MOON_PHASE_LABEL_RU[phase] ?? phase;
        const signRu = SIGN_LABEL_RU[sign] ?? sign;
        return `Луна — ${phaseRu} в ${signRu}`;
    }
    return `Moon ${phase.replace(/_/g, ' ')} in ${sign}`;
}

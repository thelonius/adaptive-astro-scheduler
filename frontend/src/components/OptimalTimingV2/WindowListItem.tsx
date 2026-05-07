import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';

interface Props {
    window: TimingWindowV2;
    language: string;
    selected: boolean;
    onSelect: (date: string) => void;
}

const SIGN_LABEL_RU: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

const PHASE_LABEL_RU: Record<string, string> = {
    new: 'новолуние',
    waxing_crescent: 'растущий серп',
    first_quarter: 'первая четверть',
    waxing_gibbous: 'растущая',
    full: 'полнолуние',
    waning_gibbous: 'убывающая',
    last_quarter: 'последняя четверть',
    waning_crescent: 'убывающий серп',
};

function formatDate(iso: string, lang: string): string {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function moonShort(sign: string, phase: string, lang: string): string {
    if (lang === 'ru') {
        return `${PHASE_LABEL_RU[phase] ?? phase}, ${SIGN_LABEL_RU[sign] ?? sign}`;
    }
    return `${phase.replace(/_/g, ' ')}, ${sign}`;
}

function scoreClass(score: number): string {
    if (score >= 80) return 'otv2-li-score--great';
    if (score >= 60) return 'otv2-li-score--good';
    if (score >= 40) return 'otv2-li-score--mid';
    return 'otv2-li-score--low';
}

export const WindowListItem: React.FC<Props> = ({ window: w, language, selected, onSelect }) => {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className={`otv2-li${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(w.date)}
            aria-pressed={selected}
        >
            <span className="otv2-li-rank">#{w.rank}</span>
            <span className="otv2-li-date">{formatDate(w.date, language)}</span>
            <span className={`otv2-li-score ${scoreClass(w.score)}`}>{w.score}</span>
            <span className="otv2-li-moon">{moonShort(w.moon.sign, w.moon.phase, language)}</span>
            {w.moon.void_of_course && (
                <span className="otv2-li-tag otv2-li-tag--warn">{t('optimalTimingV2.voc', 'VoC')}</span>
            )}
            {w.retrograde_planets.length > 0 && (
                <span className="otv2-li-tag otv2-li-tag--warn">℞ {w.retrograde_planets.join(',')}</span>
            )}
        </button>
    );
};

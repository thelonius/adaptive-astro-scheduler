import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';

interface Props {
    window: TimingWindowV2;
    language: string;
}

const MOON_PHASE_LABEL_RU: Record<string, string> = {
    new: 'новолуние',
    waxing_crescent: 'растущий серп',
    first_quarter: 'первая четверть',
    waxing_gibbous: 'растущая Луна',
    full: 'полнолуние',
    waning_gibbous: 'убывающая Луна',
    last_quarter: 'последняя четверть',
    waning_crescent: 'убывающий серп',
};

const SIGN_LABEL_RU: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

function formatDate(iso: string, lang: string): string {
    const d = new Date(`${iso}T12:00:00Z`);
    const opts: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
    };
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', opts);
}

function moonSummary(
    sign: string,
    phase: string,
    lang: string,
): string {
    if (lang === 'ru') {
        const phaseRu = MOON_PHASE_LABEL_RU[phase] ?? phase;
        const signRu = SIGN_LABEL_RU[sign] ?? sign;
        return `Луна — ${phaseRu} в ${signRu}`;
    }
    return `Moon ${phase.replace(/_/g, ' ')} in ${sign}`;
}

function scoreColor(score: number): string {
    if (score >= 80) return 'otv2-score--great';
    if (score >= 60) return 'otv2-score--good';
    if (score >= 40) return 'otv2-score--mid';
    return 'otv2-score--low';
}

export const WindowCard: React.FC<Props> = ({ window: w, language }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const positives = w.matched_predicates.filter((p) => p.weight > 0);
    const negatives = w.matched_predicates.filter((p) => p.weight < 0);

    return (
        <article className={`otv2-window${expanded ? ' is-expanded' : ''}`}>
            <header className="otv2-window-header">
                <div className="otv2-window-rank">#{w.rank}</div>
                <div className="otv2-window-date">{formatDate(w.date, language)}</div>
                <div className={`otv2-window-score ${scoreColor(w.score)}`}>
                    <div className="otv2-window-score-value">{w.score}</div>
                    <div className="otv2-window-score-label">/100</div>
                </div>
            </header>

            <div className="otv2-window-summary">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}
                        {t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
                {w.retrograde_planets.length > 0 && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}
                        {t('optimalTimingV2.retrograde', 'ретро')}: {w.retrograde_planets.join(', ')}
                    </span>
                )}
            </div>

            <div className="otv2-window-matched">
                {positives.map((p, i) => (
                    <span key={`p-${i}`} className="otv2-chip otv2-chip--pos">
                        +{p.weight} {p.type}
                    </span>
                ))}
                {negatives.map((p, i) => (
                    <span key={`n-${i}`} className="otv2-chip otv2-chip--neg">
                        {p.weight} {p.type}
                    </span>
                ))}
            </div>

            <button
                type="button"
                className="otv2-window-toggle"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                {expanded
                    ? t('optimalTimingV2.collapse', 'свернуть')
                    : t('optimalTimingV2.showDetails', 'подробнее')}
            </button>

            {expanded && (
                <div className="otv2-window-details">
                    <div className="otv2-detail-grid">
                        <div className="otv2-detail-row">
                            <span className="otv2-detail-key">
                                {t('optimalTimingV2.sun', 'Солнце')}
                            </span>
                            <span className="otv2-detail-val">
                                {language === 'ru' ? `в ${SIGN_LABEL_RU[w.sun_sign] ?? w.sun_sign}` : w.sun_sign}
                            </span>
                        </div>
                        {typeof w.moon.illumination === 'number' && (
                            <div className="otv2-detail-row">
                                <span className="otv2-detail-key">
                                    {t('optimalTimingV2.illumination', 'освещ.')}
                                </span>
                                <span className="otv2-detail-val">
                                    {Math.round(w.moon.illumination * 100)}%
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="otv2-detail-section-title">
                        {t('optimalTimingV2.matchedPredicates', 'сматчившиеся предикаты')}
                    </div>
                    <ul className="otv2-detail-predicates">
                        {w.matched_predicates.map((p, i) => (
                            <li key={i}>
                                <span
                                    className={`otv2-weight-badge ${p.weight >= 0 ? 'is-pos' : 'is-neg'}`}
                                >
                                    {p.weight >= 0 ? '+' : ''}
                                    {p.weight}
                                </span>
                                <span className="otv2-predicate-label">{p.type}</span>
                                {p.details && (
                                    <code className="otv2-predicate-details">
                                        {JSON.stringify(p.details)}
                                    </code>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </article>
    );
};

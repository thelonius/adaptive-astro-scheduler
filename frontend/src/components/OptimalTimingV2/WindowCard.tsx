import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';
import { SIGN_LABEL_RU, scoreColor, formatDate, moonSummary } from './utils';

interface Props {
    window: TimingWindowV2;
    language: string;
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

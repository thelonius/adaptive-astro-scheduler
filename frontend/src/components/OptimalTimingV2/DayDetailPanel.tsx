import React from 'react';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../ZodiacWheel';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibeId: string | null;
    onVibeChange: (vibeId: string) => void;
    location: { latitude: number; longitude: number; timezone: string };
    language: string;
}

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibeId,
    onVibeChange,
    location,
    language: _language,
}) => {
    const { t } = useTranslation();

    return (
        <section className="otv2-detail">
            <header className="otv2-detail-header">
                <h2 className="otv2-detail-date">{w.date}</h2>
                <div className="otv2-detail-score">{w.score}/100</div>
            </header>

            <div className="otv2-detail-wheel">
                <ZodiacWheel
                    date={w.date}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    timezone={location.timezone}
                    config={{ size: 320, showHouses: true, showAspects: true }}
                />
            </div>

            <VibeTabSwitcher vibes={vibes} selectedVibeId={selectedVibeId} onChange={onVibeChange} />

            <NarrativeBlock narratives={w.vibe_narratives} selectedVibeId={selectedVibeId} />

            {w.matched_predicates.length > 0 && (
                <details className="otv2-detail-predicates">
                    <summary>{t('optimalTimingV2.matchedPredicates', 'сматчившиеся предикаты')}</summary>
                    <ul>
                        {w.matched_predicates.map((p, i) => (
                            <li key={i}>
                                <span className={`otv2-weight-badge ${p.weight >= 0 ? 'is-pos' : 'is-neg'}`}>
                                    {p.weight >= 0 ? '+' : ''}{p.weight}
                                </span>
                                <span className="otv2-predicate-label">{p.type}</span>
                                {p.details && (
                                    <code className="otv2-predicate-details">{JSON.stringify(p.details)}</code>
                                )}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
};

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';
import type { ZodiacWheelData } from '../ZodiacWheel/types';
import { ZodiacWheel } from '../ZodiacWheel';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';
import { NatalChartCTA } from './NatalChartCTA';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibeId: string | null;
    onVibeChange: (vibeId: string) => void;
    language: string;
    natalData?: ZodiacWheelData | null;
}

const ZodiacWheelBlock: React.FC<{ date: string; natalData: ZodiacWheelData }> = ({ date, natalData }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(el);
        setContainerWidth(el.getBoundingClientRect().width);
        return () => observer.disconnect();
    }, []);

    const size = Math.max(containerWidth - 32, 200);

    return (
        <div ref={containerRef} style={{ marginBottom: '12px' }}>
            {containerWidth > 0 && (
                <ZodiacWheel
                    date={date}
                    innerData={natalData}
                    config={{ size, showHouses: false, showAspects: false, showRetrogrades: false }}
                    useAdaptiveRefresh={false}
                />
            )}
        </div>
    );
};

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibeId,
    onVibeChange,
    language: _language,
    natalData,
}) => {
    const { t } = useTranslation();

    return (
        <section className="otv2-detail">
            <header className="otv2-detail-header">
                <h2 className="otv2-detail-date">{w.date}</h2>
                <div className="otv2-detail-score">{w.score}/100</div>
            </header>

            {natalData !== undefined && (
                natalData
                    ? <ZodiacWheelBlock date={w.date} natalData={natalData} />
                    : <NatalChartCTA />
            )}

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

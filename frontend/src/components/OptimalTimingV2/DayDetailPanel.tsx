// frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';
import type { ZodiacWheelData } from '../ZodiacWheel/types';
import { ZodiacWheel } from '../ZodiacWheel';
import { formatDate, moonSummary, scoreColor } from './utils';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';
import { NatalChartCTA } from './NatalChartCTA';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibe: string | null;
    onVibeChange: (id: string) => void;
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
    selectedVibe,
    onVibeChange,
    language,
    natalData,
}) => {
    const { t } = useTranslation();
    const positives = w.matched_predicates.filter((p) => p.weight > 0);
    const negatives = w.matched_predicates.filter((p) => p.weight < 0);
    const narrativeText = selectedVibe ? w.vibe_narratives?.[selectedVibe] : undefined;

    return (
        <div className="otv2-detail-panel">
            <div className="otv2-detail-panel-header">
                <div className="otv2-detail-panel-date">{formatDate(w.date, language)}</div>
                <div className={`otv2-detail-panel-score ${scoreColor(w.score)}`}>
                    {w.score}
                    <span className="otv2-detail-panel-score-max">/100</span>
                </div>
            </div>

            <div className="otv2-detail-panel-moon">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
                {w.retrograde_planets.length > 0 && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.retrograde', 'ретро')}: {w.retrograde_planets.join(', ')}
                    </span>
                )}
            </div>

            <div className="otv2-detail-panel-chips">
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

            {natalData !== undefined && (
                natalData
                    ? <ZodiacWheelBlock date={w.date} natalData={natalData} />
                    : <NatalChartCTA />
            )}

            {vibes.length > 0 && (
                <VibeTabSwitcher
                    vibes={vibes}
                    selectedId={selectedVibe}
                    onChange={onVibeChange}
                />
            )}

            <NarrativeBlock text={narrativeText} />
        </div>
    );
};

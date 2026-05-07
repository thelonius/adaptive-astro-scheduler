// frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';
import { formatDate, moonSummary, scoreColor } from './utils';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibe: string | null;
    onVibeChange: (id: string) => void;
    language: string;
}

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibe,
    onVibeChange,
    language,
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

// frontend/src/components/OptimalTimingV2/WindowListItem.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';
import { scoreColor, formatDate, moonSummary } from './utils';

interface Props {
    window: TimingWindowV2;
    language: string;
    isSelected: boolean;
    onClick: (date: string) => void;
}

export const WindowListItem: React.FC<Props> = ({ window: w, language, isSelected, onClick }) => {
    const { t } = useTranslation();

    return (
        <article
            className={`otv2-list-item${isSelected ? ' is-selected' : ''}`}
            onClick={() => onClick(w.date)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(w.date)}
        >
            <div className="otv2-list-item-top">
                <span className="otv2-list-item-rank">#{w.rank}</span>
                <span className="otv2-list-item-date">{formatDate(w.date, language)}</span>
                <span className={`otv2-list-item-score ${scoreColor(w.score)}`}>{w.score}</span>
            </div>
            <div className="otv2-list-item-sub">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
            </div>
        </article>
    );
};

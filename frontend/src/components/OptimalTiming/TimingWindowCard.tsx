import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindow } from '@adaptive-astro/shared/types/astrology';
import './TimingWindowCard.css';

interface TimingWindowCardProps {
    window: TimingWindow;
}

export const TimingWindowCard: React.FC<TimingWindowCardProps> = ({ window }) => {
    const { t, i18n } = useTranslation();
    const scoreColor = getScoreColor(window.score);
    const date = new Date(window.date.date);
    const locale = i18n.language || 'en';

    return (
        <div className="timing-window-card" style={{ borderColor: scoreColor }}>
            <div className="timing-window__header">
                <div className="timing-window__date">
                    <span className="window-date__day">{date.getDate()}</span>
                    <span className="window-date__month">
                        {date.toLocaleDateString(locale, { month: 'short' })}
                    </span>
                    <span className="window-date__weekday">
                        {date.toLocaleDateString(locale, { weekday: 'short' })}
                    </span>
                </div>

                <div className="timing-window__score">
                    <div className="score-ring" style={{ borderColor: scoreColor }}>
                        {window.score}
                    </div>
                </div>
            </div>

            <div className="timing-window__content">
                <h3 className="timing-window__summary">{window.summary}</h3>

                {window.moonPhase && (
                    <div className="timing-window__moon">
                        <span className="moon-icon">🌙</span>
                        {window.moonPhase} {window.moonSign && t('timingWindow.moonIn', { sign: window.moonSign })}
                    </div>
                )}

                <div className="timing-window__reasons">
                    {window.suggestions?.map((suggestion, i) => (
                        <div key={i} className="reason-item reason-item--positive">
                            ✅ {suggestion}
                        </div>
                    ))}
                    {window.warnings?.map((warning, i) => (
                        <div key={i} className="reason-item reason-item--negative">
                            ⚠️ {warning}
                        </div>
                    ))}
                </div>

                {window.explanation && (
                    <div className="timing-window__explanation">
                        <p>{window.explanation}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

function getScoreColor(score: number): string {
    if (score >= 90) return '#4ade80'; // Green-400
    if (score >= 75) return '#a3e635'; // Lime-400
    if (score >= 60) return '#fbbf24'; // Amber-400
    if (score >= 50) return '#94a3b8'; // Slate-400
    return '#f87171'; // Red-400
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { IntentionCategory } from '@adaptive-astro/shared/types/astrology';
import './IntentionSelector.css';

interface IntentionSelectorProps {
    selected: IntentionCategory | null;
    onSelect: (intention: IntentionCategory) => void;
}

const INTENTIONS: { id: IntentionCategory; icon: string }[] = [
    { id: 'drop-habits', icon: '🗑️' },
    { id: 'start-project', icon: '🚀' },
    { id: 'make-decision', icon: '⚖️' },
    { id: 'career-change', icon: '💼' },
    { id: 'relationship', icon: '❤️' },
    { id: 'financial', icon: '💰' },
    { id: 'creative', icon: '🎨' },
    { id: 'health-wellness', icon: '🧘' },
    { id: 'spiritual', icon: '🔮' },
];

export const IntentionSelector: React.FC<IntentionSelectorProps> = ({ selected, onSelect }) => {
    const { t } = useTranslation();
    return (
        <div className="intention-selector">
            {INTENTIONS.map((intention) => (
                <button
                    key={intention.id}
                    className={`intention-card ${selected === intention.id ? 'intention-card--active' : ''}`}
                    onClick={() => onSelect(intention.id)}
                >
                    <div className="intention-card__icon">{intention.icon}</div>
                    <div className="intention-card__content">
                        <h3>{t(`intentions.${intention.id}.label`)}</h3>
                        <p>{t(`intentions.${intention.id}.description`)}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};

import React from 'react';
import type { IntentionCategory } from '@adaptive-astro/shared/types/astrology';
import './IntentionSelector.css';

interface IntentionSelectorProps {
    selected: IntentionCategory | null;
    onSelect: (intention: IntentionCategory) => void;
}

const INTENTIONS: { id: IntentionCategory; label: string; icon: string; description: string }[] = [
    {
        id: 'drop-habits',
        label: 'Drop Habits',
        icon: '🗑️',
        description: 'Release patterns, quit addictions, detox'
    },
    {
        id: 'start-project',
        label: 'Start Project',
        icon: '🚀',
        description: 'Launch business, begin creative work'
    },
    {
        id: 'make-decision',
        label: 'Make Decision',
        icon: '⚖️',
        description: 'Clarity for important choices'
    },
    {
        id: 'career-change',
        label: 'Career Change',
        icon: '💼',
        description: 'Job applications, interviews, promotions'
    },
    {
        id: 'relationship',
        label: 'Love & Social',
        icon: '❤️',
        description: 'Dating, deepening bonds, social events'
    },
    {
        id: 'financial',
        label: 'Financial',
        icon: '💰',
        description: 'Investments, asking for raises'
    },
    {
        id: 'creative',
        label: 'Creative Flow',
        icon: '🎨',
        description: 'Artistic expression and inspiration'
    },
    {
        id: 'health-wellness',
        label: 'Health & Wellness',
        icon: '🧘',
        description: 'Diet changes, detox, medical procedures'
    },
    {
        id: 'spiritual',
        label: 'Spiritual',
        icon: '🔮',
        description: 'Meditation, rituals, inner work'
    }
];

export const IntentionSelector: React.FC<IntentionSelectorProps> = ({ selected, onSelect }) => {
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
                        <h3>{intention.label}</h3>
                        <p>{intention.description}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};

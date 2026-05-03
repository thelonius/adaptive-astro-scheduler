import React from 'react';
import type { IntentionCategory } from '@adaptive-astro/shared/types/astrology';
import './IntentionSelector.css';

interface IntentionSelectorProps {
    selected: IntentionCategory | null;
    onSelect: (intention: IntentionCategory) => void;
    customIntent: string;
    onCustomIntentChange: (value: string) => void;
    onAISearch: () => void;
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

export const IntentionSelector: React.FC<IntentionSelectorProps> = ({ 
    selected, 
    onSelect, 
    customIntent, 
    onCustomIntentChange,
    onAISearch
}) => {
    return (
        <div className="intention-selector-container">
            <div className="custom-intent-box">
                <input
                    type="text"
                    placeholder="Ask AI: e.g., 'Best day for a crypto launch' or 'When to talk to my boss'..."
                    value={customIntent}
                    onChange={(e) => onCustomIntentChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAISearch()}
                    className="custom-intent-input"
                />
                <button 
                    className="ai-scan-button"
                    onClick={onAISearch}
                    disabled={!customIntent.trim()}
                >
                    ✨ Scan with AI
                </button>
            </div>
        </div>
    );
};

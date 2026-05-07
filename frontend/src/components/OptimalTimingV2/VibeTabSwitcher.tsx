// frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx

import React from 'react';
import type { Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    vibes: Vibe[];
    selectedId: string | null;
    onChange: (id: string) => void;
}

export const VibeTabSwitcher: React.FC<Props> = ({ vibes, selectedId, onChange }) => {
    if (vibes.length === 0) return null;

    return (
        <div className="otv2-vibe-pills">
            {vibes.map((v) => (
                <button
                    key={v.id}
                    type="button"
                    className={`otv2-vibe-pill${v.id === selectedId ? ' is-active' : ''}`}
                    onClick={() => onChange(v.id)}
                >
                    {v.emoji ? `${v.emoji} ` : ''}{v.label}
                </button>
            ))}
        </div>
    );
};

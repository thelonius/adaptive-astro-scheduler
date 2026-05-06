import React from 'react';
import type { Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    vibes: Vibe[];
    selectedVibeId: string | null;
    onChange: (vibeId: string) => void;
}

export const VibeTabSwitcher: React.FC<Props> = ({ vibes, selectedVibeId, onChange }) => {
    if (vibes.length === 0) return null;

    return (
        <div className="otv2-vibe-tabs" role="tablist" aria-label="vibes">
            {vibes.map((v) => {
                const active = v.id === selectedVibeId;
                return (
                    <button
                        key={v.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`otv2-vibe-tab${active ? ' is-active' : ''}`}
                        onClick={() => onChange(v.id)}
                    >
                        {v.emoji && <span className="otv2-vibe-tab-emoji">{v.emoji}</span>}
                        <span className="otv2-vibe-tab-label">{v.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

import React from 'react';
import type { TimingWindow } from '@adaptive-astro/shared/types/astrology';
import './TimingWindowCard.css';

// Renders an 8x8 grid visualizing the 64-dimensional embedding vector chunk
const NeuralSignature: React.FC<{ vector: number[] }> = ({ vector }) => {
    // If the vector isn't 64 items, we just map whatever is there
    return (
        <div className="neural-signature" title="AI Semantic Embedding Vector">
            <div className="neural-signature__grid">
                {vector.map((val, idx) => {
                    // Vectors use cosine similarity, normally clustered around -1 to 1. 
                    // Let's normalize it to a cool heatmap: positive=cyan/blue, negative=purple/pink
                    const isPositive = val > 0;
                    const intensity = Math.min(Math.abs(val) * 3, 1); // multiply to make colors pop
                    
                    // Simple hardcoded rgb for performance
                    const color = isPositive 
                        ? `rgba(6, 182, 212, ${intensity})` // Cyan-500
                        : `rgba(168, 85, 247, ${intensity})`; // Purple-500

                    return (
                        <div 
                            key={idx} 
                            className="neural-cell" 
                            style={{ backgroundColor: color }}
                        />
                    );
                })}
            </div>
            <div className="neural-signature__label">Neural Signature</div>
        </div>
    );
};

const PLANET_MAP: Record<string, { symbol: string, name: string, color: string }> = {
  '01': { symbol: '☉', name: 'Sun', color: '#fbbf24' },
  '02': { symbol: '☽', name: 'Moon', color: '#94a3b8' },
  '03': { symbol: '☿', name: 'Mercury', color: '#22d3ee' },
  '04': { symbol: '♀', name: 'Venus', color: '#f472b6' },
  '05': { symbol: '♂', name: 'Mars', color: '#ef4444' },
  '06': { symbol: '♃', name: 'Jupiter', color: '#d97706' },
  '07': { symbol: '♄', name: 'Saturn', color: '#475569' },
  '08': { symbol: '♅', name: 'Uranus', color: '#60a5fa' },
  '09': { symbol: '♆', name: 'Neptune', color: '#8b5cf6' },
  '10': { symbol: '♇', name: 'Pluto', color: '#1e293b' },
};

const ASPECT_MAP: Record<string, { symbol: string, name: string, color: string }> = {
  '000': { symbol: '☌', name: 'Conjunction', color: '#fbbf24' },
  '060': { symbol: '⚹', name: 'Sextile', color: '#0ea5e9' },
  '090': { symbol: '□', name: 'Square', color: '#ef4444' },
  '120': { symbol: '△', name: 'Trine', color: '#22c55e' },
  '180': { symbol: '☍', name: 'Opposition', color: '#f97316' },
  '150': { symbol: '⚻', name: 'Quincunx', color: '#a855f7' },
};

const AstroMnemonic: React.FC<{ tagStr: string }> = ({ tagStr }) => {
    // Expected format: [06.000,060,120.08] or [01.000.02]
    const match = tagStr.match(/\[(\d{2})\.([\d,]+)\.(\d{2})\]/);
    if (!match) return <span className="mnemonic-raw">{tagStr}</span>;

    const p1 = PLANET_MAP[match[1]];
    const aspCodes = match[2].split(',');
    const p2 = PLANET_MAP[match[3]];

    if (!p1 || !p2) return <span className="mnemonic-raw">{tagStr}</span>;

    return (
        <div className="astro-mnemonic">
            <div className="mnemonic-symbols">
                <span className="mnemonic-planet" style={{ color: p1.color }} title={p1.name}>{p1.symbol}</span>
                <span className="mnemonic-aspects">
                    {aspCodes.map((code, idx) => {
                        const asp = ASPECT_MAP[code];
                        if (!asp) return null;
                        return (
                            <span key={idx} style={{ color: asp.color }} title={asp.name}>
                                {asp.symbol}
                            </span>
                        );
                    })}
                </span>
                <span className="mnemonic-planet" style={{ color: p2.color }} title={p2.name}>{p2.symbol}</span>
            </div>
            <div className="mnemonic-text">
                {p1.name} · {aspCodes.map(c => ASPECT_MAP[c]?.name || c).join('/')} · {p2.name}
            </div>
        </div>
    );
};

interface TimingWindowCardProps {
    window: TimingWindow;
}

export const TimingWindowCard: React.FC<TimingWindowCardProps> = ({ window }) => {
    const scoreColor = getScoreColor(Math.round(window.score * 100));
    const isAI = window.id?.startsWith('ai-');
    
    // Handle different date formats gracefully
    const dateObj = (window as any).date?.date ? new Date((window as any).date.date) : new Date((window as any).startTime!);

    return (
        <div className={`timing-window-card ${isAI ? 'timing-window-card--ai' : ''}`} style={{ borderColor: scoreColor }}>
            <div className="timing-window__header">
                <div className="timing-window__date">
                    <span className="window-date__day">{dateObj.getDate()}</span>
                    <span className="window-date__month">
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="window-date__weekday">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                </div>

                <div className="timing-window__score-container">
                    <div className="score-value" style={{ color: scoreColor }}>
                        {Math.round(window.score * 100)}%
                    </div>
                    <div className="score-label">Compatibility</div>
                </div>
            </div>

            <div className="timing-window__content">
                {isAI && <div className="ai-badge">✨ AI Neural Analysis</div>}
                
                <h3 className="timing-window__summary">
                    {window.summary || (isAI ? 'Opportunity Identified' : '')}
                </h3>

                {isAI && (window as any).vector && (
                    <NeuralSignature vector={(window as any).vector} />
                )}

                <div className="timing-window__interpretation">
                    {(window as any).reasoning && <AstroMnemonic tagStr={(window as any).reasoning} />}
                    <p>{(window as any).interpretation || window.explanation}</p>
                </div>

                {(window as any).factors && (window as any).factors.length > 0 && (
                    <div className="timing-window__factors">
                        <div className="factors-title">Key Astrological Factors:</div>
                        <div className="factors-list">
                            {(window as any).factors.map((factor: any, i: number) => (
                                <span key={i} className={`factor-tag factor-tag--${factor.type}`}>
                                    {factor.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {!isAI && (
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

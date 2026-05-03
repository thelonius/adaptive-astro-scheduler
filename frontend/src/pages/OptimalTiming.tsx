import React, { useState, useEffect } from 'react';
import { IntentionSelector } from '../components/OptimalTiming/IntentionSelector';
import { TimingWindowCard } from '../components/OptimalTiming/TimingWindowCard';
import { optimalTimingService, type ExtractedRange } from '../services/optimalTimingService';
import type { IntentionCategory, TimingWindow } from '@adaptive-astro/shared/types/astrology';
import { LocationBar } from '../components/common/LocationBar';
import { useLocationStore } from '../store/locationStore';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { DispositorChains } from '../components/DayExplorer';
import { dayService, type CalendarDay } from '../services/dayService';
import './OptimalTiming.css';

function getScoreColor(score: number): string {
    if (score >= 85) return '#4ade80';
    if (score >= 70) return '#a3e635';
    if (score >= 55) return '#fbbf24';
    if (score >= 40) return '#94a3b8';
    return '#f87171';
}

const getMoonPhaseEmoji = (phase: string): string => {
    const phases: Record<string, string> = {
        'new moon': '🌑', 'new': '🌑', 'waxing crescent': '🌒', 'first quarter': '🌓',
        'waxing gibbous': '🌔', 'full moon': '🌕', 'full': '🌕', 'waning gibbous': '🌖',
        'last quarter': '🌗', 'third quarter': '🌗', 'waning crescent': '🌘',
    };
    return phases[phase.toLowerCase()] || '🌙';
};

const STRUCTURED_INTENTIONS = [
    'drop-habits', 'start-project', 'make-decision', 'relationship',
    'career-change', 'health-wellness', 'financial', 'creative', 'spiritual',
];

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export const OptimalTiming: React.FC = () => {
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
    });
    const [windows, setWindows] = useState<TimingWindow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAISearchActive, setIsAISearchActive] = useState(false);
    const [selectedIntention, setSelectedIntention] = useState<IntentionCategory | null>(null);
    const [customIntent, setCustomIntent] = useState('');
    const [extractedRange, setExtractedRange] = useState<ExtractedRange | null>(null);
    const [selectedDebugDate, setSelectedDebugDate] = useState<Date>(new Date());
    const [debugDayData, setDebugDayData] = useState<CalendarDay | null>(null);
    const [debugLoading, setDebugLoading] = useState(false);

    const { location: userLocation } = useLocationStore();

    const fetchTiming = async (intentionToUse: IntentionCategory | string) => {
        setLoading(true);
        setError(null);
        setExtractedRange(null);

        try {
            const isAI = !STRUCTURED_INTENTIONS.includes(intentionToUse as string);

            let response;
            if (isAI) {
                setIsAISearchActive(true);
                // No dates needed — backend extracts them from the prompt text
                response = await optimalTimingService.findAIWindows({
                    prompt: intentionToUse as string,
                });
                if (response.extractedRange) {
                    setExtractedRange(response.extractedRange);
                }
            } else {
                setIsAISearchActive(false);
                const start = new Date(startDate);
                const end = new Date(endDate);
                response = await optimalTimingService.findWindows({
                    intention: intentionToUse as IntentionCategory,
                    startDate: start,
                    endDate: end,
                    limit: 20,
                    location: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        timezone: userLocation.timezone,
                    },
                });
            }

            setWindows(response.windows);
        } catch (err: any) {
            console.error('Failed to fetch optimal timing:', err);
            setError(err.response?.data?.error || err.message || 'AI Analysis engine is offline. Try again in 1-2 minutes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedIntention) return;
        setCustomIntent('');
        fetchTiming(selectedIntention);
    }, [selectedIntention, startDate, endDate, userLocation]);

    useEffect(() => {
        if (!selectedDebugDate) return;
        setDebugLoading(true);
        setDebugDayData(null);
        dayService.getDay(
            selectedDebugDate.toISOString(),
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            userLocation.timezone
        ).then(setDebugDayData).catch(console.error).finally(() => setDebugLoading(false));
    }, [selectedDebugDate, userLocation]);

    const handleSelectDebugDate = (dateStr: string) => {
        setSelectedDebugDate(new Date(dateStr));
    };

    const handleAISearch = () => {
        if (!customIntent.trim()) return;
        setSelectedIntention(null);
        fetchTiming(customIntent);
    };

    return (
        <div className="optimal-timing">
            <div className="optimal-timing__header">
                <div className="optimal-timing__header-top">
                    <h1>Optimal Timing Engine</h1>
                    <LocationBar />
                </div>
                <p className="optimal-timing__subtitle">
                    Discover favorable cosmic windows for your intentions
                </p>
                {userLocation.city && (
                    <p className="optimal-timing__location-hint">
                        📍 Calculations for <strong>{userLocation.city}</strong>, {userLocation.country}
                    </p>
                )}
            </div>

            <div className="optimal-timing__search-section">
                <IntentionSelector
                    selected={selectedIntention}
                    onSelect={setSelectedIntention}
                    customIntent={customIntent}
                    onCustomIntentChange={setCustomIntent}
                    onAISearch={handleAISearch}
                />
            </div>

            {(selectedIntention || isAISearchActive) && (
                <div className="optimal-timing__results">

                    {/* Date range banner */}
                    {extractedRange && (
                        <div className={`extracted-range-banner ${extractedRange.wasExtracted ? 'extracted' : 'default'}`}>
                            <span className="extracted-range-banner__icon">
                                {extractedRange.wasExtracted ? '📅' : '🗓️'}
                            </span>
                            <div className="extracted-range-banner__text">
                                <span className="extracted-range-banner__label">
                                    {extractedRange.wasExtracted
                                        ? 'Период извлечён из запроса'
                                        : 'Период по умолчанию'}
                                </span>
                                <span className="extracted-range-banner__dates">
                                    {formatDate(extractedRange.startDate)} — {formatDate(extractedRange.endDate)}
                                </span>
                            </div>
                            {!extractedRange.wasExtracted && (
                                <span className="extracted-range-banner__hint">
                                    Укажите дату в тексте запроса для точного поиска
                                </span>
                            )}
                        </div>
                    )}

                    <div className="results-header">
                        <div className="results-title-group">
                            <h2 className="section-title">
                                {isAISearchActive ? 'AI Neural Analysis' : 'Recommended Windows'}
                            </h2>
                            {loading && <span className="loading-badge">Calculating...</span>}
                        </div>

                        {!isAISearchActive && (
                            <div className="time-range-controls">
                                <div className="date-input-group">
                                    <label>From:</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="date-input-group">
                                    <label>To:</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {!loading && windows.length > 0 && isAISearchActive && (
                        <div className="ai-results-list">
                            {windows.map((w: any) => {
                                const dateStr = w.startTime ?? w.date?.date;
                                const date = new Date(dateStr);
                                const score = Math.round((w.score ?? 0) * 100);
                                const color = getScoreColor(score);
                                const isSelected = selectedDebugDate?.toDateString() === date.toDateString();
                                const positives = (w.factors ?? []).filter((f: any) => f.type === 'positive');
                                const negatives = (w.factors ?? []).filter((f: any) => f.type === 'negative');
                                return (
                                    <div
                                        key={w.id}
                                        className={`ai-result-item ${isSelected ? 'ai-result-item--active' : ''}`}
                                        onClick={() => handleSelectDebugDate(dateStr)}
                                    >
                                        <div className="ai-result-item__date">
                                            <span className="ai-result-item__daynum">{date.getDate()}</span>
                                            <span className="ai-result-item__month">
                                                {date.toLocaleDateString('ru-RU', { month: 'short' })}
                                            </span>
                                            <span className="ai-result-item__weekday">
                                                {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                            </span>
                                        </div>
                                        <div className="ai-result-item__body">
                                            <div className="ai-result-item__score-row">
                                                <div className="ai-result-item__bar-wrap">
                                                    <div
                                                        className="ai-result-item__bar-fill"
                                                        style={{ width: `${score}%`, background: color }}
                                                    />
                                                </div>
                                                <span className="ai-result-item__pct" style={{ color }}>{score}%</span>
                                            </div>
                                            <div className="ai-result-item__text">
                                                {w.interpretation ?? w.summary}
                                            </div>
                                            <div className="ai-result-item__meta">
                                                {w.moonSign && (
                                                    <span className="ai-result-item__moon">☽ {w.moonSign}</span>
                                                )}
                                                {positives.map((f: any, i: number) => (
                                                    <span key={i} className="ai-tag ai-tag--pos">{f.name}</span>
                                                ))}
                                                {negatives.map((f: any, i: number) => (
                                                    <span key={i} className="ai-tag ai-tag--neg">{f.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && windows.length > 0 && !isAISearchActive && (
                        <div className="windows-list">
                            {windows.map((w) => {
                                const dateStr = (w as any).startTime ?? (w as any).date?.date;
                                const isSelected = dateStr && selectedDebugDate?.toDateString() === new Date(dateStr).toDateString();
                                return (
                                <div
                                    key={w.id}
                                    className={`timing-window-wrapper ${isSelected ? 'timing-window-wrapper--active' : ''}`}
                                    onClick={() => dateStr && handleSelectDebugDate(dateStr)}
                                >
                                    <TimingWindowCard window={w} />
                                </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && windows.length === 0 && !error && (
                        <div className="no-results">
                            No favorable windows found in this time range.
                            Try extending the range or choosing a new intention.
                        </div>
                    )}
                </div>
            )}

            {/* Ephemeris Debug Panel — always visible, shows today by default, updates on card click */}
            <div className="ephemeris-debug-panel">
                <div className="ephemeris-debug-panel__header">
                    <h3 className="ephemeris-debug-panel__title">
                        🔭 Эфемериды: {selectedDebugDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                </div>

                {debugLoading && <div className="ephemeris-debug-panel__loading">Загрузка данных...</div>}

                {debugDayData && (
                    <div className="ephemeris-debug-panel__content">
                        {/* Left: Zodiac Wheel */}
                        <div className="ephemeris-debug-panel__wheel">
                            <ZodiacWheel
                                date={selectedDebugDate}
                                data={{
                                    planets: Object.values(debugDayData.transits || {}),
                                    aspects: debugDayData.aspects || [],
                                    houses: debugDayData.houses || [],
                                    voidMoon: debugDayData.voidOfCourseMoon
                                        ? { isVoid: true, voidStart: debugDayData.voidOfCourseMoon.startTime?.date?.toString(), voidEnd: debugDayData.voidOfCourseMoon.endTime?.date?.toString() }
                                        : { isVoid: false },
                                    planetaryHours: debugDayData.planetaryHours || [],
                                    timestamp: selectedDebugDate,
                                } as any}
                                config={{ size: 520, showHouses: true, showAspects: true, showRetrogrades: true }}
                            />
                        </div>

                        {/* Right: Lunar day + VoC */}
                        <div className="ephemeris-debug-panel__info">
                            {/* Lunar Day */}
                            <div className="debug-lunar-card">
                                <div className="debug-lunar-card__header">
                                    <span className="debug-lunar-card__title">🌙 Лунный день {debugDayData.lunarDay?.number}</span>
                                    <span className={`debug-lunar-card__energy debug-energy--${debugDayData.lunarDay?.energy?.toLowerCase()}`}>
                                        {debugDayData.lunarDay?.energy}
                                    </span>
                                </div>
                                {debugDayData.lunarDay?.symbol && (
                                    <div className="debug-lunar-card__symbol">Символ: {debugDayData.lunarDay.symbol}</div>
                                )}
                                {debugDayData.lunarDay?.description && (
                                    <p className="debug-lunar-card__desc">{debugDayData.lunarDay.description}</p>
                                )}
                                <div className="debug-lunar-card__phase">
                                    <span className="debug-phase-emoji">{getMoonPhaseEmoji(debugDayData.moonPhase?.phase || '')}</span>
                                    <span>{debugDayData.moonPhase?.phase} · {((debugDayData.moonPhase?.illumination || 0) * 100).toFixed(0)}% освещённость</span>
                                </div>
                                {debugDayData.voidMoon && (
                                    <div className={`debug-lunar-card__voc ${debugDayData.voidMoon.isVoid ? 'debug-lunar-card__voc--active' : ''}`}>
                                        {debugDayData.voidMoon.isVoid ? '⚠️ Луна без курса' : '✅ Луна активна'}
                                    </div>
                                )}
                                {debugDayData.lunarDay?.recommendations && (
                                    <div className="debug-lunar-card__recs">
                                        <div className="debug-recs-good">
                                            <div className="debug-recs-label">Хорошо для:</div>
                                            {debugDayData.lunarDay.recommendations.good?.slice(0, 3).map((item, i) => (
                                                <div key={i} className="debug-rec-item">✓ {item}</div>
                                            ))}
                                        </div>
                                        <div className="debug-recs-avoid">
                                            <div className="debug-recs-label">Избегать:</div>
                                            {debugDayData.lunarDay.recommendations.avoid?.slice(0, 3).map((item, i) => (
                                                <div key={i} className="debug-rec-item">✗ {item}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dispositor Chains */}
                            <div className="debug-dispositor-wrap">
                                <DispositorChains date={selectedDebugDate} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

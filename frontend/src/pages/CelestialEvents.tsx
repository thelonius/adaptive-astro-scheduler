import React, { useState, useMemo } from 'react';
import { useCelestialEvents } from '../hooks/useCelestialEvents';
import { EventTimeline } from '../components/CelestialEvents/EventTimeline';
import type { CelestialEventType } from '@adaptive-astro/shared/types';
import './CelestialEvents.css';

export const CelestialEvents: React.FC = () => {
    const [selectedTypes, setSelectedTypes] = useState<CelestialEventType[]>([]);
    const [monthsAhead, setMonthsAhead] = useState(2); // Default: 2 months ahead
    const [monthsBack, setMonthsBack] = useState(0); // Default: current month only

    // Memoize date calculations to prevent recreation on every render
    const { startDate, endDate } = useMemo(() => {
        const start = new Date();
        start.setMonth(start.getMonth() - monthsBack);
        start.setDate(1); // Start of month
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setMonth(end.getMonth() + monthsAhead);
        end.setDate(1); // Start of next month
        end.setHours(0, 0, 0, 0);

        return { startDate: start, endDate: end };
    }, [monthsAhead, monthsBack]);

    const { events, loading, error } = useCelestialEvents(startDate, endDate);

    const eventTypes: { type: CelestialEventType; label: string; icon: string }[] = [
        { type: 'lunar-phase', label: 'Lunar Phases', icon: '🌙' },
        { type: 'lunar-eclipse', label: 'Lunar Eclipses', icon: '🌑' },
        { type: 'solar-eclipse', label: 'Solar Eclipses', icon: '☀️' },
        { type: 'planetary-alignment', label: 'Alignments', icon: '✨' },
        { type: 'occultation', label: 'Occultations', icon: '🌓' },
        { type: 'retrograde-start', label: 'Retrogrades', icon: '↩️' },
        { type: 'ingress', label: 'Ingresses', icon: '➡️' },
    ];

    const toggleType = (type: CelestialEventType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const filteredEvents = selectedTypes.length > 0
        ? events.filter(e => selectedTypes.includes(e.type))
        : events;

    return (
        <div className="celestial-events">
            <div className="celestial-events__header">
                <h1>Celestial Events</h1>
                <p className="celestial-events__subtitle">
                    Explore upcoming astronomical phenomena and their astrological significance
                </p>
            </div>

            <div className="celestial-events__time-range">
                <div className="time-range__control">
                    <label htmlFor="months-back">Look back:</label>
                    <select
                        id="months-back"
                        value={monthsBack}
                        onChange={(e) => setMonthsBack(parseInt(e.target.value))}
                    >
                        <option value="0">Current month</option>
                        <option value="1">1 month</option>
                        <option value="2">2 months</option>
                        <option value="3">3 months</option>
                        <option value="6">6 months</option>
                        <option value="12">1 year</option>
                    </select>
                </div>

                <div className="time-range__control">
                    <label htmlFor="months-ahead">Look ahead:</label>
                    <select
                        id="months-ahead"
                        value={monthsAhead}
                        onChange={(e) => setMonthsAhead(parseInt(e.target.value))}
                    >
                        <option value="1">1 month</option>
                        <option value="2">2 months</option>
                        <option value="3">3 months</option>
                        <option value="6">6 months</option>
                        <option value="12">1 year</option>
                    </select>
                </div>

                <div className="time-range__info">
                    Showing events from {startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} to {endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
            </div>

            <div className="celestial-events__filters">
                <div className="celestial-events__filter-label">Filter by type:</div>
                <div className="celestial-events__filter-chips">
                    {eventTypes.map(({ type, label, icon }) => (
                        <button
                            key={type}
                            className={`filter-chip ${selectedTypes.includes(type) ? 'filter-chip--active' : ''}`}
                            onClick={() => toggleType(type)}
                        >
                            <span className="filter-chip__icon">{icon}</span>
                            <span className="filter-chip__label">{label}</span>
                        </button>
                    ))}
                </div>
                {selectedTypes.length > 0 && (
                    <button
                        className="celestial-events__clear-filters"
                        onClick={() => setSelectedTypes([])}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            <div className="celestial-events__stats">
                <div className="stat-card">
                    <div className="stat-card__value">{filteredEvents.length}</div>
                    <div className="stat-card__label">Total Events</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">
                        {filteredEvents.filter(e => e.rarity === 'rare' || e.rarity === 'very-rare').length}
                    </div>
                    <div className="stat-card__label">Rare Events</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">
                        {filteredEvents.filter(e => e.type.includes('eclipse')).length}
                    </div>
                    <div className="stat-card__label">Eclipses</div>
                </div>
            </div>

            {error && (
                <div className="celestial-events__error">
                    <p>Error loading events: {error.message}</p>
                </div>
            )}

            <EventTimeline events={filteredEvents} loading={loading} />
        </div>
    );
};

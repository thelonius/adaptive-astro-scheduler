import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCelestialEvents } from '../hooks/useCelestialEvents';
import { EventTimeline } from '../components/CelestialEvents/EventTimeline';
import type { CelestialEventType } from '@adaptive-astro/shared/types';
import './CelestialEvents.css';

export const CelestialEvents: React.FC = () => {
    const { t, i18n } = useTranslation();
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
        { type: 'lunar-phase', label: t('celestialEvents.types.lunarPhases'), icon: '🌙' },
        { type: 'lunar-eclipse', label: t('celestialEvents.types.lunarEclipses'), icon: '🌑' },
        { type: 'solar-eclipse', label: t('celestialEvents.types.solarEclipses'), icon: '☀️' },
        { type: 'planetary-alignment', label: t('celestialEvents.types.alignments'), icon: '✨' },
        { type: 'occultation', label: t('celestialEvents.types.occultations'), icon: '🌓' },
        { type: 'retrograde-start', label: t('celestialEvents.types.retrogrades'), icon: '↩️' },
        { type: 'ingress', label: t('celestialEvents.types.ingresses'), icon: '➡️' },
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

    const dateLocale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

    return (
        <div className="celestial-events">
            <div className="celestial-events__header">
                <h1>{t('celestialEvents.title')}</h1>
                <p className="celestial-events__subtitle">
                    {t('celestialEvents.subtitle')}
                </p>
            </div>

            <div className="celestial-events__time-range">
                <div className="time-range__control">
                    <label htmlFor="months-back">{t('celestialEvents.lookBack')}</label>
                    <select
                        id="months-back"
                        value={monthsBack}
                        onChange={(e) => setMonthsBack(parseInt(e.target.value))}
                    >
                        <option value="0">{t('celestialEvents.currentMonth')}</option>
                        <option value="1">{t('celestialEvents.month1')}</option>
                        <option value="2">{t('celestialEvents.month2')}</option>
                        <option value="3">{t('celestialEvents.month3')}</option>
                        <option value="6">{t('celestialEvents.month6')}</option>
                        <option value="12">{t('celestialEvents.year1')}</option>
                    </select>
                </div>

                <div className="time-range__control">
                    <label htmlFor="months-ahead">{t('celestialEvents.lookAhead')}</label>
                    <select
                        id="months-ahead"
                        value={monthsAhead}
                        onChange={(e) => setMonthsAhead(parseInt(e.target.value))}
                    >
                        <option value="1">{t('celestialEvents.month1')}</option>
                        <option value="2">{t('celestialEvents.month2')}</option>
                        <option value="3">{t('celestialEvents.month3')}</option>
                        <option value="6">{t('celestialEvents.month6')}</option>
                        <option value="12">{t('celestialEvents.year1')}</option>
                    </select>
                </div>

                <div className="time-range__info">
                    {t('celestialEvents.showingRange', {
                        start: startDate.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' }),
                        end: endDate.toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
                    })}
                </div>
            </div>

            <div className="celestial-events__filters">
                <div className="celestial-events__filter-label">{t('celestialEvents.filterByType')}</div>
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
                        {t('celestialEvents.clearFilters')}
                    </button>
                )}
            </div>

            <div className="celestial-events__stats">
                <div className="stat-card">
                    <div className="stat-card__value">{filteredEvents.length}</div>
                    <div className="stat-card__label">{t('celestialEvents.totalEvents')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">
                        {filteredEvents.filter(e => e.rarity === 'rare' || e.rarity === 'very-rare').length}
                    </div>
                    <div className="stat-card__label">{t('celestialEvents.rareEvents')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">
                        {filteredEvents.filter(e => e.type.includes('eclipse')).length}
                    </div>
                    <div className="stat-card__label">{t('celestialEvents.eclipses')}</div>
                </div>
            </div>

            {error && (
                <div className="celestial-events__error">
                    <p>{t('celestialEvents.errorLoading', { message: error.message })}</p>
                </div>
            )}

            <EventTimeline events={filteredEvents} loading={loading} />
        </div>
    );
};

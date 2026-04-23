import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { IntentionSelector } from '../components/OptimalTiming/IntentionSelector';
import { TimingWindowCard } from '../components/OptimalTiming/TimingWindowCard';
import { optimalTimingService } from '../services/optimalTimingService';
import type { IntentionCategory, TimingWindow } from '@adaptive-astro/shared/types/astrology';
import { LocationBar } from '../components/common/LocationBar';
import { useLocationStore } from '../store/locationStore';
import './OptimalTiming.css';

export const OptimalTiming: React.FC = () => {
    const { t } = useTranslation();
    const [selectedIntention, setSelectedIntention] = useState<IntentionCategory | null>(null);
    const [windows, setWindows] = useState<TimingWindow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [monthsAhead, setMonthsAhead] = useState(3);

    const { location: userLocation } = useLocationStore();

    useEffect(() => {
        if (!selectedIntention) return;

        const fetchTiming = async () => {
            setLoading(true);
            setError(null);

            try {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + monthsAhead);

                const response = await optimalTimingService.findWindows({
                    intention: selectedIntention,
                    startDate,
                    endDate,
                    limit: 20,
                    location: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        timezone: userLocation.timezone,
                    },
                });

                setWindows(response.windows);
            } catch (err) {
                console.error('Failed to fetch optimal timing:', err);
                setError(t('optimalTiming.fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchTiming();
    }, [selectedIntention, monthsAhead, userLocation]);

    return (
        <div className="optimal-timing">
            <div className="optimal-timing__header">
                <div className="optimal-timing__header-top">
                    <h1>{t('optimalTiming.title')}</h1>
                    <LocationBar />
                </div>
                <p className="optimal-timing__subtitle">
                    {t('optimalTiming.subtitle')}
                </p>
                {userLocation.city && (
                    <p className="optimal-timing__location-hint">
                        📍 <Trans
                            i18nKey="optimalTiming.locationHint"
                            values={{ city: userLocation.city, country: userLocation.country }}
                            components={{ strong: <strong /> }}
                        />
                    </p>
                )}
            </div>

            <div className="optimal-timing__section">
                <h2 className="section-title">{t('optimalTiming.intentionQuestion')}</h2>
                <IntentionSelector
                    selected={selectedIntention}
                    onSelect={setSelectedIntention}
                />
            </div>

            {selectedIntention && (
                <div className="optimal-timing__results">
                    <div className="results-header">
                        <h2 className="section-title">
                            {t('optimalTiming.recommendedWindows')}
                            {loading && <span className="loading-spinner">{t('optimalTiming.calculationInProgress')}</span>}
                        </h2>

                        <div className="time-range-control">
                            <label>{t('optimalTiming.lookAhead')}</label>
                            <select
                                value={monthsAhead}
                                onChange={(e) => setMonthsAhead(Number(e.target.value))}
                            >
                                <option value={1}>{t('optimalTiming.range.month1')}</option>
                                <option value={3}>{t('optimalTiming.range.month3')}</option>
                                <option value={6}>{t('optimalTiming.range.month6')}</option>
                                <option value={12}>{t('optimalTiming.range.year1')}</option>
                            </select>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {!loading && windows.length === 0 && (
                        <div className="no-results">
                            {t('optimalTiming.noResults')}
                        </div>
                    )}

                    <div className="windows-list">
                        {windows.map((window) => (
                            <TimingWindowCard key={window.id} window={window} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

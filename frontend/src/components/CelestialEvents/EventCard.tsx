import React, { useState, useEffect } from 'react';
import type { CelestialEvent } from '@adaptive-astro/shared/types';
import './EventCard.css';

interface EventCardProps {
    event: CelestialEvent;
    expanded?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, expanded: initialExpanded = false }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const [timeUntil, setTimeUntil] = useState<string>('');

    // Calculate time until event
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const eventDate = new Date(event.date.date);
            const diff = eventDate.getTime() - now.getTime();

            if (diff < 0) {
                setTimeUntil('Past event');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeUntil(`in ${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeUntil(`in ${hours}h ${minutes}m`);
            } else {
                setTimeUntil(`in ${minutes}m`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [event.date]);

    const getEventIcon = (type: string): string => {
        const icons: Record<string, string> = {
            'lunar-phase': '🌙',
            'lunar-eclipse': '🌑',
            'solar-eclipse': '☀️',
            'planetary-alignment': '✨',
            'conjunction': '🔗',
            'occultation': '🌓',
            'retrograde-start': '↩️',
            'retrograde-end': '↪️',
            'ingress': '➡️',
            'equinox': '⚖️',
            'solstice': '🌞'
        };
        return icons[type] || '⭐';
    };

    const getRarityColor = (rarity: string): string => {
        const colors: Record<string, string> = {
            'common': '#6b7280',
            'moderate': '#3b82f6',
            'rare': '#8b5cf6',
            'very-rare': '#ec4899'
        };
        return colors[rarity] || '#6b7280';
    };

    const formatDate = (date: Date | string): string => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`event-card event-card--${event.type} event-card--${event.rarity}`}>
            <div className="event-card__header" onClick={() => setExpanded(!expanded)}>
                <div className="event-card__icon">{getEventIcon(event.type)}</div>
                <div className="event-card__main">
                    <h3 className="event-card__title">{event.name}</h3>
                    <p className="event-card__date">{formatDate(event.date.date)}</p>
                </div>
                <div className="event-card__meta">
                    <span
                        className="event-card__rarity"
                        style={{ backgroundColor: getRarityColor(event.rarity) }}
                    >
                        {event.rarity}
                    </span>
                    {timeUntil && (
                        <span className="event-card__countdown">{timeUntil}</span>
                    )}
                </div>
                <button className="event-card__expand">
                    {expanded ? '▼' : '▶'}
                </button>
            </div>

            {expanded && (
                <div className="event-card__details">
                    <p className="event-card__description">{event.description}</p>

                    {event.planets && event.planets.length > 0 && (
                        <div className="event-card__planets">
                            <strong>Planets Involved:</strong>
                            <div className="event-card__planet-list">
                                {event.planets.map(planet => (
                                    <span key={planet} className="event-card__planet">
                                        {planet}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="event-card__significance">
                        <strong>Astrological Significance:</strong>
                        <p>{event.significance}</p>
                    </div>

                    {event.visibility && (
                        <div className="event-card__visibility">
                            <strong>Visibility:</strong> {event.visibility}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

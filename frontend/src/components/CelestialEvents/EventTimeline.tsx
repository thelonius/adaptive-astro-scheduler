import React from 'react';
import type { CelestialEvent } from '@adaptive-astro/shared/types';
import { EventCard } from './EventCard';
import './EventTimeline.css';

interface EventTimelineProps {
    events: CelestialEvent[];
    loading?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, loading = false }) => {
    if (loading) {
        return (
            <div className="event-timeline event-timeline--loading">
                <div className="event-timeline__spinner">Loading events...</div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="event-timeline event-timeline--empty">
                <p>No events found for the selected criteria.</p>
            </div>
        );
    }

    // Group events by month
    const groupedEvents = events.reduce((acc, event) => {
        const date = new Date(event.date.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!acc[monthKey]) {
            acc[monthKey] = {
                name: monthName,
                events: []
            };
        }

        acc[monthKey].events.push(event);
        return acc;
    }, {} as Record<string, { name: string; events: CelestialEvent[] }>);

    const sortedMonths = Object.keys(groupedEvents).sort();

    return (
        <div className="event-timeline">
            {sortedMonths.map(monthKey => (
                <div key={monthKey} className="event-timeline__month">
                    <div className="event-timeline__month-header">
                        <h2>{groupedEvents[monthKey].name}</h2>
                        <span className="event-timeline__month-count">
                            {groupedEvents[monthKey].events.length} event{groupedEvents[monthKey].events.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="event-timeline__events">
                        {groupedEvents[monthKey].events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

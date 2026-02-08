import {
    DateTime,
    CelestialEvent,
    TimingWindow,
    IntentionCategory,
    CelestialEventType
} from '@adaptive-astro/shared/types/astrology';
import { TIMING_RULES, IntentionRules } from '../config/timing-rules';
import { CelestialEventsDetector } from './celestial-events-detector';

export class OptimalTimingService {
    constructor(private detector: CelestialEventsDetector) { }

    /**
     * Find optimal timing windows for a specific intention
     */
    async findOptimalWindows(
        intention: IntentionCategory,
        startDate: DateTime,
        endDate: DateTime,
        limit: number = 20
    ): Promise<TimingWindow[]> {
        // 1. Get all events for the period
        const events = await this.detector.getAllEvents(startDate, endDate);

        // 2. Group events by day
        const eventsByDay = this.groupEventsByDay(events);

        // 3. Score each day
        const windows: TimingWindow[] = [];
        const rules = TIMING_RULES[intention];

        for (const [dateStr, dayEvents] of eventsByDay.entries()) {
            const date = new Date(dateStr);
            // Create a DateTime object for the window
            const windowDate: DateTime = {
                date: date,
                timezone: startDate.timezone,
                location: startDate.location
            };

            const scoreResult = this.scoreDay(dayEvents, rules);

            if (scoreResult.score >= 50) { // Only return neutral or positive days
                windows.push({
                    id: `${intention}-${dateStr}`,
                    date: windowDate,
                    score: scoreResult.score,
                    events: dayEvents,
                    summary: this.generateSummary(intention, scoreResult.score),
                    suggestions: scoreResult.matches,
                    warnings: scoreResult.warnings,
                    moonPhase: this.findMoonPhase(dayEvents),
                    moonSign: this.findMoonSign(dayEvents)
                });
            }
        }

        // 4. Sort by score (descending) and return top results
        return windows
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Score a single day based on events and rules
     */
    private scoreDay(
        events: CelestialEvent[],
        rules: IntentionRules
    ): { score: number, matches: string[], warnings: string[] } {
        let score = 50; // Start neutral
        const matches: string[] = [];
        const warnings: string[] = [];

        // Check Moon Sign
        const moonIngress = events.find(e => e.type === 'ingress' && e.planets?.includes('Moon'));
        // Note: This matches ingresses on that day. Ideally we'd know the sign for the whole day.
        // For now, let's assume if there's no ingress, we might miss the sign bonus unless we fetch it separately.
        // Optimization: The detector events might not include "Moon is in X" state, only changes.
        // We might need to enhance this later. For now, rely on events.

        // Check Favorable Rules
        for (const rule of rules.favorable) {
            const match = events.find(event => this.matchesRule(event, rule));
            if (match) {
                score += rule.weight;
                matches.push(this.formatRuleDescription(rule, match));
            }
        }

        // Check Unfavorable Rules
        for (const rule of rules.unfavorable) {
            const match = events.find(event => this.matchesRule(event, rule));
            if (match) {
                score += rule.weight;
                warnings.push(this.formatRuleDescription(rule, match));
            }
        }

        // Clamp score 0-100
        return {
            score: Math.max(0, Math.min(100, score)),
            matches,
            warnings
        };
    }

    /**
     * Check if an event matches a rule
     */
    private matchesRule(event: CelestialEvent, rule: any): boolean {
        if (event.type !== rule.type) return false;

        // Check planet
        if (rule.planet && !event.planets?.includes(rule.planet)) return false;

        // Check phase (for lunar phases)
        if (rule.phase && event.type === 'lunar-phase') {
            // Simple string includes for now
            return event.name.includes(rule.phase);
        }

        // Check sign (for ingress)
        if (rule.sign && event.type === 'ingress') {
            return event.name.includes(rule.sign);
        }

        return true;
    }

    private groupEventsByDay(events: CelestialEvent[]): Map<string, CelestialEvent[]> {
        const groups = new Map<string, CelestialEvent[]>();

        for (const event of events) {
            const dateStr = event.date.date.toISOString().split('T')[0];
            const existing = groups.get(dateStr) || [];
            existing.push(event);
            groups.set(dateStr, existing);
        }

        return groups;
    }

    private findMoonPhase(events: CelestialEvent[]): string | undefined {
        const phaseEvent = events.find(e => e.type === 'lunar-phase');
        return phaseEvent ? phaseEvent.name : undefined;
    }

    private findMoonSign(events: CelestialEvent[]): string | undefined {
        // This is tricky because we only have 'ingress' events, not continuous state.
        // We'll return the ingress sign if available.
        const ingress = events.find(e => e.type === 'ingress' && e.planets?.includes('Moon'));
        if (ingress) {
            // Extract sign from name "Moon enters Sign"
            const parts = ingress.name.split(' ');
            return parts[parts.length - 1];
        }
        return undefined;
    }

    private formatRuleDescription(rule: any, event: CelestialEvent): string {
        return event.name; // Simple for now
    }

    private generateSummary(intention: IntentionCategory, score: number): string {
        if (score >= 90) return 'Excellent timing!';
        if (score >= 75) return 'Very good timing.';
        if (score >= 60) return 'Good timing.';
        return 'Neutral timing.';
    }
}

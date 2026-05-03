import {
    DateTime,
    CelestialEvent,
    TimingWindow,
    IntentionCategory,
    CelestialEventType
} from '@adaptive-astro/shared/types/astrology';
import { TIMING_RULES, IntentionRules } from '../config/timing-rules';
import { CelestialEventsDetector } from './celestial-events-detector';
import { natalChartRepository } from '../database/repositories/natal-chart.repository';
import { PersonalizedAnalyticsService } from './personalized-analytics';
import { createEphemerisCalculator, IEphemerisCalculator } from '../core/ephemeris';

export class OptimalTimingService {
    private personalizedAnalytics: PersonalizedAnalyticsService;

    constructor(
        private detector: CelestialEventsDetector,
        private ephemeris: IEphemerisCalculator
    ) {
        this.personalizedAnalytics = new PersonalizedAnalyticsService(this.ephemeris);
    }

    /**
     * Find optimal timing windows for a specific intention
     */
    async findOptimalWindows(
        intention: IntentionCategory | IntentionRules,
        startDate: DateTime,
        endDate: DateTime,
        limit: number = 20,
        natalChartId?: string
    ): Promise<TimingWindow[]> {
        // 1. Get all events for the period
        const events = await this.detector.getAllEvents(startDate, endDate);

        // 2. Fetch natal chart if provided
        let natalChart = null;
        if (natalChartId) {
            natalChart = await natalChartRepository.findById(natalChartId);
        }

        // 2. Group events by day
        const eventsByDay = this.groupEventsByDay(events);

        // 3. Score each day
        const windows: TimingWindow[] = [];
        const rules = typeof intention === 'string' 
            ? TIMING_RULES[intention] 
            : intention;

        if (!rules) {
            throw new Error(`Invalid intention: ${intention}`);
        }

        const intentionKey = typeof intention === 'string' ? intention : 'custom';

        // 3. Process each day (Parallelize scoring)
        const entries = Array.from(eventsByDay.entries());
        const CHUNK_SIZE = 10;
        
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            const chunk = entries.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async ([dateStr, dayEvents]) => {
                const date = new Date(dateStr);
                const windowDate: DateTime = {
                    date: date,
                    timezone: startDate.timezone,
                    location: startDate.location
                };

                // Personal analysis variables
                let personalScore = 0;
                let personalMatches: string[] = [];
                let personalWarnings: string[] = [];
                let personalSummary = '';

                const personalAnalytics = natalChart 
                    ? await this.personalizedAnalytics.generateDayAnalytics(natalChart, date, startDate.location)
                    : null;

                if (personalAnalytics) {
                    personalScore = personalAnalytics.overallScore;
                    personalSummary = personalAnalytics.personalSummary;
                    personalMatches = personalAnalytics.personalTransits.significantTransits
                        .filter(t => ['trine', 'sextile', 'conjunction'].includes(t.aspectType))
                        .map(t => `${t.transitingPlanet} ${t.aspectType} натальный ${t.natalPlanet}`);
                    personalWarnings = personalAnalytics.personalTransits.significantTransits
                        .filter(t => ['square', 'opposition'].includes(t.aspectType))
                        .map(t => `${t.transitingPlanet} ${t.aspectType} натальный ${t.natalPlanet}`);
                }

                // Inject a synthetic daily moon-phase event so phase-based rules fire on every day,
                // not just exact New/Full/Quarter transitions detected by CelestialEventsDetector.
                let scoringEvents = [...dayEvents];
                try {
                    const lunarData = await this.ephemeris.getLunarDay(windowDate);
                    const hasDailyPhase = dayEvents.some(e => e.type === 'lunar-phase');
                    if (!hasDailyPhase && lunarData?.lunarPhase) {
                        scoringEvents.push({
                            id: `moon-phase-daily-${dateStr}`,
                            type: 'lunar-phase' as CelestialEventType,
                            name: lunarData.lunarPhase,
                            description: `Current moon phase: ${lunarData.lunarPhase}`,
                            date: windowDate,
                            planets: ['Moon', 'Sun'],
                            rarity: 'common',
                            significance: `Moon is ${lunarData.lunarPhase}`,
                        });
                    }
                } catch { /* skip if ephemeris unavailable */ }

                const scoreResult = this.scoreDay(scoringEvents, rules);

                let finalScore = scoreResult.score;
                if (personalAnalytics) {
                    finalScore = Math.round((scoreResult.score * 0.6) + (personalScore * 0.4));
                }

                if (finalScore >= 40) {
                    return {
                        id: `${intentionKey}-${dateStr}`,
                        date: windowDate,
                        score: finalScore,
                        events: dayEvents,
                        summary: personalAnalytics ? personalSummary : this.generateSummary(intentionKey as any, finalScore),
                        suggestions: [...scoreResult.matches, ...personalMatches],
                        warnings: [...scoreResult.warnings, ...personalWarnings],
                        moonPhase: this.findMoonPhase(dayEvents),
                        moonSign: this.findMoonSign(dayEvents),
                        colorPalette: personalAnalytics?.universalEnergy.colorPalette
                    } as TimingWindow;
                }
                return null;
            }));

            windows.push(...chunkResults.filter((w): w is TimingWindow => w !== null));
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

        // Check primary planet
        if (rule.planet && !event.planets?.includes(rule.planet)) return false;

        // Check target planet (for aspects/conjunctions)
        if (rule.targetPlanet && !event.planets?.includes(rule.targetPlanet)) return false;

        // Check phase (for lunar phases)
        if (rule.phase && event.type === 'lunar-phase') {
            return event.name.includes(rule.phase) || (event.description?.includes(rule.phase) ?? false);
        }

        // Check sign (for ingress)
        if (rule.sign && event.type === 'ingress') {
            return event.name.includes(rule.sign) || (event.description?.includes(rule.sign) ?? false);
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

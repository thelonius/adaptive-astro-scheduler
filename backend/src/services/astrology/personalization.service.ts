import { NatalChart } from '../../database/models';
import type {
    PlanetaryHour,
    PlanetName,
} from '@adaptive-astro/shared/types/astrology';

/**
 * Personalization Engine
 * 
 * Logic for scoring astronomical events and periods (like planetary hours)
 * against an individual's natal chart.
 */
export class PersonalizationService {
    
    /**
     * Score a planetary hour for a specific individual
     * Returns a score from 0 to 1.0
     */
    public scorePlanetaryHour(hour: PlanetaryHour, natalChart: NatalChart): number {
        const ruler = hour.ruler as PlanetName;
        let score = 0.5; // Base neutral score

        // 1. Check if ruler is the ASC Ruler (Natal Chart Ruler)
        // Note: This requires knowing the ASC ruler, which is usually found from houses[0].sign
        const ascRuler = this.getPlanetRuler(natalChart.houses[0]?.sign.name);
        if (ruler === ascRuler) {
            score += 0.3;
        }

        // 2. Check if ruler is Natal Sun or Moon
        if (ruler === 'Sun' || ruler === 'Moon') {
            score += 0.15;
        }

        // 3. Check aspects from current ruler position to natal planets
        // (This would require current ephemeris for the ruler at that hour)
        // Simplified: check if the ruler's nature matches the natal chart's strong planets
        
        return Math.min(1.0, score);
    }

    /**
     * Get planetary ruler of a zodiac sign
     */
    private getPlanetRuler(sign: string | undefined): PlanetName | undefined {
        const rulers: Record<string, PlanetName> = {
            'Овен': 'Mars', 'Телец': 'Venus', 'Близнецы': 'Mercury', 'Рак': 'Moon',
            'Лев': 'Sun', 'Дева': 'Mercury', 'Весы': 'Venus', 'Скорпион': 'Pluto',
            'Стрелец': 'Jupiter', 'Козерог': 'Saturn', 'Водолей': 'Uranus', 'Рыбы': 'Neptune'
        };
        return sign ? rulers[sign] : undefined;
    }

    /**
     * Calculate personalized strength for an aspect
     */
    public scoreAspect(aspect: any, _natalChart: NatalChart): number {
        // Aspects to natal Sun, Moon, or ASC are much more significant
        const sensitivePlanets = ['Sun', 'Moon', 'Ascendant'];
        let multiplier = 1.0;

        if (sensitivePlanets.includes(aspect.planet1) || sensitivePlanets.includes(aspect.planet2)) {
            multiplier = 1.5;
        }

        return Math.min(1.0, (aspect.strength || 0.5) * multiplier);
    }
}

export const personalizationService = new PersonalizationService();

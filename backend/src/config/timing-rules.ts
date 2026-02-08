import { TimingRule, IntentionCategory } from '@adaptive-astro/shared/types/astrology';

export interface IntentionRules {
    favorable: TimingRule[];
    unfavorable: TimingRule[];
    moonSigns: {
        favorable: string[];
        unfavorable: string[];
    };
    description: string;
}

export const TIMING_RULES: Record<IntentionCategory, IntentionRules> = {
    'drop-habits': {
        description: 'Best times for releasing, letting go, and breaking patterns',
        favorable: [
            // Lunar Phases: Waning cycle is best for release
            { type: 'lunar-phase', phase: 'Waning', weight: 10 },
            { type: 'lunar-phase', phase: 'Third Quarter', weight: 15 },
            { type: 'lunar-phase', phase: 'New Moon', weight: 8 }, // Final release

            // Saturn Events (Discipline & Structure)
            { type: 'retrograde-end', planet: 'Saturn', weight: 12 }, // Saturn direct = distinct structure
            { type: 'ingress', planet: 'Saturn', weight: 8 }, // New responsibilities

            // Pluto Events (Transformation)
            { type: 'conjunction', planet: 'Pluto', weight: 10 },
            { type: 'retrograde-end', planet: 'Pluto', weight: 8 }
        ],
        unfavorable: [
            // Waxing cycle is for building, not releasing
            { type: 'lunar-phase', phase: 'Waxing', weight: -5 },
            { type: 'lunar-phase', phase: 'First Quarter', weight: -8 },

            // Retrograde starts can meaningful chaos/revisiting
            { type: 'retrograde-start', planet: 'Mercury', weight: -5 },
            { type: 'retrograde-start', planet: 'Mars', weight: -10 } // Loss of drive
        ],
        moonSigns: {
            favorable: ['Scorpio', 'Capricorn', 'Virgo', 'Pisces'],
            unfavorable: ['Taurus', 'Leo', 'Cancer'] // Signs that hold on to things
        }
    },

    'start-project': {
        description: 'Best times for launching new ventures and initiating action',
        favorable: [
            // Lunar Phases: Waxing cycle is strictly for growth
            { type: 'lunar-phase', phase: 'New Moon', weight: 15 }, // Seed planting
            { type: 'lunar-phase', phase: 'Waxing', weight: 10 },
            { type: 'lunar-phase', phase: 'First Quarter', weight: 12 }, // Action point

            // Mars Events (Action & Drive)
            { type: 'ingress', planet: 'Mars', weight: 10 }, // Fresh energy
            { type: 'conjunction', planet: 'Mars', targetPlanet: 'Jupiter', weight: 15 }, // Big action

            // Jupiter Events (Expansion)
            { type: 'retrograde-end', planet: 'Jupiter', weight: 12 }
        ],
        unfavorable: [
            { type: 'lunar-phase', phase: 'Waning', weight: -8 },
            { type: 'lunar-phase', phase: 'Balsamic', weight: -12 }, // Too tired/old
            { type: 'retrograde-start', planet: 'Mercury', weight: -10 }, // Communication errors
            { type: 'retrograde-start', planet: 'Mars', weight: -15 } // Frustrated action
        ],
        moonSigns: {
            favorable: ['Aries', 'Leo', 'Sagittarius', 'Gemini'],
            unfavorable: ['Pisces', 'Cancer', 'Scorpio']
        }
    },

    'make-decision': {
        description: 'Best times for clarity, mental acuity, and important choices',
        favorable: [
            // Mercury Events (Mind & Communication)
            { type: 'retrograde-end', planet: 'Mercury', weight: 15 }, // Clarity returns
            { type: 'ingress', planet: 'Mercury', sign: 'Gemini', weight: 12 },
            { type: 'ingress', planet: 'Mercury', sign: 'Virgo', weight: 12 },
            { type: 'ingress', planet: 'Mercury', sign: 'Aquarius', weight: 10 },

            // Sun-Mercury conjunctions (Cazimi is best, but combustion varies)
            { type: 'conjunction', planet: 'Sun', targetPlanet: 'Mercury', weight: 8 }
        ],
        unfavorable: [
            { type: 'retrograde-start', planet: 'Mercury', weight: -15 }, // Confusion
            { type: 'retrograde-start', planet: 'Neptune', weight: -8 }, // Fog
            { type: 'lunar-phase', phase: 'Full Moon', weight: -5 } // Too emotional
        ],
        moonSigns: {
            favorable: ['Gemini', 'Virgo', 'Libra', 'Aquarius'],
            unfavorable: ['Pisces', 'Cancer', 'Scorpio'] // Too emotional
        }
    },

    'career-change': {
        description: 'Best times for professional shifts and new job opportunities',
        favorable: [
            { type: 'lunar-phase', phase: 'New Moon', weight: 10 },
            { type: 'ingress', planet: 'Sun', weight: 8 },
            { type: 'ingress', planet: 'Jupiter', weight: 12 },
            { type: 'retrograde-end', planet: 'Saturn', weight: 10 }
        ],
        unfavorable: [
            { type: 'retrograde-start', planet: 'Mercury', weight: -10 }, // Contract issues
            { type: 'retrograde-start', planet: 'Venus', weight: -5 } // Financial evaluation
        ],
        moonSigns: {
            favorable: ['Capricorn', 'Virgo', 'Taurus', 'Leo'],
            unfavorable: ['Pisces', 'Cancer']
        }
    },

    'relationship': {
        description: 'Best times for dating, social connection, and partnership',
        favorable: [
            { type: 'lunar-phase', phase: 'Waxing', weight: 8 },
            { type: 'lunar-phase', phase: 'Full Moon', weight: 12 }, // Illumination/Culmination
            { type: 'ingress', planet: 'Venus', weight: 10 },
            { type: 'conjunction', planet: 'Venus', targetPlanet: 'Jupiter', weight: 15 }
        ],
        unfavorable: [
            { type: 'retrograde-start', planet: 'Venus', weight: -15 }, // Re-evaluating love
            { type: 'retrograde-start', planet: 'Mars', weight: -8 } // Conflict
        ],
        moonSigns: {
            favorable: ['Libra', 'Taurus', 'Leo', 'Cancer'],
            unfavorable: ['Capricorn', 'Virgo', 'Scorpio']
        }
    },

    'financial': {
        description: 'Best times for investments, asking for raises, and financial planning',
        favorable: [
            { type: 'lunar-phase', phase: 'Waxing', weight: 8 },
            { type: 'lunar-phase', phase: 'Full Moon', weight: 10 }, // Harvest
            { type: 'ingress', planet: 'Venus', sign: 'Taurus', weight: 15 },
            { type: 'ingress', planet: 'Jupiter', weight: 12 },
            { type: 'conjunction', planet: 'Jupiter', targetPlanet: 'Venus', weight: 15 }
        ],
        unfavorable: [
            { type: 'retrograde-start', planet: 'Venus', weight: -12 },
            { type: 'retrograde-start', planet: 'Mercury', weight: -5 } // Signing contracts
        ],
        moonSigns: {
            favorable: ['Taurus', 'Capricorn', 'Virgo', 'Scorpio'],
            unfavorable: ['Pisces', 'Aries']
        }
    },

    'creative': {
        description: 'Best times for artistic expression and inspiration',
        favorable: [
            { type: 'lunar-phase', phase: 'Full Moon', weight: 12 },
            { type: 'ingress', planet: 'Venus', weight: 10 },
            { type: 'ingress', planet: 'Neptune', weight: 10 },
            { type: 'conjunction', planet: 'Venus', targetPlanet: 'Neptune', weight: 15 }
        ],
        unfavorable: [
            { type: 'retrograde-start', planet: 'Saturn', weight: -5 } // Creative blocks
        ],
        moonSigns: {
            favorable: ['Pisces', 'Leo', 'Libra', 'Taurus'],
            unfavorable: ['Capricorn', 'Virgo'] // Too critical
        }
    },

    'spiritual': {
        description: 'Best times for meditation, rituals, and inner work',
        favorable: [
            { type: 'lunar-phase', phase: 'New Moon', weight: 12 },
            { type: 'lunar-phase', phase: 'Full Moon', weight: 12 },
            { type: 'ingress', planet: 'Neptune', weight: 10 },
            { type: 'ingress', planet: 'Jupiter', sign: 'Pisces', weight: 15 }
        ],
        unfavorable: [
            // Most times are good for *some* spiritual work, but active Mars energy can distract
            { type: 'ingress', planet: 'Mars', sign: 'Aries', weight: -5 }
        ],
        moonSigns: {
            favorable: ['Pisces', 'Scorpio', 'Cancer', 'Sagittarius'],
            unfavorable: ['Gemini', 'Virgo'] // Too mental
        }
    },

    'health-wellness': {
        description: 'Best times for detox, new diets, or medical procedures',
        favorable: [
            // Waning moon best for detox/surgery (less bleeding)
            { type: 'lunar-phase', phase: 'Waning', weight: 10 },

            // Waxing moon best for building strength/supplements
            { type: 'lunar-phase', phase: 'Waxing', weight: 5 },

            { type: 'ingress', planet: 'Sun', sign: 'Virgo', weight: 12 }
        ],
        unfavorable: [
            { type: 'lunar-phase', phase: 'Full Moon', weight: -5 }, // High fluid retention
            { type: 'retrograde-start', planet: 'Mercury', weight: -5 } // Misdiagnosis risk
        ],
        moonSigns: {
            favorable: ['Virgo', 'Taurus', 'Capricorn'],
            unfavorable: [] // Depends heavily on specific procedure
        }
    }
};

/**
 * Advanced Cluster Annotations and Interpretations
 *
 * Provides detailed astrological analysis of planetary clusters (stelliums)
 * and their significance in natal charts and current transits.
 */

import type { CelestialBody, ZodiacSign } from '@adaptive-astro/shared/types';

export interface ClusterAnalysis {
  planets: CelestialBody[];
  centerLongitude: number;
  spread: number; // degrees
  sign: string;
  house?: number;
  clusterType: 'tight' | 'moderate' | 'loose';
  strength: number; // 0-1
  interpretation: ClusterInterpretation;
  themes: string[];
  challenges: string[];
  gifts: string[];
}

export interface ClusterInterpretation {
  title: string;
  description: string;
  personalityTraits: string[];
  lifeThemes: string[];
  spiritualMeaning: string;
  practicalAdvice: string[];
  evolutionaryPurpose: string;
}

/**
 * Analyze planetary cluster and generate detailed interpretation
 */
export function analyzeCluster(planets: CelestialBody[]): ClusterAnalysis {
  if (planets.length < 2) {
    throw new Error('Cluster must contain at least 2 planets');
  }

  // Calculate cluster properties
  const centerLongitude = planets.reduce((sum, p) => sum + p.longitude, 0) / planets.length;
  const spread = Math.max(...planets.map(p => p.longitude)) - Math.min(...planets.map(p => p.longitude));
  const sign = getZodiacSignForLongitude(centerLongitude);

  // Determine cluster type
  const clusterType: 'tight' | 'moderate' | 'loose' =
    spread <= 8 ? 'tight' :
    spread <= 15 ? 'moderate' : 'loose';

  // Calculate strength based on spread and planet count
  const strength = Math.max(0, 1 - (spread / 30)) * (planets.length / 10);

  // Generate interpretation
  const interpretation = generateClusterInterpretation(planets, sign, clusterType);

  return {
    planets,
    centerLongitude,
    spread,
    sign,
    clusterType,
    strength,
    interpretation,
    themes: extractThemes(planets, sign),
    challenges: extractChallenges(planets, sign, clusterType),
    gifts: extractGifts(planets, sign, clusterType)
  };
}

/**
 * Generate detailed interpretation for planetary cluster
 */
function generateClusterInterpretation(
  planets: CelestialBody[],
  sign: string,
  type: 'tight' | 'moderate' | 'loose'
): ClusterInterpretation {
  const planetNames = planets.map(p => p.name).sort();
  const intensityWord = type === 'tight' ? 'intensely' : type === 'moderate' ? 'strongly' : 'notably';

  // Get base interpretation for the sign
  const signMeaning = SIGN_CLUSTER_MEANINGS[sign];

  // Modify based on specific planetary combination
  const planetCombination = getPlanetCombinationMeaning(planetNames);

  return {
    title: `${planetNames.join('/')} Cluster in ${sign}`,
    description: `A ${intensityWord} focused energy pattern where ${planets.length} planets unite in ${sign}, creating a powerful concentration of ${signMeaning.element} energy. This stellium amplifies ${signMeaning.qualities.join(', ')} qualities in your life.`,
    personalityTraits: [
      ...signMeaning.traits,
      ...planetCombination.traits,
      `${intensityWord.charAt(0).toUpperCase() + intensityWord.slice(1)} ${signMeaning.element.toLowerCase()} expression`,
      type === 'tight' ? 'Laser-focused energy' : 'Concentrated but flexible energy'
    ],
    lifeThemes: [
      `${signMeaning.lifeArea} as primary focus`,
      ...planetCombination.themes,
      type === 'tight' ? 'All-or-nothing approach to growth' : 'Integrated personal development'
    ],
    spiritualMeaning: `${signMeaning.spiritualPurpose} This stellium represents a karmic emphasis on mastering ${signMeaning.element.toLowerCase()} lessons and embodying ${sign}'s highest expression.`,
    practicalAdvice: [
      ...signMeaning.advice,
      ...planetCombination.advice,
      `Channel your concentrated ${sign} energy through ${signMeaning.bestOutlets.join(' or ')}`,
      type === 'tight' ? 'Practice moderation to avoid burnout' : 'Balance this focus with other life areas'
    ],
    evolutionaryPurpose: `To master the lessons of ${sign} through the integrated expression of ${planetNames.join(', ')}. This lifetime emphasis suggests significant soul growth through ${signMeaning.evolutionaryTheme}.`
  };
}

/**
 * Extract dominant themes from planetary cluster
 */
function extractThemes(planets: CelestialBody[], sign: string): string[] {
  const themes = new Set<string>();

  // Add sign-based themes
  const signMeaning = SIGN_CLUSTER_MEANINGS[sign];
  signMeaning.themes.forEach(theme => themes.add(theme));

  // Add planet-specific themes
  planets.forEach(planet => {
    const planetThemes = PLANET_THEMES[planet.name] || [];
    planetThemes.forEach(theme => themes.add(theme));
  });

  return Array.from(themes);
}

/**
 * Extract potential challenges
 */
function extractChallenges(planets: CelestialBody[], sign: string, type: 'tight' | 'moderate' | 'loose'): string[] {
  const challenges = [];
  const signMeaning = SIGN_CLUSTER_MEANINGS[sign];

  // Sign-based challenges
  challenges.push(...signMeaning.challenges);

  // Cluster-type specific challenges
  if (type === 'tight') {
    challenges.push(
      `Over-identification with ${sign} qualities`,
      'Difficulty accessing energies outside this cluster',
      'Potential for obsessive behavior in this life area'
    );
  } else if (type === 'moderate') {
    challenges.push(
      `Strong pull toward ${sign} expression`,
      'Need to balance this emphasis with other areas'
    );
  }

  // Planet-specific challenges
  const hasPersonalPlanets = planets.some(p => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(p.name));
  const hasOuterPlanets = planets.some(p => ['Uranus', 'Neptune', 'Pluto'].includes(p.name));

  if (hasPersonalPlanets && hasOuterPlanets) {
    challenges.push('Integrating personal needs with collective/generational energies');
  }

  return challenges;
}

/**
 * Extract gifts and potentials
 */
function extractGifts(planets: CelestialBody[], sign: string, type: 'tight' | 'moderate' | 'loose'): string[] {
  const gifts = [];
  const signMeaning = SIGN_CLUSTER_MEANINGS[sign];

  // Sign-based gifts
  gifts.push(...signMeaning.gifts);

  // Cluster-type specific gifts
  if (type === 'tight') {
    gifts.push(
      `Exceptional mastery of ${sign} qualities`,
      'Powerful creative force when focused',
      'Ability to achieve remarkable results in this area'
    );
  } else if (type === 'moderate') {
    gifts.push(
      `Strong ${sign} capabilities`,
      'Natural talent in this life area',
      'Balanced expression of clustered energies'
    );
  }

  // Multiple planet gifts
  if (planets.length >= 4) {
    gifts.push('Rare concentration of cosmic energies', 'Potential for significant life impact');
  }

  return gifts;
}

/**
 * Get zodiac sign for longitude
 */
function getZodiacSignForLongitude(longitude: number): string {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  const signIndex = Math.floor(longitude / 30);
  return signs[signIndex % 12];
}

/**
 * Get specific meaning for planet combinations
 */
function getPlanetCombinationMeaning(planetNames: string[]): {
  traits: string[];
  themes: string[];
  advice: string[];
} {
  // Check for specific powerful combinations
  const combo = planetNames.sort().join('/');

  if (PLANET_COMBINATIONS[combo]) {
    return PLANET_COMBINATIONS[combo];
  }

  // Default combination meaning
  return {
    traits: [`Multi-layered ${planetNames.join('/')} expression`],
    themes: [`Integration of ${planetNames.join(', ')} energies`],
    advice: [`Work consciously with each planet: ${planetNames.join(', ')}`]
  };
}

/**
 * Sign-based cluster meanings
 */
const SIGN_CLUSTER_MEANINGS: Record<string, {
  element: string;
  qualities: string[];
  traits: string[];
  themes: string[];
  lifeArea: string;
  spiritualPurpose: string;
  evolutionaryTheme: string;
  challenges: string[];
  gifts: string[];
  advice: string[];
  bestOutlets: string[];
}> = {
  'Aries': {
    element: 'Fire',
    qualities: ['initiative', 'leadership', 'courage'],
    traits: ['pioneering spirit', 'natural leader', 'quick to act', 'competitive'],
    themes: ['new beginnings', 'independence', 'self-assertion', 'courage'],
    lifeArea: 'Personal identity and initiative',
    spiritualPurpose: 'The soul seeks to develop individual will and pioneering courage.',
    evolutionaryTheme: 'learning to lead and initiate with wisdom',
    challenges: ['impatience', 'aggression', 'selfishness', 'burnout'],
    gifts: ['natural leadership', 'courage to start new things', 'inspiring energy', 'quick decision-making'],
    advice: ['channel energy constructively', 'practice patience', 'consider others'],
    bestOutlets: ['sports', 'entrepreneurship', 'adventure', 'leadership roles']
  },
  'Taurus': {
    element: 'Earth',
    qualities: ['stability', 'persistence', 'sensuality'],
    traits: ['steady and reliable', 'values security', 'appreciation for beauty', 'practical'],
    themes: ['material security', 'sensual pleasure', 'building lasting value', 'patience'],
    lifeArea: 'Resources, values, and material world',
    spiritualPurpose: 'The soul seeks to create lasting value and appreciate earthly beauty.',
    evolutionaryTheme: 'learning to build and appreciate with non-attachment',
    challenges: ['stubbornness', 'materialism', 'resistance to change', 'possessiveness'],
    gifts: ['ability to build lasting structures', 'appreciation of beauty', 'steady determination', 'practical wisdom'],
    advice: ['embrace necessary changes', 'share your resources', 'find balance in pleasure'],
    bestOutlets: ['art', 'gardening', 'cooking', 'business', 'crafts']
  },
  'Gemini': {
    element: 'Air',
    qualities: ['communication', 'curiosity', 'adaptability'],
    traits: ['quick-minded', 'communicative', 'versatile', 'intellectually curious'],
    themes: ['communication', 'learning', 'connections', 'variety'],
    lifeArea: 'Communication, learning, and local community',
    spiritualPurpose: 'The soul seeks to connect, communicate, and gather diverse knowledge.',
    evolutionaryTheme: 'learning to communicate truth and wisdom',
    challenges: ['scattered energy', 'superficiality', 'inconsistency', 'nervous tension'],
    gifts: ['excellent communication', 'adaptability', 'broad knowledge', 'networking ability'],
    advice: ['focus your diverse interests', 'commit to deeper study', 'practice active listening'],
    bestOutlets: ['writing', 'teaching', 'media', 'networking', 'travel']
  },
  'Cancer': {
    element: 'Water',
    qualities: ['nurturing', 'protection', 'intuition'],
    traits: ['emotionally sensitive', 'nurturing', 'protective', 'intuitive'],
    themes: ['family', 'emotional security', 'nurturing', 'home'],
    lifeArea: 'Home, family, and emotional foundations',
    spiritualPurpose: 'The soul seeks to nurture and create emotional security.',
    evolutionaryTheme: 'learning to care for others while maintaining boundaries',
    challenges: ['moodiness', 'over-protection', 'clinging to past', 'emotional manipulation'],
    gifts: ['strong intuition', 'natural nurturing ability', 'emotional depth', 'protective instincts'],
    advice: ['set healthy boundaries', 'process emotions regularly', 'create supportive environment'],
    bestOutlets: ['parenting', 'counseling', 'home design', 'cooking', 'caregiving']
  },
  'Leo': {
    element: 'Fire',
    qualities: ['creativity', 'self-expression', 'leadership'],
    traits: ['creative', 'confident', 'generous', 'dramatic'],
    themes: ['self-expression', 'creativity', 'recognition', 'leadership'],
    lifeArea: 'Creative self-expression and personal recognition',
    spiritualPurpose: 'The soul seeks to express its unique creative essence.',
    evolutionaryTheme: 'learning to lead and create from the heart',
    challenges: ['ego-centrism', 'need for constant attention', 'pride', 'drama'],
    gifts: ['natural charisma', 'creative talent', 'generous heart', 'inspiring presence'],
    advice: ['share the spotlight', 'use creativity to serve others', 'practice humility'],
    bestOutlets: ['performing arts', 'teaching', 'entertainment', 'children\'s work', 'leadership']
  },
  'Virgo': {
    element: 'Earth',
    qualities: ['service', 'analysis', 'perfection'],
    traits: ['analytical', 'practical', 'service-oriented', 'detail-focused'],
    themes: ['service', 'health', 'work', 'improvement'],
    lifeArea: 'Service, health, and daily work',
    spiritualPurpose: 'The soul seeks to serve others and perfect skills.',
    evolutionaryTheme: 'learning to serve with compassion rather than criticism',
    challenges: ['perfectionism', 'criticism', 'worry', 'self-doubt'],
    gifts: ['attention to detail', 'analytical ability', 'desire to help', 'practical skills'],
    advice: ['accept "good enough"', 'offer constructive help', 'take care of your own needs'],
    bestOutlets: ['healthcare', 'research', 'editing', 'organizing', 'environmental work']
  },
  'Libra': {
    element: 'Air',
    qualities: ['harmony', 'balance', 'relationships'],
    traits: ['diplomatic', 'harmonious', 'partnership-oriented', 'aesthetic'],
    themes: ['relationships', 'balance', 'justice', 'beauty'],
    lifeArea: 'Relationships, partnerships, and harmony',
    spiritualPurpose: 'The soul seeks to create harmony and balance in relationships.',
    evolutionaryTheme: 'learning to maintain self while creating harmony with others',
    challenges: ['indecision', 'people-pleasing', 'avoidance of conflict', 'co-dependency'],
    gifts: ['diplomatic skills', 'aesthetic sense', 'ability to see all sides', 'natural mediator'],
    advice: ['make decisions independently', 'address conflicts directly', 'maintain your identity'],
    bestOutlets: ['counseling', 'law', 'design', 'diplomacy', 'arts']
  },
  'Scorpio': {
    element: 'Water',
    qualities: ['transformation', 'intensity', 'depth'],
    traits: ['intense', 'transformative', 'passionate', 'investigative'],
    themes: ['transformation', 'depth', 'power', 'rebirth'],
    lifeArea: 'Transformation, shared resources, and hidden matters',
    spiritualPurpose: 'The soul seeks deep transformation and regeneration.',
    evolutionaryTheme: 'learning to transform and heal self and others',
    challenges: ['obsession', 'jealousy', 'control issues', 'destructiveness'],
    gifts: ['transformative power', 'psychological insight', 'healing ability', 'resilience'],
    advice: ['use power responsibly', 'embrace positive change', 'practice forgiveness'],
    bestOutlets: ['psychology', 'healing arts', 'research', 'investigation', 'transformation work']
  },
  'Sagittarius': {
    element: 'Fire',
    qualities: ['expansion', 'wisdom', 'adventure'],
    traits: ['philosophical', 'adventurous', 'optimistic', 'truth-seeking'],
    themes: ['higher learning', 'travel', 'philosophy', 'expansion'],
    lifeArea: 'Higher learning, philosophy, and expansion of horizons',
    spiritualPurpose: 'The soul seeks wisdom and expanded understanding.',
    evolutionaryTheme: 'learning to teach and share wisdom with humility',
    challenges: ['dogmatism', 'restlessness', 'overconfidence', 'tactlessness'],
    gifts: ['natural wisdom', 'inspiring vision', 'adventurous spirit', 'teaching ability'],
    advice: ['stay open to new perspectives', 'practice tact', 'ground your visions'],
    bestOutlets: ['teaching', 'travel', 'publishing', 'adventure sports', 'philosophy']
  },
  'Capricorn': {
    element: 'Earth',
    qualities: ['achievement', 'responsibility', 'structure'],
    traits: ['ambitious', 'responsible', 'disciplined', 'practical'],
    themes: ['career', 'authority', 'achievement', 'structure'],
    lifeArea: 'Career, reputation, and social standing',
    spiritualPurpose: 'The soul seeks to build lasting structures and achieve mastery.',
    evolutionaryTheme: 'learning to lead with wisdom and compassion',
    challenges: ['workaholism', 'coldness', 'excessive control', 'pessimism'],
    gifts: ['natural authority', 'organizational ability', 'persistence', 'practical wisdom'],
    advice: ['balance work with relationships', 'delegate appropriately', 'celebrate achievements'],
    bestOutlets: ['business', 'government', 'construction', 'management', 'mentoring']
  },
  'Aquarius': {
    element: 'Air',
    qualities: ['innovation', 'humanity', 'independence'],
    traits: ['innovative', 'humanitarian', 'independent', 'progressive'],
    themes: ['friendship', 'groups', 'innovation', 'humanitarian causes'],
    lifeArea: 'Friendships, groups, and humanitarian ideals',
    spiritualPurpose: 'The soul seeks to innovate and serve humanity.',
    evolutionaryTheme: 'learning to balance individual freedom with group consciousness',
    challenges: ['detachment', 'rebelliousness', 'inflexibility', 'emotional coldness'],
    gifts: ['innovative thinking', 'humanitarian vision', 'group leadership', 'technological aptitude'],
    advice: ['stay emotionally connected', 'work within existing structures when possible', 'apply innovations practically'],
    bestOutlets: ['technology', 'social causes', 'invention', 'group work', 'progressive politics']
  },
  'Pisces': {
    element: 'Water',
    qualities: ['compassion', 'imagination', 'spirituality'],
    traits: ['compassionate', 'imaginative', 'spiritual', 'intuitive'],
    themes: ['spirituality', 'compassion', 'creativity', 'transcendence'],
    lifeArea: 'Spirituality, compassion, and transcendence',
    spiritualPurpose: 'The soul seeks union with the divine and universal compassion.',
    evolutionaryTheme: 'learning to serve with boundaries and practical application',
    challenges: ['escapism', 'boundary issues', 'victim mentality', 'addiction tendencies'],
    gifts: ['deep compassion', 'artistic talent', 'spiritual insight', 'healing presence'],
    advice: ['maintain healthy boundaries', 'ground your visions', 'serve others practically'],
    bestOutlets: ['arts', 'healing', 'spiritual work', 'charity', 'music', 'film']
  }
};

/**
 * Planet themes for cluster analysis
 */
const PLANET_THEMES: Record<string, string[]> = {
  'Sun': ['identity', 'life purpose', 'creativity', 'leadership', 'vitality'],
  'Moon': ['emotions', 'intuition', 'nurturing', 'home', 'past patterns'],
  'Mercury': ['communication', 'thinking', 'learning', 'analysis', 'networking'],
  'Venus': ['love', 'beauty', 'values', 'relationships', 'harmony'],
  'Mars': ['action', 'desire', 'energy', 'competition', 'courage'],
  'Jupiter': ['expansion', 'wisdom', 'growth', 'optimism', 'teaching'],
  'Saturn': ['structure', 'discipline', 'responsibility', 'limitation', 'mastery'],
  'Uranus': ['innovation', 'independence', 'sudden change', 'originality', 'freedom'],
  'Neptune': ['spirituality', 'imagination', 'compassion', 'illusion', 'transcendence'],
  'Pluto': ['transformation', 'power', 'regeneration', 'depth', 'elimination']
};

/**
 * Specific planet combination meanings
 */
const PLANET_COMBINATIONS: Record<string, {
  traits: string[];
  themes: string[];
  advice: string[];
}> = {
  'Sun/Moon': {
    traits: ['integrated conscious and unconscious', 'strong sense of self', 'emotional clarity'],
    themes: ['identity and emotional integration', 'leadership through nurturing', 'balanced masculine/feminine'],
    advice: ['honor both your public and private sides', 'lead with heart', 'trust your intuition']
  },
  'Sun/Mercury': {
    traits: ['strong communication skills', 'clear thinking', 'intellectual confidence'],
    themes: ['communication of identity', 'teaching and learning', 'mental creativity'],
    advice: ['speak your truth clearly', 'use words to inspire', 'think before speaking']
  },
  'Venus/Mars': {
    traits: ['magnetic personality', 'balanced assertiveness', 'passionate relationships'],
    themes: ['love and desire integration', 'creative passion', 'relationship dynamics'],
    advice: ['balance giving and receiving', 'express passion constructively', 'value healthy conflict']
  },
  'Jupiter/Saturn': {
    traits: ['balanced optimism and realism', 'structured growth', 'wise expansion'],
    themes: ['growth through discipline', 'practical wisdom', 'structured success'],
    advice: ['plan your expansions carefully', 'balance hope with realism', 'build slowly but surely']
  },
  'Sun/Moon/Mercury': {
    traits: ['articulate emotional expression', 'integrated personality', 'clear self-communication'],
    themes: ['emotional intelligence', 'authentic communication', 'integrated self-expression'],
    advice: ['speak from your heart', 'communicate your feelings clearly', 'trust your emotional wisdom']
  },
  'Venus/Mars/Jupiter': {
    traits: ['expansive passion', 'generous in relationships', 'optimistic about love'],
    themes: ['abundant relationships', 'creative expansion', 'passionate teaching'],
    advice: ['share your enthusiasm', 'expand through relationships', 'teach through example']
  }
};

/**
 * Get cluster timing analysis
 */
export function getClusterTimingAnalysis(cluster: ClusterAnalysis): {
  currentPhase: string;
  activationPeriods: string[];
  developmentStages: string[];
  recommendations: string[];
} {
  const planetCount = cluster.planets.length;
  const hasSlowPlanets = cluster.planets.some(p => ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(p.name));

  return {
    currentPhase: cluster.clusterType === 'tight' ?
      'Peak expression period' :
      'Integration and development phase',
    activationPeriods: [
      'Major transits to cluster planets',
      'Eclipses in the cluster sign',
      'Saturn returns (ages 29, 58)',
      hasSlowPlanets ? 'Generational planetary returns' : 'Personal planetary cycles'
    ],
    developmentStages: [
      `Ages 0-7: Initial ${cluster.sign} expression`,
      `Ages 7-14: ${cluster.sign} skill development`,
      `Ages 14-21: ${cluster.sign} identity formation`,
      `Ages 21-29: ${cluster.sign} mastery journey`,
      `Ages 29+: Mature ${cluster.sign} expression`
    ],
    recommendations: [
      `Focus on ${cluster.interpretation.lifeThemes.join(' and ')} during major transits`,
      `Use ${cluster.interpretation.practicalAdvice[0]} as your primary development tool`,
      `Watch for overwhelm during ${cluster.sign} emphasis periods`,
      planetCount >= 4 ? 'This is a lifetime theme requiring conscious integration' : 'Develop gradually over time'
    ]
  };
}
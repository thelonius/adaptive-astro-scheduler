import type { ZodiacSign } from '@adaptive-astro/shared/types';

export interface DetailedZodiacInfo {
  name: string;
  englishName: string;
  symbol: string;
  element: string;
  quality: string;
  rulingPlanet: string;
  modernRuler?: string;
  keywords: string[];
  traits: {
    positive: string[];
    challenging: string[];
  };
  bodyParts: string[];
  colors: string[];
  dates: string;
  description: string;
}

export const DETAILED_ZODIAC_INFO: Record<string, DetailedZodiacInfo> = {
  'Овен': {
    name: 'Овен',
    englishName: 'Aries',
    symbol: '♈',
    element: 'Fire',
    quality: 'Cardinal',
    rulingPlanet: 'Mars',
    keywords: ['Leadership', 'Initiative', 'Courage', 'Independence', 'Action'],
    traits: {
      positive: ['Energetic', 'Pioneering', 'Direct', 'Confident', 'Enthusiastic'],
      challenging: ['Impatient', 'Impulsive', 'Self-centered', 'Aggressive', 'Hasty']
    },
    bodyParts: ['Head', 'Face', 'Brain'],
    colors: ['Red', 'Orange', 'Bright colors'],
    dates: 'March 21 - April 19',
    description: 'The Ram - First sign of the zodiac, representing new beginnings and pioneering spirit.'
  },
  'Телец': {
    name: 'Телец',
    englishName: 'Taurus',
    symbol: '♉',
    element: 'Earth',
    quality: 'Fixed',
    rulingPlanet: 'Venus',
    keywords: ['Stability', 'Patience', 'Sensuality', 'Practicality', 'Persistence'],
    traits: {
      positive: ['Reliable', 'Patient', 'Loyal', 'Practical', 'Sensual'],
      challenging: ['Stubborn', 'Possessive', 'Materialistic', 'Lazy', 'Inflexible']
    },
    bodyParts: ['Neck', 'Throat', 'Thyroid'],
    colors: ['Green', 'Pink', 'Earth tones'],
    dates: 'April 20 - May 20',
    description: 'The Bull - Represents stability, beauty, and the material world.'
  },
  'Близнецы': {
    name: 'Близнецы',
    englishName: 'Gemini',
    symbol: '♊',
    element: 'Air',
    quality: 'Mutable',
    rulingPlanet: 'Mercury',
    keywords: ['Communication', 'Curiosity', 'Adaptability', 'Intelligence', 'Versatility'],
    traits: {
      positive: ['Intelligent', 'Communicative', 'Adaptable', 'Witty', 'Curious'],
      challenging: ['Restless', 'Superficial', 'Inconsistent', 'Nervous', 'Indecisive']
    },
    bodyParts: ['Arms', 'Hands', 'Lungs', 'Nervous system'],
    colors: ['Yellow', 'Silver', 'Light colors'],
    dates: 'May 21 - June 20',
    description: 'The Twins - Represents duality, communication, and mental agility.'
  },
  'Рак': {
    name: 'Рак',
    englishName: 'Cancer',
    symbol: '♋',
    element: 'Water',
    quality: 'Cardinal',
    rulingPlanet: 'Moon',
    keywords: ['Nurturing', 'Intuition', 'Home', 'Family', 'Emotion'],
    traits: {
      positive: ['Nurturing', 'Intuitive', 'Protective', 'Empathetic', 'Loyal'],
      challenging: ['Moody', 'Clingy', 'Overly sensitive', 'Pessimistic', 'Manipulative']
    },
    bodyParts: ['Chest', 'Breasts', 'Stomach'],
    colors: ['Silver', 'White', 'Sea green'],
    dates: 'June 21 - July 22',
    description: 'The Crab - Represents emotions, home, family, and intuitive wisdom.'
  },
  'Лев': {
    name: 'Лев',
    englishName: 'Leo',
    symbol: '♌',
    element: 'Fire',
    quality: 'Fixed',
    rulingPlanet: 'Sun',
    keywords: ['Creativity', 'Leadership', 'Drama', 'Confidence', 'Generosity'],
    traits: {
      positive: ['Confident', 'Generous', 'Creative', 'Warm-hearted', 'Dramatic'],
      challenging: ['Arrogant', 'Vain', 'Domineering', 'Attention-seeking', 'Stubborn']
    },
    bodyParts: ['Heart', 'Upper back', 'Spine'],
    colors: ['Gold', 'Orange', 'Yellow'],
    dates: 'July 23 - August 22',
    description: 'The Lion - Represents self-expression, creativity, and royal bearing.'
  },
  'Дева': {
    name: 'Дева',
    englishName: 'Virgo',
    symbol: '♍',
    element: 'Earth',
    quality: 'Mutable',
    rulingPlanet: 'Mercury',
    keywords: ['Service', 'Analysis', 'Perfection', 'Health', 'Efficiency'],
    traits: {
      positive: ['Analytical', 'Helpful', 'Reliable', 'Precise', 'Modest'],
      challenging: ['Critical', 'Perfectionist', 'Worrying', 'Fussy', 'Overly practical']
    },
    bodyParts: ['Digestive system', 'Intestines', 'Spleen'],
    colors: ['Navy blue', 'Grey', 'Brown'],
    dates: 'August 23 - September 22',
    description: 'The Virgin - Represents service, analysis, and attention to detail.'
  },
  'Весы': {
    name: 'Весы',
    englishName: 'Libra',
    symbol: '♎',
    element: 'Air',
    quality: 'Cardinal',
    rulingPlanet: 'Venus',
    keywords: ['Balance', 'Harmony', 'Justice', 'Partnership', 'Beauty'],
    traits: {
      positive: ['Diplomatic', 'Fair', 'Social', 'Peaceful', 'Charming'],
      challenging: ['Indecisive', 'Superficial', 'Vain', 'Unreliable', 'Avoidant']
    },
    bodyParts: ['Kidneys', 'Lower back', 'Skin'],
    colors: ['Pink', 'Light blue', 'Pastels'],
    dates: 'September 23 - October 22',
    description: 'The Scales - Represents balance, justice, and harmonious relationships.'
  },
  'Скорпион': {
    name: 'Скорпион',
    englishName: 'Scorpio',
    symbol: '♏',
    element: 'Water',
    quality: 'Fixed',
    rulingPlanet: 'Pluto',
    modernRuler: 'Pluto (traditional: Mars)',
    keywords: ['Transformation', 'Intensity', 'Mystery', 'Power', 'Regeneration'],
    traits: {
      positive: ['Intense', 'Passionate', 'Determined', 'Intuitive', 'Magnetic'],
      challenging: ['Jealous', 'Secretive', 'Obsessive', 'Vengeful', 'Suspicious']
    },
    bodyParts: ['Reproductive organs', 'Bladder', 'Rectum'],
    colors: ['Deep red', 'Black', 'Maroon'],
    dates: 'October 23 - November 21',
    description: 'The Scorpion - Represents transformation, depth, and hidden mysteries.'
  },
  'Стрелец': {
    name: 'Стрелец',
    englishName: 'Sagittarius',
    symbol: '♐',
    element: 'Fire',
    quality: 'Mutable',
    rulingPlanet: 'Jupiter',
    keywords: ['Adventure', 'Philosophy', 'Expansion', 'Freedom', 'Optimism'],
    traits: {
      positive: ['Optimistic', 'Adventurous', 'Honest', 'Philosophical', 'Freedom-loving'],
      challenging: ['Restless', 'Impatient', 'Tactless', 'Careless', 'Overconfident']
    },
    bodyParts: ['Hips', 'Thighs', 'Liver'],
    colors: ['Purple', 'Turquoise', 'Deep blue'],
    dates: 'November 22 - December 21',
    description: 'The Archer - Represents higher learning, adventure, and expansion of horizons.'
  },
  'Козерог': {
    name: 'Козерог',
    englishName: 'Capricorn',
    symbol: '♑',
    element: 'Earth',
    quality: 'Cardinal',
    rulingPlanet: 'Saturn',
    keywords: ['Ambition', 'Structure', 'Discipline', 'Authority', 'Achievement'],
    traits: {
      positive: ['Ambitious', 'Disciplined', 'Responsible', 'Patient', 'Practical'],
      challenging: ['Pessimistic', 'Rigid', 'Materialistic', 'Unforgiving', 'Inhibited']
    },
    bodyParts: ['Knees', 'Bones', 'Teeth', 'Skin'],
    colors: ['Black', 'Dark green', 'Brown'],
    dates: 'December 22 - January 19',
    description: 'The Goat - Represents ambition, structure, and climbing to great heights.'
  },
  'Водолей': {
    name: 'Водолей',
    englishName: 'Aquarius',
    symbol: '♒',
    element: 'Air',
    quality: 'Fixed',
    rulingPlanet: 'Uranus',
    modernRuler: 'Uranus (traditional: Saturn)',
    keywords: ['Innovation', 'Friendship', 'Humanity', 'Freedom', 'Progress'],
    traits: {
      positive: ['Independent', 'Humanitarian', 'Original', 'Friendly', 'Progressive'],
      challenging: ['Detached', 'Rebellious', 'Unpredictable', 'Aloof', 'Stubborn']
    },
    bodyParts: ['Ankles', 'Circulatory system', 'Shins'],
    colors: ['Electric blue', 'Silver', 'Neon colors'],
    dates: 'January 20 - February 18',
    description: 'The Water Bearer - Represents innovation, humanitarian ideals, and group consciousness.'
  },
  'Рыбы': {
    name: 'Рыбы',
    englishName: 'Pisces',
    symbol: '♓',
    element: 'Water',
    quality: 'Mutable',
    rulingPlanet: 'Neptune',
    modernRuler: 'Neptune (traditional: Jupiter)',
    keywords: ['Compassion', 'Spirituality', 'Imagination', 'Intuition', 'Sacrifice'],
    traits: {
      positive: ['Compassionate', 'Intuitive', 'Artistic', 'Gentle', 'Spiritual'],
      challenging: ['Escapist', 'Overly emotional', 'Indecisive', 'Victim mentality', 'Unrealistic']
    },
    bodyParts: ['Feet', 'Lymphatic system', 'Pineal gland'],
    colors: ['Sea green', 'Lavender', 'Silver'],
    dates: 'February 19 - March 20',
    description: 'The Fish - Represents spirituality, compassion, and connection to the divine.'
  }
};

// Helper function to get detailed info by sign name
export const getDetailedZodiacInfo = (signName: string): DetailedZodiacInfo | null => {
  return DETAILED_ZODIAC_INFO[signName] || null;
};

// Helper function to get info by English name
export const getDetailedZodiacInfoByEnglish = (englishName: string): DetailedZodiacInfo | null => {
  const entry = Object.values(DETAILED_ZODIAC_INFO).find(
    info => info.englishName.toLowerCase() === englishName.toLowerCase()
  );
  return entry || null;
};
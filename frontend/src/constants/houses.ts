/**
 * Astrological Houses Constants and Meanings
 *
 * Each house represents different areas of life in astrology
 */

export interface HouseMeaning {
  number: number;
  title: string;
  keywords: string[];
  description: string;
  themes: string[];
}

export const HOUSE_MEANINGS: Record<number, HouseMeaning> = {
  1: {
    number: 1,
    title: "House of Self",
    keywords: ["Identity", "Appearance", "First Impressions", "Personality"],
    description: "The Ascendant. Your outward appearance, personality, and how others first perceive you.",
    themes: ["Self-image", "Physical body", "New beginnings", "Personal identity", "Approach to life"]
  },
  2: {
    number: 2,
    title: "House of Values",
    keywords: ["Money", "Possessions", "Self-Worth", "Values"],
    description: "Your relationship with material possessions, money, and personal values.",
    themes: ["Personal resources", "Financial security", "Self-esteem", "Material comfort", "Natural talents"]
  },
  3: {
    number: 3,
    title: "House of Communication",
    keywords: ["Communication", "Learning", "Siblings", "Short Trips"],
    description: "Communication style, learning, siblings, and short-distance travel.",
    themes: ["Local community", "Early education", "Writing", "Daily routines", "Mental agility"]
  },
  4: {
    number: 4,
    title: "House of Home & Family",
    keywords: ["Home", "Family", "Roots", "Foundation"],
    description: "Home, family background, roots, and emotional foundation. The IC (Imum Coeli).",
    themes: ["Childhood", "Parents", "Private life", "Real estate", "Inner security", "Ancestry"]
  },
  5: {
    number: 5,
    title: "House of Creativity",
    keywords: ["Creativity", "Romance", "Children", "Entertainment"],
    description: "Creative expression, romance, children, and recreational activities.",
    themes: ["Self-expression", "Love affairs", "Artistic pursuits", "Gambling", "Pleasure", "Speculation"]
  },
  6: {
    number: 6,
    title: "House of Health & Service",
    keywords: ["Work", "Health", "Service", "Daily Routine"],
    description: "Daily work, health, service to others, and daily routines.",
    themes: ["Employment", "Wellness", "Pets", "Organization", "Duty", "Practical skills"]
  },
  7: {
    number: 7,
    title: "House of Partnerships",
    keywords: ["Marriage", "Partnerships", "Open Enemies", "Cooperation"],
    description: "Marriage, partnerships, open enemies, and one-on-one relationships. The Descendant.",
    themes: ["Committed relationships", "Business partnerships", "Legal matters", "Contracts", "Balance"]
  },
  8: {
    number: 8,
    title: "House of Transformation",
    keywords: ["Transformation", "Shared Resources", "Death", "Rebirth"],
    description: "Shared resources, transformation, death and rebirth, occult matters.",
    themes: ["Joint finances", "Inheritance", "Taxes", "Intimacy", "Psychology", "Hidden knowledge"]
  },
  9: {
    number: 9,
    title: "House of Philosophy",
    keywords: ["Higher Learning", "Travel", "Philosophy", "Religion"],
    description: "Higher education, long-distance travel, philosophy, and spiritual beliefs.",
    themes: ["Universities", "Foreign cultures", "Publishing", "Legal system", "Wisdom", "Expansion"]
  },
  10: {
    number: 10,
    title: "House of Career",
    keywords: ["Career", "Reputation", "Authority", "Public Image"],
    description: "Career, reputation, public image, and relationship with authority. The Midheaven (MC).",
    themes: ["Professional goals", "Social status", "Achievement", "Recognition", "Government"]
  },
  11: {
    number: 11,
    title: "House of Hopes & Dreams",
    keywords: ["Friends", "Groups", "Hopes", "Social Causes"],
    description: "Friendships, group activities, hopes, wishes, and humanitarian causes.",
    themes: ["Social networks", "Organizations", "Future goals", "Technology", "Collective ideals"]
  },
  12: {
    number: 12,
    title: "House of Spirituality",
    keywords: ["Subconscious", "Spirituality", "Hidden Things", "Sacrifice"],
    description: "Subconscious mind, spirituality, hidden enemies, and self-undoing.",
    themes: ["Dreams", "Meditation", "Charity", "Hospitals", "Prisons", "Secret knowledge", "Karma"]
  }
};

/**
 * Get house meaning by number
 */
export const getHouseMeaning = (houseNumber: number): HouseMeaning | null => {
  return HOUSE_MEANINGS[houseNumber] || null;
};

/**
 * Get short house description for tooltips
 */
export const getHouseTooltipText = (houseNumber: number): string => {
  const meaning = getHouseMeaning(houseNumber);
  if (!meaning) return `House ${houseNumber}`;

  return `House ${houseNumber}: ${meaning.title}\n${meaning.description}\nKey themes: ${meaning.keywords.join(", ")}`;
};

/**
 * House categories for styling
 */
export const HOUSE_CATEGORIES = {
  angular: [1, 4, 7, 10], // Most important houses
  succedent: [2, 5, 8, 11], // Houses of resources and fixed matters
  cadent: [3, 6, 9, 12] // Houses of transition and adaptation
};

/**
 * Check if house is angular (most important)
 */
export const isAngularHouse = (houseNumber: number): boolean => {
  return HOUSE_CATEGORIES.angular.includes(houseNumber);
};
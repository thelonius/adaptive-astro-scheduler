import type { CelestialBody, Aspect } from '@adaptive-astro/shared/types';
import type { PlanetPosition, AspectLine, ColorScheme } from './types';

/**
 * Convert zodiac longitude (0-360°) to SVG coordinates
 * In astrology, 0° is at Aries (right side), moves counter-clockwise
 * In SVG, 0° is at the right, moves clockwise
 * We need to flip the direction and rotate to align Aries at the left (9 o'clock)
 */
export function longitudeToAngle(longitude: number): number {
  // Aries starts at 0°, but we want it at the left (270° in SVG)
  // Convert astrology degrees to SVG degrees
  return 270 - longitude;
}

/**
 * Convert polar coordinates to Cartesian (SVG)
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Calculate planet positions on the wheel
 */
export function calculatePlanetPositions(
  planets: CelestialBody[],
  centerX: number,
  centerY: number,
  radius: number
): PlanetPosition[] {
  return planets.map(planet => {
    const angle = longitudeToAngle(planet.longitude);
    const { x, y } = polarToCartesian(centerX, centerY, radius, angle);

    return {
      planet,
      x,
      y,
      angle,
    };
  });
}

/**
 * Calculate aspect lines between planets
 */
export function calculateAspectLines(
  aspects: Aspect[],
  planetPositions: PlanetPosition[],
  colorScheme: ColorScheme
): AspectLine[] {
  console.log('Calculating aspect lines for:', aspects.length, 'aspects');
  
  return aspects
    .filter(aspect => aspect.orb <= 8 && aspect.type) // Show aspects within 8 degrees orb
    .map(aspect => {
      const from = planetPositions.find(p => p.planet.name === aspect.body1.name);
      const to = planetPositions.find(p => p.planet.name === aspect.body2.name);

      if (!from || !to) {
        console.warn('Planet not found for aspect:', aspect);
        return null;
      }

      if (!aspect.type) {
        console.warn('Aspect missing type:', aspect);
        return null;
      }

      // Calculate strength based on orb (closer = stronger)
      const maxOrb = 8; // Default max orb
      const strength = 1 - Math.min(aspect.orb / maxOrb, 1);

      console.log(`Creating aspect line: ${aspect.body1.name} ${aspect.type} ${aspect.body2.name} (orb: ${aspect.orb}°)`);

      return {
        aspect,
        from,
        to,
        color: colorScheme.aspects[aspect.type] || '#888',
        strength,
      };
    })
    .filter((line): line is AspectLine => line !== null);
}

/**
 * Get zodiac sign data with positions
 */
export function getZodiacSignPositions(size: number) {
  const signs = [
    { name: 'Овен', symbol: '♈', angle: 0 },
    { name: 'Телец', symbol: '♉', angle: 30 },
    { name: 'Близнецы', symbol: '♊', angle: 60 },
    { name: 'Рак', symbol: '♋', angle: 90 },
    { name: 'Лев', symbol: '♌', angle: 120 },
    { name: 'Дева', symbol: '♍', angle: 150 },
    { name: 'Весы', symbol: '♎', angle: 180 },
    { name: 'Скорпион', symbol: '♏', angle: 210 },
    { name: 'Стрелец', symbol: '♐', angle: 240 },
    { name: 'Козерог', symbol: '♑', angle: 270 },
    { name: 'Водолей', symbol: '♒', angle: 300 },
    { name: 'Рыбы', symbol: '♓', angle: 330 },
  ];

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.42; // Position signs at outer ring

  return signs.map(sign => {
    const svgAngle = longitudeToAngle(sign.angle);
    const { x, y } = polarToCartesian(centerX, centerY, radius, svgAngle);

    return {
      ...sign,
      x,
      y,
      svgAngle,
    };
  });
}

/**
 * Generate degree marks around the wheel
 */
export function generateDegreeMarks(size: number, interval: number = 5) {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.48;
  const innerRadius = size * 0.46;
  const marks = [];

  for (let degree = 0; degree < 360; degree += interval) {
    const svgAngle = longitudeToAngle(degree);
    const outer = polarToCartesian(centerX, centerY, outerRadius, svgAngle);
    const inner = polarToCartesian(centerX, centerY, innerRadius, svgAngle);

    // Major marks every 30° (sign boundaries)
    const isMajor = degree % 30 === 0;

    marks.push({
      degree,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      isMajor,
    });
  }

  return marks;
}

/**
 * Format planet degrees within sign
 */
export function formatPlanetDegree(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const degreeInSign = Math.floor(longitude % 30);
  const minutes = Math.floor((longitude % 1) * 60);

  const signs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

  return `${degreeInSign}°${minutes}' ${signs[signIndex]}`;
}

/**
 * Calculate aspect angle between two planets
 */
export function calculateAspectAngle(long1: number, long2: number): number {
  let angle = Math.abs(long1 - long2);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Detect aspect type based on angle
 */
export function detectAspectType(angle: number, orb: number = 8): string | null {
  const aspects = [
    { type: 'conjunction', angle: 0, orb },
    { type: 'sextile', angle: 60, orb },
    { type: 'square', angle: 90, orb },
    { type: 'trine', angle: 120, orb },
    { type: 'quincunx', angle: 150, orb },
    { type: 'opposition', angle: 180, orb },
  ];

  for (const aspect of aspects) {
    if (Math.abs(angle - aspect.angle) <= aspect.orb) {
      return aspect.type;
    }
  }

  return null;
}

/**
 * Get planet symbol
 */
export function getPlanetSymbol(name: string): string {
  const symbols: Record<string, string> = {
    Sun: '☉',
    Moon: '☽',
    Mercury: '☿',
    Venus: '♀',
    Mars: '♂',
    Jupiter: '♃',
    Saturn: '♄',
    Uranus: '♅',
    Neptune: '♆',
    Pluto: '♇',
  };

  return symbols[name] || name.charAt(0);
}

/**
 * Sort planets by orbital distance (inner to outer)
 */
export function sortPlanetsByOrbit(planets: CelestialBody[]): CelestialBody[] {
  const order = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  return [...planets].sort((a, b) => {
    return order.indexOf(a.name) - order.indexOf(b.name);
  });
}

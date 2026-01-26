import type { CelestialBody, Aspect } from '@adaptive-astro/shared/types';
import type { PlanetPosition, AspectLine, ColorScheme, SmartLabelPosition } from './types';

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
 * Find planets that are clustered together (within threshold degrees)
 */
export function findPlanetClusters(
  planets: CelestialBody[],
  threshold: number = 15
): CelestialBody[][] {
  if (planets.length <= 1) return planets.map(p => [p]);

  // Sort planets by longitude for clustering analysis
  const sortedPlanets = [...planets].sort((a, b) => a.longitude - b.longitude);
  const clusters: CelestialBody[][] = [];
  let currentCluster: CelestialBody[] = [sortedPlanets[0]];

  for (let i = 1; i < sortedPlanets.length; i++) {
    const currentPlanet = sortedPlanets[i];
    const lastInCluster = currentCluster[currentCluster.length - 1];

    // Calculate angular distance (handle zodiac wrap-around)
    let distance = currentPlanet.longitude - lastInCluster.longitude;
    if (distance > 180) distance = 360 - distance;
    if (distance < -180) distance = 360 + distance;
    distance = Math.abs(distance);

    if (distance <= threshold) {
      currentCluster.push(currentPlanet);
    } else {
      clusters.push(currentCluster);
      currentCluster = [currentPlanet];
    }
  }

  // Add the last cluster
  clusters.push(currentCluster);

  // Check for wrap-around clustering (last planet near first planet)
  if (clusters.length > 1) {
    const firstCluster = clusters[0];
    const lastCluster = clusters[clusters.length - 1];
    const firstPlanet = firstCluster[0];
    const lastPlanet = lastCluster[lastCluster.length - 1];

    // Calculate wrap-around distance
    const wrapDistance = Math.min(
      Math.abs(firstPlanet.longitude - lastPlanet.longitude),
      360 - Math.abs(firstPlanet.longitude - lastPlanet.longitude)
    );

    if (wrapDistance <= threshold) {
      // Merge first and last clusters
      clusters[0] = [...lastCluster, ...firstCluster];
      clusters.pop(); // Remove the last cluster
    }
  }

  return clusters;
}

/**
 * Calculate combined label position for a cluster of planets
 */
export function calculateCombinedClusterLabel(
  cluster: PlanetPosition[],
  centerX: number,
  centerY: number
): {
  x: number;
  y: number;
  planets: PlanetPosition[];
  clusterCenter: number;
} {
  if (cluster.length === 0) {
    throw new Error('Cluster cannot be empty');
  }

  // Calculate cluster center longitude
  const clusterCenter = cluster.reduce((sum, pos) => sum + (pos.originalLongitude || pos.planet.longitude), 0) / cluster.length;

  // Position label at optimal distance from cluster
  const labelRadius = 65; // Distance from center
  const labelAngle = (longitudeToAngle(clusterCenter) - 90) * Math.PI / 180;
  const labelX = centerX + labelRadius * Math.cos(labelAngle);
  const labelY = centerY + labelRadius * Math.sin(labelAngle);

  return {
    x: labelX,
    y: labelY,
    planets: cluster,
    clusterCenter
  };
}

/**
 * Group planet positions by cluster for combined labeling
 */
export function groupPlanetsByCluster(
  positions: PlanetPosition[]
): {
  clusteredGroups: PlanetPosition[][];
  individualPlanets: PlanetPosition[];
} {
  const clusteredGroups: PlanetPosition[][] = [];
  const individualPlanets: PlanetPosition[] = [];
  const processed = new Set<string>();

  for (const position of positions) {
    if (processed.has(position.planet.name)) continue;

    if (position.clustered && position.clusterIndex !== undefined) {
      // Find all planets in the same cluster
      const clusterGroup = positions.filter(
        p => p.clustered && p.clusterIndex === position.clusterIndex
      );

      if (clusterGroup.length > 1) {
        clusteredGroups.push(clusterGroup);
        clusterGroup.forEach(p => processed.add(p.planet.name));
      } else {
        individualPlanets.push(position);
        processed.add(position.planet.name);
      }
    } else {
      individualPlanets.push(position);
      processed.add(position.planet.name);
    }
  }

  return { clusteredGroups, individualPlanets };
}

/**
 * Generate leader line path for labels that were moved
 */
export function generateLeaderLine(
  planetX: number,
  planetY: number,
  labelX: number,
  labelY: number,
  style: 'straight' | 'curved' = 'curved'
): string {
  if (style === 'straight') {
    return `M ${planetX + 12},${planetY} L ${labelX - 8},${labelY}`;
  }

  // Curved leader line
  const midX = (planetX + labelX) / 2;
  const midY = (planetY + labelY) / 2;

  // Add some curve by offsetting the middle point
  const dx = labelX - planetX;
  const dy = labelY - planetY;
  const perpX = -dy * 0.2; // Perpendicular offset for curve
  const perpY = dx * 0.2;

  return `M ${planetX + 8},${planetY} Q ${midX + perpX},${midY + perpY} ${labelX - 8},${labelY}`;
}

/**
 * Calculate clustered planet positions with radial offsetting and smart labeling
 */
export function calculateClusteredPlanetPositions(
  cluster: CelestialBody[],
  centerX: number,
  centerY: number,
  baseRadius: number,
  clusterIndex: number
): PlanetPosition[] {
  if (cluster.length === 1) {
    // Single planet - use normal positioning
    const planet = cluster[0];
    const angle = longitudeToAngle(planet.longitude);
    const { x, y } = polarToCartesian(centerX, centerY, baseRadius, angle);
    return [{
      planet,
      x,
      y,
      angle,
      clustered: false,
      clusterIndex: 0
    }];
  }

  // Multiple planets - apply radial offsetting
  const positions: PlanetPosition[] = [];
  const clusterCenter = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
  const radiusStep = 15; // Pixels between radial layers
  const angleSpread = Math.min(8, 20 / cluster.length); // Smaller spread for more planets

  cluster.forEach((planet, index) => {
    // Stagger planets in radial layers (every other planet in different layer)
    const layerIndex = Math.floor(index / 2);
    const radialOffset = layerIndex * radiusStep * (index % 2 === 0 ? 1 : -1);
    const planetRadius = baseRadius + radialOffset;

    // Distribute planets in a small arc around cluster center
    const angularOffset = (index - (cluster.length - 1) / 2) * angleSpread;
    const adjustedLongitude = clusterCenter + angularOffset;
    const angle = longitudeToAngle(adjustedLongitude);
    const { x, y } = polarToCartesian(centerX, centerY, planetRadius, angle);

    positions.push({
      planet,
      x,
      y,
      angle,
      clustered: true,
      clusterIndex,
      originalLongitude: planet.longitude
    });
  });

  return positions;
}

/**
 * Calculate planet positions on the wheel with clustering support
 */
export function calculatePlanetPositions(
  planets: CelestialBody[],
  centerX: number,
  centerY: number,
  radius: number
): PlanetPosition[] {
  // Find planet clusters
  const clusters = findPlanetClusters(planets, 15);
  const allPositions: PlanetPosition[] = [];

  clusters.forEach((cluster, clusterIndex) => {
    const clusterPositions = calculateClusteredPlanetPositions(
      cluster,
      centerX,
      centerY,
      radius,
      clusterIndex
    );
    allPositions.push(...clusterPositions);
  });

  return allPositions;
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
  console.log('Available planet positions:', planetPositions.map(p => p.planet.name));
  console.log('First aspect example:', aspects[0]);

  const filteredAspects = aspects.filter(aspect => aspect.orb <= 8); // Temporarily ignore type requirement
  console.log('Aspects after orb/type filter:', filteredAspects.length);

  return filteredAspects
    .map(aspect => {
      console.log(`Looking for planets: "${aspect.body1.name}" and "${aspect.body2.name}"`);
      const from = planetPositions.find(p => p.planet.name === aspect.body1.name);
      const to = planetPositions.find(p => p.planet.name === aspect.body2.name);

      if (!from) {
        console.warn('Planet not found for aspect body1:', aspect.body1.name, 'Available:', planetPositions.map(p => p.planet.name));
        return null;
      }

      if (!to) {
        console.warn('Planet not found for aspect body2:', aspect.body2.name, 'Available:', planetPositions.map(p => p.planet.name));
        return null;
      }

      // Handle missing aspect type
      const aspectType = aspect.type || 'conjunction'; // Default to conjunction
      const aspectColor = colorScheme.aspects[aspectType] || colorScheme.aspects.conjunction || '#888';

      // Calculate strength based on orb (closer = stronger)
      const maxOrb = 8; // Default max orb
      const strength = 1 - Math.min(aspect.orb / maxOrb, 1);

      console.log(`✓ Creating aspect line: ${aspect.body1.name} ${aspectType} ${aspect.body2.name} (orb: ${aspect.orb}°)`);

      return {
        aspect: { ...aspect, type: aspectType }, // Ensure type is set
        from,
        to,
        color: aspectColor,
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

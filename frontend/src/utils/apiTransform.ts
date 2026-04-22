import type {
  CelestialBody,
  Aspect,
  House,
  PlanetApiData,
  AspectApiData,
  HouseApiData,
} from '@adaptive-astro/shared/types';
import { ZODIAC_SIGNS } from '@adaptive-astro/shared/constants/zodiac';

/**
 * Transform API planet data to frontend CelestialBody format
 */
export function transformPlanetData(apiPlanet: PlanetApiData): CelestialBody {
  // Find zodiac sign by name
  const zodiacSign = ZODIAC_SIGNS.find(sign =>
    sign.name === apiPlanet.zodiacSign ||
    sign.symbol === apiPlanet.zodiacSign
  );

  if (!zodiacSign) {
    console.warn(`Unknown zodiac sign: ${apiPlanet.zodiacSign}. Using fallback.`);
  }

  return {
    name: apiPlanet.name as any, // Cast to PlanetName
    longitude: apiPlanet.longitude,
    latitude: apiPlanet.latitude,
    zodiacSign: zodiacSign || ZODIAC_SIGNS[0], // Use first sign as fallback
    speed: apiPlanet.speed,
    isRetrograde: apiPlanet.isRetrograde,
    distanceAU: apiPlanet.distanceAU,
  };
}

/**
 * Transform API aspect data to frontend Aspect format
 */
export function transformAspectData(
  apiAspect: AspectApiData,
  planetsMap: Map<string, CelestialBody>
): Aspect | null {
  const body1 = planetsMap.get(apiAspect.planet1);
  const body2 = planetsMap.get(apiAspect.planet2);

  if (!body1 || !body2) {
    console.warn(`Cannot find planets for aspect: ${apiAspect.planet1} - ${apiAspect.planet2}`);
    return null;
  }

  return {
    body1,
    body2,
    type: (apiAspect.type ?? apiAspect.aspect_type as any) || 'conjunction',
    angle: apiAspect.angle,
    orb: apiAspect.orb,
    isExact: apiAspect.orb <= 1, // Consider exact if within 1 degree
    interpretation: apiAspect.interpretation,
  };
}

/**
 * Transform API house data to frontend House format
 */
export function transformHouseData(apiHouse: HouseApiData): House {
  // Find zodiac sign for the house cusp
  const zodiacSign = ZODIAC_SIGNS.find(sign =>
    sign.name === apiHouse.zodiacSign ||
    sign.symbol === apiHouse.zodiacSign
  );

  return {
    number: apiHouse.number as any, // Cast to house number type
    cusp: apiHouse.cusp,
    sign: zodiacSign || ZODIAC_SIGNS[0], // Use first sign as fallback
  };
}
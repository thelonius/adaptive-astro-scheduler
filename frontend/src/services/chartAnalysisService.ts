import axios from 'axios';
import type { CelestialBody, Aspect, House } from '@adaptive-astro/shared/types';
import { API_BASE_URL } from '../config';
import { chartService } from './chartService';
import type { SavedChart } from '../types/chart';
import { transformPlanetData, transformAspectData, transformHouseData } from '../utils/apiTransform';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import { ZODIAC_SIGNS } from '@adaptive-astro/shared/constants/zodiac';

export interface SynastryAspect {
  chart_a_point: string;
  chart_b_point: string;
  aspect: string;
  angle: number;
  orb: number;
  nature: string;
  symbol: string;
  category: string;
}

export interface SynastryResult {
  chart_a_meta: { datetime_utc: string; latitude: number; longitude: number; house_system: string };
  chart_b_meta: { datetime_utc: string; latitude: number; longitude: number; house_system: string };
  inter_aspects: SynastryAspect[];
}

export interface ProgressionsResult {
  meta: {
    birth_dt: string;
    target_dt: string;
    progressed_dt: string;
    age_years: number;
  };
  planets: Record<string, number>;
}

export interface DraconicPlanet {
  longitude: number;
  sign: string;
  sign_id: number;
  sign_degree: number;
  is_retrograde: boolean;
  house?: number | null;
}

export interface DraconicResult {
  meta: {
    datetime_utc: string;
    latitude: number;
    longitude: number;
    house_system: string;
    chart_type: string;
    north_node_tropical: number;
  };
  north_node_longitude: number;
  angles: { ascendant: number; mc: number; vertex: number };
  houses: number[];
  planets: Record<string, DraconicPlanet>;
  aspects: Array<{
    planet_a: string;
    planet_b: string;
    aspect: string;
    angle: number;
    orb: number;
    nature: string;
    symbol: string;
    category: string;
  }>;
}

export interface GateActivation {
  gate: number;
  line: number;
  center: string;
  longitude: number;
}

export interface HumanDesignResult {
  meta: {
    birth_datetime_utc: string;
    design_datetime_utc: string;
    design_solar_arc_degrees: number;
    latitude: number;
    longitude: number;
  };
  type: string;
  profile: string;
  authority: string;
  strategy: string;
  definition: string;
  defined_centers: Array<{ id: string; label: string }>;
  defined_channels: string[];
  active_gates: number[];
  personality: Record<string, GateActivation>;
  design: Record<string, GateActivation>;
}

function savedChartToPayload(chart: SavedChart) {
  return {
    birthDate: chart.date,
    birthTime: chart.time.length === 5 ? `${chart.time}:00` : chart.time,
    latitude: chart.location.latitude,
    longitude: chart.location.longitude,
    timezone: chart.location.timezone,
  };
}

async function fetchWheelData(chart: SavedChart): Promise<ZodiacWheelData> {
  const result = await chartService.calculateChart({
    name: chart.name,
    type: chart.type,
    date: chart.date,
    time: chart.time,
    location: chart.location,
  });

  const planets: CelestialBody[] = result.planets.map((p: any) => transformPlanetData(p));
  const planetsMap = new Map<string, CelestialBody>();
  planets.forEach((p) => planetsMap.set(p.name, p));

  const aspects: Aspect[] = result.aspects
    .map((a: any) => transformAspectData(a, planetsMap))
    .filter((a: Aspect | null) => a !== null) as Aspect[];

  const houses: House[] = result.houses.map((h: any) => transformHouseData(h));

  return { planets, aspects, houses };
}

function draconicToWheelData(result: DraconicResult): ZodiacWheelData {
  const planets: CelestialBody[] = Object.entries(result.planets).map(([name, p]) => {
    const zodiacSign = ZODIAC_SIGNS.find((s) => s.name === p.sign) ?? ZODIAC_SIGNS[0];
    return {
      name: name as any,
      longitude: p.longitude,
      latitude: 0,
      zodiacSign,
      speed: 0,
      isRetrograde: p.is_retrograde,
      distanceAU: 0,
    };
  });

  const planetsMap = new Map<string, CelestialBody>();
  planets.forEach((p) => planetsMap.set(p.name, p));

  const aspects: Aspect[] = result.aspects
    .map((a) => {
      const body1 = planetsMap.get(a.planet_a);
      const body2 = planetsMap.get(a.planet_b);
      if (!body1 || !body2) return null;
      return {
        body1,
        body2,
        type: a.aspect as any,
        angle: a.angle,
        orb: a.orb,
        isExact: a.orb <= 1,
      };
    })
    .filter((a): a is Aspect => a !== null);

  const houses: House[] = result.houses.map((cusp, idx) => {
    const signIdx = Math.floor(cusp / 30) % 12;
    return {
      number: (idx + 1) as any,
      cusp,
      sign: ZODIAC_SIGNS[signIdx],
    };
  });

  return { planets, aspects, houses };
}


export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
  duration_years: number;
  progress_pct?: number;
}

export interface MahadashaPeriod extends DashaPeriod {
  antardashas: DashaPeriod[];
}

export interface VimshottariDashaResult {
  meta: {
    birth_datetime_utc: string;
    query_datetime_utc: string;
    ayanamsa_type: string;
    system: string;
  };
  birth_nakshatra: {
    id: number;
    name: string;
    name_ru: string;
    ruler: string;
    pada: number;
    sidereal_longitude: number;
  };
  birth_dasha_lord: string;
  birth_dasha_balance_years: number;
  current: {
    mahadasha: DashaPeriod | null;
    antardasha: DashaPeriod | null;
  };
  mahadashas: MahadashaPeriod[];
}

export interface NavamsaPlanetPosition {
  longitude: number;
  sign: string;
  sign_id: number;
  sign_degree: number;
}

export interface NavamsaPlanet {
  d1: NavamsaPlanetPosition;
  d9: NavamsaPlanetPosition & { navamsa_number: number };
  is_vargottama: boolean;
}

export interface NavamsaResult {
  meta: {
    birth_datetime_utc: string;
    latitude: number;
    longitude: number;
    ayanamsa: number;
    ayanamsa_type: string;
    varga: string;
    varga_name: string;
  };
  planets: Record<string, NavamsaPlanet>;
  vargottama_planets: string[];
}

export const chartAnalysisService = {
  async calculateSynastry(chartA: SavedChart, chartB: SavedChart): Promise<{
    synastry: SynastryResult;
    wheelA: ZodiacWheelData;
    wheelB: ZodiacWheelData;
  }> {
    const [synastryRes, wheelA, wheelB] = await Promise.all([
      axios.post<SynastryResult>(`${API_BASE_URL}/api/chart-analysis/synastry`, {
        chartA: savedChartToPayload(chartA),
        chartB: savedChartToPayload(chartB),
      }),
      fetchWheelData(chartA),
      fetchWheelData(chartB),
    ]);

    return {
      synastry: synastryRes.data,
      wheelA,
      wheelB,
    };
  },

  async calculateProgressions(
    chart: SavedChart,
    targetDate: string,
    targetTime = '12:00:00'
  ): Promise<ProgressionsResult> {
    const response = await axios.post<ProgressionsResult>(
      `${API_BASE_URL}/api/chart-analysis/progressions`,
      {
        natal: savedChartToPayload(chart),
        targetDate,
        targetTime,
        targetTimezone: chart.location.timezone,
      }
    );
    return response.data;
  },

  async calculateDraconic(chart: SavedChart): Promise<{
    draconic: DraconicResult;
    wheelData: ZodiacWheelData;
  }> {
    const response = await axios.post<DraconicResult>(
      `${API_BASE_URL}/api/chart-analysis/draconic`,
      { natal: savedChartToPayload(chart) }
    );
    return {
      draconic: response.data,
      wheelData: draconicToWheelData(response.data),
    };
  },

  async calculateVimshottariDasha(chart: SavedChart): Promise<VimshottariDashaResult> {
    const response = await axios.post<VimshottariDashaResult>(
      `${API_BASE_URL}/api/chart-analysis/vimshottari-dasha`,
      { natal: savedChartToPayload(chart) }
    );
    return response.data;
  },

  async calculateHumanDesign(chart: SavedChart): Promise<HumanDesignResult> {
    const response = await axios.post<HumanDesignResult>(
      `${API_BASE_URL}/api/chart-analysis/human-design`,
      { natal: savedChartToPayload(chart) }
    );
    return response.data;
  },

  async calculateNavamsa(chart: SavedChart): Promise<{
    navamsa: NavamsaResult;
    wheelData: ZodiacWheelData;
  }> {
    const response = await axios.post<NavamsaResult>(
      `${API_BASE_URL}/api/chart-analysis/navamsa`,
      { natal: savedChartToPayload(chart) }
    );
    const navamsa = response.data;
    const planets: CelestialBody[] = Object.entries(navamsa.planets).map(([name, p]) => {
      const zodiacSign = ZODIAC_SIGNS.find((s) => s.name === p.d9.sign) ?? ZODIAC_SIGNS[0];
      return {
        name: name as any,
        longitude: p.d9.longitude,
        latitude: 0,
        zodiacSign,
        speed: 0,
        isRetrograde: false,
        distanceAU: 0,
      };
    });
    return {
      navamsa,
      wheelData: { planets, aspects: [], houses: [] },
    };
  },
};

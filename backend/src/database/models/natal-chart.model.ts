import type {
  CelestialBody,
  House,
  Aspect,
  LunarDay,
} from '@adaptive-astro/shared/types/astrology';

/**
 * Natal Chart Model
 *
 * Represents a stored natal chart with birth data and calculations
 */

export interface BirthLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
  city?: string;
  country?: string;
}

export interface NatalChart {
  id: string;
  user_id: string | null; // null for guest/anonymous charts
  name: string;

  // Chart Type
  chart_type?: 'natal' | 'event' | 'question';

  // Birth Data
  birth_date: Date;
  birth_time: string; // HH:MM:SS format
  birth_location: BirthLocation;

  // Calculated Data
  planets: CelestialBody[];
  houses: House[];
  aspects: Aspect[];
  lunar_day: LunarDay | null;
  moon_phase: string | null;

  // Metadata
  house_system: string;
  calculation_date: Date;
  
  // Additional metadata
  description?: string;
  tags?: string[];
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface CreateNatalChartInput {
  user_id?: string | null;
  name?: string;
  chart_type?: 'natal' | 'event' | 'question';
  birth_date: Date | string;
  birth_time?: string;
  birth_location: BirthLocation;
  planets?: CelestialBody[];
  houses?: House[];
  aspects?: Aspect[];
  lunar_day?: LunarDay | null;
  moon_phase?: string | null;
  house_system?: string;
  description?: string;
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface UpdateNatalChartInput {
  name?: string;
  chart_type?: 'natal' | 'event' | 'question';
  birth_date?: Date | string;
  birth_time?: string;
  birth_location?: BirthLocation;
  planets?: CelestialBody[];
  houses?: House[];
  aspects?: Aspect[];
  lunar_day?: LunarDay | null;
  moon_phase?: string | null;
  description?: string;
  tags?: string[];
}

/**
 * Simplified natal chart for lists
 */
export interface NatalChartSummary {
  id: string;
  name: string;
  birth_date: Date;
  birth_location: BirthLocation;
  created_at: Date;
}

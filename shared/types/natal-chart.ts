import {
  CelestialBody,
  Aspect,
  DateTime,
  LunarDay,
  House,
} from './astrology';

export interface NatalChart {
  userId: string;
  birthDateTime: DateTime;

  // Planetary positions at birth
  planets: {
    sun: CelestialBody;
    moon: CelestialBody;
    mercury: CelestialBody;
    venus: CelestialBody;
    mars: CelestialBody;
    jupiter: CelestialBody;
    saturn: CelestialBody;
    uranus: CelestialBody;
    neptune: CelestialBody;
    pluto: CelestialBody;
  };

  // House system (Placidus by default)
  houses: {
    [key: number]: House;
  };

  // Major aspects in natal chart
  aspects: Aspect[];

  // Lunar day at birth
  moonDayAtBirth: LunarDay;

  // Additional points (optional)
  lunarNodes?: {
    northNode: CelestialBody;  // Rahu (Vedic)
    southNode: CelestialBody;  // Ketu (Vedic)
  };

  blackMoon?: CelestialBody;   // Lilith

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface NatalChartInput {
  birthDate: string;           // ISO 8601
  birthTime: string;           // HH:MM
  birthLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

import type {
  DateTime,
  CalendarDay,
  CalendarMonth,
  CelestialBody,
  PlanetsApiResponse,
  VoidMoonApiResponse,
  RetrogradesApiResponse,
  AspectsApiResponse,
  HousesApiResponse,
  PlanetaryHoursApiResponse,
} from '@adaptive-astro/shared/types';
import { IEphemerisCalculator } from '../core/ephemeris/interface';
import { LunarDayEntity } from '../core/entities/lunar-day';
import { interpretationService } from './astrology/interpretation.service';
import mlAdapter from './ml-adapter';

/**
 * Calendar Generator Service
 *
 * Generates CalendarDay objects with astronomical data
 * and basic recommendations
 */
export class CalendarGenerator {
  constructor(private ephemeris: IEphemerisCalculator) { }

  /**
   * Generate a single calendar day
   */
  async generateDay(dateTime: DateTime, intent?: string): Promise<CalendarDay> {
    // Fetch astronomical data in parallel
    const [
      lunarDay,
      moonPhase,
      planetsData,
      voidMoonData,
      retrogradesData,
      aspectsData,
      housesData,
      hoursData,
    ] = await Promise.all([
      this.ephemeris.getLunarDay(dateTime),
      this.ephemeris.getMoonPhase(dateTime),
      this.ephemeris.getPlanetsPositions(dateTime),
      this.ephemeris.getVoidOfCourseMoon(dateTime),
      this.ephemeris.getRetrogradePlanets(dateTime).catch(() => ({ date: '', retrogradePlanets: [] })),
      this.ephemeris.getAspects(dateTime).catch(() => null as AspectsApiResponse | null),
      this.ephemeris.getHouses(dateTime, 'placidus').catch(() => null as HousesApiResponse | null),
      this.ephemeris.getPlanetaryHours(dateTime).catch(() => null as PlanetaryHoursApiResponse | null),
    ]);

    // Patch isRetrograde flags in planetsData using the dedicated retrogrades endpoint.
    // Production ephemeris containers may return speeds as unsigned values (always positive),
    // so is_retrograde on planets is sometimes false even when the planet is actually retrograde.
    // The /retrogrades endpoint computes this correctly.
    const retrogradeNames = new Set(
      (retrogradesData?.retrogradePlanets || []).map(r => r.name.toLowerCase())
    );
    if (retrogradeNames.size > 0 && planetsData?.planets) {
      planetsData.planets = planetsData.planets.map((p: any) => {
        const isRetro = retrogradeNames.has(p.name.toLowerCase());
        return isRetro ? { ...p, is_retrograde: true, isRetrograde: true } : p;
      });
    }

    // Enrich lunar day with calculations and interpretations
    const enrichedLunarDay = interpretationService.getLunarDay(lunarDay.number, lunarDay.lunarPhase);
    const lunarDayEntity = new LunarDayEntity({
      ...lunarDay,
      ...enrichedLunarDay
    });

    // Determine seasonal phase
    const seasonalPhase = this.getSeasonalPhase(dateTime.date);

    // Get day of week
    const dayOfWeek = dateTime.date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    // Generate basic recommendations from lunar day
    const recommendations = this.generateRecommendations(lunarDayEntity, moonPhase);

    // Convert API planet data to Transits object
    const transits = this.convertPlanetApiDataToTransits(planetsData);

    // Get Moon's zodiac sign from planets data
    const moonPlanet = (planetsData?.planets && Array.isArray(planetsData.planets))
      ? planetsData.planets.find(p => p.name === 'Moon')
      : null;
    const moonSign = moonPlanet ? this.getZodiacSignFromName(moonPlanet.zodiacSign) : this.getPlaceholderZodiacSign();

    // Determine moon phase details for frontend compatibility
    const phaseName = lunarDay.lunarPhase === 'New' && moonPhase > 0.05 ? 'Waxing Crescent' :
      lunarDay.lunarPhase === 'Full' && moonPhase < 0.95 ? 'Waning Gibbous' :
        lunarDay.lunarPhase;

    const calendarDay: CalendarDay = {
      date: dateTime,
      lunarDay: lunarDayEntity.toJSON(),
      lunarPhase: moonPhase,
      moonPhase: {
        phase: phaseName,
        illumination: moonPhase,
        age: lunarDay.number,
      },
      moonSign,
      dayOfWeek,
      seasonalPhase,
      transits,
      voidOfCourseMoon: voidMoonData.isVoidOfCourse ? this.convertVoidMoonApiData(voidMoonData) : null,
      // Build retrograde list directly from retrogrades API data
      retrogradesActive: (retrogradesData?.retrogradePlanets && Array.isArray(retrogradesData.retrogradePlanets))
        ? retrogradesData.retrogradePlanets.map(retro => {
          // Try to enrich with full planet data from planetsData first
          const apiPlanet = planetsData?.planets?.find((p: any) =>
            p.name.toLowerCase() === retro.name.toLowerCase()
          );
          if (apiPlanet) {
            return this.convertPlanetApiDataToCelestialBody(apiPlanet);
          }
          // Fallback: build CelestialBody from retro data
          return {
            name: retro.name as any,
            longitude: (retro as any).longitude ?? 0,
            latitude: 0,
            zodiacSign: this.getZodiacSignFromName(retro.currentSign),
            speed: (retro as any).speed ?? -0.1,
            isRetrograde: true,
            distanceAU: 1,
          } as CelestialBody;
        })
        : [],
      eclipseWindow: false,
      aspects: aspectsData?.aspects ?? [],
      houses: (housesData?.houses || []).map(h => ({
        number: h.number as any,
        cusp: h.cusp,
        sign: this.getZodiacSignFromName(h.zodiacSign)
      })),
      planetaryHours: (hoursData?.hours || []).map(h => ({
        hour: h.hour,
        ruler: h.planet as any,
        startTime: { date: new Date(h.startTime), timezone: dateTime.timezone, location: dateTime.location },
        endTime: { date: new Date(h.endTime), timezone: dateTime.timezone, location: dateTime.location }
      })),
      recommendations,
    };

    // --- INTEGRATE AI ADVICE ---
    if (intent) {
      const tags = this.collectTags(calendarDay, lunarDay.number);
      // Use fast ML-only path for bulk scanning; NIM synthesis happens in a post-pass
      // over the top-ranked results in OpportunityScannerService.
      const mlResponse = await mlAdapter.getAdviceFast({
        prompt: intent,
        active_transits: tags,
        date: dateTime.date.toISOString().split('T')[0],
      });

      if (mlResponse.success && mlResponse.results) {
        const bestAdvice = mlResponse.results[0];
        const avgScore = mlResponse.results.reduce((acc, r) => acc + r.score, 0) / mlResponse.results.length;

        (calendarDay as any).aiAdvice = {
          text: bestAdvice.text,
          score: Math.round(avgScore * 100),
          reasoning: bestAdvice.metadata.tag,
          source: bestAdvice.metadata.author,
          allInterpretations: mlResponse.results,
          vector: bestAdvice.vector
        };
        
        // Boost the general strength by AI score if it's relevant
        calendarDay.recommendations.strength = (calendarDay.recommendations.strength + avgScore) / 2;
      }
    }

    return calendarDay;
  }

  /**
   * Collect ZET-compatible tags from calendar day data
   */
  private collectTags(day: CalendarDay, moonDay: number): string[] {
    const planetMap: Record<string, string> = {
      'Sun': 'SU', 'Moon': 'MO', 'Mercury': 'ME', 'Venus': 'VE', 'Mars': 'MA',
      'Jupiter': 'JU', 'Saturn': 'SA', 'Uranus': 'UR', 'Neptune': 'NE', 'Pluto': 'PL'
    };
    
    const aspectMap: Record<string, string> = {
      'conjunction': '000', 'sextile': '060', 'square': '090', 'trine': '120', 'opposition': '180'
    };

    const tags: string[] = [];
    
    // Aspects
    (day.aspects ?? []).forEach(asp => {
      const p1 = planetMap[asp.planet1];
      const p2 = planetMap[asp.planet2];
      const aspType = asp.type ?? (asp.aspect_type as any);
      const type = aspType ? aspectMap[aspType] : undefined;
      if (p1 && p2 && type) tags.push(`${p1}.${type}.${p2}`);
    });

    // Retrogrades
    day.retrogradesActive.forEach(p => {
      const code = planetMap[p.name];
      if (code) tags.push(`${code}.R`);
    });

    // Moon Day
    tags.push(`[${moonDay}]`);

    return tags;
  }

  /**
   * Generate a calendar month
   */
  async generateMonth(
    year: number,
    month: number,
    location: { latitude: number; longitude: number },
    timezone: string = 'UTC',
    intent?: string
  ): Promise<CalendarMonth> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    // Generate all days in parallel
    const dayPromises = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day, 12, 0, 0); // Noon each day

      const dateTime: DateTime = {
        date,
        timezone,
        location,
      };

      dayPromises.push(this.generateDay(dateTime, intent));
    }

    const generatedDays = await Promise.all(dayPromises);
    days.push(...generatedDays);

    return {
      year,
      month,
      days,
    };
  }

  /**
   * Find best days for a specific activity
   */
  async findBestDaysFor(
    activity: string,
    startDate: Date,
    endDate: Date,
    location: { latitude: number; longitude: number },
    timezone: string = 'UTC',
    minStrength: number = 0.5
  ): Promise<CalendarDay[]> {
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateTime: DateTime = {
        date: new Date(currentDate),
        timezone,
        location,
      };

      const day = await this.generateDay(dateTime);

      // Check if day meets minimum strength for this activity
      if (day.recommendations.strength >= minStrength) {
        // Check if activity is recommended
        const isRecommended = day.recommendations.bestFor.some(
          rec => rec.toLowerCase().includes(activity.toLowerCase())
        );

        if (isRecommended) {
          days.push(day);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by strength (best first)
    return days.sort((a, b) => b.recommendations.strength - a.recommendations.strength);
  }

  /**
   * Generate recommendations from lunar day data
   */
  private generateRecommendations(
    lunarDay: LunarDayEntity,
    moonPhase: number
  ): CalendarDay['recommendations'] {
    const bestFor: string[] = [];
    const avoidFor: string[] = [];
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Extract recommendations from lunar day
    const practical = lunarDay.characteristics.practical;
    if (practical) {
      bestFor.push(...practical.split(',').map(s => s.trim()));
    }

    avoidFor.push(...lunarDay.characteristics.avoided);

    // Add phase-based recommendations
    if (lunarDay.lunarPhase === 'New') {
      bestFor.push('New beginnings', 'Planning', 'Setting intentions');
      reasons.push('New moon energy supports fresh starts');
    } else if (lunarDay.lunarPhase === 'Full') {
      bestFor.push('Completion', 'Celebration', 'Manifestation');
      reasons.push('Full moon energy enhances completion and manifestation');
    } else if (lunarDay.lunarPhase === 'Waxing') {
      bestFor.push('Building', 'Growing', 'Expanding');
      reasons.push('Waxing moon supports growth and expansion');
    } else if (lunarDay.lunarPhase === 'Waning') {
      bestFor.push('Releasing', 'Cleansing', 'Letting go');
      reasons.push('Waning moon supports release and cleansing');
    }

    // Add energy-based reasons
    if (lunarDay.energy === 'Light') {
      reasons.push('Light lunar day energy is favorable');
    } else if (lunarDay.energy === 'Dark') {
      warnings.push('Dark lunar day energy - proceed with caution');
    }

    // Special day warnings
    if (lunarDay.isSpecialDay()) {
      warnings.push(`Lunar day ${lunarDay.number} is a powerful and potentially challenging day`);
    }

    // Calculate overall strength
    let strength = lunarDay.getEnergyLevel();

    // Adjust for moon phase
    if (moonPhase > 0.9 || moonPhase < 0.1) {
      strength *= 1.1; // Boost for new/full moon
    }

    // Clamp strength to 0-1
    strength = Math.max(0, Math.min(1, strength));

    // Generate general mood
    const generalMood = lunarDay.characteristics.spiritual.split('.')[0] || 'A neutral lunar day';

    return {
      bestFor,
      avoidFor,
      generalMood,
      strength,
      reasons,
      warnings,
    };
  }


  /**
   * Determine seasonal phase from date
   */
  private getSeasonalPhase(
    date: Date
  ): 'Spring' | 'Summer' | 'Autumn' | 'Winter' {
    const month = date.getMonth();

    // Northern hemisphere seasons
    if (month >= 2 && month <= 4) return 'Spring'; // Mar, Apr, May
    if (month >= 5 && month <= 7) return 'Summer'; // Jun, Jul, Aug
    if (month >= 8 && month <= 10) return 'Autumn'; // Sep, Oct, Nov
    return 'Winter'; // Dec, Jan, Feb
  }

  /**
   * Placeholder for zodiac sign (until ephemeris provides it)
   */
  private getPlaceholderZodiacSign(): any {
    return {
      id: 1,
      name: 'Овен',
      element: 'Огонь',
      quality: 'Кардинальный',
      rulingPlanet: 'Mars',
      symbol: '♈',
      dateRange: [21, 19],
    };
  }

  /**
   * Placeholder for celestial body (until ephemeris provides it)
   */
  private getPlaceholderCelestialBody(name: string): CelestialBody {
    return {
      name: name as any,
      longitude: 0,
      latitude: 0,
      zodiacSign: this.getPlaceholderZodiacSign(),
      speed: 1,
      isRetrograde: false,
      distanceAU: 1,
    };
  }

  /**
   * Convert planets API data to transits object
   */
  private convertPlanetApiDataToTransits(planetsData: any): any {
    const transits: any = {};

    // Add null check for planets data
    if (!planetsData || !planetsData.planets || !Array.isArray(planetsData.planets)) {
      console.error('❌ Invalid planets data received:', planetsData);
      // Return placeholder transits for all planets
      const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
      planetNames.forEach(planetName => {
        transits[planetName] = this.getPlaceholderCelestialBody(planetName);
      });
      return transits;
    }

    const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

    planetNames.forEach(planetName => {
      const apiPlanet = planetsData.planets.find((p: any) =>
        p.name.toLowerCase() === planetName.toLowerCase()
      );

      if (apiPlanet) {
        transits[planetName] = this.convertPlanetApiDataToCelestialBody(apiPlanet);
      } else {
        transits[planetName] = this.getPlaceholderCelestialBody(planetName);
      }
    });

    return transits;
  }

  /**
   * Convert single planet API data to CelestialBody
   */
  private convertPlanetApiDataToCelestialBody(apiPlanet: any): CelestialBody {
    return {
      name: apiPlanet.name,
      longitude: apiPlanet.longitude,
      latitude: apiPlanet.latitude,
      zodiacSign: this.getZodiacSignFromName(apiPlanet.zodiac_sign || apiPlanet.zodiacSign),
      speed: apiPlanet.speed,
      isRetrograde: apiPlanet.is_retrograde ?? apiPlanet.isRetrograde ?? false,
      distanceAU: apiPlanet.distance_au ?? apiPlanet.distanceAU,
    };
  }

  /**
   * Convert zodiac sign name to ZodiacSign object
   */
  private getZodiacSignFromName(signName: string): any {
    const zodiacSigns: Record<string, any> = {
      'Aries': { id: 1, name: 'Овен', element: 'Огонь', quality: 'Кардинальный', rulingPlanet: 'Mars', symbol: '♈', dateRange: [21, 19] },
      'Taurus': { id: 2, name: 'Телец', element: 'Земля', quality: 'Фиксированный', rulingPlanet: 'Venus', symbol: '♉', dateRange: [20, 20] },
      'Gemini': { id: 3, name: 'Близнецы', element: 'Воздух', quality: 'Мутабельный', rulingPlanet: 'Mercury', symbol: '♊', dateRange: [21, 20] },
      'Cancer': { id: 4, name: 'Рак', element: 'Вода', quality: 'Кардинальный', rulingPlanet: 'Moon', symbol: '♋', dateRange: [21, 22] },
      'Leo': { id: 5, name: 'Лев', element: 'Огонь', quality: 'Фиксированный', rulingPlanet: 'Sun', symbol: '♌', dateRange: [23, 22] },
      'Virgo': { id: 6, name: 'Дева', element: 'Земля', quality: 'Мутабельный', rulingPlanet: 'Mercury', symbol: '♍', dateRange: [23, 22] },
      'Libra': { id: 7, name: 'Весы', element: 'Воздух', quality: 'Кардинальный', rulingPlanet: 'Venus', symbol: '♎', dateRange: [23, 22] },
      'Scorpio': { id: 8, name: 'Скорпион', element: 'Вода', quality: 'Фиксированный', rulingPlanet: 'Mars', symbol: '♏', dateRange: [23, 21] },
      'Sagittarius': { id: 9, name: 'Стрелец', element: 'Огонь', quality: 'Мутабельный', rulingPlanet: 'Jupiter', symbol: '♐', dateRange: [22, 19] },
      'Capricorn': { id: 10, name: 'Козерог', element: 'Земля', quality: 'Кардинальный', rulingPlanet: 'Saturn', symbol: '♑', dateRange: [20, 18] },
      'Aquarius': { id: 11, name: 'Водолей', element: 'Воздух', quality: 'Фиксированный', rulingPlanet: 'Uranus', symbol: '♒', dateRange: [19, 18] },
      'Pisces': { id: 12, name: 'Рыбы', element: 'Вода', quality: 'Мутабельный', rulingPlanet: 'Neptune', symbol: '♓', dateRange: [19, 20] }
    };

    return zodiacSigns[signName] || this.getPlaceholderZodiacSign();
  }

  /**
   * Convert void moon API data to VoidOfCourseMoon
   */
  private convertVoidMoonApiData(voidData: any): any {
    if (!voidData.voidPeriod) return null;

    return {
      startTime: {
        date: new Date(voidData.voidPeriod.startTime),
        timezone: 'UTC',
        location: { latitude: 0, longitude: 0 }
      },
      endTime: {
        date: new Date(voidData.voidPeriod.endTime),
        timezone: 'UTC',
        location: { latitude: 0, longitude: 0 }
      },
      sign: this.getZodiacSignFromName(voidData.voidPeriod.currentSign),
      duration: voidData.voidPeriod.durationHours,
      isActive: (at: any) => {
        const start = new Date(voidData.voidPeriod.startTime);
        const end = new Date(voidData.voidPeriod.endTime);
        const checkDate = at.date || at;
        return checkDate >= start && checkDate <= end;
      }
    };
  }
}

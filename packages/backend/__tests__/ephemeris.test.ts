import ephemerisService from '../src/services/ephemeris.service';

describe('Ephemeris Service', () => {
  it('should calculate planet positions for a given date', async () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const positions = await ephemerisService.calculatePlanetPositions(date);

    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);
    expect(positions[0]).toHaveProperty('name');
    expect(positions[0]).toHaveProperty('longitude');
    expect(positions[0]).toHaveProperty('sign');
  });

  it('should calculate zodiac sign from longitude', () => {
    const result = ephemerisService.getZodiacSign(45);
    expect(result.sign).toBe('Taurus');
    expect(result.degree).toBeCloseTo(15, 0);
  });

  it('should detect conjunction aspect', () => {
    const aspect = ephemerisService.calculateAspect(45, 48);
    expect(aspect).not.toBeNull();
    expect(aspect?.type).toBe('Conjunction');
  });

  it('should detect trine aspect', () => {
    const aspect = ephemerisService.calculateAspect(0, 120);
    expect(aspect).not.toBeNull();
    expect(aspect?.type).toBe('Trine');
  });
});

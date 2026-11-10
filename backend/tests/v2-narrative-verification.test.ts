import {
  extractClaims,
  verifyText,
  violationsOf,
  composeFactSentence,
  factsFingerprint,
} from '../src/optimal-timing/v2/llm/verify-narrative';
import type { DayEphemerisSummary } from '../src/optimal-timing/v2/schema/trace';

const facts: DayEphemerisSummary = {
  moon: {
    sign: 'Cancer',
    phase: 'waxing_crescent',
    illumination: 0.18,
    void_of_course: false,
    longitude: 102.4,
    waxing: true,
  },
  sun_sign: 'Taurus',
  retrograde_planets: ['Saturn'],
  planets: [
    { planet: 'Sun', sign: 'Taurus', degree_in_sign: 28.6, longitude: 58.6, speed: 0.96, retrograde: false },
    { planet: 'Moon', sign: 'Cancer', degree_in_sign: 12.4, longitude: 102.4, speed: 12.8, retrograde: false },
    { planet: 'Mercury', sign: 'Gemini', degree_in_sign: 4.1, longitude: 64.1, speed: 1.24, retrograde: false },
    { planet: 'Venus', sign: 'Aries', degree_in_sign: 21.0, longitude: 21.0, speed: 1.1, retrograde: false },
    { planet: 'Mars', sign: 'Pisces', degree_in_sign: 9.2, longitude: 339.2, speed: 0.71, retrograde: false },
    { planet: 'Saturn', sign: 'Libra', degree_in_sign: 2.5, longitude: 182.5, speed: -0.03, retrograde: true },
  ],
  aspects: [
    { from: 'Moon', to: 'Mars', type: 'trine', orb_deg: 2.1, applying: true },
    { from: 'Sun', to: 'Saturn', type: 'opposition', orb_deg: 3.4, applying: false },
  ],
  notable_aspects: [
    { from: 'Moon', to: 'Mars', type: 'trine', orb_deg: 2.1, applying: true },
  ],
};

describe('claim extraction', () => {
  it('reads a planet-in-sign claim through Russian case endings', () => {
    const claims = extractClaims('Луна в Раке даёт домашний тон, а Меркурий в Близнецах торопит.');
    expect(claims).toEqual([
      expect.objectContaining({ kind: 'planet_in_sign', planet: 'Moon', sign: 'Cancer' }),
      expect.objectContaining({ kind: 'planet_in_sign', planet: 'Mercury', sign: 'Gemini' }),
    ]);
  });

  it('does not mistake a lunar-day mention for the Moon in a sign', () => {
    const claims = extractClaims('Восьмой лунный день, спокойный.');
    expect(claims.filter((c) => c.kind === 'planet_in_sign')).toHaveLength(0);
  });

  it('ignores zodiac words that are not placements', () => {
    expect(extractClaims('Девушка звонила про Весы на кухне')).toHaveLength(0);
  });

  it('reads retrograde, aspect and phase claims', () => {
    const claims = extractClaims(
      'Сатурн ретрограден. Луна в тригоне к Марсу. Растущая Луна помогает.',
    );
    expect(claims).toEqual([
      expect.objectContaining({ kind: 'retrograde', planet: 'Saturn', value: true }),
      expect.objectContaining({ kind: 'aspect', planet: 'Moon', planet2: 'Mars', aspect: 'trine' }),
      expect.objectContaining({ kind: 'moon_waxing', value: true }),
    ]);
  });

  it('reads English narratives too', () => {
    const claims = extractClaims('Mercury in Gemini, Saturn retrograde, Moon trine Mars.');
    expect(claims.map((c) => c.kind)).toEqual(['planet_in_sign', 'retrograde', 'aspect']);
  });
});

describe('verification against the day snapshot', () => {
  it('passes text that matches the ephemeris', () => {
    const verified = verifyText(
      'Луна в Раке, растущая Луна, тригон Луны к Марсу поддерживает поездку. Сатурн ретрограден.',
      facts,
    );
    expect(verified.length).toBeGreaterThan(0);
    expect(violationsOf(verified)).toHaveLength(0);
  });

  it('catches a wrong sign and names the real one', () => {
    const [claim] = violationsOf(verifyText('Луна во Льве тянет в гости.', facts));
    expect(claim.verdict).toBe('contradicted');
    expect(claim.reason).toContain('Moon is in Cancer');
  });

  it('catches an invented retrograde', () => {
    const [claim] = violationsOf(verifyText('Меркурий ретроградный, не подписывай.', facts));
    expect(claim.verdict).toBe('contradicted');
    expect(claim.reason).toContain('Mercury is direct');
  });

  it('catches an aspect that is not there and reports what is', () => {
    const [claim] = violationsOf(verifyText('Квадрат Луны к Марсу давит.', facts));
    expect(claim.verdict).toBe('contradicted');
    expect(claim.reason).toContain('trine');
  });

  it('accepts a correct negation', () => {
    expect(violationsOf(verifyText('Луна не холостая.', facts))).toHaveLength(0);
  });

  it('flags a void-of-course claim that contradicts the data', () => {
    const [claim] = violationsOf(verifyText('Луна холостая, ничего не начинай.', facts));
    expect(claim.verdict).toBe('contradicted');
  });

  it('treats lunar-day numbers as unsupported', () => {
    const [claim] = violationsOf(verifyText('Идёт 11 лунный день.', facts));
    expect(claim.verdict).toBe('unsupported');
  });

  it('flags a planet the snapshot does not carry', () => {
    const [claim] = violationsOf(verifyText('Плутон в Козероге перестраивает.', facts));
    expect(claim.verdict).toBe('unsupported');
  });

  it('leaves text without astrological claims alone', () => {
    expect(verifyText('Хороший день для долгого разговора.', facts)).toHaveLength(0);
  });
});

describe('fallback sentence', () => {
  it('states only what the snapshot contains', () => {
    const ru = composeFactSentence(facts, 'ru');
    expect(ru).toContain('Луна в Раке');
    expect(ru).toContain('растущая');
    expect(ru).toContain('Сатурн');
    expect(violationsOf(verifyText(ru, facts))).toHaveLength(0);
  });

  it('has an English form that also verifies clean', () => {
    const en = composeFactSentence(facts, 'en');
    expect(en).toContain('Moon in Cancer');
    expect(violationsOf(verifyText(en, facts))).toHaveLength(0);
  });
});

describe('facts fingerprint', () => {
  it('changes when a position changes', () => {
    const moved: DayEphemerisSummary = {
      ...facts,
      planets: facts.planets.map((p) =>
        p.planet === 'Moon' ? { ...p, longitude: 118.9, sign: 'Cancer' } : p,
      ),
    };
    expect(factsFingerprint(moved)).not.toBe(factsFingerprint(facts));
  });

  it('is stable for equal facts', () => {
    expect(factsFingerprint({ ...facts })).toBe(factsFingerprint(facts));
  });
});

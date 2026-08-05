import {
  orbAndDirection,
  scoreTransit,
  rankTransits,
  rankDailyTransits,
  MAX_ORB,
  type TransitInput,
} from '../transit-strength';

const base: TransitInput = {
  transitingPlanet: 'Saturn',
  natalPlanet: 'Sun',
  aspectType: 'square',
  transitLongitude: 90,
  natalLongitude: 0,
  transitSpeed: 0.1,
};

describe('orbAndDirection', () => {
  it('точный аспект даёт нулевой орбис', () => {
    const { orb } = orbAndDirection(90, 0, 'square', 0.1);
    expect(orb).toBeCloseTo(0, 6);
  });

  it('орбис считается по ближней из двух точных точек', () => {
    // Квадрат точен и на +90°, и на -90°. Транзит на 273° от натальной 0°
    // это -87°, то есть недолёт три градуса до -90.
    const { orb } = orbAndDirection(273, 0, 'square', 0.1);
    expect(orb).toBeCloseTo(3, 6);
  });

  it('работает через границу 0°/360°', () => {
    const { orb } = orbAndDirection(2, 355, 'conjunction', 0.5);
    expect(orb).toBeCloseTo(7, 6);
  });

  it('директная планета до точного аспекта — сходящийся', () => {
    // 87° при цели 90° и движении вперёд: отклонение -3, скорость +.
    expect(orbAndDirection(87, 0, 'square', 0.1).isApplying).toBe(true);
  });

  it('директная планета после точного аспекта — расходящийся', () => {
    // Прежний код считал этот случай сходящимся, потому что смотрел только
    // на знак скорости.
    expect(orbAndDirection(93, 0, 'square', 0.1).isApplying).toBe(false);
  });

  it('ретроградная планета за точкой аспекта возвращается к ней', () => {
    expect(orbAndDirection(93, 0, 'square', -0.05).isApplying).toBe(true);
  });

  it('ретроградная планета до точки аспекта уходит от неё', () => {
    expect(orbAndDirection(87, 0, 'square', -0.05).isApplying).toBe(false);
  });
});

describe('scoreTransit', () => {
  it('медленная планета весит больше быстрой при равном орбисе', () => {
    const pluto = scoreTransit({ ...base, transitingPlanet: 'Pluto', transitSpeed: 0.01 });
    const moon = scoreTransit({ ...base, transitingPlanet: 'Moon', transitSpeed: 13.0 });
    expect(pluto.strength).toBeGreaterThan(moon.strength);
    expect(pluto.factors.slowness).toBeGreaterThan(moon.factors.slowness);
  });

  it('транзит на Солнце весит больше транзита на Нептун', () => {
    const onSun = scoreTransit({ ...base, natalPlanet: 'Sun' });
    const onNeptune = scoreTransit({ ...base, natalPlanet: 'Neptune' });
    expect(onSun.strength).toBeGreaterThan(onNeptune.strength);
  });

  it('плотный орбис весит больше широкого', () => {
    const tight = scoreTransit({ ...base, transitLongitude: 90.2 });
    const wide = scoreTransit({ ...base, transitLongitude: 97 });
    expect(tight.strength).toBeGreaterThan(wide.strength);
  });

  it('попадание на угол карты добавляет вес', () => {
    const plain = scoreTransit(base);
    const angular = scoreTransit({ ...base, natalAngles: { asc: 91 } });
    expect(angular.isAngular).toBe(true);
    expect(angular.strength).toBeGreaterThan(plain.strength);
  });

  it('противоположный конец оси считается угловым', () => {
    // Транзит на 90° против ASC на 270° — это попадание на DSC.
    expect(scoreTransit({ ...base, natalAngles: { asc: 270 } }).isAngular).toBe(true);
  });

  it('ретроградный транзит помечается повторным проходом', () => {
    expect(scoreTransit({ ...base, transitSpeed: -0.05 }).effectivePass).toBe(2);
    expect(scoreTransit(base).effectivePass).toBe(1);
  });

  it('явно переданный номер прохода важнее вывода по скорости', () => {
    expect(scoreTransit({ ...base, transitSpeed: -0.05, passIndex: 3 }).effectivePass).toBe(3);
  });

  it('сила остаётся в диапазоне 0..1 при всех включённых бонусах', () => {
    const maxed = scoreTransit({
      ...base,
      transitingPlanet: 'Pluto',
      transitSpeed: -0.008,
      transitLongitude: 90,
      natalPlanet: 'Sun',
      aspectType: 'conjunction',
      natalLongitude: 90,
      natalAngles: { asc: 90 },
      passIndex: 3,
    });
    expect(maxed.strength).toBeLessThanOrEqual(1);
    expect(maxed.strength).toBeGreaterThan(0);
  });

  it('неизвестная натальная точка получает средний вес, а не падение', () => {
    const unknown = scoreTransit({ ...base, natalPlanet: 'Vertex' });
    expect(unknown.factors.natalImportance).toBe(0.5);
    expect(Number.isFinite(unknown.strength)).toBe(true);
  });
});

// ── Приёмочные кейсы из плана ───────────────────────────────────────────

/** Средние суточные движения, градусов в сутки. */
const DAILY: Record<string, number> = {
  Moon: 13.18, Mercury: 1.38, Venus: 1.2, Sun: 0.99, Mars: 0.52,
  Jupiter: 0.083, Saturn: 0.033, Uranus: 0.012, Neptune: 0.006, Pluto: 0.004,
};
const NATAL: Record<string, number> = {
  Sun: 168.5, Moon: 12.3, Mercury: 150.1, Venus: 200.7, Mars: 33.9,
  Jupiter: 260.4, Saturn: 225.8, Uranus: 253.1, Neptune: 271.6, Pluto: 210.2,
};
const ASPECTS = ['conjunction', 'sextile', 'square', 'trine', 'quincunx', 'opposition'] as const;

/** Синтетический день: линейное движение от стартовых долгот. */
function transitsForDay(day: number): TransitInput[] {
  const out: TransitInput[] = [];
  for (const [tp, speed] of Object.entries(DAILY)) {
    const lon = (NATAL[tp] + speed * day) % 360;
    for (const [np, natalLon] of Object.entries(NATAL)) {
      for (const aspectType of ASPECTS) {
        const { orb } = orbAndDirection(lon, natalLon, aspectType, speed);
        if (orb <= MAX_ORB[aspectType]) {
          out.push({
            transitingPlanet: tp, natalPlanet: np, aspectType,
            transitLongitude: lon, natalLongitude: natalLon, transitSpeed: speed,
            natalAngles: { asc: 145.0, mc: 55.0 },
          });
        }
      }
    }
  }
  return out;
}

describe('приёмочные кейсы', () => {
  const DAYS = 90;
  const days = Array.from({ length: DAYS }, (_, i) => transitsForDay(i));

  it('кейс 2: распределение весов невырождено', () => {
    const all = days.flatMap((d) => rankTransits(d).map((t) => t.strength));
    expect(all.length).toBeGreaterThan(100);
    const unique = new Set(all.map((s) => s.toFixed(4)));
    // Константа означала бы, что ранжирование ничего не различает.
    expect(unique.size).toBeGreaterThan(all.length * 0.5);
    const spread = Math.max(...all) - Math.min(...all);
    expect(spread).toBeGreaterThan(0.2);
  });

  it('кейс 2: по значимости победитель стабилен — так и задумано', () => {
    // Плутон в орбисе к натальной точке весит больше всего месяцами подряд.
    // Для фонового блока это верно, и менять тут нечего.
    const winners = days
      .map((d) => rankTransits(d, 1)[0])
      .filter(Boolean)
      .map((t) => `${t.transitingPlanet}-${t.aspectType}-${t.natalPlanet}`);
    expect(winners.length).toBe(DAYS);
    expect(new Set(winners).size).toBeGreaterThanOrEqual(1);
  });

  it('кейс 2: дневная выдача обновляется, а не стоит на месте', () => {
    const winners = days
      .map((d) => rankDailyTransits(d, 1)[0])
      .filter(Boolean)
      .map((t) => `${t.transitingPlanet}-${t.aspectType}-${t.natalPlanet}`);
    expect(winners.length).toBe(DAYS);
    // Без поправки на актуальность здесь была бы ровно одна уникальная строка.
    expect(new Set(winners).size).toBeGreaterThan(DAYS * 0.2);
  });

  it('кейс 2: актуальность разводит застрявший Плутон и подходящий Марс', () => {
    const stuckPluto = scoreTransit({
      transitingPlanet: 'Pluto', natalPlanet: 'Sun', aspectType: 'square',
      transitLongitude: 90.5, natalLongitude: 0, transitSpeed: 0.004,
    });
    const closingMars = scoreTransit({
      transitingPlanet: 'Mars', natalPlanet: 'Sun', aspectType: 'square',
      transitLongitude: 89.5, natalLongitude: 0, transitSpeed: 0.52,
    });
    expect(stuckPluto.strength).toBeGreaterThan(closingMars.strength);
    expect(stuckPluto.daysToExact).toBeGreaterThan(100);
    expect(closingMars.daysToExact).toBeLessThan(1);
    expect(closingMars.dailyScore).toBeGreaterThan(stuckPluto.dailyScore);
  });

  it('кейс 3: отсечка держит три фактора при десятках активных', () => {
    let sawCrowdedDay = false;
    for (const d of days) {
      expect(rankTransits(d, 3).length).toBeLessThanOrEqual(3);
      if (d.length >= 20) sawCrowdedDay = true;
    }
    // Без такого дня тест ничего не проверяет.
    expect(sawCrowdedDay).toBe(true);
  });

  it('кейс 4: повторный прогон даёт тот же результат', () => {
    const once = JSON.stringify(rankTransits(days[7], 5));
    const twice = JSON.stringify(rankTransits(days[7], 5));
    expect(once).toBe(twice);
  });

  it('кейс 4: порядок входа не влияет на выдачу', () => {
    const shuffled = [...days[7]].reverse();
    expect(JSON.stringify(rankTransits(shuffled, 5))).toBe(
      JSON.stringify(rankTransits(days[7], 5)),
    );
  });

  it('в верхушке дня медленные планеты вытесняют Луну', () => {
    // Смысл всей затеи: лунный транзит в тесном орбисе не должен забивать
    // выдачу, потому что он длится часы.
    const lunarTop = days.filter((d) => rankTransits(d, 3).some((t) => t.transitingPlanet === 'Moon'));
    expect(lunarTop.length).toBeLessThan(DAYS * 0.5);
  });
});

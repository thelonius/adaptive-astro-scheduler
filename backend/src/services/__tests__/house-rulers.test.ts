import {
    computeHouseRulers,
    houseOfLongitude,
    rulerOfSign,
    type HouseCusp,
    type PlanetPosition,
} from '../house-rulers';

/**
 * Кейсы 1, 3, 4 из плана: обход завершается, выдача не вырождена,
 * повторный прогон совпадает. Астрологию тут не проверить, проверяется
 * инженерия — что расчёт не зацикливается, не теряет дома и детерминирован.
 */

/** Равнодомная карта: куспиды через 30° от 0° Овна. Удобна тем, что дом
 *  совпадает со знаком, и ожидаемый ответ считается в уме. */
function equalHouses(ascLongitude = 0): HouseCusp[] {
    const SIGNS = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];
    return Array.from({ length: 12 }, (_, i) => {
        const cusp = (ascLongitude + i * 30) % 360;
        return { number: i + 1, cusp, zodiacSign: SIGNS[Math.floor(cusp / 30)] };
    });
}

/** Плацидус на широте Москвы: дома заметно неравные, есть перехват. */
const MOSCOW_CUSPS: HouseCusp[] = [
    { number: 1, cusp: 227.504, zodiacSign: 'Scorpio' },
    { number: 2, cusp: 257.428, zodiacSign: 'Sagittarius' },
    { number: 3, cusp: 298.640, zodiacSign: 'Capricorn' },
    { number: 4, cusp: 340.306, zodiacSign: 'Pisces' },
    { number: 5, cusp: 10.613, zodiacSign: 'Aries' },
    { number: 6, cusp: 31.764, zodiacSign: 'Taurus' },
    { number: 7, cusp: 47.504, zodiacSign: 'Taurus' },
    { number: 8, cusp: 77.428, zodiacSign: 'Gemini' },
    { number: 9, cusp: 118.640, zodiacSign: 'Cancer' },
    { number: 10, cusp: 160.306, zodiacSign: 'Virgo' },
    { number: 11, cusp: 190.613, zodiacSign: 'Libra' },
    { number: 12, cusp: 211.764, zodiacSign: 'Scorpio' },
];

const TEN_PLANETS: PlanetPosition[] = [
    { name: 'Sun', longitude: 123.53 },
    { name: 'Moon', longitude: 265.10 },
    { name: 'Mercury', longitude: 101.22 },
    { name: 'Venus', longitude: 165.90 },
    { name: 'Mars', longitude: 95.40 },
    { name: 'Jupiter', longitude: 133.77 },
    { name: 'Saturn', longitude: 18.05 },
    { name: 'Uranus', longitude: 65.30 },
    { name: 'Neptune', longitude: 2.11 },
    { name: 'Pluto', longitude: 302.44 },
];

describe('houseOfLongitude', () => {
    it('находит дом для любой точки круга и не теряет ни одного градуса', () => {
        // Кейс 3: сплошное покрытие. Ни один градус не должен провалиться
        // мимо всех домов — это ловит дыры в сравнении по дуге.
        const missed: number[] = [];
        for (let deg = 0; deg < 360; deg += 0.5) {
            if (houseOfLongitude(deg, MOSCOW_CUSPS) === null) missed.push(deg);
        }
        expect(missed).toEqual([]);
    });

    it('замыкает последний дом через 0° Овна', () => {
        // 12-й дом начинается на 211.764° Скорпиона и упирается в Асцендент
        // на 227.504°: точка внутри этой дуги обязана попасть в 12-й.
        expect(houseOfLongitude(220, MOSCOW_CUSPS)).toBe(12);
        // А 4-й дом (340.306°) перетекает через 0° в 5-й (10.613°).
        expect(houseOfLongitude(350, MOSCOW_CUSPS)).toBe(4);
        expect(houseOfLongitude(5, MOSCOW_CUSPS)).toBe(4);
        expect(houseOfLongitude(15, MOSCOW_CUSPS)).toBe(5);
    });

    it('нормализует долготу за пределами 0..360', () => {
        expect(houseOfLongitude(220 + 720, MOSCOW_CUSPS)).toBe(12);
        expect(houseOfLongitude(-140, MOSCOW_CUSPS)).toBe(12);
    });

    it('в равнодомной карте дом совпадает с номером знака', () => {
        const cusps = equalHouses(0);
        expect(houseOfLongitude(15, cusps)).toBe(1);
        expect(houseOfLongitude(45, cusps)).toBe(2);
        expect(houseOfLongitude(359, cusps)).toBe(12);
    });

    it('возвращает null, если куспидов не двенадцать', () => {
        expect(houseOfLongitude(10, MOSCOW_CUSPS.slice(0, 5))).toBeNull();
    });
});

describe('rulerOfSign', () => {
    it('традиционная система отдаёт Скорпион Марсу, современная Плутону', () => {
        expect(rulerOfSign('Scorpio', 'traditional')).toBe('Mars');
        expect(rulerOfSign('Scorpio', 'modern')).toBe('Pluto');
        expect(rulerOfSign('Aquarius', 'traditional')).toBe('Saturn');
        expect(rulerOfSign('Aquarius', 'modern')).toBe('Uranus');
    });

    it('на неизвестный знак отвечает null, а не выдумывает управителя', () => {
        expect(rulerOfSign('Ophiuchus')).toBeNull();
    });
});

describe('computeHouseRulers', () => {
    it('покрывает все двенадцать домов', () => {
        // Кейс 1: обход завершается и ничего не теряет.
        const result = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS);
        expect(result).toHaveLength(12);
        expect(result.map((r) => r.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(result.every((r) => r.rulerHouse >= 1 && r.rulerHouse <= 12)).toBe(true);
    });

    it('выдача не вырождена: управители расходятся по разным домам', () => {
        // Кейс 3: если бы все двенадцать указывали в один дом, расчёт был бы
        // бесполезен, даже будучи формально «успешным».
        const result = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS);
        const distinct = new Set(result.map((r) => r.rulerHouse));
        expect(distinct.size).toBeGreaterThan(2);
    });

    it('повторный прогон даёт побайтово тот же результат', () => {
        // Кейс 4: детерминизм. Порядок куспидов на входе не влияет.
        const shuffled = [...MOSCOW_CUSPS].reverse();
        const a = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS);
        const b = computeHouseRulers(shuffled, [...TEN_PLANETS].reverse());
        expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    });

    it('помечает управителя, стоящего в своём же доме', () => {
        // Меркурий управляет 8-м домом (Близнецы на куспиде) и стоит на
        // 101.22°, то есть между куспидами 8-го (77.428°) и 9-го (118.640°).
        const result = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS);
        const eighth = result.find((r) => r.house === 8)!;
        expect(eighth.ruler).toBe('Mercury');
        expect(eighth.rulerHouse).toBe(8);
        expect(eighth.isSelfContained).toBe(true);

        const first = result.find((r) => r.house === 1)!;
        expect(first.isSelfContained).toBe(false);
    });

    it('строит ключ корпуса в формате раздела RHH', () => {
        // Кейс 5: для каждого фактора должен находиться текст, а значит ключ
        // обязан совпадать с тем, что лежит в базе: `u01.h08`, с нулями.
        const result = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS);
        expect(result.find((r) => r.house === 1)!.corpusTag).toBe('u01.h08');
        expect(result.find((r) => r.house === 12)!.corpusTag).toBe('u12.h08');
        expect(result.every((r) => /^u\d{2}\.h\d{2}$/.test(r.corpusTag))).toBe(true);
    });

    it('современная система меняет управителей трёх знаков', () => {
        const traditional = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS, 'traditional');
        const modern = computeHouseRulers(MOSCOW_CUSPS, TEN_PLANETS, 'modern');
        // Скорпион на 1-м и 12-м куспиде: Марс → Плутон.
        expect(traditional.find((r) => r.house === 1)!.ruler).toBe('Mars');
        expect(modern.find((r) => r.house === 1)!.ruler).toBe('Pluto');
        // Дома без затронутых знаков не меняются.
        expect(modern.find((r) => r.house === 9)!.ruler).toBe('Moon');
    });

    it('пропускает дом, если управителя нет среди переданных планет', () => {
        // Внешние планеты не всегда приходят: в современной системе без
        // Плутона Скорпион остаётся без управителя. Пропустить — честнее,
        // чем подставить traditional-управителя молча.
        const withoutOuter = TEN_PLANETS.filter(
            (p) => !['Pluto', 'Uranus', 'Neptune'].includes(p.name),
        );
        const result = computeHouseRulers(MOSCOW_CUSPS, withoutOuter, 'modern');
        expect(result.find((r) => r.house === 1)).toBeUndefined();
        expect(result.find((r) => r.house === 9)).toBeDefined();
    });

    it('не падает на пустом входе', () => {
        expect(computeHouseRulers([], TEN_PLANETS)).toEqual([]);
        expect(computeHouseRulers(MOSCOW_CUSPS, [])).toEqual([]);
    });
});

/**
 * Управители домов и их размещение — «управитель N-го дома в M-м доме».
 *
 * Считается из того, что уже отдают эфемериды: знак на куспиде даёт
 * управителя, долгота этого управителя говорит, в какой дом он попал.
 * Раздел RHH корпуса адресуется ровно этой парой (`u01.h07`), 144 ключа
 * и до четырёх авторов на каждый.
 *
 * Это не то же самое, что цепи диспозиций из `dispositor_engine`: там
 * планета отсылает к управителю своего знака, здесь дом отсылает к дому.
 * Первое про внутреннюю иерархию карты, второе про то, куда утекают дела
 * конкретной сферы жизни.
 */

export type RulershipSystem = 'traditional' | 'modern';

export interface HouseCusp {
    number: number;
    /** Эклиптическая долгота куспида, 0..360. */
    cusp: number;
    zodiacSign: string;
}

export interface PlanetPosition {
    name: string;
    longitude: number;
}

export interface HouseRulerPlacement {
    /** Дом, чей управитель рассматривается. */
    house: number;
    /** Знак на куспиде этого дома. */
    sign: string;
    ruler: string;
    /** Дом, в котором стоит управитель. */
    rulerHouse: number;
    /** Управитель стоит в том же доме, которым управляет. */
    isSelfContained: boolean;
    /** Ключ раздела RHH корпуса. */
    corpusTag: string;
}

const TRADITIONAL: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// Современная система отдаёт три знака внешним планетам; остальное совпадает.
const MODERN: Record<string, string> = {
    ...TRADITIONAL,
    Scorpio: 'Pluto', Aquarius: 'Uranus', Pisces: 'Neptune',
};

export function rulerOfSign(sign: string, system: RulershipSystem = 'traditional'): string | null {
    const table = system === 'modern' ? MODERN : TRADITIONAL;
    return table[sign] ?? null;
}

const norm = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * В какой дом попадает точка. Дома неравные (Плацидус), поэтому границы
 * берутся из соседних куспидов, а не делением на 30°. Последний дом
 * замыкается на первый через 0° Овна — отсюда сравнение по дуге, а не по
 * числовому диапазону.
 */
export function houseOfLongitude(longitude: number, cusps: HouseCusp[]): number | null {
    if (cusps.length !== 12) return null;
    const sorted = [...cusps].sort((a, b) => a.number - b.number);
    const point = norm(longitude);

    for (let i = 0; i < 12; i++) {
        const start = norm(sorted[i].cusp);
        const end = norm(sorted[(i + 1) % 12].cusp);
        const span = norm(end - start);
        const offset = norm(point - start);
        // span === 0 означало бы совпавшие куспиды: карта битая, дом пропускаем.
        if (span > 0 && offset < span) return sorted[i].number;
    }
    return null;
}

export function computeHouseRulers(
    cusps: HouseCusp[],
    planets: PlanetPosition[],
    system: RulershipSystem = 'traditional',
): HouseRulerPlacement[] {
    const byName = new Map(planets.map((p) => [p.name, p]));
    const out: HouseRulerPlacement[] = [];

    for (const cusp of [...cusps].sort((a, b) => a.number - b.number)) {
        const ruler = rulerOfSign(cusp.zodiacSign, system);
        if (!ruler) continue;

        const position = byName.get(ruler);
        if (!position) continue;

        const rulerHouse = houseOfLongitude(position.longitude, cusps);
        if (rulerHouse === null) continue;

        out.push({
            house: cusp.number,
            sign: cusp.zodiacSign,
            ruler,
            rulerHouse,
            isSelfContained: rulerHouse === cusp.number,
            corpusTag: `u${String(cusp.number).padStart(2, '0')}.h${String(rulerHouse).padStart(2, '0')}`,
        });
    }

    return out;
}

"""
Lunar Nodes (Rahu and Ketu) calculation using Swiss Ephemeris.

The Lunar Nodes are the points where the Moon's orbit crosses the ecliptic.
- North Node (Rahu - राहु): Ascending node, represents future karma
- South Node (Ketu - केतु): Descending node, represents past karma

They are always exactly 180° apart and move retrograde through the zodiac.
"""

from datetime import datetime
from typing import Dict
import swisseph as swe

from ..types import (
    DateTime,
    LunarNode,
    LunarNodes,
    ZodiacSignName,
    normalize_angle,
)


# Russian interpretations for each zodiac sign
RAHU_INTERPRETATIONS_RU: Dict[ZodiacSignName, str] = {
    ZodiacSignName.ARIES: "Раху в Овне: Путь к самостоятельности, лидерству и храбрости. Развитие инициативы и независимости.",
    ZodiacSignName.TAURUS: "Раху в Тельце: Путь к материальной стабильности, наслаждению красотой и накоплению ресурсов.",
    ZodiacSignName.GEMINI: "Раху в Близнецах: Путь к знаниям, общению и многогранности. Развитие интеллекта и коммуникации.",
    ZodiacSignName.CANCER: "Раху в Раке: Путь к эмоциональной глубине, заботе о близких и созданию дома.",
    ZodiacSignName.LEO: "Раху во Льве: Путь к самовыражению, творчеству и признанию. Развитие уверенности в себе.",
    ZodiacSignName.VIRGO: "Раху в Деве: Путь к совершенству, служению и практичности. Развитие внимания к деталям.",
    ZodiacSignName.LIBRA: "Раху в Весах: Путь к гармонии, партнерству и справедливости. Развитие дипломатии и баланса.",
    ZodiacSignName.SCORPIO: "Раху в Скорпионе: Путь к глубокой трансформации, силе и регенерации. Развитие духовной силы.",
    ZodiacSignName.SAGITTARIUS: "Раху в Стрельце: Путь к мудрости, высшему образованию и расширению горизонтов.",
    ZodiacSignName.CAPRICORN: "Раху в Козероге: Путь к достижениям, дисциплине и социальному статусу.",
    ZodiacSignName.AQUARIUS: "Раху в Водолее: Путь к инновациям, свободе и служению человечеству.",
    ZodiacSignName.PISCES: "Раху в Рыбах: Путь к духовности, состраданию и универсальной любви.",
}

KETU_INTERPRETATIONS_RU: Dict[ZodiacSignName, str] = {
    ZodiacSignName.ARIES: "Кету в Овне: Прошлый опыт самостоятельности. Важно учиться сотрудничеству.",
    ZodiacSignName.TAURUS: "Кету в Тельце: Прошлый опыт материальной стабильности. Важно развивать духовные ценности.",
    ZodiacSignName.GEMINI: "Кету в Близнецах: Прошлый опыт общения и знаний. Важно искать глубокую мудрость.",
    ZodiacSignName.CANCER: "Кету в Раке: Прошлый опыт заботы и эмоций. Важно развивать профессионализм.",
    ZodiacSignName.LEO: "Кету во Льве: Прошлый опыт лидерства и признания. Важно учиться работе в команде.",
    ZodiacSignName.VIRGO: "Кету в Деве: Прошлый опыт служения и перфекционизма. Важно развивать веру и доверие.",
    ZodiacSignName.LIBRA: "Кету в Весах: Прошлый опыт партнерства. Важно развивать независимость.",
    ZodiacSignName.SCORPIO: "Кету в Скорпионе: Прошлый опыт трансформации. Важно научиться легкости и простоте.",
    ZodiacSignName.SAGITTARIUS: "Кету в Стрельце: Прошлый опыт философии и путешествий. Важно развивать практичность.",
    ZodiacSignName.CAPRICORN: "Кету в Козероге: Прошлый опыт достижений. Важно развивать эмоциональность и заботу.",
    ZodiacSignName.AQUARIUS: "Кету в Водолее: Прошлый опыт инноваций. Важно развивать творчество и самовыражение.",
    ZodiacSignName.PISCES: "Кету в Рыбах: Прошлый опыт духовности. Важно развивать практичность и организованность.",
}


def get_zodiac_sign(longitude: float) -> ZodiacSignName:
    """
    Determine zodiac sign from ecliptic longitude.

    Args:
        longitude: Ecliptic longitude in degrees (0-360)

    Returns:
        The zodiac sign name
    """
    normalized = normalize_angle(longitude)
    sign_index = int(normalized / 30)

    signs = [
        ZodiacSignName.ARIES,
        ZodiacSignName.TAURUS,
        ZodiacSignName.GEMINI,
        ZodiacSignName.CANCER,
        ZodiacSignName.LEO,
        ZodiacSignName.VIRGO,
        ZodiacSignName.LIBRA,
        ZodiacSignName.SCORPIO,
        ZodiacSignName.SAGITTARIUS,
        ZodiacSignName.CAPRICORN,
        ZodiacSignName.AQUARIUS,
        ZodiacSignName.PISCES,
    ]

    return signs[sign_index]


def calculate_lunar_nodes(date_time: DateTime) -> LunarNodes:
    """
    Calculate the positions of the Lunar Nodes (Rahu and Ketu).

    The North Node (Rahu) is the point where the Moon crosses the ecliptic
    from south to north. The South Node (Ketu) is always exactly 180° opposite.

    Uses Swiss Ephemeris for high-precision calculation.

    Args:
        date_time: The date, time, and location for the calculation

    Returns:
        LunarNodes object containing both Rahu and Ketu positions

    Example:
        >>> from datetime import datetime
        >>> dt = DateTime(
        ...     date=datetime(2024, 1, 1, 12, 0),
        ...     timezone="UTC",
        ...     location=Location(latitude=55.7558, longitude=37.6173)
        ... )
        >>> nodes = calculate_lunar_nodes(dt)
        >>> print(f"Rahu: {nodes.north_node.zodiac_sign}")
        >>> print(f"Ketu: {nodes.south_node.zodiac_sign}")
    """
    # Convert datetime to Julian Day
    dt = date_time.date
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)

    # Calculate North Node (Mean Node)
    # SEFLG_SWIEPH = use Swiss Ephemeris
    # SE_MEAN_NODE = Mean Node (averaged position)
    result, flags = swe.calc_ut(jd, swe.MEAN_NODE, swe.FLG_SWIEPH)

    # result[0] = longitude
    # result[1] = latitude (always 0 for nodes)
    # result[2] = distance (not relevant for nodes)
    # result[3] = speed in longitude
    north_longitude = result[0]
    north_speed = result[3]

    # South Node is always exactly 180° opposite
    south_longitude = normalize_angle(north_longitude + 180.0)

    # Get zodiac signs
    north_sign = get_zodiac_sign(north_longitude)
    south_sign = get_zodiac_sign(south_longitude)

    # Nodes always move retrograde (backward through the zodiac)
    is_retrograde = True

    # Create North Node (Rahu)
    north_node = LunarNode(
        name="Rahu",
        longitude=north_longitude,
        latitude=0.0,  # Nodes are always on the ecliptic
        zodiac_sign=north_sign,
        speed=north_speed,
        is_retrograde=is_retrograde,
        interpretation_ru=RAHU_INTERPRETATIONS_RU[north_sign]
    )

    # Create South Node (Ketu)
    south_node = LunarNode(
        name="Ketu",
        longitude=south_longitude,
        latitude=0.0,  # Nodes are always on the ecliptic
        zodiac_sign=south_sign,
        speed=north_speed,  # Same speed as north node
        is_retrograde=is_retrograde,
        interpretation_ru=KETU_INTERPRETATIONS_RU[south_sign]
    )

    return LunarNodes(
        north_node=north_node,
        south_node=south_node
    )


def calculate_true_node(date_time: DateTime) -> LunarNodes:
    """
    Calculate the True (Osculating) Lunar Nodes.

    The True Node is the actual instantaneous position where the Moon's
    orbit crosses the ecliptic. It oscillates around the Mean Node.

    Args:
        date_time: The date, time, and location for the calculation

    Returns:
        LunarNodes object with True Node positions
    """
    dt = date_time.date
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)

    # Calculate True Node (Osculating Node)
    result, flags = swe.calc_ut(jd, swe.TRUE_NODE, swe.FLG_SWIEPH)

    north_longitude = result[0]
    north_speed = result[3]
    south_longitude = normalize_angle(north_longitude + 180.0)

    north_sign = get_zodiac_sign(north_longitude)
    south_sign = get_zodiac_sign(south_longitude)

    north_node = LunarNode(
        name="Rahu",
        longitude=north_longitude,
        latitude=0.0,
        zodiac_sign=north_sign,
        speed=north_speed,
        is_retrograde=True,
        interpretation_ru=RAHU_INTERPRETATIONS_RU[north_sign]
    )

    south_node = LunarNode(
        name="Ketu",
        longitude=south_longitude,
        latitude=0.0,
        zodiac_sign=south_sign,
        speed=north_speed,
        is_retrograde=True,
        interpretation_ru=KETU_INTERPRETATIONS_RU[south_sign]
    )

    return LunarNodes(
        north_node=north_node,
        south_node=south_node
    )

"""
Chiron calculation using Swiss Ephemeris.

Chiron is a "centaur" asteroid discovered in 1977, orbiting between Saturn and Uranus.
In astrology, Chiron represents the "wounded healer" - our deepest wounds and our
capacity to heal ourselves and others through those wounds.
"""

from datetime import datetime
from typing import Dict
import swisseph as swe

from ..types import (
    DateTime,
    ChironPosition,
    ZodiacSignName,
    normalize_angle,
)


# Russian interpretations for Chiron in each zodiac sign
CHIRON_INTERPRETATIONS_RU: Dict[ZodiacSignName, str] = {
    ZodiacSignName.ARIES: "Хирон в Овне: Рана в самоидентичности и лидерстве. Исцеление через принятие своей силы и независимости. Учитель смелости.",
    ZodiacSignName.TAURUS: "Хирон в Тельце: Рана в самооценке и материальной безопасности. Исцеление через признание своей ценности. Учитель стабильности.",
    ZodiacSignName.GEMINI: "Хирон в Близнецах: Рана в общении и обучении. Исцеление через принятие своего голоса. Учитель мудрости через слова.",
    ZodiacSignName.CANCER: "Хирон в Раке: Рана в эмоциональной безопасности и семье. Исцеление через принятие своих эмоций. Учитель заботы.",
    ZodiacSignName.LEO: "Хирон во Льве: Рана в самовыражении и признании. Исцеление через принятие своей уникальности. Учитель творчества.",
    ZodiacSignName.VIRGO: "Хирон в Деве: Рана в совершенстве и здоровье. Исцеление через принятие несовершенства. Учитель служения.",
    ZodiacSignName.LIBRA: "Хирон в Весах: Рана в отношениях и балансе. Исцеление через здоровые границы. Учитель гармонии.",
    ZodiacSignName.SCORPIO: "Хирон в Скорпионе: Рана в интимности и трансформации. Исцеление через принятие своей темной стороны. Учитель глубины.",
    ZodiacSignName.SAGITTARIUS: "Хирон в Стрельце: Рана в вере и смысле жизни. Исцеление через поиск своей истины. Учитель мудрости.",
    ZodiacSignName.CAPRICORN: "Хирон в Козероге: Рана в достижениях и авторитете. Исцеление через принятие своей силы. Учитель ответственности.",
    ZodiacSignName.AQUARIUS: "Хирон в Водолее: Рана в принадлежности и уникальности. Исцеление через принятие своей индивидуальности. Учитель свободы.",
    ZodiacSignName.PISCES: "Хирон в Рыбах: Рана в духовности и границах. Исцеление через принятие своей чувствительности. Учитель сострадания.",
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


def calculate_chiron(date_time: DateTime) -> ChironPosition:
    """
    Calculate the position of Chiron.

    Chiron is asteroid number 2060 in the Swiss Ephemeris.

    Args:
        date_time: The date, time, and location for the calculation

    Returns:
        ChironPosition object with position and interpretation

    Example:
        >>> from datetime import datetime
        >>> dt = DateTime(
        ...     date=datetime(2024, 1, 1, 12, 0),
        ...     timezone="UTC",
        ...     location=Location(latitude=55.7558, longitude=37.6173)
        ... )
        >>> chiron = calculate_chiron(dt)
        >>> print(f"Chiron in {chiron.zodiac_sign}")
        >>> print(chiron.interpretation_ru)
    """
    import os

    # Set Swiss Ephemeris path to our data directory
    ephe_path = os.environ.get('EPHEMERIS_DATA_DIR', '/app/data')
    swisseph_path = os.path.join(ephe_path, 'swisseph')
    if os.path.exists(swisseph_path):
        swe.set_ephe_path(swisseph_path)

    # Convert datetime to Julian Day
    dt = date_time.date
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)

    # Chiron is asteroid number 2060
    # We use SEFLG_SWIEPH for Swiss Ephemeris
    # We also use SEFLG_SPEED to get velocity
    chiron_number = swe.CHIRON  # This is defined in swisseph

    # Calculate Chiron position
    result, flags = swe.calc_ut(jd, chiron_number, swe.FLG_SWIEPH | swe.FLG_SPEED)

    # Extract position data
    # result[0] = longitude
    # result[1] = latitude
    # result[2] = distance (in AU)
    # result[3] = speed in longitude (degrees per day)
    # result[4] = speed in latitude
    # result[5] = speed in distance
    longitude = result[0]
    latitude = result[1]
    distance_au = result[2]
    speed = result[3]

    # Determine if retrograde (negative speed means retrograde)
    is_retrograde = speed < 0

    # Get zodiac sign
    zodiac_sign = get_zodiac_sign(longitude)

    # Get interpretation
    interpretation = CHIRON_INTERPRETATIONS_RU[zodiac_sign]

    return ChironPosition(
        longitude=longitude,
        latitude=latitude,
        zodiac_sign=zodiac_sign,
        speed=speed,
        is_retrograde=is_retrograde,
        distance_au=distance_au,
        interpretation_ru=interpretation
    )


def is_chiron_return(birth_chiron_longitude: float, current_chiron_longitude: float, orb: float = 2.0) -> bool:
    """
    Check if Chiron is returning to its natal position (Chiron Return).

    Chiron Return happens around age 50-51 and marks a significant
    spiritual and healing milestone in life.

    Args:
        birth_chiron_longitude: Chiron longitude at birth
        current_chiron_longitude: Current Chiron longitude
        orb: Orb in degrees to consider (default 2°)

    Returns:
        True if Chiron is within orb of natal position

    Example:
        >>> birth_chiron = 125.5  # Chiron in Leo at birth
        >>> current_chiron = 126.0  # Current Chiron
        >>> is_return = is_chiron_return(birth_chiron, current_chiron)
        >>> if is_return:
        ...     print("Chiron Return is happening!")
    """
    from ..types import angle_difference

    # Calculate angular difference
    diff = angle_difference(birth_chiron_longitude, current_chiron_longitude)

    return diff <= orb

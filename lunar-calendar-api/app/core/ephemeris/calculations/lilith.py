"""
Black Moon Lilith calculation using Swiss Ephemeris.

Black Moon Lilith represents the lunar apogee - the point in the Moon's orbit
that is farthest from Earth. It symbolizes the shadow side, repressed desires,
and deep feminine power in astrology.

Three types of Lilith:
1. Mean Lilith: Averaged position (most commonly used)
2. True (Osculating) Lilith: Actual instantaneous apogee
3. Corrected (Waldemath) Lilith: Hypothetical dark moon
"""

from datetime import datetime
from typing import Dict
import swisseph as swe

from ..types import (
    DateTime,
    BlackMoonLilith,
    LilithType,
    ZodiacSignName,
    normalize_angle,
)




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


def calculate_black_moon_lilith(
    date_time: DateTime,
    lilith_type: LilithType = LilithType.MEAN
) -> BlackMoonLilith:
    """
    Calculate the position of Black Moon Lilith.

    Args:
        date_time: The date, time, and location for the calculation
        lilith_type: Type of Lilith to calculate (mean, true, or corrected)

    Returns:
        BlackMoonLilith object with position and interpretation

    Example:
        >>> from datetime import datetime
        >>> dt = DateTime(
        ...     date=datetime(2024, 1, 1, 12, 0),
        ...     timezone="UTC",
        ...     location=Location(latitude=55.7558, longitude=37.6173)
        ... )
        >>> lilith = calculate_black_moon_lilith(dt, LilithType.MEAN)
        >>> print(f"Lilith in {lilith.zodiac_sign}")
    """
    # Convert datetime to Julian Day
    dt = date_time.date
    jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)

    # Select the appropriate Lilith point based on type
    if lilith_type == LilithType.MEAN:
        # Mean Lilith (SE_OSCU_APOG with mean flag)
        # This is the most commonly used Lilith
        planet = swe.MEAN_APOG  # Mean lunar apogee
    elif lilith_type == LilithType.TRUE:
        # True/Osculating Lilith
        # The actual instantaneous apogee
        planet = swe.OSCU_APOG  # Osculating lunar apogee
    else:  # LilithType.CORRECTED
        # Waldemath Lilith (hypothetical dark moon)
        # Note: This is a hypothetical point, not astronomically confirmed
        # Using interpolated apogee as approximation
        planet = swe.INTP_APOG  # Interpolated apogee

    # Calculate Lilith position
    result, flags = swe.calc_ut(jd, planet, swe.FLG_SWIEPH)

    # Extract position data
    # result[0] = longitude
    # result[1] = latitude
    # result[2] = distance
    # result[3] = speed in longitude
    longitude = result[0]
    latitude = result[1]
    speed = result[3]

    # Get zodiac sign
    zodiac_sign = get_zodiac_sign(longitude)

    return BlackMoonLilith(
        lilith_type=lilith_type,
        longitude=longitude,
        latitude=latitude,
        zodiac_sign=zodiac_sign,
        speed=speed
    )


def calculate_all_liliths(date_time: DateTime) -> Dict[LilithType, BlackMoonLilith]:
    """
    Calculate all three types of Black Moon Lilith.

    This is useful for comparison and understanding the differences
    between Mean, True, and Corrected Lilith.

    Args:
        date_time: The date, time, and location for the calculation

    Returns:
        Dictionary with all three Lilith types

    Example:
        >>> dt = DateTime(datetime(2024, 1, 1, 12, 0), "UTC", Location(55.7558, 37.6173))
        >>> liliths = calculate_all_liliths(dt)
        >>> for lilith_type, lilith in liliths.items():
        ...     print(f"{lilith_type}: {lilith.longitude:.2f}° in {lilith.zodiac_sign}")
    """
    return {
        LilithType.MEAN: calculate_black_moon_lilith(date_time, LilithType.MEAN),
        LilithType.TRUE: calculate_black_moon_lilith(date_time, LilithType.TRUE),
        LilithType.CORRECTED: calculate_black_moon_lilith(date_time, LilithType.CORRECTED),
    }

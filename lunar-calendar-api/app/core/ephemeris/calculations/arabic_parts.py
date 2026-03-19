"""
Arabic Parts (Lots) calculation.

Arabic Parts are sensitive points calculated using specific formulas based on
the positions of planets and points in the chart. The most famous is the
Part of Fortune, but there are hundreds of other parts.

Formula structure: Ascendant + Planet1 - Planet2
(For nocturnal charts, the formula may be reversed)

Common Arabic Parts:
- Part of Fortune (Lot of Fortune): Material prosperity and physical health
- Part of Spirit (Lot of Spirit): Spiritual purpose and life direction
- Part of Eros: Passionate love and desire
- Part of Necessity: Fate and karma
"""

from datetime import datetime
from typing import Dict, Optional
import math

from ..types import (
    DateTime,
    Location,
    CelestialBody,
    ArabicPart,
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


def is_nocturnal_chart(sun_longitude: float, ascendant_longitude: float) -> bool:
    """
    Determine if a chart is nocturnal (night chart) or diurnal (day chart).

    A chart is nocturnal if the Sun is below the horizon, which means
    the Sun is in houses 1-6 (below the Ascendant-Descendant axis).

    Args:
        sun_longitude: Sun's ecliptic longitude
        ascendant_longitude: Ascendant longitude

    Returns:
        True if nocturnal, False if diurnal
    """
    # Calculate the angular distance from Ascendant to Sun
    # If Sun is 0-180° ahead of Ascendant (counter-clockwise), it's below horizon (night)
    diff = normalize_angle(sun_longitude - ascendant_longitude)
    return diff < 180


def calculate_arabic_part(
    name: str,
    ascendant: float,
    planet1: float,
    planet2: float,
    is_nocturnal: bool,
    reverse_formula_for_nocturnal: bool = False
) -> ArabicPart:
    """
    Calculate an Arabic Part using the standard formula.

    Standard formula (diurnal): Asc + Planet1 - Planet2
    Nocturnal formula (if reversed): Asc + Planet2 - Planet1

    Args:
        name: Name of the Arabic Part
        ascendant: Ascendant longitude in degrees
        planet1: First planet longitude in degrees
        planet2: Second planet longitude in degrees
        is_nocturnal: Whether this is a nocturnal chart
        reverse_formula_for_nocturnal: Whether to reverse the formula for night charts
        interpretation_ru: Russian interpretation

    Returns:
        ArabicPart object

    Example:
        >>> # Part of Fortune (day): Asc + Moon - Sun
        >>> part = calculate_arabic_part(
        ...     name="Part of Fortune",
        ...     ascendant=45.0,
        ...     planet1=120.0,  # Moon
        ...     planet2=90.0,   # Sun
        ...     is_nocturnal=False
        ... )
        >>> print(f"Part of Fortune: {part.longitude:.2f}°")
    """
    # Determine formula based on chart type
    if is_nocturnal and reverse_formula_for_nocturnal:
        # Reverse formula for nocturnal chart
        longitude = normalize_angle(ascendant + planet2 - planet1)
        formula = f"Asc + Planet2 - Planet1 (nocturnal)"
    else:
        # Standard formula
        longitude = normalize_angle(ascendant + planet1 - planet2)
        formula = f"Asc + Planet1 - Planet2"

    zodiac_sign = get_zodiac_sign(longitude)

    return ArabicPart(
        name=name,
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula=formula,
        is_nocturnal=is_nocturnal
    )


def calculate_part_of_fortune(
    ascendant: float,
    sun: float,
    moon: float,
    is_nocturnal: Optional[bool] = None
) -> ArabicPart:
    """
    Calculate the Part of Fortune (Pars Fortunae / Lot of Fortune).

    This is the most important Arabic Part, representing material
    prosperity, physical health, and worldly success.

    Day formula: Asc + Moon - Sun
    Night formula: Asc + Sun - Moon

    Args:
        ascendant: Ascendant longitude in degrees
        sun: Sun longitude in degrees
        moon: Moon longitude in degrees
        is_nocturnal: Whether this is a nocturnal chart (auto-detected if None)

    Returns:
        ArabicPart object for Part of Fortune

    Example:
        >>> part = calculate_part_of_fortune(
        ...     ascendant=45.0,
        ...     sun=90.0,
        ...     moon=120.0
        ... )
        >>> print(f"Part of Fortune in {part.zodiac_sign}")
    """
    # Auto-detect if nocturnal
    if is_nocturnal is None:
        is_nocturnal = is_nocturnal_chart(sun, ascendant)

    # Calculate using the appropriate formula
    if is_nocturnal:
        # Night: Asc + Sun - Moon
        longitude = normalize_angle(ascendant + sun - moon)
        formula = "Asc + Sun - Moon (nocturnal)"
    else:
        # Day: Asc + Moon - Sun
        longitude = normalize_angle(ascendant + moon - sun)
        formula = "Asc + Moon - Sun (diurnal)"

    zodiac_sign = get_zodiac_sign(longitude)
    return ArabicPart(
        name="Part of Fortune",
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula=formula,
        is_nocturnal=is_nocturnal
    )


def calculate_part_of_spirit(
    ascendant: float,
    sun: float,
    moon: float,
    is_nocturnal: Optional[bool] = None
) -> ArabicPart:
    """
    Calculate the Part of Spirit (Pars Spiritus / Lot of Spirit).

    This represents spiritual purpose, life direction, and inner fulfillment.
    It's the mirror of the Part of Fortune.

    Day formula: Asc + Sun - Moon
    Night formula: Asc + Moon - Sun

    Args:
        ascendant: Ascendant longitude in degrees
        sun: Sun longitude in degrees
        moon: Moon longitude in degrees
        is_nocturnal: Whether this is a nocturnal chart (auto-detected if None)

    Returns:
        ArabicPart object for Part of Spirit
    """
    # Auto-detect if nocturnal
    if is_nocturnal is None:
        is_nocturnal = is_nocturnal_chart(sun, ascendant)

    # Calculate (opposite of Part of Fortune)
    if is_nocturnal:
        # Night: Asc + Moon - Sun
        longitude = normalize_angle(ascendant + moon - sun)
        formula = "Asc + Moon - Sun (nocturnal)"
    else:
        # Day: Asc + Sun - Moon
        longitude = normalize_angle(ascendant + sun - moon)
        formula = "Asc + Sun - Moon (diurnal)"

    zodiac_sign = get_zodiac_sign(longitude)
    return ArabicPart(
        name="Part of Spirit",
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula=formula,
        is_nocturnal=is_nocturnal
    )


def calculate_part_of_eros(
    ascendant: float,
    venus: float,
    mars: float,
    is_nocturnal: bool = False
) -> ArabicPart:
    """
    Calculate the Part of Eros (Passionate Love).

    Formula: Asc + Venus - Mars

    Args:
        ascendant: Ascendant longitude
        venus: Venus longitude
        mars: Mars longitude
        is_nocturnal: Whether this is a nocturnal chart

    Returns:
        ArabicPart for Part of Eros
    """
    longitude = normalize_angle(ascendant + venus - mars)
    zodiac_sign = get_zodiac_sign(longitude)

    return ArabicPart(
        name="Part of Eros",
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula="Asc + Venus - Mars",
        is_nocturnal=is_nocturnal
    )

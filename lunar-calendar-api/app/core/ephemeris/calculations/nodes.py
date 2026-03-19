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
        is_retrograde=is_retrograde
    )

    # Create South Node (Ketu)
    south_node = LunarNode(
        name="Ketu",
        longitude=south_longitude,
        latitude=0.0,  # Nodes are always on the ecliptic
        zodiac_sign=south_sign,
        speed=north_speed,  # Same speed as north node
        is_retrograde=is_retrograde
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
        is_retrograde=True
    )

    south_node = LunarNode(
        name="Ketu",
        longitude=south_longitude,
        latitude=0.0,
        zodiac_sign=south_sign,
        speed=north_speed,
        is_retrograde=True
    )

    return LunarNodes(
        north_node=north_node,
        south_node=south_node
    )

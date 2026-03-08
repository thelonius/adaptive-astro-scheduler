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


# Russian interpretations for Part of Fortune in each zodiac sign
PART_OF_FORTUNE_INTERPRETATIONS_RU: Dict[ZodiacSignName, str] = {
    ZodiacSignName.ARIES: "Парс Фортуны в Овне: Удача через инициативу, смелость и независимые действия. Успех в лидерстве.",
    ZodiacSignName.TAURUS: "Парс Фортуны в Тельце: Удача через стабильность, накопление и наслаждение жизнью. Успех в материальном мире.",
    ZodiacSignName.GEMINI: "Парс Фортуны в Близнецах: Удача через общение, обучение и многозадачность. Успех в интеллектуальной сфере.",
    ZodiacSignName.CANCER: "Парс Фортуны в Раке: Удача через заботу, семью и эмоциональные связи. Успех в домашней сфере.",
    ZodiacSignName.LEO: "Парс Фортуны во Льве: Удача через творчество, самовыражение и щедрость. Успех через признание.",
    ZodiacSignName.VIRGO: "Парс Фортуны в Деве: Удача через служение, внимание к деталям и совершенствование. Успех в работе.",
    ZodiacSignName.LIBRA: "Парс Фортуны в Весах: Удача через партнерство, дипломатию и гармонию. Успех в отношениях.",
    ZodiacSignName.SCORPIO: "Парс Фортуны в Скорпионе: Удача через трансформацию, глубину и регенерацию. Успех через кризисы.",
    ZodiacSignName.SAGITTARIUS: "Парс Фортуны в Стрельце: Удача через философию, путешествия и расширение. Успех в образовании.",
    ZodiacSignName.CAPRICORN: "Парс Фортуны в Козероге: Удача через дисциплину, достижения и ответственность. Успех в карьере.",
    ZodiacSignName.AQUARIUS: "Парс Фортуны в Водолее: Удача через инновации, дружбу и уникальность. Успех в группах.",
    ZodiacSignName.PISCES: "Парс Фортуны в Рыбах: Удача через сострадание, интуицию и духовность. Успех через служение.",
}

PART_OF_SPIRIT_INTERPRETATIONS_RU: Dict[ZodiacSignName, str] = {
    ZodiacSignName.ARIES: "Парс Духа в Овне: Духовная цель через пионерство, храбрость и независимость.",
    ZodiacSignName.TAURUS: "Парс Духа в Тельце: Духовная цель через стабильность, красоту и ценности.",
    ZodiacSignName.GEMINI: "Парс Духа в Близнецах: Духовная цель через знания, общение и связи.",
    ZodiacSignName.CANCER: "Парс Духа в Раке: Духовная цель через заботу, эмоции и семью.",
    ZodiacSignName.LEO: "Парс Духа во Льве: Духовная цель через творчество, самовыражение и радость.",
    ZodiacSignName.VIRGO: "Парс Духа в Деве: Духовная цель через служение, исцеление и совершенство.",
    ZodiacSignName.LIBRA: "Парс Духа в Весах: Духовная цель через гармонию, справедливость и партнерство.",
    ZodiacSignName.SCORPIO: "Парс Духа в Скорпионе: Духовная цель через трансформацию, силу и глубину.",
    ZodiacSignName.SAGITTARIUS: "Парс Духа в Стрельце: Духовная цель через мудрость, истину и расширение.",
    ZodiacSignName.CAPRICORN: "Парс Духа в Козероге: Духовная цель через мастерство, структуру и наследие.",
    ZodiacSignName.AQUARIUS: "Парс Духа в Водолее: Духовная цель через инновации, свободу и человечество.",
    ZodiacSignName.PISCES: "Парс Духа в Рыбах: Духовная цель через сострадание, единство и духовность.",
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
    reverse_formula_for_nocturnal: bool = False,
    interpretation_ru: str = ""
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
        is_nocturnal=is_nocturnal,
        interpretation_ru=interpretation_ru
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
    interpretation = PART_OF_FORTUNE_INTERPRETATIONS_RU[zodiac_sign]

    return ArabicPart(
        name="Part of Fortune",
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula=formula,
        is_nocturnal=is_nocturnal,
        interpretation_ru=interpretation
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
    interpretation = PART_OF_SPIRIT_INTERPRETATIONS_RU[zodiac_sign]

    return ArabicPart(
        name="Part of Spirit",
        longitude=longitude,
        zodiac_sign=zodiac_sign,
        formula=formula,
        is_nocturnal=is_nocturnal,
        interpretation_ru=interpretation
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
        is_nocturnal=is_nocturnal,
        interpretation_ru=f"Парс Эроса в {zodiac_sign.value}: Страстная любовь и желание проявляются через энергию этого знака."
    )

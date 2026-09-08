"""
Navamsa (D9) Engine — Vedic 9th divisional chart.

Each sign is divided into 9 parts of 3°20'. The starting sign for navamsa
sequence depends on sign modality (movable/fixed/dual).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.calculators._swe_import import HAS_SWE, swe
from app.calculators.ephemeris_core import ephemeris_core
from app.calculators.chart_points import get_extra_point_longitude

NAVAMSA_SPAN = 30.0 / 9.0  # 3°20'

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

CHARA_SIGNS = {0, 3, 6, 9}
STHIRA_SIGNS = {1, 4, 7, 10}

JYOTISH_BODIES = [
    "Sun", "Moon", "Mars", "Mercury", "Jupiter",
    "Venus", "Saturn", "Rahu", "Ketu",
]

SWE_BODY_MAP = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
}


class NavamsaEngine:
    """Computes D1 (Rashi) and D9 (Navamsa) sidereal positions."""

    def __init__(self) -> None:
        self.core = ephemeris_core

    @staticmethod
    def longitude_to_sign_data(lon: float) -> Dict[str, Any]:
        lon = lon % 360.0
        sign_index = int(lon / 30) % 12
        return {
            "longitude": round(lon, 4),
            "sign": ZODIAC_SIGNS[sign_index],
            "sign_id": sign_index + 1,
            "sign_degree": round(lon % 30, 4),
        }

    @staticmethod
    def navamsa_from_sidereal(sidereal_lon: float) -> Dict[str, Any]:
        """Map sidereal longitude to D9 sign and degree."""
        sidereal_lon = sidereal_lon % 360.0
        sign_index = int(sidereal_lon / 30) % 12
        degree_in_sign = sidereal_lon % 30.0

        navamsa_index = min(8, int(degree_in_sign / NAVAMSA_SPAN))
        navamsa_number = navamsa_index + 1

        if sign_index in CHARA_SIGNS:
            base_sign = sign_index
        elif sign_index in STHIRA_SIGNS:
            base_sign = (sign_index + 8) % 12
        else:
            base_sign = (sign_index + 4) % 12

        d9_sign_index = (base_sign + navamsa_index) % 12
        fraction_in_navamsa = (degree_in_sign % NAVAMSA_SPAN) / NAVAMSA_SPAN
        d9_degree_in_sign = fraction_in_navamsa * 30.0
        d9_longitude = d9_sign_index * 30.0 + d9_degree_in_sign

        return {
            "longitude": round(d9_longitude, 4),
            "sign": ZODIAC_SIGNS[d9_sign_index],
            "sign_id": d9_sign_index + 1,
            "sign_degree": round(d9_degree_in_sign, 4),
            "navamsa_number": navamsa_number,
        }

    def _tropical_to_sidereal(self, tropical_lon: float, dt: datetime) -> float:
        if not HAS_SWE:
            return tropical_lon % 360.0
        tjd = self.core.get_swe_julian_day(dt)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayanamsa = swe.get_ayanamsa_ut(tjd)
        return (tropical_lon - ayanamsa) % 360.0

    def _get_sidereal_longitude(self, body: str, dt: datetime) -> float:
        if body == "Rahu":
            lon = get_extra_point_longitude("Rahu", dt)
            if lon is not None:
                return self._tropical_to_sidereal(lon, dt)
        if body == "Ketu":
            lon = get_extra_point_longitude("Ketu", dt)
            if lon is not None:
                return self._tropical_to_sidereal(lon, dt)

        if not HAS_SWE:
            raise RuntimeError("PySwisseph not installed")

        tjd = self.core.get_swe_julian_day(dt)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        planet_id = SWE_BODY_MAP.get(body)
        if planet_id is None:
            raise ValueError(f"Unknown body: {body}")

        result, _ = swe.calc_ut(tjd, planet_id, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        return result[0] % 360.0

    def _get_ayanamsa(self, dt: datetime) -> float:
        if not HAS_SWE:
            return 0.0
        tjd = self.core.get_swe_julian_day(dt)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        return round(swe.get_ayanamsa_ut(tjd), 4)

    def calculate(
        self,
        birth_dt: datetime,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        """Full D1 + D9 chart for classical Jyotish grahas."""
        ayanamsa = self._get_ayanamsa(birth_dt)
        planets: Dict[str, Dict[str, Any]] = {}

        for body in JYOTISH_BODIES:
            sidereal_lon = self._get_sidereal_longitude(body, birth_dt)
            d1 = self.longitude_to_sign_data(sidereal_lon)
            d9 = self.navamsa_from_sidereal(sidereal_lon)

            planets[body] = {
                "d1": d1,
                "d9": d9,
                "is_vargottama": d1["sign"] == d9["sign"],
            }

        vargottama_planets = [b for b, data in planets.items() if data["is_vargottama"]]

        return {
            "meta": {
                "birth_datetime_utc": birth_dt.isoformat(),
                "latitude": latitude,
                "longitude": longitude,
                "ayanamsa": ayanamsa,
                "ayanamsa_type": "Lahiri",
                "varga": "D9",
                "varga_name": "Navamsa",
            },
            "planets": planets,
            "vargottama_planets": vargottama_planets,
        }


navamsa_engine = NavamsaEngine()

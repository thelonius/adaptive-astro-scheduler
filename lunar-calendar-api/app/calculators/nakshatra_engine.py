"""Vedic Moon nakshatra calculations using Lahiri sidereal zodiac."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from app.calculators._swe_import import HAS_SWE, swe
from app.calculators.ephemeris_core import ephemeris_core

NAKSHATRA_SIZE = 360.0 / 27.0
PADA_SIZE = NAKSHATRA_SIZE / 4.0


class NakshatraEngine:
    """Calculates Moon nakshatra (lunar mansion) with pada and gandanta."""

    def __init__(self) -> None:
        self.core = ephemeris_core
        self.nakshatras: List[Dict[str, Any]] = self._load_nakshatras()

    def _load_nakshatras(self) -> List[Dict[str, Any]]:
        data_path = Path(__file__).parent.parent / "data" / "nakshatras.json"
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data["nakshatras"]

    def _is_gandanta(self, sidereal_lon: float) -> bool:
        """Gandanta zones at water-fire junctions and Revati-Ashwini cusp."""
        if sidereal_lon >= 359.2 or sidereal_lon <= 0.8:
            return True
        for zone_start, zone_end in [(119.2, 120.8), (239.2, 240.8)]:
            if zone_start <= sidereal_lon <= zone_end:
                return True
        return False

    def get_moon_nakshatra(self, dt: datetime) -> Dict[str, Any]:
        """Return Moon nakshatra with pada, sidereal longitude, and ayanamsa."""
        if not HAS_SWE:
            fallback = self.nakshatras[0]
            return {
                "nakshatra_id": fallback["id"],
                "name": fallback["name"],
                "name_ru": fallback["name_ru"],
                "ruler": fallback["ruler"],
                "symbol": fallback["symbol"],
                "pada": 1,
                "sidereal_longitude": 0.0,
                "degree_in_nakshatra": 0.0,
                "ayanamsa": 0.0,
                "is_gandanta": False,
                "error": "PySwisseph not installed",
            }

        tjd = self.core.get_swe_julian_day(dt)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        result, _ret = swe.calc_ut(tjd, swe.MOON, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
        sidereal_lon = result[0] % 360.0
        ayanamsa = swe.get_ayanamsa_ut(tjd)

        nakshatra_index = int(sidereal_lon / NAKSHATRA_SIZE)
        if nakshatra_index >= len(self.nakshatras):
            nakshatra_index = len(self.nakshatras) - 1

        degree_in_nakshatra = sidereal_lon % NAKSHATRA_SIZE
        pada = int(degree_in_nakshatra / PADA_SIZE) + 1
        pada = min(4, max(1, pada))

        nakshatra = self.nakshatras[nakshatra_index]

        return {
            "nakshatra_id": nakshatra["id"],
            "name": nakshatra["name"],
            "name_ru": nakshatra["name_ru"],
            "ruler": nakshatra["ruler"],
            "symbol": nakshatra["symbol"],
            "pada": pada,
            "sidereal_longitude": round(sidereal_lon, 4),
            "degree_in_nakshatra": round(degree_in_nakshatra, 4),
            "ayanamsa": round(ayanamsa, 4),
            "is_gandanta": self._is_gandanta(sidereal_lon),
        }


nakshatra_engine = NakshatraEngine()

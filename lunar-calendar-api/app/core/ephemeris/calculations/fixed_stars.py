"""
Fixed stars calculation using Swiss Ephemeris fixstar2_ut / fixstar_ut.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.calculators._swe_import import HAS_SWE, swe

from ..types import ZodiacSignName, normalize_angle
from .chiron import get_zodiac_sign

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "fixed_stars.json"
_STAR_CATALOG: Optional[List[dict]] = None


@dataclass
class FixedStarPosition:
    """Ecliptic position of a fixed star."""

    id: str
    name: str
    swe_name: str
    longitude: float
    latitude: float
    zodiac_sign: ZodiacSignName
    magnitude: Optional[float] = None
    nature: Optional[str] = None


def _ensure_swe_ephe_path() -> None:
    candidates = []
    env_dir = os.environ.get("EPHEMERIS_DATA_DIR")
    if env_dir:
        candidates.append(os.path.join(env_dir, "swisseph"))
    env_swe = os.environ.get("SWISSEPH_DATA")
    if env_swe:
        candidates.append(env_swe)
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(here, "..", "..", "..", ".."))
    candidates.append(os.path.join(repo_root, "swisseph_data"))
    for d in candidates:
        try:
            if os.path.isdir(d):
                swe.set_ephe_path(d)
                return
        except Exception:
            continue


def _load_star_catalog() -> List[dict]:
    global _STAR_CATALOG
    if _STAR_CATALOG is None:
        with _DATA_PATH.open(encoding="utf-8") as fh:
            data = json.load(fh)
        _STAR_CATALOG = list(data.get("stars") or [])
    return _STAR_CATALOG


def _fixstar_position(swe_name: str, jd: float) -> Optional[tuple]:
    """Return (longitude, latitude) or None if the star cannot be calculated."""
    flags = swe.FLG_SWIEPH
    for fn_name in ("fixstar2_ut", "fixstar_ut"):
        fn = getattr(swe, fn_name, None)
        if fn is None:
            continue
        try:
            result = fn(swe_name, jd, flags)
            coords = result[0] if isinstance(result, tuple) else result
            longitude = float(coords[0]) % 360
            latitude = float(coords[1])
            return longitude, latitude
        except Exception:
            continue
    return None


def calculate_fixed_stars(dt: datetime) -> List[FixedStarPosition]:
    """
    Calculate ecliptic positions for catalogued fixed stars at `dt`.

    Stars that Swiss Ephemeris cannot resolve are skipped.
    """
    if not HAS_SWE:
        return []

    _ensure_swe_ephe_path()

    if dt.tzinfo is None:
        import pytz

        dt = dt.replace(tzinfo=pytz.UTC)

    jd = swe.julday(
        dt.year,
        dt.month,
        dt.day,
        dt.hour + dt.minute / 60.0 + dt.second / 3600.0 + dt.microsecond / 3_600_000_000.0,
        swe.GREG_CAL,
    )

    positions: List[FixedStarPosition] = []
    for entry in _load_star_catalog():
        swe_name = entry.get("swe_name")
        if not swe_name:
            continue

        coords = _fixstar_position(swe_name, jd)
        if coords is None:
            logger.debug("Skipping fixed star %s: swe lookup failed", swe_name)
            continue

        longitude, latitude = coords
        positions.append(
            FixedStarPosition(
                id=str(entry.get("id", entry.get("name", swe_name))),
                name=str(entry.get("name", swe_name)),
                swe_name=swe_name,
                longitude=normalize_angle(longitude),
                latitude=latitude,
                zodiac_sign=get_zodiac_sign(longitude),
                magnitude=entry.get("magnitude"),
                nature=entry.get("nature"),
            )
        )

    return positions

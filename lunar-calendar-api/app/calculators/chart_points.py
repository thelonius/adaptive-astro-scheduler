"""
Синхронный доступ к доп. точкам карты (узлы, Лилит, Хирон).

Логика совпадает с SkyfieldEphemerisAdapter.get_chart_points — нужна
калькуляторам, которые не ходят в async-адаптер (transit_engine, chart_service).
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from app.calculators._swe_import import swe, HAS_SWE

# Имена в том же регистре, что CHART_BODIES / TRANSITING_BODIES
DEFAULT_EXTRA_CHART_BODIES: Tuple[str, ...] = ("Rahu", "Ketu", "Lilith", "Chiron")


def _ensure_swe_ephe_path() -> None:
    candidates = []
    env_dir = os.environ.get("EPHEMERIS_DATA_DIR")
    if env_dir:
        candidates.append(os.path.join(env_dir, "swisseph"))
    env_swe = os.environ.get("SWISSEPH_DATA")
    if env_swe:
        candidates.append(env_swe)
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(here, "..", ".."))
    candidates.append(os.path.join(repo_root, "swisseph_data"))
    for d in candidates:
        try:
            if os.path.isdir(d):
                swe.set_ephe_path(d)
                return
        except Exception:
            continue


def get_extra_point_longitude(name: str, dt: datetime) -> Optional[float]:
    """Эклиптическая долгота доп. точки или None, если swe недоступен/ошибка."""
    if not HAS_SWE or name not in DEFAULT_EXTRA_CHART_BODIES:
        return None

    _ensure_swe_ephe_path()
    if dt.tzinfo is None:
        import pytz
        dt = dt.replace(tzinfo=pytz.UTC)

    jd = swe.julday(
        dt.year, dt.month, dt.day,
        dt.hour + dt.minute / 60.0 + dt.second / 3600.0,
        swe.GREG_CAL,
    )
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED

    try:
        if name == "Ketu":
            res, _ = swe.calc_ut(jd, swe.MEAN_NODE, flags)
            return (res[0] + 180) % 360
        if name == "Rahu":
            res, _ = swe.calc_ut(jd, swe.MEAN_NODE, flags)
            return res[0] % 360
        if name == "Lilith":
            res, _ = swe.calc_ut(jd, swe.MEAN_APOG, flags)
            return res[0] % 360
        if name == "Chiron":
            res, _ = swe.calc_ut(jd, swe.CHIRON, flags)
            return res[0] % 360
    except Exception:
        return None
    return None


def get_extra_point_sign(name: str, dt: datetime) -> Optional[Dict]:
    """Знак и градус в знаке — для chart_service."""
    lon = get_extra_point_longitude(name, dt)
    if lon is None:
        return None
    sign_index = int(lon / 30)
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]
    return {
        "sign": signs[sign_index],
        "sign_id": sign_index + 1,
        "degree": round(lon % 30, 2),
    }


def collect_extra_chart_bodies(dt: datetime) -> Dict[str, Dict]:
    """Все доступные доп. точки в формате chart_service planets_data."""
    result: Dict[str, Dict] = {}
    for name in DEFAULT_EXTRA_CHART_BODIES:
        lon = get_extra_point_longitude(name, dt)
        if lon is None:
            continue
        sign_data = get_extra_point_sign(name, dt)
        if not sign_data:
            continue
        result[name] = {
            "longitude": round(lon, 4),
            "sign": sign_data["sign"],
            "sign_id": sign_data["sign_id"],
            "sign_degree": sign_data["degree"],
            "is_retrograde": name in ("Rahu", "Ketu"),
            "house": None,
        }
    return result

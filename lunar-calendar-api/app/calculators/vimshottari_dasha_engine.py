"""
Vimshottari Dasha Engine — 120-year Vedic planetary period system.

Based on the Moon's nakshatra at birth (Lahiri sidereal). Each nakshatra ruler
determines the starting mahadasha; the balance depends on how far the Moon has
progressed through that nakshatra.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.calculators.nakshatra_engine import NAKSHATRA_SIZE, nakshatra_engine

VIMSHOTTARI: List[Tuple[str, float]] = [
    ("Ketu", 7.0),
    ("Venus", 20.0),
    ("Sun", 6.0),
    ("Moon", 10.0),
    ("Mars", 7.0),
    ("Rahu", 18.0),
    ("Jupiter", 16.0),
    ("Saturn", 19.0),
    ("Mercury", 17.0),
]

TOTAL_CYCLE_YEARS = sum(y for _, y in VIMSHOTTARI)
LORD_YEARS: Dict[str, float] = {lord: years for lord, years in VIMSHOTTARI}
LORD_ORDER: List[str] = [lord for lord, _ in VIMSHOTTARI]

DAYS_PER_YEAR = 365.242199


def _lord_index(lord: str) -> int:
    return LORD_ORDER.index(lord)


def _next_lord(lord: str) -> str:
    return LORD_ORDER[(_lord_index(lord) + 1) % len(LORD_ORDER)]


def _add_years(dt: datetime, years: float) -> datetime:
    return dt + timedelta(days=years * DAYS_PER_YEAR)


def _period_progress(start: datetime, end: datetime, query: datetime) -> float:
    total = (end - start).total_seconds()
    if total <= 0:
        return 100.0
    elapsed = (query - start).total_seconds()
    return round(min(100.0, max(0.0, elapsed / total * 100)), 2)


def _compute_antardashas(
    mahadasha_lord: str,
    mahadasha_start: datetime,
    mahadasha_years: float,
) -> List[Dict[str, Any]]:
    antardashas: List[Dict[str, Any]] = []
    cursor = mahadasha_start
    start_idx = _lord_index(mahadasha_lord)

    for i in range(len(LORD_ORDER)):
        lord = LORD_ORDER[(start_idx + i) % len(LORD_ORDER)]
        duration_years = (LORD_YEARS[lord] / TOTAL_CYCLE_YEARS) * mahadasha_years
        end = _add_years(cursor, duration_years)
        antardashas.append({
            "lord": lord,
            "start": cursor.isoformat(),
            "end": end.isoformat(),
            "duration_years": round(duration_years, 4),
        })
        cursor = end

    return antardashas


def _find_active_period(
    periods: List[Dict[str, Any]],
    query: datetime,
) -> Optional[Dict[str, Any]]:
    for period in periods:
        start = datetime.fromisoformat(period["start"])
        end = datetime.fromisoformat(period["end"])
        if start <= query < end:
            return {
                **period,
                "progress_pct": _period_progress(start, end, query),
            }
    return None


class VimshottariDashaEngine:
    """Computes Vimshottari mahadasha timeline and current running periods."""

    def calculate(
        self,
        birth_dt: datetime,
        query_dt: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        if query_dt is None:
            query_dt = datetime.utcnow().replace(tzinfo=birth_dt.tzinfo)

        nak = nakshatra_engine.get_moon_nakshatra(birth_dt)
        birth_lord = nak["ruler"]

        degree_in_nak = nak["degree_in_nakshatra"]
        remaining_fraction = 1.0 - (degree_in_nak / NAKSHATRA_SIZE)
        balance_years = remaining_fraction * LORD_YEARS[birth_lord]

        mahadashas: List[Dict[str, Any]] = []
        cursor = birth_dt
        current_lord = birth_lord
        is_first = True

        for _cycle in range(2):
            lord = current_lord
            while True:
                duration = balance_years if is_first else LORD_YEARS[lord]
                is_first = False
                end = _add_years(cursor, duration)

                antardashas = _compute_antardashas(lord, cursor, duration)
                mahadashas.append({
                    "lord": lord,
                    "start": cursor.isoformat(),
                    "end": end.isoformat(),
                    "duration_years": round(duration, 4),
                    "antardashas": antardashas,
                })

                cursor = end
                lord = _next_lord(lord)

                if len(mahadashas) >= 18:
                    break
            if len(mahadashas) >= 18:
                break
            current_lord = lord

        active_maha = _find_active_period(mahadashas, query_dt)
        active_antar: Optional[Dict[str, Any]] = None
        if active_maha:
            active_antar = _find_active_period(active_maha["antardashas"], query_dt)

        return {
            "meta": {
                "birth_datetime_utc": birth_dt.isoformat(),
                "query_datetime_utc": query_dt.isoformat(),
                "ayanamsa_type": "Lahiri",
                "system": "Vimshottari",
            },
            "birth_nakshatra": {
                "id": nak["nakshatra_id"],
                "name": nak["name"],
                "name_ru": nak["name_ru"],
                "ruler": nak["ruler"],
                "pada": nak["pada"],
                "sidereal_longitude": nak["sidereal_longitude"],
            },
            "birth_dasha_lord": birth_lord,
            "birth_dasha_balance_years": round(balance_years, 4),
            "current": {
                "mahadasha": active_maha,
                "antardasha": active_antar,
            },
            "mahadashas": mahadashas,
        }


vimshottari_dasha_engine = VimshottariDashaEngine()

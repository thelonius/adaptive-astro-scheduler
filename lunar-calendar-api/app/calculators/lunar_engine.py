from datetime import datetime, timedelta
import pytz

from app.calculators._swe_import import swe, HAS_SWE

from app.calculators.ephemeris_core import ephemeris_core


class LunarEngine:
    """
    Handles astrological and astronomical calculations specific to the Moon.
    Provides Mansions (Nakshatras), Void of Course, and Zodiac signs.
    """

    # Traditional planets for VoC (no outer planets in strict tradition)
    VOC_PLANETS = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]

    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]

    def __init__(self):
        self.core = ephemeris_core

    def get_moon_longitude(self, dt: datetime) -> float:
        """Gets the exact ecliptic longitude of the moon."""
        pos = self.core.get_planet_position('Moon', dt)
        return pos[0]  # Longitude in degrees (0-360)

    def get_zodiac_sign(self, dt: datetime) -> dict:
        """
        Calculates the tropical zodiac sign the Moon is currently in.
        Returns sign info and degree within that sign.
        """
        lon = self.get_moon_longitude(dt)
        sign_index = int(lon / 30)
        degree_in_sign = lon % 30

        return {
            "sign": self.SIGNS[sign_index],
            "sign_id": sign_index + 1,
            "degree": round(degree_in_sign, 2),
            "absolute_degree": round(lon, 2)
        }

    def get_lunar_mansion(self, dt: datetime, system: str = "vedic") -> dict:
        """
        Calculates the Lunar Mansion (Nakshatra).
        Currently supports the 27 Vedic Nakshatras using Lahiri Ayanamsa.
        """
        if not HAS_SWE:
            return {
                "system": system,
                "mansion_id": 1,
                "progress_percentage": 0.0,
                "degree_in_mansion": 0.0,
                "is_gandanta": False,
                "error": "PySwisseph not installed"
            }

        if system == "vedic":
            tjd = self.core.get_swe_julian_day(dt)
            swe.set_sid_mode(swe.SIDM_LAHIRI)
            result, ret = swe.calc_ut(tjd, swe.MOON, swe.FLG_SIDEREAL | swe.FLG_SWIEPH)
            sidereal_lon = result[0]

            mansion_size = 360.0 / 27.0
            nakshatra_index = int(sidereal_lon / mansion_size)
            degree_in_mansion = sidereal_lon % mansion_size
            progress_pct = (degree_in_mansion / mansion_size) * 100

            return {
                "system": "vedic",
                "mansion_id": nakshatra_index + 1,
                "progress_percentage": round(progress_pct, 2),
                "degree_in_mansion": round(degree_in_mansion, 2),
                "is_gandanta": self._is_gandanta(sidereal_lon)
            }
        else:
            raise NotImplementedError(f"Mansion system '{system}' not yet implemented.")

    def _is_gandanta(self, sidereal_lon: float) -> bool:
        """Checks if the Moon is in a Gandanta (karmic knot) zone."""
        if sidereal_lon >= 359.2 or sidereal_lon <= 0.8:
            return True
        for zone_start, zone_end in [(119.2, 120.8), (239.2, 240.8)]:
            if zone_start <= sidereal_lon <= zone_end:
                return True
        return False

    # ──────────────────────────────────────────────────────────────────────
    # VOID OF COURSE MOON  (Sprint 2)
    # ──────────────────────────────────────────────────────────────────────

    def _moon_sign_index(self, dt: datetime) -> int:
        """Returns the 0-based sign index (0=Aries … 11=Pisces) of the Moon."""
        return int(self.get_moon_longitude(dt) / 30.0)

    def _find_next_moon_ingress(self, from_dt: datetime, max_days: int = 4) -> datetime | None:
        """
        Binary-searches for the next moment when the Moon changes zodiac sign.
        The Moon changes sign every ~2.5 days, so max_days=4 is always enough.
        Returns the ingress time with ~1-minute precision.
        """
        step = timedelta(hours=1)
        dt = from_dt
        end = from_dt + timedelta(days=max_days)
        sign_now = self._moon_sign_index(dt)

        while dt < end:
            dt += step
            if self._moon_sign_index(dt) != sign_now:
                t_before = dt - step
                t_after = dt
                # Binary refine to ~1 minute
                while (t_after - t_before).total_seconds() > 60:
                    t_mid = t_before + (t_after - t_before) / 2
                    if self._moon_sign_index(t_mid) == sign_now:
                        t_before = t_mid
                    else:
                        t_after = t_mid
                return t_after

        return None

    def _find_last_moon_aspect_before(self, ingress_dt: datetime) -> dict | None:
        """
        Scans backward from a Moon ingress to find the last exact major aspect
        the Moon made to any traditional planet while still in the previous sign.

        Returns the latest zero-crossing of (angle - target_angle) before ingress_dt.
        """
        from app.calculators.aspect_engine import AspectEngine

        MAJOR_ASPECTS = {
            "conjunction": 0,
            "sextile": 60,
            "square": 90,
            "trine": 120,
            "opposition": 180,
        }

        search_start = ingress_dt - timedelta(days=4)
        step = timedelta(hours=2)

        last_aspect_time = None
        last_aspect_info = None

        for planet in self.VOC_PLANETS:
            for asp_name, target_angle in MAJOR_ASPECTS.items():
                t = search_start
                prev_diff = None

                while t <= ingress_dt:
                    moon_lon = self.get_moon_longitude(t)
                    planet_lon = self.core.get_planet_position(planet, t)[0]
                    actual_angle = AspectEngine.angular_distance(moon_lon, planet_lon)
                    curr_diff = actual_angle - target_angle

                    if prev_diff is not None and prev_diff * curr_diff < 0:
                        exact_t = self._refine_aspect_crossing(
                            planet, target_angle,
                            t - step, t,
                            precision_seconds=60
                        )
                        if exact_t < ingress_dt:
                            if last_aspect_time is None or exact_t > last_aspect_time:
                                last_aspect_time = exact_t
                                last_aspect_info = {
                                    "planet": planet,
                                    "aspect": asp_name,
                                    "target_angle": target_angle,
                                    "exact_at": exact_t,
                                }

                    prev_diff = curr_diff
                    t += step

        return last_aspect_info

    def _refine_aspect_crossing(
        self,
        planet: str,
        target_angle: float,
        t_start: datetime,
        t_end: datetime,
        precision_seconds: int = 60,
    ) -> datetime:
        """Binary search for the exact moment an angular crossing occurred."""
        from app.calculators.aspect_engine import AspectEngine

        while (t_end - t_start).total_seconds() > precision_seconds:
            t_mid = t_start + (t_end - t_start) / 2

            moon_mid = self.get_moon_longitude(t_mid)
            planet_mid = self.core.get_planet_position(planet, t_mid)[0]
            diff_mid = AspectEngine.angular_distance(moon_mid, planet_mid) - target_angle

            moon_s = self.get_moon_longitude(t_start)
            planet_s = self.core.get_planet_position(planet, t_start)[0]
            diff_start = AspectEngine.angular_distance(moon_s, planet_s) - target_angle

            if diff_start * diff_mid < 0:
                t_end = t_mid
            else:
                t_start = t_mid

        return t_start + (t_end - t_start) / 2

    def find_void_of_course_windows(
        self,
        start_dt: datetime,
        end_dt: datetime,
    ) -> list:
        """
        Finds all Void of Course Moon windows within a date range.

        A VoC window begins at the last exact major aspect the Moon makes
        to a traditional planet (Sun, Mercury, Venus, Mars, Jupiter, Saturn)
        and ends when the Moon enters the next zodiac sign.

        Returns a list of dicts:
        {
            "voc_start":      datetime,
            "voc_end":        datetime,
            "duration_hours": float,
            "last_aspect":    {"planet": str, "aspect": str, "exact_at": datetime},
            "new_sign":       str
        }
        """
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=pytz.UTC)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=pytz.UTC)

        windows = []
        cursor = start_dt

        while cursor < end_dt:
            ingress_dt = self._find_next_moon_ingress(cursor)
            if ingress_dt is None or ingress_dt > end_dt:
                break

            new_sign = self.SIGNS[self._moon_sign_index(ingress_dt)]
            last_asp = self._find_last_moon_aspect_before(ingress_dt)

            if last_asp is not None:
                voc_start = last_asp["exact_at"]
                voc_end = ingress_dt
                duration_h = (voc_end - voc_start).total_seconds() / 3600

                if voc_start >= start_dt:
                    windows.append({
                        "voc_start": voc_start,
                        "voc_end": voc_end,
                        "duration_hours": round(duration_h, 2),
                        "last_aspect": {
                            "planet": last_asp["planet"],
                            "aspect": last_asp["aspect"],
                            "exact_at": last_asp["exact_at"],
                        },
                        "new_sign": new_sign,
                    })

            cursor = ingress_dt + timedelta(minutes=30)

        return windows


lunar_engine = LunarEngine()

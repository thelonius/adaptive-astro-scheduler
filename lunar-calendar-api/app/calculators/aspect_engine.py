"""
Aspect Engine — Sprint 1 ⭐ Foundation Module

Calculates angular relationships (aspects) between any two celestial bodies.
This is the most critical new engine: VoC Moon, Transits, and Progressions
all depend on it.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
from pathlib import Path

from app.calculators.ephemeris_core import ephemeris_core


class AspectEngine:
    """
    Calculates aspects (angular relationships) between planets.
    Loads aspect definitions from app/data/aspects.json.
    """
    
    # Luminaries get wider orbs in traditional astrology
    LUMINARIES = {"Sun", "Moon"}
    
    # All bodies we check aspects for
    ALL_BODIES = [
        "Sun", "Moon", "Mercury", "Venus", "Mars",
        "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    ]
    
    def __init__(self):
        self.core = ephemeris_core
        self.aspect_defs = self._load_aspect_definitions()
    
    def _load_aspect_definitions(self) -> dict:
        """Load aspect angle/orb definitions from JSON."""
        data_path = Path(__file__).parent.parent / "data" / "aspects.json"
        if data_path.exists():
            with open(data_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Flatten major + minor into a single lookup
            combined = {}
            for category in ("major", "minor"):
                if category in data:
                    for name, definition in data[category].items():
                        combined[name] = definition
                        combined[name]["category"] = category
            return combined
        else:
            # Fallback: hardcode major aspects if JSON is missing
            return {
                "conjunction":  {"angle": 0,   "orb": {"default": 8, "luminaries": 10}, "category": "major", "nature": "neutral"},
                "sextile":      {"angle": 60,  "orb": {"default": 4, "luminaries": 6},  "category": "major", "nature": "harmonious"},
                "square":       {"angle": 90,  "orb": {"default": 7, "luminaries": 8},  "category": "major", "nature": "tense"},
                "trine":        {"angle": 120, "orb": {"default": 7, "luminaries": 8},  "category": "major", "nature": "harmonious"},
                "opposition":   {"angle": 180, "orb": {"default": 8, "luminaries": 10}, "category": "major", "nature": "tense"},
            }
    
    @staticmethod
    def angular_distance(lon_a: float, lon_b: float) -> float:
        """
        Calculates the shortest angular distance between two ecliptic longitudes.
        Always returns a value between 0 and 180.
        """
        diff = abs(lon_a - lon_b) % 360
        return min(diff, 360 - diff)
    
    def _get_orb(self, aspect_name: str, planet_a: str, planet_b: str) -> float:
        """Returns the appropriate orb for an aspect, widened for luminaries."""
        aspect_def = self.aspect_defs.get(aspect_name, {})
        orb_config = aspect_def.get("orb", {"default": 6, "luminaries": 8})
        
        if planet_a in self.LUMINARIES or planet_b in self.LUMINARIES:
            return orb_config.get("luminaries", orb_config.get("default", 6))
        return orb_config.get("default", 6)
    
    def _get_longitude(self, planet: str, dt: datetime) -> float:
        """Gets ecliptic longitude of a planet at a given time."""
        pos = self.core.get_planet_position(planet, dt)
        return pos[0]  # longitude in degrees (0-360)
    
    def calculate_aspect(
        self,
        planet_a: str,
        planet_b: str,
        dt: datetime,
        categories: str = "major"  # "major", "minor", "all"
    ) -> Optional[dict]:
        """
        Checks if two planets are in aspect at a given moment.
        
        Returns None if no aspect is found within orb, or a dict:
        {
            "aspect": "trine",
            "angle": 120,
            "orb": 2.35,
            "exact_angle": 117.65,
            "is_applying": True,
            "nature": "harmonious",
            "category": "major",
            "planet_a": "Sun",
            "planet_b": "Moon"
        }
        """
        lon_a = self._get_longitude(planet_a, dt)
        lon_b = self._get_longitude(planet_b, dt)
        actual_angle = self.angular_distance(lon_a, lon_b)
        
        best_match = None
        smallest_orb = 999.0
        
        for asp_name, asp_def in self.aspect_defs.items():
            # Filter by category
            if categories == "major" and asp_def.get("category") != "major":
                continue
            if categories == "minor" and asp_def.get("category") != "minor":
                continue
            
            target_angle = asp_def["angle"]
            orb_limit = self._get_orb(asp_name, planet_a, planet_b)
            diff = abs(actual_angle - target_angle)
            
            if diff <= orb_limit and diff < smallest_orb:
                smallest_orb = diff
                best_match = {
                    "aspect": asp_name,
                    "angle": target_angle,
                    "orb": round(diff, 4),
                    "exact_angle": round(actual_angle, 4),
                    "is_applying": self._is_applying(planet_a, planet_b, dt, target_angle),
                    "nature": asp_def.get("nature", "unknown"),
                    "category": asp_def.get("category", "major"),
                    "symbol": asp_def.get("symbol", ""),
                    "planet_a": planet_a,
                    "planet_b": planet_b
                }
        
        return best_match
    
    def _is_applying(
        self,
        planet_a: str,
        planet_b: str,
        dt: datetime,
        target_angle: float
    ) -> bool:
        """
        Determines if an aspect is applying (getting tighter) or separating.
        We check the angle 1 hour in the future — if the orb decreases, it's applying.
        """
        dt_future = dt + timedelta(hours=1)
        
        lon_a_now = self._get_longitude(planet_a, dt)
        lon_b_now = self._get_longitude(planet_b, dt)
        
        lon_a_fut = self._get_longitude(planet_a, dt_future)
        lon_b_fut = self._get_longitude(planet_b, dt_future)
        
        angle_now = self.angular_distance(lon_a_now, lon_b_now)
        angle_fut = self.angular_distance(lon_a_fut, lon_b_fut)
        
        orb_now = abs(angle_now - target_angle)
        orb_fut = abs(angle_fut - target_angle)
        
        return orb_fut < orb_now  # Applying if orb is shrinking
    
    def get_all_aspects(
        self,
        dt: datetime,
        categories: str = "major",
        bodies: Optional[List[str]] = None
    ) -> List[dict]:
        """
        Returns all active aspects between all pairs of bodies at a given time.
        
        Args:
            dt: Moment to check
            categories: "major", "minor", or "all"
            bodies: List of bodies to check (defaults to ALL_BODIES)
        
        Returns:
            List of aspect dicts, sorted by orb (tightest first)
        """
        if bodies is None:
            bodies = self.ALL_BODIES
        
        aspects = []
        checked_pairs = set()
        
        for i, body_a in enumerate(bodies):
            for j, body_b in enumerate(bodies):
                if i >= j:
                    continue
                pair_key = (body_a, body_b)
                if pair_key in checked_pairs:
                    continue
                checked_pairs.add(pair_key)
                
                aspect = self.calculate_aspect(body_a, body_b, dt, categories)
                if aspect is not None:
                    aspects.append(aspect)
        
        # Sort by orb (exactness) — tightest aspects first
        aspects.sort(key=lambda a: a["orb"])
        return aspects
    
    def get_moon_aspects(
        self,
        dt: datetime,
        categories: str = "major"
    ) -> List[dict]:
        """
        Returns all aspects the Moon is making to other planets.
        Critical for VoC Moon calculation.
        """
        # Traditional planets for VoC (no outer planets in strict tradition)
        traditional = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
        
        aspects = []
        for planet in traditional:
            aspect = self.calculate_aspect("Moon", planet, dt, categories)
            if aspect is not None:
                aspects.append(aspect)
        
        aspects.sort(key=lambda a: a["orb"])
        return aspects
    
    def find_next_exact_aspect(
        self,
        planet_a: str,
        planet_b: str,
        aspect_name: str,
        start_dt: datetime,
        max_days: int = 30
    ) -> Optional[datetime]:
        """
        Uses binary search to find when a specific aspect becomes exact.
        
        Returns the datetime of exact aspect, or None if not found within max_days.
        """
        target_angle = self.aspect_defs.get(aspect_name, {}).get("angle")
        if target_angle is None:
            return None
        
        # Step through time in 2-hour increments looking for the moment
        # when the angular difference crosses through the target angle
        step_hours = 2
        dt = start_dt
        end_dt = start_dt + timedelta(days=max_days)
        
        prev_diff = None
        
        while dt < end_dt:
            lon_a = self._get_longitude(planet_a, dt)
            lon_b = self._get_longitude(planet_b, dt)
            angle = self.angular_distance(lon_a, lon_b)
            curr_diff = angle - target_angle
            
            if prev_diff is not None:
                # Sign change means we crossed the exact aspect
                if prev_diff * curr_diff < 0 or abs(curr_diff) < 0.01:
                    # Binary search to refine
                    return self._binary_search_exact(
                        planet_a, planet_b, target_angle,
                        dt - timedelta(hours=step_hours), dt
                    )
            
            prev_diff = curr_diff
            dt += timedelta(hours=step_hours)
        
        return None
    
    def _binary_search_exact(
        self,
        planet_a: str,
        planet_b: str,
        target_angle: float,
        t_start: datetime,
        t_end: datetime,
        precision_seconds: int = 60
    ) -> datetime:
        """
        Refines the exact moment of an aspect using binary search.
        Default precision: 1 minute.
        """
        while (t_end - t_start).total_seconds() > precision_seconds:
            t_mid = t_start + (t_end - t_start) / 2
            
            lon_a = self._get_longitude(planet_a, t_mid)
            lon_b = self._get_longitude(planet_b, t_mid)
            angle = self.angular_distance(lon_a, lon_b)
            diff_mid = angle - target_angle
            
            lon_a_start = self._get_longitude(planet_a, t_start)
            lon_b_start = self._get_longitude(planet_b, t_start)
            angle_start = self.angular_distance(lon_a_start, lon_b_start)
            diff_start = angle_start - target_angle
            
            if diff_start * diff_mid < 0:
                t_end = t_mid
            else:
                t_start = t_mid
        
        return t_start + (t_end - t_start) / 2


# Global singleton
aspect_engine = AspectEngine()

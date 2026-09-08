"""
Human Design Engine — Bodygraph calculation.

Computes Personality (birth) and Design (~88° solar arc before birth) activations,
maps them to I-Ching gates/lines, and derives type, profile, authority, and channels.
"""

from __future__ import annotations

import json
from collections import defaultdict, deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from app.calculators.planetary_engine import planetary_engine
from app.calculators.lunar_engine import lunar_engine
from app.calculators.chart_points import get_extra_point_longitude

DATA_PATH = Path(__file__).parent.parent / "data" / "human_design.json"
DEGREES_PER_GATE = 360.0 / 64.0
DEGREES_PER_LINE = DEGREES_PER_GATE / 6.0
DESIGN_SOLAR_ARC = 88.0

HD_BODIES = [
    "Sun", "Earth", "North Node", "South Node",
    "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
]


class HumanDesignEngine:
    """Calculates Human Design bodygraph from birth data."""

    def __init__(self) -> None:
        with open(DATA_PATH, encoding="utf-8") as f:
            self._data = json.load(f)
        self.gate_sequence: List[int] = self._data["gate_sequence"]
        self.gate_start: float = self._data["gate_start_longitude"]
        self.gate_to_center: Dict[str, str] = {
            int(k): v for k, v in self._data["gate_to_center"].items()
        }
        self.channels: List[Tuple[int, int]] = [
            (c[0], c[1]) for c in self._data["channels"]
        ]
        self.strategies: Dict[str, str] = self._data["strategies"]
        self.center_labels: Dict[str, str] = self._data["center_labels"]

    def longitude_to_gate_line(self, longitude: float) -> Dict[str, Any]:
        """Map tropical ecliptic longitude to HD gate (1-64) and line (1-6)."""
        adjusted = (longitude - self.gate_start) % 360.0
        gate_index = int(adjusted / DEGREES_PER_GATE) % 64
        gate = self.gate_sequence[gate_index]
        position_in_gate = adjusted % DEGREES_PER_GATE
        line = int(position_in_gate / DEGREES_PER_LINE) + 1
        line = min(6, max(1, line))
        return {
            "gate": gate,
            "line": line,
            "center": self.gate_to_center.get(gate, "unknown"),
            "longitude": round(longitude % 360, 4),
        }

    def _get_body_longitude(self, body: str, dt: datetime) -> float:
        if body == "Earth":
            sun_lon = self._get_body_longitude("Sun", dt)
            return (sun_lon + 180.0) % 360.0
        if body == "North Node":
            lon = get_extra_point_longitude("Rahu", dt)
            if lon is not None:
                return lon
            return 0.0
        if body == "South Node":
            lon = get_extra_point_longitude("Ketu", dt)
            if lon is not None:
                return lon
            return 180.0
        if body == "Moon":
            return lunar_engine.get_moon_longitude(dt)
        return planetary_engine.core.get_planet_position(body, dt)[0]

    def find_design_datetime(self, birth_dt: datetime) -> datetime:
        """Find the Design moment when the Sun was 88° before birth Sun."""
        birth_sun = self._get_body_longitude("Sun", birth_dt)
        target = (birth_sun - DESIGN_SOLAR_ARC) % 360.0

        lo = birth_dt - timedelta(days=100)
        hi = birth_dt - timedelta(days=70)

        for _ in range(60):
            mid = lo + (hi - lo) / 2
            sun = self._get_body_longitude("Sun", mid)
            delta = (sun - target + 180.0) % 360.0 - 180.0
            if abs(delta) < 0.00001:
                return mid
            if delta > 0:
                hi = mid
            else:
                lo = mid
        return lo + (hi - lo) / 2

    def _activations_at(self, dt: datetime) -> Dict[str, Dict[str, Any]]:
        activations: Dict[str, Dict[str, Any]] = {}
        for body in HD_BODIES:
            lon = self._get_body_longitude(body, dt)
            gate_line = self.longitude_to_gate_line(lon)
            activations[body] = gate_line
        return activations

    def _active_gates(
        self,
        personality: Dict[str, Dict[str, Any]],
        design: Dict[str, Dict[str, Any]],
    ) -> Set[int]:
        gates: Set[int] = set()
        for act in (personality, design):
            for data in act.values():
                gates.add(data["gate"])
        return gates

    def _defined_channels_and_centers(
        self, active_gates: Set[int]
    ) -> Tuple[List[str], Set[str]]:
        defined_channels: List[str] = []
        defined_centers: Set[str] = set()
        for g1, g2 in self.channels:
            if g1 in active_gates and g2 in active_gates:
                defined_channels.append(f"{g1}-{g2}")
                defined_centers.add(self.gate_to_center[g1])
                defined_centers.add(self.gate_to_center[g2])
        return defined_channels, defined_centers

    def _motor_to_throat(self, defined_centers: Set[str]) -> bool:
        if "throat" not in defined_centers:
            return False
        motors = {"root", "sacral", "solar_plexus", "ego"}
        if not (motors & defined_centers):
            return False

        adj: Dict[str, Set[str]] = defaultdict(set)
        for g1, g2 in self.channels:
            c1 = self.gate_to_center.get(g1)
            c2 = self.gate_to_center.get(g2)
            if c1 in defined_centers and c2 in defined_centers:
                adj[c1].add(c2)
                adj[c2].add(c1)

        for motor in motors & defined_centers:
            if self._bfs_reaches(adj, motor, "throat"):
                return True
        return False

    @staticmethod
    def _bfs_reaches(adj: Dict[str, Set[str]], start: str, target: str) -> bool:
        if start == target:
            return True
        visited = {start}
        queue = deque([start])
        while queue:
            node = queue.popleft()
            for neighbor in adj.get(node, set()):
                if neighbor == target:
                    return True
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return False

    def _determine_type(self, defined_centers: Set[str]) -> str:
        if not defined_centers:
            return "Reflector"
        has_sacral = "sacral" in defined_centers
        motor_to_throat = self._motor_to_throat(defined_centers)
        if has_sacral:
            return "Manifesting Generator" if motor_to_throat else "Generator"
        if motor_to_throat:
            return "Manifestor"
        return "Projector"

    def _determine_authority(self, hd_type: str, defined_centers: Set[str]) -> str:
        if hd_type == "Reflector":
            return "Lunar"
        if "solar_plexus" in defined_centers:
            return "Emotional"
        if "sacral" in defined_centers:
            return "Sacral"
        if "spleen" in defined_centers:
            return "Splenic"
        if "ego" in defined_centers:
            return "Ego"
        if "g" in defined_centers:
            return "Self-Projected"
        if "ajna" in defined_centers or "head" in defined_centers:
            return "Mental"
        return "Lunar"

    def _definition_type(self, defined_centers: Set[str]) -> str:
        if not defined_centers:
            return "none"
        adj: Dict[str, Set[str]] = defaultdict(set)
        for g1, g2 in self.channels:
            c1 = self.gate_to_center.get(g1)
            c2 = self.gate_to_center.get(g2)
            if c1 in defined_centers and c2 in defined_centers:
                adj[c1].add(c2)
                adj[c2].add(c1)
        visited: Set[str] = set()
        components = 0
        for center in defined_centers:
            if center in visited:
                continue
            components += 1
            queue = deque([center])
            visited.add(center)
            while queue:
                node = queue.popleft()
                for neighbor in adj.get(node, set()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
        if components == 1:
            return "single"
        if components == 2:
            return "split"
        if components == 3:
            return "triple_split"
        return "quadruple_split"

    def calculate(
        self,
        birth_dt: datetime,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        """Full Human Design bodygraph for a birth moment."""
        design_dt = self.find_design_datetime(birth_dt)
        personality = self._activations_at(birth_dt)
        design = self._activations_at(design_dt)

        active_gates = self._active_gates(personality, design)
        defined_channels, defined_centers = self._defined_channels_and_centers(active_gates)

        p_sun_line = personality["Sun"]["line"]
        d_sun_line = design["Sun"]["line"]
        profile = f"{p_sun_line}/{d_sun_line}"

        hd_type = self._determine_type(defined_centers)
        authority = self._determine_authority(hd_type, defined_centers)
        strategy = self.strategies.get(hd_type, "")

        return {
            "meta": {
                "birth_datetime_utc": birth_dt.isoformat(),
                "design_datetime_utc": design_dt.isoformat(),
                "design_solar_arc_degrees": DESIGN_SOLAR_ARC,
                "latitude": latitude,
                "longitude": longitude,
            },
            "type": hd_type,
            "profile": profile,
            "authority": authority,
            "strategy": strategy,
            "definition": self._definition_type(defined_centers),
            "defined_centers": sorted(
                [{"id": c, "label": self.center_labels.get(c, c)} for c in defined_centers],
                key=lambda x: x["id"],
            ),
            "defined_channels": defined_channels,
            "active_gates": sorted(active_gates),
            "personality": personality,
            "design": design,
        }


human_design_engine = HumanDesignEngine()

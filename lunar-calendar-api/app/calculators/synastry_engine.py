"""
Synastry Engine — cross-chart aspect analysis between two natal charts.
"""

from typing import Any, Dict, List

from app.calculators.aspect_engine import aspect_engine


class SynastryEngine:
    """Computes inter-chart aspects (chart A points vs chart B points)."""

    def __init__(self):
        self.a_engine = aspect_engine

    @staticmethod
    def _extract_points(chart: Dict[str, Any]) -> Dict[str, float]:
        points: Dict[str, float] = {}
        for name, data in chart.get("planets", {}).items():
            points[name] = data["longitude"]

        angles = chart.get("angles", {})
        if angles.get("ascendant") is not None:
            points["ASC"] = angles["ascendant"]
        if angles.get("mc") is not None:
            points["MC"] = angles["mc"]
        return points

    def compare_charts(
        self,
        chart_a: Dict[str, Any],
        chart_b: Dict[str, Any],
        aspect_categories: str = "major",
    ) -> List[Dict[str, Any]]:
        """
        Finds all aspects between every point in chart A and every point in chart B.
        Returns aspects sorted by orb (tightest first).
        """
        points_a = self._extract_points(chart_a)
        points_b = self._extract_points(chart_b)
        inter_aspects: List[Dict[str, Any]] = []

        for a_name, a_lon in points_a.items():
            for b_name, b_lon in points_b.items():
                actual_angle = self.a_engine.angular_distance(a_lon, b_lon)
                best_match = None
                smallest_orb = 999.0

                for asp_name, asp_def in self.a_engine.aspect_defs.items():
                    if aspect_categories == "major" and asp_def.get("category") != "major":
                        continue
                    if aspect_categories == "minor" and asp_def.get("category") != "minor":
                        continue

                    target_angle = asp_def["angle"]
                    orb_limit = self.a_engine._get_orb(asp_name, a_name, b_name)
                    diff = abs(actual_angle - target_angle)

                    if diff <= orb_limit and diff < smallest_orb:
                        smallest_orb = diff
                        best_match = {
                            "chart_a_point": a_name,
                            "chart_b_point": b_name,
                            "aspect": asp_name,
                            "angle": target_angle,
                            "orb": round(diff, 4),
                            "nature": asp_def.get("nature", "unknown"),
                            "symbol": asp_def.get("symbol", ""),
                            "category": asp_def.get("category", "major"),
                        }

                if best_match:
                    inter_aspects.append(best_match)

        inter_aspects.sort(key=lambda a: a["orb"])
        return inter_aspects


synastry_engine = SynastryEngine()

"""
Draconic Engine — rebase the zodiac so the North Node (Rahu) sits at 0° Aries.

Formula: draconic_longitude = (tropical_longitude - north_node_longitude) % 360
"""

from typing import Any, Dict, List

from app.calculators.aspect_engine import aspect_engine

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

NORTH_NODE_NAMES = ("Rahu", "North Node", "north_node")


class DraconicEngine:
    """Converts a tropical natal chart into a draconic chart."""

    def __init__(self):
        self.a_engine = aspect_engine

    @staticmethod
    def rebased_longitude(tropical_lon: float, node_lon: float) -> float:
        return (tropical_lon - node_lon) % 360

    @staticmethod
    def longitude_to_sign_data(lon: float) -> Dict[str, Any]:
        sign_index = int(lon / 30) % 12
        return {
            "sign": ZODIAC_SIGNS[sign_index],
            "sign_id": sign_index + 1,
            "sign_degree": round(lon % 30, 4),
        }

    def _find_north_node_longitude(self, chart: Dict[str, Any]) -> float:
        planets = chart.get("planets", {})
        for name in NORTH_NODE_NAMES:
            if name in planets:
                return planets[name]["longitude"]
        raise ValueError(
            "North Node (Rahu) not found in chart. "
            "Ensure extra chart bodies are computed."
        )

    def _transform_planet(
        self,
        name: str,
        data: Dict[str, Any],
        node_lon: float,
    ) -> Dict[str, Any]:
        drac_lon = self.rebased_longitude(data["longitude"], node_lon)
        sign_data = self.longitude_to_sign_data(drac_lon)
        return {
            "longitude": round(drac_lon, 4),
            "sign": sign_data["sign"],
            "sign_id": sign_data["sign_id"],
            "sign_degree": sign_data["sign_degree"],
            "is_retrograde": data.get("is_retrograde", False),
            "house": data.get("house"),
            "ruler": data.get("ruler"),
        }

    def _compute_aspects(
        self,
        points: Dict[str, float],
        categories: str = "major",
    ) -> List[Dict[str, Any]]:
        aspects: List[Dict[str, Any]] = []
        names = list(points.keys())

        for i, name_a in enumerate(names):
            for name_b in names[i + 1:]:
                actual_angle = self.a_engine.angular_distance(
                    points[name_a], points[name_b]
                )
                best_match = None
                smallest_orb = 999.0

                for asp_name, asp_def in self.a_engine.aspect_defs.items():
                    if categories == "major" and asp_def.get("category") != "major":
                        continue
                    if categories == "minor" and asp_def.get("category") != "minor":
                        continue

                    target_angle = asp_def["angle"]
                    orb_limit = self.a_engine._get_orb(asp_name, name_a, name_b)
                    diff = abs(actual_angle - target_angle)

                    if diff <= orb_limit and diff < smallest_orb:
                        smallest_orb = diff
                        best_match = {
                            "aspect": asp_name,
                            "angle": target_angle,
                            "orb": round(diff, 4),
                            "exact_angle": round(actual_angle, 4),
                            "is_applying": False,
                            "nature": asp_def.get("nature", "unknown"),
                            "category": asp_def.get("category", "major"),
                            "symbol": asp_def.get("symbol", ""),
                            "planet_a": name_a,
                            "planet_b": name_b,
                        }

                if best_match:
                    aspects.append(best_match)

        aspects.sort(key=lambda a: a["orb"])
        return aspects

    def convert_to_draconic(
        self,
        natal_chart: Dict[str, Any],
        aspect_categories: str = "major",
    ) -> Dict[str, Any]:
        """
        Rotate all chart positions so the North Node sits at 0° Aries.
        Returns a chart-shaped dict with draconic longitudes and recomputed aspects.
        """
        node_lon = self._find_north_node_longitude(natal_chart)

        draconic_planets = {
            name: self._transform_planet(name, data, node_lon)
            for name, data in natal_chart.get("planets", {}).items()
        }

        draconic_angles = {}
        for angle_name, angle_lon in natal_chart.get("angles", {}).items():
            draconic_angles[angle_name] = round(
                self.rebased_longitude(angle_lon, node_lon), 4
            )

        draconic_houses = [
            round(self.rebased_longitude(cusp, node_lon), 4)
            for cusp in natal_chart.get("houses", [])
        ]

        aspect_points: Dict[str, float] = {
            name: data["longitude"] for name, data in draconic_planets.items()
        }
        if draconic_angles.get("ascendant") is not None:
            aspect_points["ASC"] = draconic_angles["ascendant"]
        if draconic_angles.get("mc") is not None:
            aspect_points["MC"] = draconic_angles["mc"]

        aspects = self._compute_aspects(aspect_points, aspect_categories)

        meta = dict(natal_chart.get("meta", {}))
        meta["chart_type"] = "draconic"
        meta["north_node_tropical"] = round(node_lon, 4)

        return {
            "meta": meta,
            "north_node_longitude": round(node_lon, 4),
            "angles": draconic_angles,
            "houses": draconic_houses,
            "planets": draconic_planets,
            "aspects": aspects,
        }


draconic_engine = DraconicEngine()

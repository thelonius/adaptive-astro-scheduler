"""
Dispositor Engine — Sprint 3 🪐

Calculates planetary rulership chains (dispositors).
A planet's dispositor is the ruler of the sign it is currently in.
For example, if Venus is in Aries, Mars is its dispositor.
This engine builds a graph of these relationships to find mutual receptions
and ultimate dispositors (planets in their own domicile).
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.calculators.planetary_engine import planetary_engine

class DispositorEngine:
    """
    Builds dispositor trees and detects mutual receptions based on planetary positions.
    """
    
    def __init__(self):
        self.engine = planetary_engine
        self.rulerships = self._load_rulerships()
        
    def _load_rulerships(self) -> dict:
        """Loads both 'traditional' and 'modern' rulership schemes from JSON."""
        data_path = Path(__file__).parent.parent / "data" / "rulerships.json"
        if data_path.exists():
            with open(data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            # Fallback if file missing
            return {
                "traditional": {
                    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
                    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
                    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
                    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
                },
                "modern": {
                    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
                    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
                    "Libra": "Venus", "Scorpio": "Pluto", "Sagittarius": "Jupiter",
                    "Capricorn": "Saturn", "Aquarius": "Uranus", "Pisces": "Neptune"
                }
            }

    def get_full_map(self, dt: datetime, system: str = "traditional") -> dict:
        """
        Calculates the immediate dispositor for every active planet.
        Returns a dict: { "Venus": {"sign": "Aries", "ruler": "Mars"}, ... }
        """
        rulers_map = self.rulerships.get(system)
        if not rulers_map:
            raise ValueError(f"Unknown rulership system: '{system}'")
            
        planets_to_check = [
            "Sun", "Moon", "Mercury", "Venus", "Mars", 
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
        ]
        
        full_map = {}
        for p in planets_to_check:
            # get_planet_sign returns e.g. {"sign": "Aries", ...}
            pos_info = self.engine.get_planet_sign(p, dt)
            sign = pos_info["sign"]
            ruler = rulers_map[sign]
            full_map[p] = {
                "sign": sign,
                "ruler": ruler
            }
            
        return full_map

    def build_chain(self, planet: str, dt: datetime, system: str = "traditional") -> dict:
        """
        Builds the dispositor chain starting from a given planet.
        Traverses the graph until it finds a domicile planet or a loop (mutual reception).
        
        Returns a dict:
            {
                "chain": ["Venus", "Mars", "Jupiter"], 
                "signs": ["Aries", "Sagittarius", "Pisces"],
                "status": "domicile" | "mutual_reception" | "cycle",
                "final_dispositor": "Jupiter", 
                "cycle_nodes": []
            }
        """
        full_map = self.get_full_map(dt, system)
        
        chain = []
        signs = []
        visited = set()
        
        current = planet
        
        while True:
            chain.append(current)
            visited.add(current)
            
            node_info = full_map[current]
            signs.append(node_info["sign"])
            ruler = node_info["ruler"]
            
            # Base case 1: Planet is in its own domicile (its own ruler)
            if ruler == current:
                return {
                    "chain": chain,
                    "signs": signs,
                    "status": "domicile",
                    "final_dispositor": current,
                    "cycle_nodes": []
                }
                
            # Base case 2: We hit a loop (e.g., mutual reception: Mars->Venus->Mars)
            if ruler in visited:
                chain.append(ruler) # Add the closing node of the loop for display clarity
                
                # Determine loop type
                cycle_start_idx = chain[:-1].index(ruler)
                cycle_nodes = chain[cycle_start_idx:-1]
                
                status = "mutual_reception" if len(cycle_nodes) == 2 else "cycle"
                
                return {
                    "chain": chain,
                    "signs": signs,
                    "status": status,
                    "final_dispositor": None, # No final dispositor if there's a loop
                    "cycle_nodes": cycle_nodes
                }
                
            # Advance to the ruler
            current = ruler

    def find_mutual_receptions(self, dt: datetime, system: str = "traditional") -> List[Tuple[str, str]]:
        """
        Finds all active mutual receptions (two planets in each other's signs).
        E.g., Venus in Aries AND Mars in Taurus -> [("Venus", "Mars")]
        """
        full_map = self.get_full_map(dt, system)
        receptions = set()
        
        for p1, info1 in full_map.items():
            p2 = info1["ruler"]
            if p1 == p2:
                continue # Skip domicile
                
            info2 = full_map[p2]
            p3 = info2["ruler"]
            
            # If P1 rules P2 AND P2 rules P1
            if p1 == p3:
                # Store sorted tuple to avoid duplicates: (Venus, Mars) == (Mars, Venus)
                pair = tuple(sorted([p1, p2]))
                receptions.add(pair)
                
        return list(receptions)

    def find_final_dispositors(self, dt: datetime, system: str = "traditional") -> List[str]:
        """
        Finds all planets in their own domicile (rulership) at a given time.
        These are the final dispositors of the chart.
        """
        full_map = self.get_full_map(dt, system)
        domiciles = []
        
        for p, info in full_map.items():
            if info["ruler"] == p:
                domiciles.append(p)
                
        return domiciles

# Singleton instance
dispositor_engine = DispositorEngine()

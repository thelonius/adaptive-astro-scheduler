import json
from datetime import date, timedelta
from typing import List, Dict
from pathlib import Path

from app.models.lunar_day import (
    LunarDayData, BestDayResult, ActivityRequest
)
from app.services.lunar_calculator import LunarCalculator


class ActivityFinder:
    """Find best days for specific activities based on lunar calendar."""

    def __init__(self, lunar_data_path: str = None):
        """
        Initialize the activity finder.

        Args:
            lunar_data_path: Path to lunar days JSON file
        """
        self.calculator = None  # Lazy initialization

        if lunar_data_path is None:
            # Default to data directory
            current_dir = Path(__file__).parent.parent
            lunar_data_path = current_dir / "data" / "lunar_days.json"

        self.lunar_data = self._load_lunar_data(lunar_data_path)

        # Activity keywords mapping
        self.activity_keywords = self._build_activity_keywords()

    def get_calculator(self):
        """Get or create the lunar calculator (lazy initialization)."""
        if self.calculator is None:
            self.calculator = LunarCalculator()
        return self.calculator

    def _load_lunar_data(self, path: Path) -> Dict[int, LunarDayData]:
        """
        Load lunar day data from JSON file.

        Args:
            path: Path to JSON file

        Returns:
            Dictionary mapping lunar day number to LunarDayData
        """
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        lunar_days = {}
        for day_data in data['lunar_days']:
            lunar_day = LunarDayData(**day_data)
            lunar_days[lunar_day.lunar_day] = lunar_day

        return lunar_days

    def _build_activity_keywords(self) -> Dict[str, List[str]]:
        """
        Build keyword mappings for different activities.

        Returns:
            Dictionary mapping activity types to search keywords
        """
        return {
            'haircut': ['hair', 'beauty', 'appearance', 'grooming'],
            'new_project': ['start', 'begin', 'new', 'project', 'initiative'],
            'travel': ['travel', 'journey', 'trip', 'movement', 'road'],
            'business': ['business', 'money', 'finance', 'work', 'career'],
            'love': ['love', 'relationship', 'intimacy', 'romance', 'heart'],
            'health': ['health', 'healing', 'body', 'wellness', 'recovery'],
            'surgery': ['surgery', 'operation', 'medical', 'treatment'],
            'study': ['study', 'learn', 'education', 'knowledge', 'wisdom'],
            'meditation': ['meditation', 'spiritual', 'prayer', 'contemplation'],
            'sport': ['sport', 'exercise', 'physical', 'activity', 'movement'],
            'cleaning': ['clean', 'purify', 'organize', 'order'],
            'wedding': ['wedding', 'marriage', 'union', 'relationship', 'love'],
            'moving': ['moving', 'relocation', 'home', 'house', 'construction'],
            'finance': ['money', 'finance', 'investment', 'business', 'wealth'],
            'communication': ['communication', 'talk', 'speaking', 'call', 'conversation'],
            'creativity': ['creativity', 'art', 'creation', 'inspiration'],
            'rest': ['rest', 'recovery', 'peace', 'relaxation', 'sleep'],
            'forgiveness': ['forgiveness', 'release', 'letting go', 'peace'],
            'planting': ['plant', 'growth', 'nature', 'garden'],
            'signing_contracts': ['contract', 'agreement', 'decision', 'commitment'],
        }

    def find_best_days(self, request: ActivityRequest) -> List[BestDayResult]:
        """
        Find the best upcoming days for a specific activity.

        Args:
            request: ActivityRequest with activity type and search parameters

        Returns:
            List of BestDayResult objects sorted by score
        """
        start_date = request.start_date or date.today()
        end_date = start_date + timedelta(days=request.days_ahead)

        # Get keywords for the activity
        keywords = self._get_keywords_for_activity(request.activity)

        results = []
        current_date = start_date

        while current_date <= end_date:
            # Calculate lunar day
            lunar_day_num = self.get_calculator().calculate_lunar_day(current_date)
            lunar_data = self.lunar_data.get(lunar_day_num)

            if lunar_data:
                # Calculate score for this day
                score, reason = self._calculate_day_score(
                    lunar_data, keywords, request.activity
                )

                if score > 30:  # Only include days with reasonable scores
                    moon_phase = self.get_calculator().get_moon_phase(current_date)

                    result = BestDayResult(
                        date=current_date,
                        lunar_day=lunar_day_num,
                        moon_phase=moon_phase.name,
                        score=round(score, 1),
                        reason=reason
                    )
                    results.append(result)

            current_date += timedelta(days=1)

        # Sort by score descending
        results.sort(key=lambda x: x.score, reverse=True)

        # Return top 10 results
        return results[:10]

    def _get_keywords_for_activity(self, activity: str) -> List[str]:
        """
        Get relevant keywords for an activity.

        Args:
            activity: Activity type

        Returns:
            List of keywords
        """
        activity_lower = activity.lower().replace(' ', '_')

        # Check if we have predefined keywords
        if activity_lower in self.activity_keywords:
            return self.activity_keywords[activity_lower]

        # Otherwise, use the activity itself as keywords
        return activity.lower().split()

    def _calculate_day_score(
        self,
        lunar_data: LunarDayData,
        keywords: List[str],
        activity: str
    ) -> tuple[float, str]:
        """
        Calculate how suitable a lunar day is for an activity.

        Args:
            lunar_data: Lunar day data
            keywords: Keywords to search for
            activity: Activity name

        Returns:
            Tuple of (score, reason)
        """
        score = 0.0
        reasons = []

        # Check recommended activities
        recommended_text = ' '.join(lunar_data.recommended).lower()
        for keyword in keywords:
            if keyword in recommended_text:
                score += 30
                reasons.append(f"Recommended: {keyword}")

        # Check not recommended activities (negative score)
        not_recommended_text = ' '.join(lunar_data.not_recommended).lower()
        for keyword in keywords:
            if keyword in not_recommended_text:
                score -= 40
                reasons.append(f"Not recommended: {keyword}")

        # Check general description
        description_text = lunar_data.general_description.lower()
        for keyword in keywords:
            if keyword in description_text:
                score += 15
                reasons.append(f"Mentioned in description")
                break

        # Check planetary influence
        planet_text = lunar_data.planetary_description.lower()
        for keyword in keywords:
            if keyword in planet_text:
                score += 10
                reasons.append(f"Planetary support")
                break

        # Bonus for specific activities on specific days
        bonus_score, bonus_reason = self._get_special_day_bonus(
            lunar_data.lunar_day, activity
        )
        if bonus_score > 0:
            score += bonus_score
            reasons.append(bonus_reason)

        # Create reason string
        if not reasons:
            reason = f"Neutral day (Lunar day {lunar_data.lunar_day})"
        else:
            reason = f"Lunar day {lunar_data.lunar_day}: " + ", ".join(reasons[:3])

        return max(0, min(100, score)), reason

    def _get_special_day_bonus(self, lunar_day: int, activity: str) -> tuple[float, str]:
        """
        Get special bonuses for specific activity-day combinations.

        Args:
            lunar_day: Lunar day number
            activity: Activity type

        Returns:
            Tuple of (bonus_score, reason)
        """
        activity_lower = activity.lower()

        # Special combinations
        special_days = {
            1: {'new_project': (40, 'Perfect for new beginnings')},
            3: {'sport': (35, 'Warrior energy day')},
            5: {'travel': (40, 'Favorable for journeys')},
            7: {'meditation': (35, 'Sacred day for spiritual practices')},
            11: {'meditation': (30, 'Day of power and transformation')},
            12: {'love': (40, 'Day of love and compassion')},
            13: {'sport': (30, 'Day of movement and celebration')},
            14: {'communication': (40, 'Excellent for communication')},
            17: {'love': (35, 'Day of intimacy and connection')},
            20: {'meditation': (35, 'Day of spiritual ascension')},
            21: {'sport': (35, 'Day of courage and action')},
            22: {'study': (40, 'Day of knowledge and learning')},
            24: {'creativity': (40, 'Day of inspiration and art')},
            27: {'travel': (35, 'Day of journeys and exploration')},
            28: {'moving': (40, 'Perfect for construction and building')},
        }

        if lunar_day in special_days:
            for key, (score, reason) in special_days[lunar_day].items():
                if key in activity_lower or activity_lower in key:
                    return score, reason

        return 0.0, ""

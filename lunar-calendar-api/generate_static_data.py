#!/usr/bin/env python3
"""
Generate precomputed lunar calendar data for Firefox extension
No backend server needed - extension uses this JSON directly
"""

import json
from datetime import date, timedelta
from pathlib import Path

from app.services.lunar_calculator import LunarCalculator
from app.services.activity_finder import ActivityFinder


def generate_lunar_data(start_date: date, days: int = 1095):  # 3 years default
    """Generate lunar data for specified number of days"""

    print(f"🌙 Generating lunar data from {start_date} for {days} days...")

    calculator = LunarCalculator()
    activity_finder = ActivityFinder()

    data = {}

    for i in range(days):
        current_date = start_date + timedelta(days=i)
        date_key = current_date.isoformat()

        # Calculate lunar day and phase
        lunar_day = calculator.calculate_lunar_day(current_date)
        moon_phase = calculator.get_moon_phase(current_date)
        timing = calculator.get_lunar_day_timing(current_date, lunar_day, timezone_str="Europe/Moscow")

        # Get lunar day data
        lunar_data = activity_finder.lunar_data.get(lunar_day)

        if lunar_data:
            # Colors - gradients generated in browser

            # Build simplified data structure
            data[date_key] = {
                "lunar_day": lunar_day,
                "moon_phase": {
                    "name": moon_phase.name,
                    "illumination": round(moon_phase.illumination, 2),
                    "is_waxing": moon_phase.is_waxing,
                    "emoji": moon_phase.emoji
                },
                "colors": {
                    "base": lunar_data.base_colors,
                },
                "timing": {
                    "starts_at": timing.starts_at.isoformat() + "Z",
                    "ends_at": timing.ends_at.isoformat() + "Z",
                    "duration_hours": timing.duration_hours
                },
                "recommendations": {
                    "do": lunar_data.recommended[:5],  # Top 5
                    "avoid": lunar_data.not_recommended[:5]
                },
                "health": {
                    "organs": lunar_data.affected_organs,
                    "body_parts": lunar_data.affected_body_parts[:3]  # Top 3
                },
                "description": lunar_data.general_description,
                "planet": lunar_data.dominant_planet
            }

        if (i + 1) % 100 == 0:
            print(f"  ✓ Processed {i + 1}/{days} days...")

    return data


def main():
    # Generate data starting from 30 days ago for next 3 years + 30 days
    # This allows viewing historical data
    start = date.today() - timedelta(days=30)
    lunar_data = generate_lunar_data(start, days=60)  # 3 years + 30 days

    # Save to extension directory
    output_path = Path(__file__).parent / "firefox-extension" / "data" / "lunar_calendar.json"
    output_path.parent.mkdir(exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "generated_at": date.today().isoformat(),
            "valid_from": start.isoformat(),
            "valid_until": (start + timedelta(days=59)).isoformat(),
            "data": lunar_data
        }, f, ensure_ascii=False, indent=2)

    # Calculate file size
    file_size_kb = output_path.stat().st_size / 1024

    print(f"\n✅ Generated {len(lunar_data)} days of lunar data")
    print(f"📁 Saved to: {output_path}")
    print(f"📊 File size: {file_size_kb:.1f} KB")
    print(f"📅 Valid from {start} to {start + timedelta(days=59)}")
    print(f"\n💡 Extension can now work offline - no backend needed!")


if __name__ == "__main__":
    main()

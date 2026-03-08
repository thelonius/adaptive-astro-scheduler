"""
Example usage of the Lunar Calendar API
"""

import requests
from datetime import date, timedelta

# Base URL
BASE_URL = "http://localhost:8000/api/v1"


def example_get_lunar_day():
    """Example: Get lunar day information for today."""
    print("\n=== Getting Lunar Day Information for Today ===")

    response = requests.get(f"{BASE_URL}/lunar-day")

    if response.status_code == 200:
        data = response.json()
        print(f"Lunar Day: {data['lunar_day']}")
        print(f"Date: {data['gregorian_date']}")
        print(f"Moon Phase: {data['moon_phase']['name']} {data['moon_phase']['emoji']}")
        print(f"Illumination: {data['moon_phase']['illumination']}%")
        print(f"\nBase Colors: {', '.join(data['color_palette']['base_colors'])}")
        print(f"\nRecommended Activities:")
        for activity in data['recommendations']['recommended'][:3]:
            print(f"  ✓ {activity}")
        print(f"\nNot Recommended:")
        for activity in data['recommendations']['not_recommended'][:3]:
            print(f"  ✗ {activity}")
        print(f"\nGeneral: {data['general_description']}")
    else:
        print(f"Error: {response.status_code}")


def example_get_specific_date():
    """Example: Get lunar day for a specific date."""
    print("\n=== Getting Lunar Day for New Year 2026 ===")

    target_date = "2026-01-01"
    response = requests.get(f"{BASE_URL}/lunar-day?date={target_date}")

    if response.status_code == 200:
        data = response.json()
        print(f"Date: {data['gregorian_date']}")
        print(f"Lunar Day: {data['lunar_day']}")
        print(f"Moon Phase: {data['moon_phase']['name']}")
        print(f"Dominant Planet: {data['planetary_influence']['dominant_planet']}")
    else:
        print(f"Error: {response.status_code}")


def example_get_moon_phase():
    """Example: Get just the moon phase."""
    print("\n=== Getting Current Moon Phase ===")

    response = requests.get(f"{BASE_URL}/moon-phase")

    if response.status_code == 200:
        data = response.json()
        print(f"Phase: {data['name']} {data['emoji']}")
        print(f"Illumination: {data['illumination']}%")
        print(f"Waxing: {data['is_waxing']}")
    else:
        print(f"Error: {response.status_code}")


def example_find_best_days_for_haircut():
    """Example: Find best days for a haircut."""
    print("\n=== Finding Best Days for Haircut (Next 30 Days) ===")

    payload = {
        "activity": "haircut",
        "days_ahead": 30
    }

    response = requests.post(f"{BASE_URL}/best-days", json=payload)

    if response.status_code == 200:
        data = response.json()
        print(f"Activity: {data['activity']}")
        print(f"Search Period: {data['search_period']['start']} to {data['search_period']['end']}")
        print(f"\nTop 5 Recommended Days:")

        for i, day in enumerate(data['best_days'][:5], 1):
            print(f"\n{i}. {day['date']} (Lunar Day {day['lunar_day']})")
            print(f"   Score: {day['score']}/100")
            print(f"   Moon Phase: {day['moon_phase']}")
            print(f"   Reason: {day['reason']}")
    else:
        print(f"Error: {response.status_code}")


def example_find_best_days_for_new_project():
    """Example: Find best days to start a new project."""
    print("\n=== Finding Best Days to Start New Project ===")

    payload = {
        "activity": "new project",
        "days_ahead": 60
    }

    response = requests.post(f"{BASE_URL}/best-days", json=payload)

    if response.status_code == 200:
        data = response.json()
        print(f"Top 3 Days to Start New Projects:")

        for i, day in enumerate(data['best_days'][:3], 1):
            print(f"\n{i}. {day['date']}")
            print(f"   Score: {day['score']}/100")
            print(f"   {day['reason']}")
    else:
        print(f"Error: {response.status_code}")


def example_get_lunar_calendar():
    """Example: Get lunar calendar for a period."""
    print("\n=== Getting 7-Day Lunar Calendar ===")

    response = requests.get(f"{BASE_URL}/lunar-calendar?days=7")

    if response.status_code == 200:
        data = response.json()
        print(f"Retrieved {len(data)} days of lunar calendar data")

        for day_info in data[:3]:  # Show first 3
            print(f"\n{day_info['gregorian_date']} - Lunar Day {day_info['lunar_day']}")
            print(f"  {day_info['moon_phase']['name']} {day_info['moon_phase']['emoji']}")
            print(f"  {day_info['general_description'][:80]}...")
    else:
        print(f"Error: {response.status_code}")


if __name__ == "__main__":
    print("=" * 60)
    print("Lunar Calendar API - Example Usage")
    print("=" * 60)

    try:
        # Run examples
        example_get_lunar_day()
        example_get_specific_date()
        example_get_moon_phase()
        example_find_best_days_for_haircut()
        example_find_best_days_for_new_project()
        example_get_lunar_calendar()

        print("\n" + "=" * 60)
        print("Examples completed successfully!")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to the API.")
        print("Make sure the server is running: python run.py")
    except Exception as e:
        print(f"\nError: {e}")

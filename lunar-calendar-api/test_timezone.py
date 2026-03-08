#!/usr/bin/env python3

import sys
import os
from datetime import date

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.lunar_calculator import LunarCalculator

def test_timezone_functionality():
    """Test the timezone functionality of the lunar calculator."""

    calculator = LunarCalculator()
    test_date = date.today()

    print(f"Testing lunar day timing for {test_date}")
    print("=" * 50)

    # Test lunar day calculation
    lunar_day = calculator.calculate_lunar_day(test_date)
    print(f"Lunar day: {lunar_day}")
    print()

    # Test different timezones
    timezones = ["UTC", "US/Eastern", "US/Pacific", "Europe/London", "Asia/Tokyo"]

    for tz in timezones:
        print(f"Timezone: {tz}")
        try:
            timing = calculator.get_lunar_day_timing(test_date, lunar_day, timezone_str=tz)
            print(f"  Starts at (UTC): {timing.starts_at}")
            print(f"  Ends at (UTC): {timing.ends_at}")
            print(f"  Starts at (local): {timing.starts_at_local}")
            print(f"  Ends at (local): {timing.ends_at_local}")
            print(f"  Timezone: {timing.timezone}")
            print(f"  Duration: {timing.duration_hours:.2f} hours")
            print(f"  Is current: {timing.is_current}")
        except Exception as e:
            print(f"  Error: {e}")
        print()

if __name__ == "__main__":
    test_timezone_functionality()
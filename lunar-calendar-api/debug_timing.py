#!/usr/bin/env python3
"""Debug the timing issue with detailed output"""
from datetime import date, datetime, timedelta
from app.services.lunar_calculator import LunarCalculator

calc = LunarCalculator()

# Test a specific date
test_date = date(2025, 11, 16)
print(f"Testing date: {test_date}")
print()

# Get lunar day for noon on this date
lunar_day = calc.calculate_lunar_day(test_date)
print(f"Lunar day at noon on {test_date}: {lunar_day}")
print()

# Find new moons
new_moons = calc._find_new_moons_around_date(test_date)
print(f"Found {len(new_moons)} new moons:")
for i, nm in enumerate(new_moons):
    nm_dt = nm.utc_datetime().replace(tzinfo=None)
    print(f"  {i}: {nm_dt}")
print()

# Check each new moon cycle
target_datetime = datetime.combine(test_date, datetime.min.time()) + timedelta(hours=12)
print(f"Target datetime (noon): {target_datetime}")
print()

for i, nm in enumerate(new_moons):
    print(f"Checking new moon {i}: {nm.utc_datetime().replace(tzinfo=None)}")
    reference_new_moon_naive = nm.utc_datetime().replace(tzinfo=None)
    moonrise_times = calc._find_moonrises_after(reference_new_moon_naive, days=35)

    print(f"  Found {len(moonrise_times)} moonrise times")

    # Calculate when lunar_day starts and ends from this new moon
    if lunar_day == 1:
        candidate_start = reference_new_moon_naive
        candidate_end = moonrise_times[0] if moonrise_times else reference_new_moon_naive + timedelta(days=1)
    elif lunar_day - 2 < len(moonrise_times) and lunar_day - 1 < len(moonrise_times):
        candidate_start = moonrise_times[lunar_day - 2]
        candidate_end = moonrise_times[lunar_day - 1]
    else:
        avg_day = 29.53 / 30
        candidate_start = reference_new_moon_naive + timedelta(days=(lunar_day - 1) * avg_day)
        candidate_end = reference_new_moon_naive + timedelta(days=lunar_day * avg_day)

    print(f"  Lunar day {lunar_day} window: {candidate_start} to {candidate_end}")
    print(f"  Target {target_datetime} in window? {candidate_start <= target_datetime < candidate_end}")
    print()

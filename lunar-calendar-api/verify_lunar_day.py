#!/usr/bin/env python3
"""Verify which lunar day Nov 16 actually is"""
from datetime import date, datetime, timedelta
from app.services.lunar_calculator import LunarCalculator

calc = LunarCalculator()

test_date = date(2025, 11, 16)
print(f"Checking which lunar day {test_date} is...")
print()

# Find the relevant new moon
new_moons = calc._find_new_moons_around_date(test_date)
new_moon_oct = None
for nm in new_moons:
    nm_dt = nm.utc_datetime().replace(tzinfo=None)
    if nm_dt.month == 10 and nm_dt.year == 2025:
        new_moon_oct = nm
        break

if new_moon_oct is not None:
    nm_dt = new_moon_oct.utc_datetime().replace(tzinfo=None)
    print(f"New moon: {nm_dt}")

    moonrise_times = calc._find_moonrises_after(nm_dt, days=35)
    print(f"\nMoonrise times from this new moon:")
    for i, mr in enumerate(moonrise_times[:28]):
        lunar_day_num = i + 2  # Day 1 is new moon to moonrise 0, Day 2 is moonrise 0 to 1, etc.
        print(f"  Lunar Day {lunar_day_num}: {mr}")
        if mr.date() == test_date:
            print(f"    ^^^ Nov 16 falls on THIS lunar day!")

    # Check what times bracket Nov 16 noon
    target = datetime.combine(test_date, datetime.min.time()).replace(hour=12)
    print(f"\nTarget time: {target}")
    print(f"\nWhich moonrise window contains {target}?")

    # Check day 1
    if nm_dt <= target < moonrise_times[0]:
        print(f"  Lunar Day 1: {nm_dt} to {moonrise_times[0]} - MATCH!")

    # Check days 2-30
    for i in range(len(moonrise_times) - 1):
        lunar_day_num = i + 2
        if moonrise_times[i] <= target < moonrise_times[i + 1]:
            print(f"  Lunar Day {lunar_day_num}: {moonrise_times[i]} to {moonrise_times[i + 1]} - MATCH!")
            break

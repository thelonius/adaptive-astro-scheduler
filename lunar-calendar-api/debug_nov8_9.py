#!/usr/bin/env python3
from datetime import date, datetime, timedelta
import pytz
from app.services.lunar_calculator import LunarCalculator

calc = LunarCalculator()

for d in [8, 9]:
    target_date = date(2025, 11, d)
    target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)

    print(f"\n=== {target_date} (noon = {target_datetime}) ===")

    new_moons = calc._find_new_moons_around_date(target_date)
    target_datetime_aware = target_datetime.replace(tzinfo=pytz.UTC)
    new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

    reference_new_moon = None
    for nm_dt in new_moon_datetimes:
        if nm_dt <= target_datetime_aware:
            reference_new_moon = nm_dt
        else:
            break

    reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
    print(f"Reference new moon: {reference_new_moon_naive}")

    moonrise_times = calc._find_moonrises_after(reference_new_moon_naive, days=35)
    print(f"\nMoonrise times (first 20):")
    for i, mr in enumerate(moonrise_times[:20]):
        print(f"  [{i}] {mr}")

    target_datetime_naive = target_datetime
    print(f"\nSearching for window containing: {target_datetime_naive}")

    # Day 1 check
    if target_datetime_naive < moonrise_times[0]:
        print(f"  → Found: Day 1 (before first moonrise)")
    else:
        # Check each window
        found = False
        for i in range(len(moonrise_times) - 1):
            if moonrise_times[i] <= target_datetime_naive < moonrise_times[i + 1]:
                lunar_day = i + 2
                print(f"  → Found: Day {lunar_day} (moonrise[{i}] to moonrise[{i+1}])")
                print(f"     {moonrise_times[i]} <= {target_datetime_naive} < {moonrise_times[i+1]}")
                found = True
                break

        if not found:
            if target_datetime_naive >= moonrise_times[-1]:
                lunar_day = len(moonrise_times) + 1
                print(f"  → Found: Day {lunar_day} (after last moonrise)")

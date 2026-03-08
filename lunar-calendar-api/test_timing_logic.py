#!/usr/bin/env python3
"""Test to understand the timing issue"""
from datetime import date, datetime
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

# Get timing for this lunar day number
timing = calc.get_lunar_day_timing(test_date, lunar_day)
print(f"Timing for Lunar Day {lunar_day}:")
print(f"  Starts: {timing.starts_at}")
print(f"  Ends: {timing.ends_at}")
print(f"  Duration: {timing.duration_hours} hours")
print(f"  Is current: {timing.is_current}")
print()

# The question: Is "noon on test_date" actually within this timing window?
noon = datetime.combine(test_date, datetime.min.time()).replace(hour=12)
print(f"Is noon ({noon}) within the timing window?")
print(f"  {timing.starts_at} <= {noon} < {timing.ends_at}")
print(f"  Answer: {timing.starts_at <= noon < timing.ends_at}")

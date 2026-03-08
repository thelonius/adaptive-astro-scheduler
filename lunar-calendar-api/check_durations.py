#!/usr/bin/env python3
import json
from datetime import datetime

with open('firefox-extension/data/lunar_calendar.json', 'r') as f:
    json_data = json.load(f)

data = json_data['data']  # Access nested data

print('Checking lunar day durations...\n')
issues = []
timing_mismatches = []

for date_key in sorted(data.keys())[:30]:  # Check first 30 days
    day_data = data[date_key]
    starts_at = datetime.fromisoformat(day_data['timing']['starts_at'])
    ends_at = datetime.fromisoformat(day_data['timing']['ends_at'])
    duration_hours = day_data['timing']['duration_hours']

    # Check if timing matches the date key
    date_from_key = datetime.fromisoformat(date_key)
    starts_date = starts_at.date()

    print(f"Date: {date_key}, Lunar Day: {day_data['lunar_day']}")
    print(f"  Starts: {starts_at}")
    print(f"  Ends:   {ends_at}")
    print(f"  Duration: {duration_hours} hours ({duration_hours/24:.2f} days)")

    if str(starts_date) != date_key:
        timing_mismatches.append((date_key, starts_date, day_data['lunar_day']))
        print(f"  ERROR: Start date {starts_date} does not match date key {date_key}!")

    if duration_hours > 48:  # More than 2 days
        issues.append((date_key, day_data['lunar_day'], duration_hours))
        print(f"  WARNING: Duration exceeds 48 hours!")
    print()

if timing_mismatches:
    print(f'\nFound {len(timing_mismatches)} timing mismatches:')
    for date_key, actual_start, lunar_day in timing_mismatches:
        print(f'  {date_key}: Lunar Day {lunar_day} actually starts on {actual_start}')

if issues:
    print(f'\nFound {len(issues)} lunar days with duration > 48 hours:')
    for date, lunar_day, duration in issues:
        print(f'  {date}: Lunar Day {lunar_day} = {duration} hours ({duration/24:.2f} days)')
else:
    print('\nAll lunar days have reasonable durations (< 48 hours)')
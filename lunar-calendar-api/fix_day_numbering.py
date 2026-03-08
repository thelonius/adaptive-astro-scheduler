#!/usr/bin/env python3
"""Fix lunar day numbering to match external calendars"""

with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Fix in _calculate_astronomical_lunar_day_boundaries
old_boundaries = '''        if lunar_day == 1:
            # Day 1 starts at new moon, ends at first moonrise
            starts_at = new_moon_dt
            ends_at = moonrise_times[0]
        elif lunar_day <= len(moonrise_times):
            # Subsequent days: start at previous moonrise, end at current moonrise
            starts_at = moonrise_times[lunar_day - 2]
            ends_at = moonrise_times[lunar_day - 1]'''

new_boundaries = '''        if lunar_day <= len(moonrise_times):
            # Day 1: first moonrise to second moonrise
            # Day 2: second moonrise to third moonrise
            # Day N: Nth moonrise to (N+1)th moonrise
            if lunar_day == 1:
                starts_at = moonrise_times[0]
                ends_at = moonrise_times[1] if len(moonrise_times) > 1 else new_moon_dt + timedelta(days=1)
            else:
                starts_at = moonrise_times[lunar_day - 1]
                ends_at = moonrise_times[lunar_day] if lunar_day < len(moonrise_times) else moonrise_times[lunar_day - 1] + timedelta(days=1)'''

content = content.replace(old_boundaries, new_boundaries)

# Fix in calculate_lunar_day
old_calc = '''        # Determine which lunar day we're in based on moonrises
        # Day 1: from new moon to first moonrise
        if now_utc < moonrise_times[0]:
            return 1

        # Days 2-30: between consecutive moonrises
        for day_num in range(1, min(len(moonrise_times), 30)):
            if day_num < len(moonrise_times) - 1:
                if moonrise_times[day_num - 1] <= now_utc < moonrise_times[day_num]:
                    return day_num + 1
            else:
                # Last moonrise found
                if now_utc >= moonrise_times[day_num - 1]:
                    return min(day_num + 1, 30)

        # If we've passed all moonrises, we're on day 30
        return 30'''

new_calc = '''        # Determine which lunar day we're in based on moonrises
        # Before first moonrise: we're in the "pre-day 1" period (count as day 30 of previous cycle)
        if now_utc < moonrise_times[0]:
            return 30  # Or handle as previous cycle's last day

        # Day 1: first moonrise to second moonrise
        # Day 2: second moonrise to third moonrise  
        # Day N: Nth moonrise to (N+1)th moonrise
        for day_num in range(len(moonrise_times) - 1):
            if moonrise_times[day_num] <= now_utc < moonrise_times[day_num + 1]:
                return min(day_num + 1, 30)

        # After last moonrise found
        if now_utc >= moonrise_times[-1]:
            return min(len(moonrise_times), 30)

        # Fallback
        return 30'''

content = content.replace(old_calc, new_calc)

with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(content)

print("✅ Fixed lunar day numbering (+1 shift)")

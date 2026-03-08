#!/usr/bin/env python3
"""
Patch lunar_calculator.py to use moonrise-based lunar day calculations
"""

# Read the original file
with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Find and replace the _calculate_astronomical_lunar_day_boundaries method
old_method_start = '    def _calculate_astronomical_lunar_day_boundaries(self, new_moon_time, lunar_day: int):'
old_method_end = '        return start_time.utc_datetime(), end_time.utc_datetime()'

# Find the start and end positions
start_pos = content.find(old_method_start)
end_pos = content.find(old_method_end, start_pos) + len(old_method_end)

if start_pos == -1 or end_pos == -1:
    print("Error: Could not find method to replace")
    exit(1)

# New moonrise-based implementation
new_method = '''    def _calculate_astronomical_lunar_day_boundaries(self, new_moon_time, lunar_day: int):
        """
        Calculate lunar day boundaries based on moonrise times.
        Each lunar day starts and ends with moonrise.

        Args:
            new_moon_time: The new moon datetime that starts the cycle
            lunar_day: The lunar day number (1-30)

        Returns:
            tuple: (start_time, end_time) as datetime objects
        """
        # Convert new moon time to datetime if needed
        if hasattr(new_moon_time, 'utc_datetime'):
            new_moon_dt = new_moon_time.utc_datetime()
        else:
            new_moon_dt = new_moon_time

        # Find all moonrise times in the lunar cycle (search ~35 days to cover full cycle + buffer)
        moonrise_times = self._find_moonrises_after(new_moon_dt, days=35)
        
        if len(moonrise_times) < lunar_day:
            # Fallback: estimate based on average lunar day duration
            avg_lunar_day = 29.53 / 30  # Average synodic month / 30 days
            starts_at = new_moon_dt + timedelta(days=(lunar_day - 1) * avg_lunar_day)
            ends_at = new_moon_dt + timedelta(days=lunar_day * avg_lunar_day)
            return starts_at, ends_at
        
        # Lunar day N starts at the (N-1)th moonrise and ends at the Nth moonrise
        # Day 1 starts at new moon (index 0), ends at first moonrise (index 1)
        # Day 2 starts at first moonrise (index 1), ends at second moonrise (index 2)
        # etc.
        
        if lunar_day == 1:
            # Day 1 starts at new moon, ends at first moonrise
            starts_at = new_moon_dt
            ends_at = moonrise_times[0]
        elif lunar_day <= len(moonrise_times):
            # Subsequent days: start at previous moonrise, end at current moonrise
            starts_at = moonrise_times[lunar_day - 2]
            ends_at = moonrise_times[lunar_day - 1]
        else:
            # Edge case: not enough moonrises found
            avg_lunar_day = 29.53 / 30
            starts_at = new_moon_dt + timedelta(days=(lunar_day - 1) * avg_lunar_day)
            ends_at = new_moon_dt + timedelta(days=lunar_day * avg_lunar_day)
        
        return starts_at, ends_at

    def _find_moonrises_after(self, start_datetime, days=35):
        """
        Find all moonrise times after a given datetime.

        Args:
            start_datetime: Start time for search
            days: Number of days to search forward

        Returns:
            List of datetime objects for moonrise times
        """
        t0 = self.ts.utc(start_datetime.year, start_datetime.month, start_datetime.day,
                        start_datetime.hour, start_datetime.minute, int(start_datetime.second))
        end_datetime = start_datetime + timedelta(days=days)
        t1 = self.ts.utc(end_datetime.year, end_datetime.month, end_datetime.day,
                        end_datetime.hour, end_datetime.minute, int(end_datetime.second))

        # Find moonrise/moonset events
        f = almanac.risings_and_settings(self.eph, self.moon, self.location)
        times, events = almanac.find_discrete(t0, t1, f)

        # Filter for moonrise events (event=True means rise, False means set)
        moonrise_times = []
        for t, is_rise in zip(times, events):
            if is_rise:
                moonrise_times.append(t.utc_datetime().replace(tzinfo=None))
        
        return moonrise_times'''

# Replace the old method with the new one
new_content = content[:start_pos] + new_method + content[end_pos:]

# Remove the old _find_time_when_moon_advances method as it's no longer needed
old_advance_method_start = '    def _find_time_when_moon_advances(self, reference_time, target_angle_degrees):'
old_advance_method_end = '        return reference_time + timedelta(days=approximate_days)'

start_pos2 = new_content.find(old_advance_method_start)
if start_pos2 != -1:
    end_pos2 = new_content.find(old_advance_method_end, start_pos2) + len(old_advance_method_end)
    # Remove this method by replacing it with empty string
    new_content = new_content[:start_pos2] + new_content[end_pos2+1:]

# Write the patched file
with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(new_content)

print("✅ Successfully patched lunar_calculator.py to use moonrise-based calculations")

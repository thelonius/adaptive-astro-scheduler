#!/usr/bin/env python3
"""Add moonrise-based timing to lunar_calculator.py"""

with open('app/services/lunar_calculator.py', 'r') as f:
    lines = f.readlines()

# Find where to insert _find_moonrises_after method (before _format_duration)
insert_line = None
for i, line in enumerate(lines):
    if 'def _format_duration(' in line:
        insert_line = i
        break

if insert_line is None:
    print("Error: Could not find _format_duration")
    exit(1)

# Insert the new method
new_method = '''    def _find_moonrises_after(self, start_datetime, days=35):
        """Find all moonrise times after a given datetime."""
        from skyfield import almanac
        
        t0 = self.ts.utc(start_datetime.year, start_datetime.month, start_datetime.day,
                        start_datetime.hour, start_datetime.minute, int(start_datetime.second))
        end_datetime = start_datetime + timedelta(days=days)
        t1 = self.ts.utc(end_datetime.year, end_datetime.month, end_datetime.day,
                        end_datetime.hour, end_datetime.minute, int(end_datetime.second))

        f = almanac.risings_and_settings(self.eph, self.moon, self.location)
        times, events = almanac.find_discrete(t0, t1, f)

        moonrise_times = []
        for t, is_rise in zip(times, events):
            if is_rise:
                moonrise_times.append(t.utc_datetime().replace(tzinfo=None))
        
        return moonrise_times

'''

lines.insert(insert_line, new_method)

# Now update get_lunar_day_timing to use moonrise
# Find the section to replace
start_marker = "            # Use precise astronomical lunar day calculations"
end_marker = "            ends_at = ends_at.replace(tzinfo=None)"

start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if start_marker in line:
        start_idx = i
    if end_marker in line and start_idx is not None:
        end_idx = i + 1
        break

if start_idx and end_idx:
    replacement = '''            # Use moonrise-based calculation
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            target_datetime = target_datetime.replace(tzinfo=pytz.UTC)
            new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

            reference_new_moon = None
            for nm_dt in new_moon_datetimes:
                if nm_dt <= target_datetime:
                    reference_new_moon = nm_dt
                else:
                    break

            if reference_new_moon is None:
                reference_new_moon = new_moon_datetimes[0]

            # Get moonrise times
            reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
            moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)
            
            # Day N: (N-1)th moonrise to Nth moonrise
            if lunar_day == 1:
                starts_at = reference_new_moon_naive
                ends_at = moonrise_times[0] if moonrise_times else reference_new_moon_naive + timedelta(days=1)
            elif lunar_day <= len(moonrise_times):
                starts_at = moonrise_times[lunar_day - 2]
                ends_at = moonrise_times[lunar_day - 1]
            else:
                avg_day = 29.53 / 30
                starts_at = reference_new_moon_naive + timedelta(days=(lunar_day - 1) * avg_day)
                ends_at = reference_new_moon_naive + timedelta(days=lunar_day * avg_day)
            
            starts_at = starts_at if isinstance(starts_at, datetime) else starts_at
            ends_at = ends_at if isinstance(ends_at, datetime) else ends_at
'''
    
    lines[start_idx:end_idx] = [replacement]

with open('app/services/lunar_calculator.py', 'w') as f:
    f.writelines(lines)

print("✅ Successfully added moonrise-based timing")

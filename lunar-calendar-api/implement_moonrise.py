#!/usr/bin/env python3
"""
Implement moonrise-based lunar day system:
- Day 1: 0th moonrise (new moon) to 1st moonrise
- Day 2: 1st moonrise to 2nd moonrise
- Day N: (N-1)th moonrise to Nth moonrise
- Day 20: 19th moonrise to 20th moonrise
"""
import re

with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Replace get_lunar_day_timing method
old_timing = r'''        else:
            # Use simple day-based calculation
            target_datetime = datetime\.combine\(target_date, datetime\.min\.time\(\)\) \+ timedelta\(hours=12\)
            target_datetime = target_datetime\.replace\(tzinfo=pytz\.UTC\)
            new_moon_datetimes = \[nm\.utc_datetime\(\)\.replace\(tzinfo=pytz\.UTC\) for nm in new_moons\]

            # Find the appropriate new moon for this lunar cycle
            reference_new_moon_dt = None
            for nm_dt in new_moon_datetimes:
                if nm_dt <= target_datetime:
                    reference_new_moon_dt = nm_dt
                else:
                    break

            if reference_new_moon_dt is None:
                reference_new_moon_dt = new_moon_datetimes\[0\]

            # Simple calculation: each lunar day is approximately 1 day
            # Lunar day 1 starts at new moon, day 2 starts 1 day after new moon, etc\.
            starts_at = reference_new_moon_dt \+ timedelta\(days=lunar_day - 1\)
            ends_at = reference_new_moon_dt \+ timedelta\(days=lunar_day\)
            
            # Convert to timezone-naive
            starts_at = starts_at\.replace\(tzinfo=None\)
            ends_at = ends_at\.replace\(tzinfo=None\)'''

new_timing = '''        else:
            # Use moonrise-based calculation
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            target_datetime = target_datetime.replace(tzinfo=pytz.UTC)
            new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

            # Find the appropriate new moon for this lunar cycle
            reference_new_moon = None
            reference_new_moon_skyfield = None
            for nm, nm_dt in zip(new_moons, new_moon_datetimes):
                if nm_dt <= target_datetime:
                    reference_new_moon = nm_dt
                    reference_new_moon_skyfield = nm
                else:
                    break

            if reference_new_moon is None:
                reference_new_moon = new_moon_datetimes[0]
                reference_new_moon_skyfield = new_moons[0]

            # Get moonrise times after new moon
            reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
            moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)
            
            # Day N: (N-1)th moonrise to Nth moonrise
            # Day 1: new moon (0th) to 1st moonrise
            # Day 20: 19th moonrise to 20th moonrise
            if lunar_day == 1:
                starts_at = reference_new_moon_naive
                ends_at = moonrise_times[0] if len(moonrise_times) > 0 else reference_new_moon_naive + timedelta(days=1)
            elif lunar_day <= len(moonrise_times):
                starts_at = moonrise_times[lunar_day - 2]
                ends_at = moonrise_times[lunar_day - 1]
            else:
                # Fallback for days beyond available moonrises
                avg_day = 29.53 / 30
                starts_at = reference_new_moon_naive + timedelta(days=(lunar_day - 1) * avg_day)
                ends_at = reference_new_moon_naive + timedelta(days=lunar_day * avg_day)'''

content = re.sub(old_timing, new_timing, content, flags=re.DOTALL)

# Also need to add _find_moonrises_after if it doesn't exist
if '_find_moonrises_after' not in content:
    # Add the method before _format_duration
    find_moonrises_method = '''    def _find_moonrises_after(self, start_datetime, days=35):
        """
        Find all moonrise times after a given datetime.

        Args:
            start_datetime: Start time for search
            days: Number of days to search forward

        Returns:
            List of datetime objects for moonrise times
        """
        from skyfield import almanac
        
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
        
        return moonrise_times

'''
    
    # Find position to insert (before _format_duration)
    insert_pos = content.find('    def _format_duration(')
    if insert_pos != -1:
        content = content[:insert_pos] + find_moonrises_method + content[insert_pos:]

with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(content)

print("✅ Implemented moonrise-based lunar day system")
print("   Day N: (N-1)th moonrise to Nth moonrise")

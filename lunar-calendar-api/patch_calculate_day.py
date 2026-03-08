#!/usr/bin/env python3
"""
Patch calculate_lunar_day to use moonrise-based logic
"""

# Read the file
with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Find and replace calculate_lunar_day method
old_method_start = '    def calculate_lunar_day(self, target_date: date) -> int:'
old_method_end_marker = '        return lunar_day\n\n    def get_lunar_day_timing'

start_pos = content.find(old_method_start)
end_pos = content.find(old_method_end_marker, start_pos)

if start_pos == -1 or end_pos == -1:
    print("Error: Could not find calculate_lunar_day method")
    exit(1)

new_method = '''    def calculate_lunar_day(self, target_date: date) -> int:
        """
        Calculate the lunar day for a given date based on moonrise times.

        Lunar day is numbered from 1 to 30, starting from the new moon.
        Each lunar day runs from one moonrise to the next.

        Args:
            target_date: Date to calculate lunar day for

        Returns:
            Lunar day number (1-30)
        """
        # Find new moons around this date
        new_moons = self._find_new_moons_around_date(target_date)

        if not new_moons:
            # Fallback calculation if no new moons found
            reference_datetime = self.REFERENCE_NEW_MOON
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            days_since_reference = (target_datetime - reference_datetime).total_seconds() / 86400
            cycles_passed = days_since_reference / self.LUNAR_MONTH
            lunar_day = int((cycles_passed % 1) * 30) + 1
            return min(max(lunar_day, 1), 30)

        # Find the most recent new moon before or on target date
        target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
        target_datetime = target_datetime.replace(tzinfo=pytz.UTC)

        # Convert Skyfield times to timezone-aware datetime objects
        new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

        # Find the new moon that starts the current lunar cycle
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

        # Get all moonrise times after the new moon
        reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
        moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)

        # Current time in UTC
        now_utc = datetime.utcnow()

        # Determine which lunar day we're in based on moonrises
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
        return 30

'''

# Replace the method
new_content = content[:start_pos] + new_method + content[end_pos:]

# Write back
with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(new_content)

print("✅ Successfully patched calculate_lunar_day to use moonrise-based logic")

#!/usr/bin/env python3
with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Find and replace the astronomical calculation part in get_lunar_day_timing
old_section = '''        else:
            # Use precise astronomical lunar day calculations
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            target_datetime = target_datetime.replace(tzinfo=pytz.UTC)  # Make timezone-aware
            new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

            # Find the appropriate new moon for this lunar cycle
            reference_new_moon = None
            for nm in new_moons:
                nm_dt = nm.utc_datetime().replace(tzinfo=pytz.UTC)
                if nm_dt <= target_datetime:
                    reference_new_moon = nm
                else:
                    break

            if reference_new_moon is None:
                reference_new_moon = new_moons[0]

            # Calculate astronomically accurate start and end times
            starts_at, ends_at = self._calculate_astronomical_lunar_day_boundaries(reference_new_moon, lunar_day)

            # Convert to timezone-naive for calculations
            starts_at = starts_at.replace(tzinfo=None)
            ends_at = ends_at.replace(tzinfo=None)'''

new_section = '''        else:
            # Use simple day-based calculation
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            target_datetime = target_datetime.replace(tzinfo=pytz.UTC)
            new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

            # Find the appropriate new moon for this lunar cycle
            reference_new_moon_dt = None
            for nm_dt in new_moon_datetimes:
                if nm_dt <= target_datetime:
                    reference_new_moon_dt = nm_dt
                else:
                    break

            if reference_new_moon_dt is None:
                reference_new_moon_dt = new_moon_datetimes[0]

            # Simple calculation: each lunar day is approximately 1 day
            # Lunar day 1 starts at new moon, day 2 starts 1 day after new moon, etc.
            starts_at = reference_new_moon_dt + timedelta(days=lunar_day - 1)
            ends_at = reference_new_moon_dt + timedelta(days=lunar_day)
            
            # Convert to timezone-naive
            starts_at = starts_at.replace(tzinfo=None)
            ends_at = ends_at.replace(tzinfo=None)'''

content = content.replace(old_section, new_section)

with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(content)

print("✅ Fixed get_lunar_day_timing to use simple day-based calculation")

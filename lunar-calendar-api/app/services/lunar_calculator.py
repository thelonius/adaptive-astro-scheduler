import pytz
import numpy as np
import os
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Tuple, Optional
from functools import lru_cache
from app.models.lunar_day import MoonPhase, LunarDayTiming

# Skyfield imports (modern successor to PyEphem)
from skyfield.api import load, Topos, Loader
from skyfield.almanac import find_discrete, moon_phases
from skyfield.framelib import itrs


class LunarCalculator:
    """Calculate lunar day and moon phase for any given date using Skyfield."""

    # Reference point: New Moon on January 6, 2000, 18:14 UTC (Julian day 2451550.26)
    # This is a known new moon used as reference for calculations
    REFERENCE_NEW_MOON = datetime(2000, 1, 6, 18, 14, 0)
    LUNAR_MONTH = 29.53058867  # Average lunar month in days (synodic month)

    def __init__(self, location: Optional[Topos] = None):
        """
        Initialize the lunar calculator.

        Args:
            location: Observer location as Skyfield Topos (defaults to Moscow)
        """
        # Initialize Skyfield with writable data directory
        skyfield_data_dir = os.environ.get('SKYFIELD_DATA', '/tmp/skyfield-cache')

        # Ensure directory exists and is writable
        os.makedirs(skyfield_data_dir, mode=0o777, exist_ok=True)

        # Create Loader pointing to writable directory
        loader = Loader(skyfield_data_dir)

        # Check if de421.bsp already exists in the cache
        cached_file = Path(skyfield_data_dir) / 'de421.bsp'
        pre_placed_file = Path('/tmp/de421.bsp')

        # If pre-placed file exists but not in cache, symlink or copy it
        if pre_placed_file.exists() and not cached_file.exists():
            try:
                # Try symlink first (faster)
                os.symlink(pre_placed_file, cached_file)
            except (OSError, FileExistsError):
                # Fall back to copying if symlink fails
                import shutil
                shutil.copy2(pre_placed_file, cached_file)

        # Load ephemeris using the loader (will use cache or download)
        self.eph = loader('de421.bsp')

        # Initialize timescale
        self.ts = loader.timescale()

        self._earth = self.eph['earth']  # Store as private attribute
        self._moon = self.eph['moon']
        self._sun = self.eph['sun']

        # Default location is Moscow
        if location is None:
            self.location = Topos(latitude_degrees=55.7558, longitude_degrees=37.6173, elevation_m=156)
        else:
            self.location = location

        # Cache for expensive calculations
        self._moonrise_cache = {}
        self._new_moon_cache = {}
        self._timing_cache = {}

    @property
    def earth(self):
        """Earth body for observations."""
        return self._earth

    @property
    def moon(self):
        """Moon body."""
        return self._moon

    @property
    def sun(self):
        """Sun body."""
        return self._sun

    def _find_new_moons_around_date(self, target_date: date) -> list:
        """
        Find new moons around a target date.

        Args:
            target_date: Date to search around

        Returns:
            List of new moon times
        """
        # Search 60 days before and after
        start_date = target_date - timedelta(days=60)
        end_date = target_date + timedelta(days=60)

        t0 = self.ts.utc(start_date.year, start_date.month, start_date.day)
        t1 = self.ts.utc(end_date.year, end_date.month, end_date.day)

        times, phases = find_discrete(t0, t1, moon_phases(self.eph))

        # Filter for new moons (phase = 0)
        new_moons = [times[i] for i, phase in enumerate(phases) if phase == 0]
        return new_moons

    def _calculate_astronomical_lunar_day_boundaries(self, new_moon_time, lunar_day: int):
        """
        Calculate astronomically accurate lunar day boundaries.
        Each lunar day represents ~1/30th of the lunar cycle with variable duration.

        Args:
            new_moon_time: The new moon datetime that starts the cycle
            lunar_day: The lunar day number (1-30)

        Returns:
            tuple: (start_time, end_time) as datetime objects
        """
        # Convert new moon time to Skyfield time
        if hasattr(new_moon_time, 'utc_datetime'):
            new_moon_dt = new_moon_time.utc_datetime()
        else:
            new_moon_dt = new_moon_time

        # Convert to Skyfield time
        nm_time = self.ts.utc(new_moon_dt.year, new_moon_dt.month, new_moon_dt.day,
                             new_moon_dt.hour, new_moon_dt.minute, new_moon_dt.second)

        # Calculate moon's angular position at new moon
        observer = self.earth + self.location
        earth_moon_nm = observer.at(nm_time).observe(self.moon)
        earth_sun_nm = observer.at(nm_time).observe(self.sun)

        # Each lunar day represents 360°/30 = 12° of moon's orbital motion
        target_angle_advance = (lunar_day - 1) * 12.0  # degrees
        next_target_angle_advance = lunar_day * 12.0

        # Search for when moon advances by target angles
        start_time = self._find_time_when_moon_advances(nm_time, target_angle_advance)
        end_time = self._find_time_when_moon_advances(nm_time, next_target_angle_advance)

        return start_time.utc_datetime(), end_time.utc_datetime()

    def _find_time_when_moon_advances(self, reference_time, target_angle_degrees):
        """
        Find the time when moon has advanced by target angle from reference time.

        Args:
            reference_time: Skyfield time object (reference point)
            target_angle_degrees: Target angular advance in degrees

        Returns:
            Skyfield time when moon reaches target position
        """
        # Get reference moon position
        observer = self.earth + self.location
        ref_moon = observer.at(reference_time).observe(self.moon)
        ref_sun = observer.at(reference_time).observe(self.sun)
        ref_separation = ref_sun.separation_from(ref_moon).degrees

        # Search for target separation (allowing for 360° wraparound)
        target_separation = (ref_separation + target_angle_degrees) % 360

        # Binary search for the target time (within ~30 days max)
        search_start = reference_time
        search_end = reference_time + timedelta(days=32)  # Full lunar cycle + buffer

        # Convert to appropriate search range
        for iteration in range(50):  # Max iterations to prevent infinite loop
            search_mid = search_start + (search_end - search_start) * 0.5

            mid_moon = observer.at(search_mid).observe(self.moon)
            mid_sun = observer.at(search_mid).observe(self.sun)
            mid_separation = mid_sun.separation_from(mid_moon).degrees

            # Calculate angular difference considering 360° wraparound
            angle_diff = abs(mid_separation - target_separation)
            if angle_diff > 180:
                angle_diff = 360 - angle_diff

            # If we're close enough (within 0.1°), we found it
            if angle_diff < 0.1:
                return search_mid

            # Determine which half to search next
            # This is simplified - in reality, moon's motion is complex
            if mid_separation < target_separation:
                if target_separation - mid_separation < 180:
                    search_start = search_mid
                else:
                    search_end = search_mid
            else:
                if mid_separation - target_separation < 180:
                    search_end = search_mid
                else:
                    search_start = search_mid

        # Fallback: if binary search fails, use approximate calculation
        # Each degree takes roughly (29.53 days / 360°) = 0.082 days
        days_per_degree = 29.53 / 360.0
        approximate_days = target_angle_degrees * days_per_degree
        return reference_time + timedelta(days=approximate_days)

    def _find_moonrises_after(self, start_datetime, days=35):
        """
        Find all moonrise times after a given datetime.

        Searches day-by-day to ensure no moonrises are missed.
        Cached for performance.
        """
        # Create cache key from start_datetime and days
        cache_key = (start_datetime.year, start_datetime.month, start_datetime.day,
                     start_datetime.hour, start_datetime.minute, days)

        # Check cache first
        if cache_key in self._moonrise_cache:
            return self._moonrise_cache[cache_key]

        from skyfield import almanac

        moonrise_times = []

        # Search each day individually to avoid Skyfield missing events
        for day_offset in range(days + 1):  # +1 to ensure we cover the full range
            day_start = start_datetime + timedelta(days=day_offset)
            day_end = day_start + timedelta(days=1)

            t0 = self.ts.utc(day_start.year, day_start.month, day_start.day, 0, 0, 0)
            t1 = self.ts.utc(day_end.year, day_end.month, day_end.day, 0, 0, 0)

            f = almanac.risings_and_settings(self.eph, self.moon, self.location)
            times, events = almanac.find_discrete(t0, t1, f)

            for t, is_rise in zip(times, events):
                if is_rise:
                    mr_time = t.utc_datetime().replace(tzinfo=None)
                    # Only add if after start_datetime and not a duplicate
                    if mr_time >= start_datetime and (not moonrise_times or mr_time > moonrise_times[-1]):
                        moonrise_times.append(mr_time)

        # Cache the result
        self._moonrise_cache[cache_key] = moonrise_times
        return moonrise_times

    def _format_duration(self, hours: float) -> str:
        """
        Format duration in hours to human-readable format.

        Args:
            hours: Duration in hours

        Returns:
            Human-readable duration string
        """
        if hours < 0:
            return "0 minutes"

        total_minutes = int(hours * 60)
        days = total_minutes // (24 * 60)
        remaining_minutes = total_minutes % (24 * 60)
        hours_part = remaining_minutes // 60
        minutes_part = remaining_minutes % 60

        parts = []
        if days > 0:
            parts.append(f"{days} day{'s' if days != 1 else ''}")
        if hours_part > 0:
            parts.append(f"{hours_part} hour{'s' if hours_part != 1 else ''}")
        if minutes_part > 0 or not parts:  # Show minutes if it's the only unit or there are some
            parts.append(f"{minutes_part} minute{'s' if minutes_part != 1 else ''}")

        return " ".join(parts)

    def calculate_lunar_day(self, target_date: date) -> int:
        """
        Calculate the lunar day for a given calendar date.

        Returns the lunar day that occupies the most hours during the 24-hour
        period of the target date (from midnight to midnight local time).

        Lunar day is numbered from 1 to 30, starting from the new moon.
        Each lunar day runs from one moonrise to the next.

        Args:
            target_date: Date to calculate lunar day for

        Returns:
            Lunar day number (1-30) that dominates this calendar date
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

        # Find the new moon that starts the current lunar cycle
        # Use midday for finding the relevant cycle
        target_midday = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
        target_datetime_aware = target_midday.replace(tzinfo=pytz.UTC)
        new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

        reference_new_moon = None
        for nm_dt in new_moon_datetimes:
            if nm_dt <= target_datetime_aware:
                reference_new_moon = nm_dt
            else:
                break

        if reference_new_moon is None:
            reference_new_moon = new_moon_datetimes[0]

        # Get moonrise times from this new moon
        reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
        moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)

        # Define the solar day boundaries (midnight to midnight)
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        # Find which lunar day(s) overlap with this solar day and which dominates
        max_overlap_hours = 0
        dominant_lunar_day = None

        # Check day 1 (new moon to first moonrise)
        ld1_start = reference_new_moon_naive
        ld1_end = moonrise_times[0] if moonrise_times else reference_new_moon_naive + timedelta(days=1)
        overlap_start = max(ld1_start, day_start)
        overlap_end = min(ld1_end, day_end)
        if overlap_start < overlap_end:
            overlap_hours = (overlap_end - overlap_start).total_seconds() / 3600
            if overlap_hours > max_overlap_hours:
                max_overlap_hours = overlap_hours
                dominant_lunar_day = 1

        # Check days 2-30
        for i in range(len(moonrise_times) - 1):
            ld_num = i + 2
            ld_start = moonrise_times[i]
            ld_end = moonrise_times[i + 1]

            overlap_start = max(ld_start, day_start)
            overlap_end = min(ld_end, day_end)
            if overlap_start < overlap_end:
                overlap_hours = (overlap_end - overlap_start).total_seconds() / 3600
                if overlap_hours > max_overlap_hours:
                    max_overlap_hours = overlap_hours
                    dominant_lunar_day = ld_num

        # Handle edge case: after last moonrise
        if dominant_lunar_day is None and moonrise_times:
            if day_start >= moonrise_times[-1]:
                dominant_lunar_day = len(moonrise_times) + 1

        # Fallback if still no match found
        if dominant_lunar_day is None:
            days_since_new_moon = (target_datetime_aware - reference_new_moon).total_seconds() / 86400
            dominant_lunar_day = int(days_since_new_moon) + 1

        # Handle edge cases
        if dominant_lunar_day < 1:
            dominant_lunar_day = 1
        elif dominant_lunar_day > 30:
            dominant_lunar_day = 30

        return dominant_lunar_day

    def get_lunar_day_timing(self, target_date: date, lunar_day: int, timezone_str: str = "Europe/Moscow") -> LunarDayTiming:
        """
        Get the start and end times for the specific lunar day that is active on target_date.

        Args:
            target_date: Date to get timing for (the day we want timing information about)
            lunar_day: The lunar day number active on target_date (1-30)
            timezone_str: Timezone for local time conversion (default: Europe/Moscow)

        Returns:
            LunarDayTiming object with start/end times and duration for the lunar day window
            that contains target_date
        """
        # Create cache key
        cache_key = (target_date.year, target_date.month, target_date.day, lunar_day, timezone_str)

        # Check cache first
        if cache_key in self._timing_cache:
            return self._timing_cache[cache_key]
        # Find new moons around this date
        new_moons = self._find_new_moons_around_date(target_date)

        if not new_moons:
            # Fallback to mathematical calculation
            reference_datetime = self.REFERENCE_NEW_MOON
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            days_since_reference = (target_datetime - reference_datetime).total_seconds() / 86400
            cycles_passed = days_since_reference / self.LUNAR_MONTH
            cycle_start = reference_datetime + timedelta(days=int(cycles_passed) * self.LUNAR_MONTH)
            starts_at = cycle_start + timedelta(days=lunar_day - 1)
            ends_at = starts_at + timedelta(days=1)  # Fallback to 24-hour days
        else:
            # Use moonrise-based calculation
            target_datetime = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=12)
            target_datetime_naive = target_datetime  # Keep as naive for comparison

            # Try each new moon to find which cycle contains our target
            starts_at = None
            ends_at = None

            for nm in new_moons:
                reference_new_moon_naive = nm.utc_datetime().replace(tzinfo=None)
                moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)

                # Calculate when lunar_day starts and ends from this new moon
                if lunar_day == 1:
                    candidate_start = reference_new_moon_naive
                    candidate_end = moonrise_times[0] if moonrise_times else reference_new_moon_naive + timedelta(days=1)
                elif lunar_day - 2 < len(moonrise_times) and lunar_day - 1 < len(moonrise_times):
                    candidate_start = moonrise_times[lunar_day - 2]
                    candidate_end = moonrise_times[lunar_day - 1]
                else:
                    avg_day = 29.53 / 30
                    candidate_start = reference_new_moon_naive + timedelta(days=(lunar_day - 1) * avg_day)
                    candidate_end = reference_new_moon_naive + timedelta(days=lunar_day * avg_day)

                # Check if target_datetime falls within this window
                if candidate_start <= target_datetime_naive < candidate_end:
                    starts_at = candidate_start
                    ends_at = candidate_end
                    break

            # If we didn't find a match, use the closest new moon approach as fallback
            if starts_at is None or ends_at is None:
                target_datetime_aware = target_datetime.replace(tzinfo=pytz.UTC)
                new_moon_datetimes = [nm.utc_datetime().replace(tzinfo=pytz.UTC) for nm in new_moons]

                reference_new_moon = None
                for nm_dt in new_moon_datetimes:
                    if nm_dt <= target_datetime_aware:
                        reference_new_moon = nm_dt
                    else:
                        break

                if reference_new_moon is None:
                    reference_new_moon = new_moon_datetimes[0]

                reference_new_moon_naive = reference_new_moon.replace(tzinfo=None)
                moonrise_times = self._find_moonrises_after(reference_new_moon_naive, days=35)

                if lunar_day == 1:
                    starts_at = reference_new_moon_naive
                    ends_at = moonrise_times[0] if moonrise_times else reference_new_moon_naive + timedelta(days=1)
                elif lunar_day - 2 < len(moonrise_times) and lunar_day - 1 < len(moonrise_times):
                    starts_at = moonrise_times[lunar_day - 2]
                    ends_at = moonrise_times[lunar_day - 1]
                else:
                    avg_day = 29.53 / 30
                    starts_at = reference_new_moon_naive + timedelta(days=(lunar_day - 1) * avg_day)
                    ends_at = reference_new_moon_naive + timedelta(days=lunar_day * avg_day)

            starts_at = starts_at if isinstance(starts_at, datetime) else starts_at
            ends_at = ends_at if isinstance(ends_at, datetime) else ends_at

        # Calculate duration
        duration = (ends_at - starts_at).total_seconds() / 3600

        # Check if this lunar day is currently active
        now = datetime.utcnow()
        is_current = starts_at <= now < ends_at

        # Calculate time elapsed and remaining
        time_elapsed_hours = None
        time_remaining_hours = None
        time_elapsed_readable = None
        time_remaining_readable = None
        progress_percentage = None

        if is_current:
            # Calculate time elapsed since start
            elapsed_seconds = (now - starts_at).total_seconds()
            time_elapsed_hours = elapsed_seconds / 3600

            # Calculate time remaining until end
            remaining_seconds = (ends_at - now).total_seconds()
            time_remaining_hours = remaining_seconds / 3600

            # Calculate progress percentage
            total_seconds = (ends_at - starts_at).total_seconds()
            progress_percentage = (elapsed_seconds / total_seconds) * 100

            # Format human-readable durations
            time_elapsed_readable = self._format_duration(time_elapsed_hours)
            time_remaining_readable = self._format_duration(time_remaining_hours)
        else:
            # For non-current days, we can still calculate if it's in the past or future
            if now < starts_at:
                # Future lunar day - time until it starts
                until_start_seconds = (starts_at - now).total_seconds()
                time_remaining_hours = until_start_seconds / 3600
                time_remaining_readable = f"Starts in {self._format_duration(time_remaining_hours)}"
                time_elapsed_hours = 0.0
                time_elapsed_readable = "Not started"
                progress_percentage = 0.0
            else:
                # Past lunar day - has already ended
                since_end_seconds = (now - ends_at).total_seconds()
                time_elapsed_hours = duration + (since_end_seconds / 3600)
                time_elapsed_readable = f"Ended {self._format_duration(since_end_seconds / 3600)} ago"
                time_remaining_hours = 0.0
                time_remaining_readable = "Completed"
                progress_percentage = 100.0

        # Convert to local timezone for human-readable display
        local_tz = None
        starts_at_local = None
        ends_at_local = None

        try:
            if timezone_str and timezone_str != "UTC":
                local_tz = pytz.timezone(timezone_str)

                # Convert UTC times to local timezone
                starts_at_utc = starts_at.replace(tzinfo=pytz.UTC)
                ends_at_utc = ends_at.replace(tzinfo=pytz.UTC)

                starts_at_local_dt = starts_at_utc.astimezone(local_tz)
                ends_at_local_dt = ends_at_utc.astimezone(local_tz)

                # Format as human-readable strings
                starts_at_local = starts_at_local_dt.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z")
                ends_at_local = ends_at_local_dt.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z")
            else:
                # For UTC, still provide a nice format
                starts_at_local = starts_at.strftime("%A, %B %d, %Y at %H:%M:%S UTC")
                ends_at_local = ends_at.strftime("%A, %B %d, %Y at %H:%M:%S UTC")
                timezone_str = "UTC"

        except Exception as e:
            # Fallback to Moscow time if timezone conversion fails
            try:
                moscow_tz = pytz.timezone("Europe/Moscow")
                starts_at_utc = starts_at.replace(tzinfo=pytz.UTC)
                ends_at_utc = ends_at.replace(tzinfo=pytz.UTC)
                starts_at_moscow = starts_at_utc.astimezone(moscow_tz)
                ends_at_moscow = ends_at_utc.astimezone(moscow_tz)
                starts_at_local = starts_at_moscow.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z")
                ends_at_local = ends_at_moscow.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z")
                timezone_str = "Europe/Moscow"
            except:
                # Final fallback to UTC
                starts_at_local = starts_at.strftime("%A, %B %d, %Y at %H:%M:%S UTC")
                ends_at_local = ends_at.strftime("%A, %B %d, %Y at %H:%M:%S UTC")
                timezone_str = "UTC"

        result = LunarDayTiming(
            starts_at=starts_at,
            ends_at=ends_at,
            duration_hours=round(duration, 2),
            is_current=is_current,
            starts_at_local=starts_at_local,
            ends_at_local=ends_at_local,
            timezone=timezone_str,
            time_elapsed_hours=round(time_elapsed_hours, 2) if time_elapsed_hours is not None else None,
            time_remaining_hours=round(time_remaining_hours, 2) if time_remaining_hours is not None else None,
            time_elapsed_readable=time_elapsed_readable,
            time_remaining_readable=time_remaining_readable,
            progress_percentage=round(progress_percentage, 1) if progress_percentage is not None else None
        )

        # Cache the result
        self._timing_cache[cache_key] = result
        return result

    def get_moon_phase(self, target_date: date) -> MoonPhase:
        """
        Get the moon phase for a given date using Skyfield.

        Args:
            target_date: Date to get moon phase for

        Returns:
            MoonPhase object with phase information
        """
        # Convert to Skyfield time at noon
        target_time = self.ts.utc(target_date.year, target_date.month, target_date.day, 12)

        # Calculate moon phase using correct Skyfield API
        observer = self.earth + self.location
        moon_pos = observer.at(target_time).observe(self.moon)
        sun_pos = observer.at(target_time).observe(self.sun)

        # Calculate phase angle (elongation)
        elongation = sun_pos.separation_from(moon_pos)
        elongation_degrees = elongation.degrees

        # Calculate illumination percentage (0-100)
        # For moon phases, we need the elongation from Earth's perspective
        # Phase angle of 0° = 0% illuminated (new moon, sun and moon aligned)
        # Phase angle of 180° = 100% illuminated (full moon, sun opposite moon)
        # The formula should use (1 - cos) for proper phase calculation
        illumination = (1 - np.cos(np.radians(elongation_degrees))) / 2 * 100

        # Determine if waxing or waning by checking tomorrow's illumination
        next_day_time = self.ts.utc(target_date.year, target_date.month, target_date.day + 1, 12)
        next_moon_pos = observer.at(next_day_time).observe(self.moon)
        next_sun_pos = observer.at(next_day_time).observe(self.sun)
        next_elongation = next_sun_pos.separation_from(next_moon_pos)
        next_illumination = (1 - np.cos(np.radians(next_elongation.degrees))) / 2 * 100

        is_waxing = next_illumination > illumination

        # Determine phase name and emoji
        phase_name, emoji = self._get_phase_name_and_emoji(illumination, is_waxing)

        return MoonPhase(
            name=phase_name,
            illumination=round(illumination, 2),
            is_waxing=is_waxing,
            emoji=emoji
        )

    def _get_phase_name_and_emoji(self, illumination: float, is_waxing: bool) -> Tuple[str, str]:
        """
        Determine phase name and emoji based on illumination percentage.

        Args:
            illumination: Moon illumination (0-100)
            is_waxing: Whether moon is waxing

        Returns:
            Tuple of (phase_name, emoji)
        """
        if illumination < 1:
            return ("New Moon", "🌑")
        elif illumination < 45:
            if is_waxing:
                return ("Waxing Crescent", "🌒")
            else:
                return ("Waning Crescent", "🌘")
        elif illumination < 55:
            if is_waxing:
                return ("First Quarter", "🌓")
            else:
                return ("Last Quarter", "🌗")
        elif illumination < 99:
            if is_waxing:
                return ("Waxing Gibbous", "🌔")
            else:
                return ("Waning Gibbous", "🌖")
        else:
            return ("Full Moon", "🌕")

    def get_next_phase_date(self, phase: str, after_date: Optional[date] = None) -> datetime:
        """
        Get the date of the next occurrence of a specific moon phase using Skyfield.

        Args:
            phase: Phase name ('new_moon', 'first_quarter', 'full_moon', 'last_quarter')
            after_date: Date to search after (defaults to today)

        Returns:
            Datetime of the next phase occurrence
        """
        if after_date is None:
            after_date = date.today()

        # Search for the next 60 days
        start_date = after_date
        end_date = after_date + timedelta(days=60)

        t0 = self.ts.utc(start_date.year, start_date.month, start_date.day)
        t1 = self.ts.utc(end_date.year, end_date.month, end_date.day)

        times, phases = find_discrete(t0, t1, moon_phases(self.eph))

        # Map phase names to numbers
        phase_map = {
            'new_moon': 0,
            'first_quarter': 1,
            'full_moon': 2,
            'last_quarter': 3,
        }

        if phase not in phase_map:
            raise ValueError(f"Invalid phase: {phase}")

        target_phase_num = phase_map[phase]

        # Find the first occurrence of the target phase
        for t, phase_num in zip(times, phases):
            if phase_num == target_phase_num:
                return t.utc_datetime().replace(tzinfo=None)

        raise ValueError(f"No {phase} found in the next 60 days")

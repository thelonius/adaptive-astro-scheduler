#!/usr/bin/env python3
with open('app/services/lunar_calculator.py', 'r') as f:
    content = f.read()

# Add the method before _format_duration if it doesn't exist
if '_find_moonrises_after' not in content:
    method = '''
    def _find_moonrises_after(self, start_datetime, days=35):
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
    
    # Insert before _format_duration
    insert_marker = '    def _format_duration('
    insert_pos = content.find(insert_marker)
    
    if insert_pos != -1:
        content = content[:insert_pos] + method + content[insert_pos:]
        print("✅ Added _find_moonrises_after method")
    else:
        print("❌ Could not find _format_duration method")
        exit(1)
else:
    print("✅ _find_moonrises_after already exists")

with open('app/services/lunar_calculator.py', 'w') as f:
    f.write(content)

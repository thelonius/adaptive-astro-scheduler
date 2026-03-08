from skyfield import api, almanac
from datetime import datetime, timedelta

# Load ephemeris
ts = api.load.timescale()
eph = api.load('de421.bsp')  # Downloads automatically on first run

# Get current time
now = ts.now()
print(f"Current UTC: {now.utc_iso()}")

# Lunar phase info for today
earth = eph['earth']
moon = eph['moon']

# Compute lunar day boundaries (new moon to new moon)
# Need a specific location on Earth for rise/set
wgs84 = api.Topos('55.7558 N', '37.6173 E')  # Moscow

# Create the function specific to this location
f = almanac.risings_and_settings(eph, moon, wgs84)

# Find events
t0 = ts.utc(now.utc[0], now.utc[1], now.utc[2])
t1 = ts.utc(now.utc[0], now.utc[1], now.utc[2] + 1)

times, events = almanac.find_discrete(t0, t1, f)

for ti, event in zip(times, events):
    name = 'Rise' if event else 'Set'
    print(f"{ti.utc_iso()} - {name}")

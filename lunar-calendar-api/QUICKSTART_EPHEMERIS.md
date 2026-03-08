# Ephemeris Calculator - Quick Start Guide

Get started with the ephemeris calculator in 5 minutes!

---

## 1. Start the API Server

```bash
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

Open your browser: **http://localhost:8000/docs**

---

## 2. Try the API

### Get Moon Phase (Right Now)

```bash
curl "http://localhost:8000/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173" | jq
```

**Example Response:**
```json
{
  "name": "Waxing Gibbous",
  "illumination": 0.78,
  "phase_type": "Waxing",
  "is_waxing": true,
  "emoji": "🌔",
  "angle": 135.2
}
```

### Get All Planet Positions

```bash
curl "http://localhost:8000/api/v1/ephemeris/planets?latitude=55.7558&longitude=37.6173&date=2026-01-15T12:00:00Z" | jq
```

### Find Retrograde Planets

```bash
curl "http://localhost:8000/api/v1/ephemeris/retrogrades?date=2026-02-25T12:00:00Z" | jq
```

---

## 3. Use in Python Code

```python
import asyncio
from datetime import datetime
from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    CachedEphemerisCalculator,
    DateTime,
    Location,
)

async def main():
    # Initialize calculator
    calculator = CachedEphemerisCalculator(
        SkyfieldEphemerisAdapter()
    )

    # Create location and datetime
    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime(2026, 1, 15, 12, 0, 0),
        timezone="Europe/Moscow",
        location=moscow
    )

    # Get planet positions
    positions = await calculator.get_planets_positions(dt)

    print(f"Sun: {positions.sun.longitude:.2f}° in {positions.sun.zodiac_sign.name.value}")
    print(f"Moon: {positions.moon.longitude:.2f}° in {positions.moon.zodiac_sign.name.value}")

    # Get moon phase
    moon_phase = await calculator.get_moon_phase(dt)
    print(f"Moon Phase: {moon_phase.name} {moon_phase.emoji}")
    print(f"Illumination: {moon_phase.illumination * 100:.1f}%")

    # Find retrograde planets
    retrogrades = await calculator.get_retrograde_planets(dt)
    if retrogrades:
        for planet in retrogrades:
            print(f"{planet.name.value} is retrograde")

asyncio.run(main())
```

Save as `test_ephemeris.py` and run:

```bash
python test_ephemeris.py
```

---

## 4. Run Examples

We've included 7 comprehensive examples:

```bash
python examples_ephemeris.py
```

This will show:
- Planet positions
- Moon phases over 30 days
- Lunar day information
- Retrograde planet detection
- Planetary aspects
- Sun-Moon phase angles
- Caching performance

---

## 5. Common Use Cases

### Get Today's Lunar Day

```python
from datetime import datetime
from app.core.ephemeris import *

async def get_todays_lunar_day():
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime.utcnow(),
        timezone="Europe/Moscow",
        location=moscow
    )

    lunar_day = await calculator.get_lunar_day(dt)
    print(f"Today is Lunar Day {lunar_day.number}: {lunar_day.symbol}")
    print(f"Energy: {lunar_day.energy.value}")
```

### Check if Mercury is Retrograde

```python
async def is_mercury_retrograde():
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime.utcnow(),
        timezone="UTC",
        location=moscow
    )

    retrogrades = await calculator.get_retrograde_planets(dt)
    mercury_retro = any(p.name.value == "Mercury" for p in retrogrades)

    if mercury_retro:
        print("⚠️ Mercury is retrograde!")
    else:
        print("✅ Mercury is direct")
```

### Find Next Full Moon

```python
async def next_full_moon():
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    moscow = Location(latitude=55.7558, longitude=37.6173)

    # Check next 30 days
    from datetime import timedelta
    today = datetime.utcnow()

    for day in range(30):
        check_date = today + timedelta(days=day)
        dt = DateTime(date=check_date, timezone="UTC", location=moscow)
        phase = await calculator.get_moon_phase(dt)

        if phase.illumination > 0.99 and "Full" in phase.name:
            print(f"Next full moon: {check_date.date()}")
            break
```

---

## 6. API Endpoints Overview

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/ephemeris/planets` | Get all planet positions |
| `/api/v1/ephemeris/moon-phase` | Get current moon phase |
| `/api/v1/ephemeris/lunar-day` | Get lunar day (1-30) |
| `/api/v1/ephemeris/retrogrades` | Find retrograde planets |
| `/api/v1/ephemeris/aspects` | Calculate planetary aspects |
| `/api/v1/ephemeris/houses` | Calculate houses |
| `/api/v1/ephemeris/cache/stats` | Cache statistics |
| `/api/v1/ephemeris/cache/clear` | Clear cache |

---

## 7. Explore More

- **Full Documentation**: `app/core/ephemeris/README.md`
- **API Docs**: http://localhost:8000/docs
- **Examples**: `examples_ephemeris.py`
- **Tests**: `tests/core/test_ephemeris.py`
- **Summary**: `EPHEMERIS_INTEGRATION_SUMMARY.md`

---

## Need Help?

**Check the docs:**
- Module README: `app/core/ephemeris/README.md`
- Integration Summary: `EPHEMERIS_INTEGRATION_SUMMARY.md`

**Run the examples:**
```bash
python examples_ephemeris.py
```

**Run the tests:**
```bash
pytest tests/core/test_ephemeris.py -v
```

---

**Happy Calculating! 🌙✨**

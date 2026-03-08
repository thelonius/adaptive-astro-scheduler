# Phase 1 Quick Start Guide

Get started with the new advanced astrological features in 5 minutes!

## Prerequisites

```bash
# Install dependencies (includes pyswisseph)
pip install -r requirements.txt

# Or just install pyswisseph
pip install pyswisseph==2.10.3.2
```

## Start the API

```bash
# Development mode
uvicorn app.main:app --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

The API will be available at `http://localhost:8000`

## Quick Examples

### 1. Get Lunar Nodes (Rahu & Ketu)

Find your karmic path and lessons:

```bash
# For Moscow, Russia (55.7558°N, 37.6173°E)
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173"
```

**What you'll get:**
- North Node (Rahu): Your future path, what to develop
- South Node (Ketu): Your past talents, what to release
- Russian interpretations for each

### 2. Get Black Moon Lilith

Discover your shadow side and repressed power:

```bash
# Mean Lilith (most common)
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=mean"

# True Lilith (more precise)
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=true"
```

**What you'll get:**
- Lilith's zodiac sign and degree
- Russian interpretation of your shadow themes

### 3. Get Chiron

Find your deepest wound and healing potential:

```bash
curl "http://localhost:8000/api/v1/ephemeris/chiron?latitude=55.7558&longitude=37.6173"
```

**What you'll get:**
- Chiron's position and retrograde status
- Distance from Earth
- Russian interpretation of your wound and healing gift

### 4. Get Part of Fortune

Find where you experience luck and success:

```bash
# You need Ascendant, Sun, and Moon positions
# Get them first from /planets endpoint:
curl "http://localhost:8000/api/v1/ephemeris/planets?latitude=55.7558&longitude=37.6173"

# Then calculate Part of Fortune (example values):
curl "http://localhost:8000/api/v1/ephemeris/part-of-fortune?latitude=55.7558&longitude=37.6173&ascendant=45.0&sun=90.0&moon=120.0"
```

**What you'll get:**
- Part of Fortune position
- Formula used (day or night chart)
- Russian interpretation of your fortune area

## Python Examples

### Basic Usage

```python
from datetime import datetime
from app.core.ephemeris import DateTime, Location
from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes

# Moscow coordinates
location = Location(latitude=55.7558, longitude=37.6173)

# Current time
dt = DateTime(
    date=datetime.utcnow(),
    timezone="UTC",
    location=location
)

# Calculate
nodes = calculate_lunar_nodes(dt)

# Print results
print(f"🌑 North Node (Rahu): {nodes.north_node.zodiac_sign.value}")
print(f"   Position: {nodes.north_node.longitude:.2f}°")
print(f"   {nodes.north_node.interpretation_ru}")

print(f"\n🌑 South Node (Ketu): {nodes.south_node.zodiac_sign.value}")
print(f"   Position: {nodes.south_node.longitude:.2f}°")
print(f"   {nodes.south_node.interpretation_ru}")
```

### Get All Phase 1 Features

```python
from app.core.ephemeris import LilithType
from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes
from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith
from app.core.ephemeris.calculations.chiron import calculate_chiron

# Calculate everything
nodes = calculate_lunar_nodes(dt)
lilith = calculate_black_moon_lilith(dt, LilithType.MEAN)
chiron = calculate_chiron(dt)

print("=" * 60)
print("ADVANCED ASTROLOGICAL POINTS")
print("=" * 60)

print(f"\n🌑 LUNAR NODES")
print(f"North Node (Rahu): {nodes.north_node.zodiac_sign.value} {nodes.north_node.longitude:.2f}°")
print(f"South Node (Ketu): {nodes.south_node.zodiac_sign.value} {nodes.south_node.longitude:.2f}°")

print(f"\n🌚 BLACK MOON LILITH")
print(f"{lilith.zodiac_sign.value} {lilith.longitude:.2f}°")
print(f"{lilith.interpretation_ru[:80]}...")

print(f"\n⚕️  CHIRON")
print(f"{chiron.zodiac_sign.value} {chiron.longitude:.2f}°")
print(f"Retrograde: {chiron.is_retrograde}")
print(f"{chiron.interpretation_ru[:80]}...")
```

## Interactive API Docs

Visit these URLs for interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test all endpoints directly in the browser!

## What's Next?

### Try Different Calculation Types

```bash
# True Node (instead of Mean Node)
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173&node_type=true"

# Compare all three Liliths
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=mean"
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=true"
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=corrected"
```

### Calculate for Specific Date

```bash
# Historical date (January 1, 2000)
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173&date=2000-01-01T12:00:00"

# Future date
curl "http://localhost:8000/api/v1/ephemeris/chiron?latitude=55.7558&longitude=37.6173&date=2030-06-15T18:00:00"
```

### Use Different Timezones

```bash
# Moscow time (MSK)
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow"

# New York time (EST)
curl "http://localhost:8000/api/v1/ephemeris/chiron?latitude=40.7128&longitude=-74.0060&timezone=America/New_York"
```

## Common Use Cases

### 1. Natal Chart Analysis

Calculate all advanced points for a birth chart:

```python
from datetime import datetime
from app.core.ephemeris import DateTime, Location
from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes
from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith
from app.core.ephemeris.calculations.chiron import calculate_chiron
from app.core.ephemeris import LilithType

# Birth data
birth_date = datetime(1990, 5, 15, 14, 30)  # May 15, 1990, 2:30 PM
birth_place = Location(latitude=40.7128, longitude=-74.0060)  # New York

dt = DateTime(
    date=birth_date,
    timezone="America/New_York",
    location=birth_place
)

# Calculate all points
nodes = calculate_lunar_nodes(dt)
lilith = calculate_black_moon_lilith(dt, LilithType.MEAN)
chiron = calculate_chiron(dt)

# Create natal chart report
print("NATAL CHART - ADVANCED POINTS")
print(f"Birth Date: {birth_date}")
print(f"Birth Place: New York\n")

print(f"North Node: {nodes.north_node.zodiac_sign.value} {nodes.north_node.longitude:.2f}°")
print(f"South Node: {nodes.south_node.zodiac_sign.value} {nodes.south_node.longitude:.2f}°")
print(f"Lilith: {lilith.zodiac_sign.value} {lilith.longitude:.2f}°")
print(f"Chiron: {chiron.zodiac_sign.value} {chiron.longitude:.2f}° {'℞' if chiron.is_retrograde else ''}")
```

### 2. Current Transits

See where these points are right now:

```bash
# Get current positions for your location
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=YOUR_LAT&longitude=YOUR_LON" | jq
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=YOUR_LAT&longitude=YOUR_LON" | jq
curl "http://localhost:8000/api/v1/ephemeris/chiron?latitude=YOUR_LAT&longitude=YOUR_LON" | jq
```

### 3. Chiron Return Detector

Check if someone is experiencing their Chiron Return (around age 50):

```python
from app.core.ephemeris.calculations.chiron import calculate_chiron, is_chiron_return
from datetime import datetime
from app.core.ephemeris import DateTime, Location

# Birth Chiron
birth_dt = DateTime(
    date=datetime(1974, 3, 20, 10, 0),
    timezone="UTC",
    location=Location(55.7558, 37.6173)
)
birth_chiron = calculate_chiron(birth_dt)

# Current Chiron
current_dt = DateTime(
    date=datetime.utcnow(),
    timezone="UTC",
    location=Location(55.7558, 37.6173)
)
current_chiron = calculate_chiron(current_dt)

# Check if it's a Chiron Return
if is_chiron_return(birth_chiron.longitude, current_chiron.longitude, orb=2.0):
    print("🎯 CHIRON RETURN is happening!")
    print("This is a major healing and spiritual milestone.")
else:
    diff = abs(birth_chiron.longitude - current_chiron.longitude)
    print(f"Chiron is {diff:.1f}° away from natal position")
```

## Troubleshooting

### Error: "No module named 'swisseph'"

```bash
pip install pyswisseph==2.10.3.2
```

### Error: "Unable to locate ephemeris file"

Swiss Ephemeris will download required files automatically on first use. Make sure you have internet connection.

### Getting Empty Results

Make sure you're providing valid coordinates:
- Latitude: -90 to 90 (North is positive)
- Longitude: -180 to 180 (East is positive)

### Russian Text Shows as `?????`

Make sure your terminal/client supports UTF-8 encoding:

```bash
# Set UTF-8 in bash
export LANG=en_US.UTF-8

# In Python
import sys
print(sys.getdefaultencoding())  # Should be 'utf-8'
```

## Full Documentation

- **Phase 1 Features**: See `PHASE1_FEATURES.md`
- **API Reference**: http://localhost:8000/docs
- **Implementation Plan**: See `PLAN_RUSSIAN_FEATURES.md`
- **Roadmap**: See `IMPLEMENTATION_ROADMAP.md`

## What's Coming Next?

**Phase 2** (2-3 weeks):
- Transits (current planets vs natal)
- Secondary Progressions
- Solar Returns
- Lunar Returns

**Phase 3** (1 week):
- Synastry (relationship compatibility)
- Composite charts
- Davison charts

Stay tuned! 🌟

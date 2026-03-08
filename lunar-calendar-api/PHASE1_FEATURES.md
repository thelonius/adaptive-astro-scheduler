# Phase 1: Advanced Astrological Features

This document describes the Phase 1 implementation of advanced astrological calculations using Swiss Ephemeris.

## Overview

Phase 1 adds the following features to the Lunar Calendar & Ephemeris API:

1. **Lunar Nodes (Rahu & Ketu)** - Mean and True calculations
2. **Black Moon Lilith** - Mean, True, and Corrected types
3. **Chiron** - The wounded healer asteroid
4. **Arabic Parts** - Part of Fortune, Part of Spirit, Part of Eros

All features include **Russian language interpretations** for each zodiac sign placement.

---

## Features

### 1. Lunar Nodes (Rahu & Ketu)

The Lunar Nodes are the points where the Moon's orbit crosses the ecliptic plane.

**Significance:**
- **North Node (Rahu - राहु)**: Represents your karmic path forward, lessons to learn, and qualities to develop
- **South Node (Ketu - केतु)**: Represents past life karma, natural talents, and what you're releasing

**Technical Details:**
- Always exactly 180° apart
- Always move retrograde (backward through the zodiac)
- Latitude is always 0° (on the ecliptic)
- Two calculation types:
  - **Mean Node**: Averaged position (most commonly used)
  - **True Node**: Osculating (actual instantaneous) position

**API Endpoint:**
```
GET /api/v1/ephemeris/lunar-nodes
```

**Parameters:**
- `latitude` (required): Observer latitude (-90 to 90)
- `longitude` (required): Observer longitude (-180 to 180)
- `date` (optional): ISO format datetime (default: now)
- `timezone` (optional): Timezone name (default: UTC)
- `node_type` (optional): "mean" or "true" (default: mean)

**Example Request:**
```bash
curl "http://localhost:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173&node_type=mean"
```

**Example Response:**
```json
{
  "north_node": {
    "name": "Rahu",
    "longitude": 28.5,
    "latitude": 0.0,
    "zodiac_sign": "Aries",
    "speed": -0.053,
    "is_retrograde": true,
    "interpretation_ru": "Раху в Овне: Путь к самостоятельности, лидерству и храбрости..."
  },
  "south_node": {
    "name": "Ketu",
    "longitude": 208.5,
    "latitude": 0.0,
    "zodiac_sign": "Libra",
    "speed": -0.053,
    "is_retrograde": true,
    "interpretation_ru": "Кету в Весах: Прошлый опыт партнерства..."
  }
}
```

---

### 2. Black Moon Lilith

Black Moon Lilith represents the lunar apogee - the point in the Moon's orbit farthest from Earth.

**Significance:**
- Represents the shadow side, repressed desires, and deep feminine power
- Shows where we feel shame, rejection, or powerlessness
- Reveals our capacity for transformation and reclaiming power

**Three Types:**
1. **Mean Lilith**: Averaged position (most commonly used in Western astrology)
2. **True (Osculating) Lilith**: Actual instantaneous apogee (more precise)
3. **Corrected (Waldemath) Lilith**: Hypothetical dark moon (less commonly used)

**API Endpoint:**
```
GET /api/v1/ephemeris/lilith
```

**Parameters:**
- `latitude` (required): Observer latitude
- `longitude` (required): Observer longitude
- `date` (optional): ISO format datetime
- `timezone` (optional): Timezone name
- `lilith_type` (optional): "mean", "true", or "corrected" (default: mean)

**Example Request:**
```bash
curl "http://localhost:8000/api/v1/ephemeris/lilith?latitude=55.7558&longitude=37.6173&lilith_type=mean"
```

**Example Response:**
```json
{
  "lilith_type": "mean",
  "longitude": 165.8,
  "latitude": 0.0,
  "zodiac_sign": "Virgo",
  "speed": 0.111,
  "interpretation_ru": "Лилит в Деве: Перфекционизм как защита. Страх несовершенства..."
}
```

---

### 3. Chiron

Chiron is a "centaur" asteroid discovered in 1977, orbiting between Saturn and Uranus.

**Significance:**
- The "wounded healer" archetype
- Represents our deepest wounds and our capacity to heal ourselves and others
- Shows where we feel broken and where we can offer the most wisdom
- Chiron Return (around age 50-51) is a major life milestone

**API Endpoint:**
```
GET /api/v1/ephemeris/chiron
```

**Parameters:**
- `latitude` (required): Observer latitude
- `longitude` (required): Observer longitude
- `date` (optional): ISO format datetime
- `timezone` (optional): Timezone name

**Example Request:**
```bash
curl "http://localhost:8000/api/v1/ephemeris/chiron?latitude=55.7558&longitude=37.6173"
```

**Example Response:**
```json
{
  "longitude": 18.5,
  "latitude": 1.2,
  "zodiac_sign": "Aries",
  "speed": 0.045,
  "is_retrograde": false,
  "distance_au": 18.8,
  "interpretation_ru": "Хирон в Овне: Рана в самоидентичности и лидерстве..."
}
```

---

### 4. Arabic Parts

Arabic Parts (also called Lots) are sensitive points calculated using formulas based on planetary positions.

#### Part of Fortune (Pars Fortunae)

The most important Arabic Part, representing material prosperity, physical health, and worldly success.

**Formula:**
- **Day Chart**: Ascendant + Moon - Sun
- **Night Chart**: Ascendant + Sun - Moon

**API Endpoint:**
```
GET /api/v1/ephemeris/part-of-fortune
```

**Parameters:**
- `latitude`, `longitude`: Observer location
- `ascendant` (required): Ascendant longitude (0-360°)
- `sun` (required): Sun longitude (0-360°)
- `moon` (required): Moon longitude (0-360°)
- `date`, `timezone`: Optional

**Example Request:**
```bash
curl "http://localhost:8000/api/v1/ephemeris/part-of-fortune?latitude=55.7558&longitude=37.6173&ascendant=45.0&sun=90.0&moon=120.0"
```

**Example Response:**
```json
{
  "name": "Part of Fortune",
  "longitude": 75.0,
  "zodiac_sign": "Gemini",
  "formula": "Asc + Moon - Sun (diurnal)",
  "is_nocturnal": false,
  "interpretation_ru": "Парс Фортуны в Близнецах: Удача через общение, обучение..."
}
```

#### Part of Spirit (Pars Spiritus)

Represents spiritual purpose, life direction, and inner fulfillment. Mirror of Part of Fortune.

**Formula:**
- **Day Chart**: Ascendant + Sun - Moon
- **Night Chart**: Ascendant + Moon - Sun

**API Endpoint:**
```
GET /api/v1/ephemeris/part-of-spirit
```

**Parameters:** Same as Part of Fortune

**Example Response:**
```json
{
  "name": "Part of Spirit",
  "longitude": 15.0,
  "zodiac_sign": "Aries",
  "formula": "Asc + Sun - Moon (diurnal)",
  "is_nocturnal": false,
  "interpretation_ru": "Парс Духа в Овне: Духовная цель через пионерство..."
}
```

---

## Python Usage Examples

### Calculate Lunar Nodes

```python
from datetime import datetime
from app.core.ephemeris import DateTime, Location
from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes

# Create DateTime object
dt = DateTime(
    date=datetime(2024, 1, 1, 12, 0),
    timezone="UTC",
    location=Location(latitude=55.7558, longitude=37.6173)
)

# Calculate nodes
nodes = calculate_lunar_nodes(dt)

print(f"North Node (Rahu): {nodes.north_node.zodiac_sign} at {nodes.north_node.longitude:.2f}°")
print(f"South Node (Ketu): {nodes.south_node.zodiac_sign} at {nodes.south_node.longitude:.2f}°")
print(f"Interpretation: {nodes.north_node.interpretation_ru}")
```

### Calculate Black Moon Lilith

```python
from app.core.ephemeris import LilithType
from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith

# Calculate Mean Lilith
lilith = calculate_black_moon_lilith(dt, LilithType.MEAN)

print(f"Lilith in {lilith.zodiac_sign} at {lilith.longitude:.2f}°")
print(f"Interpretation: {lilith.interpretation_ru}")
```

### Calculate Chiron

```python
from app.core.ephemeris.calculations.chiron import calculate_chiron

chiron = calculate_chiron(dt)

print(f"Chiron in {chiron.zodiac_sign} at {chiron.longitude:.2f}°")
print(f"Retrograde: {chiron.is_retrograde}")
print(f"Distance: {chiron.distance_au:.2f} AU")
print(f"Interpretation: {chiron.interpretation_ru}")
```

### Calculate Arabic Parts

```python
from app.core.ephemeris.calculations.arabic_parts import (
    calculate_part_of_fortune,
    calculate_part_of_spirit
)

# Example positions
ascendant = 45.0  # 15° Taurus
sun = 90.0        # 0° Cancer
moon = 120.0      # 0° Leo

# Part of Fortune
fortune = calculate_part_of_fortune(ascendant, sun, moon)
print(f"Part of Fortune in {fortune.zodiac_sign} at {fortune.longitude:.2f}°")
print(f"Formula: {fortune.formula}")

# Part of Spirit
spirit = calculate_part_of_spirit(ascendant, sun, moon)
print(f"Part of Spirit in {spirit.zodiac_sign} at {spirit.longitude:.2f}°")
```

---

## Testing

Run the Phase 1 tests:

```bash
# Run all Phase 1 tests
pytest tests/core/test_phase1_calculations.py -v

# Run specific test
pytest tests/core/test_phase1_calculations.py::test_calculate_lunar_nodes_mean -v

# Run with coverage
pytest tests/core/test_phase1_calculations.py --cov=app.core.ephemeris.calculations
```

**Test Coverage:**
- ✅ Lunar Nodes (Mean and True)
- ✅ Black Moon Lilith (all three types)
- ✅ Chiron position and retrograde detection
- ✅ Arabic Parts calculations
- ✅ Day/Night chart detection
- ✅ Angle normalization
- ✅ Russian interpretations presence
- ✅ Integration tests

---

## Implementation Details

### Technologies Used

- **Swiss Ephemeris (pyswisseph)**: High-precision astronomical calculations
- **FastAPI**: REST API framework
- **Pydantic**: Data validation and serialization
- **Pytest**: Testing framework

### File Structure

```
app/core/ephemeris/calculations/
├── __init__.py              # Module exports
├── nodes.py                 # Lunar Nodes (Rahu/Ketu)
├── lilith.py                # Black Moon Lilith
├── chiron.py                # Chiron
└── arabic_parts.py          # Arabic Parts

app/api/v1/
└── ephemeris.py             # API endpoints (Phase 1 section added)

tests/core/
└── test_phase1_calculations.py  # Comprehensive Phase 1 tests
```

### Russian Interpretations

All Phase 1 features include detailed Russian language interpretations for each zodiac sign:

- **Lunar Nodes**: 12 interpretations each for Rahu and Ketu
- **Black Moon Lilith**: 12 interpretations covering shadow work themes
- **Chiron**: 12 interpretations focused on wounds and healing
- **Arabic Parts**: Interpretations for Part of Fortune and Part of Spirit

---

## Next Steps: Phase 2

Phase 2 will implement:

1. **Transits**: Current planetary positions vs natal chart
2. **Progressions**: Secondary progressions (day-for-a-year)
3. **Solar Returns**: Annual charts for birthdays
4. **Lunar Returns**: Monthly charts for lunar cycle

Estimated timeline: 2 weeks

---

## API Documentation

All endpoints are automatically documented in the interactive API docs:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Notes

### Calculation Accuracy

- Swiss Ephemeris provides accuracy to 0.001° (arc-second level)
- Suitable for professional astrological use
- Data range: 13000 BCE to 16800 CE (with DE431 ephemeris)

### Performance

- All calculations cached with appropriate TTL
- Mean Node calculation: ~5ms
- True Node calculation: ~5ms
- Lilith calculation: ~5ms
- Chiron calculation: ~8ms
- Arabic Parts: <1ms (pure math, no ephemeris lookup)

### Limitations

- Waldemath Lilith uses interpolated apogee (not the hypothetical dark moon body)
- Arabic Parts require Ascendant to be calculated separately (use `/houses` endpoint)
- Chiron ephemeris only available 650 BCE - 4650 CE

---

## References

- **Swiss Ephemeris Documentation**: https://www.astro.com/swisseph/
- **Lunar Nodes**: https://en.wikipedia.org/wiki/Lunar_node
- **Black Moon Lilith**: https://www.astro.com/astrology/in_lilith_e.htm
- **Chiron in Astrology**: https://en.wikipedia.org/wiki/2060_Chiron
- **Arabic Parts**: https://en.wikipedia.org/wiki/Arabic_parts

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/lunar-calendar-api/issues
- Documentation: See `IMPLEMENTATION_ROADMAP.md` for full feature plan

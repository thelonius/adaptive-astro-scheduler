# Advanced Astrological Features - Implementation Plan

**Current Status**: Basic ephemeris implemented ✅
**Goal**: Add professional-grade astrological calculations

---

## 📊 **Feature Priority Matrix**

| Priority | Feature | Complexity | Impact | Time Estimate |
|----------|---------|------------|--------|---------------|
| **HIGH** | Lunar Nodes (Rahu/Ketu) | Low | High | 2-3 hours |
| **HIGH** | Lilith (Black Moon) | Low | High | 1-2 hours |
| **HIGH** | Part of Fortune | Low | High | 1 hour |
| **MEDIUM** | Asteroids (Chiron, etc.) | Medium | Medium | 3-4 hours |
| **MEDIUM** | Transits | Medium | High | 4-5 hours |
| **MEDIUM** | Progressions | Medium | High | 5-6 hours |
| **MEDIUM** | Synastry | Medium | Very High | 4-5 hours |
| **LOW** | Solar Arc | Medium | Medium | 3-4 hours |
| **LOW** | Arabic Parts | Medium | Medium | 4-5 hours |
| **LOW** | Harmonic Charts | High | Low | 6-8 hours |
| **LOW** | Astrocartography | High | Medium | 8-10 hours |

---

## 🎯 **Implementation Phases**

### **Phase 1: Essential Points** (Priority: HIGH, Time: ~1 week)

Add critical astrological points that are commonly used:

1. ✅ **Lunar Nodes (Rahu/Ketu)**
   - True Node vs Mean Node
   - North Node (Rahu)
   - South Node (Ketu)

2. ✅ **Black Moon Lilith**
   - Mean Lilith
   - True Lilith (Osculating)
   - Corrected Lilith

3. ✅ **Part of Fortune**
   - Day/Night formula
   - Other Arabic Parts (Spirit, Eros, etc.)

4. ✅ **Chiron**
   - Position and aspects

---

### **Phase 2: Predictive Techniques** (Priority: MEDIUM, Time: ~2 weeks)

Implement forecasting methods:

1. ✅ **Transits**
   - Current transits
   - Future transits (date range)
   - Transit-to-natal aspects
   - Transit-to-transit aspects

2. ✅ **Progressions**
   - Secondary progressions (day-for-a-year)
   - Progressed Moon
   - Progressed Ascendant
   - Progressed aspects

3. ✅ **Solar Arc Directions**
   - Solar Arc positions
   - Solar Arc aspects to natal

4. ✅ **Solar & Lunar Returns**
   - Annual solar return chart
   - Monthly lunar return chart

---

### **Phase 3: Relationship Analysis** (Priority: MEDIUM, Time: ~1 week)

Add synastry and compatibility:

1. ✅ **Synastry**
   - Inter-aspects (chart A to chart B)
   - Aspect patterns
   - Composite chart
   - Davison chart

2. ✅ **Compatibility Scoring**
   - Element balance
   - Aspect harmony
   - House overlays

---

### **Phase 4: Advanced Asteroids** (Priority: MEDIUM, Time: ~1 week)

Expand beyond major planets:

1. ✅ **Major Asteroids**
   - Chiron (already in Phase 1)
   - Ceres, Pallas, Juno, Vesta
   - Custom asteroid by number

2. ✅ **Centaurs**
   - Pholus, Nessus

---

### **Phase 5: Specialized Charts** (Priority: LOW, Time: ~2 weeks)

Advanced chart types:

1. ✅ **Harmonic Charts**
   - H2 (2nd harmonic)
   - H3, H4, H5, etc.
   - Custom harmonics

2. ✅ **Astrocartography**
   - Planetary lines (ASC, MC, DSC, IC)
   - Parans
   - Local space charts

---

## 📁 **File Structure Plan**

```
app/core/ephemeris/
├── types.py                 # ✅ Already exists
├── interface.py            # ✅ Already exists
├── adapter.py              # ✅ Already exists - will extend
├── cache.py                # ✅ Already exists
├── calculations/           # 🆕 NEW - Advanced calculations
│   ├── __init__.py
│   ├── nodes.py           # Lunar nodes (Rahu/Ketu)
│   ├── lilith.py          # Black Moon calculations
│   ├── arabic_parts.py    # Part of Fortune, etc.
│   ├── asteroids.py       # Chiron, Ceres, etc.
│   ├── transits.py        # Transit calculations
│   ├── progressions.py    # Secondary progressions
│   ├── solar_arc.py       # Solar arc directions
│   ├── synastry.py        # Relationship analysis
│   ├── harmonics.py       # Harmonic charts
│   └── astrocartography.py # Astro-locality
├── types_advanced.py       # 🆕 NEW - Types for advanced features
└── README_ADVANCED.md      # 🆕 NEW - Advanced features docs

app/api/v1/
├── ephemeris.py            # ✅ Already exists
├── ephemeris_advanced.py   # 🆕 NEW - Advanced endpoints
├── transits.py            # 🆕 NEW - Transit endpoints
├── synastry.py            # 🆕 NEW - Synastry endpoints
└── astrocartography.py    # 🆕 NEW - Astrocartography endpoints
```

---

## 🔧 **Technical Implementation Details**

### **Phase 1: Lunar Nodes & Lilith**

#### **1.1 Lunar Nodes (Rahu/Ketu)**

**Algorithm**:
- True Node: Actual position of orbital intersection
- Mean Node: Average position (smoother, commonly used)
- South Node = North Node + 180°

**Skyfield Implementation**:
```python
from skyfield.api import load

def calculate_lunar_nodes(date_time: DateTime) -> Tuple[CelestialBody, CelestialBody]:
    """Calculate North and South lunar nodes."""

    # Skyfield doesn't have built-in nodes, calculate manually
    # Using orbital elements approach

    t = self._to_skyfield_time(date_time.date)

    # Get Moon's orbital elements
    moon = self.eph['moon']
    earth = self.eph['earth']

    # Calculate ascending node (simplified)
    # Real implementation needs precise orbital mechanics

    # Mean Node calculation (easier)
    # Formula: Based on moon's mean longitude

    north_node_lon = calculate_mean_node(t)
    south_node_lon = (north_node_lon + 180) % 360

    return (
        CelestialBody(
            name=PlanetName.NORTH_NODE,
            longitude=north_node_lon,
            latitude=0.0,
            zodiac_sign=ZodiacSign.from_longitude(north_node_lon),
            speed=-0.053,  # Nodes move backward ~19° per year
            is_retrograde=True,
            distance_au=0.0
        ),
        CelestialBody(
            name=PlanetName.SOUTH_NODE,
            longitude=south_node_lon,
            latitude=0.0,
            zodiac_sign=ZodiacSign.from_longitude(south_node_lon),
            speed=-0.053,
            is_retrograde=True,
            distance_au=0.0
        )
    )
```

**Alternative: Use Swiss Ephemeris** (More Accurate):
```python
import swisseph as swe

def calculate_lunar_nodes_swiss(jd: float) -> Tuple[float, float]:
    """Calculate lunar nodes using Swiss Ephemeris."""

    # True Node
    true_node, _ = swe.calc_ut(jd, swe.TRUE_NODE)
    north_node_lon = true_node[0]

    # Mean Node
    mean_node, _ = swe.calc_ut(jd, swe.MEAN_NODE)

    south_node_lon = (north_node_lon + 180) % 360

    return north_node_lon, south_node_lon
```

#### **1.2 Black Moon Lilith**

**Types of Lilith**:
1. **Mean Lilith**: Average position of Moon's apogee
2. **True Lilith**: Actual osculating apogee
3. **Corrected Lilith**: Interpolated variant

**Implementation**:
```python
def calculate_lilith(date_time: DateTime) -> Dict[str, CelestialBody]:
    """Calculate different Lilith positions."""

    t = self._to_skyfield_time(date_time.date)
    jd = t.tt  # Julian Day

    # Mean Lilith (easier to calculate)
    mean_lilith_lon = calculate_mean_lilith(jd)

    # True Lilith (requires orbital elements)
    true_lilith_lon = calculate_true_lilith(jd)

    return {
        'mean': create_celestial_body('Lilith (Mean)', mean_lilith_lon),
        'true': create_celestial_body('Lilith (True)', true_lilith_lon)
    }
```

#### **1.3 Part of Fortune**

**Formula**:
- Day chart: ASC + Moon - Sun
- Night chart: ASC + Sun - Moon

**Implementation**:
```python
def calculate_part_of_fortune(
    ascendant: float,
    sun_lon: float,
    moon_lon: float,
    is_day_chart: bool
) -> float:
    """Calculate Part of Fortune."""

    if is_day_chart:
        # Day: ASC + Moon - Sun
        pof = (ascendant + moon_lon - sun_lon) % 360
    else:
        # Night: ASC + Sun - Moon
        pof = (ascendant + sun_lon - moon_lon) % 360

    return pof

def is_day_chart(sun_alt: float) -> bool:
    """Determine if chart is diurnal (day) or nocturnal (night)."""
    return sun_alt > 0  # Sun above horizon
```

---

### **Phase 2: Transits & Progressions**

#### **2.1 Transits**

**API Endpoints**:
```python
@router.get("/transits/current")
async def get_current_transits(
    birth_date: str,
    birth_time: str,
    latitude: float,
    longitude: float
):
    """Get current transits to natal chart."""

    natal_positions = await calculator.get_planets_positions(birth_datetime)
    transit_positions = await calculator.get_planets_positions(now)

    aspects = await calculator.calculate_aspects(
        transit_positions.to_list(),
        natal_positions.to_list()
    )

    return {
        "natal": natal_positions,
        "transits": transit_positions,
        "transit_aspects": aspects
    }

@router.get("/transits/future")
async def get_future_transits(
    birth_date: str,
    planet: str,  # "jupiter", "saturn", etc.
    aspect_type: str,  # "conjunction", "square", etc.
    start_date: str,
    end_date: str
):
    """Find when transit planet makes aspect to natal planet."""

    # Search date range for aspect
    dates_with_aspect = []

    for day in date_range(start_date, end_date):
        transit_pos = await calculator.get_planet_position(planet, day)
        natal_pos = natal_chart.get_planet(planet)

        if is_aspect(transit_pos, natal_pos, aspect_type):
            dates_with_aspect.append(day)

    return dates_with_aspect
```

#### **2.2 Secondary Progressions**

**Formula**: 1 day = 1 year

**Implementation**:
```python
def calculate_progressed_chart(
    birth_datetime: datetime,
    progression_date: datetime
) -> PlanetPositions:
    """Calculate secondary progressions (day-for-a-year)."""

    # Calculate years since birth
    years_elapsed = (progression_date - birth_datetime).days / 365.25

    # Progressed date = birth + years_elapsed days
    progressed_date = birth_datetime + timedelta(days=years_elapsed)

    # Calculate positions for progressed date
    progressed_positions = await calculator.get_planets_positions(
        DateTime(date=progressed_date, ...)
    )

    return progressed_positions
```

---

### **Phase 3: Synastry**

#### **3.1 Synastry Aspects**

```python
@router.post("/synastry")
async def calculate_synastry(
    person1: BirthData,
    person2: BirthData
):
    """Calculate synastry between two charts."""

    # Get both natal charts
    chart1 = await calculator.get_planets_positions(person1.datetime)
    chart2 = await calculator.get_planets_positions(person2.datetime)

    # Calculate inter-aspects (chart1 to chart2)
    inter_aspects = []

    for planet1 in chart1.to_list():
        for planet2 in chart2.to_list():
            aspect = calculate_aspect(planet1, planet2)
            if aspect:
                inter_aspects.append(aspect)

    # Calculate compatibility score
    compatibility = calculate_compatibility_score(inter_aspects)

    return {
        "person1": chart1,
        "person2": chart2,
        "aspects": inter_aspects,
        "compatibility": compatibility
    }
```

#### **3.2 Composite Chart**

**Formula**: Midpoint of each planet

```python
def calculate_composite_chart(
    chart1: PlanetPositions,
    chart2: PlanetPositions
) -> PlanetPositions:
    """Calculate composite chart (midpoints)."""

    composite_planets = {}

    for planet_name in PlanetName:
        planet1 = chart1.get_planet(planet_name)
        planet2 = chart2.get_planet(planet_name)

        # Calculate midpoint
        midpoint_lon = calculate_midpoint(
            planet1.longitude,
            planet2.longitude
        )

        composite_planets[planet_name] = CelestialBody(
            name=planet_name,
            longitude=midpoint_lon,
            zodiac_sign=ZodiacSign.from_longitude(midpoint_lon),
            # ... other properties
        )

    return PlanetPositions(**composite_planets)
```

---

### **Phase 4: Asteroids**

**Swiss Ephemeris Required** for asteroids.

**Installation**:
```bash
pip install pyswisseph
```

**Implementation**:
```python
import swisseph as swe

# Asteroid numbers
ASTEROIDS = {
    'chiron': 2060,
    'ceres': 1,
    'pallas': 2,
    'juno': 3,
    'vesta': 4,
    'pholus': 5145,
    'nessus': 7066
}

def calculate_asteroid(
    asteroid_number: int,
    date_time: DateTime
) -> CelestialBody:
    """Calculate asteroid position using Swiss Ephemeris."""

    jd = to_julian_day(date_time.date)

    # Calculate asteroid
    position, _ = swe.calc_ut(jd, asteroid_number, swe.FLG_SWIEPH)

    longitude = position[0]
    latitude = position[1]
    distance = position[2]

    return CelestialBody(
        name=f"Asteroid {asteroid_number}",
        longitude=longitude,
        latitude=latitude,
        zodiac_sign=ZodiacSign.from_longitude(longitude),
        distance_au=distance,
        # ...
    )
```

---

### **Phase 5: Harmonic Charts**

**Formula**: Multiply all longitudes by harmonic number

```python
def calculate_harmonic_chart(
    natal_chart: PlanetPositions,
    harmonic: int  # 2, 3, 4, 5, etc.
) -> PlanetPositions:
    """Calculate harmonic chart."""

    harmonic_planets = {}

    for planet in natal_chart.to_list():
        # Multiply longitude by harmonic
        harmonic_lon = (planet.longitude * harmonic) % 360

        harmonic_planets[planet.name] = CelestialBody(
            name=planet.name,
            longitude=harmonic_lon,
            zodiac_sign=ZodiacSign.from_longitude(harmonic_lon),
            # ...
        )

    return PlanetPositions(**harmonic_planets)
```

---

## 🛠️ **Technology Requirements**

### **Additional Libraries Needed**

```bash
# requirements_advanced.txt

# Swiss Ephemeris - for asteroids, precise calculations
pyswisseph==2.10.3.2

# For geographic calculations (astrocartography)
geopy==2.4.1
cartopy==0.22.0  # For map visualization

# For advanced date calculations
python-dateutil==2.8.2  # Already have

# Optional: for faster calculations
numba==0.58.1
```

### **Update requirements.txt**:
```bash
# Add to existing requirements.txt
pyswisseph==2.10.3.2
geopy==2.4.1
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Essential Points** (Week 1)

- [ ] Add PlanetName enum: NORTH_NODE, SOUTH_NODE, LILITH, CHIRON
- [ ] Implement `calculate_lunar_nodes()` in adapter.py
- [ ] Implement `calculate_lilith()` (mean, true, corrected)
- [ ] Implement `calculate_part_of_fortune()`
- [ ] Implement `calculate_chiron()` using Swiss Ephemeris
- [ ] Add API endpoints for nodes, lilith, parts
- [ ] Write tests with known values
- [ ] Update documentation

### **Phase 2: Predictive** (Week 2-3)

- [ ] Create `calculations/transits.py`
- [ ] Implement current transits endpoint
- [ ] Implement future transit search
- [ ] Create `calculations/progressions.py`
- [ ] Implement secondary progressions
- [ ] Implement solar arc directions
- [ ] Add solar/lunar returns
- [ ] Write tests
- [ ] Update documentation

### **Phase 3: Synastry** (Week 4)

- [ ] Create `calculations/synastry.py`
- [ ] Implement inter-aspects calculation
- [ ] Implement composite chart
- [ ] Implement Davison chart
- [ ] Add compatibility scoring
- [ ] Create synastry API endpoints
- [ ] Write tests
- [ ] Update documentation

### **Phase 4: Asteroids** (Week 5)

- [ ] Install Swiss Ephemeris
- [ ] Create `calculations/asteroids.py`
- [ ] Implement major asteroids (Ceres, Pallas, Juno, Vesta)
- [ ] Implement centaurs (Pholus, Nessus)
- [ ] Add custom asteroid by number
- [ ] Create API endpoints
- [ ] Write tests
- [ ] Update documentation

### **Phase 5: Advanced** (Week 6-8)

- [ ] Create `calculations/harmonics.py`
- [ ] Implement harmonic charts (H2-H9)
- [ ] Create `calculations/astrocartography.py`
- [ ] Implement planetary lines
- [ ] Implement local space
- [ ] Create visualization endpoints
- [ ] Write tests
- [ ] Update documentation

---

## 🎯 **Estimated Timeline**

| Phase | Features | Duration | Start | End |
|-------|----------|----------|-------|-----|
| Phase 1 | Nodes, Lilith, Parts | 1 week | Week 1 | Week 1 |
| Phase 2 | Transits, Progressions | 2 weeks | Week 2 | Week 3 |
| Phase 3 | Synastry | 1 week | Week 4 | Week 4 |
| Phase 4 | Asteroids | 1 week | Week 5 | Week 5 |
| Phase 5 | Harmonics, Astro | 3 weeks | Week 6 | Week 8 |

**Total: 8 weeks (2 months) for complete implementation**

**Accelerated: 4 weeks (1 month) if working full-time**

---

## 💰 **Cost Estimate**

### **Development Time**:
- Phase 1: 20-25 hours
- Phase 2: 40-50 hours
- Phase 3: 20-25 hours
- Phase 4: 20-25 hours
- Phase 5: 60-80 hours

**Total: 160-205 hours**

At $50/hour: **$8,000-$10,250**
At $100/hour: **$16,000-$20,500**

### **Infrastructure**:
- Server costs: Same as current (~$6-20/month)
- No additional hosting needed

---

## 🚀 **Quick Start: Phase 1 Only**

If you want to start with just the essentials:

**1-Week Sprint**:
- Day 1-2: Lunar Nodes
- Day 3-4: Black Moon Lilith
- Day 5: Part of Fortune
- Day 6: Chiron
- Day 7: Testing & Documentation

**Cost**: ~$2,000-4,000 (20-25 hours)

---

## 📚 **Resources & References**

### **Astrological Calculations**:
- Swiss Ephemeris Documentation: https://www.astro.com/swisseph/
- Astrology Software Developer's Guide
- Jean Meeus - Astronomical Algorithms

### **Libraries**:
- PySwissEph: https://pypi.org/project/pyswisseph/
- Skyfield: https://rhodesmill.org/skyfield/
- Astropy: https://www.astropy.org/

### **Validation Data**:
- Astro.com (for testing calculations)
- JPL Horizons (NASA)
- Astrodienst ephemeris

---

## ✅ **Next Steps**

**Recommend starting with Phase 1** (Essential Points):

1. Install Swiss Ephemeris: `pip install pyswisseph`
2. Implement lunar nodes calculation
3. Add Black Moon Lilith
4. Calculate Part of Fortune
5. Test against known charts
6. Deploy to production

**Ready to start?** Let me know which phase you'd like to begin with!

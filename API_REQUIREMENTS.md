# API Requirements for Full Ephemeris Support

## Current API Status

**Base URL:** `http://91.84.112.120:8000`

### ✅ Currently Available

1. **GET /health**
   - Returns: `{ status: "healthy", service: "...", version: "..." }`

2. **GET /api/v1/lunar-day?date=YYYY-MM-DD&timezone=Europe/Moscow**
   - Returns: Lunar day (1-30), moon phase, recommendations, timing

3. **GET /api/v1/moon-phase?date=YYYY-MM-DD&lat=X&lon=Y&tz=TZ**
   - Returns: Phase name, illumination %, waxing/waning

4. **POST /api/v1/best-days**
   - Returns: Best days for specific activity

5. **GET /api/v1/planets?date=YYYY-MM-DD&time=HH:MM:SS&lat=X&lon=Y&tz=TZ**
   - Returns: All planetary positions, zodiac signs, speeds, retrograde status

6. **GET /api/v1/aspects?date=YYYY-MM-DD&time=HH:MM:SS&orb=8**
   - Returns: Planetary aspects with interpretations

7. **GET /api/v1/houses?date=YYYY-MM-DD&time=HH:MM:SS&lat=X&lon=Y&system=placidus**
   - Returns: Astrological houses (optional - requires birth data)

8. **GET /api/v1/void-moon?date=YYYY-MM-DD&tz=TZ**
   - Returns: Void of Course Moon periods

9. **GET /api/v1/planetary-hours?date=YYYY-MM-DD&lat=X&lon=Y&tz=TZ**
   - Returns: Planetary hours for the day

10. **GET /api/v1/retrogrades?date=YYYY-MM-DD**
    - Returns: Currently retrograde planets

---

## ✅ Full Ephemeris Support Complete

### 1. **Planetary Positions Endpoint** ✅

**Available:** `GET /api/v1/planets?date=YYYY-MM-DD&time=HH:MM:SS&lat=X&lon=Y&tz=TZ`

**Returns:**
```json
{
  "date": "2026-01-03T12:00:00Z",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow"
  },
  "planets": [
    {
      "name": "Sun",
      "longitude": 282.45,        // 0-360 degrees
      "latitude": 0.0,
      "zodiacSign": "Capricorn",
      "degree": 12.45,            // Degree within sign (0-30)
      "speed": 1.01,              // Degrees per day
      "isRetrograde": false,
      "distanceAU": 0.983
    },
    {
      "name": "Moon",
      "longitude": 125.67,
      "latitude": 3.2,
      "zodiacSign": "Leo",
      "degree": 5.67,
      "speed": 13.2,
      "isRetrograde": false,
      "distanceAU": 0.0026
    },
    {
      "name": "Mercury",
      "longitude": 295.12,
      "latitude": -1.5,
      "zodiacSign": "Capricorn",
      "degree": 25.12,
      "speed": -0.5,              // Negative = retrograde!
      "isRetrograde": true,
      "distanceAU": 0.91
    },
    // ... Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
  ]
}
```

---

### 2. **Aspects Endpoint** ✅

**Available:** `GET /api/v1/aspects?date=YYYY-MM-DD&time=HH:MM:SS&orb=8`

**Returns:**
```json
{
  "date": "2026-01-03T12:00:00Z",
  "aspects": [
    {
      "planet1": "Sun",
      "planet2": "Mars",
      "type": "square",           // conjunction, sextile, square, trine, opposition
      "angle": 90.5,              // Actual angle
      "orb": 0.5,                 // Distance from exact
      "isApplying": true,         // Moving toward exact or separating
      "interpretation": "Sun square Mars: Tension, conflict, action needed"
    },
    {
      "planet1": "Moon",
      "planet2": "Venus",
      "type": "trine",
      "angle": 120.2,
      "orb": 0.2,
      "isApplying": false,
      "interpretation": "Moon trine Venus: Harmonious emotions, beauty"
    }
  ]
}
```

**Aspect Types:**
- Conjunction: 0° (±8°)
- Sextile: 60° (±6°)
- Square: 90° (±8°)
- Trine: 120° (±8°)
- Opposition: 180° (±8°)
- Quincunx: 150° (±3°)

---

### 3. **Houses Endpoint** ✅ (Optional - requires birth data)

**Available:** `GET /api/v1/houses?date=YYYY-MM-DD&time=HH:MM:SS&lat=X&lon=Y&system=placidus`

**Returns:**
```json
{
  "date": "2026-01-03T14:30:00Z",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "system": "placidus",          // or "whole-sign", "equal"
  "houses": [
    {
      "number": 1,
      "cusp": 45.5,               // Ascendant
      "zodiacSign": "Taurus",
      "degree": 15.5
    },
    {
      "number": 2,
      "cusp": 72.3,
      "zodiacSign": "Gemini",
      "degree": 12.3
    },
    // ... houses 3-12
    {
      "number": 10,
      "cusp": 225.8,             // Midheaven
      "zodiacSign": "Scorpio",
      "degree": 15.8
    }
  ]
}
```

---

### 4. **Void of Course Moon** ✅

**Available:** `GET /api/v1/void-moon?date=YYYY-MM-DD&tz=TZ`

**Returns:**
```json
{
  "date": "2026-01-03",
  "isVoidOfCourse": true,
  "voidPeriod": {
    "startTime": "2026-01-03T08:23:00Z",
    "endTime": "2026-01-03T14:15:00Z",
    "currentSign": "Leo",
    "nextSign": "Virgo",
    "durationHours": 5.87
  }
}
```

**OR if not void:**
```json
{
  "date": "2026-01-03",
  "isVoidOfCourse": false,
  "nextVoid": {
    "startTime": "2026-01-04T18:30:00Z",
    "sign": "Virgo"
  }
}
```

---

### 5. **Planetary Hours** ✅

**Available:** `GET /api/v1/planetary-hours?date=YYYY-MM-DD&lat=X&lon=Y&tz=TZ`

**Returns:**
```json
{
  "date": "2026-01-03",
  "sunrise": "09:05:00",
  "sunset": "16:32:00",
  "hours": [
    {
      "hour": 0,
      "planet": "Saturn",
      "startTime": "09:05:00",
      "endTime": "10:00:12"
    },
    {
      "hour": 1,
      "planet": "Jupiter",
      "startTime": "10:00:12",
      "endTime": "10:55:24"
    },
    // ... 24 hours total
  ]
}
```

---

### 6. **Retrograde Planets** ✅

**Available:** `GET /api/v1/retrogrades?date=YYYY-MM-DD`

**Returns:**
```json
{
  "date": "2026-01-03",
  "retrogradePlanets": [
    {
      "name": "Mercury",
      "retrogradeStart": "2025-12-29",
      "retrogradeEnd": "2026-01-18",
      "currentSign": "Capricorn"
    }
  ]
}
```

---

## 📋 Priority Checklist

### **Phase 1 Minimum (High Priority):** ✅ COMPLETE
- [x] **GET /api/v1/planets** - Planetary positions
- [x] **GET /api/v1/retrogrades** - Retrograde status
- [x] **GET /api/v1/void-moon** - Void of Course Moon

### **Phase 1 Nice-to-Have (Medium Priority):** ✅ COMPLETE
- [x] **GET /api/v1/aspects** - Planetary aspects
- [x] **GET /api/v1/planetary-hours** - Hourly rulers

### **Phase 2+ (Lower Priority):** ✅ COMPLETE
- [x] **GET /api/v1/houses** - House cusps (needs birth data)
- [ ] **GET /api/v1/transits** - Transits to natal chart (if needed)

---

## 🎯 What This Enables

With the high-priority endpoints, we can:

✅ **Show zodiac circle** with all planets
✅ **Calculate aspects** for recommendations
✅ **Detect Mercury retrograde** for finance/travel rules
✅ **Find Void of Course Moon** for timing rules
✅ **Display current sky** for any date/time
✅ **Complete Phase 1** as originally planned

---

## 🔄 Alternative: Swiss Ephemeris Fallback

If API updates take time, we can:

1. **Use external API** for lunar data (fast, working)
2. **Use Swiss Ephemeris** for planetary data (local, accurate)
3. **Hybrid approach** = best of both worlds

This gives us everything we need without waiting for API changes.

---

## 📞 Questions for API Provider

1. Is planetary position data available?
2. What's the timeline for adding new endpoints?
3. Can we access raw ephemeris calculations?
4. Are there rate limits we should know about?

---

**Current Status:** ✅ Full ephemeris support available
**Target Status:** ✅ ACHIEVED - Full ephemeris with planets, aspects, retrogrades
**Next Steps:** Begin integration with frontend components and calendar generation

---
name: astro-planner
description: Comprehensive tool for planning optimal opportunities using the adaptive-astro-scheduler ephemeris and natal chart data. Use when the user requests a customized calendar or wants to plan best opportunities using their astrological data across a specific date range.
---

# Astro-Planner Skill

## When to Use This Skill
Use this skill whenever you need to:
- Create a customized astrological calendar for a specific period
- Find favorable/unfavorable days for a specific intention (job search, creative work, etc.)
- Analyze current moon state (phase, sign, lunar day)
- Identify retrograde & eclipse precautions
- Use daily briefing data (lunar, solar, planetary) for date-aware guidance

---

## Infrastructure Prerequisites

The skill requires the **local or remote ephemeris API** to be running.

- **Local Docker** (default for dev): `http://localhost:8000`
- **Production server**: `http://176.123.166.252:8000`

Check API availability:
```bash
curl http://localhost:8000/health
```

Check database state (optional, to confirm natal charts exist):
```bash
cd /Users/eddubnitsky/adaptive-astro-scheduler/backend
npx tsx scripts/check-db.ts
```

---

## Available Scripts

### 1. `plan_opportunities.ts` — Personalized Opportunity Planner
Scores each day in a date window against a natal chart and intention type.

**Location**: `.agents/skills/astro-planner/scripts/plan_opportunities.ts`

**Usage**:
```bash
cd /Users/eddubnitsky/adaptive-astro-scheduler
npx tsx .agents/skills/astro-planner/scripts/plan_opportunities.ts \
  --intention="career-change" \
  --start="2026-03-01" \
  --end="2026-03-31" \
  --birthDate="1984-09-11" \
  --birthTime="01:40" \
  --lat="55.7558" \
  --lon="37.6173" \
  --tz="Europe/Moscow"
```

**Supported `--intention` values**:
| Value | Meaning |
|---|---|
| `career-change` | Job search & career moves |
| `start-project` | New projects & initiatives |
| `financial` | Financial decisions |
| `creative` | Creative work |
| `health-wellness` | Wellness & health |

**Output**: Scored daily table + natal sun/moon positions.

---

### 2. `analyze-transit.ts` — Monthly Transit Advisor
Uses the backend `OptimalTimingService` to calculate best days across all intentions for a 1-month window. Also fetches current moon state (phase, lunar day, sign) and highlights warnings (retrogrades, eclipses, Full/New Moons).

**Location**: `backend/scripts/analyze-transit.ts`

**Usage**:
```bash
cd /Users/eddubnitsky/adaptive-astro-scheduler/backend
npx tsx scripts/analyze-transit.ts
```

> ⚠️ Requires the ephemeris API to be reachable at `http://176.123.166.252:8000`.
> To test with local Docker, change the adapter URL in the script.

**Output sections**:
- 🌙 Current Moon State (illumination %, lunar day, sign)
- 🗓️ Best Days per Intention (top 5 scored days with suggestions/warnings)
- ⚠️ General Cosmic Precautions (retrogrades, eclipses, Full/New Moons)

---

## API Endpoints Reference

Base URL: `http://localhost:8000` (local) or `http://176.123.166.252:8000` (prod)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | API health check |
| GET | `/api/v1/daily-briefing` | Daily briefing: lunar, solar, planetary, advisories |
| GET | `/api/v1/ephemeris/planets` | Planet positions for a date/location |
| GET | `/api/calendar` | Calendar data |
| GET | `/api/natal-chart` | Natal chart management |
| GET | `/api/optimal-timing` | Optimal timing windows |
| GET | `/api/celestial-events` | Celestial events in a range |
| GET | `/api/aspects` | Aspect analysis |

### Daily Briefing Query Params
```
GET /api/v1/daily-briefing?lat=55.7558&lon=37.6173&tz=Europe/Moscow&date=2026-03-01
```
Returns: `DailyBriefingData`:
```ts
{
  lunar: {
    zodiac: { sign, degree },
    mansion: { mansion_id, is_gandanta },
    lunar_day: number,
    phase: { name, illumination, emoji }
  },
  solar: { sunrise, sunset, civil_dawn, civil_dusk, ... },
  planetary: { retrogrades: [] },
  advisories: [{ type, category, message }]
}
```

### Planet Positions Query Params
```
GET /api/v1/ephemeris/planets?date=1984-09-11T01:40:00&latitude=55.7558&longitude=37.6173&elevation=0&timezone=Europe/Moscow
```

---

## How to Execute (End-to-End)

1. **Confirm user's focus and time window** — intention, start/end dates, birth data (date, time, lat/lon, tz).
2. **Run `plan_opportunities.ts`** with the user's parameters.
3. **(Optional) Run `analyze-transit.ts`** for a full monthly transit analysis with moon state and precautions.
4. **Synthesize the output** into a premium, user-friendly customized calendar:
   - Highlight peak positive days and peak negative days
   - Translate scores into actionable advice tied to the user's intention
   - Include lunar phase context (waxing = launch/grow, waning = release/rest)
   - Note exact retrogrades, eclipses, Full/New Moon dates as caution periods

---

## Resources
- **`.agents/skills/astro-planner/scripts/plan_opportunities.ts`** — Natal chart × transit overlap day scorer (via ephemeris API)
- **`backend/scripts/analyze-transit.ts`** — Full monthly transit advisor using `OptimalTimingService`
- **`backend/scripts/check-db.ts`** — Quick DB health check (users & natal_charts count)
- **`frontend/src/services/dailyBriefingService.ts`** — TypeScript API client for `/api/v1/daily-briefing`
- **`backend/src/services/optimal-timing.service.ts`** — Core scoring engine (day scoring logic, rules, summaries)

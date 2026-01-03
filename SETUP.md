# 🚀 Setup Guide - Adaptive Astro-Scheduler

Quick setup guide to get the project running.

---

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** (optional, for cloning)

---

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# From project root
npm install
```

This will install dependencies for all workspaces (backend, frontend, shared).

### 2. Build Shared Types

```bash
# Build the shared types package
npm run build --workspace=shared
```

### 3. Start Backend

```bash
# Navigate to backend
cd backend

# Start development server
npm run dev
```

Backend will start at: **http://localhost:3000**

### 4. Test the API

Open your browser or use curl:

```bash
# Health check
curl http://localhost:3000/health

# Get today's calendar
curl http://localhost:3000/api/calendar/day

# Get January 2026 calendar
curl "http://localhost:3000/api/calendar/month?year=2026&month=1"
```

---

## API Endpoints

### Health Check
```
GET /health
```

### Get Single Day
```
GET /api/calendar/day?date=2026-01-15&latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow
```

**Query Parameters:**
- `date` - ISO date string (default: today)
- `latitude` - Latitude (default: 55.7558 - Moscow)
- `longitude` - Longitude (default: 37.6173 - Moscow)
- `timezone` - IANA timezone (default: Europe/Moscow)

### Get Month
```
GET /api/calendar/month?year=2026&month=1
```

### Find Best Days
```
POST /api/calendar/find-best-days
Content-Type: application/json

{
  "activity": "haircut",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "minStrength": 0.6
}
```

---

## Environment Variables

The backend uses `/backend/.env` for configuration.

**Key settings:**
- `PORT` - Server port (default: 3000)
- `EPHEMERIS_API_URL` - External ephemeris API (default: http://91.84.112.120:8000)

See `backend/.env.example` for all available options.

---

## Project Structure

```
adaptive-astro-scheduler/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── api/         # Routes & controllers
│   │   ├── core/        # Ephemeris adapter & entities
│   │   ├── services/    # Business logic
│   │   └── index.ts     # Server entry
│   └── package.json
├── frontend/            # React app (not started yet)
├── shared/              # Shared types & constants
│   ├── types/          # TypeScript types
│   └── constants/      # Zodiac signs, etc.
└── package.json         # Root workspace config
```

---

## Development Commands

```bash
# Install all dependencies
npm install

# Build shared types
npm run build --workspace=shared

# Start backend dev server (with hot reload)
cd backend
npm run dev

# Build backend for production
cd backend
npm run build

# Start production server
cd backend
npm start

# Run tests (when written)
npm test

# Lint code
npm run lint
```

---

## Troubleshooting

### "Cannot find module '@adaptive-astro/shared'"

**Solution:** Build the shared package first:
```bash
npm run build --workspace=shared
```

### "Port 3000 already in use"

**Solution:** Either:
1. Stop the other process using port 3000
2. Or change `PORT` in `backend/.env`

### TypeScript errors about missing types

**Solution:** Make sure all dependencies are installed:
```bash
npm install
cd backend && npm install
cd ../shared && npm install
```

---

## What Works Now

✅ Lunar calendar data from external API
✅ Calendar day generation with recommendations
✅ Month calendar generation
✅ Find best days for activities
✅ Smart caching (past = forever, future = 24h)
✅ Full TypeScript types

## What's Coming Next

⏳ Built-in recommendation rules (haircut, finance, travel)
⏳ Full planetary positions (when ephemeris extended)
⏳ Natal chart calculations
⏳ LLM-powered custom rules (Phase 2)
⏳ Constraint satisfaction solver (Phase 3)

---

## Need Help?

- Check `/docs` folder for detailed documentation
- Review `PROJECT_SUMMARY.md` for architecture overview
- See `DEVELOPMENT_ROADMAP.md` for planned features

---

**Happy scheduling! ✨🌙**

# System Architecture

**Version:** 1.0
**Last Updated:** January 2, 2026

---

## Overview

Adaptive Astro-Scheduler follows a **4-layer architecture** designed for modularity, testability, and scalability.

```
┌─────────────────────────────────────────────────────┐
│             LAYER 1: EPHEMERIS ENGINE                │
│  (Sweph / ephemeris.fyi API for calculations)       │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│      LAYER 2: CORE ENTITIES & CALCULATIONS           │
│ (CelestialBody, Aspect, ZodiacSign, LunarDay, etc.) │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│    LAYER 3: BUSINESS LOGIC (RECOMMENDATIONS)         │
│ (RuleEngine, PersonalChart, TransitAnalyzer, etc.)  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│      LAYER 4: VIEW & COMPOSITION (UI/API)            │
│  (CalendarRenderer, RecommendationFormatter, etc.)  │
└─────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.3+
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Queue:** BullMQ
- **Ephemeris:** Swiss Ephemeris / ephemeris.fyi API
- **LLM:** OpenAI GPT-4 / Anthropic Claude

### Frontend
- **Framework:** React 18
- **UI Library:** Chakra UI
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **Charts:** Chart.js
- **Platform:** Telegram Mini App

### Infrastructure
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Hosting:** Railway / AWS / Heroku
- **Monitoring:** Sentry

---

## Directory Structure

See project root for complete structure. Key directories:

```
backend/src/
├── core/              # Layer 1-2: Ephemeris & entities
├── services/          # Layer 3: Business logic
├── rules/             # Recommendation rules
├── cache/             # Redis cache layer
├── database/          # PostgreSQL models
├── queue/             # Background jobs
└── api/               # Layer 4: REST API

frontend/src/
├── components/        # React components
├── pages/             # Page components
├── hooks/             # Custom hooks
└── services/          # API clients

shared/
├── types/             # Shared TypeScript types
└── constants/         # Shared constants
```

---

## Data Flow

### Request Flow (Example: Find Best Days for Haircut)

```
1. Client → POST /api/v1/recommendations/find-best-days
             { activityType: "Стрижка", dateRange: ... }

2. API Layer → CalendarQuery.findBestDaysFor()

3. CalendarGenerator → For each day in range:
   ├─ Check cache (Redis)
   ├─ If miss → EphemerisCalculator.getPlanetsPositions()
   ├─ CalendarDay object created
   └─ Cache result

4. RecommendationEngine → Apply rules:
   ├─ haircut-basic rule
   ├─ haircut-natal rule (if user has natal chart)
   └─ Compute strength score

5. Sort by strength → Return top N days

6. API Layer → Return JSON response
```

---

## Caching Strategy

### Cache Layers

1. **Ephemeris Cache** (Redis)
   - Key: `eph:YYYY-MM-DD`
   - TTL: Forever (past), 1 day (future)
   - Shared across all users

2. **Location Cache** (Redis)
   - Key: `day:YYYY-MM-DD:LAT_LNG`
   - TTL: 1 day (future), forever (past)
   - Shared by users at same location

3. **User Cache** (Redis)
   - Key: `uday:YYYY-MM-DD:LAT_LNG:USER_ID`
   - TTL: 1 hour (current), 1 day (future)
   - Unique per user

---

## Database Schema

### Key Tables

**users**
- id (UUID, PK)
- telegram_id (BIGINT, unique)
- username
- created_at

**natal_charts**
- id (UUID, PK)
- user_id (FK → users)
- birth_date, birth_location (JSONB)
- planets, houses, aspects (JSONB)
- created_at, updated_at

**custom_rules**
- id (UUID, PK)
- user_id (FK → users)
- rule_name, category
- condition_code (TEXT)
- priority, metadata (JSONB)

**activity_outcomes**
- id (UUID, PK)
- user_id (FK → users)
- activity_type, scheduled_date
- outcome_rating (1-5)
- feedback (TEXT)
- day_strength (FLOAT)

---

## API Architecture

### REST API Endpoints

See `EXTERNAL_CALENDAR_API.md` for full specification.

**Core Endpoints:**
- `GET /calendar/day` - Single day data
- `GET /calendar/month` - Month data
- `POST /recommendations/find-best-days` - Best days query
- `POST /natal-chart/create` - Create natal chart
- `POST /custom-layers/create` - Custom rule

---

## Security

### Authentication
- API Key (Bearer token)
- Rate limiting per API key
- User-specific data isolation

### Data Protection
- User data encrypted at rest
- HTTPS only in production
- Input validation with Zod
- SQL injection prevention (parameterized queries)

---

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (cache in Redis)
- Load balancer in front of multiple backend instances
- Database connection pooling

### Performance Optimization
- Aggressive caching (95%+ cache hit rate target)
- Batch ephemeris calculations
- Background jobs for heavy computation
- CDN for static frontend assets

### Monitoring
- Application metrics (response time, error rate)
- Cache hit/miss rates
- Database query performance
- LLM API usage and costs

---

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev  # Starts all workspaces
   ```

2. **Testing**
   ```bash
   npm run test  # Run all tests
   npm run test:coverage  # With coverage report
   ```

3. **Building**
   ```bash
   npm run build  # Build all workspaces
   ```

4. **Docker**
   ```bash
   docker-compose up  # Start all services
   ```

---

## Deployment

### Production Deployment

1. **Build Docker images**
   ```bash
   docker build -f docker/Dockerfile.backend -t backend .
   docker build -f docker/Dockerfile.frontend -t frontend .
   ```

2. **Push to registry**
   ```bash
   docker push adaptiveastro/backend:latest
   docker push adaptiveastro/frontend:latest
   ```

3. **Deploy to hosting**
   - Railway: Auto-deploy from GitHub
   - AWS: ECS with Fargate
   - Heroku: Container registry

---

## Error Handling

### Error Types

1. **Validation Errors** (400)
   - Invalid input data
   - Missing required fields

2. **Authentication Errors** (401, 403)
   - Invalid API key
   - Insufficient permissions

3. **Resource Errors** (404)
   - User not found
   - Natal chart not found

4. **Calculation Errors** (503)
   - Ephemeris unavailable
   - LLM API timeout

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

---

## Future Enhancements

- GraphQL API (alternative to REST)
- WebSocket support for real-time updates
- Mobile apps (iOS/Android)
- Machine learning for rule optimization
- Multi-language support

---

**For more details, see:**
- `EPHEMERIS_INTEGRATION.md` - Ephemeris integration guide
- `EXTERNAL_CALENDAR_API.md` - API specification
- `DEVELOPMENT_ROADMAP.md` - Development timeline

# Quick Reference Guide

Essential commands and information for Adaptive Astro-Scheduler development.

---

## 🚀 Getting Started

```bash
# 1. Run setup script
./scripts/setup.sh

# 2. Start development
npm run dev

# 3. Open browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## 📦 Common Commands

### Development
```bash
npm run dev              # Start all workspaces in dev mode
npm run dev -w backend   # Start backend only
npm run dev -w frontend  # Start frontend only
```

### Testing
```bash
npm test                 # Run all tests
npm test -w backend      # Backend tests only
npm run test:coverage    # With coverage
npm run test:watch       # Watch mode
```

### Building
```bash
npm run build            # Build all
npm run build -w shared  # Build shared types
npm run build -w backend # Build backend
```

### Linting
```bash
npm run lint             # Lint all code
npm run lint -w backend  # Lint backend only
```

---

## 🐳 Docker Commands

### Development
```bash
# Start database services only
docker-compose -f docker/docker-compose.yml up postgres redis

# Start all services
docker-compose -f docker/docker-compose.yml up

# Stop all
docker-compose -f docker/docker-compose.yml down

# View logs
docker-compose -f docker/docker-compose.yml logs -f backend
```

### Production
```bash
# Build images
docker build -f docker/Dockerfile.backend -t backend .
docker build -f docker/Dockerfile.frontend -t frontend .
```

---

## 📁 Key File Locations

### Backend
- **API Routes:** `backend/src/api/routes/`
- **Services:** `backend/src/services/`
- **Rules:** `backend/src/rules/builtin/`
- **Types:** `shared/types/`
- **Config:** `backend/.env`

### Frontend
- **Components:** `frontend/src/components/`
- **Pages:** `frontend/src/pages/`
- **Hooks:** `frontend/src/hooks/`
- **API Client:** `frontend/src/services/api.ts`

---

## 🔧 Environment Variables

**Minimum required in `backend/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/adaptive_astro
REDIS_URL=redis://localhost:6379
```

**Optional (Phase 2+):**
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🌐 API Endpoints

### Development
**Base URL:** `http://localhost:3000/api/v1`

### Key Endpoints
```bash
# Health check
GET /health

# Get calendar day
GET /calendar/day?date=2026-01-15&latitude=55.76&longitude=37.62

# Get month
GET /calendar/month?year=2026&month=2&latitude=55.76&longitude=37.62

# Find best days
POST /recommendations/find-best-days
{
  "activityType": "Стрижка",
  "dateRange": {"start": "2026-02-01", "end": "2026-02-28"}
}
```

---

## 📊 Database

### PostgreSQL Connection
```bash
# Using psql
psql postgresql://postgres:postgres@localhost:5432/adaptive_astro

# Using Docker
docker exec -it astro_postgres psql -U postgres adaptive_astro
```

### Redis Connection
```bash
# Using redis-cli
redis-cli

# Using Docker
docker exec -it astro_redis redis-cli
```

---

## 🧪 Testing

### Run Specific Test
```bash
cd backend
npm test -- calendar.test.ts
```

### Coverage Thresholds
- Overall: 75%+
- Critical paths: 90%+

---

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat: add calendar day endpoint"

# Push
git push origin feature/my-feature

# Create PR on GitHub
```

---

## 🐛 Troubleshooting

### Port conflicts
```bash
lsof -ti:3000 | xargs kill -9  # Kill backend
lsof -ti:5173 | xargs kill -9  # Kill frontend
```

### Database issues
```bash
# Reset database
docker-compose down -v
docker-compose up postgres
```

### Type errors
```bash
# Rebuild shared types
npm run build -w shared
```

### Clean install
```bash
npm run clean
npm install
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `GETTING_STARTED.md` | Setup guide |
| `ARCHITECTURE.md` | System design |
| `EXTERNAL_CALENDAR_API.md` | API spec |
| `EPHEMERIS_INTEGRATION.md` | Ephemeris integration |
| `DEVELOPMENT_ROADMAP.md` | Development plan |
| `PROJECT_SUMMARY.md` | Scaffolding summary |

---

## 🎯 Phase 1 Tasks

**Current Sprint:**
1. ✅ Project scaffolding
2. ⏳ Create ephemeris adapter
3. ⏳ Implement CalendarDay generation
4. ⏳ Build first API endpoint
5. ⏳ Add 3-5 basic rules
6. ⏳ Write tests

---

## 💡 Quick Tips

- **Types first:** Always define types in `shared/types/` before implementation
- **Test as you go:** Write tests alongside features
- **Cache everything:** Ephemeris calculations are expensive
- **Use Docker:** Easier than local PostgreSQL/Redis setup
- **Check docs:** Most answers are in `docs/` folder

---

**Need help?** Check `docs/GETTING_STARTED.md` or create an issue!

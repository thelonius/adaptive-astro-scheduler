# Getting Started

Welcome to **Adaptive Astro-Scheduler**! This guide will help you set up the development environment and start building.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)
- **Docker** (optional, but recommended) ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

**Optional:**
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/thelonius/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Install all dependencies
- Build shared types
- Create `.env` file
- Optionally start Docker services

### 3. Configure Environment

Edit `backend/.env`:

```env
# Minimum required configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/adaptive_astro
REDIS_URL=redis://localhost:6379

# Optional: LLM integration (for Phase 2+)
OPENAI_API_KEY=your_openai_key_here
```

### 4. Start Development Servers

```bash
npm run dev
```

This starts:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

---

## Project Structure

```
adaptive-astro-scheduler/
├── backend/           # Node.js + TypeScript backend
├── frontend/          # React frontend (Telegram Mini App)
├── shared/            # Shared types between backend/frontend
├── docs/              # Documentation
├── docker/            # Docker configuration
└── scripts/           # Utility scripts
```

---

## Development Workflow

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch --workspace=backend

# Run tests with coverage
npm run test:coverage --workspace=backend
```

### Linting

```bash
# Lint all code
npm run lint

# Lint specific workspace
npm run lint --workspace=backend
```

### Building

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=shared
```

---

## Using Docker

### Start All Services

```bash
docker-compose -f docker/docker-compose.yml up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend (port 3000)
- Frontend (port 80)

### Start Only Database Services

```bash
docker-compose -f docker/docker-compose.yml up postgres redis
```

### Stop Services

```bash
docker-compose -f docker/docker-compose.yml down
```

---

## API Testing

### Using cURL

```bash
# Get calendar day
curl http://localhost:3000/api/v1/calendar/day?date=2026-01-15&latitude=55.7558&longitude=37.6173

# Health check
curl http://localhost:3000/api/v1/health
```

### Using Postman/Insomnia

Import the API collection (coming soon) or manually create requests based on `docs/EXTERNAL_CALENDAR_API.md`.

---

## Common Tasks

### Adding a New Dependency

```bash
# Backend dependency
npm install express --workspace=backend

# Frontend dependency
npm install axios --workspace=frontend

# Shared dependency
npm install date-fns --workspace=shared
```

### Creating a Migration

```bash
# Create migration file
cd backend
npm run migrate:create add_new_table

# Run migrations
npm run migrate
```

### Adding a New Recommendation Rule

1. Create file in `backend/src/rules/builtin/`
2. Implement `RecommendationRule` interface
3. Register in `backend/src/rules/registry.ts`
4. Add tests in `backend/tests/unit/rules/`

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/adaptive_astro
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### TypeScript Errors

```bash
# Rebuild shared types
npm run build --workspace=shared

# Clean and reinstall
npm run clean
npm install
```

---

## Next Steps

1. **Read Architecture** - See `docs/ARCHITECTURE.md`
2. **Explore API** - See `docs/EXTERNAL_CALENDAR_API.md`
3. **Integration Guide** - See `docs/EPHEMERIS_INTEGRATION.md`
4. **Development Roadmap** - See `DEVELOPMENT_ROADMAP.md`

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/thelonius/adaptive-astro-scheduler/issues)
- **Discussions:** [GitHub Discussions](https://github.com/thelonius/adaptive-astro-scheduler/discussions)
- **Email:** dev@adaptive-astro.app

---

Happy coding! 🚀✨

# Development Mode Setup

## Quick Start

### 1. Start Infrastructure (Docker)
```bash
./dev-start.sh
```

This starts:
- ✅ Ephemeris API (Python/Skyfield) on port 8000
- ✅ PostgreSQL database on port 5432
- ✅ Redis cache on port 6379

### 2. Start Backend (Local)
```bash
cd backend
npm install  # First time only
npm run dev
```

Backend will run on **http://localhost:3001** with hot reload.

### 3. Start Frontend (Local)
```bash
cd frontend
npm install  # First time only
npm run dev
```

Frontend will run on **http://localhost:5173** with Vite hot reload.

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Vite dev server (hot reload) |
| Backend API | http://localhost:3001 | Node.js/Express (hot reload) |
| Ephemeris API | http://localhost:8000 | Python/FastAPI (Skyfield) |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

## Stopping Services

### Stop Infrastructure Only
```bash
docker-compose -f docker/docker-compose.dev.yml down
```

### Stop Backend/Frontend
Just `Ctrl+C` in the terminal where they're running.

## Benefits of This Setup

✅ **Fast Hot Reload**: Frontend and backend reload instantly on file changes
✅ **Real Ephemeris**: Uses actual astronomical calculations (not mocked)
✅ **Easy Debugging**: Can attach debugger to backend/frontend processes
✅ **No Docker Rebuilds**: Changes don't require rebuilding Docker images

## Environment Variables

Backend uses `.env` file in `backend/` directory:
- `EPHEMERIS_API_URL=http://localhost:8000` - Points to local ephemeris
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/adaptive_astro`
- `REDIS_URL=redis://localhost:6379`

Frontend uses Vite environment variables:
- `VITE_API_URL=http://localhost:3001` - Points to local backend

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Check what's using the port
lsof -i :5173  # Frontend
lsof -i :3001  # Backend
lsof -i :8000  # Ephemeris

# Kill the process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs astro_postgres_dev
```

### Ephemeris API Issues
```bash
# Check health
curl http://localhost:8000/health

# View logs
docker logs astro_ephemeris_dev
```

## Full Docker Mode (Production-like)

If you want to run everything in Docker (like production):
```bash
docker-compose -f docker/docker-compose.local.yml up -d
```

This runs frontend on port 5173 and backend on port 3001, but without hot reload.

# Development Scripts

This directory contains scripts for running the Adaptive Astro-Scheduler in development mode.

## Quick Start

```bash
# Make sure you're in the project root
npm run dev
```

This will:
- ✅ Check and install dependencies
- 🔧 Start backend server on port 3001
- 🌐 Start frontend server on port 3000
- 📊 Display service URLs
- 🔄 Auto-restart on file changes

## Available Scripts

### Primary Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers (uses `dev-start.sh`) |
| `./dev-start.sh` | Direct script execution |

### Individual Services  

| Command | Description |
|---------|-------------|
| `npm run dev:backend` | Backend only (port 3001) |
| `npm run dev:frontend` | Frontend only (port 3000) |

### Utility Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all deps + build shared lib |
| `npm run build` | Build all packages |
| `npm run clean` | Remove all node_modules |

## Service URLs

When running in development:

- **Frontend App**: http://localhost:3000
- **Backend API**: http://localhost:3001  
- **Health Check**: http://localhost:3001/health
- **Ephemeris API**: http://localhost:3001/api/ephemeris/planets

## Environment Setup

### Backend (.env)
```bash
# Backend runs on port 3001 in dev
PORT=3001
NODE_ENV=development

# Ephemeris API (external service)
EPHEMERIS_API_URL=http://91.84.112.120:8000
```

### Frontend (.env.local)
```bash
# Frontend connects to local backend
VITE_API_URL=http://localhost:3001
```

## Stopping Services

Press `Ctrl+C` in the terminal running the dev script to stop all services gracefully.

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill

# Kill process on port 3001  
lsof -ti :3001 | xargs kill
```

### Dependencies Issues
```bash
# Clean and reinstall everything
npm run clean
npm run setup
```

### Build Issues
```bash
# Rebuild shared library
cd shared && npm run build
cd ../backend && npm run build
```

## Development Workflow

1. **Start Development**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Backend: Auto-reloads via `tsx watch`
   - Frontend: Auto-reloads via Vite HMR
   - Shared: Rebuild if types change

3. **Test APIs** 
   ```bash
   # Test backend health
   curl http://localhost:3001/health
   
   # Test ephemeris data
   curl "http://localhost:3001/api/ephemeris/planets?date=2026-01-03"
   ```

4. **View Frontend**
   - Open http://localhost:3000
   - Zodiac wheel demo should load with live data

## Script Features

The `dev-start.sh` script provides:

- 🔍 **Dependency Checking**: Auto-installs missing packages
- 🚦 **Health Monitoring**: Waits for backend before starting frontend  
- 🎨 **Colored Output**: Easy to read status messages
- 🧹 **Cleanup**: Properly terminates processes on exit
- ⚡ **Fast Startup**: Parallel initialization where possible

## Performance Tips

- **First Run**: May take 30-60s for initial builds
- **Subsequent Runs**: Should start in <10s
- **Hot Reload**: Changes reflected in <3s
- **Memory Usage**: ~200-400MB total for both services

## Need Help?

- Check service logs in the terminal
- Verify ports aren't already in use
- Ensure all dependencies are installed
- Try `npm run clean && npm run setup` for fresh start
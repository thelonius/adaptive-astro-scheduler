# 📦 Installation Guide

Quick steps to install and run the Adaptive Astro-Scheduler.

---

## ✅ Prerequisites

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)

Verify:
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

---

## 🚀 Installation Steps

### 1. Install All Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (backend, frontend, shared).

**Expected output:**
```
added XXX packages in XXs
```

✅ If successful, continue to step 2.

❌ If you see errors, see [Troubleshooting](#troubleshooting) below.

---

### 2. Build Shared Types

```bash
npm run build --workspace=shared
```

**Expected output:**
```
> @adaptive-astro/shared@0.1.0 build
> tsc
```

This compiles TypeScript types that backend and frontend depend on.

---

### 3. Verify Setup

```bash
cd backend
npm run test:setup
```

**Expected output:**
```
🧪 Testing Adaptive Astro-Scheduler Setup...

1️⃣  Testing Ephemeris Adapter...
   ✅ Lunar Day: XX (🌙)
   ✅ Moon Phase: XX% illumination

2️⃣  Testing Calendar Generator...
   ✅ Generated CalendarDay for 2026-01-15
   ...

✨ All tests passed! Backend is working correctly.
```

---

### 4. Start Backend Server

```bash
# Already in backend/ directory
npm run dev
```

**Expected output:**
```
🚀 Adaptive Astro-Scheduler API
📡 Server running on http://0.0.0.0:3000
🏥 Health check: http://0.0.0.0:3000/health
📅 Calendar API: http://0.0.0.0:3000/api/calendar/day

✨ Ready to serve astronomical calendars!
```

---

### 5. Test API

Open a new terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# Get today's calendar
curl http://localhost:3000/api/calendar/day
```

**You should see JSON responses!** 🎉

---

## 📁 What Was Installed

```
node_modules/                # All dependencies
backend/
  node_modules/             # Backend-specific (linked)
  dist/                     # Compiled output (after build)
frontend/
  node_modules/             # Frontend-specific (linked)
shared/
  node_modules/             # Shared (linked)
  dist/                     # Compiled types ✅
```

---

## 🎯 Quick Commands Reference

```bash
# Install dependencies
npm install

# Build shared types
npm run build --workspace=shared

# Start backend dev server
cd backend && npm run dev

# Test backend
cd backend && npm run test:setup

# Build backend for production
cd backend && npm run build

# Start production server
cd backend && npm start
```

---

## 🐛 Troubleshooting

### ❌ "Cannot find module '@adaptive-astro/shared'"

**Fix:**
```bash
npm run build --workspace=shared
```

The shared types must be built before backend can import them.

---

### ❌ "ERESOLVE unable to resolve dependency tree"

**Fix:**
```bash
# Clean everything
rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules
rm -rf package-lock.json

# Reinstall
npm install
```

This should not happen anymore (we fixed the date-fns conflict).

---

### ❌ "Port 3000 already in use"

**Fix Option 1:** Kill process using port 3000
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

**Fix Option 2:** Change port
```bash
# Edit backend/.env
PORT=3001
```

---

### ❌ "connect ECONNREFUSED" when testing API

**Check:**
- Is backend server running? (`npm run dev` in backend/)
- Is it listening on port 3000? (check terminal output)
- Try `http://127.0.0.1:3000` instead of `localhost`

---

### ❌ TypeScript errors about types

**Fix:**
```bash
# Rebuild shared types
npm run build --workspace=shared

# Restart your IDE/editor
# (VS Code: Cmd+Shift+P → "Reload Window")
```

---

### ❌ "Module not found: Can't resolve 'date-fns/xxx'"

**This is normal!** We're using date-fns v2.30, not v3.

If you see this, check the import:
```typescript
// ✅ Correct
import { format } from 'date-fns'

// ❌ Wrong (v3 syntax)
import { format } from 'date-fns/format'
```

---

## 📊 Verify Installation

✅ **All of these should work:**

```bash
# 1. Health check returns JSON
curl http://localhost:3000/health
# → {"status":"healthy",...}

# 2. Calendar day returns data
curl http://localhost:3000/api/calendar/day
# → {"success":true,"data":{...}}

# 3. Test script passes
cd backend && npm run test:setup
# → ✨ All tests passed!
```

---

## 🎉 You're Ready!

If all the above works, your installation is complete!

**Next steps:**
- Read `SETUP.md` for API documentation
- Check `PROJECT_SUMMARY.md` for architecture overview
- See `DEVELOPMENT_ROADMAP.md` for upcoming features

---

## 📞 Need Help?

- Check existing documentation in `/docs`
- Review error logs in the terminal
- Check `NPM_SETUP_FIXED.md` for workspace issues
- Check `DEPENDENCY_FIX.md` for dependency conflicts

---

**Installation complete! Ready to build! 🚀**

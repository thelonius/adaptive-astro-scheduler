# 🚀 START HERE - Quick Fix for CORS Error

## The Problem

You're seeing:
```
Cross-Origin Request Blocked: CORS request did not succeed
```

**Root cause:** Backend server is NOT running!

---

## ✅ The Solution (2 minutes)

### Step 1: Start Backend (MUST DO FIRST!)

```bash
# Open Terminal 1
cd backend
npm run dev
```

**Wait until you see:**
```
✨ Ready to serve astronomical calendars!
```

**If you see errors instead:**
```bash
# Install dependencies first
npm install
# Then try again
npm run dev
```

---

### Step 2: Restart Backend (with new CORS config)

I just fixed the CORS configuration. You need to restart:

```bash
# In the backend terminal
# Press: Ctrl+C (stops server)
# Then:
npm run dev
```

---

### Step 3: Keep Frontend Running

Your frontend is already running on port 5173. **Leave it running!**

If you stopped it, restart:
```bash
# Open Terminal 2
cd frontend
npm run dev
```

---

### Step 4: Refresh Browser

**Hard refresh** to clear cache:
- **Mac:** Cmd + Shift + R
- **Windows/Linux:** Ctrl + Shift + F5

Or just:
```
http://localhost:5173/zodiac-wheel-test
```

---

## ✅ How to Know It Works

### Backend Terminal Shows:
```
GET /api/ephemeris/planets 200
GET /api/ephemeris/aspects 200
```

### Browser Shows:
- Zodiac wheel visible ✅
- No red CORS errors in console (F12) ✅
- "Live" badge at bottom ✅

---

## 🧪 Quick Test

```bash
# Test backend is running
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"healthy", ...}
```

**If you get "Connection refused":**
- Backend is NOT running
- Go back to Step 1!

---

## 🔄 Complete Restart (if still broken)

### Kill everything:
```bash
# Stop backend: Ctrl+C in Terminal 1
# Stop frontend: Ctrl+C in Terminal 2
```

### Start in order:
```bash
# Terminal 1 - Backend FIRST
cd backend
npm run dev

# Wait for "Ready to serve"!

# Terminal 2 - Frontend SECOND
cd frontend
npm run dev

# Browser - LAST
# http://localhost:5173/zodiac-wheel-test
```

---

## 🎯 Working State

### You need 2 terminal windows:

**Terminal 1 (Backend):**
```
🚀 Adaptive Astro-Scheduler API
📡 Server running on http://0.0.0.0:3000
✨ Ready to serve astronomical calendars!
```

**Terminal 2 (Frontend):**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

**Browser:**
```
Zodiac wheel visible, no errors! ✅
```

---

## 💡 Pro Tip

**Keep both terminals visible** so you can see logs:
- Backend logs show API requests
- Frontend logs show build issues

---

## Still Not Working?

See the complete guide: **FIX_CORS_ERROR.md**

Or run this diagnostic:
```bash
curl http://localhost:3000/health
```

---

**TL;DR:** Make sure backend is running, restart it to load new CORS config, refresh browser!

# Fix CORS Error - Step by Step

## ❌ The Error You're Seeing

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading
the remote resource at http://localhost:3000/api/ephemeris/...
(Reason: CORS request did not succeed). Status code: (null).
```

**This means:** Frontend (port 5173) can't connect to Backend (port 3000)

---

## ✅ Solution - 3 Steps

### Step 1: Start the Backend Server

The most common cause is **the backend isn't running**.

```bash
# Open a NEW terminal window
cd backend
npm run dev
```

**You MUST see this:**
```
🚀 Adaptive Astro-Scheduler API
📡 Server running on http://0.0.0.0:3000
🏥 Health check: http://0.0.0.0:3000/health
📅 Calendar API: http://0.0.0.0:3000/api/calendar/day

✨ Ready to serve astronomical calendars!
```

**If you DON'T see this**, the backend failed to start. Check for errors!

---

### Step 2: Verify Backend is Accessible

Test the backend directly:

```bash
# In another terminal
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "Adaptive Astro-Scheduler API",
  "version": "0.1.0",
  "timestamp": "2026-01-03T..."
}
```

**If you get "Connection refused":**
- Backend is NOT running
- Go back to Step 1

**If you get a response:**
- ✅ Backend is working!
- Continue to Step 3

---

### Step 3: Test the Ephemeris Endpoint

```bash
curl "http://localhost:3000/api/ephemeris/planets?date=2026-01-03&time=12:00:00&latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow"
```

**Expected:** JSON response with planet data

**If this works but browser still shows CORS error:**
- Refresh the browser page (Ctrl+R or Cmd+R)
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check the updated CORS config was applied

---

## 🔄 After Fixing CORS Config

I've updated the backend CORS configuration to explicitly allow:
- `http://localhost:5173` (frontend)
- `http://localhost:3000` (backend)
- `http://127.0.0.1:5173` (alternative localhost)

**You need to restart the backend:**

```bash
# In the backend terminal
# Press Ctrl+C to stop
# Then start again:
npm run dev
```

---

## 🧪 Complete Test Procedure

### 1. Stop Everything

```bash
# In backend terminal: Ctrl+C
# In frontend terminal: Ctrl+C
```

### 2. Start Backend First

```bash
cd backend
npm run dev
```

**Wait for:**
```
✨ Ready to serve astronomical calendars!
```

### 3. Test Backend

```bash
# In a third terminal
curl http://localhost:3000/health
```

**Must get JSON response!**

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

**Wait for:**
```
➜  Local:   http://localhost:5173/
```

### 5. Open Browser

```
http://localhost:5173/zodiac-wheel-test
```

**The CORS error should be GONE!**

---

## 🐛 Still Getting CORS Error?

### Check 1: Are Both Servers Running?

```bash
# Check processes
lsof -i :3000  # Should show node process
lsof -i :5173  # Should show node process
```

**Both should return results!**

### Check 2: Check Browser Console

Press **F12** → **Console tab**

Look for:
- ❌ Red errors → Something wrong
- ✅ No errors → Good!

### Check 3: Check Network Tab

Press **F12** → **Network tab**

1. Refresh page
2. Look for requests to `localhost:3000`
3. Click on a failed request
4. Check the "Headers" tab
5. Look for:
   - **Request URL:** Should be `http://localhost:3000/api/ephemeris/...`
   - **Status Code:** Should be 200 (not failed)

### Check 4: Backend Logs

Look at the backend terminal window.

**You should see:**
```
GET /api/ephemeris/planets?date=...
GET /api/ephemeris/aspects?date=...
```

**If you DON'T see these logs:**
- Frontend isn't reaching backend
- Check firewall settings
- Try `http://127.0.0.1:5173` instead of `localhost:5173`

---

## 💡 Alternative: Use Different Port

If localhost:5173 doesn't work, try 127.0.0.1:

```bash
# Add to frontend/.env
VITE_HOST=127.0.0.1
```

Then restart frontend.

---

## 🔥 Nuclear Option: Complete Reset

If nothing works, do a complete reset:

### 1. Kill all processes

```bash
# Kill all node processes
killall node

# Or manually:
lsof -ti:3000 | xargs kill
lsof -ti:5173 | xargs kill
```

### 2. Clean install

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 3. Start fresh

```bash
# Terminal 1
cd backend
npm run dev

# Wait for "Ready to serve"

# Terminal 2
cd frontend
npm run dev

# Open browser
# http://localhost:5173/zodiac-wheel-test
```

---

## ✅ How to Know It's Fixed

When it works, you'll see:

1. **In browser:**
   - Zodiac wheel appears
   - No red errors in console
   - "Live" badge at bottom
   - Planet positions visible

2. **In backend terminal:**
   ```
   GET /api/ephemeris/planets 200
   GET /api/ephemeris/aspects 200
   ```

3. **In test page:**
   - Click "Automated Tests"
   - Click "Run Tests"
   - All 7 tests GREEN ✅

---

## 📞 Quick Diagnosis

Run this command and send me the output:

```bash
# Check if services are running
echo "=== BACKEND ==="
curl -s http://localhost:3000/health || echo "❌ Backend not running"

echo ""
echo "=== FRONTEND ==="
curl -s http://localhost:5173 -I | head -1 || echo "❌ Frontend not running"

echo ""
echo "=== PROCESSES ==="
lsof -i :3000 || echo "❌ Nothing on port 3000"
lsof -i :5173 || echo "❌ Nothing on port 5173"
```

---

## 🎯 Expected Working State

### Backend Terminal:
```
🚀 Adaptive Astro-Scheduler API
📡 Server running on http://0.0.0.0:3000
✨ Ready to serve astronomical calendars!
```

### Frontend Terminal:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Browser Console:
```
(No red CORS errors)
```

### Test Page:
```
✅ All 7 tests pass
```

---

**The key is:** Backend MUST be running first, then frontend, then open browser!

Try the complete test procedure above and let me know which step fails.

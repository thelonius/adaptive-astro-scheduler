# How to Run the Zodiac Wheel Test Page

## 🚀 Quick Start (3 steps)

### Step 1: Start the Backend

```bash
# Open Terminal 1
cd backend
npm run dev
```

**Expected output:**
```
Server running on port 3000
Connected to database
```

**Verify it works:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

---

### Step 2: Start the Frontend

```bash
# Open Terminal 2 (new terminal window/tab)
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### Step 3: Open in Browser

Click on one of these URLs:

**🧪 Test Page (Full Testing Suite):**
```
http://localhost:5173/zodiac-wheel-test
```

**🎨 Demo Page (Interactive Demo):**
```
http://localhost:5173/zodiac-wheel-demo
```

**🏠 Home Page (Navigation):**
```
http://localhost:5173/
```

---

## 🎯 What You'll See

### Test Page (`/zodiac-wheel-test`)
A comprehensive testing interface with 5 tabs:

1. **🎯 Visual Test** - Live component with presets
2. **⚙️ Configuration** - All options with descriptions
3. **🧪 Automated Tests** - One-click testing (7 tests)
4. **📊 Statistics** - Real-time metrics
5. **📖 Test Scenarios** - 10 detailed test procedures

### Demo Page (`/zodiac-wheel-demo`)
An interactive demo with:
- Live zodiac wheel
- Theme switcher
- Configuration controls
- Statistics display

---

## ✅ Quick Test (2 minutes)

Once the test page loads:

1. **Visual Check:**
   - You should see a circular zodiac wheel
   - 12 zodiac signs around the edge
   - Planets positioned on the wheel
   - "Live" badge at the bottom

2. **Run Automated Tests:**
   - Click the "Automated Tests" tab
   - Click "Run Tests" button
   - Wait 1-2 seconds
   - You should see 7 green checkmarks ✅

3. **Try Configuration:**
   - Click "Configuration" tab
   - Toggle "Show Aspects" on/off
   - You should see colored lines appear/disappear
   - Try different themes

---

## 🐛 Troubleshooting

### Problem: "Cannot GET /zodiac-wheel-test"

**Solution:** The frontend isn't running
```bash
cd frontend
npm run dev
```

---

### Problem: Page shows "Loading..." forever

**Cause:** Backend not running or not accessible

**Solution 1 - Start backend:**
```bash
cd backend
npm run dev
```

**Solution 2 - Check backend is running:**
```bash
curl http://localhost:3000/health
```

**Solution 3 - Check environment variable:**
```bash
# In frontend/.env
VITE_API_URL=http://localhost:3000
```

---

### Problem: "Error fetching zodiac data"

**Cause:** Backend API not responding

**Solutions:**

1. **Check backend logs** (Terminal 1)
   - Look for errors
   - Make sure it says "Server running on port 3000"

2. **Test API directly:**
```bash
curl "http://localhost:3000/api/ephemeris/planets?date=2024-01-03"
```

3. **Check browser console** (F12)
   - Look for network errors
   - Check if requests are going to correct URL

---

### Problem: Port 3000 or 5173 already in use

**Solution:**
```bash
# Find and kill the process
# On Mac/Linux:
lsof -ti:3000 | xargs kill
lsof -ti:5173 | xargs kill

# Or change ports in:
# backend: backend/src/index.ts (port variable)
# frontend: vite.config.ts (server.port)
```

---

### Problem: npm run dev fails

**Solution:** Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## 📋 Full Setup (First Time)

If this is your first time running the project:

### 1. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Set up Environment

```bash
# Frontend
cd frontend
cp .env.example .env
# Edit .env if needed (defaults should work)
```

### 3. Start Services

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Open Browser

```
http://localhost:5173/zodiac-wheel-test
```

---

## 🎓 Using the Test Page

### Quick Validation
1. Open test page
2. Click "Automated Tests" tab
3. Click "Run Tests"
4. All should be green ✅

### Manual Testing
1. Click "Test Scenarios" tab
2. Expand "Basic Functionality"
3. Follow the steps
4. Verify expected results

### Configuration Testing
1. Click "Configuration" tab
2. Try different themes
3. Adjust size slider
4. Toggle features on/off

### View Statistics
1. Click "Statistics" tab
2. Check planet count (should be 10)
3. View aspect breakdown
4. Monitor load time (<1000ms)

---

## 🌐 URLs Quick Reference

| Page | URL | Purpose |
|------|-----|---------|
| Home | http://localhost:5173/ | Navigation |
| Test | http://localhost:5173/zodiac-wheel-test | Full testing suite |
| Demo | http://localhost:5173/zodiac-wheel-demo | Interactive demo |
| Backend API | http://localhost:3000/api/ephemeris/planets | API endpoint |
| Backend Health | http://localhost:3000/health | Health check |

---

## 💡 Tips

- **Keep both terminals open** (backend + frontend)
- **Check browser console** (F12) for errors
- **Refresh page** if something looks wrong
- **Try different browsers** if issues persist
- **Read error messages** carefully - they're helpful!

---

## 📞 Still Having Issues?

1. **Check browser console** (F12 > Console tab)
2. **Check backend logs** (Terminal 1)
3. **Verify ports are correct** (3000 backend, 5173 frontend)
4. **Try restarting both servers**
5. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)

---

## ✨ What to Expect

### On Success:
- ✅ Zodiac wheel visible
- ✅ Planets positioned correctly
- ✅ Tooltips work on hover
- ✅ All automated tests pass
- ✅ No console errors
- ✅ Smooth 60fps animations

### Performance:
- Load time: <1 second
- Update latency: <300ms
- Memory usage: ~5-10MB
- CPU: <5% idle, <15% animating

---

**That's it! You should now see the test page running with the zodiac wheel. 🎉**

If you have any issues, check the Troubleshooting section above or review the browser console for specific error messages.

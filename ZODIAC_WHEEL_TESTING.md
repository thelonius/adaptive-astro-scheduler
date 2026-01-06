# Zodiac Wheel Component - Testing Guide

## Test Page Overview

A comprehensive testing interface for the ZodiacWheel component with automated tests, manual test scenarios, and interactive configuration controls.

**Location**: `frontend/src/pages/ZodiacWheelTest.tsx`

## Features of the Test Page

### 🎯 Visual Test Tab
- Live component display with current configuration
- Real-time updates counter
- Quick preset buttons (Minimal, Standard, Full)
- Manual test checklist
- Current configuration display

### ⚙️ Configuration Tab
- **Display Options**: Toggle aspects, houses, degrees, retrogrades, adaptive refresh
- **Appearance**: Theme selector, size slider
- **Advanced Settings**: Aspect orb, refresh interval
- **Location Settings**: Latitude, longitude, timezone

Each option includes descriptive text explaining its purpose.

### 🧪 Automated Tests Tab
- One-click automated testing
- 7 automated test cases:
  1. **Data Loaded** - Verifies data fetch success
  2. **All Planets Present** - Checks all 10 planets loaded
  3. **Aspects Calculated** - Verifies aspect computation
  4. **Longitude Ranges Valid** - Validates planet positions (0-360°)
  5. **Retrograde Detection** - Counts retrograde planets
  6. **Zodiac Signs Assigned** - Checks sign assignment
  7. **Performance (Load Time)** - Measures initial render time
- Visual pass/fail indicators
- Detailed test messages
- Summary statistics

### 📊 Statistics Tab
- Real-time data metrics:
  - Planet count
  - Active aspects
  - Retrograde count
  - Houses calculated
  - Load time
  - Update count
- Planet details list with positions and speeds
- Aspect breakdown by type

### 📖 Test Scenarios Tab
- 10 detailed test scenarios with step-by-step instructions:
  1. **Basic Functionality** - Core rendering test
  2. **Aspect Visualization** - Aspect line testing
  3. **Retrograde Detection** - Retrograde indicators
  4. **Houses System** - Houses overlay test
  5. **Theme Switching** - All 5 themes
  6. **Size Responsiveness** - Different size testing
  7. **Real-time Updates** - Auto-refresh testing
  8. **Interactive Tooltips** - Hover interactions
  9. **Performance Test** - Speed and smoothness
  10. **Location Change** - Houses recalculation

## How to Use the Test Page

### Quick Start

1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:5173/zodiac-wheel-test
   ```

3. **Run automated tests:**
   - Click the "Automated Tests" tab
   - Click "Run Tests" button
   - Review results

### Manual Testing Workflow

#### Step 1: Visual Inspection
1. Go to "Visual Test" tab
2. Verify the wheel renders correctly
3. Check all zodiac signs are visible (12 total)
4. Confirm planets are positioned on the wheel
5. Look for the "Live" badge at the bottom

#### Step 2: Test Features
1. Go to "Configuration" tab
2. Toggle each feature on/off:
   - Show Aspects
   - Show Houses
   - Show Degrees
   - Show Retrogrades
3. Verify changes apply immediately
4. Check visual appearance with each toggle

#### Step 3: Test Themes
1. In Configuration > Appearance
2. Select each theme:
   - Dark (default)
   - Light
   - Cosmic
   - Solar
   - Lunar
3. Verify colors change appropriately
4. Check readability in all themes

#### Step 4: Test Sizes
1. Adjust size slider (300-900px)
2. Test at:
   - 300px (minimum)
   - 600px (standard)
   - 900px (maximum)
3. Verify all elements scale properly
4. Check text remains readable

#### Step 5: Test Interactions
1. Hover over each planet
2. Verify tooltip appears
3. Check tooltip content:
   - Planet name and symbol
   - Position and sign
   - Speed and distance
   - Retrograde status (if applicable)
   - Active aspects (if any)
4. Move mouse away, tooltip should disappear

#### Step 6: Run Automated Tests
1. Go to "Automated Tests" tab
2. Click "Run Tests"
3. Wait for results
4. Check that all tests pass
5. If any fail, investigate the message

#### Step 7: Check Statistics
1. Go to "Statistics" tab
2. Verify reasonable numbers:
   - Planets: 10
   - Aspects: varies (typically 5-20)
   - Load time: <1000ms
3. Review planet details
4. Check aspect breakdown

#### Step 8: Follow Scenarios
1. Go to "Test Scenarios" tab
2. Expand each scenario
3. Follow the steps exactly
4. Verify expected results
5. Note any discrepancies

### Testing Different Configurations

#### Minimal Configuration
```
Size: 400px
Aspects: OFF
Houses: OFF
Degrees: OFF
Retrogrades: OFF
Theme: Dark
```
**Purpose**: Test basic wheel with minimal features
**Expected**: Fast load, simple visualization

#### Standard Configuration
```
Size: 600px
Aspects: ON
Houses: OFF
Degrees: ON
Retrogrades: ON
Theme: Dark
Orb: 8°
```
**Purpose**: Default recommended configuration
**Expected**: Good balance of features and performance

#### Full Configuration
```
Size: 800px
Aspects: ON
Houses: ON
Degrees: ON
Retrogrades: ON
Theme: Cosmic
Orb: 10°
```
**Purpose**: All features enabled
**Expected**: Complete visualization, slightly slower

## Automated Test Details

### Test 1: Data Loaded
**What it checks**: Data fetch succeeded
**Pass criteria**: `currentData !== null`
**Failure means**: API connection issue or timeout

### Test 2: All Planets Present
**What it checks**: All 10 planets in response
**Pass criteria**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto all present
**Failure means**: Incomplete ephemeris data

### Test 3: Aspects Calculated
**What it checks**: At least one aspect found
**Pass criteria**: `aspects.filter(a => a.isExact).length > 0`
**Failure means**: Aspect calculation issue or orb too small

### Test 4: Longitude Ranges Valid
**What it checks**: All planets have valid longitude (0-360°)
**Pass criteria**: `longitude >= 0 && longitude < 360` for all planets
**Failure means**: Data corruption or calculation error

### Test 5: Retrograde Detection
**What it checks**: Retrograde flag is working
**Pass criteria**: Always passes (informational)
**Shows**: Count of retrograde planets

### Test 6: Zodiac Signs Assigned
**What it checks**: Each planet has zodiac sign
**Pass criteria**: All planets have `zodiacSign.name` populated
**Failure means**: Sign calculation error

### Test 7: Performance
**What it checks**: Initial load time
**Pass criteria**: Load time < 1000ms
**Failure means**: Performance issue, need optimization

## Common Test Failures and Solutions

### "Data Loaded" Fails
**Problem**: Can't fetch data from API
**Solutions**:
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify VITE_API_URL in .env
3. Check browser console for errors
4. Try manual refresh button

### "All Planets Present" Fails
**Problem**: Missing planets in response
**Solutions**:
1. Check ephemeris API is accessible
2. Verify date/time parameters
3. Test API endpoint directly
4. Check backend logs

### "Aspects Calculated" Fails
**Problem**: No aspects found
**Solutions**:
1. Increase aspect orb (try 12°)
2. Current sky may have few aspects (normal)
3. Check aspect calculation in backend
4. Verify planet positions are correct

### "Longitude Ranges Valid" Fails
**Problem**: Invalid planet positions
**Solutions**:
1. Check ephemeris data source
2. Verify coordinate transformations
3. Check for NaN or undefined values
4. Review backend calculation code

### "Performance" Fails
**Problem**: Load time > 1000ms
**Solutions**:
1. Check network latency
2. Verify backend cache is working
3. Reduce wheel size
4. Disable some features
5. Check for console errors

### "Zodiac Signs Assigned" Fails
**Problem**: Missing sign assignments
**Solutions**:
1. Check getZodiacSignByLongitude function
2. Verify ZODIAC_SIGNS constant
3. Check sign calculation logic
4. Review backend sign assignment

## Performance Benchmarks

### Expected Performance
| Metric | Target | Good | Needs Work |
|--------|--------|------|------------|
| Initial Load | <500ms | <1000ms | >1000ms |
| Planet Count | 10 | 10 | <10 |
| Aspect Count | 5-20 | 0-50 | >50* |
| Frame Rate | 60fps | >30fps | <30fps |
| Memory | <10MB | <20MB | >20MB |

*Very high aspect count may indicate orb too large

### How to Measure

**Load Time:**
- Check "Statistics" tab
- Look at "Load Time" metric
- Should be <1000ms

**Frame Rate:**
- Open browser DevTools
- Performance tab > Record
- Interact with wheel
- Check FPS in timeline

**Memory:**
- DevTools > Memory tab
- Take heap snapshot
- Look for "Shallow Size"
- Should be <10MB

## Test Coverage

### What's Tested ✅
- ✅ Data loading and API integration
- ✅ Planet rendering and positioning
- ✅ Aspect calculation and visualization
- ✅ Retrograde detection
- ✅ Zodiac sign assignment
- ✅ Houses calculation (when enabled)
- ✅ Theme switching
- ✅ Size responsiveness
- ✅ Interactive tooltips
- ✅ Real-time updates
- ✅ Performance metrics
- ✅ Configuration options

### What's NOT Tested ⚠️
- ⚠️ Cross-browser compatibility (manual only)
- ⚠️ Mobile touch interactions
- ⚠️ Network failure recovery
- ⚠️ Extreme edge cases (invalid coordinates)
- ⚠️ Long-running stability (hours)
- ⚠️ Accessibility (screen readers)

## Browser Testing Checklist

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

For each browser:
- [ ] Visual rendering correct
- [ ] Tooltips work
- [ ] Animations smooth
- [ ] No console errors
- [ ] All tests pass

## Reporting Issues

When reporting an issue, include:

1. **Test that failed**: Which specific test?
2. **Configuration**: Size, theme, enabled features
3. **Browser**: Name and version
4. **Error message**: From test or console
5. **Steps to reproduce**: Exact steps
6. **Screenshots**: Visual proof
7. **Expected vs Actual**: What should happen vs what happened

### Example Issue Report

```
**Test Failed**: Aspect Visualization

**Configuration**:
- Size: 600px
- Theme: Dark
- Aspects: ON
- Orb: 8°

**Browser**: Chrome 120

**Error**: No aspect lines visible despite Statistics showing 12 aspects

**Steps**:
1. Load test page
2. Enable "Show Aspects"
3. Set orb to 8°
4. No lines appear between planets

**Expected**: Colored lines connecting planets in aspect
**Actual**: No lines visible

**Screenshot**: [attach image]
```

## Success Criteria

The component passes testing if:

✅ All automated tests pass
✅ All 10 manual scenarios pass
✅ Load time <1000ms
✅ No console errors
✅ Smooth 60fps animations
✅ Tooltips work correctly
✅ All themes render properly
✅ Works at all sizes (300-900px)
✅ Updates occur automatically
✅ Manual refresh works

## Next Steps After Testing

1. **If all tests pass**: ✅
   - Component is ready for integration
   - Can be used in production
   - Document any quirks found

2. **If some tests fail**: ⚠️
   - Investigate failures
   - Fix issues
   - Re-run tests
   - Document workarounds if needed

3. **Performance issues**: 🐌
   - Check performance.md
   - Apply optimizations
   - Re-test
   - Consider feature reduction

4. **Browser incompatibilities**: 🌐
   - Add polyfills if needed
   - Adjust CSS for specific browsers
   - Document known issues
   - Consider progressive enhancement

---

**Happy Testing! 🧪**

The test page is designed to make testing thorough yet easy. Follow the scenarios, run the automated tests, and verify everything works as expected.

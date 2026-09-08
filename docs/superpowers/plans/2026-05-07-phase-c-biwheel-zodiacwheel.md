# Phase C — Biwheel ZodiacWheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `ZodiacWheel` with an optional `innerData` prop that renders natal planets as an inner outlined ring and draws transit↔natal cross-aspect lines, with a toggle button to switch between cross-aspect and transit-only aspect modes.

**Architecture:** Single new prop `innerData?: ZodiacWheelData | null` activates biwheel mode. Transit planets stay at orbit `r×0.32` (filled). Natal planets rendered at `r×0.22` (outlined). Cross-aspect lines drawn via new `CrossAspectLines` component using actual SVG coordinates (not ring-projected). Aspect mode toggle stored in `useState`. All existing transit-only behavior unchanged when `innerData` is absent.

**Tech Stack:** React 18, TypeScript, SVG, Vitest + RTL, existing `--ag-*` CSS tokens.

**Spec:** `docs/superpowers/specs/2026-05-07-phase-c-biwheel-zodiacwheel.md`

---

## File Map

**Create:**
- `frontend/src/components/ZodiacWheel/CrossAspectLines.tsx` — renders transit↔natal lines using actual planet x,y
- `frontend/src/components/ZodiacWheel/ZodiacWheel.css` — toggle button styles
- `frontend/src/components/ZodiacWheel/utils.test.ts` — unit tests for `computeCrossAspects`

**Modify:**
- `frontend/src/components/ZodiacWheel/utils.ts` — add `computeCrossAspects()`
- `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx` — add `isNatal?: boolean` prop
- `frontend/src/components/ZodiacWheel/index.tsx` — `innerData` prop, `aspectMode` state, natal positions, toggle
- `frontend/src/pages/ZodiacWheelTest.tsx` — add biwheel tab with mock natal data

---

## Task 1: `computeCrossAspects` utility function (TDD)

**Files:**
- Create: `frontend/src/components/ZodiacWheel/utils.test.ts`
- Modify: `frontend/src/components/ZodiacWheel/utils.ts`

- [ ] **Step 1: Create the test file**

```ts
// frontend/src/components/ZodiacWheel/utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeCrossAspects } from './utils';
import { DEFAULT_COLORS } from './types';
import type { PlanetPosition } from './types';

function makePos(name: string, longitude: number): PlanetPosition {
  return {
    planet: { name, longitude, latitude: 0, distance: 0, speed: 0, isRetrograde: false },
    x: 100, y: 100, angle: 0, exactAngle: 0,
  };
}

describe('computeCrossAspects', () => {
  it('returns empty array when either input is empty', () => {
    expect(computeCrossAspects([], [makePos('Moon', 40)], DEFAULT_COLORS)).toEqual([]);
    expect(computeCrossAspects([makePos('Sun', 168)], [], DEFAULT_COLORS)).toEqual([]);
  });

  it('detects trine when longitude diff is ~120°', () => {
    const transit = [makePos('Sun', 168)];    // 168° = Virgo
    const natal   = [makePos('Sun', 48)];     // 48°  = Taurus — diff 120° = trine
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(1);
    expect(lines[0].aspect.type).toBe('trine');
    expect(lines[0].from.planet.name).toBe('Sun');
    expect(lines[0].to.planet.name).toBe('Sun');
  });

  it('does not return conjunction lines', () => {
    const transit = [makePos('Venus', 100)];
    const natal   = [makePos('Mars', 102)]; // 2° diff = conjunction, excluded
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(0);
  });

  it('respects orb — excludes aspects beyond orb', () => {
    const transit = [makePos('Sun', 0)];
    const natal   = [makePos('Moon', 70)]; // 70° — sextile is 60°, diff 10° > orb 8
    const lines = computeCrossAspects(transit, natal, DEFAULT_COLORS, 8);
    expect(lines).toHaveLength(0);
  });

  it('from/to use the PlanetPosition objects passed in', () => {
    const t = makePos('Mars', 90);
    const n = makePos('Saturn', 0); // 90° = square
    t.x = 42; t.y = 77;
    n.x = 13; n.y = 55;
    const lines = computeCrossAspects([t], [n], DEFAULT_COLORS, 8);
    expect(lines[0].from).toBe(t);
    expect(lines[0].to).toBe(n);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && npm run test:run -- --reporter=verbose 2>&1 | grep -A 5 "computeCrossAspects"
```

Expected: `computeCrossAspects is not a function` or similar import error.

- [ ] **Step 3: Implement `computeCrossAspects` in utils.ts**

Add after the existing `calculateAspectLines` function (around line 335):

```ts
// frontend/src/components/ZodiacWheel/utils.ts  (append after calculateAspectLines)

/**
 * Compute transit↔natal cross-aspects from two PlanetPosition arrays.
 * Returns AspectLine[] where from=transitPosition, to=natalPosition.
 * Conjunction is excluded (same as calculateAspectLines).
 */
export function computeCrossAspects(
  transitPositions: PlanetPosition[],
  natalPositions: PlanetPosition[],
  colorScheme: ColorScheme,
  orb: number = 8
): AspectLine[] {
  const standardTypes = ['opposition', 'trine', 'square', 'sextile', 'quincunx'];
  const targetAngles: Record<string, number> = {
    sextile: 60, square: 90, trine: 120, quincunx: 150, opposition: 180,
  };
  const lines: AspectLine[] = [];

  for (const transitPos of transitPositions) {
    for (const natalPos of natalPositions) {
      const angle = calculateAspectAngle(
        transitPos.planet.longitude,
        natalPos.planet.longitude
      );
      const type = detectAspectType(angle, orb);
      if (!type || !standardTypes.includes(type)) continue;

      const orbValue = Math.abs(angle - (targetAngles[type] ?? 0));
      const strength = 1 - Math.min(orbValue / orb, 1);

      lines.push({
        aspect: {
          body1: transitPos.planet,
          body2: natalPos.planet,
          type: type as import('@adaptive-astro/shared/types').AspectType,
          angle,
          orb: orbValue,
          isExact: orbValue < 1,
          interpretation: '',
        },
        from: transitPos,
        to: natalPos,
        color: colorScheme.aspects[type] || '#888',
        strength,
      });
    }
  }

  return lines;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd frontend && npm run test:run -- --reporter=verbose 2>&1 | grep -A 2 "computeCrossAspects"
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ZodiacWheel/utils.ts \
        frontend/src/components/ZodiacWheel/utils.test.ts
git commit -m "feat(v2/biwheel): add computeCrossAspects utility with unit tests"
```

---

## Task 2: `CrossAspectLines` component

**Files:**
- Create: `frontend/src/components/ZodiacWheel/CrossAspectLines.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/ZodiacWheel/CrossAspectLines.tsx
import React from 'react';
import type { AspectLine } from './types';

interface CrossAspectLinesProps {
  lines: AspectLine[];
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#FFD700',
  opposition:  '#FF1493',
  trine:       '#32CD32',
  square:      '#FF4500',
  sextile:     '#00CED1',
  quincunx:    '#9370DB',
};

/**
 * Renders transit↔natal cross-aspect lines using the actual SVG
 * coordinates stored in PlanetPosition.x / .y — not ring-projected.
 * Kept intentionally simpler than AspectLines: no animation, no midpoint
 * symbols, no gradient — cross-aspects are secondary visual information.
 */
export const CrossAspectLines: React.FC<CrossAspectLinesProps> = ({ lines }) => (
  <g id="cross-aspects">
    {lines.map((line, i) => {
      const color = ASPECT_COLORS[line.aspect.type] ?? '#888';
      const strokeWidth = Math.max(0.8, 1.5 * line.strength);
      const opacity = 0.45 + line.strength * 0.25;
      const dasharray = line.aspect.type === 'quincunx' ? '3,3' : undefined;

      return (
        <line
          key={`cx-${i}-${line.aspect.body1.name}-${line.aspect.body2.name}`}
          x1={line.from.x}
          y1={line.from.y}
          x2={line.to.x}
          y2={line.to.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dasharray}
          opacity={opacity}
          style={{ pointerEvents: 'none' }}
        />
      );
    })}
  </g>
);
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep CrossAspect
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ZodiacWheel/CrossAspectLines.tsx
git commit -m "feat(v2/biwheel): add CrossAspectLines component"
```

---

## Task 3: `PlanetMarkers` — isNatal prop

**Files:**
- Modify: `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx`

- [ ] **Step 1: Add `isNatal` to the props interface**

In `PlanetMarkers.tsx`, change the interface (currently ends at line 21):

```ts
interface PlanetMarkersProps {
  positions: PlanetPosition[];
  colorScheme: ColorScheme;
  showRetrogrades: boolean;
  voidMoon?: { isVoid: boolean; voidStart?: string; voidEnd?: string };
  onPlanetHover?: (planet: CelestialBody | null) => void;
  onClusterHover?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  onClusterClick?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  size: number;
  chartRotation?: number;
  isNatal?: boolean; // ← add this
}
```

- [ ] **Step 2: Destructure the new prop (line ~23)**

```ts
export const PlanetMarkers: React.FC<PlanetMarkersProps> = ({
  positions,
  colorScheme,
  showRetrogrades,
  voidMoon,
  onPlanetHover,
  onClusterHover,
  onClusterClick,
  size,
  chartRotation = 0,
  isNatal = false,   // ← add this
}) => {
```

- [ ] **Step 3: Add outlined backing circle before the retrograde text (~line 81)**

Inside the `<g key={...}>` block, add a natal backing circle right before the retrograde indicator:

```tsx
{/* Natal backing circle — outlined, no fill */}
{isNatal && (
  <circle
    cx={pos.x}
    cy={pos.y}
    r={planetRadius * 1.5}
    fill="none"
    stroke={color}
    strokeWidth={1.2}
    opacity={0.55}
  />
)}
```

- [ ] **Step 4: Dim the planet symbol when natal**

On the `<motion.text>` element (around line 123), add an `opacity` prop:

```tsx
<motion.text
  x={pos.x} y={pos.y}
  textAnchor="middle" dominantBaseline="middle"
  fill={color}
  fontSize={size * 0.025}
  fontWeight="bold"
  opacity={isNatal ? 0.65 : 1}   // ← add this
  initial={{ opacity: 0 }}
  animate={{ opacity: isNatal ? 0.65 : 1 }}
  style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
>
  {getPlanetSymbol(planet.name)}
</motion.text>
```

- [ ] **Step 5: Type-check and run existing tests**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep PlanetMarker
npm run test:run 2>&1 | tail -8
```

Expected: no TS errors, existing 19 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ZodiacWheel/PlanetMarkers.tsx
git commit -m "feat(v2/biwheel): PlanetMarkers isNatal prop — outlined dimmed style"
```

---

## Task 4: Toggle button styles

**Files:**
- Create: `frontend/src/components/ZodiacWheel/ZodiacWheel.css`

- [ ] **Step 1: Create the CSS file**

```css
/* frontend/src/components/ZodiacWheel/ZodiacWheel.css */

/* ─── Biwheel aspect mode toggle ──────────────────────────────────────── */

.zodiac-aspect-toggle {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin-top: 8px;
}

.zodiac-aspect-btn {
    background: var(--ag-surface);
    border: 1px solid var(--ag-border);
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 11px;
    font-family: var(--ag-font-mono, 'JetBrains Mono', monospace);
    color: var(--ag-text-muted);
    cursor: pointer;
    transition: background 120ms, color 120ms;
}

.zodiac-aspect-btn:hover {
    background: var(--ag-surface-hover);
    color: var(--ag-text);
}

.zodiac-aspect-btn.is-active {
    background: var(--ag-day-primary);
    border-color: var(--ag-day-primary);
    color: #000;
    font-weight: 600;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ZodiacWheel/ZodiacWheel.css
git commit -m "feat(v2/biwheel): toggle button styles in ZodiacWheel.css"
```

---

## Task 5: Wire biwheel into `ZodiacWheel/index.tsx`

**Files:**
- Modify: `frontend/src/components/ZodiacWheel/index.tsx`

- [ ] **Step 1: Add import for new pieces at the top**

After the existing imports add:

```ts
import { CrossAspectLines } from './CrossAspectLines';
import { computeCrossAspects } from './utils';
import './ZodiacWheel.css';
```

- [ ] **Step 2: Extend the props interface (~line 19)**

```ts
interface ZodiacWheelProps {
  config?: Partial<ZodiacWheelConfig>;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  useAdaptiveRefresh?: boolean;
  onDataUpdate?: (data: any) => void;
  onLoadingChange?: (loading: boolean) => void;
  date?: Date | string;
  data?: ZodiacWheelData | null;
  innerData?: ZodiacWheelData | null; // ← new: natal chart for biwheel
}
```

- [ ] **Step 3: Destructure the new prop (~line 31)**

```ts
export const ZodiacWheel: React.FC<ZodiacWheelProps> = ({
  config: userConfig,
  latitude,
  longitude,
  timezone,
  useAdaptiveRefresh = true,
  onDataUpdate,
  onLoadingChange,
  date,
  data: externalData,
  innerData,           // ← new
}) => {
```

- [ ] **Step 4: Add `aspectMode` state after existing useState declarations (~line 43)**

```ts
const [aspectMode, setAspectMode] = useState<'cross' | 'transit'>('cross');
```

Also add a reset effect so toggling natal off resets the mode:

```ts
// Reset to cross-mode whenever innerData changes
React.useEffect(() => {
  if (!innerData) setAspectMode('cross');
}, [innerData]);
```

- [ ] **Step 5: Add natal position and cross-aspect useMemo (~line 98, after existing aspectLines useMemo)**

Insert after the existing `aspectLines` useMemo:

```ts
const natalPlanetPositions = useMemo(() => {
  if (!innerData?.planets) return [];
  const sorted = sortPlanetsByOrbit(innerData.planets);
  const centerX = config.size / 2;
  const centerY = config.size / 2;
  const radius = config.size * 0.22;
  const asc = data?.houses?.find(h => h.number === 1);
  const rotationDeg = asc ? asc.cusp : 0;
  return calculatePlanetPositions(sorted, centerX, centerY, radius, rotationDeg);
}, [innerData?.planets, config.size, data?.houses]);

const crossAspectLines = useMemo(() => {
  if (!innerData || aspectMode !== 'cross' || natalPlanetPositions.length === 0) return [];
  return computeCrossAspects(
    planetPositions,
    natalPlanetPositions,
    config.colorScheme,
    config.aspectOrb
  );
}, [innerData, aspectMode, planetPositions, natalPlanetPositions, config.colorScheme, config.aspectOrb]);
```

- [ ] **Step 6: Add guideline circles and natal markers inside the SVG**

Inside the `<>` fragment returned by the IIFE (~line 234), after `<HousesOverlay>` and before `<PlanetMarkers>`, add:

```tsx
{/* Biwheel orbit guidelines */}
{innerData && (() => {
  const cx = config.size / 2;
  const cy = config.size / 2;
  return (
    <>
      <circle cx={cx} cy={cy} r={config.size * 0.32} fill="none" stroke="#1a2235" strokeWidth={0.5} strokeDasharray="2,6" opacity={0.15} />
      <circle cx={cx} cy={cy} r={config.size * 0.22} fill="none" stroke="#1a2235" strokeWidth={0.5} strokeDasharray="2,6" opacity={0.15} />
    </>
  );
})()}
```

After the existing `<PlanetMarkers>` block add:

```tsx
{/* Natal planet markers (inner ring, outlined) */}
{natalPlanetPositions.length > 0 && (
  <PlanetMarkers
    positions={natalPlanetPositions}
    colorScheme={config.colorScheme}
    showRetrogrades={false}
    isNatal={true}
    onPlanetHover={setHoveredPlanet}
    onClusterHover={handleClusterHover}
    onClusterClick={handleClusterClick}
    size={config.size}
    chartRotation={(() => {
      const asc = data?.houses?.find(h => h.number === 1);
      return asc ? asc.cusp : 0;
    })()}
  />
)}

{/* Cross-aspect lines: transit↔natal */}
{aspectMode === 'cross' && crossAspectLines.length > 0 && (
  <CrossAspectLines lines={crossAspectLines} />
)}
```

- [ ] **Step 7: Gate existing AspectLines on transit mode**

Find the existing `{config.showAspects && aspectLines.length > 0 && (` block and change to:

```tsx
{config.showAspects && aspectLines.length > 0 && (!innerData || aspectMode === 'transit') && (
  <AspectLines lines={aspectLines} size={config.size} />
)}
```

- [ ] **Step 8: Add the toggle button below the `<motion.svg>`**

After the `</motion.svg>` closing tag (before the tooltip sections):

```tsx
{/* Biwheel aspect mode toggle */}
{innerData && (
  <div className="zodiac-aspect-toggle">
    <button
      type="button"
      className={`zodiac-aspect-btn${aspectMode === 'cross' ? ' is-active' : ''}`}
      onClick={() => setAspectMode('cross')}
      title="Transit ↔ Natal aspects"
    >
      T↔N
    </button>
    <button
      type="button"
      className={`zodiac-aspect-btn${aspectMode === 'transit' ? ' is-active' : ''}`}
      onClick={() => setAspectMode('transit')}
      title="Transit ↔ Transit aspects"
    >
      T↔T
    </button>
  </div>
)}
```

- [ ] **Step 9: Type-check and run tests**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
npm run test:run 2>&1 | tail -8
```

Expected: no TS errors, 24 tests pass (19 existing + 5 new utils tests).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/ZodiacWheel/index.tsx
git commit -m "feat(v2/biwheel): wire innerData prop, natal markers, cross-aspect toggle"
```

---

## Task 6: `ZodiacWheelTest.tsx` — biwheel visual stories

**Files:**
- Modify: `frontend/src/pages/ZodiacWheelTest.tsx`

- [ ] **Step 1: Add mock natal data constant near the top of the file (after imports)**

```ts
// Approximate natal positions for 1984-09-11 01:40 Moscow
// Used only for visual testing — not astrologically exact
const MOCK_NATAL_DATA: ZodiacWheelData = {
  planets: [
    { name: 'Sun',     longitude: 168.5, latitude: 0, distance: 1,    speed: 1,   isRetrograde: false },
    { name: 'Moon',    longitude: 220.0, latitude: 0, distance: 0.003, speed: 13, isRetrograde: false },
    { name: 'Mercury', longitude: 151.0, latitude: 0, distance: 0.9,  speed: 1.5, isRetrograde: false },
    { name: 'Venus',   longitude: 140.0, latitude: 0, distance: 0.7,  speed: 1.2, isRetrograde: false },
    { name: 'Mars',    longitude: 238.0, latitude: 0, distance: 1.5,  speed: 0.5, isRetrograde: false },
    { name: 'Jupiter', longitude: 281.0, latitude: 0, distance: 5.2,  speed: 0.1, isRetrograde: false },
    { name: 'Saturn',  longitude: 228.0, latitude: 0, distance: 9.5,  speed: 0.05, isRetrograde: false },
    { name: 'Uranus',  longitude: 252.0, latitude: 0, distance: 19,   speed: 0.02, isRetrograde: false },
    { name: 'Neptune', longitude: 269.0, latitude: 0, distance: 30,   speed: 0.01, isRetrograde: false },
    { name: 'Pluto',   longitude: 210.0, latitude: 0, distance: 39,   speed: 0.005, isRetrograde: false },
  ],
  aspects: [],
  houses: undefined,
};
```

- [ ] **Step 2: Add a new "Biwheel" tab**

In `ZodiacWheelTest.tsx`, find the `<Tabs>` component that wraps the existing tab panels. Add a new `<Tab>` and `<TabPanel>`:

In `<TabList>`:
```tsx
<Tab>Biwheel</Tab>
```

In `<TabPanels>`, add a new panel at the end:

```tsx
<TabPanel>
  <Grid templateColumns="repeat(3, 1fr)" gap={6}>
    {/* Story 1: Transit only (regression) */}
    <GridItem>
      <Card>
        <CardHeader>
          <Heading size="sm">Transit only</Heading>
          <Text fontSize="xs" color="gray.400">innerData not set — regression check</Text>
        </CardHeader>
        <CardBody>
          <ZodiacWheel
            latitude={55.7558}
            longitude={37.6173}
            timezone="Europe/Moscow"
            config={{ size: 280, showAspects: true, showHouses: false }}
          />
        </CardBody>
      </Card>
    </GridItem>

    {/* Story 2: Biwheel — cross-aspects (transit↔natal) */}
    <GridItem>
      <Card>
        <CardHeader>
          <Heading size="sm">Biwheel — T↔N aspects</Heading>
          <Text fontSize="xs" color="gray.400">innerData = mock natal 1984-09-11</Text>
        </CardHeader>
        <CardBody>
          <ZodiacWheel
            latitude={55.7558}
            longitude={37.6173}
            timezone="Europe/Moscow"
            config={{ size: 280, showAspects: true, showHouses: false }}
            innerData={MOCK_NATAL_DATA}
          />
        </CardBody>
      </Card>
    </GridItem>

    {/* Story 3: Biwheel — transit aspects toggle */}
    <GridItem>
      <Card>
        <CardHeader>
          <Heading size="sm">Biwheel — T↔T aspects</Heading>
          <Text fontSize="xs" color="gray.400">Toggle to T↔T to see transit web</Text>
        </CardHeader>
        <CardBody>
          <ZodiacWheel
            latitude={55.7558}
            longitude={37.6173}
            timezone="Europe/Moscow"
            config={{ size: 280, showAspects: true, showHouses: false }}
            innerData={MOCK_NATAL_DATA}
          />
          <Text fontSize="xs" color="gray.500" mt={2}>
            Use T↔T toggle below the wheel
          </Text>
        </CardBody>
      </Card>
    </GridItem>
  </Grid>
</TabPanel>
```

- [ ] **Step 3: Type-check and build**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -8
```

Expected: no TS errors, build succeeds.

- [ ] **Step 4: Run full test suite**

```bash
cd frontend && npm run test:run 2>&1 | tail -10
```

Expected: 24 tests pass (19 component tests + 5 utils tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ZodiacWheelTest.tsx
git commit -m "feat(v2/biwheel): add biwheel visual stories to ZodiacWheelTest"
```

---

## Task 7: Push branch and open PR

- [ ] **Step 1: Verify all tests and lint pass**

```bash
cd frontend && npm run lint 2>&1 && npm run test:run 2>&1 | tail -5 && npm run build 2>&1 | tail -5
```

Expected: lint clean, 24 tests pass, build succeeds.

- [ ] **Step 2: Push and open PR**

```bash
git push origin <current-branch>
gh pr create \
  --title "feat(v2/frontend): Phase C — biwheel ZodiacWheel" \
  --base main \
  --body "$(cat <<'EOF'
## Summary

- New `innerData?: ZodiacWheelData` prop activates biwheel mode
- Transit planets (outer, r×0.32, filled) + natal planets (inner, r×0.22, outlined)
- Toggle button below wheel: T↔N (transit↔natal cross-aspects) / T↔T (transit↔transit)
- `CrossAspectLines` component draws lines between actual planet positions, not ring-projected
- `computeCrossAspects()` utility computes aspects from two position arrays
- Hover tooltip works for natal planets (same as transit)
- 3 visual stories in ZodiacWheelTest biwheel tab
- 5 unit tests for `computeCrossAspects`

## Out of scope
Phase D: `userChartStore`, `NatalChartCTA`, API wiring of `natal_chart_id`

## Test plan
- [ ] `npm run test:run` — 24 tests pass
- [ ] `npm run lint` — clean
- [ ] `npm run build` — clean
- [ ] Open `/zodiac-wheel-test` → Biwheel tab → verify 3 stories render

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

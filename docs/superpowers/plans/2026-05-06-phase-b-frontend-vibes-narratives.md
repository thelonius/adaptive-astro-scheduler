# Phase B — Vibes & Narratives Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `/optimal-timing-v2` into a split-pane page that surfaces the vibes & per-day narratives the backend started returning in Phase A. Compact ranked-day list on the left, expanded day-detail panel on the right with the existing transit-only ZodiacWheel + vibe tabs + narrative text.

**Architecture:** Decompose the current vertical-list page into a list+detail layout. Add four new small components (`WindowListItem`, `VibeTabSwitcher`, `NarrativeBlock`, `DayDetailPanel`) and one widening to the recipe panel (vibes summary chip row). Existing `ZodiacWheel` is consumed transit-only — biwheel and natal-chart store come in Phase C and Phase D.

**Tech Stack:** React 18, TypeScript, Vite, Chakra UI 2.x, react-i18next 17, react-router-dom 6. New for tests: Vitest 1.x (already a devDep), `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. Spec: [docs/superpowers/specs/2026-05-05-vibe-rendering-and-biwheel-design.md](../specs/2026-05-05-vibe-rendering-and-biwheel-design.md). Backend contract: [Phase A plan](2026-05-05-phase-a-vibes-narratives-backend.md).

---

## Out of scope (deferred to later phases)

- ZodiacWheel biwheel extension (Phase C)
- `userChartStore` and natal_chart_id source-of-truth (Phase D)
- `NatalChartCTA` empty-state banner (Phase D)
- Server-side eval-harness extensions (parallel work-stream)

Phase B keeps the existing transit-only `ZodiacWheel` in the detail panel and ignores `natal_chart_id` / `natal_chart` API fields. The frontend will not pass `natal_chart_id` to the backend in this phase; the response's `natal_chart` field is silently ignored.

---

## File Structure

**Create:**
- `frontend/vitest.config.ts` — Vitest test runner config (jsdom env, setup file)
- `frontend/src/test-setup.ts` — global test setup (extends `expect` with jest-dom matchers)
- `frontend/src/components/OptimalTimingV2/WindowListItem.tsx` — one-row clickable date entry
- `frontend/src/components/OptimalTimingV2/WindowListItem.test.tsx`
- `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx` — pills/tabs row for vibe selection
- `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.test.tsx`
- `frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx` — renders selected-vibe narrative
- `frontend/src/components/OptimalTimingV2/NarrativeBlock.test.tsx`
- `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx` — composes wheel + vibe tabs + narrative
- `frontend/src/components/OptimalTimingV2/DayDetailPanel.test.tsx`

**Modify:**
- `frontend/package.json` — add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` devDeps; add `test:run` script for CI-friendly single-pass test
- `frontend/src/services/optimalTimingV2Service.ts` — add `Vibe`, `VibeNarrativeMap` types; extend `GeneratedRecipe` with `vibes`, extend `TimingWindowV2` with `vibe_narratives`, extend `FindWithIntentResponse` with `narratives_llm` and `natal_chart` (the latter typed loosely since Phase B ignores it)
- `frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.tsx` — render a horizontal vibes-chip row inside the expanded body (read-only summary; no interaction yet)
- `frontend/src/pages/OptimalTimingV2.tsx` — split-pane layout, `selectedDate`/`selectedVibeId` state, hand windows to `DayDetailPanel`
- `frontend/src/pages/OptimalTimingV2.css` — split-pane CSS grid; mobile (`<720px`) stack with inline-expanding selected item
- `frontend/src/i18n/locales/ru.json` and `en.json` — new keys for vibes, narratives, "select a day", loading skeletons

**Delete:**
- `frontend/src/components/OptimalTimingV2/WindowCard.tsx` — replaced by `WindowListItem` + `DayDetailPanel`. Remove only after the page no longer imports it.

---

## Task 1: Add `Vibe`, `VibeNarrativeMap`, response-shape extensions to the service

**Files:**
- Modify: `frontend/src/services/optimalTimingV2Service.ts:38-82`

- [ ] **Step 1: Edit the service types**

Open `frontend/src/services/optimalTimingV2Service.ts`. Add these new exports above `TimingWindowV2`:

```ts
export interface Vibe {
    id: string;             // snake_case, matches backend VibeSchema regex
    label: string;          // user-facing string, ≤60 chars
    emoji?: string;
}

export type VibeNarrativeMap = Record<string, string>; // vibeId -> narrative text

/**
 * Loose typing — Phase B ignores natal_chart entirely. Phase D will tighten
 * this to the redacted projection {id, planets, houses?, aspects?}.
 */
export type NatalChartProjection = Record<string, unknown> | null;
```

Modify `TimingWindowV2` (currently lines 38-46) to add `vibe_narratives`:

```ts
export interface TimingWindowV2 {
    date: string; // YYYY-MM-DD
    score: number; // 0..100
    rank: number;
    matched_predicates: MatchedPredicate[];
    moon: MoonState;
    sun_sign: string;
    retrograde_planets: string[];
    vibe_narratives?: VibeNarrativeMap; // new in Phase A; absent on legacy responses
}
```

Modify `GeneratedRecipe` (currently lines 59-65) to require `vibes`:

```ts
export interface GeneratedRecipe {
    intent: string;
    rationale: string;
    disqualifiers: RecipeDisqualifier[];
    weighted_conditions: RecipeWeightedCondition[];
    vibes: Vibe[];                      // new — backend always returns 2-5
    metadata?: Record<string, unknown>;
}
```

Modify `FindWithIntentResponse` (currently lines 67-82) to add the new top-level fields:

```ts
export interface FindWithIntentResponse {
    request_id: string;
    intent: string;
    date_range: { start: string; end: string };
    generated_recipe: GeneratedRecipe;
    llm: {
        model: string;
        prompt_version: string;
        cached: boolean;
        attempts: number;
    };
    narratives_llm: {
        model: string;
        prompt_version: string;
        cached: boolean;
        attempts: number;
        latency_ms: number;
    } | null;
    summary: string;
    windows: TimingWindowV2[];
    natal_chart: NatalChartProjection;
    disqualified_days: number;
    cost: { total_usd: number; latency_ms: number };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean. The current page (`OptimalTimingV2.tsx`) and `WindowCard.tsx` use only the existing fields, so widening the response shape is non-breaking.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/optimalTimingV2Service.ts
git commit -m "feat(v2/frontend-types): add Vibe/VibeNarrativeMap, extend response shape"
```

---

## Task 2: Set up Vitest + React Testing Library

**Files:**
- Modify: `frontend/package.json` (devDependencies + script)
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test-setup.ts`

- [ ] **Step 1: Install testing libraries**

```bash
cd frontend && npm install --save-dev @testing-library/react@^14.1.2 @testing-library/jest-dom@^6.1.6 @testing-library/user-event@^14.5.2 jsdom@^23.0.1
```

(Pinned versions — adjust to latest compatible if `npm install` fails on resolution; the goal is a working stack on Vitest 1.x + React 18.)

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, '../shared'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        globals: true,
        css: false,
    },
});
```

- [ ] **Step 3: Create `frontend/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';

// Polyfill matchMedia for components that use it (e.g. Chakra responsive props)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});
```

- [ ] **Step 4: Add `test:run` script**

In `frontend/package.json`, modify the `scripts` block:

```json
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest",
    "test:run": "vitest run"
}
```

- [ ] **Step 5: Smoke test the setup**

Create `frontend/src/test-setup.smoke.test.tsx` (will be removed in step 7):

```tsx
import { render, screen } from '@testing-library/react';

test('vitest + testing-library wired up', () => {
    render(<div data-testid="ok">hello</div>);
    expect(screen.getByTestId('ok')).toHaveTextContent('hello');
});
```

```bash
cd frontend && npm run test:run -- test-setup.smoke
```

Expected: 1 test passes.

- [ ] **Step 6: Remove smoke test**

```bash
rm frontend/src/test-setup.smoke.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test-setup.ts
# (the path may be ../package-lock.json if there's a workspace lockfile)
git commit -m "test(v2/frontend): set up Vitest + React Testing Library + jsdom"
```

If the lockfile lives at the repo root (it does, per Phase A discovery), use `package-lock.json` at the repo root instead.

---

## Task 3: `WindowListItem` component (compact list row)

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/WindowListItem.tsx`
- Create: `frontend/src/components/OptimalTimingV2/WindowListItem.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/components/OptimalTimingV2/WindowListItem.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowListItem } from './WindowListItem';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';

const mockWindow: TimingWindowV2 = {
    date: '2026-05-19',
    score: 73,
    rank: 1,
    matched_predicates: [],
    moon: { sign: 'Cancer', phase: 'waxing_crescent', illumination: 0.18 },
    sun_sign: 'Taurus',
    retrograde_planets: [],
};

describe('WindowListItem', () => {
    it('renders rank, formatted date, score, and moon summary', () => {
        render(<WindowListItem window={mockWindow} language="ru" selected={false} onSelect={() => {}} />);
        expect(screen.getByText('#1')).toBeInTheDocument();
        // Date should appear in some Russian-localized form (we don't pin the exact string;
        // the test just confirms the year-or-month is rendered)
        expect(screen.getByText(/мая|май/i)).toBeInTheDocument();
        expect(screen.getByText('73')).toBeInTheDocument();
        // Cancer should appear localized
        expect(screen.getByText(/Раке|Cancer/)).toBeInTheDocument();
    });

    it('applies the selected class when selected=true', () => {
        const { container } = render(
            <WindowListItem window={mockWindow} language="ru" selected={true} onSelect={() => {}} />,
        );
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toMatch(/is-selected/);
    });

    it('calls onSelect with the window date when clicked', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<WindowListItem window={mockWindow} language="ru" selected={false} onSelect={onSelect} />);
        await user.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledWith('2026-05-19');
    });

    it('renders VoC and retrograde tags when present', () => {
        render(
            <WindowListItem
                window={{
                    ...mockWindow,
                    moon: { ...mockWindow.moon, void_of_course: true },
                    retrograde_planets: ['Mercury'],
                }}
                language="ru"
                selected={false}
                onSelect={() => {}}
            />,
        );
        expect(screen.getByText(/VoC/i)).toBeInTheDocument();
        expect(screen.getByText(/Mercury/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd frontend && npm run test:run -- WindowListItem
```

Expected: cannot find module.

- [ ] **Step 3: Implement**

Create `frontend/src/components/OptimalTimingV2/WindowListItem.tsx`:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';

interface Props {
    window: TimingWindowV2;
    language: string;
    selected: boolean;
    onSelect: (date: string) => void;
}

const SIGN_LABEL_RU: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

const PHASE_LABEL_RU: Record<string, string> = {
    new: 'новолуние',
    waxing_crescent: 'растущий серп',
    first_quarter: 'первая четверть',
    waxing_gibbous: 'растущая',
    full: 'полнолуние',
    waning_gibbous: 'убывающая',
    last_quarter: 'последняя четверть',
    waning_crescent: 'убывающий серп',
};

function formatDate(iso: string, lang: string): string {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function moonShort(sign: string, phase: string, lang: string): string {
    if (lang === 'ru') {
        return `${PHASE_LABEL_RU[phase] ?? phase}, ${SIGN_LABEL_RU[sign] ?? sign}`;
    }
    return `${phase.replace(/_/g, ' ')}, ${sign}`;
}

function scoreClass(score: number): string {
    if (score >= 80) return 'otv2-li-score--great';
    if (score >= 60) return 'otv2-li-score--good';
    if (score >= 40) return 'otv2-li-score--mid';
    return 'otv2-li-score--low';
}

export const WindowListItem: React.FC<Props> = ({ window: w, language, selected, onSelect }) => {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className={`otv2-li${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(w.date)}
            aria-pressed={selected}
        >
            <span className="otv2-li-rank">#{w.rank}</span>
            <span className="otv2-li-date">{formatDate(w.date, language)}</span>
            <span className={`otv2-li-score ${scoreClass(w.score)}`}>{w.score}</span>
            <span className="otv2-li-moon">{moonShort(w.moon.sign, w.moon.phase, language)}</span>
            {w.moon.void_of_course && (
                <span className="otv2-li-tag otv2-li-tag--warn">{t('optimalTimingV2.voc', 'VoC')}</span>
            )}
            {w.retrograde_planets.length > 0 && (
                <span className="otv2-li-tag otv2-li-tag--warn">℞ {w.retrograde_planets.join(',')}</span>
            )}
        </button>
    );
};
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd frontend && npm run test:run -- WindowListItem
```

Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/WindowListItem.tsx frontend/src/components/OptimalTimingV2/WindowListItem.test.tsx
git commit -m "feat(v2/frontend): add WindowListItem (compact list row)"
```

---

## Task 4: `VibeTabSwitcher` component

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx`
- Create: `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import type { Vibe } from '../../services/optimalTimingV2Service';

const vibes: Vibe[] = [
    { id: 'practical_cleanup', label: 'practical cleanup', emoji: '🧹' },
    { id: 'nostalgic_return', label: 'nostalgic return', emoji: '🪵' },
    { id: 'first_greens', label: 'first greens' },
];

describe('VibeTabSwitcher', () => {
    it('renders one button per vibe with emoji and label', () => {
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="practical_cleanup" onChange={() => {}} />);
        expect(screen.getByRole('tab', { name: /practical cleanup/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /nostalgic return/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /first greens/i })).toBeInTheDocument();
        expect(screen.getByText('🧹')).toBeInTheDocument();
    });

    it('marks the selected vibe as active', () => {
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="nostalgic_return" onChange={() => {}} />);
        const active = screen.getByRole('tab', { name: /nostalgic return/i });
        expect(active.getAttribute('aria-selected')).toBe('true');
        const inactive = screen.getByRole('tab', { name: /practical cleanup/i });
        expect(inactive.getAttribute('aria-selected')).toBe('false');
    });

    it('calls onChange with the clicked vibe id', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="practical_cleanup" onChange={onChange} />);
        await user.click(screen.getByRole('tab', { name: /first greens/i }));
        expect(onChange).toHaveBeenCalledWith('first_greens');
    });

    it('renders nothing when vibes array is empty', () => {
        const { container } = render(
            <VibeTabSwitcher vibes={[]} selectedVibeId={null} onChange={() => {}} />,
        );
        expect(container.firstChild).toBeNull();
    });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd frontend && npm run test:run -- VibeTabSwitcher
```

- [ ] **Step 3: Implement**

Create `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx`:

```tsx
import React from 'react';
import type { Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    vibes: Vibe[];
    selectedVibeId: string | null;
    onChange: (vibeId: string) => void;
}

export const VibeTabSwitcher: React.FC<Props> = ({ vibes, selectedVibeId, onChange }) => {
    if (vibes.length === 0) return null;

    return (
        <div className="otv2-vibe-tabs" role="tablist" aria-label="vibes">
            {vibes.map((v) => {
                const active = v.id === selectedVibeId;
                return (
                    <button
                        key={v.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`otv2-vibe-tab${active ? ' is-active' : ''}`}
                        onClick={() => onChange(v.id)}
                    >
                        {v.emoji && <span className="otv2-vibe-tab-emoji">{v.emoji}</span>}
                        <span className="otv2-vibe-tab-label">{v.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd frontend && npm run test:run -- VibeTabSwitcher
```

Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx frontend/src/components/OptimalTimingV2/VibeTabSwitcher.test.tsx
git commit -m "feat(v2/frontend): add VibeTabSwitcher (vibe pill row)"
```

---

## Task 5: `NarrativeBlock` component

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx`
- Create: `frontend/src/components/OptimalTimingV2/NarrativeBlock.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/components/OptimalTimingV2/NarrativeBlock.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { NarrativeBlock } from './NarrativeBlock';

describe('NarrativeBlock', () => {
    it('renders narrative text when present', () => {
        render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'Луна в Раке настраивает на бытовое внимание.' }}
                selectedVibeId="practical_cleanup"
            />,
        );
        expect(screen.getByText(/Луна в Раке/)).toBeInTheDocument();
    });

    it('renders skeleton placeholder when narratives is undefined (still loading)', () => {
        const { container } = render(<NarrativeBlock narratives={undefined} selectedVibeId="practical_cleanup" />);
        expect(container.querySelector('.otv2-narrative-skeleton')).toBeInTheDocument();
    });

    it('renders fallback text when the selected vibe has no narrative', () => {
        render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'something' }}
                selectedVibeId="missing_vibe"
            />,
        );
        // Fallback should be visible — the test checks for any text that hints "not available"
        expect(screen.getByText(/недоступно|not available/i)).toBeInTheDocument();
    });

    it('renders nothing meaningful when no vibe is selected', () => {
        const { container } = render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'something' }}
                selectedVibeId={null}
            />,
        );
        // Should not crash, should not render the narrative paragraph
        expect(container.querySelector('.otv2-narrative-text')).toBeNull();
    });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd frontend && npm run test:run -- NarrativeBlock
```

- [ ] **Step 3: Implement**

Create `frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx`:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VibeNarrativeMap } from '../../services/optimalTimingV2Service';

interface Props {
    /** Map vibeId -> narrative text. `undefined` = still loading; `{}` = backend returned empty. */
    narratives: VibeNarrativeMap | undefined;
    selectedVibeId: string | null;
}

export const NarrativeBlock: React.FC<Props> = ({ narratives, selectedVibeId }) => {
    const { t } = useTranslation();

    if (narratives === undefined) {
        return (
            <div className="otv2-narrative-skeleton" aria-busy="true">
                <div className="otv2-narrative-skeleton-line" />
                <div className="otv2-narrative-skeleton-line otv2-narrative-skeleton-line--short" />
            </div>
        );
    }

    if (!selectedVibeId) return null;

    const text = narratives[selectedVibeId];
    if (!text) {
        return (
            <p className="otv2-narrative-fallback">
                {t('optimalTimingV2.narrativeUnavailable', 'Текст для этого вайба недоступно. Попробуй обновить страницу.')}
            </p>
        );
    }

    return <p className="otv2-narrative-text">{text}</p>;
};
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd frontend && npm run test:run -- NarrativeBlock
```

Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx frontend/src/components/OptimalTimingV2/NarrativeBlock.test.tsx
git commit -m "feat(v2/frontend): add NarrativeBlock (vibe text + skeleton + fallback)"
```

---

## Task 6: `DayDetailPanel` (composes wheel + tabs + narrative)

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx`
- Create: `frontend/src/components/OptimalTimingV2/DayDetailPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/components/OptimalTimingV2/DayDetailPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayDetailPanel } from './DayDetailPanel';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';

// Stub ZodiacWheel — its internal data fetch isn't relevant to this component test
vi.mock('../ZodiacWheel', () => ({
    ZodiacWheel: ({ date }: { date?: string }) => (
        <div data-testid="zodiac-wheel" data-date={date} />
    ),
}));

const window: TimingWindowV2 = {
    date: '2026-05-19',
    score: 73,
    rank: 1,
    matched_predicates: [],
    moon: { sign: 'Cancer', phase: 'waxing_crescent', illumination: 0.18 },
    sun_sign: 'Taurus',
    retrograde_planets: [],
    vibe_narratives: {
        practical_cleanup: 'Practical text.',
        nostalgic_return: 'Nostalgic text.',
    },
};

const vibes: Vibe[] = [
    { id: 'practical_cleanup', label: 'practical cleanup', emoji: '🧹' },
    { id: 'nostalgic_return', label: 'nostalgic return', emoji: '🪵' },
];

const location = { latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' };

describe('DayDetailPanel', () => {
    it('renders zodiac wheel for the day', () => {
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}
                location={location}
                language="ru"
            />,
        );
        const wheel = screen.getByTestId('zodiac-wheel');
        expect(wheel).toHaveAttribute('data-date', '2026-05-19');
    });

    it('renders the vibe tabs and the narrative for the selected vibe', () => {
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="nostalgic_return"
                onVibeChange={() => {}}
                location={location}
                language="ru"
            />,
        );
        expect(screen.getByRole('tab', { name: /nostalgic return/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Nostalgic text.')).toBeInTheDocument();
    });

    it('forwards vibe-tab clicks to onVibeChange', async () => {
        const user = userEvent.setup();
        const onVibeChange = vi.fn();
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={onVibeChange}
                location={location}
                language="ru"
            />,
        );
        await user.click(screen.getByRole('tab', { name: /nostalgic return/i }));
        expect(onVibeChange).toHaveBeenCalledWith('nostalgic_return');
    });

    it('renders skeleton when window has no vibe_narratives field', () => {
        const { container } = render(
            <DayDetailPanel
                window={{ ...window, vibe_narratives: undefined }}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}
                location={location}
                language="ru"
            />,
        );
        expect(container.querySelector('.otv2-narrative-skeleton')).toBeInTheDocument();
    });

    it('renders the matched-predicates list inside the panel', () => {
        const w: TimingWindowV2 = {
            ...window,
            matched_predicates: [
                { type: 'moon_in_sign', weight: 6, details: { sign: 'Cancer' } },
                { type: 'moon_waxing', weight: 7 },
            ],
        };
        render(
            <DayDetailPanel
                window={w}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}
                location={location}
                language="ru"
            />,
        );
        expect(screen.getByText(/moon_in_sign/)).toBeInTheDocument();
        expect(screen.getByText(/moon_waxing/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd frontend && npm run test:run -- DayDetailPanel
```

- [ ] **Step 3: Implement**

Create `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx`:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../ZodiacWheel';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibeId: string | null;
    onVibeChange: (vibeId: string) => void;
    location: { latitude: number; longitude: number; timezone: string };
    language: string;
}

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibeId,
    onVibeChange,
    location,
    language,
}) => {
    const { t } = useTranslation();

    return (
        <section className="otv2-detail">
            <header className="otv2-detail-header">
                <h2 className="otv2-detail-date">{w.date}</h2>
                <div className="otv2-detail-score">{w.score}/100</div>
            </header>

            <div className="otv2-detail-wheel">
                <ZodiacWheel
                    date={w.date}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    timezone={location.timezone}
                    config={{ size: 320, showHouses: true, showAspects: true }}
                />
            </div>

            <VibeTabSwitcher vibes={vibes} selectedVibeId={selectedVibeId} onChange={onVibeChange} />

            <NarrativeBlock narratives={w.vibe_narratives} selectedVibeId={selectedVibeId} />

            {w.matched_predicates.length > 0 && (
                <details className="otv2-detail-predicates">
                    <summary>{t('optimalTimingV2.matchedPredicates', 'сматчившиеся предикаты')}</summary>
                    <ul>
                        {w.matched_predicates.map((p, i) => (
                            <li key={i}>
                                <span className={`otv2-weight-badge ${p.weight >= 0 ? 'is-pos' : 'is-neg'}`}>
                                    {p.weight >= 0 ? '+' : ''}{p.weight}
                                </span>
                                <span className="otv2-predicate-label">{p.type}</span>
                                {p.details && (
                                    <code className="otv2-predicate-details">{JSON.stringify(p.details)}</code>
                                )}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
};
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd frontend && npm run test:run -- DayDetailPanel
```

Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx frontend/src/components/OptimalTimingV2/DayDetailPanel.test.tsx
git commit -m "feat(v2/frontend): add DayDetailPanel composing wheel + vibes + narrative"
```

---

## Task 7: `GeneratedRecipePanel` — add vibes summary chip row

**Files:**
- Modify: `frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.tsx`
- Create: `frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.test.tsx`

- [ ] **Step 1: Write tests for the existing + new behavior**

Create `frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratedRecipePanel } from './GeneratedRecipePanel';
import type { GeneratedRecipe } from '../../services/optimalTimingV2Service';

const recipe: GeneratedRecipe = {
    intent: 'launch a coffee shop',
    rationale: 'For a new business launch...',
    disqualifiers: [{ type: 'moon_void_of_course' }],
    weighted_conditions: [{ predicate: { type: 'moon_waxing' }, weight: 8 }],
    vibes: [
        { id: 'aggressive_growth', label: 'aggressive growth', emoji: '🚀' },
        { id: 'sustainable_build', label: 'sustainable build', emoji: '🌱' },
    ],
    metadata: {},
};

const llm = { model: 'mock', prompt_version: 'recipe.v2', cached: false, attempts: 1 };

describe('GeneratedRecipePanel vibes', () => {
    it('renders vibes chips when expanded', async () => {
        const user = userEvent.setup();
        render(<GeneratedRecipePanel recipe={recipe} llm={llm} />);
        await user.click(screen.getByRole('button')); // expand
        expect(screen.getByText(/aggressive growth/i)).toBeInTheDocument();
        expect(screen.getByText(/sustainable build/i)).toBeInTheDocument();
        expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('does not crash when vibes is empty', async () => {
        const user = userEvent.setup();
        render(<GeneratedRecipePanel recipe={{ ...recipe, vibes: [] }} llm={llm} />);
        await user.click(screen.getByRole('button'));
        expect(screen.getByText(/launch a coffee shop/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
cd frontend && npm run test:run -- GeneratedRecipePanel
```

(The current panel has no vibes section, so the chip-rendering tests fail.)

- [ ] **Step 3: Add the vibes section**

Open `frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.tsx`. Inside the `{open && (` block, between the `disqualifiers` section and the `weighted_conditions` section (or wherever fits best stylistically — anywhere inside the body), insert:

```tsx
{recipe.vibes && recipe.vibes.length > 0 && (
    <div className="otv2-recipe-section">
        <div className="otv2-recipe-section-title">
            {t('optimalTimingV2.vibes', 'вайбы')}
        </div>
        <div className="otv2-recipe-vibes">
            {recipe.vibes.map((v) => (
                <span key={v.id} className="otv2-recipe-vibe-chip">
                    {v.emoji && <span className="otv2-recipe-vibe-chip-emoji">{v.emoji}</span>}
                    <span className="otv2-recipe-vibe-chip-label">{v.label}</span>
                </span>
            ))}
        </div>
    </div>
)}
```

- [ ] **Step 4: Run tests, expect PASS**

```bash
cd frontend && npm run test:run -- GeneratedRecipePanel
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.tsx frontend/src/components/OptimalTimingV2/GeneratedRecipePanel.test.tsx
git commit -m "feat(v2/frontend): GeneratedRecipePanel renders vibes chip row"
```

---

## Task 8: `OptimalTimingV2.tsx` — split-pane layout + state

**Files:**
- Modify: `frontend/src/pages/OptimalTimingV2.tsx`

- [ ] **Step 1: Replace the page body with split-pane layout**

Replace the entire `result && !isLoading && (...)` block in `OptimalTimingV2.tsx` with:

```tsx
{result && !isLoading && (
    <>
        <GeneratedRecipePanel
            recipe={result.generated_recipe}
            llm={result.llm}
        />

        <div className="otv2-summary">
            <div className="otv2-summary-text">{result.summary}</div>
            <div className="otv2-summary-meta">
                {result.disqualified_days > 0 && (
                    <span>
                        {t('optimalTimingV2.disqualifiedDays', 'дисквалифицировано')}:{' '}
                        <strong>{result.disqualified_days}</strong>
                    </span>
                )}
                <span>
                    {t('optimalTimingV2.latency', 'время')}:{' '}
                    <strong>{(result.cost.latency_ms / 1000).toFixed(1)}s</strong>
                </span>
                <span>
                    {t('optimalTimingV2.requestId', 'request')}:{' '}
                    <code className="otv2-request-id">{result.request_id.slice(0, 8)}</code>
                </span>
            </div>
        </div>

        {result.windows.length === 0 ? (
            <div className="otv2-empty">
                {t(
                    'optimalTimingV2.noWindows',
                    'В этом диапазоне нет подходящих дней. Попробуй расширить даты или переформулировать намерение.',
                )}
            </div>
        ) : (
            <div className="otv2-split">
                <aside className="otv2-split-list">
                    {result.windows.map((w) => (
                        <WindowListItem
                            key={w.date}
                            window={w}
                            language={language}
                            selected={selectedDate === w.date}
                            onSelect={setSelectedDate}
                        />
                    ))}
                </aside>
                <div className="otv2-split-detail">
                    {selectedWindow ? (
                        <DayDetailPanel
                            window={selectedWindow}
                            vibes={result.generated_recipe.vibes}
                            selectedVibeId={selectedVibeId}
                            onVibeChange={setSelectedVibeId}
                            location={{
                                latitude: location.latitude,
                                longitude: location.longitude,
                                timezone: location.timezone,
                            }}
                            language={language}
                        />
                    ) : (
                        <div className="otv2-split-empty">
                            {t('optimalTimingV2.selectADay', 'Выбери день из списка слева')}
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
)}
```

Replace the imports near the top:

```tsx
import { IntentInput, IntentInputValue } from '../components/OptimalTimingV2/IntentInput';
import { GeneratedRecipePanel } from '../components/OptimalTimingV2/GeneratedRecipePanel';
import { WindowListItem } from '../components/OptimalTimingV2/WindowListItem';
import { DayDetailPanel } from '../components/OptimalTimingV2/DayDetailPanel';
```

(remove the `WindowCard` import.)

Add state hooks at the top of the component, after the existing `useState` declarations:

```tsx
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);

const selectedWindow = React.useMemo(
    () => result?.windows.find((w) => w.date === selectedDate) ?? null,
    [result, selectedDate],
);
```

In the `try {` block (right after `setResult(res);`), add the auto-selection logic:

```tsx
setResult(res);
// Auto-select the first window and the first vibe when a fresh result arrives
setSelectedDate(res.windows[0]?.date ?? null);
setSelectedVibeId(res.generated_recipe.vibes[0]?.id ?? null);
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean. (Component imports resolve; new state types correct.)

- [ ] **Step 3: Smoke-run the suite**

```bash
cd frontend && npm run test:run
```

Expected: all unit tests still pass (Tasks 3-7). The page itself isn't unit-tested (handled by integration / manual).

- [ ] **Step 4: Manual smoke-test**

Start frontend dev (with backend running on `:3001`):

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/optimal-timing-v2`, submit any intent, verify:
- A list of windows appears on the left
- Clicking a window populates the right panel with wheel + vibes + narrative
- Switching vibe pills changes the narrative text but not the wheel

Document any issues; do not commit until manual smoke passes (or update the plan if the page integration needs adjustment).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/OptimalTimingV2.tsx
git commit -m "feat(v2/frontend): split-pane layout with day list + detail panel"
```

---

## Task 9: CSS — split-pane on desktop, stack on mobile

**Files:**
- Modify: `frontend/src/pages/OptimalTimingV2.css`

- [ ] **Step 1: Append the new CSS rules**

Append to `frontend/src/pages/OptimalTimingV2.css` (do not remove existing rules; new components add their own classes):

```css
/* ─── Split-pane layout (Phase B) ───────────────────────────────────────── */

.otv2-split {
    display: grid;
    grid-template-columns: minmax(220px, 320px) 1fr;
    gap: 16px;
    margin-top: 16px;
}

.otv2-split-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 70vh;
    overflow-y: auto;
}

.otv2-split-detail {
    min-width: 0; /* prevents grid-blowout from wide content */
}

.otv2-split-empty {
    padding: 32px;
    text-align: center;
    color: #6b7280;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
}

@media (max-width: 720px) {
    .otv2-split {
        grid-template-columns: 1fr;
    }
    .otv2-split-list {
        max-height: none;
    }
    .otv2-split-detail {
        order: 2;
    }
}

/* ─── WindowListItem ───────────────────────────────────────────────────── */

.otv2-li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
        'rank date score'
        'moon moon tags';
    gap: 4px 12px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: background 120ms, border-color 120ms;
}

.otv2-li:hover {
    background: #f9fafb;
}

.otv2-li.is-selected {
    border-color: #6366f1;
    background: #eef2ff;
}

.otv2-li-rank { grid-area: rank; font-weight: 600; color: #6b7280; }
.otv2-li-date { grid-area: date; font-weight: 500; }
.otv2-li-score { grid-area: score; font-weight: 700; }
.otv2-li-moon { grid-area: moon; color: #6b7280; font-size: 13px; }

.otv2-li-tag {
    grid-area: tags;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 11px;
    background: #fef3c7;
    color: #92400e;
}

.otv2-li-score--great { color: #15803d; }
.otv2-li-score--good { color: #4d7c0f; }
.otv2-li-score--mid { color: #b45309; }
.otv2-li-score--low { color: #b91c1c; }

/* ─── VibeTabSwitcher ──────────────────────────────────────────────────── */

.otv2-vibe-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 12px 0;
}

.otv2-vibe-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    background: white;
    cursor: pointer;
    font: inherit;
    transition: all 120ms;
}

.otv2-vibe-tab:hover {
    background: #f9fafb;
}

.otv2-vibe-tab.is-active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
}

.otv2-vibe-tab-emoji { font-size: 16px; line-height: 1; }
.otv2-vibe-tab-label { font-size: 13px; }

/* ─── NarrativeBlock ───────────────────────────────────────────────────── */

.otv2-narrative-text {
    line-height: 1.55;
    color: #1f2937;
    margin: 0;
    padding: 12px 0;
}

.otv2-narrative-fallback {
    color: #6b7280;
    font-style: italic;
    margin: 0;
    padding: 12px 0;
}

.otv2-narrative-skeleton {
    padding: 12px 0;
}

.otv2-narrative-skeleton-line {
    height: 14px;
    margin-bottom: 8px;
    background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%);
    background-size: 200% 100%;
    animation: otv2-shimmer 1.4s infinite;
    border-radius: 4px;
}

.otv2-narrative-skeleton-line--short {
    width: 60%;
}

@keyframes otv2-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ─── DayDetailPanel ───────────────────────────────────────────────────── */

.otv2-detail {
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
}

.otv2-detail-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 12px;
}

.otv2-detail-date {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.otv2-detail-score {
    color: #6b7280;
    font-size: 13px;
}

.otv2-detail-wheel {
    display: flex;
    justify-content: center;
    margin: 8px 0;
    min-height: 320px;
}

.otv2-detail-predicates {
    margin-top: 16px;
}

.otv2-detail-predicates summary {
    cursor: pointer;
    color: #6b7280;
    font-size: 13px;
}

.otv2-detail-predicates ul {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
}

.otv2-detail-predicates li {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 4px 0;
    font-size: 13px;
}

/* ─── Recipe panel: vibes chip row ─────────────────────────────────────── */

.otv2-recipe-vibes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
}

.otv2-recipe-vibe-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f3f4f6;
    font-size: 12px;
}

.otv2-recipe-vibe-chip-emoji { font-size: 14px; line-height: 1; }
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

Expected: build succeeds (CSS doesn't break anything; just adds rules).

- [ ] **Step 3: Manual visual sanity check**

Start dev server, open the page in two viewport widths:
- ≥ 720px → list left, detail right
- < 720px → list above detail (stacked)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/OptimalTimingV2.css
git commit -m "feat(v2/frontend): styles for split-pane, list item, vibe tabs, narrative"
```

---

## Task 10: i18n — add new translation keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Add keys to `ru.json`**

Open `frontend/src/i18n/locales/ru.json`. Find the existing `"optimalTimingV2"` block. Add inside:

```json
"vibes": "вайбы",
"selectADay": "Выбери день из списка слева",
"narrativeUnavailable": "Текст для этого вайба недоступен. Попробуй обновить страницу.",
"voc": "VoC"
```

(If `voc` already exists in the block, skip it. Don't duplicate keys.)

- [ ] **Step 2: Add equivalents to `en.json`**

Open `frontend/src/i18n/locales/en.json`. Add to the same block:

```json
"vibes": "vibes",
"selectADay": "Pick a day from the list on the left",
"narrativeUnavailable": "Narrative for this vibe is not available. Try refreshing.",
"voc": "VoC"
```

- [ ] **Step 3: Verify JSON is valid and tests still pass**

```bash
cd frontend && npx tsc --noEmit && npm run test:run
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/locales/ru.json frontend/src/i18n/locales/en.json
git commit -m "i18n(v2/frontend): add keys for vibes, selectADay, narrativeUnavailable"
```

---

## Task 11: Remove unused `WindowCard.tsx`

**Files:**
- Delete: `frontend/src/components/OptimalTimingV2/WindowCard.tsx`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -rn "WindowCard" frontend/src
```

Expected: zero matches (Task 8 removed the import from the page).

- [ ] **Step 2: Delete the file**

```bash
git rm frontend/src/components/OptimalTimingV2/WindowCard.tsx
```

- [ ] **Step 3: Verify build still works**

```bash
cd frontend && npm run build
```

Expected: clean.

- [ ] **Step 4: Run all tests**

```bash
cd frontend && npm run test:run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(v2/frontend): remove WindowCard (replaced by WindowListItem + DayDetailPanel)"
```

---

## Verification

After all tasks complete:

- [ ] **Run full frontend test suite:** `cd frontend && npm run test:run` — expect 18+ tests passing across the new component test files
- [ ] **Build:** `cd frontend && npm run build` — clean
- [ ] **Type-check:** `cd frontend && npx tsc --noEmit` — clean
- [ ] **Manual smoke-test:** start backend on `:3001`, frontend dev on `:5173`, open `/optimal-timing-v2`, submit an intent, confirm:
  - List of windows appears on the left
  - First window auto-selected; right panel shows wheel + vibe tabs + narrative
  - Click another window → right panel updates
  - Click another vibe → narrative text changes; wheel stays the same
  - On narrow viewport (<720px): layout stacks; selecting a window scrolls/expands detail below
- [ ] **Backend integration sanity:** confirm the page successfully renders responses from a real backend call (non-mocked). The narratives might take 30-60s on a fresh request — UI should show the existing loading indicator.

After verification — open a PR. Phase B is complete; ZodiacWheel is still transit-only (Phase C extends it to biwheel) and there's no natal chart wired in (Phase D).

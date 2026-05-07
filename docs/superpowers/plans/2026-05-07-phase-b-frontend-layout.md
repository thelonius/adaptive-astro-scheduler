# Phase B — Frontend Layout: Split-Pane + Vibe Narratives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать `OptimalTimingV2` страницу под split-pane лейаут и показать vibe-нарративы из Phase A backend.

**Architecture:** Страница держит `selectedDate` / `selectedVibe` в стейте; левая панель — компактный `WindowListItem`-список, правая — `DayDetailPanel` с вайб-пилюлями и нарративом. Все данные уже в ответе от бэкенда — при переключении вайба сетевой запрос не делается.

**Tech Stack:** React 18, TypeScript strict, Vite, CSS custom properties (`--ag-*`). Тест-шаг — `cd frontend && npx tsc --noEmit` (строгая компиляция вместо unit-тестов: display-компоненты без логики).

---

## File Structure

**Create:**
- `frontend/src/components/OptimalTimingV2/utils.ts` — shared helpers (`scoreColor`, `formatDate`, `moonSummary`, lookup tables)
- `frontend/src/components/OptimalTimingV2/WindowListItem.tsx` — компактная строка в левой панели
- `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx` — ряд вайб-пилюль
- `frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx` — блок нарратива
- `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx` — правая панель (собирает все выше)

**Modify:**
- `frontend/src/services/optimalTimingV2Service.ts` — добавить `Vibe`, расширить `TimingWindowV2` и `GeneratedRecipe`
- `frontend/src/components/OptimalTimingV2/WindowCard.tsx` — заменить локальные функции импортами из `utils.ts`
- `frontend/src/pages/OptimalTimingV2.tsx` — split-pane стейт и разметка
- `frontend/src/pages/OptimalTimingV2.css` — классы для сплита, list-item, вайб-пилюль, нарратива, mobile

---

## Task 1: Add `Vibe` type and extend service interfaces

**Files:**
- Modify: `frontend/src/services/optimalTimingV2Service.ts`

- [ ] **Step 1: Add `Vibe` interface and extend `TimingWindowV2` / `GeneratedRecipe`**

В файле `frontend/src/services/optimalTimingV2Service.ts` после строки `export interface MatchedPredicate {` (примерно строка 34) вставить:

```typescript
export interface Vibe {
    id: string;
    label: string;
    emoji?: string;
}
```

В `TimingWindowV2` добавить поле после `retrograde_planets`:

```typescript
export interface TimingWindowV2 {
    date: string;
    score: number;
    rank: number;
    matched_predicates: MatchedPredicate[];
    moon: MoonState;
    sun_sign: string;
    retrograde_planets: string[];
    vibe_narratives?: Record<string, string>;  // добавить
}
```

В `GeneratedRecipe` добавить поле после `weighted_conditions`:

```typescript
export interface GeneratedRecipe {
    intent: string;
    rationale: string;
    disqualifiers: RecipeDisqualifier[];
    weighted_conditions: RecipeWeightedCondition[];
    vibes?: Vibe[];  // добавить
    metadata?: Record<string, unknown>;
}
```

- [ ] **Step 2: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/optimalTimingV2Service.ts
git commit -m "feat(frontend/types): add Vibe, extend TimingWindowV2 and GeneratedRecipe"
```

---

## Task 2: Extract shared utils from `WindowCard`

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/utils.ts`
- Modify: `frontend/src/components/OptimalTimingV2/WindowCard.tsx`

- [ ] **Step 1: Создать `utils.ts`**

```typescript
// frontend/src/components/OptimalTimingV2/utils.ts

export const MOON_PHASE_LABEL_RU: Record<string, string> = {
    new: 'новолуние',
    waxing_crescent: 'растущий серп',
    first_quarter: 'первая четверть',
    waxing_gibbous: 'растущая Луна',
    full: 'полнолуние',
    waning_gibbous: 'убывающая Луна',
    last_quarter: 'последняя четверть',
    waning_crescent: 'убывающий серп',
};

export const SIGN_LABEL_RU: Record<string, string> = {
    Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
    Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
    Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

export function scoreColor(score: number): string {
    if (score >= 80) return 'otv2-score--great';
    if (score >= 60) return 'otv2-score--good';
    if (score >= 40) return 'otv2-score--mid';
    return 'otv2-score--low';
}

export function formatDate(iso: string, lang: string): string {
    const d = new Date(`${iso}T12:00:00Z`);
    const opts: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
    };
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', opts);
}

export function moonSummary(sign: string, phase: string, lang: string): string {
    if (lang === 'ru') {
        const phaseRu = MOON_PHASE_LABEL_RU[phase] ?? phase;
        const signRu = SIGN_LABEL_RU[sign] ?? sign;
        return `Луна — ${phaseRu} в ${signRu}`;
    }
    return `Moon ${phase.replace(/_/g, ' ')} in ${sign}`;
}
```

- [ ] **Step 2: Обновить `WindowCard.tsx` — убрать дублирующие определения, добавить импорты**

Заменить весь файл `frontend/src/components/OptimalTimingV2/WindowCard.tsx`:

```typescript
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';
import { SIGN_LABEL_RU, scoreColor, formatDate, moonSummary } from './utils';

interface Props {
    window: TimingWindowV2;
    language: string;
}

export const WindowCard: React.FC<Props> = ({ window: w, language }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const positives = w.matched_predicates.filter((p) => p.weight > 0);
    const negatives = w.matched_predicates.filter((p) => p.weight < 0);

    return (
        <article className={`otv2-window${expanded ? ' is-expanded' : ''}`}>
            <header className="otv2-window-header">
                <div className="otv2-window-rank">#{w.rank}</div>
                <div className="otv2-window-date">{formatDate(w.date, language)}</div>
                <div className={`otv2-window-score ${scoreColor(w.score)}`}>
                    <div className="otv2-window-score-value">{w.score}</div>
                    <div className="otv2-window-score-label">/100</div>
                </div>
            </header>

            <div className="otv2-window-summary">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}
                        {t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
                {w.retrograde_planets.length > 0 && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}
                        {t('optimalTimingV2.retrograde', 'ретро')}: {w.retrograde_planets.join(', ')}
                    </span>
                )}
            </div>

            <div className="otv2-window-matched">
                {positives.map((p, i) => (
                    <span key={`p-${i}`} className="otv2-chip otv2-chip--pos">
                        +{p.weight} {p.type}
                    </span>
                ))}
                {negatives.map((p, i) => (
                    <span key={`n-${i}`} className="otv2-chip otv2-chip--neg">
                        {p.weight} {p.type}
                    </span>
                ))}
            </div>

            <button
                type="button"
                className="otv2-window-toggle"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                {expanded
                    ? t('optimalTimingV2.collapse', 'свернуть')
                    : t('optimalTimingV2.showDetails', 'подробнее')}
            </button>

            {expanded && (
                <div className="otv2-window-details">
                    <div className="otv2-detail-grid">
                        <div className="otv2-detail-row">
                            <span className="otv2-detail-key">
                                {t('optimalTimingV2.sun', 'Солнце')}
                            </span>
                            <span className="otv2-detail-val">
                                {language === 'ru' ? `в ${SIGN_LABEL_RU[w.sun_sign] ?? w.sun_sign}` : w.sun_sign}
                            </span>
                        </div>
                        {typeof w.moon.illumination === 'number' && (
                            <div className="otv2-detail-row">
                                <span className="otv2-detail-key">
                                    {t('optimalTimingV2.illumination', 'освещ.')}
                                </span>
                                <span className="otv2-detail-val">
                                    {Math.round(w.moon.illumination * 100)}%
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="otv2-detail-section-title">
                        {t('optimalTimingV2.matchedPredicates', 'сматчившиеся предикаты')}
                    </div>
                    <ul className="otv2-detail-predicates">
                        {w.matched_predicates.map((p, i) => (
                            <li key={i}>
                                <span
                                    className={`otv2-weight-badge ${p.weight >= 0 ? 'is-pos' : 'is-neg'}`}
                                >
                                    {p.weight >= 0 ? '+' : ''}
                                    {p.weight}
                                </span>
                                <span className="otv2-predicate-label">{p.type}</span>
                                {p.details && (
                                    <code className="otv2-predicate-details">
                                        {JSON.stringify(p.details)}
                                    </code>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </article>
    );
};
```

- [ ] **Step 3: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/utils.ts \
        frontend/src/components/OptimalTimingV2/WindowCard.tsx
git commit -m "refactor(frontend): extract shared utils from WindowCard"
```

---

## Task 3: Create `WindowListItem`

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/WindowListItem.tsx`

- [ ] **Step 1: Создать компонент**

```typescript
// frontend/src/components/OptimalTimingV2/WindowListItem.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';
import { scoreColor, formatDate, moonSummary } from './utils';

interface Props {
    window: TimingWindowV2;
    language: string;
    isSelected: boolean;
    onClick: (date: string) => void;
}

export const WindowListItem: React.FC<Props> = ({ window: w, language, isSelected, onClick }) => {
    const { t } = useTranslation();

    return (
        <article
            className={`otv2-list-item${isSelected ? ' is-selected' : ''}`}
            onClick={() => onClick(w.date)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick(w.date)}
        >
            <div className="otv2-list-item-top">
                <span className="otv2-list-item-rank">#{w.rank}</span>
                <span className="otv2-list-item-date">{formatDate(w.date, language)}</span>
                <span className={`otv2-list-item-score ${scoreColor(w.score)}`}>{w.score}</span>
            </div>
            <div className="otv2-list-item-sub">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
            </div>
        </article>
    );
};
```

- [ ] **Step 2: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/WindowListItem.tsx
git commit -m "feat(frontend): add WindowListItem component"
```

---

## Task 4: Create `VibeTabSwitcher` and `NarrativeBlock`

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx`
- Create: `frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx`

- [ ] **Step 1: Создать `VibeTabSwitcher.tsx`**

```typescript
// frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx

import React from 'react';
import type { Vibe } from '../../services/optimalTimingV2Service';

interface Props {
    vibes: Vibe[];
    selectedId: string | null;
    onChange: (id: string) => void;
}

export const VibeTabSwitcher: React.FC<Props> = ({ vibes, selectedId, onChange }) => {
    if (vibes.length === 0) return null;

    return (
        <div className="otv2-vibe-pills">
            {vibes.map((v) => (
                <button
                    key={v.id}
                    type="button"
                    className={`otv2-vibe-pill${v.id === selectedId ? ' is-active' : ''}`}
                    onClick={() => onChange(v.id)}
                >
                    {v.emoji ? `${v.emoji} ` : ''}{v.label}
                </button>
            ))}
        </div>
    );
};
```

- [ ] **Step 2: Создать `NarrativeBlock.tsx`**

```typescript
// frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx

import React from 'react';

interface Props {
    text: string | undefined;
}

export const NarrativeBlock: React.FC<Props> = ({ text }) => {
    if (!text) return null;
    return <p className="otv2-narrative">{text}</p>;
};
```

- [ ] **Step 3: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/VibeTabSwitcher.tsx \
        frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx
git commit -m "feat(frontend): add VibeTabSwitcher and NarrativeBlock components"
```

---

## Task 5: Create `DayDetailPanel`

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx`

- [ ] **Step 1: Создать компонент**

```typescript
// frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';
import { formatDate, moonSummary, scoreColor } from './utils';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibe: string | null;
    onVibeChange: (id: string) => void;
    language: string;
}

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibe,
    onVibeChange,
    language,
}) => {
    const { t } = useTranslation();
    const positives = w.matched_predicates.filter((p) => p.weight > 0);
    const negatives = w.matched_predicates.filter((p) => p.weight < 0);
    const narrativeText = selectedVibe ? w.vibe_narratives?.[selectedVibe] : undefined;

    return (
        <div className="otv2-detail-panel">
            <div className="otv2-detail-panel-header">
                <div className="otv2-detail-panel-date">{formatDate(w.date, language)}</div>
                <div className={`otv2-detail-panel-score ${scoreColor(w.score)}`}>
                    {w.score}
                    <span className="otv2-detail-panel-score-max">/100</span>
                </div>
            </div>

            <div className="otv2-detail-panel-moon">
                {moonSummary(w.moon.sign, w.moon.phase, language)}
                {w.moon.void_of_course && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.voc', 'VoC')}
                    </span>
                )}
                {w.retrograde_planets.length > 0 && (
                    <span className="otv2-tag otv2-tag--warn">
                        {' '}{t('optimalTimingV2.retrograde', 'ретро')}: {w.retrograde_planets.join(', ')}
                    </span>
                )}
            </div>

            <div className="otv2-detail-panel-chips">
                {positives.map((p, i) => (
                    <span key={`p-${i}`} className="otv2-chip otv2-chip--pos">
                        +{p.weight} {p.type}
                    </span>
                ))}
                {negatives.map((p, i) => (
                    <span key={`n-${i}`} className="otv2-chip otv2-chip--neg">
                        {p.weight} {p.type}
                    </span>
                ))}
            </div>

            {vibes.length > 0 && (
                <VibeTabSwitcher
                    vibes={vibes}
                    selectedId={selectedVibe}
                    onChange={onVibeChange}
                />
            )}

            <NarrativeBlock text={narrativeText} />
        </div>
    );
};
```

- [ ] **Step 2: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx
git commit -m "feat(frontend): add DayDetailPanel component"
```

---

## Task 6: Refactor `OptimalTimingV2.tsx` to split-pane

**Files:**
- Modify: `frontend/src/pages/OptimalTimingV2.tsx`

- [ ] **Step 1: Заменить содержимое файла**

```typescript
// frontend/src/pages/OptimalTimingV2.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IntentInput, IntentInputValue } from '../components/OptimalTimingV2/IntentInput';
import { GeneratedRecipePanel } from '../components/OptimalTimingV2/GeneratedRecipePanel';
import { WindowListItem } from '../components/OptimalTimingV2/WindowListItem';
import { DayDetailPanel } from '../components/OptimalTimingV2/DayDetailPanel';
import {
    optimalTimingV2Service,
    type FindWithIntentResponse,
    type Vibe,
} from '../services/optimalTimingV2Service';
import { useLocationStore } from '../store/locationStore';
import './OptimalTimingV2.css';

export default function OptimalTimingV2() {
    const { t, i18n } = useTranslation();
    const language = (i18n.language || 'en').slice(0, 2);
    const location = useLocationStore((s) => s.location);

    const [result, setResult] = useState<FindWithIntentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

    const handleSubmit = async (value: IntentInputValue) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await optimalTimingV2Service.findWithIntent({
                intent: value.intent,
                startDate: value.startDate,
                endDate: value.endDate,
                topN: value.topN,
                language,
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timezone: location.timezone,
                },
            });
            setResult(res);
            setSelectedDate(res.windows[0]?.date ?? null);
            setSelectedVibe(res.generated_recipe.vibes?.[0]?.id ?? null);
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message ??
                      (e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ??
                      String(e)
                    : e instanceof Error
                    ? e.message
                    : String(e);
            setError(msg);
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDate = (date: string) => {
        setSelectedDate(date);
        const vibes: Vibe[] = result?.generated_recipe.vibes ?? [];
        setSelectedVibe(vibes[0]?.id ?? null);
    };

    const selectedWindow = result?.windows.find((w) => w.date === selectedDate) ?? null;
    const vibes: Vibe[] = result?.generated_recipe.vibes ?? [];

    return (
        <div className="otv2-page">
            <header className="otv2-page-header">
                <h1 className="otv2-page-title">
                    {t('optimalTimingV2.pageTitle', 'Intent-based scheduler')}
                </h1>
                <p className="otv2-page-subtitle">
                    {t(
                        'optimalTimingV2.pageSubtitle',
                        'LLM переводит твоё намерение в астрологический recipe и ранжирует дни в выбранном диапазоне',
                    )}
                </p>
            </header>

            <IntentInput onSubmit={handleSubmit} isLoading={isLoading} />

            {isLoading && (
                <div className="otv2-loading">
                    <div className="otv2-loading-dot" />
                    <div className="otv2-loading-text">
                        {t(
                            'optimalTimingV2.loadingMessage',
                            'LLM генерирует recipe и считает скоринг по эфемеридам…',
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="otv2-error">
                    <strong>{t('optimalTimingV2.errorTitle', 'Ошибка')}:</strong> {error}
                </div>
            )}

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
                            <div className="otv2-split-list">
                                {result.windows.map((w) => (
                                    <WindowListItem
                                        key={w.date}
                                        window={w}
                                        language={language}
                                        isSelected={w.date === selectedDate}
                                        onClick={handleSelectDate}
                                    />
                                ))}
                            </div>
                            <div className="otv2-split-detail">
                                {selectedWindow && (
                                    <DayDetailPanel
                                        window={selectedWindow}
                                        vibes={vibes}
                                        selectedVibe={selectedVibe}
                                        onVibeChange={setSelectedVibe}
                                        language={language}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Проверить типы**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/OptimalTimingV2.tsx
git commit -m "feat(frontend): refactor OptimalTimingV2 to split-pane with vibe state"
```

---

## Task 7: Add CSS for split layout

**Files:**
- Modify: `frontend/src/pages/OptimalTimingV2.css`

- [ ] **Step 1: Добавить новые классы в конец файла**

Дописать в конец `frontend/src/pages/OptimalTimingV2.css`:

```css
/* ─── Split-pane layout ──────────────────────────────────────────────────── */

.otv2-split {
    display: flex;
    gap: 0;
    height: calc(100vh - 320px);
    min-height: 400px;
    border: 1px solid var(--ag-border);
    border-radius: var(--ag-radius-md, 12px);
    overflow: hidden;
    margin-top: 16px;
}

.otv2-split-list {
    width: 38%;
    overflow-y: auto;
    border-right: 1px solid var(--ag-border);
    flex-shrink: 0;
}

.otv2-split-detail {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

/* ─── Window list item ───────────────────────────────────────────────────── */

.otv2-list-item {
    padding: 10px 14px;
    border-bottom: 1px solid var(--ag-border);
    cursor: pointer;
    user-select: none;
    transition: background 0.1s ease;
}

.otv2-list-item:last-child {
    border-bottom: none;
}

.otv2-list-item:hover {
    background: var(--ag-surface);
}

.otv2-list-item.is-selected {
    background: #7c3aed22;
    border-left: 2px solid #7c3aed;
    padding-left: 12px;
}

.otv2-list-item-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 3px;
}

.otv2-list-item-rank {
    font-size: 11px;
    color: var(--ag-text-muted);
    min-width: 24px;
}

.otv2-list-item-date {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--ag-text);
}

.otv2-list-item-score {
    font-size: 13px;
    font-weight: 700;
}

.otv2-list-item-sub {
    font-size: 11px;
    color: var(--ag-text-muted);
    padding-left: 32px;
}

/* ─── Day detail panel ───────────────────────────────────────────────────── */

.otv2-detail-panel {
    height: 100%;
}

.otv2-detail-panel-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 6px;
}

.otv2-detail-panel-date {
    font-size: 18px;
    font-weight: 600;
    color: var(--ag-text);
}

.otv2-detail-panel-score {
    font-size: 20px;
    font-weight: 700;
}

.otv2-detail-panel-score-max {
    font-size: 13px;
    font-weight: 400;
    color: var(--ag-text-muted);
}

.otv2-detail-panel-moon {
    font-size: 13px;
    color: var(--ag-text-muted);
    margin-bottom: 12px;
}

.otv2-detail-panel-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
}

/* ─── Vibe pills ─────────────────────────────────────────────────────────── */

.otv2-vibe-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.otv2-vibe-pill {
    background: transparent;
    border: 1px solid var(--ag-border);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 12px;
    color: var(--ag-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
}

.otv2-vibe-pill:hover {
    border-color: #7c3aed;
    color: var(--ag-text);
}

.otv2-vibe-pill.is-active {
    background: #7c3aed;
    border-color: #7c3aed;
    color: #fff;
}

/* ─── Narrative block ────────────────────────────────────────────────────── */

.otv2-narrative {
    font-size: 14px;
    line-height: 1.7;
    color: var(--ag-text);
    margin: 0;
    padding: 12px 0;
    border-top: 1px solid var(--ag-border);
}

/* ─── Mobile breakpoint ──────────────────────────────────────────────────── */

@media (max-width: 768px) {
    .otv2-split {
        flex-direction: column;
        height: auto;
    }

    .otv2-split-list {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--ag-border);
        max-height: 260px;
    }
}
```

- [ ] **Step 2: Проверить сборку**

```bash
cd frontend && npx tsc --noEmit
```

Ожидаем: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/OptimalTimingV2.css
git commit -m "feat(frontend): add split-pane, list-item, vibe-pill, narrative CSS"
```

---

## Task 8: Visual verification

- [ ] **Step 1: Запустить dev-инфраструктуру и backend**

В отдельном терминале:

```bash
cd /path/to/repo && ./dev-start.sh
```

Или вручную:

```bash
# docker infra
docker compose -f docker/docker-compose.dev.yml up -d postgres redis ephemeris

# backend
cd backend && PORT=3001 npm run dev &
```

Подождать пока backend ответит:

```bash
until curl -sf http://localhost:3001/health > /dev/null; do sleep 2; done && echo "backend ready"
```

- [ ] **Step 2: Запустить frontend**

```bash
cd frontend && npm run dev
```

Открыть `http://localhost:5173` → страница "Intent-based scheduler".

- [ ] **Step 3: Проверить сценарий 1 — базовый флоу**

1. Ввести интент, например: `открытие выставки современного искусства`
2. Выбрать диапазон дат (2 недели от сегодня)
3. Нажать «найти окна»
4. Проверить: список дней слева, первый день выбран (фиолетовая рамка), правая панель показывает дату + скор + фазу луны + чипы предикатов.
5. Если backend вернул `vibes` и `vibe_narratives`: вайб-пилюли видны, нарратив показан под ними.
6. Если backend НЕ вернул `vibes` (старый ответ): пилюли и нарратив отсутствуют — ошибки нет.

- [ ] **Step 4: Проверить сценарий 2 — переключение дней**

1. Кликнуть на день #2 в левом списке.
2. Правая панель обновилась без перезагрузки.
3. Активный вайб сбросился на первый (если vibes есть).

- [ ] **Step 5: Проверить сценарий 3 — переключение вайбов**

1. Нажать другой вайб-чип в правой панели.
2. Текст нарратива изменился, остальное (дата, скор, чипы предикатов) осталось на месте.
3. Никаких сетевых запросов при смене вайба (Network tab в DevTools).

- [ ] **Step 6: Проверить мобильный вид**

В DevTools → Toggle device toolbar → выбрать `iPhone SE` (375px).
Ожидаем: список сверху (max-height 260px с прокруткой), детали снизу.

- [ ] **Step 7: Финальный commit и PR**

```bash
git add -p  # убедиться, что нет лишних файлов
git push origin claude/nostalgic-bartik-fa7da8
gh pr create \
  --title "feat(frontend): Phase B — split-pane layout with vibe narratives" \
  --body "$(cat <<'EOF'
## Summary
- Split-pane layout: compact WindowListItem list on the left, DayDetailPanel on the right
- Auto-selects day #1 on load; clicking a day updates the right panel without reload
- VibeTabSwitcher (pill style) switches the narrative text; no extra network requests
- NarrativeBlock gracefully handles missing vibe_narratives (backward-compatible)
- Mobile: stacked layout below 768px
- Shared utils.ts extracted from WindowCard (scoreColor, formatDate, moonSummary)

## Test plan
- [ ] Submit intent → left list populated, day #1 selected, right panel shows details
- [ ] Click day #2 → right panel updates, vibe resets to first
- [ ] Click vibe pill → only narrative text changes, no network request
- [ ] Backend without vibes → no crash, no pills shown
- [ ] Mobile 375px → stacked layout

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

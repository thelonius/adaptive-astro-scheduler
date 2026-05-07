# Phase C — Biwheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить биколесо (natal + transit кольца) в ZodiacWheel и показывать его в DayDetailPanel с данными из chartStore.

**Architecture:** Props-down: OptimalTimingV2 читает chartStore, вычисляет натальный чарт через chartService, передаёт `natalData` в DayDetailPanel → ZodiacWheel как `innerData`. ZodiacWheel рендерит второй PlanetMarkers на внутреннем кольце с разделителем. Если charts пустой — DayDetailPanel показывает NatalChartCTA.

**Tech Stack:** React, TypeScript, SVG, react-router-dom (Link), zustand (chartStore), chartService.calculateChart

---

## File Map

| Статус | Файл | Что меняется |
|--------|------|--------------|
| Modify | `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx` | Добавить `orbitRadius` и `markerRadius` пропсы (сейчас захардкожены) |
| Modify | `frontend/src/components/ZodiacWheel/index.tsx` | Добавить `innerData` пропс, рендер разделителя + внутреннего PlanetMarkers |
| Create | `frontend/src/components/OptimalTimingV2/NatalChartCTA.tsx` | CTA-блок для пользователей без чарта |
| Modify | `frontend/src/pages/OptimalTimingV2.css` | CSS класс `.otv2-natal-cta` |
| Modify | `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx` | Добавить `natalData` пропс, `ZodiacWheelBlock`, переставить порядок элементов |
| Modify | `frontend/src/pages/OptimalTimingV2.tsx` | Загрузить natal chart из chartStore, передать в DayDetailPanel |

---

## Task 1: Параметризовать орбиту в PlanetMarkers

**Context:** Сейчас `planetRadius = size * 0.015` и орбита `size * 0.32` захардкожены внутри компонента. Нам нужно два разных PlanetMarkers (транзиты и натал) с разными радиусами — делаем их пропсами.

**Files:**
- Modify: `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx:11-21,42`
- Modify: `frontend/src/components/ZodiacWheel/index.tsx:257-268`

- [ ] **Step 1: Добавить пропсы в интерфейс PlanetMarkersProps**

Открыть `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx`, строки 11–21. Заменить интерфейс:

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
  orbitRadius: number;
  markerRadius: number;
}
```

- [ ] **Step 2: Обновить деструктуризацию и использование в теле компонента**

Строки 23–33. Заменить:

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
  orbitRadius,
  markerRadius,
}) => {
```

Строку 42 (было `const planetRadius = size * 0.015;`) заменить на:

```ts
const planetRadius = markerRadius;
```

Также убрать неиспользуемую строку 46 `const _pointOnRing = polarToCartesian(size / 2, size / 2, size * 0.38, exactAngle);` — она была техническим остатком и больше не нужна (орбита теперь параметр).

- [ ] **Step 3: Обновить вызов PlanetMarkers в ZodiacWheel/index.tsx**

Строки 257–268 в `frontend/src/components/ZodiacWheel/index.tsx`. Найти блок `<PlanetMarkers` и добавить два новых пропса:

```tsx
{planetPositions.length > 0 && (
  <PlanetMarkers
    positions={planetPositions}
    colorScheme={config.colorScheme}
    showRetrogrades={config.showRetrogrades}
    voidMoon={data?.voidMoon}
    onPlanetHover={setHoveredPlanet}
    onClusterHover={handleClusterHover}
    onClusterClick={handleClusterClick}
    size={config.size}
    chartRotation={rotationDeg}
    orbitRadius={config.size * 0.32}
    markerRadius={config.size * 0.015}
  />
)}
```

- [ ] **Step 4: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|PlanetMarkers" | head -20
```

Ожидаем: нет ошибок, связанных с PlanetMarkers.

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/components/ZodiacWheel/PlanetMarkers.tsx \
        frontend/src/components/ZodiacWheel/index.tsx
git commit -m "refactor(ZodiacWheel): parameterize orbit and marker radius in PlanetMarkers"
```

---

## Task 2: Добавить innerData + биколесо в ZodiacWheel

**Context:** Добавляем `innerData?: ZodiacWheelData | null` пропс в ZodiacWheel. Если задан — рендерим разделитель (circle) и второй PlanetMarkers с натальными планетами на орбите `size * 0.22`. Аспекты из `innerData` не рисуем.

Натальные планеты рендерим без интерактивности (нет hover/click) — упрощает реализацию и не смешивает tooltip-логику с транзитными.

**Files:**
- Modify: `frontend/src/components/ZodiacWheel/index.tsx:19-29,86-96,256-275`

- [ ] **Step 1: Добавить innerData в интерфейс ZodiacWheelProps**

Строки 19–29. Добавить один новый пропс в конец интерфейса:

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
  innerData?: ZodiacWheelData | null;
}
```

- [ ] **Step 2: Деструктурировать innerData в теле компонента**

Строки 31–41. Добавить `innerData` в деструктуризацию:

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
  innerData,
}) => {
```

- [ ] **Step 3: Вычислить позиции натальных планет**

После строки 96 (блок `const aspectLines = useMemo(...)`), добавить:

```ts
const innerPlanetPositions = useMemo(() => {
  if (!innerData?.planets) return [];
  const sorted = sortPlanetsByOrbit(innerData.planets);
  const centerX = config.size / 2;
  const centerY = config.size / 2;
  const radius = config.size * 0.22;
  return calculatePlanetPositions(sorted, centerX, centerY, radius, 0);
}, [innerData?.planets, config.size]);
```

- [ ] **Step 4: Рендерить разделитель и внутренний PlanetMarkers в SVG**

Найти блок внутри `{(() => { ... })()}` после `{/* Planets */}` (после строки ~268). Добавить сразу после закрывающего тега транзитного `<PlanetMarkers>`:

```tsx
{/* Biwheel: separator ring + natal planets */}
{innerData && (
  <>
    <circle
      cx={config.size / 2}
      cy={config.size / 2}
      r={config.size * 0.27}
      fill="none"
      stroke="#334155"
      strokeWidth={1.5}
    />
    {innerPlanetPositions.length > 0 && (
      <PlanetMarkers
        positions={innerPlanetPositions}
        colorScheme={config.colorScheme}
        showRetrogrades={false}
        size={config.size}
        chartRotation={0}
        orbitRadius={config.size * 0.22}
        markerRadius={config.size * 0.012}
      />
    )}
  </>
)}
```

- [ ] **Step 5: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error" | head -20
```

Ожидаем: 0 ошибок.

- [ ] **Step 6: Коммит**

```bash
git add frontend/src/components/ZodiacWheel/index.tsx
git commit -m "feat(ZodiacWheel): add innerData prop for biwheel natal ring"
```

---

## Task 3: NatalChartCTA компонент + CSS

**Context:** Когда нет сохранённого чарта, DayDetailPanel показывает CTA вместо колеса. Компонент минимальный — текст и ссылка на `/natal-chart`.

**Files:**
- Create: `frontend/src/components/OptimalTimingV2/NatalChartCTA.tsx`
- Modify: `frontend/src/pages/OptimalTimingV2.css`

- [ ] **Step 1: Создать NatalChartCTA.tsx**

```tsx
// frontend/src/components/OptimalTimingV2/NatalChartCTA.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const NatalChartCTA: React.FC = () => (
  <div className="otv2-natal-cta">
    <span>☽ Добавь натальный чарт, чтобы видеть биколесо</span>
    <Link to="/natal-chart">→</Link>
  </div>
);
```

- [ ] **Step 2: Добавить CSS в OptimalTimingV2.css**

Открыть `frontend/src/pages/OptimalTimingV2.css`, добавить в конец файла:

```css
.otv2-natal-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 12px;
}

.otv2-natal-cta a {
  color: #7c3aed;
  text-decoration: none;
  font-size: 18px;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error" | head -10
```

Ожидаем: 0 ошибок.

- [ ] **Step 4: Коммит**

```bash
git add frontend/src/components/OptimalTimingV2/NatalChartCTA.tsx \
        frontend/src/pages/OptimalTimingV2.css
git commit -m "feat(OTV2): add NatalChartCTA component and CSS"
```

---

## Task 4: ZodiacWheelBlock + natalData в DayDetailPanel

**Context:** Добавляем `natalData?: ZodiacWheelData | null | undefined` пропс в DayDetailPanel. `undefined` = ещё грузится (ничего не показываем, избегаем мигания CTA). `null` = нет чарта (CTA). `ZodiacWheelData` = показываем биколесо.

Локальный `ZodiacWheelBlock` измеряет ширину контейнера через ResizeObserver и передаёт `size` в ZodiacWheel.

Новый порядок элементов:
1. Хедер
2. Moon info
3. Predicate chips
4. ZodiacWheel или NatalChartCTA ← **между chips и вайбами**
5. VibeTabSwitcher
6. NarrativeBlock

**Files:**
- Modify: `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx`

- [ ] **Step 1: Переписать DayDetailPanel.tsx полностью**

Полное содержимое файла `frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx`:

```tsx
// frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';
import type { ZodiacWheelData } from '../ZodiacWheel/types';
import { ZodiacWheel } from '../ZodiacWheel';
import { formatDate, moonSummary, scoreColor } from './utils';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import { NarrativeBlock } from './NarrativeBlock';
import { NatalChartCTA } from './NatalChartCTA';

interface Props {
    window: TimingWindowV2;
    vibes: Vibe[];
    selectedVibe: string | null;
    onVibeChange: (id: string) => void;
    language: string;
    natalData?: ZodiacWheelData | null;
}

const ZodiacWheelBlock: React.FC<{ date: string; natalData: ZodiacWheelData }> = ({ date, natalData }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(el);
        setContainerWidth(el.getBoundingClientRect().width);
        return () => observer.disconnect();
    }, []);

    const size = Math.max(containerWidth - 32, 200);

    return (
        <div ref={containerRef} style={{ marginBottom: '12px' }}>
            {containerWidth > 0 && (
                <ZodiacWheel
                    date={date}
                    innerData={natalData}
                    config={{ size, showHouses: false, showAspects: false, showRetrogrades: false }}
                    useAdaptiveRefresh={false}
                />
            )}
        </div>
    );
};

export const DayDetailPanel: React.FC<Props> = ({
    window: w,
    vibes,
    selectedVibe,
    onVibeChange,
    language,
    natalData,
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

            {natalData !== undefined && (
                natalData
                    ? <ZodiacWheelBlock date={w.date} natalData={natalData} />
                    : <NatalChartCTA />
            )}

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

- [ ] **Step 2: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error" | head -20
```

Ожидаем: 0 ошибок.

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/components/OptimalTimingV2/DayDetailPanel.tsx
git commit -m "feat(DayDetailPanel): add biwheel slot with ZodiacWheelBlock and NatalChartCTA"
```

---

## Task 5: Загрузить natal chart в OptimalTimingV2 и передать в DayDetailPanel

**Context:** OptimalTimingV2 читает `charts[0]` из chartStore, вызывает `chartService.calculateChart(charts[0])` при маунте, сохраняет результат как `natalData: ZodiacWheelData | null | undefined`. Передаёт в DayDetailPanel.

`chartService.calculateChart` принимает `ChartData` (SavedChart extends ChartData) и возвращает `Promise<ChartCalculationResult>` с полями `{ planets: any[], houses: any[], aspects: any[] }`.

**Files:**
- Modify: `frontend/src/pages/OptimalTimingV2.tsx:1-16,17-27,154-162`

- [ ] **Step 1: Добавить импорты**

Открыть `frontend/src/pages/OptimalTimingV2.tsx`. Добавить в блок импортов (после строки 14):

```ts
import { useChartStore } from '../store/chartStore';
import { chartService } from '../services/chartService';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { CelestialBody, Aspect, House } from '@adaptive-astro/shared/types';
```

- [ ] **Step 2: Добавить хук и эффект для загрузки natal chart**

После строки 26 (`const [selectedVibe, setSelectedVibe] = useState...`), добавить:

```ts
const { charts } = useChartStore();
const [natalData, setNatalData] = useState<ZodiacWheelData | null | undefined>(undefined);

useEffect(() => {
    if (!charts.length) {
        setNatalData(null);
        return;
    }
    chartService.calculateChart(charts[0]).then(result => {
        setNatalData({
            planets: result.planets as CelestialBody[],
            houses: result.houses as House[],
            aspects: result.aspects as Aspect[],
        });
    }).catch(() => setNatalData(null));
}, [charts]);
```

- [ ] **Step 3: Передать natalData в DayDetailPanel**

Найти блок `<DayDetailPanel` (строки ~154–162). Добавить пропс `natalData`:

```tsx
<DayDetailPanel
    window={selectedWindow}
    vibes={vibes}
    selectedVibe={selectedVibe}
    onVibeChange={setSelectedVibe}
    language={language}
    natalData={natalData}
/>
```

- [ ] **Step 4: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error" | head -20
```

Ожидаем: 0 ошибок.

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/pages/OptimalTimingV2.tsx
git commit -m "feat(OTV2): load natal chart from chartStore, pass to DayDetailPanel as innerData"
```

---

## Верификация вручную

После всех задач проверить в браузере (запустить `npm run dev` в `frontend/`):

1. **Есть сохранённый чарт** → биколесо отображается в DayDetailPanel между чипами и вайб-пилюлями. Внутреннее кольцо с натальными планетами, разделитель виден.
2. **Нет сохранённых чартов** → CTA «Добавь натальный чарт» вместо колеса, ссылка ведёт на `/natal-chart`.
3. **Смена дня** → ZodiacWheel обновляет транзиты (новый запрос по `date`), натальные планеты те же.
4. **Ресайз панели** → колесо масштабируется через ResizeObserver.
5. **DayExplorer** → ZodiacWheel работает без регрессий (нет `innerData`, один Transit ring).

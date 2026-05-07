# Phase C — Biwheel в ZodiacWheel

**Дата:** 2026-05-07  
**Статус:** approved, к реализации  
**Затрагиваемые файлы:** `frontend/src/components/ZodiacWheel/`  

---

## Цель

Расширить `ZodiacWheel` до biwheel-режима: внешнее кольцо — транзитные планеты (текущее небо), внутреннее — натальные (рождение). Аспектные линии между ними. Без подключения к реальным данным (userChartStore) — это Phase D.

---

## Дизайн-решения (согласованы)

| Вопрос | Решение |
|--------|---------|
| Ring layout | Один zodiac ring. Транзит filled на `r×0.32`, натал outlined на `r×0.22` |
| Aspect lines при biwheel | Переключатель. Default: transit↔natal (cross). Toggle: transit↔transit |
| Tooltip для натальных планет | Тот же что у транзитных (name, longitude, sign) |
| Rotation | Оба кольца — по transit ASC (текущее поведение, без изменений) |
| Вычисление cross-аспектов | Frontend, новая функция `computeCrossAspects()` в `utils.ts` |

---

## Архитектура

### Новый props

```ts
interface ZodiacWheelProps {
  // ... существующие ...
  innerData?: ZodiacWheelData | null; // натальная карта; если undefined/null — transit-only
}
```

Когда `innerData` не задан — компонент работает точно как сейчас.

### Новый state в ZodiacWheel

```ts
const [aspectMode, setAspectMode] = useState<'cross' | 'transit'>('cross');
```

Сбрасывается при изменении `innerData` (если натал исчез — нечего показывать в 'cross').

### Радиусы (относительно `config.size / 2`)

| Слой | Множитель | Стиль |
|------|-----------|-------|
| Zodiac ring (знаки) | `0.46–0.48` | без изменений |
| Transit orbit | `0.32` | filled circle |
| Cross-aspect ring | `0.32` → `0.22` | линии от планеты до планеты |
| Natal orbit | `0.22` | outlined circle (stroke only) |
| Center clear | `< 0.18` | пусто |

Guideline-круги: `r×0.32` и `r×0.22`, stroke `#1a2235`, opacity `0.15`, dasharray `2,6`.

---

## Компоненты

### `utils.ts` — новая функция

```ts
/**
 * Compute transit↔natal cross-aspects from two position arrays.
 * Returns AspectLine[] with from=transitPosition, to=natalPosition.
 */
export function computeCrossAspects(
  transitPositions: PlanetPosition[],
  natalPositions: PlanetPosition[],
  colorScheme: ColorScheme,
  orb: number = 8
): AspectLine[]
```

Использует уже существующие `calculateAspectAngle` + `detectAspectType`. Исключает conjunction из линий (по аналогии с `calculateAspectLines`).

### `CrossAspectLines.tsx` — новый компонент

`AspectLines.tsx` проецирует все линии на `size×0.28` независимо от реальных координат планет. Для biwheel это неверно: cross-aspect линии должны идти от реальной позиции transit-планеты (r×0.32) до реальной позиции natal-планеты (r×0.22).

```ts
interface CrossAspectLinesProps {
  lines: AspectLine[]; // from=transitPos (r×0.32), to=natalPos (r×0.22)
  size: number;
}
```

Рендерит простые `<line x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y}>` с цветом из `colorScheme.aspects[type]`, opacity ~0.65, без midpoint-символов и анимаций (те оставлены в `AspectLines` для transit↔transit).

### `PlanetMarkers.tsx` — расширение

Добавляется optional prop:

```ts
isNatal?: boolean; // default false
```

Когда `true`:
- Планеты рендерятся как outlined circles (`fill="none"`, `stroke=color`, `strokeWidth=1.5`)
- Opacity 0.75 (вместо 0.9 для транзита)
- Hover/click callbacks работают идентично — тот же `Tooltip`

### `ZodiacWheel/index.tsx` — основные изменения

**Новые useMemo:**

```ts
// Natal planet positions — inner orbit, same ASC rotation
const natalPlanetPositions = useMemo(() => {
  if (!innerData?.planets) return [];
  const sorted = sortPlanetsByOrbit(innerData.planets);
  const radius = config.size * 0.22; // inner orbit
  return calculatePlanetPositions(sorted, centerX, centerY, radius, rotationDeg);
}, [innerData?.planets, config.size, rotationDeg]);

// Cross-aspect lines: transit positions → natal positions
const crossAspectLines = useMemo(() => {
  if (!innerData || aspectMode !== 'cross' || natalPlanetPositions.length === 0) return [];
  return computeCrossAspects(planetPositions, natalPlanetPositions, config.colorScheme, config.aspectOrb);
}, [innerData, aspectMode, planetPositions, natalPlanetPositions, config.colorScheme, config.aspectOrb]);
```

**SVG additions (внутри motion.svg):**

```tsx
{/* Guideline circles for biwheel orbits */}
{innerData && (
  <>
    <circle cx={cx} cy={cy} r={size * 0.32} fill="none" stroke="#1a2235" strokeWidth="0.5" strokeDasharray="2,6" opacity="0.15"/>
    <circle cx={cx} cy={cy} r={size * 0.22} fill="none" stroke="#1a2235" strokeWidth="0.5" strokeDasharray="2,6" opacity="0.15"/>
  </>
)}

{/* Cross-aspect lines (transit↔natal) */}
{aspectMode === 'cross' && crossAspectLines.length > 0 && (
  <CrossAspectLines lines={crossAspectLines} size={config.size} />
)}

{/* Natal planet markers (inner ring) */}
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
    chartRotation={rotationDeg}
  />
)}
```

**Transit planets**: `showAspects && aspectMode === 'transit'` → render `<AspectLines>` как сейчас.

**Переключатель** — кнопка под `<motion.svg>`, только когда `innerData` присутствует:

```tsx
{innerData && (
  <div className="zodiac-aspect-toggle">
    <button
      className={`zodiac-aspect-btn${aspectMode === 'cross' ? ' is-active' : ''}`}
      onClick={() => setAspectMode('cross')}
    >T↔N</button>
    <button
      className={`zodiac-aspect-btn${aspectMode === 'transit' ? ' is-active' : ''}`}
      onClick={() => setAspectMode('transit')}
    >T↔T</button>
  </div>
)}
```

CSS через `--ag-*` токены (surface, border, day-primary), добавляется в новый `frontend/src/components/ZodiacWheel/ZodiacWheel.css` (импортируется в `index.tsx`) — переключатель принадлежит компоненту, не странице.

---

## Тесты и визуальные истории

`ZodiacWheelTest.tsx` — три истории с hardcoded mock natal:

1. **Transit only** — `innerData` не передан (regression, существующее поведение)
2. **Biwheel — cross-aspects** — `innerData` = моковая натальная карта (рождение 1984-09-11 01:40 MSK), `aspectMode = 'cross'`
3. **Biwheel — transit aspects** — те же данные, `aspectMode = 'transit'`

Mock natal data: планеты из натальной карты пользователя (`Sun 18° Virgo, Moon 10° Taurus, ...`). Константа `MOCK_NATAL_DATA` в `ZodiacWheelTest.tsx`.

Unit tests в `utils.test.ts` (новый файл):
- `computeCrossAspects` возвращает пустой массив при пустых позициях
- `computeCrossAspects` находит trine Sun transit ↔ Sun natal при longitude diff ~120°
- `computeCrossAspects` не возвращает conjunction

---

## Out of scope (Phase D)

- `userChartStore` — `activeChartId` + localStorage persist
- `NatalChartCTA` — empty-state баннер когда нет натала
- Передача `natal_chart_id` в API-запрос
- Wiring `DayDetailPanel` → API response `natal_chart` → `ZodiacWheel innerData`
- Redis-кэш нарративов с natal_chart_id ключом

---

## Затрагиваемые файлы

**Создать:**
- `frontend/src/components/ZodiacWheel/CrossAspectLines.tsx`
- `frontend/src/components/ZodiacWheel/utils.test.ts`

**Изменить:**
- `frontend/src/components/ZodiacWheel/index.tsx` — prop `innerData`, state `aspectMode`, useMemo, рендер
- `frontend/src/components/ZodiacWheel/utils.ts` — добавить `computeCrossAspects`
- `frontend/src/components/ZodiacWheel/PlanetMarkers.tsx` — prop `isNatal?: boolean`
- `frontend/src/pages/ZodiacWheelTest.tsx` — 3 визуальные истории
- `frontend/src/components/ZodiacWheel/ZodiacWheel.css` — стили переключателя (новый файл)

# Phase C — Biwheel: natal + transit rings in ZodiacWheel

**Goal:** Добавить биколесо в ZodiacWheel и показывать его в DayDetailPanel, используя сохранённый натальный чарт пользователя.

**Scope:** Только фронтенд. Backend не меняется. Передача `natal_chart_id` в запрос к `/api/v2/optimal-timing` — Phase D.

---

## Архитектура

### Поток данных

```
OptimalTimingV2
  └── useChartStore()         → charts[0]
  └── useNatalChart()         → calculateChart(charts[0].birthData)
  └── natalWheelData: ZodiacWheelData | null
  └── <DayDetailPanel natalData={natalWheelData} .../>
        └── <ZodiacWheel date={window.date} innerData={natalData} .../>
```

`natalWheelData` вычисляется один раз при маунте OptimalTimingV2 — не на каждый клик по дню. Если `charts` пустой — `natalWheelData = null`.

---

## Изменения компонентов

### `ZodiacWheel/index.tsx`

Новый пропс:

```ts
innerData?: ZodiacWheelData | null
```

Если `innerData` задан — рендерим:
1. `<circle>` разделитель: `r = size * 0.27`, `stroke="#334155"`, `strokeWidth=1.5`
2. второй `<PlanetMarkers>` с `orbitRadius={size * 0.22}` и `markerRadius={size * 0.012}` (чуть меньше транзитных)

Аспекты из `innerData` не рисуем — визуальный шум.

Если `innerData` не задан — ничего не меняется, компонент работает как сейчас.

### `ZodiacWheel/PlanetMarkers.tsx`

Текущий `orbitRadius` захардкожен как `size * 0.32`. Выносим в пропс:

```ts
interface Props {
  planets: CelestialBody[];
  size: number;
  orbitRadius: number;   // новый, обязательный
  markerRadius: number;  // новый, обязательный
}
```

Существующий вызов в `ZodiacWheel/index.tsx` передаёт `orbitRadius={size * 0.32}` и `markerRadius={size * 0.015}` — поведение не меняется.

### `DayDetailPanel.tsx`

Новый пропс:

```ts
natalData?: ZodiacWheelData | null
```

Порядок элементов:

```
1. Хедер (дата, score, фаза луны)
2. Matched predicates chips
3. ZodiacWheel или NatalChartCTA   ← новое
4. VibeTabSwitcher
5. NarrativeBlock
```

Логика рендера:

```tsx
{natalData !== undefined && (
  natalData
    ? <ZodiacWheelBlock date={window.date} natalData={natalData} />
    : <NatalChartCTA />
)}
```

`natalData === undefined` — состояние до загрузки (ничего не рендерим, избегаем CTA-мигания).

#### `ZodiacWheelBlock` (локальный sub-компонент внутри DayDetailPanel.tsx)

Props: `{ date: string; natalData: ZodiacWheelData }`.

Отвечает за:
- `useRef` + `ResizeObserver` на контейнере для получения ширины
- `size = containerWidth - 32`
- рендер `<ZodiacWheel date={date} innerData={natalData} config={{ size }} />`

ZodiacWheel самостоятельно фетчит транзиты для `date` — `transitData` передавать не нужно.

Не выносим в отдельный файл — используется только здесь.

#### `NatalChartCTA`

Минималистичный блок:

```
┌──────────────────────────────────────┐
│  ☽  Добавь натальный чарт            │
│     чтобы видеть биколесо      [→]   │
└──────────────────────────────────────┘
```

Кнопка `[→]` — `<Link to="/natal-chart">`. Стиль: `border: 1px solid #334155`, `border-radius: 8px`, `padding: 12px 16px`, цвет текста `#64748b`.

### `OptimalTimingV2.tsx`

Добавить:

```ts
const { charts } = useChartStore();
const { calculateChart } = useNatalChart();
const [natalData, setNatalData] = useState<ZodiacWheelData | null | undefined>(undefined);

useEffect(() => {
  if (!charts.length) {
    setNatalData(null);
    return;
  }
  calculateChart({ birthData: charts[0].birthData }).then(result => {
    setNatalData({
      planets: Object.values(result.planets),
      houses: result.houses,
      aspects: result.aspects,
    });
  }).catch(() => setNatalData(null));
}, [charts]);
```

Передавать `natalData` в `<DayDetailPanel natalData={natalData} .../>`.

---

## CSS (`OptimalTimingV2.css`)

Добавить:

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
}
```

---

## Что не входит в Phase C

- Передача `natal_chart_id` в запрос к backend — Phase D
- Выбор между несколькими сохранёнными чартами — Phase D
- Аспекты между натальными и транзитными планетами — не планируется

---

## Верификация

1. Есть сохранённый чарт → биколесо рендерится, внутреннее кольцо с натальными планетами, разделитель виден.
2. Нет сохранённых чартов → CTA «Добавь натальный чарт» вместо колеса.
3. Смена дня в списке → ZodiacWheel обновляет транзиты, натальные планеты не меняются.
4. Ресайз панели → размер колеса адаптируется через ResizeObserver.
5. `innerData` не задан (старый путь через DayExplorer) → ZodiacWheel работает как раньше, без регрессий.

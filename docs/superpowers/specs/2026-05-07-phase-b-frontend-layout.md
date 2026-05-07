# Phase B — Frontend Layout: Split-Pane + Vibe Narratives

**Goal:** Переработать `OptimalTimingV2` страницу под split-pane лейаут, добавить отображение vibe-нарративов из Phase A backend. После этой фазы пользователь видит список дней слева и детали выбранного дня (вайбы + нарратив) справа.

**Scope:** Только фронтенд. Backend API не меняется. Biwheel (Phase C) и natal store (Phase D) не входят.

---

## Архитектура

### Стейт страницы

`OptimalTimingV2.tsx` держит два новых стейт-переменных:

```ts
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
```

При получении результатов: `selectedDate` → `result.windows[0]?.date`, `selectedVibe` → первый вайб из `result.generated_recipe.vibes?.[0]?.id`. При смене дня в списке: `selectedVibe` сбрасывается на первый вайб нового дня.

### Лейаут

```
[otv2-page]
  [otv2-page-header]
  [IntentInput]
  [GeneratedRecipePanel — full-width, collapsible]
  [otv2-summary — full-width]
  [otv2-split]
    [otv2-split-list]   — width: 38%
      WindowListItem × N
    [otv2-split-detail]  — flex: 1
      DayDetailPanel
```

Mobile (`< 768px`): `otv2-split` переходит в `flex-direction: column`.

---

## Новые компоненты

### `WindowListItem`

Компактная кликабельная строка в левой панели. Заменяет `WindowCard` в контексте split-pane (сам `WindowCard` не удаляем — может использоваться в других местах).

Props:
```ts
interface Props {
  window: TimingWindowV2;
  language: string;
  isSelected: boolean;
  onClick: (date: string) => void;
}
```

Структура: два ряда.
- Верхний: `#rank · дата · score` (score цветом через `scoreColor()`).
- Нижний: фаза луны + знак, VoC-тег если есть.

Активное состояние: `border: 1px solid #7c3aed`, фоновый tint `#7c3aed22`.

Функция `scoreColor()` сейчас живёт в `WindowCard.tsx` — при создании `WindowListItem` выносим её в общий файл `components/OptimalTimingV2/utils.ts` и импортируем из обоих компонентов.

### `DayDetailPanel`

Правая панель для выбранного дня. Если `selectedDate === null` — `null` (не рендерится; этого не происходит при автовыборе, но защита нужна).

Props:
```ts
interface Props {
  window: TimingWindowV2;
  vibes: Vibe[];          // из generated_recipe.vibes ?? []
  selectedVibe: string | null;
  onVibeChange: (vibeId: string) => void;
  language: string;
}
```

Структура:
1. Хедер: дата (форматированная), score, фаза луны.
2. Matched predicates chips (позитивные зелёные, негативные красные) — как в текущем `WindowCard`.
3. `VibeTabSwitcher` (если `vibes.length > 0`).
4. `NarrativeBlock`.

### `VibeTabSwitcher`

Горизонтальный ряд пилюль. Активный — `background: #7c3aed; color: #fff`. Неактивные — `border: 1px solid #475569; color: #94a3b8`. Эмодзи из `vibe.emoji` если есть, иначе только `vibe.label`.

Props:
```ts
interface Props {
  vibes: Vibe[];
  selectedId: string | null;
  onChange: (id: string) => void;
}
```

### `NarrativeBlock`

Показывает `window.vibe_narratives?.[selectedVibeId]`. Если текст отсутствует (старый backend, нет `vibe_narratives`) — рендерит `null` без ошибки.

Props:
```ts
interface Props {
  text: string | undefined;
}
```

---

## Изменения существующих файлов

### `optimalTimingV2Service.ts`

Добавить типы:

```ts
export interface Vibe {
  id: string;
  label: string;
  emoji?: string;
}
```

Расширить `TimingWindowV2`:
```ts
vibe_narratives?: Record<string, string>;
```

Расширить `GeneratedRecipe`:
```ts
vibes?: Vibe[];
```

### `OptimalTimingV2.tsx`

- Добавить стейт `selectedDate`, `selectedVibe`.
- Убрать `otv2-windows-list` + `WindowCard` — заменить на `otv2-split` с `WindowListItem` и `DayDetailPanel`.
- `GeneratedRecipePanel` остаётся full-width над сплитом. Делаем collapsible: добавляем локальный `useState<boolean>` для раскрытия/свёртки. По умолчанию — свёрнут после загрузки (только заголовок с кнопкой «развернуть»).

### `OptimalTimingV2.css`

Добавить:
- `.otv2-split` — `display: flex; gap: 0; height: calc(100vh - 300px); min-height: 400px;`
- `.otv2-split-list` — `width: 38%; overflow-y: auto; border-right: 1px solid #1e293b;`
- `.otv2-split-detail` — `flex: 1; overflow-y: auto; padding: 16px;`
- `.otv2-list-item` и состояния (`.is-selected`, `:hover`).
- `.otv2-vibe-pill` — base + `.is-active`.
- `.otv2-narrative` — typography для блока нарратива.
- `@media (max-width: 768px)` — `otv2-split` → `flex-direction: column; height: auto;`

---

## Что не входит в Phase B

- Biwheel (`innerData` в `ZodiacWheel`) — Phase C.
- `userChartStore` и `NatalChartCTA` — Phase D.
- Передача `natal_chart_id` в запрос — Phase D.
- `ZodiacWheel` остаётся transit-only, без изменений.

---

## Верификация

После реализации вручную проверить:
1. Запрос с интентом → список дней слева, первый выбран автоматически, нарратив для первого вайба справа.
2. Клик на другой день → стейт меняется, правая панель обновляется без перезагрузки.
3. Клик на другой вайб-пилюль → только нарратив меняется.
4. Если `vibe_narratives` отсутствует (старый ответ) → компонент не падает.
5. Mobile (< 768px) → список над деталями.

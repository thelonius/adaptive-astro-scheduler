# Vibe Rendering и Biwheel в Optimal Timing v2

**Дата:** 2026-05-05
**Статус:** design-spec, утверждён к реализации
**Затрагиваемые части:** `backend/src/optimal-timing/v2`, `frontend/src/pages/OptimalTimingV2.tsx`, `frontend/src/components/OptimalTimingV2`, `frontend/src/components/ZodiacWheel`, новый store `userChartStore`

## Зачем это нужно

Сегодня v2 выдаёт ранжированный список дней с предикатами, на которых день набрал балл. У этого списка две дыры:

1. Нельзя глазами увидеть «что вообще на небе в этот день» — текстовое описание есть, картины нет.
2. Один и тот же день для разных намерений ощущается по-разному, но v2 не умеет это показать. Поездка на дачу с целью «прибраться» и с целью «вернуться к воспоминаниям» — это разные оптимумы и разные ожидания, а текущая v2 даёт один универсальный ответ.

Этот дизайн добавляет:
- **Биквил** (transit + natal) на странице v2 как визуальный спутник списка дней.
- **Vibe-нарративы**: LLM генерирует под каждый интент 2-4 «вайба» — альтернативные рамки чтения события, и для каждого предложенного дня — короткий текст в каждой рамке.
- **Graceful degradation** для пользователей без натальной карты: показ только транзита + ненавязчивый CTA на добавление натала.

## Решения, принятые в брейншторме

Все были выбраны пользователем явно:

- Vibe — это **per-day лензa чтения**, не фильтр ранжирования. Список топ-N дней одинаковый для всех вайбов; разница — только в нарративе.
- Vibes генерируются **адаптивно под интент** (LLM выдаёт 2-4 вайба вместе с рецептом). Не фиксированный набор «practical/emotional/structural/social».
- Колесо — **одно большое сбоку** + компактный список дат слева. На мобильных — стек с inline-разворачиванием.
- Колесо — **biwheel** (transit + natal) с подсветкой сработавших предикатов. Без натала — только transit-кольцо.
- LLM-генерация нарративов — **eager bulk** одним запросом + кэш по `(intent, date_range, natal_chart_id)`.

## 1. Архитектура и поток данных

Текущий v2-пайплайн:

```
intent → buildRecipe (LLM) → scoreDays → rankWindows
```

Становится:

```
intent → buildRecipe (LLM #1)            ─┐
                                          │ Recipe + vibes (без текста)
        scoreDays                         │
        rankWindows                       │
                                          ▼
                  renderNarratives (LLM #2) ←── recipe, vibes, top-N с эфемеридами, natal_chart?
                                          │
                                          ▼
                           per-day vibe-narratives
```

**Два LLM-вызова, не один.** Vibes как *список* зависят только от интента (генерятся вместе с рецептом, кэшируются по интенту). *Тексты* нарративов зависят от конкретных дней + их астро-состояния, которое известно только после ранжирования.

Кэш двухуровневый:
- **L1 — recipe + vibes**: ключ `hash(lang + intent)`. Существующий `_systemPromptCache` в `recipe-generator.ts` расширяется.
- **L2 — narratives**: ключ `hash(lang + intent + start_date + end_date + natal_chart_id || '')`. Новый, in-memory LRU размером 100. Phase 2 — Redis с TTL 24h.

`TraceRecord` получает поле `stage_render_narratives` со входом, выходом, латентностью обоих LLM-вызовов. Все существующие debug-окна (Поле `request_id` → `GET /traces/:id`) автоматически охватывают новую стадию.

## 2. DSL и API

### Recipe DSL

В `backend/src/optimal-timing/v2/schema/dsl.ts`:

```ts
const VibeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),  // 'nostalgic_return'
  label: z.string().min(1).max(60),           // 'ностальгическое возвращение'
  emoji: z.string().max(4).optional(),        // '🏡'
});

export const RecipeSchema = z.object({
  intent: z.string().min(1).max(500),
  rationale: z.string().min(1).max(1000),
  disqualifiers: z.array(PredicateSchema).default([]),
  weighted_conditions: z.array(WeightedPredicateSchema).min(1),
  vibes: z.array(VibeSchema).min(2).max(5),   // ← новое
  metadata: RecipeMetadataSchema,
});
```

`SCHEMA_VERSION` поднимается с `1.0.0` до `1.1.0`. Старые рецепты без `vibes` остаются валидными в trace-логах через миграцию (см. раздел 5).

### Промпт `recipe.v1.md` → `recipe.v2.md`

Дополнительная инструкция: «Also propose 2-4 distinct vibes — alternative framings of the user's intent that someone might bring to the same event with different intentions or expectations. Each vibe must have a stable id (snake_case ASCII), a short label in the user's language, and optionally an emoji.»

В каждый из 5 канонических few-shot рецептов в `canonical-recipes.json` добавляются 3-4 примера вайбов:
- `business_launch` → aggressive_growth / sustainable_build / signal_to_market / quiet_start
- `marriage_relationship` → public_celebration / intimate_bond / family_legacy / spiritual_union
- `mercury_matters` → analytical_focus / persuasive_pitch / careful_negotiation / creative_brainstorm
- `mars_matters` → competitive_drive / disciplined_execution / breakthrough_attempt / measured_assertion
- `jupiter_matters` → expansive_growth / philosophical_journey / risk_taking / generous_giving

### Новая стадия `renderNarratives`

Новый файл `backend/src/optimal-timing/v2/pipeline/render-narratives.ts`:

```ts
export interface RenderNarrativesInput {
  intent: string;
  recipe: Recipe;
  windows: ScoredDay[];           // топ-N после rankWindows (см. schema/trace.ts)
  natal_chart?: NatalChart;       // опционально, для персональных нарративов
  language?: 'ru' | 'en';
}

export interface NarrativeBundle {
  /** Per-day per-vibe text. Outer key = ISO date, inner key = vibe.id */
  narratives: Record<string, Record<string, string>>;
  /** LLM metadata for trace */
  llm: { model: string; latency_ms: number; cost_usd: number; cached: boolean };
}

export async function renderNarratives(input: RenderNarrativesInput): Promise<NarrativeBundle>;
```

Промпт `prompts/narratives.v1.md`:
- В системную часть подставляется `recipe + vibes`
- В юзер-часть — массив дней с `ephemeris_snapshot` и `matched_predicates`
- Просит для каждого дня × вайба выдать 1-3 предложения, **используя астрологические данные дня как материал** (не общие рассуждения)
- Ответ строго JSON: `{ "2026-05-19": { "nostalgic_return": "...", "practical": "..." } }`
- Валидируется Zod-схемой; при ошибке — один retry с фидбеком (как в `recipe-generator.ts`); при втором провале — throw с `stage: 'render_narratives'`
- Если передан `natal_chart` — в промпте появляется натальная карта и инструкция «explicitly reference user's natal placements where transits make meaningful contacts»; без натала — нарративы только про транзит

### API-изменения

`POST /api/optimal-timing/v2/find-with-intent`:

**Request** (изменения):
```json
{
  "intent": "...",
  "start_date": "2026-05-05",
  "end_date": "2026-07-05",
  "top_n": 10,
  "language": "ru",
  "natal_chart_id": "93b4207a-..."   // ← опционально
}
```

**Response** (изменения):
- `generated_recipe.vibes` — массив определений вайбов (2-4 шт.)
- `windows[i].vibe_narratives` — `Record<vibeId, string>` для этого дня
- `narratives_llm` — латентность/стоимость новой стадии (для отладки)
- `natal_chart` — встраивается в ответ если передан id (для рендера биквила на фронте)

`POST /api/optimal-timing/v2/find-with-fixed-recipe` — без изменений в этом релизе. Если кому-то понадобятся нарративы для фиксированного рецепта — добавить опциональный `render_narratives: true` флаг в следующий релиз.

## 3. Фронтенд: компоненты, лейаут, состояние

### Лейаут

```
┌─────────────────────────────────────────────────────────┐
│  IntentInput (existing)                                 │
├─────────────────────────────────────────────────────────┤
│  GeneratedRecipePanel (existing, +vibes summary)        │
├──────────────────┬──────────────────────────────────────┤
│  WindowListItem  │  DayDetailPanel                      │
│  WindowListItem  │   ┌────────────┐                     │
│  WindowListItem  │   │  Biwheel   │  ← ZodiacWheel +    │
│  WindowListItem  │   │            │     natal overlay   │
│  WindowListItem  │   └────────────┘                     │
│  WindowListItem  │   VibeTabSwitcher  🏡 🧹 🌿          │
│  ...             │   NarrativeBlock                     │
└──────────────────┴──────────────────────────────────────┘
   ~30% ширины          ~70% ширины
```

Десктоп (≥720px): split-pane как на схеме. Мобильный (<720px): стек, выбранный день разворачивается inline под собой. Один `<DayDetailPanel>` рендерится либо в правой панели, либо ниже выбранного listitem'а — переключается через CSS grid и медиа-запросы, без отдельного мобильного компонента.

### Новые компоненты

`frontend/src/components/OptimalTimingV2/`:

- **`WindowListItem.tsx`** — компактная замена `WindowCard`. Одна строка: дата, день недели, score (точки/звёзды), знак Луны, фаза. Highlight при выборе. Кликом — `setSelectedDate(window.date)`.
- **`DayDetailPanel.tsx`** — обёртка над правым (или нижним) блоком. Принимает `window`, `recipe.vibes`, `selectedVibeId`, `natalChart?`, `onVibeChange`.
- **`VibeTabSwitcher.tsx`** — pills/tabs из `recipe.vibes`. Активный pill отдаёт `vibeId` через `onChange`.
- **`NarrativeBlock.tsx`** — рендерит `window.vibe_narratives[selectedVibeId]`. Skeleton при загрузке.
- **`NatalChartCTA.tsx`** — empty-state баннер над колесом: «Добавь натальную карту чтобы увидеть как этот день выглядит лично для тебя» + Link на `/natal-chart`. Показывается когда `natalChartId === null`.

### Изменения существующих

- **`OptimalTimingV2.tsx`** — основная переработка:
  - Местo вертикального списка `WindowCard` → split-pane
  - Новый локальный state: `selectedDate`, `selectedVibeId`, `natalChartId`
  - При получении ответа от API: `selectedDate ← windows[0].date`, `selectedVibeId ← recipe.vibes[0].id`
- **`GeneratedRecipePanel.tsx`** — добавляется секция Vibes (горизонтальный ряд chip'ов с эмодзи + label), показывает что LLM предложила. Клик по chip'у выбирает вайб глобально (синхронизирует `selectedVibeId`).
- **`optimalTimingV2Service.ts`** — расширяются типы `OptimalTimingV2Response` / `Recipe` под новые поля. Параметр `natalChartId` добавляется в request.
- **`ZodiacWheel/index.tsx`** — **требует расширения для биквил-режима.** Сейчас компонент рисует одно кольцо. Добавляется prop `innerData?: ZodiacWheelData` — внутреннее кольцо с натальными планетами; и логика в `AspectLines` для рисования линий между транзитом и натальными точками. Это самая значимая фронт-работа в проекте — оценочно 200-400 строк.

### Источник `natalChartId`

Глобальный store, аналогично существующему `frontend/src/store/locationStore.ts`. Создаётся `userChartStore.ts`:

```ts
interface UserChartStore {
  activeChartId: string | null;
  setActiveChart: (id: string | null) => void;
}
```

Persist в localStorage. Обновляется когда пользователь:
- Создаёт карту в `/natal-chart` (на success-коллбэке)
- Выбирает «использовать в Scheduler» из `/chart-library`

В v2-странице: `const natalId = useUserChartStore(s => s.activeChartId)` → передаётся в API-запрос → в API-ответе приходит сам `natal_chart` объект → передаётся в `<ZodiacWheel innerData={natalChart}>`.

### Загрузка и обработка отказов

- **API-ответ ещё не пришёл** — skeleton-state списка дат + большой spinner на месте колеса
- **API-ошибка нарративов, recipe валиден** — список и колесо рендерятся, в `NarrativeBlock` — «Не удалось сгенерировать описание. Перезагрузить?». Не блокирующая.
- **`natalChartId` есть, но fetch натала падает** — биквил degrade'ится в transit-only с warning toast'ом

## 4. Натальная карта: detection, GD, конверсия

### Три состояния v2 относительно натала

| Состояние store | Что юзер видит |
|---|---|
| `activeChartId === null` | **Transit-only**: одно кольцо. Над колесом — `NatalChartCTA`. Подсветка предикатов работает. Нарративы — про транзит. |
| `activeChartId !== null`, fetch idle | **Biwheel skeleton**: внешнее кольцо нарисовано, на месте внутреннего — shimmer. |
| `activeChartId !== null`, натал загружен | **Полный biwheel**: транзит + натал, аспекты транзит↔натал на колесе, нарративы упоминают натальные позиции. |

### NatalChartCTA баннер

Компактный, недизъюнктивный — **не блокирует** работу с v2:

```
┌─────────────────────────────────────────────────────┐
│ ⓘ Добавь натальную карту, чтобы увидеть как этот    │
│   день выглядит лично для тебя — транзиты к твоим   │
│   планетам, личные нюансы в описаниях.              │
│                              [Создать  →]  [Позже]  │
└─────────────────────────────────────────────────────┘
```

«Создать» → `/natal-chart?return_to=optimal-timing-v2`. «Позже» → `localStorage['v2_cta_dismissed_at']`. CTA снова появляется через 7 дней (если за это время натал не создан).

### Flow добавления натала

1. На v2 юзер кликает «Создать» → переход на `/natal-chart`
2. Страница `/natal-chart` без изменений в логике расчёта/сохранения
3. После успешного `POST /api/natal-chart/save`:
   - Коллбэк вызывает `userChartStore.setActiveChart(newId)` (обновляет store + localStorage)
   - При наличии `?return_to=optimal-timing-v2` — редирект назад на v2
4. v2 при размонтировании запоминает `selectedDate`, `selectedVibeId`, `intent` в URL hash. Возврат — состояние восстанавливается, теперь рендерится biwheel.
5. `intent_hash` тот же → recipe из L1-кэша. `narrativesCache` ключуется с `natal_chart_id`, который сменился с null на id, → **нарративы перегенерируются с натальным контекстом**. Разовая стоимость одного запроса.

### Multi-chart: что считается «активным»

- Первая созданная карта → автоматически активная
- Последующие → UX-кнопка «сделать активной» в `/natal-chart` форме
- В `/chart-library` — пункт меню «использовать в Scheduler» у каждой карты
- `userChartStore` хранит только `activeChartId`. Список карт берётся из `GET /api/natal-chart/list/...` через существующий механизм.

### Edge cases

- **Активная карта удалена** в `/chart-library` → store слушает событие, обнуляет `activeChartId`. v2 на следующем рендере → transit-only.
- **404 от API при fetch натала** → store ловит ошибку, обнуляет id, warning лог, degrade в transit-only с toast'ом.
- **Координаты места поездки ≠ места рождения** — для биквила несущественно (натал привязан к рождению, не к локации). Транзитные координаты приходят из `locationStore`.

### Аналитика конверсии

В TraceRecord на v2-запросе сохраняется `natal_chart_id || null`. Метрика: процент v2-запросов с натальным слоем. Для функнела CTA — опциональные analytics-events `v2_natal_cta_shown` / `v2_natal_cta_clicked` / `v2_natal_loaded_first_time`. Опционально для MVP.

## 5. Тесты, метрики, версионирование, миграция

### Backend-тесты

`backend/tests/` (Jest):

- **`v2/schema/dsl.test.ts`** — валидация `vibes` поля (минимум 2, максимум 5, уникальные id, валидный snake_case). Существующий тест расширяется.
- **`v2/pipeline/render-narratives.test.ts`** — новый. Мокаем NIM-клиент, проверяем:
  - Сборка системного промпта `narratives.v1.md` с подстановкой recipe + vibes
  - Сериализация дней с `ephemeris_snapshot + matched_predicates` в user-message
  - Валидный JSON → `NarrativeBundle`
  - Невалидный JSON → один retry; второй провал → throw
  - Отсутствует ключ для (date, vibe) — graceful: фронт получает null, показывает «текст недоступен»
  - С `natal_chart` — натал попадает в промпт; без — не попадает
- **`v2/api/controller.test.ts`** — расширяется: запрос с `natal_chart_id` → fetch натала → передача в `renderNarratives` → ответ содержит `natal_chart`.

### Frontend-тесты

- Юнит-тесты компонентов из раздела 3 (Vitest + Testing Library)
- Visual-stories в `ZodiacWheelTest.tsx`: «biwheel transit only / transit + natal / transit + natal + matched-predicates highlight» с моковыми данными
- e2e (Playwright или Cypress) — flow «cold start без натала → biwheel mode после создания»

### Расширение eval-harness

`backend/src/optimal-timing/v2/eval/queries.yaml` расширяется тремя осями:

**Vibe-coverage** — для каждого канонического интента: 2-5 вайбов, уникальные id, label непустой. Smoke-тест.

**Vibe-stability** — интент прогоняется 5 раз с `bypass_cache: true`. Метрика — embedding-cosine между сгенерированными labels (через `text-embedding-3-small` или sentence-transformers локально). Порог: средний cosine > 0.6 на 5 прогонах.

**Narrative-grounding** — для top-3 дней нарратив **упоминает астрологические сущности** из `ephemeris_snapshot`: planet name, sign, или предикат-keyword. Прокси на «не generic-чушь». Реализация: regex-keywords + spaCy для словоформ.

Все три добавляются в `metrics.ts`, репортятся в Markdown-отчёте после `npm run eval`.

### Adversarial-набор (после реализации)

Из обсуждения — зеркальные пары и polarity-кейсы:

```yaml
- id: project_start_vs_completion
  pair: [start a new project, finish existing project]
  expected_diff:
    - moon_waxing weight should differ in sign
    - mercury_retrograde dq should differ
- id: home_inspection_revisit
  prompt: "поездка на дачу проверить как там после зимы"
  expected:
    not_must_disqualify: [planet_retrograde:Mercury]
    must_have_some_of: [moon_in_sign[earth], moon_waning, planet_dignified:Saturn]
- id: dacha_vibes_make_sense
  prompt: same
  expected:
    vibes_count: [3, 5]
    vibes_labels_match_at_least_one: ['уборк|ревизи|возвращ|ностальг|зелен|хозяй']
```

Этот блок (5-8 кейсов) пишется как первый customer фичи после реализации. До тех пор — eval запускается на текущих 5 + новые vibe-метрики.

### Версионирование

- `SCHEMA_VERSION`: `1.0.0` → `1.1.0`
- `prompt_template_version`: `recipe.v1` → `recipe.v2` (с vibes-инструкцией) и новый `narratives.v1`
- `predicate_engine_version`, `scoring_engine_version` — без изменений

### Миграция trace-записей

Старые traces в JSONL имеют `schema_version: 1.0.0` и без `vibes`/`narratives`. Миграция:

- `TraceStore.findById` парсит обе версии. Для `1.0.x` — `vibes = []`, `narratives = {}` подставляются дефолтами. Phase 1 ничего больше не требует.
- Debug UI (когда появится) — для старых traces показывает `«— legacy trace, vibes were not generated»`.
- Phase 2 (Postgres JSONB) — добавляются nullable JSONB колонки, без backfill.

### Метрики и алерты

- **Latency**: новая стадия `renderNarratives` — бюджет p95 < 4 сек на топ-10 дней. Trace пишет `total_latency_ms`, при превышении 6 сек — warning лог.
- **LLM-cost**: trace уже пишет `cost_usd` per stage. Sum по стадиям → дневной отчёт через агрегацию JSONL. На NIM это ноль; на платной модели — валидируем бюджет.
- **Cache hit rate**: `recipe-cache-hit / total-requests` и то же для narratives. Если hit rate < 30% — кэш не работает (плохой ключ или TTL).
- **Conversion funnel** натал-CTA: `cta_shown → cta_clicked → natal_saved → v2_returned_with_natal`. Опционально для MVP.

### Rollout

- **Без feature-flag.** Фронт-код деплоится одновременно с бэком (один pull на сервере). API-контракт обратно-совместим: старые клиенты, не запрашивающие нарративы, продолжают работать.
- Опциональный страховочный шаг: первая итерация за `?vibes=on` query-флагом, отлоадить пару дней, потом снять флаг. 5 минут работы и страховка от больших косяков.

## Рекомендуемое фазирование реализации

Этот spec покрывает один цельный feature, но имплементация удобно разбивается на 4 фазы. Каждая независимо ценна — можно деплоить и пользоваться частично.

- **Фаза A — backend foundation.** Расширение DSL (`vibes`), модификация `recipe.v1.md` → `recipe.v2.md` с few-shot vibes, реализация `renderNarratives` стадии, новый `narratives.v1.md`, расширение API. После A: API возвращает vibes + narratives, но фронт ими не пользуется. Тесты бэкенда покрывают этот слой.
- **Фаза B — frontend layout split.** Переработка `OptimalTimingV2.tsx` под split-pane, новые `WindowListItem`, `DayDetailPanel`, `VibeTabSwitcher`, `NarrativeBlock`. Колесо в этом этапе — текущий transit-only `ZodiacWheel` без модификаций. После B: пользователь видит vibes и нарративы, но колесо одинарное.
- **Фаза C — biwheel в ZodiacWheel.** Расширение компонента под `innerData` prop, аспекты транзит↔натал, темизация для слоистого режима. Без `userChartStore` пока — натал передаётся через тестовый prop. Storybook-сторий покрывают визуальные кейсы.
- **Фаза D — natal store + CTA + конверсия.** `userChartStore`, `NatalChartCTA`, integration с `/natal-chart` страницей через query-параметры, edge cases (404, удалённая карта). После D: feature полностью на месте.

Eval-расширение (vibe-coverage, vibe-stability, narrative-grounding) и adversarial-набор пишутся параллельно фазам A-D как отдельная work-stream — могут идти после, до, или вместе.

## Out of scope

- **Личные нарративы без натала.** В этом релизе нарратив с упоминанием натальных планет требует загруженного натала. Не делаем «угадывать натал по интенту» или «частичный натал по дате рождения».
- **Сохранение пользовательских правок нарративов.** Юзер не может править текст вайба и сохранять — это feedback-цикл следующего релиза.
- **Сравнение двух дней рядом.** Один день за раз в DayDetailPanel. Side-by-side comparison — отдельная фича.
- **Vibe-фильтр ранжирования** (вариант C из обсуждения «vibe = pre-filter»). Если станет ясно, что юзеры активно меняют вайб как фильтр — рассматриваем после телеметрии.
- **Личные нарративы для гостей** через quick-natal по форме без сохранения. Возможный upsell после MVP.

## Открытые вопросы

Нет — все ключевые развилки закрыты в брейншторме.

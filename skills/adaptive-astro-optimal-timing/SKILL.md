---
name: adaptive-astro-optimal-timing
description: "Hybrid astrological day picker for real tasks: Docker stack (ephemeris + optimal-timing v2) OR existing local API. WHEN: when to sign, launch, travel, negotiate, schedule important work; best days in a date range; astro slots for a todo. WHEN NOT: natal chart drawing, medical/legal advice, horoscope fluff without calculation — never guess dates. Agent runs scripts only; LLM explains API output."
metadata:
  version: "1.3.0"
  author: "Eduard Dubnitsky"
  license: "MIT"
  homepage: "https://github.com/thelonius/adaptive-astro-scheduler"
---

# Adaptive Astro — hybrid optimal timing

**Гибрид:** язык и объяснения — **агент (LLM)**; небо, правила, баллы — **локальный API** (ephemeris + v2). Без успешного `health` даты **не придумывать**.

| В zip | Роль |
|-------|------|
| `stack/docker-compose.yml` | Postgres, Redis, ephemeris, backend (ghcr images) |
| `scripts/stack-up.sh` / `stack-down.sh` | Подъём стека на машине покупателя |
| `scripts/plan_best_days.py` | Планирование: `health`, `recipes`, `recipe`, `intent` |
| `scripts/task_planner.py` | Задачи: add → schedule → outcome (+ `request_id` trace) |

Детали архитектуры: `reference/architecture.md`. Режимы n150 vs новая машина: `reference/modes.md`.

## Prerequisites

- **python3** (stdlib в скриптах)
- **Docker Compose v2** — только если API ещё нет (Mode B)
- **~2 GB RAM** — для четырёх контейнеров
- Опционально: **`NVIDIA_API_KEY`** в `stack/.env` — режим `intent` на backend

## Phase 0 — Environment

```bash
SKILL_ROOT=<directory of this SKILL.md>
export ASTRO_LAT=${ASTRO_LAT:-55.7558}
export ASTRO_LON=${ASTRO_LON:-37.6173}
export ASTRO_TZ=${ASTRO_TZ:-Europe/Moscow}
export ASTRO_API_URL=${ASTRO_API_URL:-http://127.0.0.1:3000}
```

## Phase 1 — Bootstrap

1. `python3 $SKILL_ROOT/scripts/plan_best_days.py health`
2. Если **healthy** → Phase 2 (Docker **не** трогать — типичный n150 / уже поднятый VPS).
3. Если недоступен → `bash $SKILL_ROOT/scripts/stack-up.sh`, снова `health`.
4. При ошибке — смотреть логи compose; **не** отвечать датами из модели.

```bash
python3 $SKILL_ROOT/scripts/plan_best_days.py recipes   # canonical ids
```

## Phase 2 — Plan (обязательно для «когда лучше»)

Выбор режима (см. `reference/modes.md`):

```bash
PY=python3

# Детерминированно, без LLM на сервере (по умолчанию)
$PY $SKILL_ROOT/scripts/plan_best_days.py recipe mercury_matters \
  --from 2026-11-01 --to 2026-11-30 --top 5 --prompt "sign lease"

# Свободный текст — только если backend реально поддерживает intent (NVIDIA_API_KEY)
$PY $SKILL_ROOT/scripts/plan_best_days.py intent \
  "sign a rental lease" --from 2026-11-01 --to 2026-11-30 --top 5
```

Агент после вывода скрипта:

- Даёт **3–5 дат** из `windows`, score, луну, краткий summary API.
- Упоминает дисквалификации, если есть в ответе/summary.
- Дисклеймер: не юридическая/медицинская консультация.

## Phase 3 — Remember (опционально, как бот на n150)

По желанию пользователя — завести дело и привязать слоты:

```bash
$PY $SKILL_ROOT/scripts/task_planner.py add "Подписать договор" --astro \
  --recipe mercury_matters --from 2026-11-01 --to 2026-11-30

$PY $SKILL_ROOT/scripts/task_planner.py schedule "договор" --date 2026-11-18
$PY $SKILL_ROOT/scripts/task_planner.py outcome "договор" --rating 4 --comment "гладко"
$PY $SKILL_ROOT/scripts/task_planner.py list
$PY $SKILL_ROOT/scripts/task_planner.py recap
$PY $SKILL_ROOT/scripts/task_planner.py context   # JSON перед новым планом
$PY $SKILL_ROOT/scripts/task_planner.py history --json
```

Хранение: `memory/astro_planner.db` (SQLite) + `astro_todos.md`; legacy JSON мигрируется автоматически.
Перед **Phase 2** агент **должен** выполнить `context` и не дублировать уже `scheduled` дела без причины.

Workspace: `ASTRO_AGENT_WORKSPACE` или `OPENCLAW_WORKSPACE` → `.../memory/`.

## Phase 4 — Agent rules (hybrid)

1. **Скрипт → JSON → ответ.** Цифры и даты только из API/CLI.
2. **Recipe first:** договор/аренда → `mercury_matters`; неясно без NVIDIA → спросить и `recipes`, не `intent`.
3. **Локация:** нет города — использовать env или спросить; перед планом зафиксировать lat/lon/tz.
4. **Корпус** (`/api/corpus/*`) в zip **не** входит; v2 тайминг без него работает.
5. **Teardown:** `stack-down.sh` только по запросу пользователя (не на shared prod API).

## Teardown (local Docker only)

```bash
$SKILL_ROOT/scripts/stack-down.sh
```

## Smoke / regression (maintainers)

Из корня репозитория:

```bash
./scripts/test-agensi-skill.sh
# полный stack на Mac:
./scripts/test-agensi-skill.sh --boot
# прод n150 через tunnel:
ssh -f -N -L 3999:127.0.0.1:3000 -p 22299 -i ... developer@95.165.10.115
ASTRO_API_URL=http://127.0.0.1:3999 ./scripts/test-agensi-skill.sh
```

## Marketplace

Zip = compose + образы + CLI. Не обещать hosted SaaS. Opt-in telemetry — отдельно, off by default.

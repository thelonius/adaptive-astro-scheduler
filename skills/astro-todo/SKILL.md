---
name: astro-todo
description: "Планирование дел с астро-календарём через Optimal Timing v2. WHEN: добавь задачу, когда лучше сделать, запланируй дело, астро-слоты, выбери дату, как прошло, рекап, todo с астрологией. НЕ читай исходники — только скрипт astro_todos.py."
metadata:
  version: "1.0.0"
---

# Astro To-Do

Связка личных дел и астро-планировщика Adaptive Astro-Scheduler.

## Workflow

1. **add** (+ `--astro`) → API возвращает топ слотов за период
2. **schedule** → пользователь выбирает дату
3. **outcome** → рекап 1–5 после события

Не путать с `todo-manager` (вакансии/ATS).

## Команды

```bash
ASTRO_SCRIPT=~/apps/astro/skills/astro-todo/astro_todos.py

# Добавить + слоты (LLM)
python3 $ASTRO_SCRIPT add "Подписать договор" --astro \
  --intent "подписать договор аренды" --from 2026-10-01 --to 2026-10-31

# Быстро без LLM (договоры → mercury_matters)
python3 $ASTRO_SCRIPT add "Подписать договор" --astro --recipe mercury_matters \
  --from 2026-10-01 --to 2026-10-31

python3 $ASTRO_SCRIPT schedule "договор" --date 2026-10-12
python3 $ASTRO_SCRIPT outcome "договор" --rating 4 --comment "гладко"
python3 $ASTRO_SCRIPT list
python3 $ASTRO_SCRIPT recap
```

## API

- `POST /api/optimal-timing/v2/find-with-intent`
- `POST /api/optimal-timing/v2/find-with-fixed-recipe`

`ASTRO_API_URL` default: `http://127.0.0.1:3000`

## Хранение

- `~/.openclaw/workspace/memory/astro_todos.json`
- `~/.openclaw/workspace/memory/astro_todos.md`

Рекап хранит `request_id` trace планировщика для будущей аналитики.

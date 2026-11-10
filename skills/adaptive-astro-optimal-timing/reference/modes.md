# Режимы: Agensi vs API already up (n150)

Один skill zip, два сценария подключения. Поведение агента одинаковое после фазы **Bootstrap**.

## Mode A — «API уже есть» (OpenClaw на n150, свой VPS)

- `ASTRO_API_URL` указывает на живой backend (у вас: `http://127.0.0.1:3000` на сервере).
- **Не** запускать `stack-up.sh` и не трогать Docker, если `health` успешен.
- Память задач: предпочтительно `OPENCLAW_WORKSPACE=...` → файлы `memory/astro_todos.json` (как `skills/astro-todo/astro_todos.py`).
- На n150 можно вызывать **тот же** `task_planner.py` из skill zip или `skills/astro-todo/astro_todos.py` — один контракт API.

## Mode B — «Чистая машина» (типичный покупатель Agensi)

- Сначала `scripts/stack-up.sh` (compose: postgres, redis, ephemeris, backend).
- `ASTRO_API_URL=http://127.0.0.1:3000` после подъёма.
- Память: `~/.agent/adaptive-astro-workspace/memory/` (или `ASTRO_AGENT_WORKSPACE`).

## Общий гибрид

| Слой | Кто |
|------|-----|
| Диалог, уточнения, объяснение окон | LLM агента |
| Даты, score, луна, trace | `plan_best_days.py` → v2 API → ephemeris |
| Задача + выбранная дата + рекап | `task_planner.py` (опционально) |

## Выбор recipe vs intent

| Ситуация | Режим |
|----------|--------|
| Договор, аренда, почта, переговоры | `recipe mercury_matters` |
| Запуск, публичный старт | `business_launch` |
| Суд/конфликт/операция | `mars_matters` (осторожно в copy) |
| Брак, серьёзные отношения | `marriage_relationship` |
| Рост, обучение, расширение | `jupiter_matters` |
| Неясный запрос, смешанный контекст | `intent "..."` только если на сервере задан `NVIDIA_API_KEY` |

Без ключа NVIDIA: **не** вызывать `intent`; уточнить у пользователя и сопоставить с canonical recipe (`plan_best_days.py recipes`).

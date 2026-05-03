# Adaptive Astro Scheduler — заметки для Claude

## Прод

- Хост: `user1@176.123.166.252`, репо в `/home/user1/apps/adaptive-astro-scheduler`
- Стек: docker compose из `docker/docker-compose.yml` (backend, frontend, ephemeris, postgres, redis)
- Health: `http://176.123.166.252:3000/health`, фронт `http://176.123.166.252/`

### SSH-доступ — read-only

Допустимо: `docker ps`, `docker logs`, `git status/log`, `curl /health`, `ss -tlnp`, чтение файлов. **Запрещено**: редактировать файлы на сервере (`vim`, `sed -i`, `echo >`, `rm`, `git checkout`, `docker exec ... sh` с правкой). Любой фикс — локально → коммит → пуш → деплой. Даже если горит.

Причина — прошлые правки напрямую на проде оставили рабочее дерево с ~100 модифицированными файлами и кучей untracked, что блокирует обычный деплой и убивает воспроизводимость.

### Деплой

- **Правильно**: GitHub Actions `workflow_dispatch` (deploy.yml, добавлен в PR #7) — делает `git pull` на сервере и пересобирает контейнеры
- **Не использовать**: `deploy-full.sh` — он rsync'ит локальное рабочее дерево (включая незакоммиченное) и поощряет тот же anti-pattern, что и правки на сервере. Считать deprecated

### Известные проблемы прода (на момент 2026-05-02)

1. **Грязное рабочее дерево**: ~100 modified + untracked файлов на сервере, удалена `AstroClock/`. Перед следующим деплоем нужно либо разобрать и закоммитить нужное, либо `git reset --hard origin/main` (с потерей)
2. **nginx → backend port mismatch**: [docker/nginx.conf](docker/nginx.conf) проксирует `/api` и `/webhook` на `backend:3001`, контейнер слушает `3000` → все запросы через фронт получают 502. Прямой `:3000` работает
3. **Telegram-бот не работает**: из RU-хоста заблокирован `api.telegram.org` (ETIMEDOUT). Нужен прокси или вынос на не-RU хост

## Локальная разработка

- Workspaces: `backend/`, `frontend/`, `shared/`. Ephemeris API — отдельный Python-сервис в `lunar-calendar-api/`
- Старт: `npm run dev` (через `dev-start.sh` поднимает инфру в docker, потом backend+frontend локально)
- Backend dev port: **3001** (`PORT=3001 npm run dev`), prod port: **3000**

## Стиль

- Русский — без AI-клише (см. глобальный `~/.claude/CLAUDE.md`): никаких «не X — Y», стаккато-триад, мистических афоризмов, em-dash как основного ритма
- Комментарии в коде — только когда объясняют *почему*, не *что*

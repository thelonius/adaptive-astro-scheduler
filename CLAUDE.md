# Adaptive Astro Scheduler — заметки для Claude

## Прод

- Хост: `root@31.130.130.11` (Timeweb, Амстердам), репо в `/root/adaptive-astro-scheduler`, ключ `~/.ssh/cesium_replica_key`
- Стек: `docker/docker-compose.prod.yml` (backend, frontend, ephemeris, postgres, redis)
- Публичный адрес: `https://astro-31-130-130-11.sslip.io:4443`, health — `/api/health`

Старый хост `user1@176.123.166.252` больше не используется: астро-стек оттуда удалён (2026-07, ни контейнеров, ни volume'ов), на боксе остались чужие сервисы.

### Сервер общий

На `31.130.130.11` кроме астро живут ssd-radar, gpx-tracker, 3x-ui, shadowbox (Outline VPN), prometheus, zabbix-agent и pm2 с cesium-route-renderer. Отсюда все ограничения:

- **Порты**: заняты 80 и 4443 (ssd_radar_caddy), 443 (gpx-tracker-caddy), 8443 и 2053 (3x-ui), 3000/3002/3003/25880 (pm2). Астро не публикует наружу ничего
- **Память**: 2 ГБ на весь бокс. У каждого сервиса в prod-compose стоит `mem_limit`, суммарно ~912 МБ. Менять их вверх — только вместе с swap
- **TLS**: астро проксируется через `ssd_radar_caddy` (site-блок в `~/ssd/deploy/Caddyfile`), а не своим Caddy: ACME HTTP-01 требует порт 80, которым тот владеет. Связь через внешнюю docker-сеть `astro_edge`
- `docker image prune` **только без `-a`**: `-a` снесёт слои соседних стеков

### SSH-доступ — read-only

Допустимо: `docker ps`, `docker logs`, `git status/log`, `curl /health`, `ss -tlnp`, чтение файлов. **Запрещено**: редактировать файлы на сервере (`vim`, `sed -i`, `echo >`, `rm`, `git checkout`, `docker exec ... sh` с правкой). Любой фикс — локально → коммит → пуш → деплой. Даже если горит.

Причина — прошлые правки напрямую на проде оставили рабочее дерево с ~100 модифицированными файлами и кучей untracked, что блокирует обычный деплой и убивает воспроизводимость.

### Деплой

- **Правильно**: GitHub Actions (deploy.yml). Образы собираются в CI и пушатся в `ghcr.io/thelonius/adaptive-astro-scheduler/{backend,frontend,ephemeris}`, сервер только делает `pull`. Собирать на сервере нельзя: двух ядер и ~900 МБ свободной памяти на vite не хватает
- `VITE_API_URL` запекается в бандл на этапе сборки, поэтому публичный адрес задаётся переменной репозитория `ASTRO_PUBLIC_URL`, а не в рантайме
- **Не использовать**: `deploy-full.sh` — он rsync'ит локальное рабочее дерево (включая незакоммиченное) и поощряет тот же anti-pattern, что и правки на сервере. Считать deprecated

### Секреты

Токен бота утёк через публичный репозиторий (лежал в открытом виде с 26.01.2026 по 25.07.2026, бота угнали) и отозван. Никаких секретов в compose, k8s-манифестах и скриптах: только `${VAR}` из `.env`, который пишет deploy-workflow из GitHub secrets — `TELEGRAM_BOT_TOKEN`, `POSTGRES_PASSWORD`, `NVIDIA_API_KEY`.

## Локальная разработка

- Workspaces: `backend/`, `frontend/`, `shared/`. Ephemeris API — отдельный Python-сервис в `lunar-calendar-api/`
- Старт: `npm run dev` (через `dev-start.sh` поднимает инфру в docker, потом backend+frontend локально)
- Backend dev port: **3001** (`PORT=3001 npm run dev`), prod port: **3000**

## Стиль

- Русский — без AI-клише (см. глобальный `~/.claude/CLAUDE.md`): никаких «не X — Y», стаккато-триад, мистических афоризмов, em-dash как основного ритма
- Комментарии в коде — только когда объясняют *почему*, не *что*

# Adaptive Astro Scheduler — заметки для Claude

## Прод

Два хоста. **OpenClaw и API-инструменты — n150**, веб-морда — Амстердам.

### n150 / Mattahu (API для openclaw) — основной для агента

- **SSH**: `developer@95.165.10.115`, порт **22299**
- **Ключ**: `~/.ssh/id_ed25519_n150_server2_developer` (Windows: `%USERPROFILE%\.ssh\id_ed25519_n150_server2_developer`)
- **Чекout**: `~/apps/astro`, compose — [docker/docker-compose.n150.yml](docker/docker-compose.n150.yml)
- **API**: `http://127.0.0.1:3000` на loopback (openclaw с той же машины). Frontend нет
- **Деплой**: `./scripts/deploy-n150.sh` или вручную `pull` + `up` по [docker/.env.n150.example](docker/.env.n150.example). CI (`deploy.yml`) сюда **не** ходит
- **Образы**: `ghcr.io/thelonius/adaptive-astro-scheduler/{backend,ephemeris}:<git-sha>`
- **SearXNG**: `http://127.0.0.1:8888` loopback (OpenClaw на n150); клиенты: SSH-туннель `:8888` или LAN `http://192.168.1.86:8890` (Basic Auth). [docker/searxng/REMOTE_ACCESS.md](docker/searxng/REMOTE_ACCESS.md), деплой: `./scripts/deploy-searxng-n150.sh`, туннель: `./scripts/searxng-tunnel-mac.sh`, скилл: [skills/websearch/](skills/websearch/)
- **VLESS-прокси** (Claude / OpenClaw → интернет): локально `http://127.0.0.1:7890`. Конфиг: [docker/sing-box-proxy/](docker/sing-box-proxy/), секрет `VLESS_URI` в `.env`, деплой: `./scripts/deploy-sing-box-n150.sh`. Запуск Claude: `scripts/claude-n150.sh`
- **Вход Claude на n150** (без браузера на сервере): с Mac `./scripts/n150-claude-auth-from-mac.sh` — ссылку открыть на Mac/телефоне, подтвердить email. OpenClaw: `scripts/openclaw-auth-n150.sh` (device code). Опционально Chromium: `./scripts/install-browser-n150.sh`

```bash
ssh -i ~/.ssh/id_ed25519_n150_server2_developer -p 22299 developer@95.165.10.115
cd ~/apps/astro && docker compose -f docker/docker-compose.n150.yml ps
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:8888/healthz
python3 ~/.agents/skills/websearch/search.py search "тест" -n 3
```

### Амстердам (веб + полный стек)

- Хост: `root@31.130.130.11` (Timeweb), репо в `/root/adaptive-astro-scheduler`, ключ `~/.ssh/cesium_replica_key`
- Стек: `docker/docker-compose.prod.yml` (backend, frontend, ephemeris, postgres, redis)
- Публичный адрес: `https://astro-31-130-130-11.sslip.io:4443`, health — `/health` (отдельный `location` в [docker/nginx.conf](docker/nginx.conf), иначе путь уходит в SPA-fallback)
- Деплой: GitHub Actions [deploy.yml](.github/workflows/deploy.yml) (сейчас SSH на этот хост часто недоступен из CI)

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

## Клиенты вне веба

- `AstroClock/` — часы на ESP32-C3 с круглым GC9A01. Эфемериды считаются на устройстве, сети не требуют
- `mobile/` — Flutter-приложение под Android и iOS. Ядро расчётов это порт `AstroClock/src/*.h` на Dart, сверенный с прошивкой побитово и со swisseph (`mobile/tool/compare_port.py`). Сеть нужна только толкованиям, слой источников устроен так, чтобы её отсутствие убирало тексты, а не ломало экран

Правя `AstroClock/src/ephemeris.h`, `transits.h`, `lunar*.h` или `palette.h`, надо править и `mobile/lib/core/ephemeris/`: это один алгоритм в двух записях, и `mobile/tool/compare_port.py` расхождение поймает.

### BLE-пейринг часов с приложением

Канал связи телефон↔часы — `AstroClock/src/ble.h` (NimBLE) + `mobile/lib/state/device_controller.dart`, протокол в [AstroClock/docs/ble-protocol.md](AstroClock/docs/ble-protocol.md). Этап 1 (пейринг, вкл/выкл WiFi на часах) реализован и закоммичен, но не проверен на живом железе — статус и чек-лист см. [docs/superpowers/plans/2026-08-20-astroclock-ble-pairing-status.md](docs/superpowers/plans/2026-08-20-astroclock-ble-pairing-status.md). Загрузка натальных карт и конфигурация быстрого доступа на часах — следующие этапы, ещё не начаты.

### Глифы на круглом экране

Всё символьное на 240×240 рисуется растром 13×13 из `AstroClock/src/glyphs.h`, а не примитивами `drawCircle`/`drawLine`/`drawArc`. Отрисовка дугами на этом размере уже дважды подводила: знаки зодиака читались плохо, а у планет Меркурий выходил неотличим от Венеры (рожки в дугу не укладывались, оставался тот же кружок с крестом) и крюк Сатурна заворачивался в букву «J».

Начертания берутся с юникодных ☉☽☿♀♂♃♄⛢♆♇ — тех же, что в вебе (`frontend/src/components/ZodiacWheel/utils.ts`, `getPlanetSymbol`). Веб остаётся эталоном: расходиться символам двух клиентов незачем.

Одно тело — один растр на всех кольцах. Транзитное и натальное кольцо различаются только яркостью, не начертанием. Исключение — Луна: у неё два глифа, серп поворачивается по фазе.

Сторона лунного серпа берётся из `moonWaxing()` (элонгация), а не из `moonIllumination()`. Освещённость 0.5 бывает и в первой четверти, и в последней, поэтому по ней глиф угадывает сторону лишь в половине цикла. Ошибка тихая: половину месяца картинка верная.

Приглушать глиф ниже трёх пятых нельзя. На двух пятых Меркурий и Сатурн давали `0x3131`, почти чёрное на чёрном, детали начертания пропадали и глиф превращался в пятно. Если поверх ложится ещё одно затухание (разведение наложившихся глифов в `collide.h`), нижний предел считать по произведению, а не по каждому множителю отдельно.

## Стиль

- Русский — без AI-клише (см. глобальный `~/.claude/CLAUDE.md`): никаких «не X — Y», стаккато-триад, мистических афоризмов, em-dash как основного ритма
- Комментарии в коде — только когда объясняют *почему*, не *что*

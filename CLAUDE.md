# Adaptive Astro Scheduler — заметки для Claude

## Прод

**Единственный прод — n150 (Mattahu).** OpenClaw, API, Postgres с **корпусом текстов**, ephemeris. Публичная веб-морда **отключена** (устарела); `frontend` в CI собирается «на будущее», на n150 не поднимается.

### n150 / Mattahu

- **SSH**: `developer@95.165.10.115`, порт **22299**
- **Ключ**: `~/.ssh/id_ed25519_n150_server2_developer` (Windows: `%USERPROFILE%\.ssh\id_ed25519_n150_server2_developer`)
- **Чекout**: `~/apps/astro`, compose — [docker/docker-compose.n150.yml](docker/docker-compose.n150.yml)
- **API**: `http://127.0.0.1:3000` на loopback (openclaw с той же машины). Frontend нет
- **Корпус**: таблица `corpus_interpretations` в Postgres (`~35k+` записей из `zet/corpus.jsonl`). API: `/api/corpus/*`. Данные живут в docker-volume `postgres_data`; в образ бэкенда не входят. Пустая БД: миграции (entrypoint) → `python3 -m scripts.ml.load_corpus` с Mac через SSH-туннель к Postgres (см. выше в сессии) или скрипт на будущее. Локальный источник: `zet/corpus.jsonl` в репо, не в git (пересбор из `zet/Txt4.rar`)
- **Деплой**: `./scripts/deploy-n150.sh` или CI [deploy.yml](.github/workflows/deploy.yml) → n150 после build
- **Образы**: `ghcr.io/thelonius/adaptive-astro-scheduler/{backend,ephemeris}:<git-sha>`
- **SearXNG**: `http://127.0.0.1:8888` loopback (OpenClaw на n150); клиенты: SSH-туннель `:8888` или LAN `http://192.168.1.86:8890` (Basic Auth). [docker/searxng/REMOTE_ACCESS.md](docker/searxng/REMOTE_ACCESS.md), деплой: `./scripts/deploy-searxng-n150.sh`, туннель: `./scripts/searxng-tunnel-mac.sh`, скилл: [skills/websearch/](skills/websearch/)
- **VLESS-прокси** (Claude / OpenClaw → интернет): локально `http://127.0.0.1:7890`. Конфиг: [docker/sing-box-proxy/](docker/sing-box-proxy/), секрет `VLESS_URI` в `.env`, деплой: `./scripts/deploy-sing-box-n150.sh`. Запуск Claude: `scripts/claude-n150.sh`
- **Вход Claude на n150** (без браузера на сервере): с Mac `./scripts/n150-claude-auth-from-mac.sh` — ссылку открыть на Mac/телефоне, подтвердить email. OpenClaw Anthropic OAuth: `scripts/openclaw-auth-n150.sh`. AIvex (ключ): `OPENCLAW_API_KEY=... ./scripts/openclaw-aivex-n150.sh` (`https://api.aivex.work/v1`). Статус OpenClaw: `./scripts/openclaw-status-n150.sh`. Опционально Chromium: `./scripts/install-browser-n150.sh`
- **Oh My Pi (omp)**: установка `./scripts/install-omp-n150.sh`, запуск с Mac `./scripts/omp-n150.sh`, на сервере `./scripts/omp-server.sh`. Auth: `./scripts/omp-auth-n150.sh`. Рядом с OpenClaw, тот же sing-box :7890.

```bash
ssh -i ~/.ssh/id_ed25519_n150_server2_developer -p 22299 developer@95.165.10.115
cd ~/apps/astro && docker compose -f docker/docker-compose.n150.yml ps
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/api/corpus/stats
curl -s http://127.0.0.1:8888/healthz
python3 ~/.agents/skills/websearch/search.py search "тест" -n 3
```

### Архив: Амстердам и старый VPS

Веб-стек (`docker-compose.prod.yml`, `31.130.130.11`, sslip.io:4443) и `176.123.166.252` **не прод**. Астро там не держим, пока морда снова не понадобится. Описание портов/лимитов Timeweb — в git-истории `CLAUDE.md` и `docker/docker-compose.prod.yml`.

### SSH-доступ — read-only

Допустимо: `docker ps`, `docker logs`, `git status/log`, `curl /health`, `ss -tlnp`, чтение файлов. **Запрещено**: редактировать файлы на сервере (`vim`, `sed -i`, `echo >`, `rm`, `git checkout`, `docker exec ... sh` с правкой). Любой фикс — локально → коммит → пуш → деплой. Даже если горит.

Причина — прошлые правки напрямую на проде оставили рабочее дерево с ~100 модифицированными файлами и кучей untracked, что блокирует обычный деплой и убивает воспроизводимость.

### Деплой

- **Прод**: push в `main` → CI build образов в ghcr → `deploy.yml` на **n150** (`./scripts/deploy-n150.sh` с Mac — то же). Backend стартует с миграциями (entrypoint)
- **Корпус после нового тома Postgres**: `./scripts/load-corpus-n150.sh` (или `scripts/ml/load_corpus.py`); деплой образов корпус не заливает
- **Не использовать**: `deploy-full.sh` — deprecated

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

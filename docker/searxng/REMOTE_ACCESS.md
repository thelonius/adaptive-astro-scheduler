# SearXNG на n150 — доступ с другого клиента

Краткая шпаргалка. Файл в репо: `docker/searxng/REMOTE_ACCESS.md`

## Суть

- Инстанс: **n150** (`developer@95.165.10.115:22299`)
- На сервере SearXNG слушает **только** `127.0.0.1:8888` (loopback)
- В интернет и в LAN **не открыт** — так и должно быть (чужой сервер Mattahu)
- **OpenClaw / Claude на n150** ходят сами, туннель не нужен
- **Mac / другой ПК** — только через **SSH-туннель**

---

## Быстрый туннель с Mac

Отдельный терминал, пока работаете:

```bash
ssh -N -L 8888:127.0.0.1:8888 \
  -i ~/.ssh/id_ed25519_n150_server2_developer \
  -p 22299 developer@95.165.10.115
```

Или из репо:

```bash
./scripts/searxng-tunnel-mac.sh
```

Проверка:

```bash
curl -s http://127.0.0.1:8888/healthz
curl -s "http://127.0.0.1:8888/search?q=test&format=json" | head -c 200
```

Браузер: **http://127.0.0.1:8888**

---

## Постоянно: `~/.ssh/config`

```sshconfig
Host n150
  HostName 95.165.10.115
  Port 22299
  User developer
  IdentityFile ~/.ssh/id_ed25519_n150_server2_developer
  ServerAliveInterval 60
  LocalForward 8888 127.0.0.1:8888
  LocalForward 18789 127.0.0.1:18789
```

`ssh n150` — туннели поднимаются сами. Закрыли SSH — с Mac SearXNG снова недоступен.

---

## Скилл websearch с Mac

1. Скопировать с сервера (один раз):

```bash
mkdir -p ~/.agents/skills
scp -r -P 22299 -i ~/.ssh/id_ed25519_n150_server2_developer \
  developer@95.165.10.115:~/.agents/skills/websearch \
  ~/.agents/skills/
```

2. Держать туннель (см. выше).

3. Поиск:

```bash
export SEARXNG_URL=http://127.0.0.1:8888   # уже дефолт в скрипте
python3 ~/.agents/skills/websearch/search.py search "запрос" -n 5
python3 ~/.agents/skills/websearch/search.py fetch "https://example.com"
```

`search` — через SearXNG (нужен туннель).  
`fetch` — напрямую в интернет с вашего Mac, не через SearXNG.

---

## HTTP API (любой клиент)

При открытом туннеле:

```http
GET http://127.0.0.1:8888/search?q=запрос&format=json&categories=general
```

Параметры: `q`, `format=json`, `categories`, `language`.

---

## Кто куда ходит

| Клиент | URL | Туннель |
|--------|-----|---------|
| OpenClaw на n150 | `http://127.0.0.1:8888` | нет |
| Claude Code на n150 | тот же + скилл websearch | нет |
| Mac / Cursor / браузер | `http://127.0.0.1:8888` после SSH | **да** |

---

## Чего не делать

- Не публиковать `8888` на `0.0.0.0` / в интернет
- Не открывать порт на роутере без auth — нагрузка и злоупотребления

Если нужен доступ без ручного SSH: `autossh` с тем же LocalForward, или VPN в сеть Mattahu + ssh на n150.

---

## На сервере (обслуживание)

```bash
cd ~/apps/astro
./scripts/deploy-searxng-n150.sh
docker logs -f openclaw_searxng
curl -s http://127.0.0.1:8888/healthz
```

Конфиг: `docker/searxng/`, контейнер `openclaw_searxng`.

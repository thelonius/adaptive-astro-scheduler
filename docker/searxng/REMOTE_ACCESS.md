# SearXNG на n150 — доступ с разных клиентов

Сервер: **n150** (`95.165.10.115:22299`, LAN `192.168.1.86`).

Три способа подключения — выбирайте по ситуации.

---

## Способ 1 — на самом n150 (OpenClaw, Claude на сервере)

**URL:** `http://127.0.0.1:8888`  
**Туннель / пароль:** не нужны

```bash
curl -s http://127.0.0.1:8888/healthz
python3 ~/.agents/skills/websearch/search.py search "тест"
```

---

## Способ 2 — SSH-туннель (из интернета, без открытия портов)

Подходит: Mac, Cursor, Termux на телефоне, любой ПК с SSH-ключом.

```bash
ssh -N -L 8888:127.0.0.1:8888 \
  -i ~/.ssh/id_ed25519_n150_server2_developer \
  -p 22299 developer@95.165.10.115
```

Или: `./scripts/searxng-tunnel-mac.sh`

**Клиент видит:** `http://127.0.0.1:8888`

```bash
export SEARXNG_URL=http://127.0.0.1:8888
python3 skills/websearch/search.py search "запрос" -n 5
```

В `~/.ssh/config`:

```sshconfig
Host n150
  HostName 95.165.10.115
  Port 22299
  User developer
  IdentityFile ~/.ssh/id_ed25519_n150_server2_developer
  LocalForward 8888 127.0.0.1:8888
```

---

## Способ 3 — HTTP с паролем (несколько клиентов без SSH)

Подходит: Mac, телефон, Cursor **в домашней сети Mattahu** или через **VPN в 192.168.1.x**.

На сервере один раз:

```bash
cd ~/apps/astro/docker/searxng
# в .env добавить:
#   SEARXNG_CLIENT_BIND=192.168.1.86:8890
#   SEARXNG_CLIENT_USER=search
#   SEARXNG_CLIENT_PASSWORD=ваш_длинный_пароль
./init-clients.sh
docker compose -f docker-compose.yml --profile clients up -d
```

**Клиенты подключаются к:**

| Параметр | Значение |
|----------|----------|
| URL | `http://192.168.1.86:8890` |
| Логин | из `SEARXNG_CLIENT_USER` |
| Пароль | из `SEARXNG_CLIENT_PASSWORD` |

### Mac / Linux / Termux

```bash
export SEARXNG_URL=http://192.168.1.86:8890
export SEARXNG_USER=search
export SEARXNG_PASSWORD=ваш_пароль

curl -u "$SEARXNG_USER:$SEARXNG_PASSWORD" http://192.168.1.86:8890/healthz
python3 skills/websearch/search.py search "тест" -n 3
```

### Cursor / агенты

В `~/.zshrc` или `.env` проекта:

```bash
export SEARXNG_URL=http://192.168.1.86:8890
export SEARXNG_USER=search
export SEARXNG_PASSWORD=ваш_пароль
```

Скилл: скопировать `skills/websearch/` из репо или с n150.

### Браузер

`http://192.168.1.86:8890` — запросит логин/пароль.

### HTTP API

```http
GET http://192.168.1.86:8890/search?q=запрос&format=json
Authorization: Basic base64(user:password)
```

---

## Сравнение

| Способ | Кто | Нужен SSH | Нужен LAN/VPN | Пароль |
|--------|-----|-----------|---------------|--------|
| localhost:8888 | OpenClaw на n150 | нет | нет | нет |
| SSH-туннель → :8888 | Mac, телефон, Cursor | **да** | нет | нет |
| :8890 Basic Auth | все в LAN/VPN | нет | **да** | **да** |

---

## Termux (Android)

1. SSH-ключ в `~/.ssh/`
2. **Вариант A:** туннель (способ 2) — работает из любой сети
3. **Вариант B:** Wi‑Fi Mattahu → способ 3 без туннеля

```bash
pkg install openssh python
scp -r -P 22299 -i ~/.ssh/id_ed25519_n150_server2_developer \
  developer@95.165.10.115:~/apps/astro/skills/websearch ~/.agents/skills/
```

---

## Безопасность

- **8888** — только loopback, не трогать
- **8890** — только LAN (`192.168.1.86`), не `0.0.0.0` без необходимости
- Не открывать порты на роутере в интернет без VPN
- Пароль клиентов — отдельный, длинный; не коммитить `.env`

Из интернета без VPN: используйте **способ 2** (SSH-туннель).

---

## Обслуживание

```bash
cd ~/apps/astro
./scripts/deploy-searxng-n150.sh
docker logs -f openclaw_searxng
docker logs -f openclaw_searxng_gateway   # если включён profile clients
```

Контейнеры: `openclaw_searxng`, `openclaw_searxng_gateway`.

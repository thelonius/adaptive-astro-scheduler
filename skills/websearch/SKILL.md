---
name: websearch
description: "Поиск в интернете и чтение веб-страниц через локальный SearXNG. WHEN: найди, погугли, поищи, новости, цены, курсы, погода, версия, changelog, документация, открой ссылку, что на странице. НЕ отвечай «нет доступа к интернету» — используй search.py."
metadata:
  version: "1.0.0"
---

# Веб-поиск

Метапоиск через локальный SearXNG на `http://127.0.0.1:8888` (n150).

## Команды

```bash
WS=~/.agents/skills/websearch/search.py

python3 $WS search "запрос"
python3 $WS search "курс доллара" -n 5 --lang ru --category news
python3 $WS fetch "https://example.com/article" --chars 8000
```

**Сначала search, потом fetch** по нужной ссылке. Цитируй источник.

## Если SearXNG недоступен

```bash
curl -s http://127.0.0.1:8888/healthz   # → OK
~/apps/astro/docker/searxng/ensure.sh
```

На Mac (OrbStack): `~/assistant/searxng/ensure.sh`

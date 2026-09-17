#!/usr/bin/env python3
"""Веб-поиск через SearXNG. SEARXNG_URL + опционально SEARXNG_USER/PASSWORD."""
import argparse
import base64
import gzip
import html
import io
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SEARX = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8888").rstrip("/")
TIMEOUT = int(os.environ.get("SEARXNG_TIMEOUT", "30"))
COMPOSE = os.path.expanduser("~/assistant/searxng/docker-compose.yml")
ENSURE = os.path.expanduser("~/assistant/searxng/ensure.sh")
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def die(msg, hint=None):
    print(f"ОШИБКА: {msg}", file=sys.stderr)
    if hint:
        print(hint, file=sys.stderr)
    sys.exit(1)


def parse_searx_base():
    parsed = urllib.parse.urlparse(SEARX)
    user = urllib.parse.unquote(parsed.username or "") if parsed.username else ""
    password = urllib.parse.unquote(parsed.password or "") if parsed.password else ""
    if not user:
        user = os.environ.get("SEARXNG_USER", "")
    if not password:
        password = os.environ.get("SEARXNG_PASSWORD", "")
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port
    scheme = parsed.scheme or "http"
    base = f"{scheme}://{host}:{port}" if port else f"{scheme}://{host}"
    return base.rstrip("/"), user, password


SEARX_BASE, SEARX_USER, SEARX_PASS = parse_searx_base()


def auth_header():
    if not SEARX_USER:
        return None
    token = base64.b64encode(f"{SEARX_USER}:{SEARX_PASS}".encode()).decode("ascii")
    return f"Basic {token}"


def ensure_searxng():
    if os.path.isfile(ENSURE):
        try:
            subprocess.run([ENSURE], check=False, timeout=120)
            return
        except (OSError, subprocess.TimeoutExpired):
            pass


def normalize_url(url):
    parsed = urllib.parse.urlparse(url if "://" in url else "https://" + url)
    host = parsed.hostname
    if host and not host.isascii():
        host = host.encode("idna").decode("ascii")
    path = urllib.parse.quote(urllib.parse.unquote(parsed.path or "/"), safe="/:@")
    query = urllib.parse.urlencode(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    netloc = f"{host}:{parsed.port}" if parsed.port else host
    return urllib.parse.urlunparse((parsed.scheme, netloc, path, "", query, ""))


def http_get(url, params=None, accept="*/*"):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    url = normalize_url(url)
    headers = {
        "User-Agent": UA,
        "Accept": accept,
        "Accept-Language": "ru,en;q=0.8",
        "Accept-Encoding": "gzip",
    }
    auth = auth_header()
    if auth:
        headers["Authorization"] = auth
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        return raw, r.headers, r.geturl()


def search(query, limit, lang, category):
    params = {"q": query, "format": "json", "categories": category}
    if lang:
        params["language"] = lang
    try:
        raw, _, _ = http_get(f"{SEARX_BASE}/search", params, accept="application/json")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            die("доступ к SearXNG отклонён — проверьте SEARXNG_USER/PASSWORD")
        raise
    except urllib.error.URLError as e:
        ensure_searxng()
        try:
            raw, _, _ = http_get(f"{SEARX_BASE}/search", params, accept="application/json")
        except Exception:
            die(f"SearXNG недоступен: {e}", hint=f"URL: {SEARX_BASE}")
    data = json.loads(raw.decode("utf-8"))
    return {
        "query": query,
        "answers": data.get("answers", []),
        "results": [
            {"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")}
            for r in data.get("results", [])[:limit]
        ],
    }


def print_search(res):
    for i, r in enumerate(res["results"], 1):
        print(f"{i}. {r['title']}\n   {r['url']}\n   {r['content'][:200]}\n")


def fetch(url, max_chars):
    if not re.match(r"^https?://", url):
        url = "https://" + url
    raw, headers, final_url = http_get(url)
    charset = "utf-8"
    ct = headers.get("Content-Type", "")
    m = re.search(r"charset=([\w-]+)", ct, re.I)
    if m:
        charset = m.group(1)
    text = raw.decode(charset, "replace")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", html.unescape(text)).strip()[:max_chars]
    return {"url": final_url, "text": text, "chars": len(text)}


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query")
    s.add_argument("-n", type=int, default=8)
    s.add_argument("--lang")
    s.add_argument("--category", default="general")
    f = sub.add_parser("fetch")
    f.add_argument("url")
    f.add_argument("--chars", type=int, default=6000)
    a = p.parse_args()
    if a.cmd == "search":
        print_search(search(a.query, a.n, a.lang, a.category))
    else:
        print(json.dumps(fetch(a.url, a.chars), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

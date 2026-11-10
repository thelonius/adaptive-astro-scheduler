#!/usr/bin/env python3
"""CLI client for Adaptive Astro Scheduler optimal-timing v2 (Agensi / any agent)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from typing import Any
from urllib import error, request

DEFAULT_API = os.environ.get("ASTRO_API_URL", "http://127.0.0.1:3000").rstrip("/")
DEFAULT_LOCATION = {
    "latitude": float(os.environ.get("ASTRO_LAT", "55.7558")),
    "longitude": float(os.environ.get("ASTRO_LON", "37.6173")),
    "timezone": os.environ.get("ASTRO_TZ", "Europe/Moscow"),
}

CANONICAL_RECIPES = (
    "business_launch",
    "marriage_relationship",
    "mercury_matters",
    "mars_matters",
    "jupiter_matters",
)


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def http_json(method: str, path: str, body: dict[str, Any] | None = None, timeout: int = 120) -> Any:
    url = f"{DEFAULT_API}{path}"
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        die(f"API {e.code} {path}: {detail[:800]}")
    except error.URLError as e:
        die(f"API unreachable at {DEFAULT_API}: {e.reason}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        die(f"Non-JSON response: {raw[:300]}")


def default_period(days: int) -> tuple[str, str]:
    start = date.today()
    end = start + timedelta(days=days)
    return start.isoformat(), end.isoformat()


def cmd_health(_: argparse.Namespace) -> None:
    data = http_json("GET", "/health")
    print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_recipes(_: argparse.Namespace) -> None:
    data = http_json("GET", "/api/optimal-timing/v2/recipes")
    for r in data.get("recipes", []):
        print(f"- {r.get('id')}: {r.get('intent', '')[:80]}")


def print_slots(data: dict[str, Any], top: int) -> None:
    slots = data.get("windows") or data.get("top_slots") or data.get("slots") or []
    summary = (data.get("summary") or "").strip()
    if summary:
        print(f"Summary: {summary[:500]}\n")
    if not slots:
        print(json.dumps(data, ensure_ascii=False, indent=2)[:4000])
        return
    print(f"Top {min(top, len(slots))} days (API: {DEFAULT_API}):\n")
    for i, s in enumerate(slots[:top], 1):
        d = s.get("date") or s.get("day") or "?"
        score = s.get("score") or s.get("total_score")
        moon = s.get("moon") or {}
        moon_bit = ""
        if isinstance(moon, dict) and moon.get("sign"):
            moon_bit = f" Moon {moon.get('sign')}"
            if moon.get("void_of_course"):
                moon_bit += " VoC"
        line = f"{i}. {d}  score={score}{moon_bit}"
        narrative = (s.get("narrative") or s.get("headline") or "").strip()
        if narrative:
            line += f"  — {narrative[:120]}"
        print(line)
        if narrative and len(narrative) > 120:
            print(f"   {narrative[:400]}")
    req_id = data.get("request_id")
    if req_id:
        print(f"\ntrace: GET /api/optimal-timing/v2/traces/{req_id}")


def cmd_intent(args: argparse.Namespace) -> None:
    start, end = args.from_date, args.to_date
    if not start or not end:
        start, end = default_period(args.days)
    body = {
        "intent": args.text,
        "start_date": start,
        "end_date": end,
        "location": DEFAULT_LOCATION,
        "top_n": args.top,
        "language": args.language,
    }
    if args.natal_chart_id:
        body["natal_chart_id"] = args.natal_chart_id
    data = http_json("POST", "/api/optimal-timing/v2/find-with-intent", body, timeout=args.timeout)
    print_slots(data, args.top)


def cmd_recipe(args: argparse.Namespace) -> None:
    if args.recipe_id not in CANONICAL_RECIPES:
        die(f"unknown recipe {args.recipe_id}; use: {', '.join(CANONICAL_RECIPES)}")
    start, end = args.from_date, args.to_date
    if not start or not end:
        start, end = default_period(args.days)
    body = {
        "recipe_id": args.recipe_id,
        "start_date": start,
        "end_date": end,
        "location": DEFAULT_LOCATION,
        "user_prompt": args.prompt or args.recipe_id,
        "top_n": args.top,
    }
    data = http_json("POST", "/api/optimal-timing/v2/find-with-fixed-recipe", body, timeout=args.timeout)
    print_slots(data, args.top)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Adaptive Astro optimal-timing v2 client")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("health", help="GET /health").set_defaults(func=cmd_health)
    sub.add_parser("recipes", help="List canonical recipes").set_defaults(func=cmd_recipes)

    intent = sub.add_parser("intent", help="find-with-intent")
    intent.add_argument("text", help="User intention in natural language")
    intent.add_argument("--from", dest="from_date")
    intent.add_argument("--to", dest="to_date")
    intent.add_argument("--days", type=int, default=30)
    intent.add_argument("--top", type=int, default=7)
    intent.add_argument("--language", default="en")
    intent.add_argument("--natal-chart-id")
    intent.add_argument("--timeout", type=int, default=180)
    intent.set_defaults(func=cmd_intent)

    recipe = sub.add_parser("recipe", help="find-with-fixed-recipe")
    recipe.add_argument("recipe_id", choices=CANONICAL_RECIPES)
    recipe.add_argument("--prompt", help="Short context for the API log")
    recipe.add_argument("--from", dest="from_date")
    recipe.add_argument("--to", dest="to_date")
    recipe.add_argument("--days", type=int, default=30)
    recipe.add_argument("--top", type=int, default=7)
    recipe.add_argument("--timeout", type=int, default=120)
    recipe.set_defaults(func=cmd_recipe)

    return p


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

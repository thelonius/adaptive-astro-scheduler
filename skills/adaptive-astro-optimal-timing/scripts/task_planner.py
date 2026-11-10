#!/usr/bin/env python3
"""Astro-aware task list; optional companion to plan_best_days.py."""
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import date, datetime, timedelta
from typing import Any
from urllib import error, request

DEFAULT_API = os.environ.get("ASTRO_API_URL", "http://127.0.0.1:3000").rstrip("/")
WORKSPACE = os.path.expanduser(
    os.environ.get(
        "ASTRO_AGENT_WORKSPACE",
        os.environ.get("OPENCLAW_WORKSPACE", "~/.agent/adaptive-astro-workspace"),
    )
)
MEMORY_DIR = os.path.join(WORKSPACE, "memory")
JSON_PATH = os.path.join(MEMORY_DIR, "astro_todos.json")
MD_PATH = os.path.join(MEMORY_DIR, "astro_todos.md")

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
    print(f"ОШИБКА: {msg}", file=sys.stderr)
    sys.exit(code)


def load_store() -> dict[str, Any]:
    if not os.path.exists(JSON_PATH):
        return {"todos": [], "version": 1}
    try:
        with open(JSON_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        die(f"не удалось прочитать {JSON_PATH}: {e}")


def save_store(data: dict[str, Any]) -> None:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    generate_markdown(data)


def http_post(path: str, body: dict[str, Any], timeout: int = 120) -> dict[str, Any]:
    url = f"{DEFAULT_API}{path}"
    payload = json.dumps(body).encode("utf-8")
    req = request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        die(f"API {e.code} {path}: {detail[:500]}")
    except error.URLError as e:
        die(f"Astro API недоступен ({DEFAULT_API}): {e.reason}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        die(f"API вернул не-JSON: {raw[:300]}")


def default_period(days: int = 30) -> tuple[str, str]:
    start = date.today()
    end = start + timedelta(days=days)
    return start.isoformat(), end.isoformat()


def fetch_slots(
    intent: str,
    start_date: str,
    end_date: str,
    *,
    recipe_id: str | None = None,
    top_n: int = 7,
    natal_chart_id: str | None = None,
) -> dict[str, Any]:
    loc = DEFAULT_LOCATION
    if recipe_id:
        body = {
            "recipe_id": recipe_id,
            "start_date": start_date,
            "end_date": end_date,
            "location": loc,
            "user_prompt": intent,
            "top_n": top_n,
        }
        return http_post("/api/optimal-timing/v2/find-with-fixed-recipe", body)

    body = {
        "intent": intent,
        "start_date": start_date,
        "end_date": end_date,
        "location": loc,
        "top_n": top_n,
        "language": "ru",
    }
    if natal_chart_id:
        body["natal_chart_id"] = natal_chart_id
    return http_post("/api/optimal-timing/v2/find-with-intent", body)


def compact_slots(api_response: dict[str, Any]) -> list[dict[str, Any]]:
    slots: list[dict[str, Any]] = []
    for w in api_response.get("windows", [])[:20]:
        moon = w.get("moon") or {}
        slots.append(
            {
                "date": w.get("date"),
                "score": w.get("score"),
                "rank": w.get("rank"),
                "moon_sign": moon.get("sign"),
                "moon_phase": moon.get("phase"),
                "retrogrades": w.get("retrograde_planets") or [],
                "narrative": _first_narrative(w.get("vibe_narratives")),
            }
        )
    return slots


def _first_narrative(vibes: dict[str, str] | None) -> str | None:
    if not vibes:
        return None
    for text in vibes.values():
        if text and str(text).strip():
            return str(text).strip()
    return None


def find_task(todos: list[dict[str, Any]], needle: str) -> dict[str, Any] | None:
    needle_l = needle.lower()
    for t in todos:
        if t.get("id", "").startswith(needle) or needle_l in t.get("title", "").lower():
            return t
    return None


def generate_markdown(data: dict[str, Any]) -> None:
    lines = [
        "# Astro To-Do",
        "",
        f"_Обновлено: {datetime.now().strftime('%Y-%m-%d %H:%M')}_",
        "",
    ]
    pri_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}

    pending = [t for t in data.get("todos", []) if t.get("status") in ("pending", "scheduled")]
    completed = [t for t in data.get("todos", []) if t.get("status") == "completed"]

    order = {"high": 0, "medium": 1, "low": 2}
    pending.sort(key=lambda x: (0 if x.get("status") == "scheduled" else 1, order.get(x.get("priority", "medium"), 1)))

    if pending:
        lines.append("## Активные")
        for t in pending:
            pri = pri_emoji.get(t.get("priority", "medium"), "⚪")
            astro = t.get("astro") or {}
            sched = astro.get("scheduled_date")
            sched_part = f" → **{sched}**" if sched else ""
            astro_flag = " 🌙" if astro.get("relevant") else ""
            lines.append(f"- [ ] {pri} {t['title']}{astro_flag}{sched_part}")
            if astro.get("slots") and not sched:
                top = astro["slots"][:3]
                hint = ", ".join(f"{s['date']} ({s.get('score', '?')})" for s in top if s.get("date"))
                if hint:
                    lines.append(f"  - слоты: {hint}")
        lines.append("")
    else:
        lines.append("## Активные\n*Пусто*\n")

    if completed:
        lines.append("## Завершённые (последние 10)")
        completed.sort(key=lambda x: x.get("completed_at", ""), reverse=True)
        for t in completed[:10]:
            astro = t.get("astro") or {}
            outcome = astro.get("outcome") or {}
            rating = outcome.get("rating")
            stars = f" {'⭐' * rating}" if rating else ""
            sched = astro.get("scheduled_date") or "—"
            lines.append(f"- [x] ~~{t['title']}~~ ({sched}){stars}")
            if outcome.get("comment"):
                lines.append(f"  - _{outcome['comment']}_")
        lines.append("")

    with open(MD_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def cmd_add(args: argparse.Namespace) -> None:
    store = load_store()
    todo_id = str(uuid.uuid4())[:8]
    astro_block: dict[str, Any] | None = None

    if args.astro or args.intent:
        intent = (args.intent or args.title).strip()
        start, end = args.from_date, args.to_date
        if not start or not end:
            start, end = default_period(args.days)
        print(f"Запрашиваю слоты: «{intent}» ({start} … {end})…")
        api = fetch_slots(
            intent,
            start,
            end,
            recipe_id=args.recipe,
            top_n=args.top,
            natal_chart_id=args.natal_chart_id,
        )
        slots = compact_slots(api)
        if not slots:
            print("Предупреждение: подходящих слотов не найдено, задача сохранена без дат.")
        astro_block = {
            "relevant": True,
            "intent": intent,
            "period": {"start": start, "end": end},
            "request_id": api.get("request_id"),
            "recipe_id": args.recipe,
            "summary": api.get("summary"),
            "slots": slots,
            "scheduled_date": None,
            "scheduled_score": None,
            "outcome": None,
        }
        print_slots(slots, api.get("summary"))

    store["todos"].append(
        {
            "id": todo_id,
            "title": args.title,
            "status": "pending",
            "priority": args.priority,
            "created_at": date.today().isoformat(),
            "astro": astro_block,
        }
    )
    save_store(store)
    print(f"Добавлено: [{todo_id}] {args.title}")


def print_slots(slots: list[dict[str, Any]], summary: str | None) -> None:
    if summary:
        print(f"\n{summary}\n")
    if not slots:
        return
    print("Лучшие слоты:")
    for s in slots:
        moon = s.get("moon_sign") or "?"
        score = s.get("score", "?")
        retro = ", ".join(s.get("retrogrades") or []) or "—"
        print(f"  #{s.get('rank', '?')} {s.get('date')}  score={score}  Луна: {moon}  ℞: {retro}")
        if s.get("narrative"):
            print(f"     {s['narrative'][:160]}")


def cmd_slots(args: argparse.Namespace) -> None:
    store = load_store()
    task = find_task(store["todos"], args.task)
    if not task:
        die(f"задача не найдена: {args.task}")
    astro = task.get("astro") or {}
    if not astro.get("relevant") and not args.intent:
        die("у задачи нет astro-блока; укажите --intent")

    intent = (args.intent or astro.get("intent") or task["title"]).strip()
    period = astro.get("period") or {}
    start = args.from_date or period.get("start")
    end = args.to_date or period.get("end")
    if not start or not end:
        start, end = default_period(args.days)

    print(f"Обновляю слоты для «{task['title']}»…")
    api = fetch_slots(intent, start, end, recipe_id=args.recipe, top_n=args.top, natal_chart_id=args.natal_chart_id)
    slots = compact_slots(api)
    task["astro"] = {
        **astro,
        "relevant": True,
        "intent": intent,
        "period": {"start": start, "end": end},
        "request_id": api.get("request_id"),
        "recipe_id": args.recipe or astro.get("recipe_id"),
        "summary": api.get("summary"),
        "slots": slots,
    }
    save_store(store)
    print_slots(slots, api.get("summary"))


def cmd_schedule(args: argparse.Namespace) -> None:
    store = load_store()
    task = find_task(store["todos"], args.task)
    if not task:
        die(f"задача не найдена: {args.task}")

    chosen_date = args.date
    chosen_score = None
    astro = task.get("astro") or {}

    if astro.get("slots"):
        slot_dates = {s["date"]: s.get("score") for s in astro["slots"] if s.get("date")}
        if chosen_date in slot_dates:
            chosen_score = slot_dates[chosen_date]
        elif chosen_date not in slot_dates:
            print(f"Предупреждение: {chosen_date} не в списке рекомендованных слотов.")

    if not task.get("astro"):
        task["astro"] = {"relevant": bool(args.date), "outcome": None}
    task["astro"]["scheduled_date"] = chosen_date
    task["astro"]["scheduled_score"] = chosen_score
    task["status"] = "scheduled"
    save_store(store)
    score_txt = f" (score {chosen_score})" if chosen_score is not None else ""
    print(f"Запланировано: {task['title']} → {chosen_date}{score_txt}")


def cmd_complete(args: argparse.Namespace) -> None:
    store = load_store()
    task = find_task(store["todos"], args.task)
    if not task:
        die(f"задача не найдена: {args.task}")
    task["status"] = "completed"
    task["completed_at"] = date.today().isoformat()
    save_store(store)
    print(f"Завершено: {task['title']}")
    astro = task.get("astro") or {}
    if astro.get("relevant") and astro.get("scheduled_date") and not (astro.get("outcome") or {}).get("rating"):
        print(f"Подсказка: astro_todos.py outcome \"{args.task}\" --rating 1-5 [--comment \"...\"]")


def cmd_outcome(args: argparse.Namespace) -> None:
    if not 1 <= args.rating <= 5:
        die("rating должен быть от 1 до 5")
    store = load_store()
    task = find_task(store["todos"], args.task)
    if not task:
        die(f"задача не найдена: {args.task}")
    if not task.get("astro"):
        task["astro"] = {"relevant": True}
    task["astro"]["outcome"] = {
        "rating": args.rating,
        "comment": (args.comment or "").strip() or None,
        "recorded_at": datetime.now().isoformat(timespec="seconds"),
        "request_id": task.get("astro", {}).get("request_id"),
        "scheduled_date": task.get("astro", {}).get("scheduled_date"),
        "scheduled_score": task.get("astro", {}).get("scheduled_score"),
    }
    if task.get("status") != "completed":
        task["status"] = "completed"
        task["completed_at"] = date.today().isoformat()
    save_store(store)
    print(f"Рекап сохранён: {task['title']} — {args.rating}/5")
    if args.comment:
        print(f"  {args.comment}")


def cmd_list(args: argparse.Namespace) -> None:
    store = load_store()
    generate_markdown(store)
    todos = store.get("todos", [])
    if not todos:
        print("Список пуст.")
        return
    for t in todos:
        if args.status and t.get("status") != args.status:
            continue
        astro = t.get("astro") or {}
        sched = astro.get("scheduled_date") or "—"
        flag = "🌙" if astro.get("relevant") else "  "
        print(f"{flag} [{t['id']}] {t['status']:9} {t['title'][:50]:50} {sched}")


def cmd_recap(args: argparse.Namespace) -> None:
    store = load_store()
    rows = []
    for t in store.get("todos", []):
        astro = t.get("astro") or {}
        outcome = astro.get("outcome") or {}
        if not outcome.get("rating"):
            continue
        rows.append(
            (
                outcome.get("recorded_at", ""),
                t.get("title", ""),
                astro.get("scheduled_date"),
                outcome.get("rating"),
                astro.get("scheduled_score"),
                outcome.get("comment"),
                astro.get("request_id"),
            )
        )
    rows.sort(reverse=True)
    if not rows:
        print("Рекапов пока нет.")
        return
    print("Рекапы:")
    for rec_at, title, sched, rating, score, comment, req_id in rows[: args.limit]:
        c = (comment or "")[:60]
        print(f"  {rec_at[:10]} | {title[:35]:35} | {sched} | {rating}/5 | score={score} | {c}")
        if req_id:
            print(f"    trace: {req_id}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Astro-aware todo planner")
    sub = p.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="Добавить задачу")
    add.add_argument("title", help="Название задачи")
    add.add_argument("--astro", action="store_true", help="Сразу запросить астро-слоты")
    add.add_argument("--intent", help="Намерение для планировщика")
    add.add_argument("--from", dest="from_date", help="Начало окна YYYY-MM-DD")
    add.add_argument("--to", dest="to_date", help="Конец окна YYYY-MM-DD")
    add.add_argument("--days", type=int, default=30)
    add.add_argument("--recipe", choices=CANONICAL_RECIPES)
    add.add_argument("--top", type=int, default=7)
    add.add_argument("--priority", choices=["high", "medium", "low"], default="medium")
    add.add_argument("--natal-chart-id")
    add.set_defaults(func=cmd_add)

    slots = sub.add_parser("slots", help="Обновить астро-слоты")
    slots.add_argument("task")
    slots.add_argument("--intent")
    slots.add_argument("--from", dest="from_date")
    slots.add_argument("--to", dest="to_date")
    slots.add_argument("--days", type=int, default=30)
    slots.add_argument("--recipe", choices=CANONICAL_RECIPES)
    slots.add_argument("--top", type=int, default=7)
    slots.add_argument("--natal-chart-id")
    slots.set_defaults(func=cmd_slots)

    sched = sub.add_parser("schedule", help="Назначить дату")
    sched.add_argument("task")
    sched.add_argument("--date", required=True)
    sched.set_defaults(func=cmd_schedule)

    done = sub.add_parser("complete", help="Отметить выполненной")
    done.add_argument("task")
    done.set_defaults(func=cmd_complete)

    outcome = sub.add_parser("outcome", help="Рекап")
    outcome.add_argument("task")
    outcome.add_argument("--rating", type=int, required=True)
    outcome.add_argument("--comment")
    outcome.set_defaults(func=cmd_outcome)

    lst = sub.add_parser("list", help="Список")
    lst.add_argument("--status", choices=["pending", "scheduled", "completed"])
    lst.set_defaults(func=cmd_list)

    recap = sub.add_parser("recap", help="История рекапов")
    recap.add_argument("--limit", type=int, default=20)
    recap.set_defaults(func=cmd_recap)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

"""SQLite store for astro todos / plans (stdlib sqlite3). Migrates legacy JSON once."""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
from datetime import datetime
from typing import Any

DB_NAME = "astro_planner.db"
JSON_NAME = "astro_todos.json"


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


class AstroStore:
    def __init__(self, memory_dir: str) -> None:
        self.memory_dir = memory_dir
        self.db_path = os.path.join(memory_dir, DB_NAME)
        self.json_path = os.path.join(memory_dir, JSON_NAME)
        os.makedirs(memory_dir, exist_ok=True)
        self._init_schema()
        self._maybe_migrate_json()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    priority TEXT NOT NULL DEFAULT 'medium',
                    created_at TEXT,
                    completed_at TEXT,
                    astro_relevant INTEGER NOT NULL DEFAULT 0,
                    astro_intent TEXT,
                    recipe_id TEXT,
                    period_start TEXT,
                    period_end TEXT,
                    request_id TEXT,
                    summary TEXT,
                    slots_json TEXT,
                    scheduled_date TEXT,
                    scheduled_score REAL,
                    outcome_json TEXT
                );
                CREATE TABLE IF NOT EXISTS plan_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT,
                    event TEXT NOT NULL,
                    request_id TEXT,
                    detail_json TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES tasks(id)
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
                CREATE INDEX IF NOT EXISTS idx_tasks_request ON tasks(request_id);
                CREATE INDEX IF NOT EXISTS idx_plan_log_created ON plan_log(created_at DESC);
                """
            )

    def _maybe_migrate_json(self) -> None:
        if not os.path.isfile(self.json_path):
            return
        with self._connect() as conn:
            n = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        if n > 0:
            return
        try:
            with open(self.json_path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            return
        self.save_store_dict(data)
        backup = self.json_path + ".migrated.bak"
        shutil.move(self.json_path, backup)

    def _row_to_task(self, row: sqlite3.Row) -> dict[str, Any]:
        astro: dict[str, Any] | None = None
        if row["astro_relevant"] or row["slots_json"] or row["scheduled_date"] or row["outcome_json"]:
            astro = {
                "relevant": bool(row["astro_relevant"]),
                "intent": row["astro_intent"],
                "recipe_id": row["recipe_id"],
                "request_id": row["request_id"],
                "summary": row["summary"],
                "scheduled_date": row["scheduled_date"],
                "scheduled_score": row["scheduled_score"],
            }
            if row["period_start"] or row["period_end"]:
                astro["period"] = {"start": row["period_start"], "end": row["period_end"]}
            if row["slots_json"]:
                try:
                    astro["slots"] = json.loads(row["slots_json"])
                except json.JSONDecodeError:
                    astro["slots"] = []
            if row["outcome_json"]:
                try:
                    astro["outcome"] = json.loads(row["outcome_json"])
                except json.JSONDecodeError:
                    astro["outcome"] = None
            else:
                astro["outcome"] = None
        return {
            "id": row["id"],
            "title": row["title"],
            "status": row["status"],
            "priority": row["priority"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"],
            "astro": astro,
        }

    def _task_to_row(self, t: dict[str, Any]) -> tuple[Any, ...]:
        astro = t.get("astro") or {}
        period = astro.get("period") or {}
        slots = astro.get("slots")
        outcome = astro.get("outcome")
        return (
            t["id"],
            t["title"],
            t.get("status", "pending"),
            t.get("priority", "medium"),
            t.get("created_at"),
            t.get("completed_at"),
            1 if astro.get("relevant") else 0,
            astro.get("intent"),
            astro.get("recipe_id"),
            period.get("start"),
            period.get("end"),
            astro.get("request_id"),
            astro.get("summary"),
            json.dumps(slots, ensure_ascii=False) if slots else None,
            astro.get("scheduled_date"),
            astro.get("scheduled_score"),
            json.dumps(outcome, ensure_ascii=False) if outcome else None,
        )

    def load_store_dict(self) -> dict[str, Any]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM tasks ORDER BY created_at ASC, id ASC").fetchall()
        return {"version": 2, "todos": [self._row_to_task(r) for r in rows]}

    def save_store_dict(self, data: dict[str, Any]) -> None:
        todos = data.get("todos", [])
        with self._connect() as conn:
            conn.execute("DELETE FROM tasks")
            for t in todos:
                conn.execute(
                    """
                    INSERT INTO tasks (
                        id, title, status, priority, created_at, completed_at,
                        astro_relevant, astro_intent, recipe_id, period_start, period_end,
                        request_id, summary, slots_json, scheduled_date, scheduled_score, outcome_json
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    self._task_to_row(t),
                )
            conn.commit()

    def log_event(
        self,
        event: str,
        *,
        task_id: str | None = None,
        request_id: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO plan_log (task_id, event, request_id, detail_json, created_at)
                VALUES (?,?,?,?,?)
                """,
                (
                    task_id,
                    event,
                    request_id,
                    json.dumps(detail, ensure_ascii=False) if detail else None,
                    _now_iso(),
                ),
            )
            conn.commit()

    def agent_context(self, *, limit: int = 12) -> dict[str, Any]:
        with self._connect() as conn:
            active = conn.execute(
                """
                SELECT id, title, status, astro_intent, recipe_id, scheduled_date,
                       request_id, summary, slots_json
                FROM tasks
                WHERE status IN ('pending', 'scheduled')
                ORDER BY CASE status WHEN 'scheduled' THEN 0 ELSE 1 END, created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            outcomes = conn.execute(
                """
                SELECT title, scheduled_date, outcome_json, recipe_id, request_id
                FROM tasks
                WHERE outcome_json IS NOT NULL
                ORDER BY completed_at DESC NULLS LAST
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            by_recipe = conn.execute(
                """
                SELECT recipe_id, COUNT(*) AS n, AVG(scheduled_score) AS avg_score
                FROM tasks
                WHERE recipe_id IS NOT NULL AND scheduled_date IS NOT NULL
                GROUP BY recipe_id
                """
            ).fetchall()

        def brief_slots(slots_json: str | None) -> list[dict[str, Any]]:
            if not slots_json:
                return []
            try:
                raw = json.loads(slots_json)
            except json.JSONDecodeError:
                return []
            out: list[dict[str, Any]] = []
            for s in raw[:3]:
                out.append({"date": s.get("date"), "score": s.get("score")})
            return out

        active_tasks = []
        for r in active:
            active_tasks.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "status": r["status"],
                    "intent": r["astro_intent"],
                    "recipe_id": r["recipe_id"],
                    "scheduled_date": r["scheduled_date"],
                    "request_id": r["request_id"],
                    "summary": r["summary"],
                    "top_slots": brief_slots(r["slots_json"]),
                }
            )

        recent_outcomes = []
        for r in outcomes:
            try:
                outcome = json.loads(r["outcome_json"] or "{}")
            except json.JSONDecodeError:
                outcome = {}
            recent_outcomes.append(
                {
                    "title": r["title"],
                    "scheduled_date": r["scheduled_date"],
                    "rating": outcome.get("rating"),
                    "comment": outcome.get("comment"),
                    "recipe_id": r["recipe_id"],
                    "request_id": r["request_id"],
                }
            )

        return {
            "store": "sqlite",
            "db_path": self.db_path,
            "active_tasks": active_tasks,
            "recent_outcomes": recent_outcomes,
            "recipe_usage": [
                {"recipe_id": row["recipe_id"], "count": row["n"], "avg_scheduled_score": row["avg_score"]}
                for row in by_recipe
            ],
            "hint_for_agent": (
                "Before a new plan, check active_tasks for duplicate intents. "
                "Use request_id with GET /api/optimal-timing/v2/traces/:id to replay."
            ),
        }

    def history(self, *, limit: int = 30) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT pl.id, pl.task_id, pl.event, pl.request_id, pl.detail_json, pl.created_at,
                       t.title
                FROM plan_log pl
                LEFT JOIN tasks t ON t.id = pl.task_id
                ORDER BY pl.id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            detail = None
            if r["detail_json"]:
                try:
                    detail = json.loads(r["detail_json"])
                except json.JSONDecodeError:
                    detail = r["detail_json"]
            out.append(
                {
                    "at": r["created_at"],
                    "event": r["event"],
                    "task_id": r["task_id"],
                    "title": r["title"],
                    "request_id": r["request_id"],
                    "detail": detail,
                }
            )
        return out

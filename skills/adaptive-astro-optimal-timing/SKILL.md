---
name: adaptive-astro-optimal-timing
description: "Pick the best calendar days for real-world intentions using lunar timing, transit scoring, and optional LLM-built rules. Use when the user asks when to sign a contract, launch a project, travel, negotiate, marry, or schedule any important task. Requires the buyer's own Adaptive Astro Scheduler API (self-hosted Docker or your deployment) — configure ASTRO_API_URL before first use."
metadata:
  version: "1.0.0"
  author: "Eduard Dubnitsky"
  license: "MIT"
  homepage: "https://github.com/thelonius/adaptive-astro-scheduler"
---

# Adaptive Astro Optimal Timing

Agent skill for **Adaptive Astro Scheduler** — combines lunar calendar data, classical timing rules, ephemeris-backed scoring, and (optionally) LLM-generated recipes from a free-text intention.

**You must run the API yourself** (or point at an instance you control). This skill is a client: scripts + instructions. It does not include hosted servers or interpretation corpus hosting.

## When to use

- User wants **which day** to do something: sign, launch, meet, travel, argue, heal, publish.
- User gives a **natural-language intention** in any language.
- User prefers **fast deterministic** timing (canonical recipes) without LLM cost.

Do **not** use for full natal chart drawing, synastry, or paid human readings — use chart tools elsewhere.

## Setup (once per machine)

1. Clone and start the stack (backend + ephemeris + postgres on your machine or VPS):

   ```bash
   git clone https://github.com/thelonius/adaptive-astro-scheduler.git
   cd adaptive-astro-scheduler
   # copy docker/.env.n150.example or use docker compose for local dev — see reference/self-host.md
   docker compose -f docker/docker-compose.n150.yml up -d   # minimal API stack
   ```

2. Point the skill at the API (default loopback):

   ```bash
   export ASTRO_API_URL=http://127.0.0.1:3000
   export ASTRO_LAT=55.7558
   export ASTRO_LON=37.6173
   export ASTRO_TZ=Europe/Moscow
   ```

3. Verify:

   ```bash
   python3 scripts/plan_best_days.py health
   ```

4. Optional: load the ZET interpretation corpus into Postgres (not shipped in the image). See `reference/self-host.md` in this zip.

## Commands (agent workflow)

Use **only** the bundled scripts — do not read the whole monorepo unless debugging.

```bash
SKILL_ROOT=<directory where this SKILL.md lives>
PY=python3

# Health + list built-in timing recipes
$PY $SKILL_ROOT/scripts/plan_best_days.py health
$PY $SKILL_ROOT/scripts/plan_best_days.py recipes

# Free-text intention (uses LLM on the API if configured; NVIDIA key in server .env)
$PY $SKILL_ROOT/scripts/plan_best_days.py intent \
  "sign a rental lease" --from 2026-11-01 --to 2026-11-30 --top 5

# Fixed canonical recipe (no LLM, faster): mercury_matters, business_launch, …
$PY $SKILL_ROOT/scripts/plan_best_days.py recipe mercury_matters \
  --from 2026-11-01 --to 2026-11-30 --top 5 --prompt "sign contract"

# Persist tasks + schedule + outcome journal (optional)
$PY $SKILL_ROOT/scripts/task_planner.py add "Lease signing" --astro --intent "sign lease" --days 21
$PY $SKILL_ROOT/scripts/task_planner.py schedule "lease" --date 2026-11-12
$PY $SKILL_ROOT/scripts/task_planner.py outcome "lease" --rating 4 --comment "smooth"
```

## How to answer the user

1. Run `health`. If it fails, walk through `reference/self-host.md` — do not invent scores.
2. Choose **recipe** when the intent matches a known bucket (contracts → `mercury_matters`, launches → `business_launch`). Otherwise **intent**.
3. Present top slots: date, score, short narrative if returned, moon phase / lunar day when present.
4. Say clearly that timing is rule-based + ephemeris, not medical/legal advice.

## API surface (reference)

| Endpoint | Role |
|----------|------|
| `GET /health` | API up |
| `GET /api/optimal-timing/v2/recipes` | Canonical recipe ids |
| `POST /api/optimal-timing/v2/find-with-intent` | LLM recipe + scoring |
| `POST /api/optimal-timing/v2/find-with-fixed-recipe` | Deterministic scoring |

Full payload shapes: `reference/api.md`.

## Marketplace / listing note (creator)

List as **free** unless you bundle a working API. Per Agensi guidance, a paid skill must deliver what the listing promises without forcing a separate paid service the buyer cannot run. A free skill + self-host instructions is the honest model.

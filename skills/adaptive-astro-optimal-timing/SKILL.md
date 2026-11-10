---
name: adaptive-astro-optimal-timing
description: "Pick the best calendar days for real-world intentions using a bundled Docker stack: Skyfield ephemeris service + Node optimal-timing v2 planner (lunar data, transit scoring, canonical or LLM recipes). Use when the user asks when to sign, launch, travel, negotiate, or schedule important work. First run scripts/stack-up.sh on the buyer's machine (Docker); then call scripts/plan_best_days.py against http://127.0.0.1:3000."
metadata:
  version: "1.1.0"
  author: "Eduard Dubnitsky"
  license: "MIT"
  homepage: "https://github.com/thelonius/adaptive-astro-scheduler"
---

# Adaptive Astro Optimal Timing

This skill ships the **real product**: **ephemeris API + backend planner**, not a script that assumes a mystery server.

| Layer | In the zip |
|-------|------------|
| Ephemeris (Python) | `stack/docker-compose.yml` → `ghcr.io/.../ephemeris` |
| Planner backend (Node) | same compose → `ghcr.io/.../backend` |
| Agent CLI | `scripts/plan_best_days.py`, `scripts/task_planner.py` |
| Boot | `scripts/stack-up.sh` / `stack-down.sh` |

Images are built from [adaptive-astro-scheduler](https://github.com/thelonius/adaptive-astro-scheduler). The agent **starts the stack**, then **queries the API**. See `reference/architecture.md`.

## Prerequisites

- **Docker** (Docker Compose v2)
- **python3** (stdlib only in scripts)
- **~2 GB RAM** free for four containers
- Optional: **NVIDIA_API_KEY** in `stack/.env` for free-text `intent` mode (recipe mode works without LLM)

## Setup (every new machine)

```bash
SKILL_ROOT=<directory of this SKILL.md>

$SKILL_ROOT/scripts/stack-up.sh
export ASTRO_API_URL=http://127.0.0.1:3000
export ASTRO_LAT=55.7558
export ASTRO_LON=37.6173
export ASTRO_TZ=Europe/Moscow

python3 $SKILL_ROOT/scripts/plan_best_days.py health
python3 $SKILL_ROOT/scripts/plan_best_days.py recipes
```

`stack-up.sh` creates `stack/.env` with a random Postgres password on first run and pulls public ghcr images.

## Planning workflow

```bash
PY=python3

# Deterministic (no LLM): contracts → mercury_matters
$PY $SKILL_ROOT/scripts/plan_best_days.py recipe mercury_matters \
  --from 2026-11-01 --to 2026-11-30 --top 5 --prompt "sign lease"

# Free-text intention (LLM on the backend if NVIDIA_API_KEY is set in stack/.env)
$PY $SKILL_ROOT/scripts/plan_best_days.py intent \
  "sign a rental lease" --from 2026-11-01 --to 2026-11-30 --top 5
```

Optional task journal: `scripts/task_planner.py` (same API).

## Agent rules

1. If `health` fails → run `stack-up.sh` or `docker compose` logs; **never invent scores**.
2. Prefer **recipe** when intent maps to a canonical id (`mercury_matters`, `business_launch`, …).
3. Present dates, scores, moon sign/phase from API `windows`; disclaim not legal/medical advice.
4. **Corpus** interpretation texts are **not** in this skill zip; timing v2 does not need them. Full repo has optional corpus load.

## Teardown

```bash
$SKILL_ROOT/scripts/stack-down.sh
```

## Marketplace note

Listing promises **local Docker stack + agent scripts**. That matches Agensi’s requirement that the zip delivers what it describes (not a paid pointer to a hosted API you do not include). Optional paid tier later = support/pinning, not remote SaaS unless you run it.

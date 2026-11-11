# Agensi upload — Adaptive Astro Optimal Timing

## Artifact

```bash
./scripts/package-agensi-skill.sh
# → dist/adaptive-astro-optimal-timing.zip (~23 KB)
```

## Where to upload

1. Log in: https://www.agensi.io (creator account)
2. **Sell / Creator Studio** → **New skill** → upload ZIP  
   Direct: https://www.agensi.io/sell

## Suggested listing (paste into form)

**Title**

`Adaptive Astro Optimal Timing — Docker ephemeris + day scorer`

**Short description** (for skill router / MCP)

`Pick the best calendar days for contracts, launches, travel, and negotiations. Ships a 4-container Docker stack (Skyfield ephemeris + optimal-timing v2 backend), Python CLIs, and SQLite task memory. NOT natal charts — electional day ranking with deterministic scores.`

**Long description**

Hybrid agent skill: the LLM explains results; the engine computes them.

- **`stack-up.sh`** — pulls public images from `ghcr.io/thelonius/adaptive-astro-scheduler` (ephemeris + backend), Postgres, Redis.
- **`plan_best_days.py`** — `recipe` mode (no LLM API needed) or `intent` mode (optional `NVIDIA_API_KEY` on buyer's server).
- **`task_planner.py`** — optional todos, schedule date, outcome rating; **`context`** JSON for the agent before new plans.
- **SQLite** local memory (`astro_planner.db`) — no cloud telemetry by default.

Requirements: Docker Compose v2, python3, ~2 GB RAM free, internet for first image pull.

Not included: hosted SaaS, corpus interpretation texts, medical/legal advice.

**Price (first launch)**

- **Free** — faster review, Joeri pipeline; switch to $19–29 after reviews.
- Paid skills need **Stripe/payout** connected before going live.

**Permissions / tools** (declare honestly)

- Terminal / shell (docker compose, python3)
- Read/write files in buyer workspace (`ASTRO_AGENT_WORKSPACE`)
- Network: first-time Docker pull from ghcr.io; optional NVIDIA API if buyer sets intent mode

**Known limitations** (for listing)

- Requires Docker on buyer machine (not for ChatGPT-only users without tools).
- Intent mode needs buyer-supplied `NVIDIA_API_KEY` in `stack/.env`.
- Recipe mode works without external LLM.

**Compatibility**

Claude, Cursor, Codex, Gemini CLI via Agensi MCP; OpenClaw-style setups can point scripts at an existing API (`reference/modes.md`).

**Homepage**

`https://github.com/thelonius/adaptive-astro-scheduler`

## Pre-submit checks

- [ ] `./scripts/test-agensi-skill.sh` green (n150 tunnel or `--boot` locally)
- [ ] SKILL.md version 1.3.0, `name: adaptive-astro-optimal-timing`
- [ ] No secrets in zip (`stack/.env` not included)
- [ ] Joeri follow-up email mentions free self-host skill if needed

## After approve

Test buyer flow: MCP connect → ask *"When should I sign a lease in the next 30 days?"* → agent should run `stack-up` or `health` then `plan_best_days.py`.

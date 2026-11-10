# What this skill actually ships

A marketplace buyer gets **four things in one zip**, not a link to “go clone GitHub”:

| Piece | What it is |
|-------|------------|
| **Ephemeris image** | Python FastAPI service (`lunar-calendar-api`): planet positions, lunar day, aspects, briefings. Swiss/Skyfield data inside the container. |
| **Backend image** | Node API: optimal-timing **v2** scores each day against rules; optional LLM-built recipes when `NVIDIA_API_KEY` is set on the server. |
| **Postgres + Redis** | Migrations on backend startup; scoring state and traces. |
| **`stack/docker-compose.yml`** | Wires ephemeris → `EPHEMERIS_API_URL=http://ephemeris:8000` (same as production n150). |

Client scripts (`plan_best_days.py`) are **thin**: they call **your** stack on loopback after `stack-up.sh`.

## Why not “curl-only” skill

Joeri (Agensi) allows a free thin API pointer, but the **product** is the pairing **ephemeris + planner**. Without the stack, agents have nothing to call except an empty URL. The skill zip therefore **includes the compose file and pre-built public images** on ghcr.io.

## Optional add-ons (not required for timing v2)

- **Corpus** (ZET interpretations): separate load into Postgres; see full monorepo `scripts/ml/load_corpus.py`.
- **Frontend / mobile / AstroClock**: not in this skill.

## Hosted API

Agensi does not host your servers. Buyers run Docker locally or on their VPS. You may offer a public endpoint separately; do not list it as included unless you operate it.

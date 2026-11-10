# Self-host Adaptive Astro Scheduler API

This skill calls **your** HTTP API. Agensi does not host it.

## Minimal stack (API only)

Repository: https://github.com/thelonius/adaptive-astro-scheduler

```bash
git clone https://github.com/thelonius/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler
cp docker/.env.n150.example docker/.env   # edit POSTGRES_PASSWORD, image tags
docker compose -f docker/docker-compose.n150.yml up -d
curl -s http://127.0.0.1:3000/health
```

Services: **backend** (port 3000), **ephemeris**, **postgres**, **redis**.

## LLM intent mode

`find-with-intent` uses NVIDIA (or compatible) OpenAI API on the **server**. Set in server `.env`:

- `NVIDIA_API_KEY` (optional; without it some paths fall back or fail — use `recipe` mode)

## Interpretation corpus (optional)

ZET interpretation texts (`/api/corpus/*`) live in Postgres. They are **not** in the Docker image. After a fresh database volume, load from the maintainer’s `zet/corpus.jsonl` via `scripts/ml/load_corpus.py` (see repo). Optimal-timing v2 does **not** require the corpus.

## Local dev (Mac)

```bash
npm run dev   # backend :3001 + frontend optional
export ASTRO_API_URL=http://127.0.0.1:3001
```

## Security

Bind API to loopback or protect with VPN/SSH tunnel. Do not expose Postgres to the internet.

# Running the bundled stack

## Default (Agensi zip)

```bash
./scripts/stack-up.sh
export ASTRO_API_URL=http://127.0.0.1:3000
```

Compose lives in `stack/`. Ephemeris listens on `:8000` **inside** Docker only; backend on `127.0.0.1:3000`.

## Pin image versions

Edit `stack/.env`:

```bash
BACKEND_IMAGE=ghcr.io/thelonius/adaptive-astro-scheduler/backend:<git-sha>
EPHEMERIS_IMAGE=ghcr.io/thelonius/adaptive-astro-scheduler/ephemeris:<git-sha>
```

## Full monorepo (maintainers)

Developers may use the whole repository (`docker-compose.n150.yml`, corpus load, mobile). **Agensi buyers do not need a git clone** if they use `stack/`.

## Corpus (optional)

`/api/corpus/*` needs `corpus_interpretations` in Postgres. Load from maintainer’s `zet/corpus.jsonl` via repo `scripts/ml/load_corpus.py`. Optimal timing v2 works without corpus.

## LLM intent mode

Set `NVIDIA_API_KEY` in `stack/.env`, recreate backend:

```bash
cd stack && docker compose up -d backend
```

Without a key, use `plan_best_days.py recipe <id>` only.

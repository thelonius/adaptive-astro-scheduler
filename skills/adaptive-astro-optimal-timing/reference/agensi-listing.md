# Agensi listing (revised positioning)

## Product

**Turnkey astro timing for agents:** Docker compose pulls **maintainer-built ephemeris + backend images**, agent scripts plan best days. This is the Adaptive Astro Scheduler engine, not a generic HTTP stub.

## Joeri constraints (mapped)

| Rule | How we comply |
|------|----------------|
| Agensi does not host APIs | Buyer runs `stack-up.sh` on their machine/VPS |
| Paid skill must not lie about external deps | Zip includes compose + image refs + boot scripts |
| Thin “call my SaaS” skill | Avoided — stack ships in zip |

## Suggested copy

**Title:** Adaptive Astro Optimal Timing — Docker ephemeris + day scorer for agents

**Description:** Start a 4-container stack (Python ephemeris, Node optimal-timing v2, Postgres). Rank calendar days for contracts, launches, travel, negotiations. Includes stack-up script and Python CLIs. Works offline after image pull. Optional LLM intents with your NVIDIA key.

**Requirements:** Docker, python3, ~2GB RAM.

**Price idea:** Free first drop → $29 one-time when reviews land (skill + pinned images + updates via Agensi versions).

## Build zip

```bash
./scripts/package-agensi-skill.sh
```

Upload: https://www.agensi.io/sell

# API

HTTP layer for v2. Lives next to the v1 controller, does NOT replace
it. v1 stays at `/optimal-timing/find` and `/optimal-timing/find-ai`;
v2 is `/optimal-timing/v2/find` and friends.

## Endpoints

### `POST /optimal-timing/v2/find`

Run the full pipeline, return windows.

Request:
```ts
{
  prompt: string;
  location?: { latitude: number; longitude: number; timezone: string };
  natalChartId?: string;
  debug?: boolean;     // include verbose trace fields in response
}
```

Response:
```ts
{
  request_id: string;  // for follow-up feedback / trace lookup
  intent: IntentEnvelope;
  date_range: { start: string; end: string; method: string };
  recipe: Recipe;      // shown to user as "here's how I scored"
  windows: Array<{
    date: string;
    score: number;     // 0-100
    rank: number;
    reasoning: string; // generated from recipe.note fields
  }>;
  cost: { total_usd: number; latency_ms: number };
  // present only when debug=true:
  trace?: TraceRecord;
}
```

### `GET /optimal-timing/v2/traces/:request_id`

Fetch a single trace. Auth: admin or trace owner.

### `POST /optimal-timing/v2/feedback/recipe`
### `POST /optimal-timing/v2/feedback/outcome`
### `POST /optimal-timing/v2/feedback/reaction`

See `../feedback/README.md` for payloads.

## Migration plan

1. Ship v2 endpoints behind a feature flag (env var
   `OPTIMAL_TIMING_V2_ENABLED=true`).
2. Frontend optionally shows a "Try v2" toggle for opted-in users.
3. After a month of parallel run with eval-harness parity, flip
   `/optimal-timing/find-ai` to call v2 internally; keep v1 code
   accessible via `?engine=v1` query param for fallback.
4. After another month with no regressions, delete v1.

## Wiring into existing app

`backend/src/app.ts` registers routes via Express. Add:

```ts
import { v2Router } from './optimal-timing/v2/api/router';
app.use('/optimal-timing/v2', v2Router);
```

The router is the only export this folder publishes outward. Other
v2 modules are internal.

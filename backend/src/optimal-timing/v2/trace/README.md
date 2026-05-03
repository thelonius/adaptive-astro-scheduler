# Trace

Persistence of `TraceRecord`s. The trace is the spine of v2 — debug
UI, feedback collection, and eval harness all consume it.

## Files

- `recorder.ts` — class that accumulates a partial `TraceRecord`
  across pipeline stages. Each stage calls
  `recorder.recordStage('intent', stageOutput)` and `recorder.build()`
  produces the final immutable record at the end.
- `store.ts` — persistence backend. **Phase 1: JSONL files** in
  `var/traces/YYYY-MM-DD.jsonl`, one trace per line. Easy to grep,
  no infra. **Phase 2: Postgres** with a `traces` table (JSONB
  column + indexed `request_id`, `user_id`, `timestamp`). Migrate
  when JSONL files exceed ~1GB or you need cross-trace queries.
- `viewer-api.ts` — REST endpoint `GET /optimal-timing/v2/traces/:id`
  for the debug UI. Auth-gated to admin and to the user who owns
  the trace.

## JSONL format

One trace per line, raw JSON. Always include trailing newline.
Filename pattern: `{YYYY-MM-DD}.jsonl` based on trace.timestamp UTC.

```
{"request_id":"...","timestamp":"2026-05-01T14:23:00Z",...}
{"request_id":"...","timestamp":"2026-05-01T14:25:11Z",...}
```

Reads use `readline` for line-by-line streaming.

## Privacy

- `user_prompt` is personal data. Encrypt at rest if storing for
  >30 days. Hash `user_id` for analytics queries.
- `raw_response` field on LLMStage — only persisted when
  `debug_mode: true`. Otherwise null.
- TTL: 90 days for general traces, 1 year for traces with feedback
  attached (they're training data).
- Honor user data-deletion requests by hashing `user_id` to a
  tombstone value while keeping the rest of the trace for stats.

## Versioning the trace itself

The `TraceVersions` field captures the versions of every component
that influenced the output. If you ever need to reproduce an old
trace's behavior, you check out the matching code revision per
`app_revision` and run with the same model/prompt versions. Without
this, regressions become impossible to diagnose.

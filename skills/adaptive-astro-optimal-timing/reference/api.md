# Optimal timing v2 API (client reference)

Base: `$ASTRO_API_URL` (no trailing slash)

## `GET /health`

## `GET /api/optimal-timing/v2/recipes`

Returns `{ recipes: [{ id, intent, rationale, … }] }`.

## `POST /api/optimal-timing/v2/find-with-intent`

```json
{
  "intent": "sign a rental agreement",
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "location": { "latitude": 55.7558, "longitude": 37.6173, "timezone": "Europe/Moscow" },
  "top_n": 5,
  "language": "en",
  "natal_chart_id": "optional-uuid"
}
```

## `POST /api/optimal-timing/v2/find-with-fixed-recipe`

```json
{
  "recipe_id": "mercury_matters",
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "location": { "latitude": 55.7558, "longitude": 37.6173, "timezone": "Europe/Moscow" },
  "user_prompt": "sign contract",
  "top_n": 5
}
```

Canonical `recipe_id` values: `business_launch`, `marriage_relationship`, `mercury_matters`, `mars_matters`, `jupiter_matters`.

## `GET /api/optimal-timing/v2/traces/:id`

Debug / analytics for a prior request.

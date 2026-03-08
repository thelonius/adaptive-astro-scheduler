# API Documentation

## Lunar Calendar API v1.0.0

Base URL: `http://localhost:8000/api/v1`

---

## Endpoints

### 1. Get Lunar Day Information

**GET** `/lunar-day`

Get comprehensive lunar day information for a specific date.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string (YYYY-MM-DD) | No | Target date (defaults to today) |

#### Response

```json
{
  "lunar_day": 15,
  "gregorian_date": "2025-10-27",
  "moon_phase": {
    "name": "Full Moon",
    "illumination": 99.8,
    "is_waxing": false,
    "emoji": "🌕"
  },
  "color_palette": {
    "base_colors": ["#8B008B", "#9370DB"],
    "gradient": ["#000000", "#1A001A", ..., "#9370DB"]
  },
  "health": {
    "affected_organs": ["reproductive system", "creative organs"],
    "affected_body_parts": ["lower abdomen", "sacral area"],
    "health_tips": ["Balance hormones", "Rest if needed"]
  },
  "recommendations": {
    "recommended": ["Dealing with temptations", "Shadow work"],
    "not_recommended": ["Giving in to vices", "Excess"]
  },
  "planetary_influence": {
    "dominant_planet": "Moon",
    "additional_influences": ["Neptune", "Pluto"],
    "description": "Moon reveals shadows..."
  },
  "general_description": "A challenging day of illusions..."
}
```

#### cURL Example

```bash
curl "http://localhost:8000/api/v1/lunar-day?date=2025-10-27"
```

---

### 2. Get Moon Phase

**GET** `/moon-phase`

Get moon phase information for a specific date.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string (YYYY-MM-DD) | No | Target date (defaults to today) |

#### Response

```json
{
  "name": "Waxing Gibbous",
  "illumination": 87.3,
  "is_waxing": true,
  "emoji": "🌔"
}
```

#### cURL Example

```bash
curl "http://localhost:8000/api/v1/moon-phase"
```

---

### 3. Find Best Days for Activity

**POST** `/best-days`

Find the best upcoming days for a specific activity.

#### Request Body

```json
{
  "activity": "haircut",
  "start_date": "2025-10-27",
  "days_ahead": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| activity | string | Yes | Type of activity |
| start_date | string (YYYY-MM-DD) | No | Start date (defaults to today) |
| days_ahead | integer | No | Days to search (default: 30, max: 365) |

#### Supported Activities

- `haircut` - Hair cutting and styling
- `new_project` - Starting new projects
- `travel` - Journeys and trips
- `business` - Business activities
- `love` - Romantic activities
- `health` - Health and wellness
- `surgery` - Medical procedures
- `study` - Learning and education
- `meditation` - Spiritual practices
- `sport` - Physical activities
- `cleaning` - Cleaning and organizing
- `wedding` - Marriage ceremonies
- `moving` - Relocation
- `finance` - Financial decisions
- `communication` - Important conversations
- `creativity` - Creative work
- `rest` - Recovery and relaxation
- Any custom activity

#### Response

```json
{
  "activity": "haircut",
  "search_period": {
    "start": "2025-10-27",
    "end": "2025-11-26"
  },
  "best_days": [
    {
      "date": "2025-11-01",
      "lunar_day": 3,
      "moon_phase": "Waxing Crescent",
      "score": 85.0,
      "reason": "Lunar day 3: Recommended: beauty, Perfect for new beginnings"
    },
    {
      "date": "2025-11-15",
      "lunar_day": 17,
      "moon_phase": "Full Moon",
      "score": 72.5,
      "reason": "Lunar day 17: Recommended: appearance"
    }
  ]
}
```

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/v1/best-days" \
  -H "Content-Type: application/json" \
  -d '{
    "activity": "haircut",
    "days_ahead": 30
  }'
```

---

### 4. Get Lunar Calendar

**GET** `/lunar-calendar`

Get lunar calendar information for a range of dates.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string (YYYY-MM-DD) | No | Start date (defaults to today) |
| days | integer | No | Number of days (default: 30, max: 90) |

#### Response

Returns an array of lunar day information objects (same structure as `/lunar-day` endpoint).

#### cURL Example

```bash
curl "http://localhost:8000/api/v1/lunar-calendar?start_date=2025-10-27&days=7"
```

---

### 5. Health Check

**GET** `/health`

Check API health status.

#### Response

```json
{
  "status": "healthy",
  "service": "Lunar Calendar API",
  "version": "1.0.0"
}
```

---

## Python Examples

### Using `requests` library

```python
import requests

# Get today's lunar day
response = requests.get("http://localhost:8000/api/v1/lunar-day")
data = response.json()
print(f"Lunar Day: {data['lunar_day']}")

# Find best days for travel
response = requests.post(
    "http://localhost:8000/api/v1/best-days",
    json={
        "activity": "travel",
        "days_ahead": 60
    }
)
best_days = response.json()
for day in best_days['best_days'][:3]:
    print(f"{day['date']}: Score {day['score']}")
```

### Using `httpx` library (async)

```python
import httpx
import asyncio

async def get_lunar_info():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/v1/lunar-day",
            params={"date": "2025-12-31"}
        )
        return response.json()

data = asyncio.run(get_lunar_info())
```

---

## JavaScript Examples

### Using `fetch` API

```javascript
// Get moon phase
fetch('http://localhost:8000/api/v1/moon-phase')
  .then(response => response.json())
  .then(data => {
    console.log(`Moon Phase: ${data.name} ${data.emoji}`);
    console.log(`Illumination: ${data.illumination}%`);
  });

// Find best days for new project
fetch('http://localhost:8000/api/v1/best-days', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    activity: 'new project',
    days_ahead: 30
  })
})
  .then(response => response.json())
  .then(data => {
    console.log('Best days:', data.best_days);
  });
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 404 Not Found
```json
{
  "detail": "No data available for lunar day X"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error message"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider adding rate limiting middleware.

---

## CORS

The API supports CORS for the following origins (configurable in `.env`):
- http://localhost:3000
- http://localhost:8000
- http://127.0.0.1:3000
- http://127.0.0.1:8000

---

## Data Customization

To customize lunar day data:

1. Edit `app/data/lunar_days.json`
2. Follow the existing structure for each lunar day
3. Restart the server

Each lunar day entry should include:
- `lunar_day`: Number (1-30)
- `base_colors`: Array of hex colors
- `affected_organs`: Array of organ names
- `affected_body_parts`: Array of body parts
- `health_tips`: Array of health tips
- `recommended`: Array of recommended activities
- `not_recommended`: Array of activities to avoid
- `dominant_planet`: Main planet name
- `additional_influences`: Array of additional influences
- `planetary_description`: Description text
- `general_description`: General description text

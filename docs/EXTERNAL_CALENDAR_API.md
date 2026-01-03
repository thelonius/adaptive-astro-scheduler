# External Calendar API Specification

**Version:** 1.0
**Status:** Public API Specification
**Last Updated:** January 2, 2026

---

## Overview

The **External Calendar API** allows third-party applications to integrate Adaptive Astro-Scheduler's calendar and recommendation system. This API is designed to be consumed by external services, mobile apps, websites, and integrations.

**Base URL:** `https://api.adaptive-astro.app/v1`

**Authentication:** API Key (Bearer token) or OAuth 2.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Usage Examples](#usage-examples)
5. [Rate Limits](#rate-limits)
6. [Webhooks](#webhooks)
7. [Error Handling](#error-handling)
8. [SDKs & Libraries](#sdks--libraries)

---

## Authentication

### API Key Authentication

```http
GET /v1/calendar/day
Authorization: Bearer YOUR_API_KEY
```

### OAuth 2.0 (Coming in Phase 5)

```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## API Endpoints

### 1. Calendar Operations

#### GET `/calendar/day`

Get calendar data for a single day.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string (ISO 8601) | Yes | Date to query |
| `latitude` | number | Yes | Location latitude |
| `longitude` | number | Yes | Location longitude |
| `timezone` | string | No | IANA timezone (default: UTC) |
| `userId` | string | No | User ID for personalized data |

**Example Request:**
```http
GET /v1/calendar/day?date=2026-01-15&latitude=55.7558&longitude=37.6173&timezone=Europe/Moscow
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-15T00:00:00Z",
    "lunarDay": {
      "number": 12,
      "symbol": "Сердце",
      "energy": "Light",
      "lunarPhase": "Waxing"
    },
    "moonSign": {
      "name": "Телец",
      "element": "Земля"
    },
    "recommendations": {
      "bestFor": ["Финансовые операции", "Стрижка волос"],
      "avoidFor": ["Важные решения"],
      "strength": 0.87,
      "reasons": [
        "✅ Растущая Луна в земном знаке",
        "✅ Лунный день 12 благоприятен для денег",
        "✅ Нет Луны без курса"
      ],
      "warnings": []
    },
    "voidOfCourseMoon": null,
    "retrogradesActive": [],
    "eclipseWindow": false
  },
  "meta": {
    "timestamp": "2026-01-02T10:30:00Z",
    "cached": true
  }
}
```

---

#### GET `/calendar/month`

Get calendar data for an entire month.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | Yes | Year (e.g., 2026) |
| `month` | number | Yes | Month (1-12) |
| `latitude` | number | Yes | Location latitude |
| `longitude` | number | Yes | Location longitude |
| `timezone` | string | No | IANA timezone |
| `userId` | string | No | User ID for personalized data |

**Example Request:**
```http
GET /v1/calendar/month?year=2026&month=2&latitude=55.7558&longitude=37.6173
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 2,
    "days": [
      {
        "date": "2026-02-01T00:00:00Z",
        "lunarDay": {...},
        "recommendations": {...}
      },
      // ... 27 more days
    ]
  }
}
```

---

#### GET `/calendar/year`

Get calendar data for an entire year (summary format).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | number | Yes | Year (e.g., 2026) |
| `latitude` | number | Yes | Location latitude |
| `longitude` | number | Yes | Location longitude |
| `timezone` | string | No | IANA timezone |

**Response:** Array of 12 month objects (same as `/month` endpoint).

---

### 2. Recommendations

#### POST `/recommendations/find-best-days`

Find best days for a specific activity within a date range.

**Request Body:**
```json
{
  "userId": "user_123",
  "activityType": "Стрижка волос",
  "dateRange": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "minStrength": 0.7,
  "limit": 5,
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "date": "2026-02-08",
        "strength": 0.92,
        "reasons": [
          "✅ Растущая Луна в Овне (огненная энергия)",
          "✅ Лунный день 5 (благоприятный)",
          "✅ Венера в трине к натальной Луне"
        ],
        "warnings": []
      },
      {
        "date": "2026-02-15",
        "strength": 0.85,
        "reasons": [
          "✅ Полнолуние в Льве (сила)",
          "✅ Нет ретроградных планет"
        ],
        "warnings": [
          "⚠️ Полнолуние может усилить эмоции"
        ]
      }
    ],
    "totalFound": 7,
    "query": {
      "activityType": "Стрижка волос",
      "dateRange": {
        "start": "2026-02-01",
        "end": "2026-02-28"
      }
    }
  }
}
```

---

### 3. Natal Chart Operations

#### POST `/natal-chart/create`

Create or update a user's natal chart.

**Request Body:**
```json
{
  "userId": "user_123",
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "birthLocation": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "natalChartId": "chart_abc123",
    "userId": "user_123",
    "planets": {
      "sun": {
        "name": "Sun",
        "longitude": 54.2,
        "zodiacSign": {"name": "Телец"}
      },
      "moon": {...},
      "mercury": {...}
      // ... other planets
    },
    "houses": {...},
    "createdAt": "2026-01-02T10:30:00Z"
  }
}
```

---

#### GET `/natal-chart/:userId`

Retrieve a user's natal chart.

**Example Request:**
```http
GET /v1/natal-chart/user_123
Authorization: Bearer YOUR_API_KEY
```

**Response:** Same as create response.

---

#### DELETE `/natal-chart/:userId`

Delete a user's natal chart.

**Response:**
```json
{
  "success": true,
  "message": "Natal chart deleted successfully"
}
```

---

### 4. Custom Rules & Layers

#### POST `/custom-layers/create`

Create a custom recommendation layer.

**Request Body:**
```json
{
  "userId": "user_123",
  "name": "Мои правила для трейдинга",
  "description": "Правила для открытия лонг-позиций",
  "category": "finance",
  "mode": "llm",
  "llmData": {
    "userPrompt": "Я трейдер. Хочу знать хорошие дни для открытия лонг-позиций. Предпочитаю когда Юпитер в аспекте к моему натальному Солнцу."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "layerId": "layer_xyz789",
    "status": "processing",
    "estimatedCompletion": "2026-01-02T10:35:00Z"
  }
}
```

---

#### GET `/custom-layers/:userId`

Get all custom layers for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "layers": [
      {
        "layerId": "layer_xyz789",
        "name": "Мои правила для трейдинга",
        "category": "finance",
        "status": "active",
        "createdAt": "2026-01-02T10:30:00Z"
      }
    ]
  }
}
```

---

### 5. Activity Outcomes & Feedback

#### POST `/outcomes/log`

Log outcome of an activity (for learning system).

**Request Body:**
```json
{
  "userId": "user_123",
  "activityType": "Стрижка волос",
  "scheduledDate": "2026-01-15",
  "outcomeRating": 5,
  "feedback": "Отличный результат! Волосы растут быстрее."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "outcomeId": "outcome_123",
    "message": "Feedback recorded. System will learn from this."
  }
}
```

---

### 6. Health Check

#### GET `/health`

Check API status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "up",
    "redis": "up",
    "ephemeris": "up"
  }
}
```

---

## Data Models

### CalendarDay

```typescript
{
  date: string                    // ISO 8601
  lunarDay: {
    number: number                // 1-30
    symbol: string
    energy: "Light" | "Dark" | "Neutral"
    lunarPhase: "New" | "Waxing" | "Full" | "Waning"
  }
  moonSign: {
    name: string                  // "Овен", "Телец", etc.
    element: string               // "Огонь", "Земля", etc.
  }
  recommendations: {
    bestFor: string[]
    avoidFor: string[]
    strength: number              // 0.0 - 1.0
    reasons: string[]
    warnings: string[]
  }
  voidOfCourseMoon: {
    startTime: string
    endTime: string
    sign: string
    duration: number
  } | null
  retrogradesActive: string[]     // Planet names
  eclipseWindow: boolean
}
```

---

## Usage Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios'

const API_KEY = 'your_api_key'
const BASE_URL = 'https://api.adaptive-astro.app/v1'

async function getBestDaysForHaircut() {
  const response = await axios.post(
    `${BASE_URL}/recommendations/find-best-days`,
    {
      userId: 'user_123',
      activityType: 'Стрижка волос',
      dateRange: {
        start: '2026-02-01',
        end: '2026-02-28'
      },
      minStrength: 0.7,
      location: {
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 'Europe/Moscow'
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  return response.data.data.recommendations
}
```

### Python

```python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://api.adaptive-astro.app/v1'

def get_calendar_day(date, lat, lng):
    response = requests.get(
        f'{BASE_URL}/calendar/day',
        params={
            'date': date,
            'latitude': lat,
            'longitude': lng,
            'timezone': 'Europe/Moscow'
        },
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    return response.json()['data']

# Usage
day_data = get_calendar_day('2026-01-15', 55.7558, 37.6173)
print(day_data['recommendations']['bestFor'])
```

### cURL

```bash
curl -X POST https://api.adaptive-astro.app/v1/recommendations/find-best-days \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "Стрижка волос",
    "dateRange": {
      "start": "2026-02-01",
      "end": "2026-02-28"
    },
    "location": {
      "latitude": 55.7558,
      "longitude": 37.6173
    }
  }'
```

---

## Rate Limits

| Tier | Requests/Hour | Requests/Day | Price |
|------|---------------|--------------|-------|
| Free | 100 | 1,000 | $0 |
| Basic | 1,000 | 10,000 | $29/mo |
| Pro | 10,000 | 100,000 | $99/mo |
| Enterprise | Unlimited | Unlimited | Custom |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1641038400
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 3600 seconds.",
    "details": {
      "retryAfter": 3600
    }
  }
}
```

---

## Webhooks

Subscribe to events (Coming in Phase 5).

### Available Events

- `natal_chart.created` - New natal chart created
- `custom_layer.ready` - Custom layer processing complete
- `voc_moon.started` - Void of Course Moon begins
- `voc_moon.ended` - Void of Course Moon ends
- `retrograde.started` - Planet goes retrograde
- `retrograde.ended` - Planet goes direct

### Webhook Payload

```json
{
  "event": "voc_moon.started",
  "timestamp": "2026-01-15T14:30:00Z",
  "data": {
    "sign": "Телец",
    "startTime": "2026-01-15T14:30:00Z",
    "endTime": "2026-01-15T18:45:00Z",
    "duration": 4.25
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  },
  "meta": {
    "timestamp": "2026-01-02T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `EPHEMERIS_UNAVAILABLE` | 503 | Ephemeris calculation failed |

---

## SDKs & Libraries

### Official SDKs

- **JavaScript/TypeScript** - `npm install @adaptive-astro/sdk`
- **Python** - `pip install adaptive-astro`
- **Ruby** - `gem install adaptive_astro` (Coming Soon)
- **Go** - `go get github.com/adaptive-astro/go-sdk` (Coming Soon)

### Example: TypeScript SDK

```typescript
import { AdaptiveAstroClient } from '@adaptive-astro/sdk'

const client = new AdaptiveAstroClient({
  apiKey: 'YOUR_API_KEY'
})

// Get calendar day
const day = await client.calendar.getDay({
  date: '2026-01-15',
  location: { latitude: 55.7558, longitude: 37.6173 }
})

// Find best days
const recommendations = await client.recommendations.findBestDays({
  activityType: 'Стрижка волос',
  dateRange: { start: '2026-02-01', end: '2026-02-28' }
})

// Create natal chart
const chart = await client.natalChart.create({
  userId: 'user_123',
  birthDate: '1990-05-15',
  birthTime: '14:30',
  birthLocation: { latitude: 55.7558, longitude: 37.6173 }
})
```

---

## Versioning

The API uses URL versioning: `/v1`, `/v2`, etc.

**Current Version:** `v1`
**Deprecation Policy:** Versions supported for minimum 12 months after new version release.

---

## Support

- **Documentation:** https://docs.adaptive-astro.app
- **API Status:** https://status.adaptive-astro.app
- **Support Email:** api-support@adaptive-astro.app
- **Discord Community:** https://discord.gg/adaptive-astro

---

## Changelog

### v1.0.0 (2026-01-02)
- Initial API release
- Calendar endpoints
- Recommendation system
- Natal chart management
- Custom layers (LLM-powered)

---

**End of Document**

# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. Authentication will be added in Phase 6.

## Response Format

All API responses follow this format:

```json
{
  "status": "success" | "error",
  "data": { ... } | [ ... ],
  "message": "Optional message"
}
```

## Endpoints

### Health Check

#### Get Server Health
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### Layer Management

#### Get All Layers
```http
GET /api/layers
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "transit",
      "name": "Transit Layer",
      "description": "Current planetary transits affecting the natal chart",
      "type": "transit",
      "priority": 10,
      "active": true,
      "config": {
        "planets": ["Sun", "Moon", "Mercury", "Venus", "Mars"],
        "aspects": ["Conjunction", "Sextile", "Square", "Trine", "Opposition"],
        "orb": 8
      },
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### Get Specific Layer
```http
GET /api/layers/:id
```

**Parameters:**
- `id` (string) - Layer ID

#### Create Custom Layer
```http
POST /api/layers
```

**Request Body:**
```json
{
  "name": "My Custom Layer",
  "description": "A custom layer for specific tracking",
  "config": {
    "customSetting": "value"
  }
}
```

#### Update Layer
```http
PATCH /api/layers/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "priority": 7,
  "config": {
    "newSetting": "value"
  }
}
```

#### Delete Layer
```http
DELETE /api/layers/:id
```

**Note:** Only custom layers can be deleted. Default layers (transit, progression, solar_return) cannot be deleted.

#### Toggle Layer
```http
POST /api/layers/:id/toggle
```

Toggles the active state of a layer.

---

### Ephemeris

#### Get Full Ephemeris
```http
GET /api/ephemeris?date=YYYY-MM-DD&latitude=LAT&longitude=LON
```

**Query Parameters:**
- `date` (string, required) - Date in ISO format
- `latitude` (number, required) - Observer latitude (-90 to 90)
- `longitude` (number, required) - Observer longitude (-180 to 180)

**Response:**
```json
{
  "status": "success",
  "data": {
    "date": "2024-01-01T00:00:00.000Z",
    "planets": [
      {
        "name": "Sun",
        "longitude": 280.12,
        "latitude": 0.00,
        "distance": 0.98,
        "sign": "Capricorn",
        "degree": 10.12
      }
    ],
    "houses": [
      {
        "number": 1,
        "cusp": 45.67,
        "sign": "Taurus"
      }
    ]
  }
}
```

#### Get Planet Positions
```http
GET /api/ephemeris/planets?date=YYYY-MM-DD
```

**Query Parameters:**
- `date` (string, required) - Date in ISO format

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "name": "Mercury",
      "longitude": 295.45,
      "latitude": 1.23,
      "distance": 0.85,
      "sign": "Capricorn",
      "degree": 25.45
    }
  ]
}
```

#### Calculate Aspect
```http
GET /api/ephemeris/aspect?longitude1=45&longitude2=135
```

**Query Parameters:**
- `longitude1` (number, required) - First longitude (0-360)
- `longitude2` (number, required) - Second longitude (0-360)

**Response:**
```json
{
  "status": "success",
  "data": {
    "type": "Square",
    "orb": 0.5
  }
}
```

---

### Natal Charts

#### Create Natal Chart
```http
POST /api/charts
```

**Request Body:**
```json
{
  "name": "John Doe",
  "birthDate": "1990-01-15T10:30:00Z",
  "birthTime": "10:30",
  "birthPlace": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "USA"
  },
  "planets": [],
  "houses": [],
  "aspects": []
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "chart_id_here",
    "name": "John Doe",
    "birthDate": "1990-01-15T10:30:00.000Z",
    "birthTime": "10:30",
    "birthPlace": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "city": "New York",
      "country": "USA"
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get All Charts
```http
GET /api/charts
```

#### Get Specific Chart
```http
GET /api/charts/:id
```

---

### Rules

#### Create Rule
```http
POST /api/rules
```

**Request Body:**
```json
{
  "name": "Morning Meetings",
  "description": "Best times for important meetings",
  "natalChartId": "chart_id_here",
  "conditions": [
    {
      "type": "transit",
      "planet": "Sun",
      "operator": "in",
      "value": "10th house"
    }
  ],
  "actions": [
    {
      "type": "suggest_time",
      "priority": 8,
      "metadata": {
        "timeRange": "morning",
        "activity": "meetings"
      }
    }
  ],
  "active": true
}
```

#### Get Rules
```http
GET /api/rules
GET /api/rules?natalChartId=chart_id_here
```

**Query Parameters:**
- `natalChartId` (string, optional) - Filter by chart ID

#### Get Specific Rule
```http
GET /api/rules/:id
```

---

### LLM Integration

#### Generate Rule with AI
```http
POST /api/llm/generate-rule
```

**Request Body:**
```json
{
  "natalChartId": "chart_id_here",
  "request": "Suggest best times for creative work based on my chart"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "rule_id_here",
    "name": "Creative Work Timing",
    "description": "Optimal times for creative activities based on 5th house transits",
    "natalChartId": "chart_id_here",
    "conditions": [
      {
        "type": "transit",
        "planet": "Venus",
        "house": 5,
        "operator": "in",
        "value": "5th house"
      }
    ],
    "actions": [
      {
        "type": "suggest_time",
        "priority": 7,
        "metadata": {
          "activity": "creative_work",
          "reason": "Venus transiting 5th house enhances creativity"
        }
      }
    ],
    "generated": true,
    "generatedBy": "openai-gpt4",
    "prompt": "Suggest best times for creative work based on my chart",
    "active": true
  }
}
```

#### Explain Rule
```http
GET /api/llm/explain-rule/:ruleId
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "explanation": "This rule suggests scheduling creative activities when Venus transits your 5th house. Venus governs creativity and aesthetics, while the 5th house represents creative expression. This combination enhances artistic abilities and makes it an ideal time for creative work."
  }
}
```

---

### Outcomes

#### Create Outcome
```http
POST /api/outcomes
```

**Request Body:**
```json
{
  "natalChartId": "chart_id_here",
  "ruleId": "rule_id_here",
  "eventDate": "2024-01-15T14:00:00Z",
  "scheduledTime": "2024-01-15T14:00:00Z",
  "actualTime": "2024-01-15T14:15:00Z",
  "eventType": "meeting",
  "success": true,
  "rating": 8,
  "notes": "Meeting went very well",
  "transitData": {
    "planets": [],
    "aspects": []
  }
}
```

#### Get Outcomes
```http
GET /api/outcomes
GET /api/outcomes?natalChartId=chart_id_here
GET /api/outcomes?ruleId=rule_id_here
```

**Query Parameters:**
- `natalChartId` (string, optional) - Filter by chart ID
- `ruleId` (string, optional) - Filter by rule ID

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

### Example Error:
```json
{
  "status": "error",
  "message": "Natal chart not found"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. Rate limiting will be added in Phase 7.

---

## WebSocket Support

WebSocket support for real-time updates is planned for Phase 7.

---

## Pagination

For endpoints returning lists, pagination will be added in future phases:

```http
GET /api/charts?page=1&limit=10
```

---

## Versioning

API versioning will be implemented in future phases:

```http
GET /api/v1/charts
GET /api/v2/charts
```

---

## Additional Resources

- [GitHub Repository](https://github.com/thelonius/adaptive-astro-scheduler)
- [Roadmap](./roadmap.md)
- [README](../README.md)

---

**Last Updated:** January 2026

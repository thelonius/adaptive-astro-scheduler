# 🌙 Lunar Calendar API - Project Summary

## Overview

A modern, production-ready FastAPI backend service that provides comprehensive lunar calendar information, including lunar day calculations, moon phases, color palettes, health recommendations, and activity planning based on the lunar cycle.

## ✨ Key Features

### 🎯 Core Functionality
- **Lunar Day Calculation**: Accurate lunar day (1-30) for any date using PyEphem astronomical calculations
- **Moon Phase Information**: Real-time moon phase with illumination percentage and emoji representation
- **Color Palette Generation**: Auto-generated gradient color palettes based on lunar day colors
- **Health Aspects**: Information about affected organs, body parts, and health tips
- **Activity Recommendations**: Things to do and avoid for each lunar day
- **Planetary Influences**: Astrological impacts and dominant planets
- **Best Days Finder**: Smart algorithm to find optimal upcoming days for specific activities

### 🛠️ Technical Features
- **Modern FastAPI**: Fast, async-capable web framework with automatic OpenAPI docs
- **Type Safety**: Full Pydantic model validation throughout
- **CORS Enabled**: Ready for frontend integration
- **Comprehensive API**: RESTful endpoints with proper HTTP methods
- **Error Handling**: Graceful error responses with meaningful messages
- **Modular Architecture**: Clean separation of concerns (models, services, API)
- **Docker Support**: Ready for containerized deployment
- **Test Coverage**: Pytest tests for all major endpoints

## 📂 Project Structure

```
lunar-calendar-api/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration using Pydantic Settings
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── lunar_day.py             # Pydantic models for all data structures
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── lunar_calculator.py      # Lunar day & moon phase calculations
│   │   ├── color_generator.py       # Color palette generation with gradients
│   │   └── activity_finder.py       # Find best days for activities
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py         # API route handlers
│   │
│   └── data/
│       └── lunar_days.json          # Lunar day data (all 30 days included)
│
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
├── run.py                           # Server runner script
├── examples.py                      # Usage examples with requests library
├── test_api.py                      # Pytest test suite
├── demo.html                        # Simple frontend demo
├── Dockerfile                       # Docker configuration
├── docker-compose.yml               # Docker Compose setup
├── setup.sh                         # Automated setup script (macOS/Linux)
├── start.sh                         # Server start script
├── README.md                        # Main documentation
├── QUICKSTART.md                    # Quick start guide
└── API_DOCUMENTATION.md             # Detailed API reference
```

## 🔌 API Endpoints

### Base URL: `/api/v1`

1. **GET /lunar-day** - Get comprehensive lunar day information
   - Query params: `date` (optional, YYYY-MM-DD)
   - Returns: Lunar day, moon phase, colors, health, recommendations, etc.

2. **GET /moon-phase** - Get moon phase information
   - Query params: `date` (optional, YYYY-MM-DD)
   - Returns: Phase name, illumination, waxing/waning, emoji

3. **POST /best-days** - Find best days for an activity
   - Body: `{activity, start_date?, days_ahead?}`
   - Returns: List of recommended dates with scores and reasons

4. **GET /lunar-calendar** - Get lunar calendar for date range
   - Query params: `start_date?`, `days?` (max 90)
   - Returns: Array of lunar day information

5. **GET /health** - Health check endpoint

## 🧩 Core Components

### 1. Lunar Calculator (`lunar_calculator.py`)
- Uses PyEphem for astronomical calculations
- Calculates lunar day based on moon cycle
- Determines moon phase and illumination
- Reference point: January 6, 2000 New Moon

### 2. Color Generator (`color_generator.py`)
- Creates smooth color gradients between base colors
- Supports multi-color palettes
- RGB/Hex color conversion
- Monochrome gradient fallback

### 3. Activity Finder (`activity_finder.py`)
- Keyword-based activity matching
- Scoring algorithm (0-100)
- Special day bonuses for specific activities
- Searches up to 365 days ahead

### 4. Data Models (`lunar_day.py`)
- `LunarDayInfo`: Complete lunar day information
- `MoonPhase`: Moon phase details
- `ColorPalette`: Base colors and gradients
- `HealthAspect`: Health information
- `Recommendations`: Activity recommendations
- `PlanetaryInfluence`: Astrological data
- `ActivityRequest`: Activity search parameters
- `BestDaysResponse`: Best days results

## 📊 Data Structure

### Lunar Day JSON Format
Each of the 30 lunar days includes:
- Base colors (hex codes)
- Affected organs and body parts
- Health tips
- Recommended activities
- Not recommended activities
- Dominant planet
- Additional planetary influences
- Planetary description
- General description

**All 30 lunar days are fully populated with data!**

## 🚀 Quick Start

### Installation
```bash
cd /tmp/lunar-calendar-api
chmod +x setup.sh
./setup.sh
```

### Running
```bash
# Option 1: Use start script
./start.sh

# Option 2: Direct execution
source venv/bin/activate
python run.py

# Option 3: Docker
docker-compose up -d
```

### Testing
```bash
# Run tests
pytest test_api.py -v

# Run examples
python examples.py

# Open demo in browser
open demo.html
```

## 🎨 Usage Examples

### Python
```python
import requests

# Get today's lunar info
r = requests.get("http://localhost:8000/api/v1/lunar-day")
print(r.json()['lunar_day'])

# Find best haircut days
r = requests.post(
    "http://localhost:8000/api/v1/best-days",
    json={"activity": "haircut", "days_ahead": 30}
)
print(r.json()['best_days'][0]['date'])
```

### JavaScript
```javascript
// Fetch lunar day
fetch('http://localhost:8000/api/v1/lunar-day')
  .then(r => r.json())
  .then(data => console.log(data));

// Find best days
fetch('http://localhost:8000/api/v1/best-days', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({activity: 'travel', days_ahead: 60})
})
  .then(r => r.json())
  .then(data => console.log(data.best_days));
```

### cURL
```bash
# Get lunar day
curl "http://localhost:8000/api/v1/lunar-day?date=2025-10-27"

# Find best days
curl -X POST "http://localhost:8000/api/v1/best-days" \
  -H "Content-Type: application/json" \
  -d '{"activity": "new project", "days_ahead": 30}'
```

## 🔧 Configuration

### Environment Variables (.env)
- `API_HOST`: Server host (default: 0.0.0.0)
- `API_PORT`: Server port (default: 8000)
- `API_RELOAD`: Auto-reload on changes (default: true)
- `CORS_ORIGINS`: Allowed CORS origins

### Customizing Data
Edit `app/data/lunar_days.json` to modify:
- Color palettes
- Health information
- Recommendations
- Planetary influences
- Descriptions

## 📦 Dependencies

- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **PyEphem**: Astronomical calculations
- **NumPy**: Numerical operations for colors
- **Python-dateutil**: Date handling
- **Pytest**: Testing framework
- **Requests**: HTTP client for examples

## 🎯 Supported Activities

Pre-configured activity keywords:
- Haircut, New Project, Travel, Business, Love
- Health, Surgery, Study, Meditation, Sport
- Cleaning, Wedding, Moving, Finance
- Communication, Creativity, Rest, Forgiveness
- And any custom activity!

## 📈 Activity Scoring Algorithm

The system scores days (0-100) based on:
- ✅ +30 points: Activity in recommended list
- ❌ -40 points: Activity in not-recommended list
- 📝 +15 points: Mentioned in description
- 🪐 +10 points: Planetary support
- ⭐ Up to +40 points: Special day bonuses

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📝 Interactive Documentation

When server is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

Tests cover:
- All API endpoints
- Lunar calculations
- Color generation
- Activity finding
- Data validation
- Error handling

Run: `pytest test_api.py -v`

## 🔒 Production Considerations

For production deployment, consider:
- [ ] Add rate limiting
- [ ] Implement caching (Redis)
- [ ] Add authentication/API keys
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure proper CORS origins
- [ ] Use production ASGI server settings
- [ ] Add logging and error tracking
- [ ] Set up CI/CD pipeline
- [ ] Enable HTTPS
- [ ] Add database for user preferences

## 📄 Documentation Files

- `README.md`: Project overview and setup
- `QUICKSTART.md`: Fast setup guide
- `API_DOCUMENTATION.md`: Complete API reference
- `PROJECT_SUMMARY.md`: This file

## 🎉 What Makes This Special

1. **Complete Data**: All 30 lunar days fully documented
2. **Modern Stack**: Latest FastAPI, Pydantic v2, Python 3.11+
3. **Production Ready**: Docker, tests, error handling, docs
4. **Flexible**: Easy to customize colors, recommendations, and data
5. **Smart Algorithm**: Intelligent activity matching and scoring
6. **Beautiful Colors**: Auto-generated smooth gradients
7. **Accurate Astronomy**: PyEphem-based calculations
8. **Developer Friendly**: Full type hints, OpenAPI docs, examples

## 🚀 Next Steps

1. Customize `lunar_days.json` with your preferred data
2. Add more activities to `activity_keywords`
3. Integrate with your frontend application
4. Deploy to production (Railway, Render, AWS, etc.)
5. Add user accounts and preferences
6. Create mobile app integration
7. Add email notifications for best activity days
8. Implement calendar export (iCal)

## 📞 API Access

Once running, access at:
- Local: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 🌟 Highlights

✅ **Zero configuration needed** - Works out of the box
✅ **Type-safe** - Full Pydantic validation
✅ **Auto-documented** - OpenAPI/Swagger UI
✅ **Tested** - Comprehensive test suite
✅ **Dockerized** - Easy deployment
✅ **Extensible** - Modular architecture
✅ **Beautiful** - Color gradients included
✅ **Smart** - AI-like activity matching

---

**Created with FastAPI, Python, and lunar wisdom** 🌙✨

Enjoy building with the Lunar Calendar API!

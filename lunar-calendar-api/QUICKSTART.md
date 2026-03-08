# 🌙 Lunar Calendar API - Quick Start Guide

Welcome to the Lunar Calendar API! This guide will get you up and running in minutes.

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Git (optional)

## 🚀 Quick Setup (macOS)

### Option 1: Automated Setup (Recommended)

```bash
# Navigate to the project directory
cd /tmp/lunar-calendar-api

# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### Option 2: Manual Setup

```bash
# Navigate to the project directory
cd /tmp/lunar-calendar-api

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

## 🎯 Running the Server

### Option 1: Using the run script

```bash
chmod +x start.sh
./start.sh
```

### Option 2: Direct Python execution

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run the server
python run.py
```

The API will start at: **http://localhost:8000**

## 📚 Accessing Documentation

Once the server is running, open your browser and visit:

- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

## 🧪 Testing the API

### Quick Test

Open a new terminal and run:

```bash
# Test health endpoint
curl http://localhost:8000/health

# Get today's lunar day
curl http://localhost:8000/api/v1/lunar-day

# Get moon phase
curl http://localhost:8000/api/v1/moon-phase
```

### Run Example Scripts

```bash
# Activate virtual environment
source venv/bin/activate

# Run examples
python examples.py
```

### Run Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run tests
pytest test_api.py -v
```

## 🎨 Example API Calls

### Get Lunar Day Information

```bash
curl "http://localhost:8000/api/v1/lunar-day?date=2025-10-27"
```

### Find Best Days for Haircut

```bash
curl -X POST "http://localhost:8000/api/v1/best-days" \
  -H "Content-Type: application/json" \
  -d '{
    "activity": "haircut",
    "days_ahead": 30
  }'
```

### Find Best Days for New Project

```bash
curl -X POST "http://localhost:8000/api/v1/best-days" \
  -H "Content-Type: application/json" \
  -d '{
    "activity": "new project",
    "days_ahead": 60
  }'
```

### Get 7-Day Lunar Calendar

```bash
curl "http://localhost:8000/api/v1/lunar-calendar?days=7"
```

## 🔧 Configuration

Edit the `.env` file to customize:

```env
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

## 📊 Key Features

✅ **Lunar Day Calculation** - Accurate lunar day for any date
✅ **Moon Phases** - Current phase with illumination percentage
✅ **Color Palettes** - Auto-generated gradient palettes
✅ **Health Information** - Affected organs and body parts
✅ **Activity Recommendations** - What to do and avoid
✅ **Planetary Influences** - Astrological impacts
✅ **Best Days Finder** - Find optimal days for activities
✅ **Modern FastAPI** - Fast, documented, and type-safe

## 📁 Project Structure

```
lunar-calendar-api/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic
│   │   ├── lunar_calculator.py
│   │   ├── color_generator.py
│   │   └── activity_finder.py
│   ├── api/v1/              # API endpoints
│   └── data/
│       └── lunar_days.json  # Lunar day data
├── requirements.txt
├── run.py
├── examples.py
└── test_api.py
```

## 🎯 Common Use Cases

### 1. Daily Lunar Information Widget

```python
import requests

response = requests.get("http://localhost:8000/api/v1/lunar-day")
data = response.json()

print(f"Today is Lunar Day {data['lunar_day']}")
print(f"Moon Phase: {data['moon_phase']['name']} {data['moon_phase']['emoji']}")
print(f"Recommended: {', '.join(data['recommendations']['recommended'][:3])}")
```

### 2. Activity Planning

```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/best-days",
    json={"activity": "travel", "days_ahead": 90}
)

best_days = response.json()
for day in best_days['best_days'][:5]:
    print(f"{day['date']}: {day['reason']}")
```

### 3. Calendar Integration

```python
import requests
from datetime import date

response = requests.get(
    "http://localhost:8000/api/v1/lunar-calendar",
    params={"start_date": str(date.today()), "days": 30}
)

calendar = response.json()
for day in calendar:
    print(f"{day['gregorian_date']} - Lunar Day {day['lunar_day']}")
```

## 🔄 Customizing Lunar Data

To customize the lunar day information:

1. Open `app/data/lunar_days.json`
2. Edit the data for any lunar day (1-30)
3. Save the file
4. Restart the server

Example structure:
```json
{
  "lunar_day": 1,
  "base_colors": ["#FFFFFF", "#E8F4F8"],
  "affected_organs": ["brain", "pineal gland"],
  "recommended": ["Start new projects", "Set intentions"],
  "not_recommended": ["Finish old projects", "Make final decisions"],
  ...
}
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in .env file
API_PORT=8001
```

### Import Errors

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Module Not Found

```bash
# Run from project root directory
cd /tmp/lunar-calendar-api
python run.py
```

## 📖 More Documentation

- **Full API Documentation**: See `API_DOCUMENTATION.md`
- **Interactive Docs**: http://localhost:8000/docs (when server is running)

## 🎉 You're All Set!

Your Lunar Calendar API is now ready to use. Visit http://localhost:8000/docs to explore all available endpoints.

Happy coding! 🌙✨

# Lunar Calendar API 🌙

A modern FastAPI backend service for lunar calendar information, providing lunar day calculations, color palettes, health recommendations, and activity planning based on moon phases.

## Features

- 🌙 **Lunar Day Calculation**: Calculate lunar day for any given date
- 🎨 **Color Palettes**: Generate gradient color palettes for each lunar day
- 🌓 **Moon Phases**: Get current moon phase information
- 💪 **Health Aspects**: Affected body parts and organ systems
- ✅ **Recommendations**: Things to do and avoid for each lunar day
- 🪐 **Planetary Influences**: Impact of planets and stars
- 📅 **Activity Planning**: Find best upcoming days for specific activities

## Quick Start

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

### Running the Server

```bash
# Development mode
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use the run script
python run.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

## API Endpoints

### Get Lunar Day Information

```bash
GET /api/v1/lunar-day?date=2025-10-27
```

Returns comprehensive lunar day information including:
- Lunar day number
- Moon phase
- Color palette
- Health aspects
- Recommendations
- Planetary influences

### Find Best Days for Activity

```bash
POST /api/v1/best-days
Content-Type: application/json

{
  "activity": "haircut",
  "start_date": "2025-10-27",
  "days_ahead": 30
}
```

Returns upcoming dates that are most favorable for the specified activity.

### Get Moon Phase

```bash
GET /api/v1/moon-phase?date=2025-10-27
```

Returns current moon phase information.

## Project Structure

```
lunar-calendar-api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration settings
│   ├── models/
│   │   ├── __init__.py
│   │   └── lunar_day.py        # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── lunar_calculator.py # Lunar calculations
│   │   ├── color_generator.py  # Color palette generation
│   │   └── activity_finder.py  # Activity recommendations
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py    # API routes
│   └── data/
│       └── lunar_days.json     # Lunar day information
├── requirements.txt
├── .env.example
├── .gitignore
├── run.py
└── README.md
```

## Data Structure

The `lunar_days.json` file contains information for all 30 lunar days. You can customize it with your own data.

## Technologies Used

- **FastAPI**: Modern, fast web framework
- **Pydantic**: Data validation using Python type annotations
- **PyEphem**: Astronomical calculations
- **Uvicorn**: ASGI server
- **NumPy**: Color gradient calculations

## License

MIT

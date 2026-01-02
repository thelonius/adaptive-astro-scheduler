# Adaptive Astro Scheduler

An adaptive astrological scheduling system with LLM-powered rule generation. This application helps users make informed scheduling decisions based on astrological transits, progressions, and custom layers.

## Features

### Backend
- **Express API Server** with TypeScript
- **Layer Registry System** - Manage different astrological layers (transits, progressions, solar returns, custom)
- **Ephemeris Engine** - Calculate planetary positions and aspects using astronomy-engine
- **LLM Rule Generator** - Generate scheduling rules using OpenAI GPT-4
- **Database Models** - MongoDB schemas for natal charts, rules, and outcomes
- **Production-ready**:
  - Centralized error handling
  - Winston logging
  - Configuration management
  - Health check endpoints
  - Request logging middleware

### Frontend
- **React 18** with TypeScript
- **Chakra UI** - Modern, accessible component library
- **Calendar UI** - Interactive calendar with planetary position display
- **Layer Management** - Create and manage custom astrological layers
- **Chart Management** - Create and manage natal charts
- **AI Rule Generation** - Generate scheduling rules using natural language

### Testing
- **Jest** configured for both backend and frontend
- Unit tests for services
- Integration tests for API endpoints
- Test coverage reporting

## Project Structure

```
adaptive-astro-scheduler/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/         # Configuration management
│   │   │   ├── controllers/    # API controllers
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── models/         # Database models
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── utils/          # Utility functions
│   │   │   └── index.ts        # Entry point
│   │   ├── __tests__/          # Test files
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── services/       # API services
│       │   ├── hooks/          # Custom hooks
│       │   ├── types/          # TypeScript types
│       │   ├── utils/          # Utility functions
│       │   ├── App.tsx         # Root component
│       │   └── main.tsx        # Entry point
│       └── package.json
├── docs/                       # Documentation
├── package.json                # Root package.json
└── tsconfig.json               # Root TypeScript config
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- OpenAI API key (for LLM features)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/thelonius/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Configure backend environment:
```bash
cd packages/backend
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `MONGO_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key for LLM features
- `PORT` - Backend server port (default: 3001)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3000)

4. Start development servers:
```bash
# From root directory
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000).

## Usage

### Backend API

#### Health Check
```bash
GET /health
```

#### Layer Management
```bash
GET /api/layers              # Get all layers
GET /api/layers/:id          # Get specific layer
POST /api/layers             # Create custom layer
PATCH /api/layers/:id        # Update layer
DELETE /api/layers/:id       # Delete layer
POST /api/layers/:id/toggle  # Toggle layer active status
```

#### Ephemeris
```bash
GET /api/ephemeris?date=2024-01-01&latitude=40.7128&longitude=-74.0060
GET /api/ephemeris/planets?date=2024-01-01
GET /api/ephemeris/aspect?longitude1=45&longitude2=135
```

#### Natal Charts
```bash
POST /api/charts             # Create natal chart
GET /api/charts              # Get all charts
GET /api/charts/:id          # Get specific chart
```

#### Rules
```bash
POST /api/rules              # Create rule manually
GET /api/rules               # Get all rules
GET /api/rules?natalChartId=xxx  # Get rules for chart
POST /api/llm/generate-rule  # Generate rule with AI
```

#### Outcomes
```bash
POST /api/outcomes           # Record outcome
GET /api/outcomes            # Get outcomes
```

### Frontend UI

1. **Calendar View** - Select dates and view planetary positions
2. **Natal Charts** - Create and manage natal charts, generate AI rules
3. **Layers** - Manage astrological layers (transits, progressions, custom)

## OpenAI Integration

The LLM rule generator uses OpenAI's GPT-4 to create scheduling rules based on natal charts and user requests.

### Example Usage

```typescript
// Generate a rule
POST /api/llm/generate-rule
{
  "natalChartId": "chart_id_here",
  "request": "Suggest best times for important meetings based on favorable transits"
}

// Response includes generated rule with conditions and actions
```

The AI analyzes the natal chart and generates structured rules with:
- **Conditions** - Astrological conditions to check (transits, aspects, etc.)
- **Actions** - Suggested scheduling actions (suggest_time, avoid_time, prioritize)

## Testing

Run tests:
```bash
# All tests
npm test

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend

# With coverage
npm run test:coverage
```

## Building for Production

```bash
# Build both packages
npm run build

# Build backend only
npm run build:backend

# Build frontend only
npm run build:frontend
```

## Development

```bash
# Start dev servers
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Architecture

### Backend Architecture

1. **Express Server** - RESTful API with middleware
2. **Layer Registry** - In-memory registry for layer management
3. **Ephemeris Service** - Astronomical calculations
4. **LLM Service** - OpenAI integration for rule generation
5. **Database** - MongoDB with Mongoose ODM
6. **Error Handling** - Centralized error handling with custom errors
7. **Logging** - Winston logger with file and console transports

### Frontend Architecture

1. **React 18** - Modern React with hooks
2. **Chakra UI** - Component library for UI
3. **API Service** - Axios-based API client
4. **Component Structure** - Modular, reusable components
5. **State Management** - React hooks for local state

## Security

- Helmet.js for security headers
- CORS configuration
- Input validation with Joi
- Error handling without sensitive data exposure
- Environment-based configuration

## Documentation

- [API Documentation](./docs/api.md)
- [Roadmap](./docs/roadmap.md)
- [OpenAI Integration Examples](./docs/openai-examples.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on GitHub.
# 🚀 Adaptive Astro-Scheduler

**A hybrid system combining lunar calendar, astrology, AI-powered rule generation, and constraint satisfaction for optimal life planning.**

> Transform temporal chaos into structured opportunity through the intersection of astronomy, machine learning, and personal analytics.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Development Roadmap](#development-roadmap)
- [Tech Stack](#tech-stack)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Adaptive Astro-Scheduler is a temporal optimization system that:

1. **Tracks astronomical cycles** - Precise calculations of lunar phases, planetary positions, nakshatras, and astrological transits
2. **Personalizes recommendations** - Analyzes your natal chart to create individual resonance profiles
3. **Generates intelligent rules** - Uses LLM (GPT-4/Claude) to translate domain-specific knowledge into actionable scheduling rules
4. **Optimizes planning** - Employs constraint satisfaction solvers to find ideal time windows for activities
5. **Learns continuously** - Collects feedback on outcomes and adapts rules through iterative improvement

**Use cases:**
- Medical professionals optimizing surgery scheduling
- Traders finding ideal market entry/exit windows
- Creatives scheduling projects aligned with energy cycles
- Entrepreneurs planning business launches

---

## ✨ Core Features

### 1. **17+ Base Astronomical Layers**
```
✅ Ephemeris (planetary positions)
✅ Lunar Days (1-30, synodic cycle)
✅ Lunar Phase (new/waxing/full/waning)
✅ Moon Sign (12 zodiac positions)
✅ Nakshatras (27 lunar mansions - Vedic)
✅ Sun Sign + All Major Planets
✅ Retrograde status
✅ Void of Course Moon detection
✅ Aspects (90°, 120°, 180° etc.)
✅ Natal Chart Transits (personalized)
✅ House positions (geo-dependent)
✅ Planetary Hours (local time)
✅ Lunar Nodes (Rahu/Ketu)
✅ Black Moon (Lilith)
✅ Ekadashi (Vedic fasting days)
✅ Eclipse windows
✅ Planetary parades
```

### 2. **Custom Layer Creation**

Four ways to add domain-specific layers:

**Simple Mode:**
```
Name: "My Business Review Days"
Frequency: "Every Wednesday"
```

**Guided Mode:** Step-by-step questionnaire

**LLM Mode:** Natural language description → AI generates rules
```
"I'm a surgeon. Monday consultations work best 
when moon is in water signs. Avoid days 9 and 29."
```

**Code Mode:** Direct TypeScript implementation
```typescript
calculate: (dateTime, context) => {
  const isFavorable = 
    context.lunarDay >= 1 && context.lunarDay <= 14 &&
    ['Cancer', 'Scorpio', 'Pisces'].includes(context.moonSign);
  return { score: isFavorable ? 1.0 : 0.0 };
}
```

### 3. **Intelligent Rule Generation (LLM Pipeline)**

Four-stage process:

1. **Structure** - Extract profession/goals from user input
2. **Generate** - LLM creates 5-10 tailored scheduling rules
3. **Validate** - Local validation of syntax and conflicts
4. **Learn** - Feedback loop refines rules over time

### 4. **Constraint Satisfaction Solver**

Plan weeks/months/years ahead:

```
INPUT: "When should I schedule 4 projects in Feb-June?"

OUTPUT:
  Project A: Feb 5-19 (89% optimal)
  Project B: Mar 1-15 (76% optimal)  
  Project C: Apr 10-May 5 (92% optimal)
  Project D: May 20-Jun 15 (84% optimal)

REASONS:
  - Mercury direct during execution
  - Waxing moon for planning
  - No major retrogrades
  - Personal natal aspects aligned
```

### 5. **Geolocation Intelligence**

- **Relocation charts** - See your astrological profile in different cities
- **Travel optimization** - Find best dates AND locations for trips
- **AstroCartography** - Visualize Venus/Jupiter/Saturn lines globally

### 6. **Feedback & Learning**

Track outcomes and improve:

```
User logs: "Surgery on Feb 15 → Excellent recovery"
         "Trading on Mar 3 → Lost position"
         "Launched product Apr 22 → Huge success"

System learns correlation patterns and adjusts weights
```

---

## 🏗️ System Architecture

### Backend (Node.js/TypeScript)

```
Ephemeris Engine
    ↓
┌─────────────────────────────────┐
│ Layer Registry (17+ base layers) │  
│ + Custom User Layers            │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ LLM Pipeline (GPT-4 / Claude)   │
│ • Profile Analysis              │
│ • Rule Generation               │
│ • Rule Validation               │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ CSP Solver                      │
│ Optimal scheduling algorithm    │
└─────────────────────────────────┘
    ↓
Calendar Day Objects (with recommendations)
```

### Frontend (React/Chakra UI)

- **Calendar View** - Month/week overview with color-coded days
- **Layer Manager** - Add/edit/delete custom layers
- **Planning Tool** - Drag-drop activities, get optimal dates
- **Insights** - Statistics, patterns, personal astro profile

### Database (PostgreSQL)

- Natal charts (cached)
- Generated rules (versioned)
- Activity outcomes (for ML feedback)
- User preferences

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for LLM features)
- PostgreSQL 13+ (optional, for persistent storage)

### Installation

```bash
# Clone repository
git clone https://github.com/thelonius/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler

# Install dependencies
npm run setup

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys and database URL

# Start development environment (Docker + Servers)
npm run dev

# Stop development environment (Docker cleanup)
npm run stop
```

### Local Development Workflow

The project uses a unified startup script `npm run dev` that:
1.  **Starts Docker**: PostgreSQL, Redis, and Ephemeris API.
2.  **Builds Shared**: Compilation of the `@adaptive-astro/shared` package.
3.  **Starts Servers**: Concurrent execution of Backend (3001) and Frontend (5173).

To shut everything down including Docker containers, use:
```bash
npm run stop
```

### Quick Demo

```typescript
import { CalendarGenerator, NatalChartBuilder } from '@/core';

// Build your natal chart
const natal = await NatalChartBuilder.build({
  birthDate: '1990-05-15',
  birthTime: '14:30',
  birthLocation: { latitude: 55.7558, longitude: 37.6173 }
});

// Generate calendar for next month
const calendar = await CalendarGenerator.generateMonth(2026, 2, natal);

// Find best days for specific activity
const bestDays = calendar.findBestDaysFor('Surgery');
console.log(bestDays); // ✨ Optimized schedule!
```

---

## 📊 Development Roadmap

### Phase 1: MVP (Weeks 1-4) ✅
- [x] Layer Registry core architecture
- [x] 17 base layers implementation
- [x] Ephemeris calculations (Sweph integration)
- [x] Basic React calendar UI
- [x] Natal chart builder

### Phase 2: LLM Integration (Weeks 5-8) 🚧
- [ ] LLM pipeline (profile → rules)
- [ ] Few-shot learning examples
- [ ] Rule validation engine  
- [ ] Custom layer UI (Simple/Guided/LLM/Code modes)
- [ ] Testing framework

### Phase 3: Intelligence (Weeks 9-12) ⏳
- [ ] CSP Solver implementation
- [ ] Activity outcome tracking
- [ ] Feedback loop & model retraining
- [ ] Composite layer support
- [ ] Batch planning ("Plan my quarter")

### Phase 4: Geolocation (Weeks 13-16) ⏳
- [ ] Relocation chart calculations
- [ ] Travel optimizer
- [ ] AstroCartography visualization
- [ ] Google Maps integration
- [ ] Trip planning UI

### Phase 5: Advanced Features (Weeks 17+) ⏳
- [ ] Compatibility analysis (two natal charts)
- [ ] Synastry reports
- [ ] Progressions & directions
- [ ] Mobile app (React Native)
- [ ] Public API / webhooks

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js / NestJS
- **Ephemeris:** Swiss Ephemeris (Sweph)
- **LLM:** OpenAI GPT-4 / Anthropic Claude
- **Database:** PostgreSQL
- **Cache:** Redis
- **Queue:** Bull (for async calculations)
- **Testing:** Jest

### Frontend  
- **Framework:** React 18+
- **UI Kit:** Chakra UI
- **State:** Zustand / TanStack Query
- **Charts:** Visx / Nivo
- **Date/Time:** date-fns, timezone-js

### DevOps
- **CI/CD:** GitHub Actions
- **Hosting:** Docker + Railway / Heroku / AWS
- **Monitoring:** Sentry / LogRocket

---

## 📖 Documentation

### Quick Start
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Essential commands and tips
- **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** - Setup and development guide
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Scaffolding overview

### Core Documentation
- **[CONCEPT.md](CONCEPT.md)** - Full conceptual overview (Russian)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical architecture
- **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** - 16-week development plan

### Integration Guides
- **[EPHEMERIS_INTEGRATION.md](docs/EPHEMERIS_INTEGRATION.md)** - Ephemeris calculator integration
- **[EXTERNAL_CALENDAR_API.md](docs/EXTERNAL_CALENDAR_API.md)** - Public API specification

### Coming Soon
- `LLM_PIPELINE.md` - LLM rule generation system (Phase 2)
- `GEO_OPTIMIZATION.md` - Geolocation features (Phase 4)
- `DEPLOYMENT.md` - Production setup guide

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See `CONTRIBUTING.md` for detailed guidelines.

---

## 📄 License

MIT License - see `LICENSE` file for details.

---

## 🌟 Acknowledgments

- Swiss Ephemeris for precise astronomical calculations
- OpenAI/Anthropic for LLM capabilities
- Chakra UI for beautiful component library
- Vedic astrology traditions for nakshatras/grahas knowledge

---

## 📞 Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions  
- Email: dev@adaptive-astro.app

**Built with ✨ and ☉☽✦ by the Adaptive Astro team**

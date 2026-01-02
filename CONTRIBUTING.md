# Contributing to Adaptive Astro Scheduler

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the best outcome for the community
- Be patient with new contributors

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (for local development)
- Git
- Code editor (VS Code recommended)

### Setup Development Environment

1. Fork the repository on GitHub

2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/adaptive-astro-scheduler.git
cd adaptive-astro-scheduler
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/thelonius/adaptive-astro-scheduler.git
```

4. Install dependencies:
```bash
npm install
```

5. Create environment files:
```bash
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your configuration
```

6. Start development servers:
```bash
npm run dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-lunar-phases` - New features
- `fix/calendar-timezone-bug` - Bug fixes
- `docs/api-documentation` - Documentation
- `refactor/ephemeris-service` - Code refactoring
- `test/layer-registry` - Test additions

### Commit Messages

Follow conventional commits:
- `feat: add lunar phase calculations`
- `fix: resolve calendar date picker issue`
- `docs: update API documentation`
- `test: add tests for rule generator`
- `refactor: simplify ephemeris service`
- `chore: update dependencies`

### Making Changes

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Run tests:
```bash
npm test
```

4. Run linting:
```bash
npm run lint
```

5. Build to verify:
```bash
npm run build
```

6. Commit changes:
```bash
git add .
git commit -m "feat: add your feature description"
```

7. Push to your fork:
```bash
git push origin feature/your-feature-name
```

8. Create a Pull Request on GitHub

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows project style
- [ ] Linting passes
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] PR description explains the change

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows code style
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use enums for constants

**Good:**
```typescript
interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
}

function calculatePosition(date: Date): PlanetPosition {
  // ...
}
```

**Avoid:**
```typescript
function calculatePosition(date: any): any {
  // ...
}
```

### Naming Conventions

- **Files**: kebab-case (`ephemeris-service.ts`)
- **Classes**: PascalCase (`EphemerisService`)
- **Functions**: camelCase (`calculatePosition`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix (`INatalChart`)

### React Components

- Use functional components with hooks
- Extract complex logic into custom hooks
- Keep components focused and small
- Use TypeScript for props

**Example:**
```typescript
interface CalendarViewProps {
  selectedChartId: string | null;
  onDateChange: (date: Date) => void;
}

function CalendarView({ selectedChartId, onDateChange }: CalendarViewProps) {
  // Component logic
}
```

### Comments

- Write self-documenting code
- Add comments for complex logic
- Document public APIs with JSDoc
- Keep comments up to date

**Example:**
```typescript
/**
 * Calculates planetary positions for a given date
 * @param date - The date to calculate positions for
 * @returns Array of planet positions with zodiac signs
 */
async function calculatePlanetPositions(date: Date): Promise<PlanetPosition[]> {
  // Implementation
}
```

## Testing

### Test Structure

- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test API endpoints
- **Component tests**: Test React components

### Writing Tests

**Backend:**
```typescript
describe('EphemerisService', () => {
  it('should calculate planet positions', async () => {
    const date = new Date('2024-01-01');
    const positions = await ephemerisService.calculatePlanetPositions(date);
    
    expect(positions).toHaveLength(10);
    expect(positions[0]).toHaveProperty('name');
  });
});
```

**Frontend:**
```typescript
import { render, screen } from '@testing-library/react';
import CalendarView from './CalendarView';

describe('CalendarView', () => {
  it('renders calendar component', () => {
    render(<CalendarView selectedChartId={null} />);
    expect(screen.getByText(/Calendar View/i)).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Specific package
npm run test:backend
npm run test:frontend
```

## Project Structure

```
adaptive-astro-scheduler/
├── packages/
│   ├── backend/          # Backend API
│   │   ├── src/
│   │   │   ├── config/   # Configuration
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── models/      # Database models
│   │   │   ├── routes/      # API routes
│   │   │   ├── services/    # Business logic
│   │   │   └── utils/       # Utilities
│   │   └── __tests__/       # Tests
│   └── frontend/         # React frontend
│       └── src/
│           ├── components/  # React components
│           ├── services/    # API services
│           └── hooks/       # Custom hooks
├── docs/                 # Documentation
└── .github/             # GitHub workflows
```

## Areas for Contribution

### Good First Issues

- Add more unit tests
- Improve error messages
- Update documentation
- Add code examples
- Fix typos

### Feature Ideas

- Vedic astrology support
- Advanced house systems
- Chart comparison tools
- Mobile app
- Additional transit types

### Documentation

- Tutorial videos
- API examples
- Architecture diagrams
- Translation to other languages

## Review Process

1. Automated checks run on PR (tests, linting)
2. Maintainer reviews code
3. Feedback provided (if needed)
4. Changes requested or approved
5. PR merged to main

## Release Process

1. Version bump (semantic versioning)
2. Update CHANGELOG
3. Tag release
4. Deploy to production
5. Create GitHub release

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security concerns privately
- **Chat**: Join our Discord/Slack (if available)

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Adaptive Astro Scheduler! 🌟

# 📊 Development Roadmap

**Adaptive Astro-Scheduler** — 16-Week Development Plan (MVP → Production)

---

## Phase 1: Foundation (Weeks 1-4) ✅
### "Core Layer Architecture & Ephemeris Engine"

**Deliverables:**
- [x] Layer Registry pattern implementation
- [x] 17+ base astronomical layers defined
- [x] Ephemeris engine (Swiss Ephemeris integration)
- [x] TypeScript type system for all entities
- [x] Basic unit tests (Jest setup)
- [x] GitHub repository & CI/CD pipeline

**Key Files:**
- `src/core/layer-registry.ts`
- `src/core/ephemeris-calculator.ts`
- `src/types/astrology.ts`

**Testing:** 70% code coverage target

---

## Phase 2: LLM Integration (Weeks 5-8) 🚧
### "Intelligent Rule Generation Pipeline"

**Deliverables:**
- [ ] LLM pipeline (GPT-4 / Claude integration)
- [ ] Prompt engineering framework
- [ ] Rule validation engine
- [ ] Custom layer UI (4 creation modes)
- [ ] Rule versioning & storage
- [ ] Feedback system foundation

**Milestones:**
Week 5: LLM API wrapper + few-shot examples  
Week 6: Rule generation & validation  
Week 7: Frontend custom layer UI  
Week 8: E2E testing & optimization  

**Key Files:**
- `src/services/llm-pipeline.ts`
- `src/services/rule-validator.ts`
- `src/api/routes/custom-layers.ts`
- `frontend/src/components/LayerCreator/`

**Testing:** Integration tests with mock LLM

---

## Phase 3: Intelligence & Optimization (Weeks 9-12) ⏳
### "Constraint Satisfaction Solver & Feedback Loop"

**Deliverables:**
- [ ] CSP Solver implementation
- [ ] Activity outcome tracking
- [ ] Feedback collection UI
- [ ] Rule retraining pipeline
- [ ] Composite layer support
- [ ] Batch planning features

**Milestones:**
Week 9: CSP solver (backtracking algorithm)  
Week 10: Outcome tracking system  
Week 11: Feedback loop & model update  
Week 12: Composite layers & batch ops  

**Key Files:**
- `src/services/csp-solver.ts`
- `src/database/models/outcomes.ts`
- `src/services/feedback-engine.ts`
- `frontend/src/components/PlannerView/`

**Performance Targets:**
- Plan 100 activities in <5 seconds
- Support 3-month planning horizon

---

## Phase 4: Geolocation & Travel (Weeks 13-16) ⏳
### "Location-Based Optimization & AstroCartography"

**Deliverables:**
- [ ] Relocation chart calculations
- [ ] Travel optimizer
- [ ] AstroCartography visualization
- [ ] Google Maps integration
- [ ] Multi-city comparison
- [ ] Trip recommendation engine

**Milestones:**
Week 13: Local Sidereal Time (LST) calculations  
Week 14: Relocation charts & comparisons  
Week 15: Travel optimizer UI  
Week 16: AstroCartography map visualization  

**Key Files:**
- `src/services/relocation-calculator.ts`
- `src/services/travel-optimizer.ts`
- `src/services/astrocartography.ts`
- `frontend/src/components/TravelPlanner/`
- `frontend/src/components/AstroMap/`

**APIs Integrated:**
- Google Maps Platform
- GeoNames API
- Timezone API

---

## Future Phases (Post-MVP) 🚀

### Phase 5: Advanced Features (Weeks 17+)
- [ ] Relationship compatibility analysis (Synastry)
- [ ] Progressions & directions
- [ ] Mobile app (React Native)
- [ ] Public API & webhooks
- [ ] Community rule sharing
- [ ] Premium analytics dashboard

### Phase 6: Scaling & Production
- [ ] Load testing & optimization
- [ ] Multi-database support
- [ ] Caching strategy (Redis/CDN)
- [ ] API rate limiting
- [ ] Admin dashboard
- [ ] Monitoring & alerting (Sentry)

---

## Technology Milestones

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Layer Registry MVP | Week 2 | ✅ |
| Ephemeris Engine | Week 3 | ✅ |
| LLM Pipeline | Week 8 | 🚧 |
| CSP Solver | Week 12 | ⏳ |
| Travel Optimizer | Week 16 | ⏳ |
| **Full MVP Release** | **End of Week 16** | ⏳ |

---

## Development Priorities

### Critical Path
1. Ephemeris calculations (foundation)
2. Layer registry & base layers
3. LLM rule generation
4. CSP solver
5. Frontend calendar UI

### Nice-to-Have (if time permits)
- Advanced visualizations
- Mobile responsiveness
- Offline mode
- Dark theme

---

## Testing Strategy

**Unit Tests** (Jest)
- Ephemeris calculations vs. external data
- Layer evaluation logic
- Rule validation
- CSP solver edge cases

**Integration Tests**
- LLM pipeline with mock API
- Database transactions
- API endpoint workflows

**E2E Tests** (Cypress/Playwright)
- Calendar view interactions
- Custom layer creation flow
- Planning workflow
- Outcome tracking

**Target Coverage:** 75% overall, 90% critical paths

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM API cost overruns | Medium | Medium | Rate limiting, caching, fallbacks |
| Ephemeris accuracy issues | Low | High | Thorough testing against NASA data |
| CSP solver timeout | Medium | Medium | Optimization, early termination |
| Scope creep | High | High | Strict phase boundaries, MVP focus |

---

## Success Metrics

✅ **Technical:**
- 75%+ test coverage
- <100ms API response time (p95)
- 0 critical bugs at release

✅ **User Experience:**
- <3 clicks to create custom layer
- Planning wizard completes in <2 min
- 90% user satisfaction on recommendations

✅ **Business:**
- MVP released on schedule
- <$5K operational cost/month
- Ready for beta testing

---

## Backlog / Known Gaps

- [x] **Transits endpoint missing Chiron/Rahu/Ketu/Lilith** — fixed 2026-09-08: `transit-calculator.ts`, `calendar-generator.ts`, Python `transit_engine.py` + `chart_service.py` now pass/include the same `rahu,ketu,lilith,chiron` points as natal.

- [x] **No Human Design (Bodygraph) support** — `POST /api/v1/chart/human-design` + Node proxy `/api/chart-analysis/human-design` + UI `/human-design` (2026-09-08). Personality + Design (~88° solar arc), gates/lines, type, profile, authority, channels.
  - Found: 2026-09-07, owner (@edubnitsky) asked for a Human Design reading; had to decline since the tool has no such data.

- [x] **Nakshatras (Vedic lunar mansions) support** — `GET /api/v1/ephemeris/moon-nakshatra` with Lahiri ayanamsa, 27 nakshatras + pada + ruler (2026-09-08).
  - Found: 2026-09-07, owner (@edubnitsky) asked whether nakshatras are supported; confirmed they aren't.

- [x] **Vimshottari Dasha (Jyotish)** — `POST /api/v1/chart/vimshottari-dasha` + Node proxy `/api/chart-analysis/vimshottari-dasha` + UI `/jyotish-dasha` (2026-09-08). Mahadasha + antardasha timeline, current running period, Lahiri sidereal Moon nakshatra.
- [x] **Navamsa D9 (Jyotish)** — `POST /api/v1/chart/navamsa` + Node proxy `/api/chart-analysis/navamsa` + UI `/navamsa` (2026-09-08). D1+D9 sidereal positions, navamsa number, vargottama flags.
- [ ] **Jyotish vargas & yogas (remaining)** — D10 Dashamsa, Vedic-style aspect/yoga rules; D9 Navamsa + nakshatras + Vimshottari dasha now in place.
  - Fix: significant scope — likely its own module/service sharing only the raw ephemeris longitudes with the Western engine. Start with sidereal conversion + Vimshottari dasha (most commonly requested), defer vargas/yogas.
  - Found: 2026-09-07, owner (@edubnitsky) asked to add Jyotish support alongside the nakshatra request.

- [ ] **Other missing techniques/systems** — surveyed with the owner (@edubnitsky) on 2026-09-07; grouped by effort:
  - Quick wins (ephemeris already computes what's needed, just missing the specific derived output):
    - [x] Synastry / relationship compatibility (compare two natal charts) — `POST /api/v1/chart/synastry` + Node proxy `/api/chart-analysis/synastry` + UI `/synastry` (2026-09-08)
    - [x] Secondary progressions (each planet moves at its own real speed, vs. solar arc's single shared arc) — `POST /api/v1/chart/progressions` + Node proxy `/api/chart-analysis/progressions` + UI `/progressions` (2026-09-08)
    - [x] Arabic parts / lots (Part of Fortune etc. — simple formula from Asc/Sun/Moon) — `GET /api/v1/ephemeris/arabic-parts` (2026-09-08)
    - [x] Draconic chart (rebase zodiac to the North Node instead of 0° Aries) — `POST /api/v1/chart/draconic` + Node proxy `/api/chart-analysis/draconic` + UI `/draconic` (2026-09-08)
  - Needs extra data but not a full separate module:
    - [x] Fixed stars — `GET /api/v1/ephemeris/fixed-stars` with 12-key catalog via Swiss Ephemeris sefstars.txt (2026-09-08)
    - [ ] Uranian/Hamburg school (hypothetical points: Cupido, Hades, Zeus, Kronos, etc. — not in current ephemeris)
    - [ ] Horary astrology (chart-for-the-moment-of-the-question — `transits` already gives the data, just needs horary-specific interpretation rules)
  - Separate large systems (own engine, essentially unrelated to current Western tropical core):
    - [ ] Chinese astrology (BaZi / Four Pillars) — lunisolar calendar + Heavenly Stems/Earthly Branches
    - [ ] Qi Men Dun Jia
    - [ ] Numerology (name/date-based, not ephemeris-driven at all)
    - [ ] Mayan calendar (Tzolkin)
  - Found: 2026-09-08, owner (@edubnitsky) asked what other systems/techniques exist beyond what's already listed, then asked to backlog the full list.

- [x] **LLM Writer mandatory for corpus usage (copyright)** — MVP: `POST /api/corpus/rewrite` + `corpus-writer.service.ts` (NVIDIA NIM, LRU cache, `CORPUS_WRITER_ENABLED` flag). Pass-through when disabled; wire into UI surfaces next (2026-09-08).
  - Found: 2026-09-08, owner (@edubnitsky) stated work on corpus is impossible without this due to copyright concerns.

---

## Questions & Contact

For questions about the roadmap:
- Create an Issue in GitHub
- Join Discussions tab
- Email: dev@adaptive-astro.app

---

**Last Updated:** January 2, 2026  
**Next Review:** Weekly sync Mondays 4 PM MSK

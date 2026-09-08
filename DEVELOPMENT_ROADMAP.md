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

- [ ] **Transits endpoint missing Chiron/Rahu/Ketu/Lilith** — `astro.py transits` / `day` output only returns 10 classical bodies (Sun…Pluto). Natal chart (`astro.py natal`) already computes Chiron, Rahu, Ketu, Lilith, but the transiting positions for these points aren't exposed anywhere, so transit-to-natal aspect analysis for these points (Chiron return ~50y, nodal return ~18.6y cycle, Lilith return ~8.85y) can't be computed precisely — only approximated from known orbital cycles.
  - Fix: add Chiron/Rahu/Ketu/Lilith to the `planets`/`transits` response in the ephemeris calculator, same as natal chart already does.
  - Found: 2026-09-07, while running birthday transit-aspect analysis for the owner (@edubnitsky) via the astro-scheduler CLI skill.

- [ ] **No Human Design (Bodygraph) support** — CLI only exposes classical Western astrology (`natal`/`transits`/`moon`/`retrogrades`). Human Design needs its own calculation: Bodygraph gates/lines/centers derived from planetary positions at birth AND at the "Design" moment (~88 solar degrees before birth, roughly 88-89 days prior), mapped through the I-Ching 64-gate wheel — not just angles/aspects like the current engine.
  - Fix: either add a Human Design module (needs the 88°-before-birth ephemeris snapshot + gate/line/center mapping tables) to the ephemeris backend, or clearly scope it out as a separate service.
  - Found: 2026-09-07, owner (@edubnitsky) asked for a Human Design reading; had to decline since the tool has no such data.

- [ ] **No Nakshatras (Vedic lunar mansions) support** — engine is tropical Western zodiac only (12 signs × 30°). Sidereal zodiac + the 27 nakshatras (13°20' each), their ruling planets, padas, and Moon-nakshatra placement aren't computed anywhere.
  - Fix: add sidereal/ayanamsa conversion (e.g. Lahiri) to the ephemeris layer, then map Moon (and optionally other planets) longitude to the 27-nakshatra + pada table.
  - Found: 2026-09-07, owner (@edubnitsky) asked whether nakshatras are supported; confirmed they aren't.

- [ ] **No Jyotish (Vedic astrology) support** — broader than just nakshatras: needs sidereal zodiac (ayanamsa, shared prerequisite with the nakshatra item above), Vimshottari dasha (planetary period) calculations, divisional charts (vargas: D9/Navamsa at minimum, ideally D1/D9/D10), and Vedic-style aspect/yoga rules, which are structurally different from the current Western tropical aspect engine.
  - Fix: significant scope — likely its own module/service sharing only the raw ephemeris longitudes with the Western engine. Start with sidereal conversion + Vimshottari dasha (most commonly requested), defer vargas/yogas.
  - Found: 2026-09-07, owner (@edubnitsky) asked to add Jyotish support alongside the nakshatra request.

- [ ] **Other missing techniques/systems** — surveyed with the owner (@edubnitsky) on 2026-09-07; grouped by effort:
  - Quick wins (ephemeris already computes what's needed, just missing the specific derived output):
    - [ ] Synastry / relationship compatibility (compare two natal charts)
    - [ ] Secondary progressions (each planet moves at its own real speed, vs. solar arc's single shared arc)
    - [ ] Arabic parts / lots (Part of Fortune etc. — simple formula from Asc/Sun/Moon)
    - [ ] Draconic chart (rebase zodiac to the North Node instead of 0° Aries)
  - Needs extra data but not a full separate module:
    - [ ] Fixed stars (needs a star catalog — Regulus, Spica, etc. — not present)
    - [ ] Uranian/Hamburg school (hypothetical points: Cupido, Hades, Zeus, Kronos, etc. — not in current ephemeris)
    - [ ] Horary astrology (chart-for-the-moment-of-the-question — `transits` already gives the data, just needs horary-specific interpretation rules)
  - Separate large systems (own engine, essentially unrelated to current Western tropical core):
    - [ ] Chinese astrology (BaZi / Four Pillars) — lunisolar calendar + Heavenly Stems/Earthly Branches
    - [ ] Qi Men Dun Jia
    - [ ] Numerology (name/date-based, not ephemeris-driven at all)
    - [ ] Mayan calendar (Tzolkin)
  - Found: 2026-09-08, owner (@edubnitsky) asked what other systems/techniques exist beyond what's already listed, then asked to backlog the full list.

- [ ] **LLM Writer mandatory for corpus usage (copyright)** — The text corpus (26M symbols) is copyrighted (Глоба, Подводный, Зараев, Сакоян, Вронский et al.). Directly outputting corpus text violates copyright. Before any production use of corpus interpretations, an LLM-based rewriting step is legally required: the model must receive only the retrieved corpus fragments and generate original phrasing, citing sources. Without this, the system cannot be legally deployed.
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

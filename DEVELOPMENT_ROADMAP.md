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

## Questions & Contact

For questions about the roadmap:
- Create an Issue in GitHub
- Join Discussions tab
- Email: dev@adaptive-astro.app

---

**Last Updated:** January 2, 2026  
**Next Review:** Weekly sync Mondays 4 PM MSK

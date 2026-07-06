# Scope: Milestone 5 — Integration & Hardening

## Architecture
- Backend Node/Express server at `technosync-dashboard/server`
- Database: local JSON file database at `technosync-dashboard/server/data/complaints.json` and `projects.json`
- AI Simulation Engine at `technosync-dashboard/server/src/ai-engine.js`
- Test suite: `e2e-tests` directory containing individual test files for Tiers 1-4 and a custom zero-dependency runner.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M5.1 | Phase 1 Tier 1 (Feature Coverage) | Run Happy-path tests (30 cases) against the real server; fix if failing | Server, Tier 1 tests | DONE |
| M5.2 | Phase 1 Tier 2 (Boundary & Corner) | Run Boundary/Negative tests (30 cases) against the real server; fix if failing | Server, Tier 2 tests | DONE |
| M5.3 | Phase 1 Tier 3 (Cross-Feature) | Run Pairwise combination tests (6 cases) against the real server; fix if failing | Server, Tier 3 tests | DONE |
| M5.4 | Phase 1 Tier 4 (Real-World) | Run Complex MP workflow tests (5 cases) against the real server; fix if failing | Server, Tier 4 tests | DONE |
| M5.5 | Phase 2 Tier 5 (Adversarial) | Audit test coverage, identify untested paths/bugs, generate adversarial test cases, integrate & fix | Server, Challengers, Workers | PLANNED |

## Interface Contracts
- See PROJECT.md for backend API contracts (`/api/complaints` and `/api/projects`).

# E2E Test Infra: TechnoSync AI

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Interactive Dashboard | ORIGINAL_REQUEST §R1.1 | 5 | 5 | ✓ |
| 2 | Citizen Issues Hub | ORIGINAL_REQUEST §R1.2 | 5 | 5 | ✓ |
| 3 | Complaint Simulator | ORIGINAL_REQUEST §R1.3 | 5 | 5 | ✓ |
| 4 | Constituency Map | ORIGINAL_REQUEST §R1.4 | 5 | 5 | ✓ |
| 5 | AI Recommendation UI | ORIGINAL_REQUEST §R1.5 | 5 | 5 | ✓ |
| 6 | Project Progress Tracker | ORIGINAL_REQUEST §R1.6 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: `e2e-tests/run-tests.js`. A custom zero-dependency Promise-based runner.
- Test database sandboxing: Running with `NODE_ENV=test` uses sandbox database files `complaints.test.json` and `projects.test.json`.
- DB writes serialization: Lock mutex serialization prevents write race conditions under concurrent requests.
- Automatic cleanups: Signal listeners on the runner kill the spawned server process cleanly.
- Mock server: `e2e-tests/mock-server.js` starts a local mock server using native Node.js HTTP to verify the tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | MP Daily Workflow | F1, F3, F4, F5, F6 | Medium |
| 2 | Crisis Management | F1, F3, F5, F6 | Medium |
| 3 | Budget Planning Cycle | F1, F5, F6 | Medium |
| 4 | Citizen Engagement Loop | F1, F2, F5, F6 | Medium |
| 5 | Constituency Progress Report | F1, F4, F6 | Medium |

## Coverage Thresholds
- Tier 1: >= 5 per feature (Total: 30 test cases)
- Tier 2: >= 5 per feature (Total: 30 test cases)
- Tier 3: pairwise coverage of major feature interactions (Total: 6 test cases)
- Tier 4: realistic application scenarios (Total: 5 test cases)
- Total E2E Tests: 71 test cases

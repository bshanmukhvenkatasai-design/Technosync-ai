# Scope: E2E Testing Track

## Architecture
- **Approach**: Opaque-box, requirement-driven E2E testing framework.
- **Scope**: Focus exclusively on the Node.js/Express backend server APIs, JSON database persistence, and database write concurrency (the React frontend client UI is out-of-scope). We validate the data flow and backend support for the 6 core features:
  - Interactive Dashboard (F1)
  - Citizen Issues Hub (F2)
  - Complaint Submission Simulator (F3)
  - Constituency Map (F4)
  - AI Recommendation Engine UI (F5)
  - Project Progress Tracker (F6)
- **Test Runner & Harness**:
  - We will implement a custom, zero-dependency Node.js-based E2E test runner (`e2e-tests/run-tests.js`).
  - This runner will execute tests across 4 Tiers.
  - The runner will run the backend server under `NODE_ENV=test`, sandbox the JSON files (`complaints.test.json` and `projects.test.json`), and verify correctness using native HTTP requests simulating the client.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | E2E Testing Infra | Set up `e2e-tests/` directory, custom runner (`run-tests.js`), config, helper client, and test sandbox | None | DONE |
| M2 | Tier 1: Feature Coverage | Implement 30 test cases covering the 6 core features in isolation | M1 | DONE |
| M3 | Tier 2: Boundary & Corner | Implement 30 test cases for boundaries, empty/corrupt DBs, extreme inputs, validation, and error states | M2 | DONE |
| M4 | Tier 3 & 4: Integration | Implement 6 Tier 3 (Cross-Feature) and 5 Tier 4 (Real-World) scenarios | M3 | DONE |
| M5 | Final Reporting | Generate TEST_INFRA.md, TEST_READY.md, run all tests, verify all pass | M4 | DONE |

## Interface Contracts
(As defined in PROJECT.md)
1. `GET /api/complaints`
2. `POST /api/complaints`
3. `GET /api/projects`
4. `PATCH /api/projects/:id/status`

## Test Inventory

### Tier 1 - Feature Coverage (30 Tests)
- **F1: Interactive Dashboard**
  1. Stats calculation with empty databases.
  2. Stats updates when a complaint is added.
  3. Stats updates when a project status changes to Completed.
  4. Stats urgency counts match complaints distribution.
  5. Stats category counts match complaints categories.
- **F2: Citizen Issues Hub**
  6. Fetching complaints list returns valid JSON array.
  7. Complaints contain required fields (id, text, type, region, coordinates, category, sentiment, urgency, timestamp).
  8. Complaints contain valid coordinate structures.
  9. Complaints contain valid ISO timestamps.
  10. Complaints contain valid category values.
- **F3: Complaint Submission Simulator**
  11. Submit text complaint successfully (201 Created).
  12. Submit audio complaint successfully (201 Created).
  13. Submit photo complaint successfully (201 Created).
  14. Submit complaint with mediaUrl.
  15. Submit complaint triggers AI engine enrichment (category, sentiment, urgency).
- **F4: Constituency Map**
  16. Complaints associate with a region.
  17. Client can filter complaints list by region.
  18. Projects associate with a region.
  19. Client can filter projects list by region.
  20. Coordinates mapping falls within map limits.
- **F5: AI Recommendation Engine UI**
  21. Fetching projects returns valid JSON array.
  22. Projects contain required fields (id, title, description, region, cost, timeline, beneficiaries, status, urgency).
  23. Project costs are positive numbers.
  24. Project beneficiaries are positive integers.
  25. Project statuses are valid.
- **F6: Project Progress Tracker**
  26. Update status from Recommended to Planned.
  27. Update status from Planned to In Progress.
  28. Update status from In Progress to Completed.
  29. Update status of non-existent project returns 404.
  30. Update status response returns the updated project object.

### Tier 2 - Boundary & Corner Cases (30 Tests)
- **F1: Interactive Dashboard**
  31. Stats computation with extremely large number of complaints.
  32. Stats computation with negative coordinates.
  33. Stats calculation with null description fields.
  34. Stats updates under rapid concurrent submissions.
  35. Stats cost summation with large floating point values.
- **F2: Citizen Issues Hub**
  36. Complaints list returns empty array on empty database.
  37. Complaints list handles corrupt/invalid JSON db file.
  38. Complaints list filters out corrupted individual records.
  39. Complaints endpoint does not leak environment/system variables.
  40. Complaints list is sorted reverse chronologically.
- **F3: Complaint Submission Simulator**
  41. Submit complaint with empty text returns 400.
  42. Submit complaint with extremely long text (10,000+ chars) is accepted.
  43. Submit complaint with invalid media type returns 400.
  44. Submit complaint with invalid region returns 400 or handles gracefully.
  45. Submit complaint with malformed coordinates structure returns 400.
- **F4: Constituency Map**
  46. Filter complaints by region with no complaints returns empty array.
  47. Filter projects by region with no projects returns empty array.
  48. Filter by invalid region names returns empty array.
  49. Coordinates at extreme boundaries (0,0 or 1000,1000).
  50. Coordinates with null or missing values.
- **F5: AI Recommendation Engine UI**
  51. Projects list returns empty array on empty database.
  52. Projects list handles missing optional fields.
  53. Projects list handles invalid urgency mapping.
  54. Projects list is stable across consecutive reads.
  55. Project cost boundaries (cost is 0 or extremely high).
- **F6: Project Progress Tracker**
  56. Update project status with invalid status string returns 400.
  57. Update project status with missing status field in body returns 400.
  58. Update project status with empty body returns 400.
  59. Project status transitions cannot be bypassed if invalid.
  60. Patch endpoint rejects other HTTP methods.

### Tier 3 - Cross-Feature Combinations (6 Tests)
- 61. **Submission -> Map -> Issues Hub**: Submit complaint in a region, filter by that region, verify it shows up in map and hub.
- 62. **Submission -> Stats -> Recommendations**: Submit critical complaint, verify dashboard stats update and AI recommendations match urgency.
- 63. **Project Progress -> Dashboard Stats**: Complete a project, verify completed vs active stats reflect changes.
- 64. **Multi-complaint -> Region Heatmap**: Submit multiple complaints in same region, verify aggregated region statistics.
- 65. **Recommendations -> Status -> Tracker**: Fetch recommended project, start it, verify tracker reflects active status.
- 66. **Complaint Sentiment -> Recommendation**: Negative sentiment complaint escalates related project recommendations.

### Tier 4 - Real-World Scenarios (5 Tests)
- 67. **MP Daily Workflow**: MP logs in, reviews dashboard, clicks region on map, submits mock complaint, gets recommendations, starts and tracks a project.
- 68. **Crisis Management**: Critical failure complaint submitted, dashboard shows critical urgency, MP starts emergency project.
- 69. **Budget Planning Cycle**: MP filters low-cost projects, upgrades multiple projects to Planned, verifies stats counts.
- 70. **Citizen Engagement Feedback Loop**: Citizen complaint on sanitation, MP moves sanitation project to In Progress, then Completed, verifies resolution in hub.
- 71. **Constituency Progress Report**: MP completes all projects in South region, verifies tracker, and checks completed status.

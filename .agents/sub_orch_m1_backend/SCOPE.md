# Scope: Milestone 1 - Backend Setup

## Architecture
The backend server is built using Node.js and Express. It serves REST APIs and persists data using JSON files.

- **Directory**: `technosync-dashboard/server/`
- **Database**: JSON file-based database persistence in `data/complaints.json` and `data/projects.json`.
- **AI Engine**: Heuristic parser to analyze incoming complaints (category, location/region extraction, sentiment, and urgency scoring).
- **APIs**:
  - `GET /api/complaints` - List all complaints.
  - `POST /api/complaints` - Submit a new complaint, processed by AI engine.
  - `GET /api/projects` - List recommended and active projects.
  - `PATCH /api/projects/:id/status` - Update status/progress of a project.
- **Verification**: Health check verification script (`test-health.js`) to assert all API behaviors, data persistence, and AI classifications.

## Work Items
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Plan & Investigate | Explorer reviews workspace and drafts implementation plan | None | DONE |
| 2 | Implementation | Worker implements Express app, JSON db, AI engine, and health check | Plan & Investigate | DONE |
| 3 | Verification & Review | Reviewers and Challengers verify code correctness and execute tests | Implementation | DONE |
| 4 | Integrity Audit | Forensic Auditor performs static and dynamic checks for integrity | Verification | DONE |

## Code Layout
```
technosync-dashboard/server/
├── data/
│   ├── complaints.json
│   └── projects.json
├── src/
│   ├── index.js
│   ├── db.js
│   └── ai-engine.js
├── package.json
└── test-health.js
```

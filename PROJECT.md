# Project: TechnoSync AI (Backend Only)

## Architecture
TechnoSync AI consists of a local backend server inside the `technosync-dashboard/server` directory. The frontend will be built independently by the user's team.

```
+-------------------------------------------------------------+
|                     technosync-dashboard                    |
|                                                             |
|                       +---------------------+               |
|                       |       server/       |               |
|                       | (Node/Express/JSON) |               |
|                       +---------------------+               |
|                                                             |
+-------------------------------------------------------------+
```

### Data Flow
1. **Submission**: External client submits a complaint (with text, coordinates/region, photo/voice inputs) to `/api/complaints`.
2. **Backend Processing**: The `server` processes the complaint using its AI Simulation Engine (assigning category, sentiment, urgency), saves it to the local JSON file database, and returns the enriched complaint.
3. **Project Progression**: External client triggers a request to `/api/projects/:id/status` to update its phase and update the database.

---

## Code Layout
```
technosync-dashboard/
└── server/
    ├── data/
    │   ├── complaints.json   # Local DB for complaints
    │   └── projects.json     # Local DB for projects
    ├── src/
    │   ├── index.js          # Express app entry point
    │   ├── db.js             # Local JSON file reader/writer
    │   └── ai-engine.js      # Heuristic complaint categorizer and analyzer
    ├── package.json
    └── test-health.js        # Health check validation script
```

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Backend Setup | Node/Express backend, JSON DB, API endpoints, AI Simulator | None | DONE (Conv: ded2c3d4-ad72-445f-950c-a74a27cb84b3) |
| M2 | Frontend Layout | [REMOVED FROM SCOPE] | None | SKIPPED |
| M3 | Map & Issues Hub | [REMOVED FROM SCOPE] | None | SKIPPED |
| M4 | Simulator & Integration | [REMOVED FROM SCOPE] | None | SKIPPED |
| M5 | Integration & Hardening | Full E2E verification of backend endpoints, concurrent write tests | M1, TEST_READY.md | IN_PROGRESS (Conv: d484c1e2-22d4-45c5-8dac-7085cb7566c6) |

---

## Interface Contracts

### 1. `GET /api/complaints`
- **Description**: Returns all complaints.
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "string",
      "text": "string",
      "type": "text | audio | photo",
      "region": "string",
      "coordinates": { "x": 0, "y": 0 },
      "mediaUrl": "string | null",
      "category": "Infrastructure | Water | Sanitation | Power | Security | Roads",
      "sentiment": "Positive | Neutral | Negative",
      "urgency": "Low | Medium | High | Critical",
      "timestamp": "string (ISO)"
    }
  ]
  ```

### 2. `POST /api/complaints`
- **Description**: Submit a new complaint.
- **Request Body**:
  ```json
  {
    "text": "string",
    "type": "text | audio | photo",
    "region": "string",
    "coordinates": { "x": 0, "y": 0 },
    "mediaUrl": "string | null"
  }
  ```
- **Response**: `201 Created` - returns the processed complaint containing all AI simulation engine fields.

### 3. `GET /api/projects`
- **Description**: Returns all recommended and active projects.
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "region": "string",
      "cost": 0,
      "timeline": "string",
      "beneficiaries": 0,
      "status": "Recommended | Planned | In Progress | Completed",
      "urgency": "Low | Medium | High | Critical"
    }
  ]
  ```

### 4. `PATCH /api/projects/:id/status`
- **Description**: Update status/progress of a project.
- **Request Body**:
  ```json
  {
    "status": "Recommended | Planned | In Progress | Completed"
  }
  ```
- **Response**: `200 OK` - returns the updated project object.

# Milestone 1 Backend Setup - Technical Analysis & Plan

## Summary
Milestone 1 implements the core Express.js REST APIs, database serialization via local JSON files, and a rule-based AI heuristic engine to automatically enrich citizen complaints. The proposed architecture requires zero external runtime dependencies beyond Express and CORS, ensuring a robust, self-contained, and easily testable server.

---

## 🛠️ File Structure and Layout Recommendation
The backend code must reside strictly under `technosync-dashboard/server/` as defined in `PROJECT.md` and `SCOPE.md`. 

| Path | File | Purpose |
| --- | --- | --- |
| `technosync-dashboard/server/` | `package.json` | Project setup, scripts (`start`, `dev`, `test`), and dependencies. |
| `technosync-dashboard/server/` | `test-health.js` | Zero-dependency verification script to spin up the server and test API contracts. |
| `technosync-dashboard/server/data/` | `complaints.json` | Persistent local database storage for citizen complaints. |
| `technosync-dashboard/server/data/` | `projects.json` | Persistent local database storage for MP projects. |
| `technosync-dashboard/server/src/` | `index.js` | Express application entry point setting up routes, middleware, and listeners. |
| `technosync-dashboard/server/src/` | `db.js` | JSON database read/write utility including schema/data auto-initialization. |
| `technosync-dashboard/server/src/` | `ai-engine.js` | Heuristic NLP analyzer for categorizing, region-matching, and scoring complaints. |

---

## 🔑 Design Proposals and Implementation Details

### 1. Express Server (`src/index.js`)
- **Port Strategy**: Server defaults to port `5000` via environment variables (`process.env.PORT || 5000`), allowing flexible runtime overrides.
- **Middleware**:
  - `cors()` to enable cross-origin browser access for the React Vite client.
  - `express.json()` to parse request bodies.
- **API Paths and Response Formats**:
  - `GET /api/complaints`: Returns `200 OK` with JSON array.
  - `POST /api/complaints`: Enriches incoming payloads via the AI engine, generates a UUID-based ID, stamps an ISO timestamp, appends to `complaints.json`, and returns `201 Created` with the enriched complaint.
  - `GET /api/projects`: Returns `200 OK` with JSON array of recommended and active projects.
  - `PATCH /api/projects/:id/status`: Updates project status (must be `Recommended | Planned | In Progress | Completed`), returns `200 OK` with the updated project.
- **Adversarial Error Handling**:
  - Captures bad payloads (e.g. empty complaint text or unsupported types) and returns `400 Bad Request`.
  - Captures nonexistent projects or routes and returns `404 Not Found`.
  - Implements a global error-handling middleware that prevents Express from dumping raw stack traces in the HTTP response, outputting a sanitized JSON message (`{ error: "..." }`) and logging the traceback locally for debugging.
  
- **Test-Friendly Exports**:
  - Conditionally starts the server using `if (require.main === module)` to prevent automatic listening during unit/integration tests that import the server object.

---

### 2. File Database Service (`src/db.js`)
- **Persistence Mechanism**: Standard synchronous file I/O operations (`fs.readFileSync`, `fs.writeFileSync`) are used to prevent file locking and read-write race conditions in local single-threaded Node.js setups.
- **Auto-Initialization**:
  - Dynamically runs `initDB()` before any file operation.
  - Recursively checks and creates the `data/` directory.
  - If `complaints.json` is missing, initializes it with an empty array `[]`.
  - If `projects.json` is missing, populates it with standard mock projects to give the MP Dashboard immediate data upon first run.

---

### 3. AI Heuristic Simulation Engine (`src/ai-engine.js`)
- **Categorization Rule Engine**: 
  - Tokenizes input text and applies keyword frequency matching. Maps to categories: `Roads`, `Water`, `Sanitation`, `Power`, `Security`, `Infrastructure`.
- **Location Extraction**:
  - Scans for location tokens (`Sector 4`, `Lake District`, etc.). If unmatched, defaults to the user's manual pin region or `Central Ward`.
- **Sentiment Profiling**:
  - Employs word lists of positive vs. negative indicators to gauge sentiment.
- **Urgency Scoring**:
  - Evaluates danger indicators (`emergency`, `hazard`, `outage`, `accident`) combined with negative sentiment to score urgency dynamically (`Low`, `Medium`, `High`, `Critical`).

---

### 4. Health Check Script (`test-health.js`)
- **Self-Hosting Port Resolution**:
  - Server is spun up using port `0`, prompting Node to choose a random, dynamically available port on the host. This prevents port conflicts.
- **API and Schema Audits**:
  - Performs GET/POST/PATCH workflows sequentially.
  - Asserts expected output format, fields, and HTTP status codes.
- **File System Assertions**:
  - Directly reads `data/complaints.json` and `data/projects.json` to verify files are written on disk with correct schemas.
- **Validation Isolation**:
  - Cleans up and exits with code `0` on success and `1` on failure, making it ideal for integration into CI workflows.

---

## 💻 Draft Code Structure Proposals

### Proposed `src/index.js`
```javascript
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
const aiEngine = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/complaints', (req, res, next) => {
  try {
    res.status(200).json(db.getComplaints());
  } catch (error) { next(error); }
});

app.post('/api/complaints', (req, res, next) => {
  try {
    const { text, type, region, coordinates, mediaUrl } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Complaint text is required.' });
    }
    const validTypes = ['text', 'audio', 'photo'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Valid complaint type is required.' });
    }

    const analysis = aiEngine.analyzeComplaint({ text, region });
    const newComplaint = {
      id: `comp-${crypto.randomUUID()}`,
      text: text.trim(),
      type,
      region: analysis.region,
      coordinates: coordinates || { x: 0, y: 0 },
      mediaUrl: mediaUrl || null,
      category: analysis.category,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      timestamp: new Date().toISOString()
    };

    const complaints = db.getComplaints();
    complaints.push(newComplaint);
    db.saveComplaints(complaints);

    res.status(201).json(newComplaint);
  } catch (error) { next(error); }
});

app.get('/api/projects', (req, res, next) => {
  try {
    res.status(200).json(db.getProjects());
  } catch (error) { next(error); }
});

app.patch('/api/projects/:id/status', (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const projects = db.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    projects[index].status = status;
    db.saveProjects(projects);
    res.status(200).json(projects[index]);
  } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  db.initDB();
  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}
module.exports = app;
```

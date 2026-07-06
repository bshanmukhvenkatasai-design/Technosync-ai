# Technical Proposal: Milestone 1 Backend Setup

This document outlines the detailed architectural proposal and code design for the TechnoSync AI local backend server inside the `technosync-dashboard/server/` directory.

---

## 1. Directory & Module Architecture

The backend server is built using Node.js and Express. It persists data to local JSON files and leverages an AI Simulation Engine with heuristic-based natural language processing to categorize, score, and locate incoming community complaints.

Proposed file layout:
```
technosync-dashboard/server/
├── data/
│   ├── complaints.json       # Persisted complaints database
│   └── projects.json         # Persisted projects database
├── src/
│   ├── index.js              # Express application configuration and routes
│   ├── db.js                 # Low-level JSON database service with atomic writes
│   └── ai-engine.js          # Heuristic classification & sentiment analysis engine
├── package.json              # Dependencies and runnable script configuration
└── test-health.js            # Self-contained health check test suite
```

### package.json Configuration
Dependencies will include only standard, lightweight packages to minimize security risk and maintain speed:
- `express`: Minimal and flexible Node.js web application framework.
- `cors`: Middleware to enable Cross-Origin Resource Sharing (CORS) with the React client.
- `nodemon` (devDependencies): For hot-reloading during development.

---

## 2. API Contract & Validation Details

### Endpoint 1: `GET /api/complaints`
- **Method**: `GET`
- **Path**: `/api/complaints`
- **Response**: `200 OK`
  - Returns a JSON array containing all complaints.
  - Format:
    ```json
    [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "text": "The streetlight at 5th and Main is completely broken.",
        "type": "text",
        "region": "Downtown",
        "coordinates": { "x": 42.5, "y": -71.1 },
        "mediaUrl": null,
        "category": "Power",
        "sentiment": "Negative",
        "urgency": "High",
        "timestamp": "2026-07-06T14:10:00.000Z"
      }
    ]
    ```

### Endpoint 2: `POST /api/complaints`
- **Method**: `POST`
- **Path**: `/api/complaints`
- **Request Body**:
  - `text`: string, non-empty, required. Max length 2000 chars.
  - `type`: string, enum: `["text", "audio", "photo"]`, optional (defaults to `"text"`).
  - `region`: string, optional (defaults to `"Downtown"` if unrecognized or empty).
  - `coordinates`: object containing `x` (number) and `y` (number), optional (defaults to `{ "x": 0, "y": 0 }`).
  - `mediaUrl`: string (valid URL or path) or null, optional (defaults to `null`).
- **Response**: `201 Created`
  - Returns the enriched complaint object incorporating the results of the heuristic parser in the AI Simulation Engine.
- **Error Responses**:
  - `400 Bad Request`: If validation fails (e.g. empty `text`, invalid `type`, malformed `coordinates`).
    ```json
    {
      "error": "Validation Failed",
      "details": ["'text' is a required field", "'type' must be one of: text, audio, photo"]
    }
    ```

### Endpoint 3: `GET /api/projects`
- **Method**: `GET`
- **Path**: `/api/projects`
- **Response**: `200 OK`
  - Returns a JSON array containing all recommended, planned, in-progress, and completed projects.
  - Default sample projects are auto-populated if the database file does not exist.

### Endpoint 4: `PATCH /api/projects/:id/status`
- **Method**: `PATCH`
- **Path**: `/api/projects/:id/status`
- **Request Body**:
  - `status`: string, enum: `["Recommended", "Planned", "In Progress", "Completed"]`, required.
- **Response**: `200 OK`
  - Returns the updated project object.
- **Error Responses**:
  - `400 Bad Request`: If the status value is invalid.
  - `404 Not Found`: If the project ID does not match any existing project.

---

## 3. Draft Code Proposals

We present robust, production-ready draft designs for each file.

### A. Database Service (`src/db.js`)
To prevent concurrent write corruption and disk-write hazards (such as power outages or disk-full events during write), `db.js` features:
1. An in-memory queue/mutex to serialize file operations.
2. POSIX-style atomic writes (writing to a `.tmp` file and renaming it using `fs.rename`).
3. Auto-initialization of directory structures and seed project data.

```javascript
const fs = require('fs').promises;
const path = require('path');

// Determine data paths based on environment
const isTest = process.env.NODE_ENV === 'test';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const COMPLAINTS_FILE = path.join(DATA_DIR, isTest ? 'complaints.test.json' : 'complaints.json');
const PROJECTS_FILE = path.join(DATA_DIR, isTest ? 'projects.test.json' : 'projects.json');

// In-memory Promise lock (Mutex) to serialize reads & writes per file
class FileMutex {
  constructor() {
    this.queue = Promise.resolve();
  }

  runExclusive(fn) {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {}); // prevent lock poisoning
    return next;
  }
}

const complaintsMutex = new FileMutex();
const projectsMutex = new FileMutex();

const defaultProjects = [
  {
    "id": "proj-1",
    "title": "Smart Grid Upgrade",
    "description": "Upgrade outdated power distribution networks with smart meters and automated circuit breakers.",
    "region": "North Ward",
    "cost": 120000,
    "timeline": "6 Months",
    "beneficiaries": 5000,
    "status": "Recommended",
    "urgency": "High"
  },
  {
    "id": "proj-2",
    "title": "Water Pipeline Restoration",
    "description": "Repair leaking main conduits and install digital pressure monitors.",
    "region": "East District",
    "cost": 85000,
    "timeline": "3 Months",
    "beneficiaries": 3200,
    "status": "Planned",
    "urgency": "Critical"
  },
  {
    "id": "proj-3",
    "title": "Main Street Paving",
    "description": "Resurface eroded roadways and upgrade storm drainage channels.",
    "region": "Downtown",
    "cost": 150000,
    "timeline": "4 Months",
    "beneficiaries": 10000,
    "status": "In Progress",
    "urgency": "Medium"
  },
  {
    "id": "proj-4",
    "title": "Community CCTV Integration",
    "description": "Install high-definition security cameras at high-traffic intersections.",
    "region": "West Suburbs",
    "cost": 45000,
    "timeline": "2 Months",
    "beneficiaries": 1500,
    "status": "Completed",
    "urgency": "Low"
  }
];

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function initDb() {
  await ensureDir(DATA_DIR);

  // Initialize Complaints File
  try {
    await fs.access(COMPLAINTS_FILE);
  } catch {
    await fs.writeFile(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }

  // Initialize Projects File
  try {
    await fs.access(PROJECTS_FILE);
  } catch {
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(defaultProjects, null, 2), 'utf8');
  }
}

// Atomic file writer
async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

module.exports = {
  initDb,
  
  readComplaints: () => complaintsMutex.runExclusive(async () => {
    await initDb();
    const data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
    return JSON.parse(data);
  }),

  writeComplaints: (complaints) => complaintsMutex.runExclusive(async () => {
    await initDb();
    await writeJsonAtomic(COMPLAINTS_FILE, complaints);
    return complaints;
  }),

  readProjects: () => projectsMutex.runExclusive(async () => {
    await initDb();
    const data = await fs.readFile(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  }),

  writeProjects: (projects) => projectsMutex.runExclusive(async () => {
    await initDb();
    await writeJsonAtomic(PROJECTS_FILE, projects);
    return projects;
  }),

  // Helper helper to clean up test database files
  cleanupTestFiles: async () => {
    if (!isTest) return;
    try {
      await fs.unlink(COMPLAINTS_FILE);
    } catch {}
    try {
      await fs.unlink(PROJECTS_FILE);
    } catch {}
  }
};
```

---

### B. AI Simulation Engine (`src/ai-engine.js`)
This engine uses normalized string operations and weighted regex rules to categorize and evaluate incoming complaints.

```javascript
// Heuristic classification matrices
const CATEGORY_KEYWORDS = {
  Roads: [/pothole/i, /road/i, /street/i, /asphalt/i, /pavement/i, /sidewalk/i, /driveway/i, /traffic/i, /lane/i, /drainage/i],
  Water: [/water/i, /leak/i, /pipe/i, /burst/i, /tap/i, /flooding/i, /flood/i, /hydrant/i, /pressure/i, /contamination/i],
  Sanitation: [/garbage/i, /trash/i, /litter/i, /waste/i, /sewage/i, /sewer/i, /smell/i, /odor/i, /toilet/i, /hygiene/i, /overflow/i],
  Power: [/power/i, /electricity/i, /outage/i, /blackout/i, /wire/i, /cable/i, /transformer/i, /grid/i, /brownout/i, /dark/i, /light/i],
  Security: [/theft/i, /crime/i, /robbery/i, /break-in/i, /police/i, /patrol/i, /assault/i, /camera/i, /lighting/i, /vandal/i, /safety/i],
  Infrastructure: [/bridge/i, /building/i, /structure/i, /bench/i, /park/i, /fence/i, /wall/i, /facility/i, /collapse/i]
};

const REGIONS = [
  { name: 'Downtown', pattern: /downtown/i },
  { name: 'North Ward', pattern: /north\s+ward/i },
  { name: 'East District', pattern: /east\s+district/i },
  { name: 'West Suburbs', pattern: /west\s+suburbs/i },
  { name: 'South Zone', pattern: /south\s+zone/i }
];

const SENTIMENT_KEYWORDS = {
  positive: [/good/i, /great/i, /thanks/i, /clean/i, /safe/i, /excellent/i, /resolved/i, /help/i, /improve/i],
  negative: [/broken/i, /bad/i, /danger/i, /unsafe/i, /worst/i, /angry/i, /failure/i, /leaking/i, /smell/i, /noise/i, /accident/i, /delay/i, /slow/i, /damage/i]
};

const URGENCY_KEYWORDS = {
  critical: [/explosion/i, /fire/i, /collapse/i, /imminent/i, /injury/i, /emergency/i, /life-threatening/i, /live wire/i, /bleeding/i],
  high: [/broken/i, /outage/i, /leak/i, /thief/i, /hazard/i, /severe/i, /flooding/i, /unsafe/i, /blackout/i],
  medium: [/pothole/i, /dirty/i, /smell/i, /trash/i, /delay/i, /slow/i, /repair/i, /maintenance/i],
  low: [/minor/i, /aesthetic/i, /cosmetic/i, /general/i, /suggestion/i, /query/i, /info/i]
};

/**
 * Classifies the complaint text into a primary category.
 */
function classifyCategory(text) {
  let bestCategory = 'Infrastructure'; // default fallback
  let maxScore = 0;

  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

/**
 * Extracts a region based on text keywords, falling back to body input or 'Downtown'.
 */
function extractRegion(text, inputRegion) {
  for (const region of REGIONS) {
    if (region.pattern.test(text)) {
      return region.name;
    }
  }

  // Fallback check
  if (inputRegion && REGIONS.some(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase())) {
    // Return standard casing version of the input region
    return REGIONS.find(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase()).name;
  }
  
  return 'Downtown'; // ultimate default
}

/**
 * Analyzes sentiment using simple word counts.
 */
function analyzeSentiment(text) {
  let positiveScore = 0;
  let negativeScore = 0;

  for (const pattern of SENTIMENT_KEYWORDS.positive) {
    if (pattern.test(text)) positiveScore++;
  }
  for (const pattern of SENTIMENT_KEYWORDS.negative) {
    if (pattern.test(text)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'Positive';
  if (negativeScore > positiveScore) return 'Negative';
  return 'Neutral';
}

/**
 * Assigns urgency score based on weighted keywords.
 */
function determineUrgency(text) {
  let score = 0;

  for (const pattern of URGENCY_KEYWORDS.critical) {
    if (pattern.test(text)) score += 5;
  }
  for (const pattern of URGENCY_KEYWORDS.high) {
    if (pattern.test(text)) score += 3;
  }
  for (const pattern of URGENCY_KEYWORDS.medium) {
    if (pattern.test(text)) score += 1;
  }
  for (const pattern of URGENCY_KEYWORDS.low) {
    if (pattern.test(text)) score -= 1; // mitigate high scoring for trivial complaints
  }

  if (score >= 5) return 'Critical';
  if (score >= 3) return 'High';
  if (score >= 1) return 'Medium';
  return 'Low';
}

/**
 * Analyzes raw complaint data and enriches it with heuristics.
 */
function analyzeComplaint(text, inputRegion = null) {
  const normalizedText = (text || '').trim();
  
  return {
    category: classifyCategory(normalizedText),
    region: extractRegion(normalizedText, inputRegion),
    sentiment: analyzeSentiment(normalizedText),
    urgency: determineUrgency(normalizedText)
  };
}

module.exports = {
  analyzeComplaint,
  classifyCategory,
  extractRegion,
  analyzeSentiment,
  determineUrgency
};
```

---

### C. Express App Server Entry Point (`src/index.js`)
Standard, robust implementation showing all routing, validations, middleware, and system shutdown handlers.

```javascript
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
const aiEngine = require('./ai-engine');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request validator utility
function validateComplaintBody(req, res, next) {
  const { text, type, coordinates, mediaUrl } = req.body;
  const errors = [];

  if (typeof text !== 'string' || text.trim().length === 0) {
    errors.push("'text' must be a non-empty string.");
  } else if (text.length > 2000) {
    errors.push("'text' length cannot exceed 2000 characters.");
  }

  if (type !== undefined && !['text', 'audio', 'photo'].includes(type)) {
    errors.push("'type' must be one of: text, audio, photo.");
  }

  if (coordinates !== undefined) {
    if (typeof coordinates !== 'object' || coordinates === null || 
        typeof coordinates.x !== 'number' || typeof coordinates.y !== 'number') {
      errors.push("'coordinates' must be an object with numeric 'x' and 'y' fields.");
    }
  }

  if (mediaUrl !== undefined && mediaUrl !== null && typeof mediaUrl !== 'string') {
    errors.push("'mediaUrl' must be a string or null.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation Failed', details: errors });
  }

  next();
}

function validateProjectStatusBody(req, res, next) {
  const { status } = req.body;
  const allowedStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Validation Failed',
      details: [`'status' must be one of: ${allowedStatuses.join(', ')}`]
    });
  }

  next();
}

// Routes

// 1. GET /api/complaints
app.get('/api/complaints', async (req, res, next) => {
  try {
    const complaints = await db.readComplaints();
    res.json(complaints);
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/complaints
app.post('/api/complaints', validateComplaintBody, async (req, res, next) => {
  try {
    const { text, type, region, coordinates, mediaUrl } = req.body;

    // Process with AI Engine
    const analysis = aiEngine.analyzeComplaint(text, region);

    const newComplaint = {
      id: crypto.randomUUID(),
      text: text.trim(),
      type: type || 'text',
      region: analysis.region,
      coordinates: coordinates || { x: 0, y: 0 },
      mediaUrl: mediaUrl || null,
      category: analysis.category,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      timestamp: new Date().toISOString()
    };

    const complaints = await db.readComplaints();
    complaints.push(newComplaint);
    await db.writeComplaints(complaints);

    res.status(201).json(newComplaint);
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/projects
app.get('/api/projects', async (req, res, next) => {
  try {
    const projects = await db.readProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// 4. PATCH /api/projects/:id/status
app.patch('/api/projects/:id/status', validateProjectStatusBody, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const projects = await db.readProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project Not Found' });
    }

    projects[projectIndex].status = status;
    await db.writeProjects(projects);

    res.json(projects[projectIndex]);
  } catch (error) {
    next(error);
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack || err);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON Payload' });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message
  });
});

// Start Server helper for local run vs test import
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`[TechnoSync Backend] Running on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[TechnoSync Backend] Shutting down gracefully...');
    server.close(() => {
      console.log('[TechnoSync Backend] Stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
```

---

### D. Verification Health Check Script (`test-health.js`)
An automated health check script that verifies all functionality under a separate `test` environment to prevent production file pollution.

```javascript
// Force test environment
process.env.NODE_ENV = 'test';

const app = require('./src/index');
const db = require('./src/db');
const assert = require('assert').strict;

const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper utility to make HTTP requests using native global fetch
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  
  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  
  return { status: response.status, body };
}

async function runTests() {
  console.log('--- Starting TechnoSync M1 Backend Verification ---');
  
  // 1. Initial cleanup of potential leftovers
  await db.cleanupTestFiles();
  await db.initDb();

  // 2. Start the Express App Server on the test port
  const server = app.listen(TEST_PORT, async () => {
    console.log(`Test server active on port ${TEST_PORT}. Running assertions...\n`);
    
    try {
      // Test Case 1: GET /api/projects returns seeded default projects
      console.log('Case 1: Fetching initial projects...');
      const getProj = await request('/api/projects');
      assert.equal(getProj.status, 200, 'GET projects should return 200 OK');
      assert(Array.isArray(getProj.body), 'GET projects body should be an array');
      assert.equal(getProj.body.length, 4, 'Seeded projects should contain 4 projects');
      console.log('✔ Case 1 Passed.\n');

      // Test Case 2: POST /api/complaints processes new complaint through AI Engine
      console.log('Case 2: Submitting a valid water leak complaint...');
      const complaintPayload = {
        text: 'A giant water pipe burst at North Ward! The street is flooding completely.',
        type: 'text',
        region: 'North Ward',
        coordinates: { x: 12.3, y: 45.6 },
        mediaUrl: null
      };
      
      const postComp = await request('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(complaintPayload)
      });
      
      assert.equal(postComp.status, 201, 'POST complaints should return 201 Created');
      assert(postComp.body.id, 'Response should contain a generated ID');
      assert(postComp.body.timestamp, 'Response should contain a timestamp');
      assert.equal(postComp.body.category, 'Water', 'Heuristic parser should classify "pipe burst / water" as Water');
      assert.equal(postComp.body.region, 'North Ward', 'Heuristic parser should extract region "North Ward"');
      assert.equal(postComp.body.sentiment, 'Negative', 'Sentiment analyzer should return Negative');
      assert.equal(postComp.body.urgency, 'High', 'Urgency score should match High category rules');
      console.log('✔ Case 2 Passed.\n');

      // Test Case 3: GET /api/complaints reflects the new complaint
      console.log('Case 3: Fetching complaints list...');
      const getComps = await request('/api/complaints');
      assert.equal(getComps.status, 200, 'GET complaints should return 200 OK');
      assert.equal(getComps.body.length, 1, 'Complaints database should contain 1 complaint');
      assert.equal(getComps.body[0].id, postComp.body.id, 'Fetched complaint ID must match POSTed complaint');
      console.log('✔ Case 3 Passed.\n');

      // Test Case 4: PATCH /api/projects/:id/status updates status
      console.log('Case 4: Updating a project status...');
      const targetProject = getProj.body[0]; // e.g. proj-1
      const patchProj = await request(`/api/projects/${targetProject.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'In Progress' })
      });
      
      assert.equal(patchProj.status, 200, 'PATCH project status should return 200 OK');
      assert.equal(patchProj.body.status, 'In Progress', 'Status must be updated to In Progress');
      
      // Verify in DB as well
      const verifyProj = await request('/api/projects');
      const updatedProj = verifyProj.body.find(p => p.id === targetProject.id);
      assert.equal(updatedProj.status, 'In Progress', 'Database project status must be In Progress');
      console.log('✔ Case 4 Passed.\n');

      // Test Case 5: Validation checks
      console.log('Case 5: Verifying validation handlers...');
      
      // Empty text error check
      const emptyTextRes = await request('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({ text: '', type: 'text' })
      });
      assert.equal(emptyTextRes.status, 400, 'Empty complaint text should trigger 400 Bad Request');
      assert(emptyTextRes.body.error, 'Should return error property');
      
      // Invalid status error check
      const invalidStatusRes = await request(`/api/projects/${targetProject.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'InvalidStatusState' })
      });
      assert.equal(invalidStatusRes.status, 400, 'Invalid status update must trigger 400 Bad Request');

      // Non-existent project error check
      const notFoundRes = await request('/api/projects/non-existent-id/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed' })
      });
      assert.equal(notFoundRes.status, 404, 'Non-existent project update must return 404 Not Found');
      console.log('✔ Case 5 Passed.\n');

      console.log('===================================================');
      console.log('🎉 ALL HEALTH CHECK TESTS PASSED SUCCESSFULLY! 🎉');
      console.log('===================================================');
      
      server.close(async () => {
        await db.cleanupTestFiles();
        process.exit(0);
      });
    } catch (testError) {
      console.error('❌ ASSERTION OR RUNTIME TEST ERROR:', testError);
      server.close(async () => {
        await db.cleanupTestFiles();
        process.exit(1);
      });
    }
  });
}

runTests().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
```

---

## 4. Key Recommendations & Safety Mitigations

1. **Environmental Pathing Configuration**:
   - Ensure the server allows passing `DATA_DIR` and `NODE_ENV` as environment variables. This avoids hardcoding filesystem paths and ensures test isolated databases are cleaned up after runs.

2. **Atomic Writes via Temp Files**:
   - Simply calling `fs.writeFile` overwrites existing data immediately. If the server crashes during write or out-of-disk occurs, the JSON file becomes corrupt. The proposed atomic write writes to `<file>.tmp` first and then utilizes `fs.rename` to replace it instantly at OS level.

3. **Node native `fetch` Usage**:
   - For `test-health.js`, native `fetch` introduced in Node.js 18+ is used. This prevents the need to install HTTP client packages such as `axios`, reducing external dependencies to zero for testing.

4. **Regex normalization in NLP**:
   - The engine normalizes whitespace and lowercase before checks. Compound statements (e.g. "pipe-burst") are caught by flexible regex rules. Let's make sure keyword evaluation assigns weights to match intensities.

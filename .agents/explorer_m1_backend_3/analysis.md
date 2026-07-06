# Milestone 1 Backend Setup - Architectural Design Proposal

This document outlines the comprehensive technical proposal and code design for the Node.js/Express backend server, JSON database, AI Simulation Engine, and verification test script.

---

## 1. Express App Design (`technosync-dashboard/server/src/index.js`)

The entry point file `index.js` will initialize the Express application, register essential middlewares, map API endpoints to their handlers, and set up robust centralized error handling.

### Key Architectural Features:
1. **Zero External Logging Dependencies**: Uses standard `console.log` for requests to keep standard footprint low.
2. **CORS Protection**: Standard CORS middleware allowing local client origins (e.g., Vite development server defaults to `http://localhost:5173`).
3. **Graceful Server Lifecycle**: Exports the `app` instance for programmatic startup in tests, while executing `app.listen()` when run directly (`require.main === module`).

### Proposed File Content & Structure:
```javascript
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { analyzeComplaint } = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Interface Contracts & Validation Helpers
const VALID_PROJECT_STATUSES = ['Recommended', 'Planned', 'In Progress', 'Completed'];

// 1. GET /api/complaints
app.get('/api/complaints', (req, res, next) => {
  try {
    const complaints = db.readComplaints();
    res.json(complaints);
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/complaints
app.post('/api/complaints', (req, res, next) => {
  try {
    const { text, type, region, coordinates, mediaUrl } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Complaint text is required and must be a non-empty string' });
    }

    const complaintType = type || 'text';
    if (!['text', 'audio', 'photo'].includes(complaintType)) {
      return res.status(400).json({ error: "Type must be one of 'text', 'audio', or 'photo'" });
    }

    // Process using AI Engine
    const analyzed = analyzeComplaint(text, region, coordinates, complaintType, mediaUrl);

    // Save to Database
    const complaints = db.readComplaints();
    complaints.push(analyzed);
    db.writeComplaints(complaints);

    res.status(201).json(analyzed);
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/projects
app.get('/api/projects', (req, res, next) => {
  try {
    const projects = db.readProjects();
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// 4. PATCH /api/projects/:id/status
app.patch('/api/projects/:id/status', (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (!VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}` 
      });
    }

    const projects = db.readProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: `Project with ID ${id} not found` });
    }

    projects[projectIndex].status = status;
    db.writeProjects(projects);

    res.json(projects[projectIndex]);
  } catch (err) {
    next(err);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start listener only if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TechnoSync AI server running on port ${PORT}`);
  });
}

module.exports = app;
```

---

## 2. JSON Database Design (`technosync-dashboard/server/src/db.js`)

To ensure lightweight local development without dependency overhead, the application persists state in simple JSON files. A helper module handles safe file reads, writes, and database directory initialization.

### Environment Isolation Best Practice:
To prevent test runs from dirtying or corrupting production/development data, the database resolves target files dynamically based on `process.env.NODE_ENV === 'test'`.
- Production/Development databases: `complaints.json`, `projects.json`
- Test databases: `complaints.test.json`, `projects.test.json`

### Proposed File Content & Structure:
```javascript
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const isTest = process.env.NODE_ENV === 'test';

const COMPLAINTS_FILE = path.join(DATA_DIR, isTest ? 'complaints.test.json' : 'complaints.json');
const PROJECTS_FILE = path.join(DATA_DIR, isTest ? 'projects.test.json' : 'projects.json');

// Default initial data for projects
const DEFAULT_PROJECTS = [
  {
    "id": "proj-1",
    "title": "Road Resurfacing & Pothole Repair",
    "description": "Comprehensive repair of primary roads and pothole patching across the sector.",
    "region": "Sector 1",
    "cost": 45000,
    "timeline": "3 weeks",
    "beneficiaries": 1200,
    "status": "Recommended",
    "urgency": "Medium"
  },
  {
    "id": "proj-2",
    "title": "Water Pipeline Leak Repair & Upgrade",
    "description": "Fixing major underground pipe leaks and upgrading municipal water valves.",
    "region": "Sector 2",
    "cost": 85000,
    "timeline": "5 weeks",
    "beneficiaries": 3500,
    "status": "Planned",
    "urgency": "High"
  },
  {
    "id": "proj-3",
    "title": "Smart Streetlight Grid Installation",
    "description": "Installing high-efficiency LED smart streetlights to improve visibility and security.",
    "region": "Sector 3",
    "cost": 30000,
    "timeline": "2 weeks",
    "beneficiaries": 2000,
    "status": "In Progress",
    "urgency": "Low"
  },
  {
    "id": "proj-4",
    "title": "Emergency Power Substation Overhaul",
    "description": "Replacing aging transformers and faulty grid lines to prevent power outages.",
    "region": "Sector 4",
    "cost": 150000,
    "timeline": "8 weeks",
    "beneficiaries": 10000,
    "status": "Recommended",
    "urgency": "Critical"
  }
];

function initializeDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(COMPLAINTS_FILE)) {
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }

  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(DEFAULT_PROJECTS, null, 2), 'utf8');
  }
}

// Proactive execution on load
initializeDb();

function readComplaints() {
  try {
    const data = fs.readFileSync(COMPLAINTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading complaints file:', err);
    return [];
  }
}

function writeComplaints(complaints) {
  try {
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing complaints file:', err);
    throw err;
  }
}

function readProjects() {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading projects file:', err);
    return [];
  }
}

function writeProjects(projects) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing projects file:', err);
    throw err;
  }
}

// Clean utility specifically for automated tests
function deleteTestDbFiles() {
  if (isTest) {
    try {
      if (fs.existsSync(COMPLAINTS_FILE)) fs.unlinkSync(COMPLAINTS_FILE);
      if (fs.existsSync(PROJECTS_FILE)) fs.unlinkSync(PROJECTS_FILE);
    } catch (err) {
      console.error('Error deleting test DB files:', err);
    }
  }
}

module.exports = {
  readComplaints,
  writeComplaints,
  readProjects,
  writeProjects,
  initializeDb,
  deleteTestDbFiles
};
```

---

## 3. AI Simulation Engine Design (`technosync-dashboard/server/src/ai-engine.js`)

The AI engine simulates Natural Language Processing (NLP) classifiers using static vocabulary lists and pattern matchings to categorize issues, map locations, assess emotion/sentiment, and evaluate severity levels.

### Heuristics Mechanics:
- **Category Classifier**: Analyzes density counts of specific terms. Returns category with the highest density score, defaulting to `Infrastructure`.
- **Location Parser**: Checks for specific naming formats, e.g., "Sector [digit]" or "Zone [A-D]". Fallback value is the optional `region` parameter supplied in request body (representing client GPS/SVG context) or defaults to `Sector 1`.
- **Sentiment Classifier**: Tallies counts of positive vs negative keywords. Returns `Negative` if negative terms dominate, `Positive` if positive terms dominate, otherwise `Neutral`.
- **Urgency Assessor**: Matches warning triggers in decreasing order of priority (`Critical` -> `High` -> `Medium`), defaulting to `Low`.

### Proposed File Content & Structure:
```javascript
const crypto = require('crypto');

const CATEGORIES = {
  Water: ['water', 'leak', 'pipe', 'burst', 'plumbing', 'drain', 'sewage', 'flooding', 'flood', 'hydrant', 'faucet', 'sink'],
  Sanitation: ['garbage', 'trash', 'waste', 'litter', 'smell', 'dump', 'clean', 'hygiene', 'sewer', 'odor', 'dirty', 'dumpster'],
  Power: ['power', 'electricity', 'outage', 'blackout', 'grid', 'wire', 'transformer', 'darkness', 'light', 'electric', 'voltage'],
  Security: ['theft', 'crime', 'robbery', 'danger', 'police', 'patrol', 'suspicious', 'break-in', 'assault', 'harassment', 'safety', 'threat', 'vandalism'],
  Roads: ['pothole', 'asphalt', 'street', 'road', 'traffic', 'sidewalk', 'pavement', 'crack', 'potholes', 'lane', 'manhole'],
  Infrastructure: ['building', 'facility', 'structure', 'park', 'bench', 'playground', 'sign', 'fence', 'wall', 'bridge', 'structure']
};

const POSITIVE_WORDS = ['good', 'great', 'thank', 'happy', 'resolved', 'improved', 'appreciate', 'nice', 'excellent', 'fixed', 'helpful', 'safe'];
const NEGATIVE_WORDS = ['bad', 'broken', 'worst', 'danger', 'fail', 'slow', 'terrible', 'accident', 'angry', 'poor', 'leak', 'outage', 'crime', 'hazard', 'problem', 'defect', 'issue', 'complaint', 'ruined', 'destroyed', 'unsafe', 'dirty'];

const URGENCY_KEYWORDS = {
  Critical: ['emergency', 'fire', 'danger', 'life', 'injury', 'hazard', 'immediate', 'sparking', 'explosion', 'toxic', 'collapse', 'poison'],
  High: ['broken', 'outage', 'severe', 'urgent', 'theft', 'crime', 'flooding', 'accident', 'leak'],
  Medium: ['slow', 'delay', 'maintenance', 'smell', 'litter', 'pothole', 'dirty']
};

function analyzeComplaint(text = '', requestRegion = '', requestCoordinates = null, type = 'text', mediaUrl = null) {
  const cleanText = text.toLowerCase();

  // 1. Category Classification
  let selectedCategory = 'Infrastructure';
  let maxScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const word of keywords) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = cleanText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = category;
    }
  }

  // 2. Region / Location Extraction
  let extractedRegion = requestRegion || 'Sector 1';
  const sectorMatch = cleanText.match(/sector\s*(\d+)/i);
  if (sectorMatch) {
    extractedRegion = `Sector ${sectorMatch[1]}`;
  } else {
    const zoneMatch = cleanText.match(/zone\s*([a-d])/i);
    if (zoneMatch) {
      extractedRegion = `Zone ${zoneMatch[1].toUpperCase()}`;
    }
  }

  // 3. Sentiment Determination
  let positiveScore = 0;
  let negativeScore = 0;
  for (const word of POSITIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = cleanText.match(regex);
    if (matches) positiveScore += matches.length;
  }
  for (const word of NEGATIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = cleanText.match(regex);
    if (matches) negativeScore += matches.length;
  }

  let sentiment = 'Neutral';
  if (negativeScore > positiveScore) {
    sentiment = 'Negative';
  } else if (positiveScore > negativeScore) {
    sentiment = 'Positive';
  }

  // 4. Urgency Calculation
  let urgency = 'Low';
  let hasCritical = URGENCY_KEYWORDS.Critical.some(word => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(cleanText);
  });
  let hasHigh = URGENCY_KEYWORDS.High.some(word => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(cleanText);
  });
  let hasMedium = URGENCY_KEYWORDS.Medium.some(word => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(cleanText);
  });

  if (hasCritical) {
    urgency = 'Critical';
  } else if (hasHigh) {
    urgency = 'High';
  } else if (hasMedium) {
    urgency = 'Medium';
  }

  return {
    id: `comp-${crypto.randomUUID()}`,
    text,
    type,
    region: extractedRegion,
    coordinates: requestCoordinates || { x: 50, y: 50 },
    mediaUrl,
    category: selectedCategory,
    sentiment,
    urgency,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  analyzeComplaint
};
```

---

## 4. Verification Health Check Script (`technosync-dashboard/server/test-health.js`)

To enable instant verification of server health without dependencies like `supertest` or `mocha`, we design a script that starts the Express server programmatically on a separate test port, fires local calls, asserts response values and database state, cleanups state, and exits.

### Design Highlights:
- **Zero Dependencies**: Uses standard, native Node.js `http` module wrapper for API requests.
- **Auto Cleanup**: Deletes generated test files `.test.json` after running tests to leave zero artifacts in git.
- **Clean Interface**: Returns standard `0` for success and `1` for failures, displaying assertion details.

### Proposed File Content & Structure:
```javascript
// Force Test Environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';

const http = require('http');
const db = require('./src/db');
const app = require('./src/index');

// Native Node HTTP wrapper to avoid test dependencies
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3099,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting TechnoSync Backend Health Check ---');

  // Start the server listener on test port
  const server = app.listen(3099, async () => {
    console.log('Test Server listening on port 3099...');

    try {
      // Test 1: GET /health
      console.log('Testing GET /health...');
      const healthRes = await makeRequest('GET', '/health');
      assert(healthRes.status === 200, 'Health endpoint status is not 200');
      assert(healthRes.body.status === 'ok', 'Health status is not ok');

      // Test 2: GET /api/complaints (Should be empty initially in test mode)
      console.log('Testing GET /api/complaints (Initial)...');
      const complaintsInit = await makeRequest('GET', '/api/complaints');
      assert(complaintsInit.status === 200, 'Complaints GET status is not 200');
      assert(Array.isArray(complaintsInit.body), 'Complaints response is not an array');
      assert(complaintsInit.body.length === 0, 'Complaints list should be empty initially');

      // Test 3: POST /api/complaints (Submit a Critical Power issue)
      console.log('Testing POST /api/complaints (Valid Submission)...');
      const payload = {
        text: 'The streetlights in Zone B are sparking and pose an immediate fire threat!',
        type: 'text',
        region: 'Zone A', // Request specifies Zone A but text says Zone B
        coordinates: { x: 25, y: 75 }
      };
      const postRes = await makeRequest('POST', '/api/complaints', payload);
      assert(postRes.status === 201, 'Post complaint failed with non-210 status');
      
      const comp = postRes.body;
      assert(comp.id && comp.id.startsWith('comp-'), 'ID not formatted correctly');
      assert(comp.category === 'Power', `Category should be Power, got: ${comp.category}`);
      assert(comp.region === 'Zone B', `Region extraction failed. Expected: Zone B, Got: ${comp.region}`);
      assert(comp.sentiment === 'Negative', `Sentiment should be Negative, got: ${comp.sentiment}`);
      assert(comp.urgency === 'Critical', `Urgency should be Critical, got: ${comp.urgency}`);
      assert(comp.coordinates.x === 25 && comp.coordinates.y === 75, 'Coordinates mismatch');

      // Test 4: Verify Database Persistence for Complaint
      console.log('Testing Database state for complaints...');
      const dbComplaints = db.readComplaints();
      assert(dbComplaints.length === 1, 'Database should hold exactly 1 complaint');
      assert(dbComplaints[0].id === comp.id, 'DB complaint ID mismatch');

      // Test 5: GET /api/projects
      console.log('Testing GET /api/projects...');
      const projectsRes = await makeRequest('GET', '/api/projects');
      assert(projectsRes.status === 200, 'Projects GET failed');
      assert(projectsRes.body.length === 4, 'Projects count mismatch. Should be 4');
      const targetProj = projectsRes.body.find(p => p.id === 'proj-1');
      assert(targetProj.status === 'Recommended', 'proj-1 initial status mismatch');

      // Test 6: PATCH /api/projects/:id/status
      console.log('Testing PATCH /api/projects/:id/status...');
      const patchRes = await makeRequest('PATCH', '/api/projects/proj-1/status', { status: 'In Progress' });
      assert(patchRes.status === 200, 'PATCH request failed');
      assert(patchRes.body.status === 'In Progress', 'PATCH status field not updated in response');

      // Test 7: Verify Database Persistence for Project Status
      console.log('Testing Database state for project status...');
      const dbProjects = db.readProjects();
      const dbProj1 = dbProjects.find(p => p.id === 'proj-1');
      assert(dbProj1.status === 'In Progress', 'DB project status was not updated in JSON file');

      // Test 8: Error validations
      console.log('Testing Invalid API calls (Error handling)...');
      // No text complaint
      const errComp = await makeRequest('POST', '/api/complaints', { type: 'text' });
      assert(errComp.status === 400, 'Failed to block empty complaint');

      // Invalid status transition
      const errPatchVal = await makeRequest('PATCH', '/api/projects/proj-1/status', { status: 'Super Active' });
      assert(errPatchVal.status === 400, 'Failed to block invalid status payload');

      // Non-existent project
      const errPatchId = await makeRequest('PATCH', '/api/projects/proj-none/status', { status: 'Planned' });
      assert(errPatchId.status === 404, 'Failed to reject missing project ID');

      console.log('\n>>> ALL HEALTH CHECK PASSED SUCCESSFULLY <<<');
      shutdown(0);
    } catch (err) {
      console.error('\n!!! HEALTH CHECK FAILED !!!');
      console.error(err.message || err);
      shutdown(1);
    }
  });

  function shutdown(code) {
    server.close(() => {
      console.log('Test Server stopped.');
      db.deleteTestDbFiles(); // Clean up test json files
      console.log('Temporary Test DB files removed.');
      process.exit(code);
    });
  }
}

runTests();
```

---

## 5. Summary and Work Guidance for the Implementer

1. **Local Dir Initialization**: Create the `technosync-dashboard/server/` folder and establish subfolders `src` and `data`.
2. **Project package.json**: Run `npm init -y` inside `technosync-dashboard/server` and install `express` and `cors` as dependencies.
3. **CommonJS modules**: Maintain standard CommonJS syntax for optimal stability inside standard local Node configurations.
4. **File Path Resolution**: Ensure all paths to database files resolve using `path.join(__dirname, ...)` to ensure the server starts seamlessly regardless of working directory.
5. **No Data Leakage**: Do not commit any `.test.json` files to Git. Add `*.test.json` and local DB locks to `.gitignore`.

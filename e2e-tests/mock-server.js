const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const aiEngine = require('../technosync-dashboard/server/src/ai-engine');

const COMPLAINTS_FILE = path.join(config.DATA_DIR, 'complaints.test.json');
const PROJECTS_FILE = path.join(config.DATA_DIR, 'projects.test.json');

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
  await ensureDir(config.DATA_DIR);
  try {
    await fs.access(COMPLAINTS_FILE);
  } catch {
    await fs.writeFile(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  try {
    await fs.access(PROJECTS_FILE);
  } catch {
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(defaultProjects, null, 2), 'utf8');
  }
}

async function readComplaints() {
  await initDb();
  const data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeComplaints(data) {
  await initDb();
  await fs.writeFile(COMPLAINTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function readProjects() {
  await initDb();
  const data = await fs.readFile(PROJECTS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeProjects(data) {
  await initDb();
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function isValidTransition(current, next) {
  if (current === next) return true;
  if (current === 'Completed') return false; // cannot go back or change from Completed
  if (current === 'Recommended') {
    return next === 'Planned' || next === 'In Progress';
  }
  if (current === 'Planned') {
    return next === 'In Progress';
  }
  if (current === 'In Progress') {
    return next === 'Completed';
  }
  return false;
}

// Helper to send JSON responses
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*'
  });
  res.end(JSON.stringify(data));
}

// Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // 1. GET /api/complaints
    if (pathname === '/api/complaints' && req.method === 'GET') {
      const complaints = await readComplaints();
      const sorted = [...complaints]
        .filter(c => c && typeof c === 'object' && c.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return sendJSON(res, 200, sorted);
    }

    // 2. POST /api/complaints
    if (pathname === '/api/complaints' && req.method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return sendJSON(res, 400, { error: 'Malformed JSON Payload' });
      }

      const { text, type, region, coordinates, mediaUrl } = body;
      const errors = [];

      if (text === undefined) {
        errors.push("'text' is a required field");
      } else if (typeof text !== 'string' || text.trim().length === 0) {
        errors.push("'text' must be a non-empty string.");
      } else if (text.length > 20000) {
        errors.push("'text' length cannot exceed 20000 characters.");
      }

      if (type !== undefined && !['text', 'audio', 'photo'].includes(type)) {
        errors.push("'type' must be one of: text, audio, photo");
      }

      if (coordinates !== undefined) {
        if (typeof coordinates !== 'object' || coordinates === null || 
            typeof coordinates.x !== 'number' || typeof coordinates.y !== 'number' ||
            !Number.isFinite(coordinates.x) || !Number.isFinite(coordinates.y)) {
          errors.push("'coordinates' must be an object with numeric 'x' and 'y' fields.");
        } else if (coordinates.x < 0 || coordinates.x > 1000 || coordinates.y < 0 || coordinates.y > 1000) {
          errors.push("'coordinates' fields x and y must be within boundary [0, 1000].");
        }
      }

      if (mediaUrl !== undefined && mediaUrl !== null && typeof mediaUrl !== 'string') {
        errors.push("'mediaUrl' must be a string or null.");
      }

      if (errors.length > 0) {
        return sendJSON(res, 400, { error: 'Validation Failed', details: errors });
      }

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
      await complaintsMutex.runExclusive(async () => {
        const complaints = await readComplaints();
        complaints.push(newComplaint);
        await writeComplaints(complaints);
      });

      return sendJSON(res, 201, newComplaint);
    }

    // 3. GET /api/projects
    if (pathname === '/api/projects' && req.method === 'GET') {
      const projects = await readProjects();
      return sendJSON(res, 200, projects);
    }

    // 4. PATCH /api/projects/:id/status
    const projectStatusRegex = /^\/api\/projects\/([^\/]+)\/status$/;
    const match = pathname.match(projectStatusRegex);
    if (match) {
      if (req.method !== 'PATCH') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      }

      const id = match[1];
      let body;
      try {
        body = await parseBody(req);
      } catch (err) {
        return sendJSON(res, 400, { error: 'Malformed JSON Payload' });
      }

      const { status } = body;
      const allowedStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];

      if (status === undefined) {
        return sendJSON(res, 400, {
          error: 'Validation Failed',
          details: ["'status' is a required field"]
        });
      }

      if (!allowedStatuses.includes(status)) {
        return sendJSON(res, 400, {
          error: 'Validation Failed',
          details: [`'status' must be one of: ${allowedStatuses.join(', ')}`]
        });
      }

      let updatedProject;
      try {
        await projectsMutex.runExclusive(async () => {
          const projects = await readProjects();
          const projectIndex = projects.findIndex(p => p.id === id);

          if (projectIndex === -1) {
            const err = new Error('Project Not Found');
            err.statusCode = 404;
            throw err;
          }

          const currentStatus = projects[projectIndex].status;
          if (!isValidTransition(currentStatus, status)) {
            const err = new Error('Validation Failed');
            err.statusCode = 400;
            err.details = [`Invalid status transition from '${currentStatus}' to '${status}'`];
            throw err;
          }

          projects[projectIndex].status = status;
          await writeProjects(projects);
          updatedProject = projects[projectIndex];
        });

        return sendJSON(res, 200, updatedProject);
      } catch (err) {
        if (err.statusCode) {
          return sendJSON(res, err.statusCode, {
            error: err.message,
            ...(err.details ? { details: err.details } : {})
          });
        }
        throw err;
      }
    }

    // Reject other methods on /api/projects/:id/status if not matched
    const isProjectStatusPath = pathname.includes('/status') && pathname.includes('/projects/');
    if (isProjectStatusPath && req.method !== 'PATCH') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }

    // Default 404
    return sendJSON(res, 404, { error: 'Not Found' });

  } catch (err) {
    console.error('[Mock Server Error]:', err);
    return sendJSON(res, 500, {
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

function start(port = config.PORT) {
  return new Promise((resolve, reject) => {
    server.on('error', (err) => reject(err));
    server.listen(port, () => {
      console.log(`[Mock Server] Running on port ${port}`);
      resolve(server);
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('[Mock Server] Stopped');
      resolve();
    });
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  start,
  stop,
  server
};

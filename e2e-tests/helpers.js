const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

// HTTP Client supporting both JSON and text responses
function request(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.BASE_URL}${urlPath}`);
    const reqOpts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOpts, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let body = rawData;
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            body = JSON.parse(rawData);
          } catch (e) {}
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Database Paths
const COMPLAINTS_FILE = path.join(config.DATA_DIR, 'complaints.test.json');
const PROJECTS_FILE = path.join(config.DATA_DIR, 'projects.test.json');

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

// Helper to reset files
async function resetDatabases() {
  try {
    await fs.mkdir(config.DATA_DIR, { recursive: true });
    await fs.writeFile(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf8');
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(defaultProjects, null, 2), 'utf8');
  } catch (err) {
    console.error('Error resetting databases in helper:', err);
  }
}

// Helper to corrupt the complaints file (invalid JSON)
async function corruptComplaintsFile() {
  try {
    await fs.mkdir(config.DATA_DIR, { recursive: true });
    await fs.writeFile(COMPLAINTS_FILE, '{invalid-json: compile-fail', 'utf8');
  } catch (err) {
    console.error('Error corrupting complaints database:', err);
  }
}

// Client-side Dashboard Stats Calculator
function computeStats(complaints, projects) {
  const urgencyCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const categoryCounts = { Infrastructure: 0, Water: 0, Sanitation: 0, Power: 0, Security: 0, Roads: 0 };

  for (const c of complaints) {
    if (urgencyCounts[c.urgency] !== undefined) urgencyCounts[c.urgency]++;
    if (categoryCounts[c.category] !== undefined) categoryCounts[c.category]++;
  }

  let totalCost = 0;
  let totalBeneficiaries = 0;
  let activeProjects = 0;
  let completedProjects = 0;
  let recommendedProjects = 0;

  for (const p of projects) {
    totalCost += p.cost || 0;
    totalBeneficiaries += p.beneficiaries || 0;
    if (p.status === 'Completed') {
      completedProjects++;
    } else if (p.status === 'Recommended') {
      recommendedProjects++;
    } else if (p.status === 'Planned' || p.status === 'In Progress') {
      activeProjects++;
    }
  }

  return {
    totalComplaints: complaints.length,
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    recommendedProjects,
    urgencyCounts,
    categoryCounts,
    totalCost,
    totalBeneficiaries
  };
}

// Client-side Recommendation Engine simulation
function getRecommendations(complaints, projects) {
  const recommendations = JSON.parse(JSON.stringify(projects));
  
  for (const complaint of complaints) {
    if (complaint.sentiment === 'Negative' || complaint.urgency === 'Critical' || complaint.urgency === 'High') {
      for (const proj of recommendations) {
        if (proj.region === complaint.region) {
          if (complaint.urgency === 'Critical') {
            proj.urgency = 'Critical';
          } else if (complaint.urgency === 'High' && proj.urgency !== 'Critical') {
            proj.urgency = 'High';
          }
        }
      }
    }
  }
  return recommendations;
}

// Mock Generators
function generateComplaint(overrides = {}) {
  return {
    text: 'A standard pothole is on the main road at Downtown.',
    type: 'text',
    region: 'Downtown',
    coordinates: { x: 500, y: 500 },
    mediaUrl: null,
    ...overrides
  };
}

module.exports = {
  request,
  resetDatabases,
  corruptComplaintsFile,
  computeStats,
  getRecommendations,
  generateComplaint,
  COMPLAINTS_FILE,
  PROJECTS_FILE,
  defaultProjects
};

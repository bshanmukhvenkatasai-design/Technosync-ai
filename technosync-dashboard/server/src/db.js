const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
    await writeJsonAtomic(COMPLAINTS_FILE, []);
  }

  // Initialize Projects File
  try {
    await fs.access(PROJECTS_FILE);
  } catch {
    await writeJsonAtomic(PROJECTS_FILE, defaultProjects);
  }
}

// Atomic file writer
async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

module.exports = {
  initDb,
  
  readComplaints: () => complaintsMutex.runExclusive(async () => {
    let data;
    try {
      data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (data && err.name === 'SyntaxError') {
        try {
          const corruptBackupPath = `${COMPLAINTS_FILE}.${Date.now()}.corrupt`;
          await fs.rename(COMPLAINTS_FILE, corruptBackupPath).catch(async () => {
            await fs.writeFile(corruptBackupPath, data, 'utf8');
            await fs.unlink(COMPLAINTS_FILE).catch(() => {});
          });
        } catch (backupErr) {}
        await writeJsonAtomic(COMPLAINTS_FILE, []).catch(() => {});
      }
      return [];
    }
  }),

  writeComplaints: (complaints) => complaintsMutex.runExclusive(async () => {
    await writeJsonAtomic(COMPLAINTS_FILE, complaints);
    return complaints;
  }),

  updateComplaints: (modifierFn) => complaintsMutex.runExclusive(async () => {
    let data = '';
    try {
      data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
    } catch (err) {
      // File doesn't exist, safe to initialize
      data = '[]';
    }
    
    let complaints;
    if (!data.trim()) {
      complaints = [];
    } else {
      try {
        complaints = JSON.parse(data);
      } catch (parseErr) {
        try {
          const corruptBackupPath = `${COMPLAINTS_FILE}.${Date.now()}.corrupt`;
          await fs.rename(COMPLAINTS_FILE, corruptBackupPath).catch(async () => {
            await fs.writeFile(corruptBackupPath, data, 'utf8');
            await fs.unlink(COMPLAINTS_FILE).catch(() => {});
          });
        } catch (backupErr) {}
        await writeJsonAtomic(COMPLAINTS_FILE, []);
        throw new Error(`Database Corruption: Failed to parse ${COMPLAINTS_FILE}. Original contents preserved and reset.`);
      }
    }
    
    const updated = await modifierFn(complaints);
    await writeJsonAtomic(COMPLAINTS_FILE, updated);
    return updated;
  }),

  readProjects: () => projectsMutex.runExclusive(async () => {
    let data;
    try {
      data = await fs.readFile(PROJECTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (data && err.name === 'SyntaxError') {
        try {
          const corruptBackupPath = `${PROJECTS_FILE}.${Date.now()}.corrupt`;
          await fs.rename(PROJECTS_FILE, corruptBackupPath).catch(async () => {
            await fs.writeFile(corruptBackupPath, data, 'utf8');
            await fs.unlink(PROJECTS_FILE).catch(() => {});
          });
        } catch (backupErr) {}
        await writeJsonAtomic(PROJECTS_FILE, defaultProjects).catch(() => {});
      }
      return [];
    }
  }),

  writeProjects: (projects) => projectsMutex.runExclusive(async () => {
    await writeJsonAtomic(PROJECTS_FILE, projects);
    return projects;
  }),

  updateProjects: (modifierFn) => projectsMutex.runExclusive(async () => {
    let data = '';
    try {
      data = await fs.readFile(PROJECTS_FILE, 'utf8');
    } catch (err) {
      // File doesn't exist, safe to initialize
      data = '[]';
    }
    
    let projects;
    if (!data.trim()) {
      projects = [];
    } else {
      try {
        projects = JSON.parse(data);
      } catch (parseErr) {
        try {
          const corruptBackupPath = `${PROJECTS_FILE}.${Date.now()}.corrupt`;
          await fs.rename(PROJECTS_FILE, corruptBackupPath).catch(async () => {
            await fs.writeFile(corruptBackupPath, data, 'utf8');
            await fs.unlink(PROJECTS_FILE).catch(() => {});
          });
        } catch (backupErr) {}
        await writeJsonAtomic(PROJECTS_FILE, defaultProjects);
        throw new Error(`Database Corruption: Failed to parse ${PROJECTS_FILE}. Original contents preserved and reset.`);
      }
    }
    
    const updated = await modifierFn(projects);
    await writeJsonAtomic(PROJECTS_FILE, updated);
    return updated;
  }),

  // Helper to clean up test database files
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

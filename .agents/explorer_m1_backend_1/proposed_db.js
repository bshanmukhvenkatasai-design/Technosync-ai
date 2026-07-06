const fs = require('fs');
const path = require('path');

const COMPLAINTS_FILE = path.join(__dirname, '..', 'data', 'complaints.json');
const PROJECTS_FILE = path.join(__dirname, '..', 'data', 'projects.json');

// Ensure data directory exists
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Default initial data for projects
const DEFAULT_PROJECTS = [
  {
    "id": "proj-1",
    "title": "East Bypass Road Repair",
    "description": "Repairing potholes and repaving the main corridor in Sector 4.",
    "region": "Sector 4",
    "cost": 150000,
    "timeline": "3 months",
    "beneficiaries": 12000,
    "status": "Recommended",
    "urgency": "High"
  },
  {
    "id": "proj-2",
    "title": "Clean Water Filtration Plant",
    "description": "Installation of community water filter units near Lake Area.",
    "region": "Lake District",
    "cost": 85000,
    "timeline": "2 months",
    "beneficiaries": 8500,
    "status": "In Progress",
    "urgency": "Critical"
  },
  {
    "id": "proj-3",
    "title": "Solar Street Lighting Project",
    "description": "Installing smart solar-powered LED streetlights along dark corridors.",
    "region": "North Ward",
    "cost": 45000,
    "timeline": "1 month",
    "beneficiaries": 5000,
    "status": "Planned",
    "urgency": "Medium"
  }
];

function initDB() {
  try {
    ensureDirectoryExists(COMPLAINTS_FILE);
    ensureDirectoryExists(PROJECTS_FILE);

    if (!fs.existsSync(COMPLAINTS_FILE)) {
      fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    if (!fs.existsSync(PROJECTS_FILE)) {
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify(DEFAULT_PROJECTS, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to initialize local database files:', error);
    throw error;
  }
}

function getComplaints() {
  initDB();
  try {
    const data = fs.readFileSync(COMPLAINTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading complaints from database:', error);
    return [];
  }
}

function saveComplaints(complaints) {
  initDB();
  try {
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing complaints to database:', error);
    throw error;
  }
}

function getProjects() {
  initDB();
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading projects from database:', error);
    return [];
  }
}

function saveProjects(projects) {
  initDB();
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing projects to database:', error);
    throw error;
  }
}

module.exports = {
  getComplaints,
  saveComplaints,
  getProjects,
  saveProjects,
  initDB
};

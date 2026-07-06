const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
const aiEngine = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

/**
 * 1. GET /api/complaints
 * Returns all complaints from the local JSON file database.
 */
app.get('/api/complaints', (req, res, next) => {
  try {
    const complaints = db.getComplaints();
    res.status(200).json(complaints);
  } catch (error) {
    next(error);
  }
});

/**
 * 2. POST /api/complaints
 * Submits a new citizen complaint. Processes text via the AI simulation engine
 * to enrich with category, region, sentiment, and urgency scoring, then saves.
 */
app.post('/api/complaints', (req, res, next) => {
  try {
    const { text, type, region, coordinates, mediaUrl } = req.body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Complaint text is required and must be a string.' });
    }
    const validTypes = ['text', 'audio', 'photo'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Complaint type is required and must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Call AI Simulation Engine for analysis
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
  } catch (error) {
    next(error);
  }
});

/**
 * 3. GET /api/projects
 * Returns all projects (recommended and active) from the local JSON database.
 */
app.get('/api/projects', (req, res, next) => {
  try {
    const projects = db.getProjects();
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
});

/**
 * 4. PATCH /api/projects/:id/status
 * Updates the status of a specific development project.
 */
app.patch('/api/projects/:id/status', (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const projects = db.getProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Update status
    projects[projectIndex].status = status;
    db.saveProjects(projects);

    res.status(200).json(projects[projectIndex]);
  } catch (error) {
    next(error);
  }
});

// Catch-all route for non-existent paths
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error-Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error encountered on server:', err.stack || err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server if run directly
if (require.main === module) {
  try {
    db.initDB();
    app.listen(PORT, () => {
      console.log(`[TechnoSync Backend] Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

module.exports = app;

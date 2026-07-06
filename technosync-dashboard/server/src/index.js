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
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      error: 'Validation Failed',
      details: ['Request body must be a valid JSON object.']
    });
  }

  const { text, type, region, coordinates, mediaUrl } = req.body;
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

  if (region !== undefined) {
    if (typeof region !== 'string') {
      errors.push("'region' must be a string.");
    } else if (!['Downtown', 'North Ward', 'East District', 'West Suburbs', 'South Zone'].includes(region)) {
      errors.push("'region' must be one of: Downtown, North Ward, East District, West Suburbs, South Zone");
    }
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
    return res.status(400).json({ error: 'Validation Failed', details: errors });
  }

  next();
}

function validateProjectStatusBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      error: 'Validation Failed',
      details: ['Request body must be a valid JSON object.']
    });
  }

  const { status } = req.body;
  const allowedStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];

  if (status === undefined) {
    return res.status(400).json({
      error: 'Validation Failed',
      details: ["'status' is a required field"]
    });
  }

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
    const sorted = [...complaints]
      .filter(c => c && typeof c === 'object' && c.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(sorted);
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

    await db.updateComplaints((complaints) => {
      complaints.push(newComplaint);
      return complaints;
    });

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

    let updatedProject;
    try {
      await db.updateProjects((projects) => {
        const projectIndex = projects.findIndex(p => p.id === id);

        if (projectIndex === -1) {
          const err = new Error('Project Not Found');
          err.statusCode = 404;
          throw err;
        }

        const currentStatus = projects[projectIndex].status;
        const isValidTransition = (current, next) => {
          if (current === next) return true;
          if (current === 'Completed') return false;
          if (current === 'Recommended') return next === 'Planned' || next === 'In Progress';
          if (current === 'Planned') return next === 'In Progress';
          if (current === 'In Progress') return next === 'Completed';
          return false;
        };

        if (!isValidTransition(currentStatus, status)) {
          const err = new Error('Validation Failed');
          err.statusCode = 400;
          err.details = [`Invalid status transition from '${currentStatus}' to '${status}'`];
          throw err;
        }

        projects[projectIndex].status = status;
        updatedProject = projects[projectIndex];
        return projects;
      });

      res.json(updatedProject);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message,
          ...(error.details ? { details: error.details } : {})
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
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
  db.initDb().then(() => {
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
  }).catch(err => {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  });
}

module.exports = app;

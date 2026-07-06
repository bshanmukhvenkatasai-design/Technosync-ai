const assert = require('assert').strict;
const fs = require('fs').promises;
const {
  request,
  resetDatabases,
  computeStats,
  generateComplaint,
  COMPLAINTS_FILE,
  PROJECTS_FILE
} = require('./helpers');

module.exports = [
  // F1: Interactive Dashboard (1-5)
  {
    id: 1,
    name: "Stats calculation with empty databases",
    fn: async () => {
      // Temporarily clear database files
      await fs.writeFile(COMPLAINTS_FILE, JSON.stringify([]), 'utf8');
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([]), 'utf8');

      const compsRes = await request('/api/complaints');
      const projsRes = await request('/api/projects');

      assert.equal(compsRes.status, 200);
      assert.equal(projsRes.status, 200);

      const stats = computeStats(compsRes.body, projsRes.body);
      assert.equal(stats.totalComplaints, 0);
      assert.equal(stats.totalProjects, 0);
      assert.equal(stats.activeProjects, 0);
      assert.equal(stats.completedProjects, 0);
      assert.equal(stats.recommendedProjects, 0);
      assert.equal(stats.totalCost, 0);
      assert.equal(stats.totalBeneficiaries, 0);

      // Restore defaults
      await resetDatabases();
    }
  },
  {
    id: 2,
    name: "Stats updates when a complaint is added",
    fn: async () => {
      await resetDatabases();
      
      const initialComps = await request('/api/complaints');
      const initialProjs = await request('/api/projects');
      const initialStats = computeStats(initialComps.body, initialProjs.body);

      // Add a complaint
      const newComp = generateComplaint({ text: 'Road pothole in Downtown' });
      const postRes = await request('/api/complaints', {
        method: 'POST',
        body: newComp
      });
      assert.equal(postRes.status, 201);

      const updatedComps = await request('/api/complaints');
      const updatedStats = computeStats(updatedComps.body, initialProjs.body);

      assert.equal(updatedStats.totalComplaints, initialStats.totalComplaints + 1);
    }
  },
  {
    id: 3,
    name: "Stats updates when a project status changes to Completed",
    fn: async () => {
      await resetDatabases();

      const initialComps = await request('/api/complaints');
      const initialProjs = await request('/api/projects');
      const initialStats = computeStats(initialComps.body, initialProjs.body);

      // Find an in progress project (proj-3 is In Progress)
      const patchRes = await request('/api/projects/proj-3/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(patchRes.status, 200);

      const updatedProjs = await request('/api/projects');
      const updatedStats = computeStats(initialComps.body, updatedProjs.body);

      assert.equal(updatedStats.completedProjects, initialStats.completedProjects + 1);
      assert.equal(updatedStats.activeProjects, initialStats.activeProjects - 1);
    }
  },
  {
    id: 4,
    name: "Stats urgency counts match complaints distribution",
    fn: async () => {
      await resetDatabases();

      // Submit complaints with known urgencies
      // "explosion" -> Critical
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Power line explosion emergency!' })
      });
      // "broken / leak" -> High
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Broken water leak' })
      });
      // "dirty / smell" -> Medium
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Dirty trash smell' })
      });

      const comps = await request('/api/complaints');
      const projs = await request('/api/projects');
      const stats = computeStats(comps.body, projs.body);

      assert.equal(stats.urgencyCounts.Critical, 1);
      assert.equal(stats.urgencyCounts.High, 1);
      assert.equal(stats.urgencyCounts.Medium, 1);
      assert.equal(stats.urgencyCounts.Low, 0);
    }
  },
  {
    id: 5,
    name: "Stats category counts match complaints categories",
    fn: async () => {
      await resetDatabases();

      // Submit complaints matching different categories
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Water pipe leak' }) // Water
      });
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Power blackout wire' }) // Power
      });

      const comps = await request('/api/complaints');
      const projs = await request('/api/projects');
      const stats = computeStats(comps.body, projs.body);

      assert.equal(stats.categoryCounts.Water, 1);
      assert.equal(stats.categoryCounts.Power, 1);
      assert.equal(stats.categoryCounts.Roads, 0);
    }
  },

  // F2: Citizen Issues Hub (6-10)
  {
    id: 6,
    name: "Fetching complaints list returns valid JSON array",
    fn: async () => {
      const res = await request('/api/complaints');
      assert.equal(res.status, 200);
      assert(Array.isArray(res.body));
    }
  },
  {
    id: 7,
    name: "Complaints contain required fields",
    fn: async () => {
      await resetDatabases();
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Road issue' })
      });

      const res = await request('/api/complaints');
      const comp = res.body[0];
      assert.ok(comp.id);
      assert.ok(comp.text);
      assert.ok(comp.type);
      assert.ok(comp.region);
      assert.ok(comp.coordinates);
      assert.ok(comp.category);
      assert.ok(comp.sentiment);
      assert.ok(comp.urgency);
      assert.ok(comp.timestamp);
    }
  },
  {
    id: 8,
    name: "Complaints contain valid coordinate structures",
    fn: async () => {
      const res = await request('/api/complaints');
      for (const comp of res.body) {
        assert.equal(typeof comp.coordinates, 'object');
        assert.equal(typeof comp.coordinates.x, 'number');
        assert.equal(typeof comp.coordinates.y, 'number');
      }
    }
  },
  {
    id: 9,
    name: "Complaints contain valid ISO timestamps",
    fn: async () => {
      const res = await request('/api/complaints');
      for (const comp of res.body) {
        const timestamp = comp.timestamp;
        assert.ok(!isNaN(Date.parse(timestamp)));
      }
    }
  },
  {
    id: 10,
    name: "Complaints contain valid category values",
    fn: async () => {
      const allowedCategories = ['Infrastructure', 'Water', 'Sanitation', 'Power', 'Security', 'Roads'];
      const res = await request('/api/complaints');
      for (const comp of res.body) {
        assert(allowedCategories.includes(comp.category));
      }
    }
  },

  // F3: Complaint Submission Simulator (11-15)
  {
    id: 11,
    name: "Submit text complaint successfully (201 Created)",
    fn: async () => {
      const payload = generateComplaint({ type: 'text' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.type, 'text');
    }
  },
  {
    id: 12,
    name: "Submit audio complaint successfully (201 Created)",
    fn: async () => {
      const payload = generateComplaint({ type: 'audio' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.type, 'audio');
    }
  },
  {
    id: 13,
    name: "Submit photo complaint successfully (201 Created)",
    fn: async () => {
      const payload = generateComplaint({ type: 'photo' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.type, 'photo');
    }
  },
  {
    id: 14,
    name: "Submit complaint with mediaUrl",
    fn: async () => {
      const payload = generateComplaint({ mediaUrl: 'http://cdn.technosync.ai/files/complaint_45.jpg' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.mediaUrl, 'http://cdn.technosync.ai/files/complaint_45.jpg');
    }
  },
  {
    id: 15,
    name: "Submit complaint triggers AI engine enrichment",
    fn: async () => {
      const payload = generateComplaint({ text: 'Severe power outage grid blackout transformer explosion!' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.category, 'Power');
      assert.equal(res.body.sentiment, 'Negative');
      assert.equal(res.body.urgency, 'Critical');
    }
  },

  // F4: Constituency Map (16-20)
  {
    id: 16,
    name: "Complaints associate with a region",
    fn: async () => {
      const payload = generateComplaint({ text: 'Water pipe leak in North Ward' });
      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.region, 'North Ward');
    }
  },
  {
    id: 17,
    name: "Client can filter complaints list by region",
    fn: async () => {
      await resetDatabases();
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Water leak in North Ward' })
      });
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Road issue in Downtown' })
      });

      const res = await request('/api/complaints');
      const allComplaints = res.body;

      const northWardComplaints = allComplaints.filter(c => c.region === 'North Ward');
      assert.equal(northWardComplaints.length, 1);
      assert.equal(northWardComplaints[0].region, 'North Ward');
    }
  },
  {
    id: 18,
    name: "Projects associate with a region",
    fn: async () => {
      const res = await request('/api/projects');
      for (const proj of res.body) {
        assert.ok(proj.region);
      }
    }
  },
  {
    id: 19,
    name: "Client can filter projects list by region",
    fn: async () => {
      const res = await request('/api/projects');
      const northWardProjects = res.body.filter(p => p.region === 'North Ward');
      for (const p of northWardProjects) {
        assert.equal(p.region, 'North Ward');
      }
    }
  },
  {
    id: 20,
    name: "Coordinates mapping falls within map limits",
    fn: async () => {
      const res = await request('/api/complaints');
      for (const comp of res.body) {
        assert(comp.coordinates.x >= 0 && comp.coordinates.x <= 1000);
        assert(comp.coordinates.y >= 0 && comp.coordinates.y <= 1000);
      }
    }
  },

  // F5: AI Recommendation Engine UI (21-25)
  {
    id: 21,
    name: "Fetching projects returns valid JSON array",
    fn: async () => {
      const res = await request('/api/projects');
      assert.equal(res.status, 200);
      assert(Array.isArray(res.body));
    }
  },
  {
    id: 22,
    name: "Projects contain required fields",
    fn: async () => {
      const res = await request('/api/projects');
      const proj = res.body[0];
      assert.ok(proj.id);
      assert.ok(proj.title);
      assert.ok(proj.description);
      assert.ok(proj.region);
      assert.ok(proj.cost !== undefined);
      assert.ok(proj.timeline);
      assert.ok(proj.beneficiaries !== undefined);
      assert.ok(proj.status);
      assert.ok(proj.urgency);
    }
  },
  {
    id: 23,
    name: "Project costs are positive numbers",
    fn: async () => {
      const res = await request('/api/projects');
      for (const proj of res.body) {
        assert.equal(typeof proj.cost, 'number');
        assert(proj.cost >= 0);
      }
    }
  },
  {
    id: 24,
    name: "Project beneficiaries are positive integers",
    fn: async () => {
      const res = await request('/api/projects');
      for (const proj of res.body) {
        assert.equal(typeof proj.beneficiaries, 'number');
        assert(Number.isInteger(proj.beneficiaries));
        assert(proj.beneficiaries >= 0);
      }
    }
  },
  {
    id: 25,
    name: "Project statuses are valid",
    fn: async () => {
      const allowedStatuses = ['Recommended', 'Planned', 'In Progress', 'Completed'];
      const res = await request('/api/projects');
      for (const proj of res.body) {
        assert(allowedStatuses.includes(proj.status));
      }
    }
  },

  // F6: Project Progress Tracker (26-30)
  {
    id: 26,
    name: "Update status from Recommended to Planned",
    fn: async () => {
      await resetDatabases();
      // proj-1 is Recommended
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'Planned');
    }
  },
  {
    id: 27,
    name: "Update status from Planned to In Progress",
    fn: async () => {
      await resetDatabases();
      // proj-2 is Planned
      const res = await request('/api/projects/proj-2/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'In Progress');
    }
  },
  {
    id: 28,
    name: "Update status from In Progress to Completed",
    fn: async () => {
      await resetDatabases();
      // proj-3 is In Progress
      const res = await request('/api/projects/proj-3/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'Completed');
    }
  },
  {
    id: 29,
    name: "Update status of non-existent project returns 404",
    fn: async () => {
      const res = await request('/api/projects/non-existent-proj/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(res.status, 404);
    }
  },
  {
    id: 30,
    name: "Update status response returns the updated project object",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Planned' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.id, 'proj-1');
      assert.equal(res.body.status, 'Planned');
      assert.ok(res.body.title);
      assert.ok(res.body.description);
    }
  }
];

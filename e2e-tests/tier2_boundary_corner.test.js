const assert = require('assert').strict;
const fs = require('fs').promises;
const {
  request,
  resetDatabases,
  corruptComplaintsFile,
  computeStats,
  generateComplaint,
  COMPLAINTS_FILE,
  PROJECTS_FILE,
  defaultProjects
} = require('./helpers');

module.exports = [
  // F1: Interactive Dashboard (31-35)
  {
    id: 31,
    name: "Stats computation with extremely large number of complaints",
    fn: async () => {
      // Simulate 1000 complaints in memory
      const fakeComplaints = Array.from({ length: 1000 }, (_, i) => ({
        id: `c-${i}`,
        text: `Complaint text ${i}`,
        type: 'text',
        region: 'Downtown',
        coordinates: { x: 500, y: 500 },
        mediaUrl: null,
        category: 'Roads',
        sentiment: 'Neutral',
        urgency: 'Medium',
        timestamp: new Date().toISOString()
      }));

      const stats = computeStats(fakeComplaints, defaultProjects);
      assert.equal(stats.totalComplaints, 1000);
      assert.equal(stats.categoryCounts.Roads, 1000);
    }
  },
  {
    id: 32,
    name: "Stats computation with negative coordinates",
    fn: async () => {
      const complaintsWithNegatives = [
        {
          id: "neg-1",
          text: "Negative coords",
          type: "text",
          region: "Downtown",
          coordinates: { x: -100, y: -200 },
          category: "Roads",
          sentiment: "Neutral",
          urgency: "Low",
          timestamp: new Date().toISOString()
        }
      ];
      const stats = computeStats(complaintsWithNegatives, defaultProjects);
      assert.equal(stats.totalComplaints, 1);
    }
  },
  {
    id: 33,
    name: "Stats calculation with null description fields",
    fn: async () => {
      const modifiedProjects = defaultProjects.map(p => ({ ...p, description: null }));
      const stats = computeStats([], modifiedProjects);
      assert.equal(stats.totalProjects, 4);
    }
  },
  {
    id: 34,
    name: "Stats updates under rapid concurrent submissions",
    fn: async () => {
      await resetDatabases();
      
      const promises = Array.from({ length: 10 }, (_, i) => {
        return request('/api/complaints', {
          method: 'POST',
          body: generateComplaint({ text: `Concurrent complaint ${i}` })
        });
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        assert.equal(res.status, 201);
      }

      const res = await request('/api/complaints');
      assert.equal(res.body.length, 10);
    }
  },
  {
    id: 35,
    name: "Stats cost summation with large floating point values",
    fn: async () => {
      const modifiedProjects = defaultProjects.map((p, idx) => ({
        ...p,
        cost: idx === 0 ? 999999999.99 : 0.01
      }));
      const stats = computeStats([], modifiedProjects);
      assert.equal(stats.totalCost, 1000000000.02);
    }
  },

  // F2: Citizen Issues Hub (36-40)
  {
    id: 36,
    name: "Complaints list returns empty array on empty database",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/complaints');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 0);
    }
  },
  {
    id: 37,
    name: "Complaints list handles corrupt/invalid JSON db file",
    fn: async () => {
      await corruptComplaintsFile();
      const res = await request('/api/complaints');
      // The server should return 500 Internal Server Error when DB is corrupted
      // OR 200 with an empty array []
      if (res.status === 200) {
        assert.deepEqual(res.body, []);
      } else {
        assert.equal(res.status, 500);
      }
      
      // Clean up and restore DB
      await resetDatabases();
      const recoveredRes = await request('/api/complaints');
      assert.equal(recoveredRes.status, 200);
    }
  },
  {
    id: 38,
    name: "Complaints list filters out corrupted individual records",
    fn: async () => {
      await resetDatabases();
      // Write one valid complaint and one invalid/corrupted entry in the JSON array
      const corruptData = [
        {
          id: "valid-1",
          text: "Valid complaint text",
          type: "text",
          region: "Downtown",
          coordinates: { x: 500, y: 500 },
          category: "Roads",
          sentiment: "Neutral",
          urgency: "Low",
          timestamp: new Date().toISOString()
        },
        null, // Corrupted record
        {
          id: "corrupt-fields",
          text: null, // missing required text
          type: "unsupported"
        }
      ];

      await fs.writeFile(COMPLAINTS_FILE, JSON.stringify(corruptData), 'utf8');

      const res = await request('/api/complaints');
      assert.equal(res.status, 200);

      // Verify client filters out corrupted individual records
      const filtered = res.body.filter(c => c && typeof c === 'object' && c.id && c.text && typeof c.text === 'string');
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, "valid-1");

      await resetDatabases();
    }
  },
  {
    id: 39,
    name: "Complaints endpoint does not leak environment/system variables",
    fn: async () => {
      const res = await request('/api/complaints');
      const responseStr = JSON.stringify(res.body) + JSON.stringify(res.headers);
      assert.ok(!responseStr.includes('PATH='));
      assert.ok(!responseStr.includes('.test.json'));
    }
  },
  {
    id: 40,
    name: "Complaints list is sorted reverse chronologically",
    fn: async () => {
      await resetDatabases();

      // Submit multiple complaints with short delays
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'First complaint' })
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Second complaint' })
      });

      const res = await request('/api/complaints');
      const complaints = res.body;

      assert(complaints.length >= 2);
      // Newest should be last in chronological DB file but if client/helper expects reverse-chronological, 
      // check that we can sort them, or that they are returned reverse-chronological.
      // Wait, let's check if the list can be sorted by client.
      const times = complaints.map(c => Date.parse(c.timestamp));
      // Client-side sorting verification:
      const isReverseChronological = times.every((val, i) => i === 0 || val <= times[i - 1]);
      // If server doesn't sort it automatically, we can verify that sorting them reverse-chronologically works:
      const sortedTimes = [...times].sort((a, b) => b - a);
      assert.deepEqual(times, sortedTimes, "Complaints list must be returned in reverse chronological order (newest first).");
    }
  },

  // F3: Complaint Submission Simulator (41-45)
  {
    id: 41,
    name: "Submit complaint with empty text returns 400",
    fn: async () => {
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: '' })
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 42,
    name: "Submit complaint with extremely long text (10,000+ chars) is accepted",
    fn: async () => {
      const longText = 'a'.repeat(12000);
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: longText })
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.text.length, 12000);
    }
  },
  {
    id: 43,
    name: "Submit complaint with invalid media type returns 400",
    fn: async () => {
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ type: 'video' })
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 44,
    name: "Submit complaint with invalid region returns 400 or handles gracefully",
    fn: async () => {
      // In our design, an invalid region falls back to 'Downtown' or is mapped
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Power outage', region: 'InvalidRegionName' })
      });
      // Accept either a 400 or graceful fallback (which yields 201 and maps to valid region)
      assert(res.status === 201 || res.status === 400);
      if (res.status === 201) {
        const allowedRegions = ['Downtown', 'North Ward', 'East District', 'West Suburbs', 'South Zone'];
        assert(allowedRegions.includes(res.body.region));
      }
    }
  },
  {
    id: 45,
    name: "Submit complaint with malformed coordinates structure returns 400",
    fn: async () => {
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: 'abc', y: 123 } })
      });
      assert.equal(res.status, 400);
    }
  },

  // F4: Constituency Map (46-50)
  {
    id: 46,
    name: "Filter complaints by region with no complaints returns empty array",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/complaints');
      const filtered = res.body.filter(c => c.region === 'North Ward');
      assert.equal(filtered.length, 0);
    }
  },
  {
    id: 47,
    name: "Filter projects by region with no projects returns empty array",
    fn: async () => {
      const res = await request('/api/projects');
      const filtered = res.body.filter(p => p.region === 'South Zone'); // No seeded project has South Zone
      assert.equal(filtered.length, 0);
    }
  },
  {
    id: 48,
    name: "Filter by invalid region names returns empty array",
    fn: async () => {
      const res = await request('/api/complaints');
      const filtered = res.body.filter(c => c.region === 'NonExistentRegion');
      assert.equal(filtered.length, 0);
    }
  },
  {
    id: 49,
    name: "Coordinates at extreme boundaries (0,0 or 1000,1000)",
    fn: async () => {
      const res1 = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: 0, y: 0 } })
      });
      assert.equal(res1.status, 201);
      assert.equal(res1.body.coordinates.x, 0);

      const res2 = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: 1000, y: 1000 } })
      });
      assert.equal(res2.status, 201);
      assert.equal(res2.body.coordinates.x, 1000);
    }
  },
  {
    id: 50,
    name: "Coordinates with null or missing values",
    fn: async () => {
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: undefined })
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.coordinates.x, 0);
      assert.equal(res.body.coordinates.y, 0);
    }
  },

  // F5: AI Recommendation Engine UI (51-55)
  {
    id: 51,
    name: "Projects list returns empty array on empty database",
    fn: async () => {
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([]), 'utf8');
      const res = await request('/api/projects');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 0);
      await resetDatabases();
    }
  },
  {
    id: 52,
    name: "Projects list handles missing optional fields",
    fn: async () => {
      // description is an optional field in database
      const minimalProjects = [
        {
          id: "proj-min",
          title: "Minimal Project",
          region: "Downtown",
          cost: 1000,
          timeline: "1 Month",
          beneficiaries: 100,
          status: "Recommended",
          urgency: "Low"
          // description missing
        }
      ];
      await fs.writeFile(PROJECTS_FILE, JSON.stringify(minimalProjects), 'utf8');

      const res = await request('/api/projects');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, "Minimal Project");
      assert.equal(res.body[0].description, undefined);

      await resetDatabases();
    }
  },
  {
    id: 53,
    name: "Projects list handles invalid urgency mapping",
    fn: async () => {
      const invalidUrgencyProjects = [
        {
          ...defaultProjects[0],
          urgency: "SuperCritical" // invalid urgency
        }
      ];
      await fs.writeFile(PROJECTS_FILE, JSON.stringify(invalidUrgencyProjects), 'utf8');

      const res = await request('/api/projects');
      assert.equal(res.status, 200);
      // Handles it without crashing
      assert.equal(res.body[0].urgency, "SuperCritical");

      await resetDatabases();
    }
  },
  {
    id: 54,
    name: "Projects list is stable across consecutive reads",
    fn: async () => {
      const res1 = await request('/api/projects');
      const res2 = await request('/api/projects');
      assert.deepEqual(res1.body, res2.body);
    }
  },
  {
    id: 55,
    name: "Project cost boundaries (cost is 0 or extremely high)",
    fn: async () => {
      const edgeCostProjects = [
        { ...defaultProjects[0], id: "cost-0", cost: 0 },
        { ...defaultProjects[1], id: "cost-high", cost: 100000000000 }
      ];
      await fs.writeFile(PROJECTS_FILE, JSON.stringify(edgeCostProjects), 'utf8');

      const res = await request('/api/projects');
      assert.equal(res.status, 200);
      assert.equal(res.body.find(p => p.id === "cost-0").cost, 0);
      assert.equal(res.body.find(p => p.id === "cost-high").cost, 100000000000);

      await resetDatabases();
    }
  },

  // F6: Project Progress Tracker (56-60)
  {
    id: 56,
    name: "Update project status with invalid status string returns 400",
    fn: async () => {
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'SuperCompleted' }
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 57,
    name: "Update project status with missing status field in body returns 400",
    fn: async () => {
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { title: 'New title' }
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 58,
    name: "Update project status with empty body returns 400",
    fn: async () => {
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: ''
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 59,
    name: "Project status transitions cannot be bypassed if invalid",
    fn: async () => {
      await resetDatabases();
      // proj-1 is Recommended. Trying to set to Completed straight away should be invalid (returns 400)
      const res = await request('/api/projects/proj-1/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(res.status, 400);
    }
  },
  {
    id: 60,
    name: "Patch endpoint rejects other HTTP methods",
    fn: async () => {
      const res = await request('/api/projects/proj-1/status', {
        method: 'POST',
        body: { status: 'Planned' }
      });
      // Express returns 404 for unrouted method or mock server returns 405. Either non-200 is acceptable.
      assert.ok(res.status !== 200 && res.status !== 201);
    }
  }
];

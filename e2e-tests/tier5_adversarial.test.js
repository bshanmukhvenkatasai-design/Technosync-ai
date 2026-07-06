const assert = require('assert').strict;
const {
  request,
  resetDatabases,
  corruptComplaintsFile,
  generateComplaint
} = require('./helpers');

module.exports = [
  // 1. Sentiment Negation Bug Test
  {
    id: 101,
    name: "Adversarial: Complaint with 'unsafe' is classified as Negative sentiment",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'This street is highly unsafe for pedestrians.' })
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.sentiment, 'Negative', 'Expected "unsafe" to be classified as Negative sentiment');
    }
  },

  // 2. Region Substring False Positive Bug Test
  {
    id: 102,
    name: "Adversarial: Region matcher does not false-positive on words containing region names as substrings",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ 
          text: 'The street light near the north wardens house is broken.',
          region: 'West Suburbs'
        })
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.region, 'West Suburbs', 'Expected fallback/input region West Suburbs, but substring matched North Ward');
    }
  },

  // 3. Urgency Suppression Bug Test
  {
    id: 103,
    name: "Adversarial: Urgency is Critical even with multiple low-urgency words if a critical issue exists",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ 
          text: 'There is a minor general suggestion query aesthetic cosmetic complaint regarding a massive gas explosion.'
        })
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.urgency, 'Critical', 'Expected Critical urgency for explosion despite low urgency noise words');
    }
  },

  // 4. Coordinates OOB and Non-Finite Tests
  {
    id: 104,
    name: "Adversarial: Out of bounds coordinates return 400 Bad Request",
    fn: async () => {
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: 1500, y: -50 } })
      });
      assert.equal(res.status, 400, 'Expected 400 Bad Request for out of bounds coordinates');
    }
  },
  {
    id: 105,
    name: "Adversarial: Non-finite coordinates (NaN/Infinity) return 400 Bad Request",
    fn: async () => {
      const res1 = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: NaN, y: 500 } })
      });
      assert.equal(res1.status, 400, 'Expected 400 Bad Request for NaN coordinate');

      const res2 = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ coordinates: { x: Infinity, y: 500 } })
      });
      assert.equal(res2.status, 400, 'Expected 400 Bad Request for Infinity coordinate');
    }
  },

  // 5. Maximum String Length Test
  {
    id: 106,
    name: "Adversarial: Text length exceeding 20000 returns 400 Bad Request",
    fn: async () => {
      const tooLongText = 'a'.repeat(20001);
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: tooLongText })
      });
      assert.equal(res.status, 400, 'Expected 400 Bad Request for text length 20001');
    }
  },

  // 6. Invalid Project Status Transitions Tests
  {
    id: 107,
    name: "Adversarial: Cannot transition from Completed back to In Progress",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/projects/proj-4/status', {
        method: 'PATCH',
        body: { status: 'In Progress' }
      });
      assert.equal(res.status, 400, 'Expected 400 Bad Request for transition from Completed to In Progress');
    }
  },
  {
    id: 108,
    name: "Adversarial: Cannot transition from Planned to Completed directly",
    fn: async () => {
      await resetDatabases();
      const res = await request('/api/projects/proj-2/status', {
        method: 'PATCH',
        body: { status: 'Completed' }
      });
      assert.equal(res.status, 400, 'Expected 400 Bad Request for transition from Planned to Completed');
    }
  },

  // 7. Database Corruption DoS Test
  {
    id: 109,
    name: "Adversarial: Submission fails indefinitely after complaints file corruption",
    fn: async () => {
      await corruptComplaintsFile();
      const res = await request('/api/complaints', {
        method: 'POST',
        body: generateComplaint({ text: 'Some text' })
      });
      assert.equal(res.status, 500, 'Expected 500 Internal Server Error due to unrecoverable file corruption');
      await resetDatabases();
    }
  },

  // 8. Mock Server Status Concurrency Race Condition Test
  {
    id: 110,
    name: "Adversarial: Mock server concurrent project status updates race condition",
    fn: async () => {
      await resetDatabases();
      const promises = [
        request('/api/projects/proj-1/status', { method: 'PATCH', body: { status: 'Planned' } }),
        request('/api/projects/proj-2/status', { method: 'PATCH', body: { status: 'In Progress' } }),
        request('/api/projects/proj-3/status', { method: 'PATCH', body: { status: 'Completed' } })
      ];
      const results = await Promise.all(promises);
      for (const res of results) {
        assert.equal(res.status, 200);
      }
      
      const getProj = await request('/api/projects');
      const p1 = getProj.body.find(p => p.id === 'proj-1');
      const p2 = getProj.body.find(p => p.id === 'proj-2');
      const p3 = getProj.body.find(p => p.id === 'proj-3');
      
      assert.equal(p1.status, 'Planned', 'Project 1 status should be Planned');
      assert.equal(p2.status, 'In Progress', 'Project 2 status should be In Progress');
      assert.equal(p3.status, 'Completed', 'Project 3 status should be Completed');
    }
  }
];

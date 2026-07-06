// Force test environment
process.env.NODE_ENV = 'test';

const app = require('./src/index');
const db = require('./src/db');
const assert = require('assert').strict;

const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper utility to make HTTP requests using native global fetch or http fallback
let requestFn;
if (typeof fetch === 'function') {
  requestFn = async function(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    
    let body = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }
    
    return { status: response.status, body };
  };
} else {
  const http = require('http');
  requestFn = function(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}${path}`);
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
          resolve({ status: res.statusCode, body });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

async function request(path, options = {}) {
  return requestFn(path, options);
}

async function runTests() {
  console.log('--- Starting TechnoSync M1 Backend Verification ---');
  
  // 1. Initial cleanup of potential leftovers
  await db.cleanupTestFiles();
  await db.initDb();

  // 2. Start the Express App Server on the test port
  const server = app.listen(TEST_PORT, async () => {
    console.log(`Test server active on port ${TEST_PORT}. Running assertions...\n`);
    
    try {
      // Test Case 1: GET /api/projects returns seeded default projects
      console.log('Case 1: Fetching initial projects...');
      const getProj = await request('/api/projects');
      assert.equal(getProj.status, 200, 'GET projects should return 200 OK');
      assert(Array.isArray(getProj.body), 'GET projects body should be an array');
      assert.equal(getProj.body.length, 4, 'Seeded projects should contain 4 projects');
      console.log('✔ Case 1 Passed.\n');

      // Test Case 2: POST /api/complaints processes new complaint through AI Engine
      console.log('Case 2: Submitting a valid water leak complaint...');
      const complaintPayload = {
        text: 'A giant water pipe burst at North Ward! The street is flooding completely.',
        type: 'text',
        region: 'North Ward',
        coordinates: { x: 12.3, y: 45.6 },
        mediaUrl: null
      };
      
      const postComp = await request('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(complaintPayload)
      });
      
      assert.equal(postComp.status, 201, 'POST complaints should return 201 Created');
      assert(postComp.body.id, 'Response should contain a generated ID');
      assert(postComp.body.timestamp, 'Response should contain a timestamp');
      assert.equal(postComp.body.category, 'Water', 'Heuristic parser should classify "pipe burst / water" as Water');
      assert.equal(postComp.body.region, 'North Ward', 'Heuristic parser should extract region "North Ward"');
      assert.equal(postComp.body.sentiment, 'Negative', 'Sentiment analyzer should return Negative');
      assert.equal(postComp.body.urgency, 'High', 'Urgency score should match High category rules');
      console.log('✔ Case 2 Passed.\n');

      // Test Case 3: GET /api/complaints reflects the new complaint
      console.log('Case 3: Fetching complaints list...');
      const getComps = await request('/api/complaints');
      assert.equal(getComps.status, 200, 'GET complaints should return 200 OK');
      assert.equal(getComps.body.length, 1, 'Complaints database should contain 1 complaint');
      assert.equal(getComps.body[0].id, postComp.body.id, 'Fetched complaint ID must match POSTed complaint');
      console.log('✔ Case 3 Passed.\n');

      // Test Case 4: PATCH /api/projects/:id/status updates status
      console.log('Case 4: Updating a project status...');
      const targetProject = getProj.body[0]; // e.g. proj-1
      const patchProj = await request(`/api/projects/${targetProject.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'In Progress' })
      });
      
      assert.equal(patchProj.status, 200, 'PATCH project status should return 200 OK');
      assert.equal(patchProj.body.status, 'In Progress', 'Status must be updated to In Progress');
      
      // Verify in DB as well
      const verifyProj = await request('/api/projects');
      const updatedProj = verifyProj.body.find(p => p.id === targetProject.id);
      assert.equal(updatedProj.status, 'In Progress', 'Database project status must be In Progress');
      console.log('✔ Case 4 Passed.\n');

      // Test Case 5: Validation checks
      console.log('Case 5: Verifying validation handlers...');
      
      // Empty text error check
      const emptyTextRes = await request('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({ text: '', type: 'text' })
      });
      assert.equal(emptyTextRes.status, 400, 'Empty complaint text should trigger 400 Bad Request');
      assert(emptyTextRes.body.error, 'Should return error property');
      
      // Invalid status error check
      const invalidStatusRes = await request(`/api/projects/${targetProject.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'InvalidStatusState' })
      });
      assert.equal(invalidStatusRes.status, 400, 'Invalid status update must trigger 400 Bad Request');

      // Non-existent project error check
      const notFoundRes = await request('/api/projects/non-existent-id/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed' })
      });
      assert.equal(notFoundRes.status, 404, 'Non-existent project update must return 404 Not Found');
      console.log('✔ Case 5 Passed.\n');

      console.log('===================================================');
      console.log('🎉 ALL HEALTH CHECK TESTS PASSED SUCCESSFULLY! 🎉');
      console.log('===================================================');
      
      server.close(async () => {
        await db.cleanupTestFiles();
        process.exit(0);
      });
    } catch (testError) {
      console.error('❌ ASSERTION OR RUNTIME TEST ERROR:', testError);
      server.close(async () => {
        await db.cleanupTestFiles();
        process.exit(1);
      });
    }
  });
}

runTests().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

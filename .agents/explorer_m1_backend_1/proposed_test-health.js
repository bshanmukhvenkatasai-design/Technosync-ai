/**
 * Health Check & API Verification Script
 * Spins up the server on an ephemeral port, executes tests against all REST endpoints,
 * asserts the database state, and verifies response schemas.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configure test paths to verify database outputs
const DB_DIR = path.join(__dirname, 'data');
const COMPLAINTS_FILE = path.join(DB_DIR, 'complaints.json');
const PROJECTS_FILE = path.join(DB_DIR, 'projects.json');

// Helper to make HTTP requests returning a promise
function makeRequest(port, method, path, postData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (postData) {
      const dataStr = JSON.stringify(postData);
      options.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf-8');
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        let parsed = null;
        if (responseBody) {
          try {
            parsed = JSON.parse(responseBody);
          } catch (e) {
            parsed = responseBody; // Return as text if not JSON
          }
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Deep assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertStatus(res, expectedCode, testName) {
  assert(res.statusCode === expectedCode, `${testName} expected status ${expectedCode}, got ${res.statusCode}. Body: ${JSON.stringify(res.body)}`);
}

// Import app to start it
const app = require('./src/index');

console.log('[Test Health] Starting tests...');

// Bind server to port 0 to dynamically choose an open port
const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`[Test Health] Test server running on dynamic port: ${port}`);
  
  let failures = 0;
  
  try {
    // ----------------------------------------------------
    // Test Case 1: GET /api/complaints (Initial state)
    // ----------------------------------------------------
    console.log('\n--> Test Case 1: GET /api/complaints (Initial)');
    const getCompInitial = await makeRequest(port, 'GET', '/api/complaints');
    assertStatus(getCompInitial, 200, 'GET /api/complaints');
    assert(Array.isArray(getCompInitial.body), 'GET /api/complaints must return an array');
    console.log('✓ GET /api/complaints returned empty or existing complaints array.');

    // ----------------------------------------------------
    // Test Case 2: POST /api/complaints (Road repair)
    // ----------------------------------------------------
    console.log('\n--> Test Case 2: POST /api/complaints (Road/Pothole in Sector 4)');
    const complaintPayload = {
      text: 'Urgent! There is a huge pothole on Main Street in Sector 4 causing high risk of accidents!',
      type: 'text',
      region: 'Sector 4',
      coordinates: { x: 45.2, y: 78.9 }
    };
    
    const postComp = await makeRequest(port, 'POST', '/api/complaints', complaintPayload);
    assertStatus(postComp, 201, 'POST /api/complaints');
    
    const createdComp = postComp.body;
    assert(createdComp.id && createdComp.id.startsWith('comp-'), 'Complaint ID must start with "comp-"');
    assert(createdComp.text === complaintPayload.text, 'Text mismatch');
    assert(createdComp.type === 'text', 'Type mismatch');
    assert(createdComp.region === 'Sector 4', 'Region extraction failed: expected "Sector 4", got ' + createdComp.region);
    assert(createdComp.category === 'Roads', 'Category extraction failed: expected "Roads", got ' + createdComp.category);
    assert(createdComp.sentiment === 'Negative', 'Sentiment analysis failed: expected "Negative", got ' + createdComp.sentiment);
    assert(createdComp.urgency === 'High', 'Urgency extraction failed: expected "High", got ' + createdComp.urgency);
    assert(createdComp.coordinates.x === 45.2 && createdComp.coordinates.y === 78.9, 'Coordinates mismatch');
    assert(createdComp.timestamp !== undefined, 'Timestamp must exist');
    console.log('✓ POST /api/complaints succeeded. AI classifications verified.');

    // ----------------------------------------------------
    // Test Case 3: Verify DB Persistence (Complaints)
    // ----------------------------------------------------
    console.log('\n--> Test Case 3: Verify DB File State for Complaints');
    assert(fs.existsSync(COMPLAINTS_FILE), 'Complaints database file does not exist at ' + COMPLAINTS_FILE);
    const complaintsDb = JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf-8'));
    const dbComp = complaintsDb.find(c => c.id === createdComp.id);
    assert(dbComp !== undefined, 'Created complaint was not persisted in complaints.json');
    assert(dbComp.category === 'Roads', 'Persisted category mismatch');
    console.log('✓ Verified complaints database persistence on disk.');

    // ----------------------------------------------------
    // Test Case 4: GET /api/projects
    // ----------------------------------------------------
    console.log('\n--> Test Case 4: GET /api/projects');
    const getProjects = await makeRequest(port, 'GET', '/api/projects');
    assertStatus(getProjects, 200, 'GET /api/projects');
    assert(Array.isArray(getProjects.body), 'GET /api/projects must return an array');
    assert(getProjects.body.length > 0, 'GET /api/projects must contain default projects');
    const defaultProj = getProjects.body.find(p => p.id === 'proj-1');
    assert(defaultProj !== undefined, 'Default project proj-1 not found');
    console.log('✓ GET /api/projects succeeded. Projects array list verified.');

    // ----------------------------------------------------
    // Test Case 5: PATCH /api/projects/:id/status
    // ----------------------------------------------------
    console.log('\n--> Test Case 5: PATCH /api/projects/:id/status (proj-1 to In Progress)');
    const patchPayload = { status: 'In Progress' };
    const patchProj = await makeRequest(port, 'PATCH', '/api/projects/proj-1/status', patchPayload);
    assertStatus(patchProj, 200, 'PATCH /api/projects/:id/status');
    assert(patchProj.body.id === 'proj-1', 'Project ID mismatch');
    assert(patchProj.body.status === 'In Progress', 'Status update failed to reflect in response');
    console.log('✓ PATCH /api/projects/:id/status succeeded.');

    // ----------------------------------------------------
    // Test Case 6: Verify DB Persistence (Projects)
    // ----------------------------------------------------
    console.log('\n--> Test Case 6: Verify DB File State for Projects');
    assert(fs.existsSync(PROJECTS_FILE), 'Projects database file does not exist at ' + PROJECTS_FILE);
    const projectsDb = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    const dbProj = projectsDb.find(p => p.id === 'proj-1');
    assert(dbProj !== undefined, 'Project proj-1 not found in projects.json');
    assert(dbProj.status === 'In Progress', 'Status update was not persisted in projects.json');
    console.log('✓ Verified projects database persistence on disk.');

    // ----------------------------------------------------
    // Test Case 7: Adversarial Checks (Validation & Errors)
    // ----------------------------------------------------
    console.log('\n--> Test Case 7: Adversarial Validation and Error Handling');
    
    // 7.1 POST /api/complaints - Missing text
    const errComp1 = await makeRequest(port, 'POST', '/api/complaints', { type: 'text' });
    assertStatus(errComp1, 400, 'POST /api/complaints missing text');
    console.log('✓ Correctly rejected POST /api/complaints with missing text (400).');

    // 7.2 POST /api/complaints - Invalid type
    const errComp2 = await makeRequest(port, 'POST', '/api/complaints', { text: 'Some text', type: 'invalid_type' });
    assertStatus(errComp2, 400, 'POST /api/complaints invalid type');
    console.log('✓ Correctly rejected POST /api/complaints with invalid type (400).');

    // 7.3 PATCH /api/projects/:id/status - Invalid status
    const errPatch1 = await makeRequest(port, 'PATCH', '/api/projects/proj-1/status', { status: 'NotAStatus' });
    assertStatus(errPatch1, 400, 'PATCH /api/projects/:id/status invalid status');
    console.log('✓ Correctly rejected PATCH /api/projects/:id/status with invalid status (400).');

    // 7.4 PATCH /api/projects/:id/status - Non-existent project
    const errPatch2 = await makeRequest(port, 'PATCH', '/api/projects/proj-nonexistent/status', { status: 'In Progress' });
    assertStatus(errPatch2, 404, 'PATCH /api/projects/:id/status non-existent project');
    console.log('✓ Correctly returned 404 for non-existent project PATCH request.');

    // 7.5 GET non-existent endpoint
    const err404 = await makeRequest(port, 'GET', '/api/nonexistent-route');
    assertStatus(err404, 404, 'GET non-existent route');
    console.log('✓ Correctly returned 404 for non-existent routes.');

    console.log('\n======================================');
    console.log('🎉 HEALTH CHECK SUITE PASSED SUCCESSFULLY!');
    console.log('======================================');
    
  } catch (error) {
    console.error('\n❌ Health check failed!');
    console.error(error);
    failures = 1;
  } finally {
    console.log('\n[Test Health] Closing test server...');
    server.close(() => {
      console.log('[Test Health] Server stopped. Exiting.');
      process.exit(failures);
    });
  }
});

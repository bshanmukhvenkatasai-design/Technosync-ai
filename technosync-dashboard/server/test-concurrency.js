// Force test environment
process.env.NODE_ENV = 'test';

const app = require('./src/index');
const db = require('./src/db');
const assert = require('assert').strict;

const TEST_PORT = 5002;
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

async function runConcurrencyTests() {
  console.log('--- Starting TechnoSync M1 Backend Concurrency Verification ---');
  
  // 1. Initial cleanup
  await db.cleanupTestFiles();
  await db.initDb();

  // 2. Start the Express App Server
  const server = app.listen(TEST_PORT, async () => {
    console.log(`Test server active on port ${TEST_PORT}. Running concurrency stress tests...\n`);
    
    try {
      const numRequests = 20;
      console.log(`Firing ${numRequests} concurrent POST requests to /api/complaints...`);
      
      const promises = [];
      for (let i = 0; i < numRequests; i++) {
        const payload = {
          text: `Concurrent complaint number ${i}: Warning about power grid line failure.`,
          type: 'text',
          region: 'North Ward',
          coordinates: { x: i, y: i * 2 },
          mediaUrl: null
        };
        
        promises.push(
          request('/api/complaints', {
            method: 'POST',
            body: JSON.stringify(payload)
          })
        );
      }

      const results = await Promise.all(promises);
      
      // Analyze responses
      let successCount = 0;
      let errorCount = 0;
      results.forEach((res, i) => {
        if (res.status === 201) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Request ${i} failed with status ${res.status}:`, res.body);
        }
      });
      
      console.log(`\nResults from API calls:`);
      console.log(`- Success responses: ${successCount}`);
      console.log(`- Error responses: ${errorCount}`);

      // Fetch complaints from DB
      console.log('\nFetching complaints from DB...');
      const getComps = await request('/api/complaints');
      assert.equal(getComps.status, 200, 'GET complaints should return 200 OK');
      
      const dbCount = getComps.body.length;
      console.log(`Total complaints stored in DB: ${dbCount}`);
      console.log(`Expected complaints in DB: ${numRequests}`);

      if (dbCount < numRequests) {
        console.log('\n❌ CONCURRENCY BUG CONFIRMED: Data loss occurred!');
        console.log(`Lost ${numRequests - dbCount} complaints out of ${numRequests}.`);
      } else {
        console.log('\n✔ Concurrency test passed with no data loss!');
      }

      console.log('\n--- Running concurrent project status updates ---');
      // Fetch initial projects
      const getProj = await request('/api/projects');
      const targetProject = getProj.body[0];
      const statuses = ['Planned', 'In Progress', 'Completed', 'Recommended'];
      
      const projPromises = [];
      const numProjRequests = 20;
      console.log(`Firing ${numProjRequests} concurrent PATCH updates to /api/projects/${targetProject.id}/status...`);
      for (let i = 0; i < numProjRequests; i++) {
        const status = statuses[i % statuses.length];
        projPromises.push(
          request(`/api/projects/${targetProject.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
          })
        );
      }

      const projResults = await Promise.all(projPromises);
      let projSuccess = 0;
      projResults.forEach((res, i) => {
        if (res.status === 200) {
          projSuccess++;
        }
      });
      console.log(`Project status PATCH responses: ${projSuccess} success out of ${numProjRequests}`);
      
      // Let's check if the JSON database is valid JSON and not corrupted
      try {
        const verifyComps = await db.readComplaints();
        console.log('✔ Complaints database file parsed successfully as JSON.');
      } catch (e) {
        console.error('❌ Complaints database file is CORRUPTED:', e);
      }

      try {
        const verifyProj = await db.readProjects();
        console.log('✔ Projects database file parsed successfully as JSON.');
      } catch (e) {
        console.error('❌ Projects database file is CORRUPTED:', e);
      }

      server.close(async () => {
        await db.cleanupTestFiles();
        if (dbCount < numRequests) {
          process.exit(10); // Specific exit code for concurrency data loss
        } else {
          process.exit(0);
        }
      });
    } catch (testError) {
      console.error('❌ Concurrency stress test error:', testError);
      server.close(async () => {
        await db.cleanupTestFiles();
        process.exit(1);
      });
    }
  });
}

runConcurrencyTests().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

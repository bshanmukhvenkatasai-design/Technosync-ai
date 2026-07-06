const { spawn } = require('child_process');
const http = require('http');
const config = require('./config');
const mockServer = require('./mock-server');
const { resetDatabases } = require('./helpers');

// Import test cases
const tier1 = require('./tier1_feature_coverage.test');
const tier2 = require('./tier2_boundary_corner.test');
const tier3 = require('./tier3_cross_feature.test');
const tier4 = require('./tier4_real_world.test');
const tier5 = require('./tier5_adversarial.test');

const allTests = [
  ...tier1,
  ...tier2,
  ...tier3,
  ...tier4,
  ...tier5
];

let spawnedProcess = null;

const cleanupSpawnedProcess = () => {
  if (spawnedProcess) {
    try {
      spawnedProcess.kill('SIGTERM');
    } catch (err) {
      // ignore
    }
  }
};

process.on('SIGINT', () => {
  cleanupSpawnedProcess();
  process.exit(1);
});

process.on('SIGTERM', () => {
  cleanupSpawnedProcess();
  process.exit(1);
});

process.on('exit', () => {
  cleanupSpawnedProcess();
});

async function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${config.BASE_URL}/api/projects`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');
  
  try {
    if (useMock) {
      await mockServer.start(config.PORT);
    } else {
      const running = await isServerRunning();
      if (!running) {
        console.log('[Runner] Real server is not active. Booting real server...');
        spawnedProcess = spawn('node', ['technosync-dashboard/server/src/index.js'], {
          env: { ...process.env, NODE_ENV: 'test', PORT: config.PORT },
          stdio: 'inherit'
        });
        
        // Wait for server to become responsive
        let ready = false;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 250));
          if (await isServerRunning()) {
            ready = true;
            console.log('[Runner] Real server booted successfully.');
            break;
          }
        }
        if (!ready) {
          throw new Error('Real server failed to start within timeout.');
        }
      } else {
        console.log('[Runner] Real server is already running.');
      }
    }

    console.log(`\n--- Starting TechnoSync E2E Test Suite (Total: ${allTests.length} Tests) ---`);
    await resetDatabases(); // initial reset

    let passed = 0;
    let failed = 0;
    const failureDetails = [];

    for (const test of allTests) {
      process.stdout.write(`Test #${test.id}: ${test.name} ... `);
      try {
        await test.fn();
        console.log('PASS');
        passed++;
      } catch (err) {
        console.log('FAIL');
        failed++;
        failureDetails.push({ id: test.id, name: test.name, error: err });
      }
    }

    console.log('\n=============================================');
    console.log('                 E2E SUMMARY                 ');
    console.log('=============================================');
    console.log(`Total executed : ${allTests.length}`);
    console.log(`Passed         : ${passed}`);
    console.log(`Failed         : ${failed}`);
    console.log('=============================================');

    if (failed > 0) {
      console.log('\n--- FAILURE DETAILS ---');
      for (const detail of failureDetails) {
        console.log(`\n[Test #${detail.id}] ${detail.name}`);
        console.log(detail.error.stack || detail.error.message);
        console.log('---------------------------------------------');
      }
    } else {
      console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n');
    }

    // Clean up and restore default database files
    await resetDatabases();

    // Stop servers
    if (useMock) {
      await mockServer.stop();
    } else if (spawnedProcess) {
      console.log('[Runner] Stopping real server...');
      spawnedProcess.kill('SIGTERM');
      // Wait for process to shut down
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    process.exit(failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('[Runner Fatal Error]:', error);
    if (useMock) {
      await mockServer.stop();
    } else if (spawnedProcess) {
      spawnedProcess.kill('SIGTERM');
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

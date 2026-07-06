# Review Report: E2E Test Suite Validation

## Review Summary

**Verdict**: FAIL / REQUEST_CHANGES

This report documents the E2E test suite implementation under `e2e-tests/` in the project root. While all 71 test cases specified in `SCOPE.md` are implemented structurally, several critical implementation bugs, race conditions, and design discrepancies between the mock server and the real server will cause execution failures when run.

---

## Findings

### [Critical] Finding 1: Test 40 (Reverse Chronological Sorting) Assertion Bug
- **What**: Test 40 checks if the complaints list is sorted reverse chronologically. However, its assertion is mathematically guaranteed to fail.
- **Where**: `e2e-tests/tier2_boundary_corner.test.js`, lines 201-208.
- **Why**: Both the real server and the mock server append new complaints to the end of the database file (`complaints.push(newComplaint)`) and return them in chronological order (oldest first). Test 40 retrieves the raw complaints list and asserts:
  ```javascript
  const times = complaints.map(c => Date.parse(c.timestamp));
  const sortedTimes = [...times].sort((a, b) => b - a); // descending
  assert.deepEqual(times, sortedTimes);
  ```
  Since `times` is in ascending order (older to newer) and `sortedTimes` is in descending order (newer to older), `assert.deepEqual` will always throw an assertion failure.
- **Suggestion**: Either update the backend servers to sort the complaints list descending before returning them, or update the test code to verify that the client-side hub can correctly sort them.

### [Major] Finding 2: Concurrency Race Condition in Mock Server (Test 34)
- **What**: Test 34 sends 10 concurrent requests to POST `/api/complaints`. This test will fail when run in mock mode because the mock server lacks a lock (Mutex) for I/O operations.
- **Where**: `e2e-tests/mock-server.js` route `POST /api/complaints`.
- **Why**: The mock server route reads the database file asynchronously and writes it back without serialization:
  ```javascript
  const complaints = await readComplaints();
  complaints.push(newComplaint);
  await writeComplaints(complaints);
  ```
  Under concurrent execution, all 10 requests read the file before any request finishes writing, causing multiple requests to write overlapping arrays. This leads to lost complaints, resulting in the final list length being less than 10, which fails the assertion `assert.equal(res.body.length, 10)`.
- **Suggestion**: Implement a Mutex lock in `mock-server.js` similar to `FileMutex` in the real server `db.js`.

### [Major] Finding 3: Corrupt Database Behavior Discrepancy (Test 37)
- **What**: There is an inconsistency in how the real server and the mock server handle invalid/corrupted JSON database files, which will cause Test 37 to fail when executed against the real server.
- **Where**: `e2e-tests/mock-server.js` vs `technosync-dashboard/server/src/db.js`.
- **Why**: The mock server's `readComplaints` throws an error on invalid JSON, which causes the mock server to return `500 Internal Server Error`. Test 37 asserts that the response status is `500`. However, the real server's `db.js` catches parsing errors and returns an empty array `[]` with status `200`. Running Test 37 against the real server will fail because it receives `200` instead of `500`.
- **Suggestion**: Align the real server and mock server error handling for corrupted DBs. If a corrupted database is detected, both should either fail (return 500) or recover gracefully (return 200/empty).

### [Minor] Finding 4: Unhandled Port EADDRINUSE in Mock Server
- **What**: The mock server `start()` method does not listen to server errors.
- **Where**: `e2e-tests/mock-server.js`, line 306.
- **Why**: If port 5050 (or the configured test port) is already in use by another process, `server.listen()` will throw an error event. Since there is no error listener attached, Node.js will crash with an unhandled exception rather than gracefully rejecting the promise returned by `start()`.
- **Suggestion**: Add a `.on('error', reject)` listener on the HTTP server before calling `.listen()`.

### [Minor] Finding 5: Orphaning of Spawned Server Process on Abrupt Exit
- **What**: The test runner lacks signal handlers to kill the spawned child process on interruption.
- **Where**: `e2e-tests/run-tests.js`.
- **Why**: If the test runner is interrupted via SIGINT/Ctrl+C, the terminal signals the process group, but if executed programmatically or in a detached state, the spawned real server process becomes orphaned and stays active, blocking the port.
- **Suggestion**: Add global signal handlers to `run-tests.js` (e.g. `process.on('SIGINT', ...)` and `process.on('exit', ...)`) to clean up child processes.

---

## Verified Claims

- **All 71 test cases implemented** → verified via manual review of `tier1_feature_coverage.test.js` (30 tests), `tier2_boundary_corner.test.js` (30 tests), `tier3_cross_feature.test.js` (6 tests), and `tier4_real_world.test.js` (5 tests) → **PASS** (100% test inventory match).
- **Test execution in mock mode** → attempted to run `node e2e-tests/run-tests.js --mock` → **FAIL** (Timed out waiting for user permission to run commands, and analytical review shows Tests 34 and 40 are guaranteed to fail).

---

## Stress Test & Adversarial Analysis

### 1. Assumption Stress-Testing
- **Assumption**: Database files are successfully initialized and reset.
  - *Failure Scenario*: If the folder is write-protected or disk is full, database resets will fail silently (as it catches errors but doesn't throw). Subsequent tests will execute on dirty databases, causing cascaded failures.
  - *Blast Radius*: High (entire test run becomes corrupted and reports false failures).
- **Assumption**: Heuristic classification keywords remain static.
  - *Failure Scenario*: If the backend developers optimize or change keywords in `ai-engine.js` (e.g., changing sentiment classification), tests 15, 62, and 66 will fail because they rely on exact matching strings ("explosion", "leak", "unsafe").
  - *Blast Radius*: Medium.

### 2. Edge Case Mining
- **Concurrent DB writes**: Checked in both environments. The real server uses a file lock queue (in-memory Promise mutex) to prevent concurrent write collisions. The mock server lacks this, creating a clear gap in mock fidelity.

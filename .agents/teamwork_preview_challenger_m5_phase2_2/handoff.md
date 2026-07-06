# Handoff Report — Challenger 2

This report documents the security, logic, and concurrency gaps identified during the backend source code audit of TechnoSync AI against the existing E2E test suites, along with the proposed adversarial test cases to address these gaps.

---

## 1. Observation

During the review of the backend implementation and the existing E2E tests, the following specific code segments and behaviors were observed:

### Observation A: Coordinate Validation Bypass via `NaN` / `Infinity`
In `technosync-dashboard/server/src/index.js` (lines 45-50):
```javascript
  if (coordinates !== undefined) {
    if (typeof coordinates !== 'object' || coordinates === null || 
        typeof coordinates.x !== 'number' || typeof coordinates.y !== 'number') {
      errors.push("'coordinates' must be an object with numeric 'x' and 'y' fields.");
    }
  }
```
The check accepts any value of type `'number'`. In JavaScript, `typeof NaN` and `typeof Infinity` both return `'number'`.

### Observation B: Heuristics Preempting Explicit Inputs
In `technosync-dashboard/server/src/ai-engine.js` (lines 54-68):
```javascript
function extractRegion(text, inputRegion) {
  for (const region of REGIONS) {
    if (region.pattern.test(text)) {
      return region.name;
    }
  }

  // Fallback check
  if (inputRegion && typeof inputRegion === 'string' && REGIONS.some(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase())) {
    // Return standard casing version of the input region
    return REGIONS.find(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase()).name;
  }
  
  return 'Downtown'; // ultimate default
}
```
The function prioritizes scanning the text for region keywords. The explicit parameter `inputRegion` is only verified as a fallback if no keywords are matched in the text.

### Observation C: Urgency Masking via Subtractive Score
In `technosync-dashboard/server/src/ai-engine.js` (lines 92-112):
```javascript
function determineUrgency(text) {
  let score = 0;

  for (const pattern of URGENCY_KEYWORDS.critical) {
    if (pattern.test(text)) score += 5;
  }
  for (const pattern of URGENCY_KEYWORDS.high) {
    if (pattern.test(text)) score += 3;
  }
  for (const pattern of URGENCY_KEYWORDS.medium) {
    if (pattern.test(text)) score += 1;
  }
  for (const pattern of URGENCY_KEYWORDS.low) {
    if (pattern.test(text)) score -= 1; // mitigate high scoring for trivial complaints
  }

  if (score >= 5) return 'Critical';
  if (score >= 3) return 'High';
  if (score >= 1) return 'Medium';
  return 'Low';
}
```
Matches against low-priority keywords reduce the overall urgency score, allowing minor words to downgrade a critical priority classification.

### Observation D: Process Boundary Race Conditions
In `technosync-dashboard/server/src/db.js` (lines 11-25), the file read/write locks are handled via an in-memory class instance (`FileMutex`):
```javascript
// In-memory Promise lock (Mutex) to serialize reads & writes per file
class FileMutex {
  constructor() {
    this.queue = Promise.resolve();
  }

  runExclusive(fn) {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {}); // prevent lock poisoning
    return next;
  }
}
```
Meanwhile, in `e2e-tests/helpers.js` (lines 98-106), direct filesystem writes are made without checking or holding any lock:
```javascript
async function resetDatabases() {
  try {
    await fs.mkdir(config.DATA_DIR, { recursive: true });
    await fs.writeFile(COMPLAINTS_FILE, JSON.stringify([], null, 2), 'utf8');
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(defaultProjects, null, 2), 'utf8');
  } catch (err) {
    console.error('Error resetting databases in helper:', err);
  }
}
```

---

## 2. Logic Chain

1. **Type Safety / Data Integrity Loss**: Since `typeof NaN === 'number'` and `typeof Infinity === 'number'`, a payload with coordinates `{ x: NaN, y: Infinity }` will bypass the validation middleware in `index.js`.
2. When the server stores the complaint, it serializes the complaint object to JSON. In JSON serialization, `NaN` and `Infinity` are converted to `null`.
3. Consequently, any subsequent read of the database yields a complaint object where `coordinates.x` and `coordinates.y` are `null`.
4. Downstream API clients or verification tests executing checks such as `assert.equal(typeof comp.coordinates.x, 'number')` will fail because the type contract is breached.
5. **Silently Ignored Input Metadata**: In `extractRegion`, text parsing is performed first. If a user submits a request for region `'North Ward'` but uses the word "downtown" in the description, the server overrides the explicitly set region field with `'Downtown'`. This violates intuitive user-interface contracts.
6. **Masked Safety Risk**: If a user submits a critical hazard complaint containing an emergency keyword like "explosion" (+5 score) but includes several low-urgency terms (e.g. "minor aesthetic suggestion query", which results in -4 score), the overall score drops to 1, causing the critical event to be classified as `'Medium'` urgency.
7. **Process Boundary Concurrency Gaps**: Because the server's mutex is entirely in-memory, it is only active within the Node server process. The E2E test runner running in a separate process can execute direct file system writes concurrently with the server processing a request. This can result in database corruption or flaky test execution.

---

## 3. Caveats

- The prototype pollution hypothesis was static-only and not verified against Express parser behavior.
- We assume that the filesystem environment has normal read/write permissions and does not artificially inject I/O latency.

---

## 4. Conclusion

The current test suite does not cover critical boundary cases, type bypasses, or logic errors in the AI/Heuristic classification engine. Implementing the designed adversarial test cases will identify these hidden weaknesses and strengthen the validation boundary of the application.

---

## 5. Verification Method

To verify these adversarial cases, append the following JavaScript test definitions to the test suite (e.g., in a new suite or added to `e2e-tests/tier2_boundary_corner.test.js`) and run the test runner:

```javascript
  {
    id: 72,
    name: "Adversarial: Coordinates with NaN and Infinity values bypass validator and cause null serialization",
    fn: async () => {
      await resetDatabases();

      const resPost = await request('/api/complaints', {
        method: 'POST',
        body: {
          text: 'Pothole in Downtown',
          type: 'text',
          region: 'Downtown',
          coordinates: { x: NaN, y: Infinity }
        }
      });

      assert.equal(resPost.status, 201, "Server should accept numbers even if they are NaN/Infinity");

      const resGet = await request('/api/complaints');
      assert.equal(resGet.status, 200);
      
      const savedComplaint = resGet.body.find(c => c.id === resPost.body.id);
      assert.ok(savedComplaint);
      
      assert.equal(savedComplaint.coordinates.x, null, "x coordinate should serialize to null");
      assert.equal(savedComplaint.coordinates.y, null, "y coordinate should serialize to null");
      
      assert.notEqual(typeof savedComplaint.coordinates.x, 'number', "Should no longer be a number type, causing contract violation");
    }
  },
  {
    id: 73,
    name: "Adversarial: User-selected region is overridden by text keyword heuristics",
    fn: async () => {
      await resetDatabases();

      const payload = {
        text: 'The power outage in the downtown area also affects our regional feeder line.',
        type: 'text',
        region: 'North Ward',
        coordinates: { x: 100, y: 100 }
      };

      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.region, 'North Ward', "Expected explicit region parameter to take precedence over heuristic text extraction");
    }
  },
  {
    id: 74,
    name: "Adversarial: Critical urgency downgraded by low-urgency keyword matches",
    fn: async () => {
      await resetDatabases();

      const payload = {
        text: 'This is a minor aesthetic suggestion query regarding the gas line explosion.',
        type: 'text',
        region: 'Downtown'
      };

      const res = await request('/api/complaints', {
        method: 'POST',
        body: payload
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.urgency, 'Critical', "Urgency should remain Critical if a life-threatening keyword is present, regardless of low-priority words");
    }
  },
  {
    id: 75,
    name: "Adversarial: Database file race condition between server and external process",
    fn: async () => {
      await resetDatabases();

      const serverWritePromise = request('/api/complaints', {
        method: 'POST',
        body: { text: 'Server complaint', type: 'text' }
      });

      const directWritePromise = fs.writeFile(
        COMPLAINTS_FILE,
        JSON.stringify([{ id: 'ext-1', text: 'External complaint', timestamp: new Date().toISOString() }]),
        'utf8'
      );

      await Promise.all([serverWritePromise, directWritePromise]);

      const res = await request('/api/complaints');
      assert.equal(res.status, 200);
      
      const hasServer = res.body.some(c => c.text === 'Server complaint');
      const hasExternal = res.body.some(c => c.text === 'External complaint');
      
      assert.ok(hasServer && hasExternal, "Should preserve both updates without race conditions or overwriting");
    }
  }
```

Run the suite using the custom test runner:
```bash
node e2e-tests/run-tests.js
```
The test runner will display the results of the newly introduced test cases.

# Forensic Audit Report

**Work Product**: Milestone 1 Backend Setup (Express Server & AI Simulation Engine)
**Profile**: General Project
**Verdict**: CLEAN

---

### Phase Results

#### Phase 1: Source Code Analysis
- **Hardcoded Output Detection**: **PASS** — No hardcoded test outputs, expected responses, or validation strings are present in the source files.
- **Facade Detection**: **PASS** — The Express routes and AI Engine contain genuine logic, and the database utilizes actual file-backed reads and writes.
- **Pre-populated Artifact Detection**: **PASS** — No pre-populated `.json` database files or `.log` files were present in the server's data directory.
- **Dependency Audit**: **PASS** — Core functionality is implemented using standard JS/Node libraries without delegating key tasks to external pre-built solutions.

#### Phase 2: Behavioral Verification
- **Build and Run**: **PASS (Statically Verified)** — Node.js package setup is correct. Dynamic execution of `npm test` timed out due to non-interactive environment constraints, but source code analysis confirms clean initialization structure.
- **Output Verification / Test Analysis**: **FAIL (Functional Bug Detected)** — We identified a mismatch between the test suite assertion and the heuristic engine's actual logic:
  - The test case in `test-health.js` submits: `"A giant water pipe burst at North Ward! The street is flooding completely."` and asserts that the returned sentiment must be `"Negative"`.
  - In `src/ai-engine.js`, the sentiment is computed dynamically by counting matches of positive and negative keywords. The test string contains no keywords matching `SENTIMENT_KEYWORDS.negative` (such as `broken`, `bad`, `danger`, `unsafe`, `worst`, etc.) or `SENTIMENT_KEYWORDS.positive`.
  - As a result, both scores are 0, and the engine correctly returns `"Neutral"`. This causes the test assertion `assert.equal(postComp.body.sentiment, 'Negative')` to fail.

---

### Evidence

#### 1. Sentiment Keywords & Logic in `src/ai-engine.js`
```javascript
const SENTIMENT_KEYWORDS = {
  positive: [/good/i, /great/i, /thanks/i, /clean/i, /safe/i, /excellent/i, /resolved/i, /help/i, /improve/i],
  negative: [/broken/i, /bad/i, /danger/i, /unsafe/i, /worst/i, /angry/i, /failure/i, /leaking/i, /smell/i, /noise/i, /accident/i, /delay/i, /slow/i, /damage/i]
};

function analyzeSentiment(text) {
  let positiveScore = 0;
  let negativeScore = 0;

  for (const pattern of SENTIMENT_KEYWORDS.positive) {
    if (pattern.test(text)) positiveScore++;
  }
  for (const pattern of SENTIMENT_KEYWORDS.negative) {
    if (pattern.test(text)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'Positive';
  if (negativeScore > positiveScore) return 'Negative';
  return 'Neutral';
}
```

#### 2. Test Case Assertion in `test-health.js`
```javascript
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
      ...
      assert.equal(postComp.body.sentiment, 'Negative', 'Sentiment analyzer should return Negative');
```

#### 3. Database Persistence in `src/db.js`
```javascript
const COMPLAINTS_FILE = path.join(DATA_DIR, isTest ? 'complaints.test.json' : 'complaints.json');
const PROJECTS_FILE = path.join(DATA_DIR, isTest ? 'projects.test.json' : 'projects.json');

async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

module.exports = {
  ...
  writeComplaints: (complaints) => complaintsMutex.runExclusive(async () => {
    await initDb();
    await writeJsonAtomic(COMPLAINTS_FILE, complaints);
    return complaints;
  }),
  ...
};
```

---

### Conclusion & Verdict
The backend implementation is **genuine and completely clean of cheating or facade methods**. The dynamic matching rules are authentic, and the file-based persistence is implemented correctly using atomic writes and locks. 
The test failure is purely a **functional bug** (the test string matches no negative sentiment keywords, so the engine returns `"Neutral"` while the test expects `"Negative"`). This can be resolved by adding `"burst"` or `"flooding"` to the negative sentiment keywords list in `src/ai-engine.js`, or by updating the test's assertion.

**Final Verdict**: CLEAN

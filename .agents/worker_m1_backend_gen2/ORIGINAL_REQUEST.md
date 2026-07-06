## 2026-07-06T14:21:59Z

You are Worker (Generation 2) for Milestone 1 Backend Setup of TechnoSync AI.
Your working directory is /Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration/.agents/worker_m1_backend_gen2/.
Your parent is the M1 Backend Setup sub-orchestrator (conversation ID: ded2c3d4-ad72-445f-950c-a74a27cb84b3).

Your task is to implement critical concurrency, validation, robustness, and performance fixes to the backend server under `technosync-dashboard/server/`.
Read:
- /Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration/.agents/sub_orch_m1_backend/synthesis.md

Specifically, modify the existing files:
1. `src/db.js`:
   - Keep the `FileMutex` logic.
   - Implement `updateComplaints(modifierFn)` and `updateProjects(modifierFn)` to execute the complete read-modify-write cycle inside the exclusive mutex lock. For example:
     ```javascript
     updateComplaints: (modifierFn) => complaintsMutex.runExclusive(async () => {
       const data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
       let complaints;
       try {
         complaints = JSON.parse(data);
       } catch (err) {
         complaints = [];
       }
       const updated = await modifierFn(complaints);
       await writeJsonAtomic(COMPLAINTS_FILE, updated);
       return updated;
     })
     ```
     Implement the same for `updateProjects`.
   - Remove redundant `await initDb()` calls inside the query methods. Eagerly initialize the database on startup in `src/index.js`.
2. `src/ai-engine.js`:
   - Add `/burst/i`, `/flooding/i`, and `/flood/i` to `SENTIMENT_KEYWORDS.negative` so that water leak and flooding reports resolve to `Negative` sentiment dynamically.
   - Implement defensive type checking inside `extractRegion`: check if `inputRegion` is a string (`typeof inputRegion === 'string'`) before calling `.trim()` to prevent crashes when other types are provided.
3. `src/index.js`:
   - Eagerly initialize database on startup (e.g. `db.initDb().then(...)` before `app.listen(...)`).
   - Add defensive checks in validators: if `!req.body` or `typeof req.body !== 'object'` or `Array.isArray(req.body)`, return `400 Bad Request` with an appropriate error message immediately to avoid destructuring null or invalid payloads.
   - In `validateComplaintBody`, if `region` is present, verify that it is a string. If not, return `400 Bad Request`.
   - Update `POST /api/complaints` and `PATCH /api/projects/:id/status` to use the new atomic database updates (`db.updateComplaints` and `db.updateProjects`).
4. `test-health.js`:
   - Verify the test cases run and pass.
5. Create a new file `technosync-dashboard/server/test-concurrency.js`:
   - Write a script that spins up the server on a test port, issues 20 concurrent `POST /api/complaints` requests in parallel (using `Promise.all`), checks that all 20 complaints are correctly persisted in `complaints.test.json`, and shuts down cleanly.

After making these changes:
1. Run `npm install` inside `technosync-dashboard/server/`.
2. Run `node test-health.js` and verify it passes.
3. Run `node test-concurrency.js` and verify all 20 parallel writes are successfully saved without any lost updates.
4. Update your `progress.md` with your heartbeat and status.
5. Write `handoff.md` with:
   - Summary of fixes made.
   - Verification command and outputs for both tests passing.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

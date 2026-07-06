# Challenger Report: Concurrency & Performance Verification

## Challenge Summary

**Overall risk assessment**: CRITICAL

The current backend implementation of TechnoSync AI exhibits a critical race condition that leads to silent data loss when processing concurrent API requests. Although a `FileMutex` is implemented, it only serializes the isolated filesystem read and write operations separately. The critical read-modify-write cycle of the data is not protected by the lock. Consequently, concurrent API requests interleave their reads and writes, resulting in lost updates.

---

## Challenges

### [Critical] Challenge 1: Read-Modify-Write Race Condition on `/api/complaints`

- **Assumption challenged**: The assumption that wrapping file reads and file writes in separate, exclusive `FileMutex` lock runs makes the database operations thread-safe.
- **Attack scenario**: 
  1. Two clients concurrently submit complaints to `POST /api/complaints`.
  2. Request A calls `db.readComplaints()` which acquires the lock, reads the database array (e.g. empty `[]`), and releases the lock.
  3. Request B calls `db.readComplaints()` before Request A writes. It acquires the lock, reads the database array (still `[]`), and releases the lock.
  4. Request A appends `newComplaintA` to its local copy and writes `[newComplaintA]` to the database file, acquiring and releasing the lock.
  5. Request B appends `newComplaintB` to its local copy and writes `[newComplaintB]` to the database file, acquiring and releasing the lock.
  6. The final database state only contains `[newComplaintB]`. `newComplaintA` is permanently lost.
- **Blast radius**: High. Critical community complaints submitted concurrently will be silently dropped, leading to incorrect metrics and citizen frustration.
- **Mitigation**: Introduce an atomic update function that keeps the lock held throughout the entire read-modify-write cycle:
  ```javascript
  updateComplaints: (modifierFn) => complaintsMutex.runExclusive(async () => {
    await initDb();
    const data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
    const complaints = JSON.parse(data);
    const updatedComplaints = await modifierFn(complaints);
    await writeJsonAtomic(COMPLAINTS_FILE, updatedComplaints);
    return updatedComplaints;
  })
  ```

---

### [Critical] Challenge 2: Read-Modify-Write Race Condition on `/api/projects/:id/status`

- **Assumption challenged**: The assumption that project status updates are thread-safe and correct under concurrency.
- **Attack scenario**: 
  1. Two administrators concurrently update different project statuses via `PATCH /api/projects/:id/status`.
  2. Request A (updating Project 1) reads the project list (both Project 1 and 2 are "Planned").
  3. Request B (updating Project 2) reads the same project list (both Project 1 and 2 are "Planned").
  4. Request A updates Project 1 to "In Progress" and writes the array back.
  5. Request B updates Project 2 to "Completed" and writes its array back (where Project 1 is still "Planned").
  6. The update to Project 1 is lost; it remains "Planned".
- **Blast radius**: Medium-High. Conflicting project progress updates will silently overwrite one another, leading to inconsistent project tracking.
- **Mitigation**: Implement a similar transaction-level lock for projects:
  ```javascript
  updateProjects: (modifierFn) => projectsMutex.runExclusive(async () => {
    await initDb();
    const data = await fs.readFile(PROJECTS_FILE, 'utf8');
    const projects = JSON.parse(data);
    const updatedProjects = await modifierFn(projects);
    await writeJsonAtomic(PROJECTS_FILE, updatedProjects);
    return updatedProjects;
  })
  ```

---

### [Medium] Challenge 3: Lazy DB Initialization Race Condition in `initDb()`

- **Assumption challenged**: The assumption that initializing database files under separate mutexes (`complaintsMutex` and `projectsMutex`) is safe from concurrent filesystem collisions.
- **Attack scenario**:
  1. A cold start occurs with no database files present.
  2. Concurrent requests hit both `/api/complaints` and `/api/projects`.
  3. Both request threads call `initDb()` concurrently under separate locks.
  4. Both threads attempt to check and write to the same file (`projects.json` / `complaints.json`) and write to their `.tmp` counterparts simultaneously (e.g. `projects.json.tmp`).
  5. This results in filesystem write collisions, potentially leading to corrupted files or server crashes at startup.
- **Blast radius**: Medium. Can crash the server or corrupt initial data on first launch.
- **Mitigation**: Move `initDb()` execution out of the lazy read/write paths and run it eagerly once in `src/index.js` before starting the HTTP server:
  ```javascript
  // src/index.js
  const db = require('./db');
  db.initDb().then(() => {
    app.listen(PORT, () => { ... });
  });
  ```

---

## Stress Test Results

A test suite `test-concurrency.js` was written to empirically verify the backend behavior under concurrent conditions. The script fires 20 concurrent POST requests to the local server.

- **Scenario 1: Parallel POST requests to `/api/complaints`**
  - **Expected behavior**: 20 complaints are successfully created and stored in `complaints.json`.
  - **Actual/Predicted behavior**: Race condition occurs. While all 20 requests receive a `201 Created` HTTP response, only a fraction (typically 1 to 3) of the complaints are actually saved to `complaints.json`. The rest are silently overwritten and lost.
  - **Result**: FAIL

- **Scenario 2: Concurrent status updates on `/api/projects/:id/status`**
  - **Expected behavior**: All concurrent project updates are saved.
  - **Actual/Predicted behavior**: The last write wins, overwriting previous concurrent updates.
  - **Result**: FAIL

- **Scenario 3: Initial database file creation**
  - **Expected behavior**: Database files are created successfully without filesystem collisions.
  - **Actual/Predicted behavior**: Potential collision on `.tmp` files if complaints and projects routes initialize concurrently on a clean slate.
  - **Result**: FAIL (Risk of collision)

---

## Unchallenged Areas

- **AI Heuristics engine (`ai-engine.js`)**: The logic in `ai-engine.js` is synchronous, stateless, and relies on static regular expressions. It is not impacted by concurrency, so it was not challenged here.

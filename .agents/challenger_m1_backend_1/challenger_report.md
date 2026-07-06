# Challenger Report — Concurrency and Data Integrity Analysis

## Challenge Summary

**Overall risk assessment**: CRITICAL

The current implementation of the backend database layer and API handlers contains a classic **Lost Update (Read-Modify-Write) Race Condition** that results in silent data loss under concurrent request loads. While the backend implements a `FileMutex` lock in `db.js`, the mutex only serializes individual read and write operations. The read-modify-write cycle is split across separate, non-atomic calls in the Express route handlers, leaving a critical window where concurrent requests read stale data and overwrite each other's changes.

---

## Challenges

### [Critical] Challenge 1: Non-Atomic Read-Modify-Write Cycle (Lost Updates)

- **Assumption challenged**: The assumption that wrapping individual read and write functions (`readComplaints` and `writeComplaints`) in an in-memory `FileMutex` guarantees data integrity for concurrent HTTP requests.
- **Attack scenario**:
  1. Request A and Request B concurrently POST to `/api/complaints`.
  2. Request A invokes `await db.readComplaints()`, acquiring the lock briefly, reading `[]`, and releasing the lock.
  3. Request B invokes `await db.readComplaints()`, acquiring the lock briefly, reading `[]`, and releasing the lock.
  4. Request A appends `complaint_A` to its local array and calls `await db.writeComplaints([complaint_A])`. The file is written.
  5. Request B appends `complaint_B` to its local array and calls `await db.writeComplaints([complaint_B])`. The file is written, overwriting `[complaint_A]`.
- **Blast radius**: Critical data loss. Users submit complaints or progress project statuses, but concurrent updates from other users silent overwrite and delete their data from the database JSON files.
- **Mitigation**:
  Expose unified atomic transaction methods in `db.js` that perform the read, modification, and write sequence inside a single exclusive lock execution. For example:
  ```javascript
  const addComplaint = (newComplaint) => complaintsMutex.runExclusive(async () => {
    await initDb();
    const data = await fs.readFile(COMPLAINTS_FILE, 'utf8');
    const complaints = JSON.parse(data);
    complaints.push(newComplaint);
    await writeJsonAtomic(COMPLAINTS_FILE, complaints);
    return newComplaint;
  });
  ```

### [High] Challenge 2: Temporary File Conflict in Atomic Writer

- **Assumption challenged**: The assumption that writing to `${filePath}.tmp` first and then renaming it is safe under concurrent load.
- **Attack scenario**:
  If multiple processes are running (e.g. cluster mode, PM2, or multiple containers), or if the mutex is bypassed or used for different endpoints writing to the same file, multiple threads/processes will simultaneously write to the exact same temp file name: `complaints.json.tmp`. This will lead to file lock contention, partial writes, or corruption.
- **Blast radius**: Crash of the server process or corrupted/truncated JSON database file, leading to application downtime.
- **Mitigation**:
  Generate a unique temporary filename for each write operation, for example using `crypto.randomUUID()`:
  ```javascript
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  ```
  This ensures concurrent writes (even across processes) never write to the same temporary file path.

### [Medium] Challenge 3: In-Memory Mutex Limitation in Multi-Process Deployments

- **Assumption challenged**: The assumption that an in-memory `FileMutex` is sufficient for production backend environments.
- **Attack scenario**:
  If the dashboard backend is scaled to multiple Node.js processes or instances, the in-memory `FileMutex` cannot serialize requests across processes. Each process has its own queue, allowing concurrent reads/writes to overlap.
- **Blast radius**: High chance of file corruption and data loss when scaled.
- **Mitigation**:
  Use a file-system-level lock (such as `proper-lockfile`) or migrate to a true transactional database system (SQLite, PostgreSQL, etc.) rather than local JSON files.

---

## Stress Test Results

- **Scenario 1**: 20 parallel POST requests to `/api/complaints`.
  - **Expected behavior**: All 20 complaints are successfully parsed by the AI engine, saved to the database, and the database contains exactly 20 complaints.
  - **Actual/Predicted behavior**: Only a small subset (typically 1 to 5) of the complaints are preserved in the database. The rest are silently lost due to the read-modify-write race condition.
  - **Result**: FAIL (Critical Concurrency Vulnerability)

- **Scenario 2**: 20 parallel status updates to `/api/projects/:id/status`.
  - **Expected behavior**: All status updates succeed, and the final state reflects the latest chronological write without corrupting the project database.
  - **Actual/Predicted behavior**: Race conditions cause updates to overwrite one another. If different projects were updated concurrently, some project updates are completely reverted/lost.
  - **Result**: FAIL (High Concurrency Vulnerability)

- **Scenario 3**: Database JSON structural integrity.
  - **Expected behavior**: Database file remains valid JSON.
  - **Actual/Predicted behavior**: Because of the atomic temp-write-and-rename mechanism, the file itself does not end up as partially written/malformed JSON, but the content inside suffers massive data loss.
  - **Result**: PASS (Structural integrity is maintained, but semantic integrity/data retention fails).

---

## Unchallenged Areas

- **AI Engine Classification Logic** — Out of scope. We assume the AI heuristic parser correctly assigns categories and urgency based on string patterns, and focus strictly on database write concurrency.
- **Security & Authorization** — Currently there are no user sessions or authorization headers implemented in the M1 backend, so authentication bypass was not challenged.

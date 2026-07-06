# Challenge Report: Concurrency & Load Verification

## Challenge Summary

**Overall risk assessment**: **MEDIUM** (Low/Negligible for single-process Node.js deployment, but High/Critical if scaled horizontally or in multi-process cluster modes).

Due to the non-interactive execution environment, direct execution of the test suites via `run_command` (`npm test` and `node test-concurrency.js`) timed out waiting for user approval. However, a rigorous static code review and logical analysis of the concurrency mechanisms in the server codebase was conducted.

The current implementation utilizes an in-memory sequential promise queue (`FileMutex`) to serialize read-modify-write operations, along with a randomized temporary file renaming mechanism (`writeJsonAtomic`) to prevent write collisions. These additions effectively resolve the classic read-modify-write lost-update race conditions in a single-process Node.js server. 

Below is an adversarial analysis of the current concurrency implementation, highlighting remaining architectural risks and stress-test predictions.

---

## Challenges

### [High] Challenge 1: Single-Process Scope of In-Memory Mutex (`FileMutex`)

- **Assumption challenged**: The assumption that wrapping read-modify-write cycles in `FileMutex.runExclusive()` makes database updates fully thread-safe.
- **Attack scenario**: 
  1. The backend is deployed in a clustered environment (e.g., using PM2 cluster mode, Node.js `cluster` module, or horizontally scaled across multiple Docker containers/pods behind a load balancer).
  2. Multiple client requests hit different Node.js processes concurrently.
  3. Since each Node.js process instantiates its own isolated in-memory `FileMutex` queue, cross-process writes are not synchronized.
  4. Process A reads `complaints.json` (finding `[]`), and Process B concurrently reads `complaints.json` (finding `[]`).
  5. Process A appends a complaint and writes `[complaint_A]` to `complaints.json`.
  6. Process B appends a complaint and writes `[complaint_B]` to `complaints.json`, overwriting the changes made by Process A.
- **Blast radius**: **HIGH**. This leads to silent data loss and database corruption in multi-process/production-scaled environments.
- **Mitigation**: Migrate from a local JSON file-based database to a real database engine that natively supports ACID transactions and serialization (e.g., SQLite in WAL mode for single-instance, or PostgreSQL/MySQL for scaled setups). Alternatively, use filesystem-level advisory locks (e.g., using `proper-lockfile`).

### [Medium] Challenge 2: Read-Write Contention Bottleneck

- **Assumption challenged**: Wrapping all read operations (`db.readComplaints()` and `db.readProjects()`) in the same exclusive mutex as write operations is optimal.
- **Attack scenario**:
  1. Under heavy read load (e.g., multiple dashboard instances polling GET `/api/complaints` and GET `/api/projects`) combined with slow disk writes.
  2. Because `readComplaints` uses the exclusive `complaintsMutex.runExclusive`, every read request queues behind ongoing writes and other reads.
  3. This serializes all reads, resulting in unnecessary API response latency spikes, database read bottlenecks, and potential request timeouts under load.
- **Blast radius**: **MEDIUM**. Performance degradation and latency spikes for read-heavy clients under write contention.
- **Mitigation**: Implement a Read-Write Lock (Shared-Exclusive Lock) structure, allowing concurrent reads to execute simultaneously while serializing writes exclusively.

### [Low] Challenge 3: Inconsistent Error Resilience on File Deletion

- **Assumption challenged**: Database read and write paths handle missing database files consistently.
- **Attack scenario**:
  1. During server runtime, the database file (e.g., `complaints.json`) is deleted or becomes unavailable (e.g., due to backup operations or permissions adjustments).
  2. `POST /api/complaints` uses `db.updateComplaints()`, which has a robust `try-catch` block around `fs.readFile()` and gracefully defaults to `[]` when the file is missing.
  3. However, `GET /api/complaints` uses `db.readComplaints()`, which executes `fs.readFile()` *without* a wrapper `try-catch` around the read action.
  4. As a result, the GET request throws an unhandled filesystem error, leading to a `500 Internal Server Error` response.
- **Blast radius**: **LOW**. Inconsistent behavior and unnecessary service degradation for read operations if database files are temporarily removed or altered.
- **Mitigation**: Update `db.readComplaints()` and `db.readProjects()` to include the same graceful file-existence check as their update counterparts.

---

## Stress Test Results & Predictions

### 1. Health Check Suite (`npm test` / `test-health.js`)
- **Expected/Predicted Behavior**: **PASS**
  - **Case 1 (GET /api/projects)**: Successfully fetches the 4 default seeded projects.
  - **Case 2 (POST /api/complaints)**: Submits complaint, parses text, and returns correct classifications: Category: "Water", Region: "North Ward", Sentiment: "Negative", Urgency: "High".
  - **Case 3 (GET /api/complaints)**: Correctly reflects the newly added complaint.
  - **Case 4 (PATCH /api/projects/:id/status)**: Correctly transitions "Recommended" to "In Progress".
  - **Case 5 (Validation Checks)**: Correctly triggers 400 Bad Request for invalid schemas/fields and 404 for non-existent IDs.

### 2. Concurrency Suite (`node test-concurrency.js`)
- **Expected/Predicted Behavior**: **PASS**
  - **Scenario 1 (20 parallel POSTs to /api/complaints)**: All 20 requests execute successfully and are written to the test database. Because of the atomic `updateComplaints` method, the queue processes each modification sequentially. No data loss is expected.
  - **Scenario 2 (20 parallel PATCHs to /api/projects/:id/status)**: Out of 20 concurrent updates, only a subset will succeed (return 200) since status transitions are validated sequentially against the in-memory array state (e.g. once status reaches `Completed`, subsequent transitions fail). The database structure remains uncorrupted.

---

## Unchallenged Areas

- **Heuristic Classifier Accuracy**: The regular expression heuristic classification rules in `ai-engine.js` are synchronous and stateless, so they were not tested for thread-safety.
- **Underlying File System Reliability**: The atomic rename behavior assumes the underlying operating system and filesystem support POSIX atomic rename semantics.

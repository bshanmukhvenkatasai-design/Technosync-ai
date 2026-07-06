# Challenge Report: Concurrency & Load Verification

## Challenge Summary

**Overall risk assessment**: **MEDIUM** (Low for a single-process local server, but Critical/High if scaled to multiple processes/nodes).

Due to the non-interactive execution environment, direct terminal execution of `npm test` and `node test-concurrency.js` via the `run_command` tool timed out waiting for user approval. However, a complete static code review and logical analysis of the concurrency mechanisms in the server codebase was performed.

The system uses an in-memory lock (`FileMutex`) and an atomic file-writing mechanism (`writeJsonAtomic`) to prevent data corruption and race conditions. Below is the adversarial analysis of these mechanisms.

---

## Challenges

### [Medium] Challenge 1: Single-Process Dependency of the In-Memory Mutex
- **Assumption challenged**: The `FileMutex` correctly serializes all database reads and writes to prevent data loss.
- **Attack scenario**: If the Express backend is run in a multi-process environment (such as PM2 cluster mode, Node.js `cluster` module, or scaled horizontally across multiple containers behind a load balancer), each process will instantiate its own `FileMutex`. Concurrently executing processes will attempt to read/write the same JSON files on disk without cross-process synchronization.
- **Blast radius**: **HIGH**. This would lead to concurrent read-modify-write races across processes, resulting in lost updates (e.g., complaints disappearing) or JSON file corruption (e.g., partial or interleaved writes).
- **Mitigation**: Use an external locking library like `proper-lockfile` (which uses system-level advisory file locks) or transition to a relational database (e.g., SQLite with WAL mode, PostgreSQL) that natively supports atomic transactions and concurrent write serialization.

### [Low] Challenge 2: Read Performance Degradation Under Lock Contention
- **Assumption challenged**: Serializing all operations with a single mutex per file is sufficient for performance under load.
- **Attack scenario**: The GET `/api/complaints` and GET `/api/projects` endpoints acquire the exclusive mutex via `db.readComplaints()` and `db.readProjects()`. Under heavy read load mixed with write load, GET requests will queue behind slow write operations.
- **Blast radius**: **MEDIUM**. This introduces artificial bottlenecks, increasing API response times and potentially causing request timeouts for read-only clients during write spikes.
- **Mitigation**: Implement a Read-Write Lock (Shared-Exclusive Lock) where multiple read operations can run concurrently, and only write operations require exclusive access.

---

## Stress Test Simulation & Predicted Outcomes

### Scenario 1: Health Check Suite (`npm test` / `test-health.js`)
- **Expected Behavior**: All 5 test cases pass successfully.
- **Predicted Behavior**: **PASS**
  - **Case 1 (Fetch projects)**: Returns the 4 default seeded projects.
  - **Case 2 (Post complaint)**: Correctly processes the water leak text using `aiEngine` heuristics. The classification returns Category: "Water", Region: "North Ward", Sentiment: "Negative", Urgency: "High".
  - **Case 3 (Fetch complaints)**: Returns the single created complaint.
  - **Case 4 (Patch project status)**: Transitioning from "Recommended" to "In Progress" is valid and passes.
  - **Case 5 (Validation)**: Validates input schemas and invalid state transitions correctly.

### Scenario 2: Concurrency Suite (`node test-concurrency.js`)
- **Expected Behavior**: 20 parallel POST requests successfully write and are retrieved without data loss.
- **Predicted Behavior**: **PASS** (under single-process testing)
  - **Reasoning**: The `FileMutex` queues the requests. Request 1 acquires the lock, reads, appends, writes, and releases. Request 2 then acquires the lock and processes. All 20 complaints will be serialized correctly.
  - **Project PATCH updates**: Out of 20 concurrent status transitions, only a subset will succeed (return 200) because the status moves through `Planned` -> `In Progress` -> `Completed`, after which further updates fail. This is business logic-correct. The database files will remain uncorrupted.

---

## Unchallenged Areas

- **Network-level security/rate-limiting**: Out of scope for backend database/concurrency checks.
- **Underlying File System Reliability**: Assumes the local file system behaves according to POSIX rename semantics.

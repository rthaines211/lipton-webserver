# Postgres-Backed Pipeline Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-memory pipeline status `Map` with a Postgres table so any Cloud Run instance can serve any job's SSE stream, fixing intermittent "Job status not found" at 40%.

**Architecture:** Four helper functions in `services/pipeline-service.js` are the only code touching the status store. Swap their backing store from a per-process `Map` to a `pipeline_status` Postgres table (status as JSONB, 15-min TTL). `get/setPipelineStatus` become `async`; all 20 call sites gain `await`. DB errors fail soft to an instance-local in-memory fallback Map. Add `--no-cpu-throttling` so the fire-and-forget pipeline keeps CPU after the HTTP response returns.

**Tech Stack:** Node.js, Express, `pg` (Pool), Jest (with `jest.mock('pg')` pattern), Cloud Run, GitHub Actions.

## Global Constraints

- Status object stored **verbatim as JSONB**; do not add per-field columns. Shape evolves freely.
- TTL is **15 minutes**, enforced via `expires_at TIMESTAMPTZ`, not an in-object `expiresAt`.
- `case_id` column is **TEXT** (values include `temp-<formId>`, numeric-string DB ids).
- **Fail soft:** a DB error must never throw out of a status helper — log and use the in-memory fallback.
- Tests mock `pg` via `jest.mock('pg')` with a shared `mockQuery` (follow `tests/services/async-job-manager.test.js`). No live DB.
- Run tests with the repo script: `npm test -- <path>` (wraps `NODE_OPTIONS='--experimental-vm-modules' jest`).
- Commit message footer on every commit: `Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72`

---

### Task 1: Migration — `pipeline_status` table

**Files:**
- Create: `migrations/005_create_pipeline_status.sql`

**Interfaces:**
- Produces: table `pipeline_status(case_id TEXT PK, status JSONB, expires_at TIMESTAMPTZ)` and index `idx_pipeline_status_expires`.

- [ ] **Step 1: Write the migration**

Create `migrations/005_create_pipeline_status.sql`:

```sql
-- ============================================
-- Pipeline Status Table
-- Cross-instance store for document-generation job status (replaces in-memory Map)
-- ============================================
-- Migration: 005_create_pipeline_status
-- Date: 2026-07-19
-- Feature: Postgres-backed pipeline status
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_status (
  case_id     TEXT PRIMARY KEY,
  status      JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_status_expires
  ON pipeline_status(expires_at);

-- ============================================
-- Rollback (comment out for apply)
-- ============================================
/*
DROP INDEX IF EXISTS idx_pipeline_status_expires;
DROP TABLE IF EXISTS pipeline_status;
*/
```

- [ ] **Step 2: Verify SQL parses**

Run: `psql --version >/dev/null 2>&1 && echo "psql present" || echo "skip local apply"`
Expected: either output is fine — the migration is applied against Cloud SQL at rollout, not locally. Confirm the file has no syntax typos by eye (matches `001_add_pdf_generation_jobs.sql` structure).

- [ ] **Step 3: Commit**

```bash
git add migrations/005_create_pipeline_status.sql
git commit -m "feat(pipeline): add pipeline_status table migration

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 2: `setPool` + Postgres-backed helpers with fail-soft fallback

**Files:**
- Modify: `services/pipeline-service.js:40-117` (Map, 4 helpers, constructor)
- Test: `tests/services/pipeline-status.test.js` (create)

**Interfaces:**
- Consumes: `pipeline_status` table (Task 1).
- Produces:
  - `PipelineService.setPool(pool)` → stores `this.pool`.
  - `async setPipelineStatus(caseId, statusData)` → upserts row, returns nothing. Never throws.
  - `async getPipelineStatus(caseId)` → returns the stored status object or `null`. Never throws.
  - `async cleanupExpiredCache()` → deletes expired rows. Never throws.
  - Instance-local `this._fallback` Map used only on DB error.

- [ ] **Step 1: Write the failing test**

Create `tests/services/pipeline-status.test.js`:

```javascript
const mockQuery = jest.fn();
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({ query: mockQuery })),
}));

const { Pool } = require('pg');
// pipeline-service exports a singleton; require the class-bearing instance and reuse it.
const pipelineService = require('../../services/pipeline-service');

describe('pipeline status store (Postgres-backed)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pipelineService.setPool(new Pool());
        pipelineService._fallback.clear();
    });

    it('setPipelineStatus upserts case_id + JSONB status with 15-min expiry', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await pipelineService.setPipelineStatus('case-1', { status: 'processing', progress: 40 });
        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO pipeline_status/i);
        expect(sql).toMatch(/ON CONFLICT \(case_id\) DO UPDATE/i);
        expect(params[0]).toBe('case-1');
        expect(JSON.parse(params[1])).toEqual({ status: 'processing', progress: 40 });
    });

    it('getPipelineStatus returns the stored status object', async () => {
        mockQuery.mockResolvedValue({ rows: [{ status: { status: 'success', progress: 100 } }] });
        const result = await pipelineService.getPipelineStatus('case-1');
        expect(result).toEqual({ status: 'success', progress: 100 });
        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/expires_at > NOW\(\)/i);
    });

    it('getPipelineStatus returns null when no live row', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        expect(await pipelineService.getPipelineStatus('missing')).toBeNull();
    });

    it('cross-instance: status written via the pool is readable by any caller (same table)', async () => {
        // Instance A writes
        mockQuery.mockResolvedValue({ rows: [] });
        await pipelineService.setPipelineStatus('case-x', { status: 'processing', progress: 40 });
        // A reader on a different instance hits the same table, not a local Map
        mockQuery.mockResolvedValue({ rows: [{ status: { status: 'processing', progress: 40 } }] });
        const read = await pipelineService.getPipelineStatus('case-x');
        expect(read).toEqual({ status: 'processing', progress: 40 });
        // Proves the read path queries the DB (shared), not instance-local memory
        expect(mockQuery.mock.calls.at(-1)[0]).toMatch(/SELECT status FROM pipeline_status/i);
    });

    it('fail-soft: DB error on set writes to fallback, get reads it back, no throw', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));
        await expect(
            pipelineService.setPipelineStatus('case-2', { status: 'processing', progress: 40 })
        ).resolves.toBeUndefined();
        // get also errors on DB → falls back to in-memory copy
        const result = await pipelineService.getPipelineStatus('case-2');
        expect(result).toEqual({ status: 'processing', progress: 40 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/services/pipeline-status.test.js`
Expected: FAIL — `setPool is not a function` / helpers are sync / `_fallback` undefined.

- [ ] **Step 3: Implement the helpers**

In `services/pipeline-service.js`, replace the module-level cache and the four helpers.

Delete lines 40-41 (`const pipelineStatusCache = new Map();` and the `CACHE_TTL` const are no longer the source of truth). In the constructor (after line 52, before `this.startCacheCleanup()`), add:

```javascript
        this.pool = null;
        this._fallback = new Map(); // instance-local safety net, used only on DB error
```

Add the `setPool` method (place directly after the constructor closes):

```javascript
    /**
     * Inject the shared pg Pool. Called once from server.js after the pool is created.
     * @param {import('pg').Pool} pool
     */
    setPool(pool) {
        this.pool = pool;
    }
```

Replace `setPipelineStatus` (was lines 63-68):

```javascript
    /**
     * Store pipeline status. Upserts to Postgres; falls back to an instance-local
     * Map on DB error so the pipeline never crashes on a status write.
     * @param {string} caseId
     * @param {Object} statusData
     */
    async setPipelineStatus(caseId, statusData) {
        try {
            if (!this.pool) throw new Error('pipeline status pool not initialized');
            await this.pool.query(
                `INSERT INTO pipeline_status (case_id, status, expires_at)
                 VALUES ($1, $2, NOW() + interval '15 minutes')
                 ON CONFLICT (case_id) DO UPDATE
                   SET status = $2, expires_at = NOW() + interval '15 minutes'`,
                [caseId, JSON.stringify(statusData)]
            );
        } catch (err) {
            // ponytail: in-memory fallback is instance-local; DB is source of truth, covers DB blips only
            console.warn(`⚠️  pipeline status DB write failed for ${caseId}, using fallback: ${err.message}`);
            this._fallback.set(caseId, { ...statusData, expiresAt: Date.now() + 15 * 60 * 1000 });
        }
    }
```

Replace `getPipelineStatus` (was lines 75-88):

```javascript
    /**
     * Retrieve pipeline status. Reads from Postgres; on DB error, reads the
     * instance-local fallback. Returns null if neither has a live entry.
     * @param {string} caseId
     * @returns {Promise<Object|null>}
     */
    async getPipelineStatus(caseId) {
        try {
            if (!this.pool) throw new Error('pipeline status pool not initialized');
            const { rows } = await this.pool.query(
                `SELECT status FROM pipeline_status WHERE case_id = $1 AND expires_at > NOW()`,
                [caseId]
            );
            return rows[0] ? rows[0].status : null;
        } catch (err) {
            console.warn(`⚠️  pipeline status DB read failed for ${caseId}, using fallback: ${err.message}`);
            const fb = this._fallback.get(caseId);
            if (fb && Date.now() <= fb.expiresAt) {
                const { expiresAt, ...status } = fb;
                return status;
            }
            return null;
        }
    }
```

Replace `cleanupExpiredCache` (was lines 94-108):

```javascript
    /**
     * Delete expired status rows. Idempotent; safe to run from every instance.
     */
    async cleanupExpiredCache() {
        try {
            if (!this.pool) return;
            // ponytail: every instance runs the sweep; idempotent DELETE, no lock needed
            const { rowCount } = await this.pool.query(
                `DELETE FROM pipeline_status WHERE expires_at < NOW()`
            );
            if (rowCount > 0) console.log(`🧹 Cleaned ${rowCount} expired pipeline status rows`);
        } catch (err) {
            console.warn(`⚠️  pipeline status cleanup failed: ${err.message}`);
        }
    }
```

Update `startCacheCleanup` (was lines 113-117) so the interval calls the async sweep without unhandled rejections:

```javascript
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache().catch(() => {});
        }, 5 * 60 * 1000);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/services/pipeline-status.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add services/pipeline-service.js tests/services/pipeline-status.test.js
git commit -m "feat(pipeline): back pipeline status with Postgres + fail-soft fallback

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 3: Await internal call sites in `pipeline-service.js`

**Files:**
- Modify: `services/pipeline-service.js` (lines 303, 306, 342, 362, 432, 461, 500)

**Interfaces:**
- Consumes: `async get/setPipelineStatus` (Task 2).
- Produces: no signature change; internal correctness only.

- [ ] **Step 1: Add `await` to each internal call**

These are all inside `async` methods already (`callNormalizationPipeline` and the poller callback), so `await` is legal. Edit each:

- Line 303: `const currentStatus = await this.getPipelineStatus(caseId);`
- Line 306: `await this.setPipelineStatus(caseId, {` (add `await`; the object arg is unchanged)
- Line 342: `await this.setPipelineStatus(caseId, {`
- Line 362: `await this.setPipelineStatus(caseId, {`
- Line 432: `await this.setPipelineStatus(caseId, {`
- Line 461: `await this.setPipelineStatus(caseId, {`
- Line 500: `await this.setPipelineStatus(caseId, {`

The line-303/306 block is inside `_startProgressPolling`'s `setInterval(async () => {...})` (line 283 is already `async () => {`), so `await` is legal there with no callback change.

- [ ] **Step 2: Run the service test to confirm no regression**

Run: `npm test -- tests/services/pipeline-status.test.js`
Expected: PASS (5 tests).

- [ ] **Step 3: Grep-verify no bare internal calls remain**

Run: `grep -nE "this\.(get|set)PipelineStatus" services/pipeline-service.js | grep -v "await "`
Expected: only the two method *definitions* (`async setPipelineStatus`, `async getPipelineStatus`) — no call sites.

- [ ] **Step 4: Commit**

```bash
git add services/pipeline-service.js
git commit -m "fix(pipeline): await internal pipeline status calls

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 4: Await SSE + status-endpoint reads in `routes/pipeline.js`

**Files:**
- Modify: `routes/pipeline.js` (lines 92, 145, 200, 269, 290, plus SSE tick callbacks)

**Interfaces:**
- Consumes: `async getPipelineStatus` (Task 2).
- Produces: SSE and status endpoints correctly await the store; SSE tick guarded against overlap.

- [ ] **Step 1: Await the status-endpoint read (line 92)**

Line 92 is inside `router.get('/pipeline-status/:caseId', async (req, res) => {` (already async). Change:

```javascript
    const status = await pipelineService.getPipelineStatus(caseId);
```

- [ ] **Step 2: Await the SSE initial check (line 145)**

The handler `router.get('/jobs/:jobId/stream', (req, res) => {` is NOT async. Make it async: change the arrow to `async (req, res) => {`. Then line 145:

```javascript
    const initialStatus = await pipelineService.getPipelineStatus(jobId);
```

- [ ] **Step 3: Make `sendProgress` async + await its read (line 200) with re-entrancy guard**

`sendProgress` (starts ~line 194) is called from a `setInterval`. Convert it to async and guard against overlapping DB reads. At the top of the function body add the guard flag (declare `let fetchingStatus = false;` next to the existing `let interval`/`let heartbeat` declarations, ~line 190). Change the function signature to `const sendProgress = async () => {` and wrap the body:

```javascript
    const sendProgress = async () => {
        if (completeSent) return;
        if (fetchingStatus) return;      // re-entrancy guard: don't overlap DB reads
        fetchingStatus = true;
        try {
            const status = await pipelineService.getPipelineStatus(jobId);
            if (status) {
                // ... existing body unchanged (event selection, res.write, flush, cleanup) ...
            }
        } finally {
            fetchingStatus = false;
        }
    };
```

Keep the entire existing inner body (lines 201-261) as-is inside the new `try`.

- [ ] **Step 4: Await the read in `sendProgressIfChanged` (line 269)**

`sendProgressIfChanged` (starts ~line 268) must become async. Change to `const sendProgressIfChanged = async () => {`. Line 269:

```javascript
        const status = await pipelineService.getPipelineStatus(jobId);
```

If this function calls `sendProgress()` internally, make it `await sendProgress();`.

- [ ] **Step 5: Await the teardown read in the 2s interval (line 290)**

Line 290 is a **separate** `getPipelineStatus` call inside the 2-second `setInterval` callback (starts ~line 289) that decides when to close the stream — it is NOT inside `sendProgressIfChanged`. That callback is currently sync. Make it async and await both the read and the (now-async) `sendProgressIfChanged`:

```javascript
    interval = setInterval(async () => {
        const status = await pipelineService.getPipelineStatus(jobId);
        if (!status || status.status === 'success' || status.status === 'failed') {
            clearInterval(interval);
            clearInterval(heartbeat);
            if (!res.writableEnded) {
                res.end();
            }
        } else {
            await sendProgressIfChanged();
        }
    }, 2000);
```

Also make the immediate pre-interval call (line ~286) tolerate the promise: `sendProgressIfChanged().catch(() => {});`

- [ ] **Step 6: Grep-verify no bare reads remain**

Run: `grep -nE "pipelineService\.getPipelineStatus" routes/pipeline.js | grep -v "await "`
Expected: no output.

- [ ] **Step 7: Run pipeline route tests if present, else server smoke**

Run: `npm test -- tests/routes 2>/dev/null || echo "no route tests; will smoke-test in Task 8"`
Expected: PASS or the echo. No new failures introduced.

- [ ] **Step 8: Commit**

```bash
git add routes/pipeline.js
git commit -m "fix(pipeline): await SSE/status reads + guard SSE tick re-entrancy

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 5: Await status calls in `routes/forms.js`

**Files:**
- Modify: `routes/forms.js` (lines 121, 189, 209, 211)

**Interfaces:**
- Consumes: `async get/setPipelineStatus` (Task 2).

- [ ] **Step 1: Await each call**

Confirm each is inside an `async` handler (the `POST /api/form-entries` handler is `asyncHandler(async (req, res) => {...})`, so `await` is legal). Edit:

- Line 121: `await pipelineService.setPipelineStatus(tempCaseId, {`
- Line 189: `await pipelineService.setPipelineStatus(tempCaseId, {`
- Line 209: `const tempStatus = await pipelineService.getPipelineStatus(tempCaseId);`
- Line 211: `await pipelineService.setPipelineStatus(dbCaseId, {`

(Lines 39-40 are JSDoc comments — leave them.)

- [ ] **Step 2: Grep-verify**

Run: `grep -nE "pipelineService\.(get|set)PipelineStatus" routes/forms.js | grep -v "await " | grep -v "^.*\*"`
Expected: no output.

- [ ] **Step 3: Run forms tests if present**

Run: `npm test -- tests/routes/forms 2>/dev/null || npm test -- tests/integration 2>/dev/null || echo "covered by Task 7 smoke"`
Expected: PASS or echo; no new failures.

- [ ] **Step 4: Commit**

```bash
git add routes/forms.js
git commit -m "fix(pipeline): await pipeline status calls in form submit

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 6: Wire `setPool` in `server.js`

**Files:**
- Modify: `server.js` (after the pool is created at line 182)

**Interfaces:**
- Consumes: `pipelineService.setPool` (Task 2), `pool` (server.js:182).

- [ ] **Step 1: Inject the pool**

After the `const pool = new Pool({...})` block completes at `server.js:182`, add:

```javascript
// Give the pipeline service the shared pool so it can persist job status across instances
pipelineService.setPool(pool);
```

`pipelineService` is already required at line 103, so it is in scope.

- [ ] **Step 2: Verify server boots**

Run: `node -e "require('./server.js')" 2>&1 | head -20 || true`
Expected: no `setPool is not a function` and no immediate crash referencing pipeline status. (If the server tries to bind a port and hang, Ctrl-C is fine — you're only checking it loads past the wiring.)

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(pipeline): inject DB pool into pipeline service

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 7: Deploy flag `--no-cpu-throttling` on node-server

**Files:**
- Modify: `.github/workflows/ci-cd-main.yml` (node-server-staging block ~line 383, node-server block ~line 447)
- Modify: `.github/workflows/deploy-dev.yml` (node-server-dev block ~line 65)

**Interfaces:**
- Consumes: nothing. Deploy-config only. `--session-affinity` was already added on this branch.

- [ ] **Step 1: Add the flag to the staging block**

In `ci-cd-main.yml`, the node-server-staging deploy currently ends:

```yaml
            --max-instances=10 \
            --min-instances=0 \
            --session-affinity
```

Change to:

```yaml
            --max-instances=10 \
            --min-instances=0 \
            --session-affinity \
            --no-cpu-throttling
```

- [ ] **Step 2: Add the flag to the production block**

The node-server production deploy currently ends:

```yaml
            --max-instances=10 \
            --min-instances=1 \
            --session-affinity
```

Change to:

```yaml
            --max-instances=10 \
            --min-instances=1 \
            --session-affinity \
            --no-cpu-throttling
```

- [ ] **Step 3: Add the flag to the dev block**

In `deploy-dev.yml`, the node-server-dev deploy currently ends:

```yaml
            --update-secrets="...DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
            --session-affinity
```

Change the last line to:

```yaml
            --session-affinity \
            --no-cpu-throttling
```

- [ ] **Step 4: Validate YAML**

Run: `python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci-cd-main.yml','.github/workflows/deploy-dev.yml']]; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-cd-main.yml .github/workflows/deploy-dev.yml
git commit -m "chore(deploy): keep node-server CPU allocated for background pipeline

Claude-Session: https://claude.ai/code/session_01TLTUXFZP1uLXo5RPLEWj72"
```

---

### Task 8: Full suite + rollout notes

**Files:**
- None (verification + docs only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: no new failures vs. baseline. Pre-existing MuPDF WASM failures (documented in project memory) may remain — confirm the count matches baseline and that `pipeline-status.test.js` passes.

- [ ] **Step 2: Confirm the branch diff is scoped**

Run: `git diff main --stat`
Expected: only `migrations/005_*`, `services/pipeline-service.js`, `routes/pipeline.js`, `routes/forms.js`, `server.js`, the two workflow files, the new test, and the spec/plan docs.

- [ ] **Step 3: Record rollout steps**

The migration must be applied to Cloud SQL before/at deploy. Rollout order (operator runs these — do NOT run them from the plan):
1. Apply `migrations/005_create_pipeline_status.sql` to prod, staging, dev databases (additive, safe).
2. Merge → CI deploys node-server with the new flags.
3. Verify with a real multi-plaintiff generation on `docs.liptonlegal.com` — SSE should reach 100% with no "Job status not found".

No commit needed for this task (verification only). If any test regressed, STOP and return to the relevant task.

# Pipeline Status: Postgres-Backed Store

**Date:** 2026-07-19
**Branch:** `fix/pipeline-status-postgres`
**Status:** Design

## Problem

`docs.liptonlegal.com` (Cloud Run service `node-server`) intermittently fails document
generation with **"Job status not found. The job may have expired or does not exist."**,
frozen at 40%.

### Root cause (confirmed)

Pipeline job status lives in a per-process in-memory `Map`
(`services/pipeline-service.js:40`), but `node-server` runs `--max-instances=10` with
**session affinity off** — the only SSE-generating service in the fleet without it
(`exhibit-collector` and `complaint-creator` both set `--session-affinity`;
see `docs/gcp-current-state.md`).

Failure sequence:
1. `POST /api/form-entries` lands on **instance A**. It responds immediately, then fires
   `callNormalizationPipeline` fire-and-forget (`routes/forms.js:278`), which writes
   `status: processing, progress: 40` into **A's** Map and runs the ~minutes-long pipeline
   in A's background event loop.
2. ~500ms later the browser opens `GET /api/jobs/:caseId/stream` — a **new request**.
   With affinity off, Cloud Run may route it to **instance B**, whose Map has never seen
   the job → `getPipelineStatus` returns `null` → `routes/pipeline.js:150` emits the
   "Job status not found" error. 40% is the first-and-only status written, so it dies there.

A second, rarer failure: because the pipeline runs *after* the HTTP response returns,
Cloud Run can throttle the instance's CPU mid-job (CPU is only guaranteed during a request),
stranding the job even on a single instance.

## Goal

Any instance can serve the SSE stream for any job, and the background pipeline keeps CPU
until it finishes. Durable fix for the reported failure plus the CPU-eviction tail.

## Non-Goals

- Moving the pipeline to a Cloud Run Job (rejected: the codebase deliberately chose
  fire-and-forget background execution — see the ponytail comment at `routes/pipeline.js:604`).
- Changing the SSE protocol, the frontend, or the Python pipeline.
- Reworking the `temp-<formId>` → real-case-id lookup in `routes/pipeline.js`.

## Approach

Replace the in-memory `Map` with a Postgres table. All status access already funnels through
four helper functions in `services/pipeline-service.js`; only those change. Consumers
(SSE stream, form submit, regen, progress poller) keep working once updated to `await`.

Add `--no-cpu-throttling` to the `node-server` deploys so the background pipeline is not
throttled after the response returns. `min-instances=1` (already set in prod) keeps one
worker warm.

Keep the `--session-affinity` edits already staged on this branch: harmless, consistent
with sibling services, and they reduce DB reads when affinity happens to hold.

## Components

### 1. Migration `migrations/005_create_pipeline_status.sql`

```sql
CREATE TABLE IF NOT EXISTS pipeline_status (
  case_id     TEXT PRIMARY KEY,       -- caseId / trackingCaseId / temp-<formId>, all TEXT today
  status      JSONB NOT NULL,         -- the full status object, stored verbatim
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pipeline_status_expires ON pipeline_status(expires_at);
```

Rationale: the status object shape (`documentProgress`, `webhookSummary`, `result`, phase
fields) evolves; a single JSONB blob avoids schema churn. `case_id` is exactly the key the
SSE and status endpoints already look up by. TTL stays 15 minutes, enforced via `expires_at`.

Include a commented rollback block (matching `001_add_pdf_generation_jobs.sql` convention).

### 2. Rewrite the four helpers in `services/pipeline-service.js`

The `pipelineStatusCache` Map is removed as the source of truth and retained only as an
instance-local **fallback** (see Error Handling).

**DB pool injection.** `pipeline-service.js` is a singleton module export
(`module.exports = new PipelineService()`) and today has **no DB access** — it only requires
axios/dropbox/email. It needs the `pool`. Add a `setPool(pool)` method on `PipelineService`
(stores `this.pool`) and call it once from `server.js` right after the pool is created,
mirroring the existing `pipelineRoutes.initializeRouter({ pool, ... })` injection pattern
already used for `routes/pipeline.js`. Helpers use `this.pool.query(...)`. If `this.pool` is
null (not yet injected — e.g. a unit test that skips wiring), the helpers treat it as a DB
error and use the in-memory fallback, so nothing throws.

- **`setPipelineStatus(caseId, statusData)` → `async`**
  `INSERT INTO pipeline_status (case_id, status, expires_at)
   VALUES ($1, $2, NOW() + interval '15 minutes')
   ON CONFLICT (case_id) DO UPDATE SET status = $2, expires_at = NOW() + interval '15 minutes'`.
  Store `statusData` as JSONB (drop the old `expiresAt` field from the object — the column
  owns expiry now).

- **`getPipelineStatus(caseId)` → `async`**
  `SELECT status FROM pipeline_status WHERE case_id = $1 AND expires_at > NOW()`.
  Return `rows[0]?.status ?? null`.

- **`cleanupExpiredCache()` → `async`**
  `DELETE FROM pipeline_status WHERE expires_at < NOW()`. Idempotent; every instance may run
  it without coordination.
  `// ponytail: every instance runs the sweep; idempotent DELETE, no lock needed`

- **`startCacheCleanup()`** — keep the 5-minute `setInterval`, now calling the async cleanup
  (fire-and-forget with a `.catch` log).

### 3. Update callers to `await`

`get/setPipelineStatus` become async. Every call site must `await`:
- `services/pipeline-service.js` — internal calls in `callNormalizationPipeline`,
  `_startProgressPolling`, skip/success/failure branches.
- `routes/pipeline.js` — SSE `initialStatus` check, `sendProgress`, `sendProgressIfChanged`,
  and the `GET /api/pipeline-status/:caseId` endpoint.
- `routes/forms.js` — any direct status reads/writes around submit.

The SSE `setInterval(sendProgress, ...)` callback becomes async and gets a **re-entrancy
guard** so a slow DB read cannot overlap ticks:
`if (fetchingStatus) return; fetchingStatus = true; try { ... } finally { fetchingStatus = false; }`.

### 4. Deploy flags

Add `--no-cpu-throttling` to all three `node-server` deploy blocks:
`.github/workflows/ci-cd-main.yml` (prod + staging) and `.github/workflows/deploy-dev.yml`.
The `--session-affinity` edits are already staged on this branch — keep them.

## Error Handling

Fail soft with an instance-local in-memory fallback. The pipeline must never crash because
the status DB blipped.

- All four helpers wrap DB calls in try/catch.
- `setPipelineStatus`: on DB error → log, write the object into the fallback `Map`
  (with a computed `expiresAt = Date.now() + 15min`), never throw.
- `getPipelineStatus`: `SELECT` first; on DB error → log, read from the fallback `Map`
  (honoring its `expiresAt`). Return `null` only if neither source has it.
- The fallback `Map` is best-effort and instance-local — a safety net for DB blips, not a
  second source of truth.
  `// ponytail: in-memory fallback is instance-local; DB is source of truth, covers DB blips only`
- This also gives a clean rollback: if the DB path misbehaves in prod, same-instance reads
  still work exactly like today's behavior.

## Testing

Against a real Postgres (repo already tests with a DB):

1. **Round-trip** — `set` then `get` returns the stored object.
2. **Update** — second `set` for the same `case_id` overwrites (ON CONFLICT), not duplicates.
3. **Expiry** — a row past `expires_at` reads as `null`; `cleanupExpiredCache` deletes it.
4. **Cross-instance (the regression test for this bug)** — write via one `PipelineService`
   instance, read via a *separate* `new PipelineService()`; must return the status. This is
   the test that would have caught the screenshot failure.
5. **Fail-soft** — inject a failing pool; assert `set` writes to the fallback Map, `get`
   reads it back, and nothing throws.

No framework changes; follow the existing test setup for DB-backed suites.

## Files Touched

- `migrations/005_create_pipeline_status.sql` (new)
- `services/pipeline-service.js` (4 helpers + internal await call sites + fallback + `setPool`)
- `server.js` (call `pipelineService.setPool(pool)` after the pool is created)
- `routes/pipeline.js` (await SSE/status reads, re-entrancy guard)
- `routes/forms.js` (await direct status reads/writes, if any)
- `.github/workflows/ci-cd-main.yml`, `.github/workflows/deploy-dev.yml` (`--no-cpu-throttling`; affinity already staged)
- test file for the four helpers (new)

## Rollout

1. Run migration `005` on prod DB (and staging/dev) — additive, safe.
2. Deploy code + flags. On first deploy the new table is empty; in-flight jobs from the old
   Map are lost (acceptable — they were already single-instance fragile).
3. Verify with a real multi-plaintiff generation on `docs.liptonlegal.com`.

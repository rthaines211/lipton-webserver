# Plan: Async Discovery Regeneration

**Date:** 2026-07-12
**Problem:** Regeneration runs the full normalization pipeline *synchronously inside the HTTP request*. Jobs >5 min hit either the Cloud Run 300s proxy cap (`upstream request timeout` → JSON parse error) or the axios `PIPELINE_TIMEOUT` of 300000ms (`timeout of 300000ms exceeded`). Both screenshots are the same root cause.

## Root cause
`routes/pipeline.js:425` (`POST /regenerate-documents/:caseId`) awaits `pipelineService.callNormalizationPipeline()` inline before responding. That call does a blocking `axios.post` to the pipeline (`services/pipeline-service.js:395`, `timeout: this.config.timeout`). The request can't outlive whichever cap fires first — Cloud Run 300s (`deployed-config.yaml:77`) or axios 300000ms (`pipeline-service.js:50`).

Meanwhile SSE progress tracking already exists (`startRegenerationTracking` in `js/document-regeneration.js`, `_startProgressPolling` in `pipeline-service.js:286`). So we already have a live status channel — the blocking request is redundant with it.

## The fix
Stop blocking. Return `202 + jobId` immediately, run the pipeline in the background, report completion over the SSE channel that's already wired.

### Steps
1. **`routes/pipeline.js` — regenerate endpoint:** after validation + tracking setup, kick off `callNormalizationPipeline(...)` **without awaiting** (fire-and-forget, store the promise). Respond `202` with `{ success: true, jobId }` right away. Move the post-completion DB tracking (regeneration_count, history — `pipeline.js:618-650`) into a `.then()`/`.catch()` on the un-awaited promise.
2. **Pipeline failure path:** on the background promise's `.catch()`, push a failure event to the SSE stream for that `caseId` so the frontend modal shows "Generation failed" instead of hanging. Reuse whatever the existing progress emitter uses (check `_startProgressPolling` / SSE emit in `pipeline-service.js`).
3. **Frontend (`js/document-regeneration.js`):** `startRegenerationTracking(result)` already runs on success — confirm it drives the modal to completion purely from SSE now that the POST returns immediately. Remove any assumption that the POST response carries final results.
4. **Delete the redundancy:** once async, the blocking `await pipelinePromise` in the request path is gone. SSE becomes the single source of truth for status. No more racing the proxy cap.

### What NOT to do
- **Don't raise the timeouts** (Fix #2). Async removes the request-scoped timeout entirely — there's nothing left to raise. `PIPELINE_TIMEOUT` still bounds the *background* axios call, which is fine (it's no longer racing a proxy).
- **Don't add a job queue / worker table.** Fire-and-forget on the existing SSE channel is enough for single-tenant regeneration. Add a queue only if concurrent regenerations or crash-recovery become real requirements — `// ponytail: in-process background, add durable queue if regen must survive instance restarts`.

## Ceiling / known limitation
Background work runs in-process on the Cloud Run instance. If the instance is recycled mid-pipeline, that regeneration is lost (user re-triggers). Acceptable for now given `min-instances=0..5` and infrequent regeneration. Durable job persistence (like `exhibit_jobs`) is the upgrade path if this becomes load-bearing.

## Verification
- Trigger a regeneration known to take >5 min → modal reaches 100% via SSE, no `upstream request timeout`, no `timeout of 300000ms exceeded`.
- Force a pipeline failure → modal shows "Generation failed" from the SSE error event, not a hung spinner.
- POST `/api/regenerate-documents/:caseId` returns 202 in <2s regardless of pipeline duration.

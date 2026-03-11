# Exhibit Collector: Dropbox Integration + Async Processing

**Date:** 2026-03-11
**Status:** Approved (design)

## Problem

The exhibit collector currently requires browser-based file uploads. At 16 documents it takes ~1 minute. Lipton Legal has exhibit sets of 200-1000 files, typically already organized in Dropbox. Browser upload at that scale is a dealbreaker — both the upload time and the manual drag-and-drop workflow break down.

## Solution Overview

Two new capabilities layered onto the existing exhibit collector:

1. **Dropbox Import Mode** — Server-side file ingestion via an in-app Dropbox file browser, replacing browser uploads
2. **Async Processing Mode** — Background job processing with notification for large sets

The existing processing pipeline (duplicate detection, PDF assembly, Bates stamping) stays intact. We're adding a new intake layer and a new execution mode.

```
Current flow:
  Browser Upload → Server Memory → Process → SSE → Download

New flows:
  Dropbox Browser UI → Server Temp Disk → Process → SSE → Download    (real-time, <50 files)
  Dropbox Browser UI → Server Temp Disk → Process → Notify → Dropbox   (async, 50+ files)
```

## Constraints

- Exhibits cap at A-Z (26 max)
- Each exhibit can contain 1 to many files
- Output is always a single monolithic PDF
- Duplicate detection runs within each exhibit only (not cross-exhibit), only when an exhibit has multiple files
- Single firm-wide Dropbox token (no per-user OAuth)
- Files downloaded to temp disk, not memory (4 GiB RAM limit)

---

## Section 1: Dropbox File Browser UI

### User Experience

A built-in file explorer panel on the exhibit collector form:

1. Click "Import from Dropbox" on the exhibit collector form
2. File browser panel opens showing the root of Lipton's Dropbox
3. Navigate folders by clicking (lazy-loads contents on expand)
4. Checkbox-select files and folders
5. Selected items appear in an **exhibit assignment panel** on the right
6. User assigns selected files into exhibit letter slots (A-Z)
7. Review, reorder, remove as needed
8. Hit "Generate"

### Browser Features

- Folder navigation: click to enter, breadcrumb to go back
- Multi-select via checkboxes
- File type icons (PDF, image, etc.)
- File size + date metadata shown
- File type filtering: only show supported types (PDF, PNG, JPG, JPEG, TIFF, TIF, HEIC) — unsupported files (`.docx`, `.xlsx`, etc.) grayed out with tooltip explaining why
- Hidden/system files (`.DS_Store`, `Thumbs.db`) automatically excluded
- Manual "Refresh" button to re-fetch current folder contents (handles files added to Dropbox while browser is open)

### Exhibit Assignment Panel

The right side of the UI shows exhibit letter slots (A-Z). Users drag files from the Dropbox browser into exhibit slots:

- **26 exhibit letter slots** displayed (A through Z)
- Drag individual files into a slot → single-file exhibit
- Drag multiple files into the same slot → multi-file exhibit (dup detection active for that letter)
- Drag an entire folder into a slot → all files in that folder assigned to that exhibit (only direct children — nested subfolders ignored to avoid ambiguity)
- Reorder files within an exhibit slot
- Remove files from a slot
- Clear an entire exhibit slot
- Visual indicator when an exhibit has multiple files (shows file count, badge indicating dup detection will run)

This approach lets the user handle any scenario:
- 200 individual files → drag each to its own letter (A-Z, only 26 max)
- 10 folders of 20 files each → drag each folder into a letter
- Mixed: some singles, some groups

### API Endpoints for Browser

- `GET /api/dropbox/list?path=/` — List folder contents (name, type, size, modified date, file extension)
- `GET /api/dropbox/list?path=/Cases/Smith` — List subfolder contents
- `GET /api/dropbox/list?path=/Cases/Smith&refresh=true` — Bypass cache, force fresh fetch
- Responses cached briefly (30s) to avoid hammering Dropbox API during navigation; "Refresh" button in UI sends `refresh=true`
- Browsing calls and download calls share a rate limit budget (see Section 3)

### Authentication

All new endpoints require the same session-based password auth used by the exhibit form pages. Specifically:
- `/api/dropbox/*` — requires authenticated session (exposes firm's Dropbox folder structure)
- `/api/jobs/*` — requires authenticated session
- These follow the same auth pattern as existing exhibit form pages (not the token auth used by `/api/form-entries`)

### Relationship to Existing Dropbox Service

The existing `dropbox-service.js` handles uploads + shared links using the same Dropbox SDK and OAuth credentials. The new `services/dropbox-browser.js` will:

- **Reuse** the Dropbox client initialization and config from `dropbox-service.js` (extract shared `getDropboxClient()` factory)
- **Add** folder listing (`filesListFolder`) and file download (`filesDownload`) capabilities
- **Not duplicate** upload logic — output PDF upload to Dropbox will use the existing `dropbox-service.uploadFile()`

The existing service's OAuth refresh token flow already handles automatic token refresh. The Dropbox API scopes needed for the new operations:
- `files.metadata.read` — folder listing (verify this scope exists on the current app registration)
- `files.content.read` — file download (verify this scope exists)
- `files.content.write` — already have this for uploads

---

## Section 2: Async Processing Mode

### Mode Selection

| File Count | Default Mode | User Can Override? |
|------------|-------------|-------------------|
| < 50 files | Real-time (SSE, wait for result) | Can switch to async |
| 50+ files | Async (background, notification) | Can switch to real-time |

Threshold lowered from 100 to 50 to stay safely within Cloud Run service timeout (see timeout discussion below).

### Real-Time Mode

Same as current implementation. SSE progress stream, user waits for download.

**Cloud Run service timeout:** Bump from 5 minutes to 15 minutes to accommodate Dropbox download + processing for up to ~50 files. This is a single config change in the deploy workflow. The 15-minute ceiling provides headroom for exhibits with many files per letter (dup detection adds time).

### Async Mode

1. User hits Generate → confirmation message: "Processing N files. We'll deliver the PDF to your Dropbox folder and send an email when it's ready."
2. Job state persisted to **PostgreSQL** (`legal_forms_db`) — survives instance restarts
3. Processing runs on a **Cloud Run Job** (no request timeout limit, can run up to 24 hours)
4. On completion:
   - PDF uploaded to the source Dropbox folder as `{CaseName}_Exhibits.pdf` (via existing `dropbox-service.uploadFile()`)
   - PDF uploaded to GCS with signed URL (72-hour expiry for async jobs, vs 1-hour for real-time)
   - Email sent via SendGrid with download link
5. User can check status anytime via a jobs dashboard

### Database for Job Persistence

Uses the existing PostgreSQL database (`legal_forms_db`) already connected via the main application. The exhibit collector Cloud Run service already has Cloud SQL connection configured in the deploy workflow.

**New table: `exhibit_jobs`**

```sql
CREATE TABLE exhibit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, downloading, processing, complete, failed
  progress INTEGER DEFAULT 0,                       -- 0-100
  progress_message TEXT,                            -- current phase description
  case_name VARCHAR(255) NOT NULL,
  total_files INTEGER NOT NULL,
  exhibit_mapping JSONB NOT NULL,                   -- {A: [{path, name}], B: [{path, name}], ...}
  dropbox_source_path VARCHAR(500),                 -- source folder in Dropbox
  dropbox_output_path VARCHAR(500),                 -- where output PDF was uploaded
  gcs_output_url TEXT,                              -- signed URL for download
  email VARCHAR(255),                               -- notification email
  error_message TEXT,                               -- error details if failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**Progress updates:** The Cloud Run Job writes progress to the database (UPDATE `exhibit_jobs` SET progress = X, progress_message = Y, updated_at = NOW()). The jobs dashboard polls `GET /api/jobs/{id}` which reads from the database. Polling interval: 5 seconds.

### Cloud Run Job Dispatch

The web service dispatches async jobs via the **Google Cloud Run Admin API** (`@google-cloud/run`):

```
POST /api/exhibits/generate-from-dropbox
  → Insert row into exhibit_jobs (status: 'pending')
  → Call Cloud Run Admin API: jobs.run() with:
      - Job name: 'exhibit-processor-job'
      - Override env vars: JOB_ID={uuid}
      - Same container image as the web service
  → Return job ID + confirmation to client
```

The Cloud Run Job container starts, reads `JOB_ID` from env, loads the job row from PostgreSQL (gets exhibit_mapping, case_name, etc.), runs the pipeline, and updates the row on completion/failure.

**Job entrypoint:** A new file `job-entrypoint.js` serves as the Cloud Run Job's CMD. On startup it checks for `JOB_ID` env var, loads the job config from PostgreSQL, runs the exhibit processing pipeline, and exits. The Cloud Run Job definition overrides the container CMD to `node job-entrypoint.js` instead of the default `node server.js`. This keeps job logic cleanly separated from the web server.

**IAM:** The web service's Cloud Run SA needs `roles/run.developer` to dispatch jobs.

### Email Notification (SendGrid)

SendGrid is already configured in the environment (`SENDGRID_API_KEY` secret in Cloud Run). New dependency: `@sendgrid/mail` npm package.

- **Sender:** Configure a verified sender domain/address (e.g., `exhibits@liptonlegal.com`)
- **Template:** Simple transactional email: "Your exhibit package for {CaseName} is ready. [Download PDF] — link expires in 72 hours."
- **Error handling:** Email failure does not fail the job — PDF is still in Dropbox and GCS. Log the failure, update job row with a note.

### Why Cloud Run Jobs

- Current Cloud Run service timeout will be 15 min (bumped from 5) — still not enough for 500+ file sets
- Cloud Run Jobs can run up to 24 hours
- Same container image, invoked differently
- Scales independently from the web server

### Jobs Dashboard

- List of recent jobs with status: pending / downloading / processing / complete / failed
- Progress percentage + phase label for in-progress jobs
- Download link for completed jobs (GCS signed URL, 72-hour expiry)
- "Open in Dropbox" link for completed jobs
- Accessible from the exhibit collector page as a tab/panel
- Polls database via `GET /api/jobs` every 5 seconds for active jobs, stops polling when all jobs are complete/failed

### Cloud Run Concurrency

The Dropbox browser adds `GET /api/dropbox/list` calls while the user browses. These are lightweight, stateless API proxies. The current `concurrency=2` should be sufficient since:
- Dropbox browsing happens BEFORE processing starts (not during SSE stream)
- Jobs dashboard polling is a simple DB read
- If issues arise, bump to `concurrency=4` (the Dropbox list + dashboard endpoints are non-CPU-intensive)

---

## Section 3: Processing Optimizations for Scale

### Temp Disk Storage

- Files downloaded from Dropbox to `/tmp/exhibits/{sessionId}/`
- Streamed from disk during PDF assembly (not held in RAM)
- Cleanup strategy:
  - **Happy path:** Temp directory deleted after job completes
  - **Failure:** Temp directory deleted in catch/finally block
  - **Crash/OOM:** Cloud Run's ephemeral filesystem is wiped on container recycle — no leaked files
  - No periodic sweeper needed; Cloud Run containers are ephemeral

### Increased Parallelism

- Exhibit-level concurrency bumped from 4 to 6-8 for 26-exhibit sets on 4 vCPU
- Cloud Run Jobs can use higher CPU (8 vCPU) for async processing

### Streaming PDF Merge

- For large sets: write each sub-doc to disk, merge sequentially from disk
- Reduces peak memory from "all sub-docs in RAM" to "one sub-doc at a time"

### Dup Detection Guardrails

Duplicate detection only runs within exhibits that have multiple files. Guardrails for large multi-file exhibits:

- < 50 files per exhibit: dup detection runs automatically
- 50-100 files per exhibit: prompt user to confirm (adds significant time)
- 100+ files per exhibit: warn user with time estimate, default off

**Async mode and duplicates:** In async mode, duplicate detection is **skipped entirely**. The user is not present to interactively resolve duplicates, and the fire-and-forget workflow prioritizes completion over dedup. If users want duplicate detection on large sets, they should use real-time mode (override the async default) and stay present for resolution. Alternatively, a future enhancement could auto-resolve by keeping the first file in each duplicate pair.

### Dropbox API Rate Limiting

Dropbox Business accounts allow 720 calls/minute. Budget allocation:

- **Browsing:** Uncapped (each folder navigation = 1 call, user-paced, naturally slow)
- **File downloads:** 15-20 concurrent, with a token bucket rate limiter capping at 600 calls/min (leaves headroom for browsing)
- **Backoff strategy:** Exponential backoff on 429 responses (start 1s, max 30s, 3 retries)
- Browsing and download calls share the same rate limit counter

### Duplicate Preview for Dropbox Imports

The current duplicate preview modal uses client-side `File` objects (from browser uploads) to render image thumbnails and PDF first-page previews. With Dropbox imports, files are on the server's temp disk.

**Solution:** Server-generated thumbnails sent to the client:

- When duplicates are detected, the server generates thumbnail previews for each file in the duplicate pair
- Images: resize to 400px width via Sharp (already a dependency), return as base64 data URLs in the SSE `duplicates` event
- PDFs: render first page to PNG server-side using `pdf.js` with the `canvas` npm package (pdf-lib cannot render pages — it's a manipulation library, not a renderer), return as base64 data URLs
- The duplicate modal renders these server-provided thumbnails instead of client-side `URL.createObjectURL()`
- Adds a `thumbnails` field to the duplicate pair data: `{ fileA: { name, thumbnail }, fileB: { name, thumbnail } }`

---

## Section 4: New Components

### Backend — New Files

| File | Purpose |
|------|---------|
| `services/dropbox-browser.js` | Dropbox API wrapper for browsing + download. Reuses client from `dropbox-service.js`. Adds `listFolder()`, `downloadFile()`, `downloadFiles()` |
| `services/async-job-manager.js` | Job CRUD against `exhibit_jobs` table, Cloud Run Job dispatch via Admin API, progress updates |
| `routes/dropbox.js` | API endpoints for folder browsing (GET /api/dropbox/list) |
| `routes/jobs.js` | API endpoints for jobs dashboard (GET /api/jobs, GET /api/jobs/:id) |
| `job-entrypoint.js` | Cloud Run Job entrypoint: reads JOB_ID from env, loads config from DB, runs pipeline, updates DB on completion/failure |

### Frontend — New Files

| File | Purpose |
|------|---------|
| `forms/exhibits/js/dropbox-browser.js` | File explorer UI: folder navigation, file selection, drag into exhibit slots |
| `forms/exhibits/js/jobs-dashboard.js` | Jobs list, status polling, download links |

### Frontend — Modified Files

| File | Changes |
|------|---------|
| `forms/exhibits/index.html` | Dropbox browser panel, exhibit assignment panel, async mode toggle, jobs dashboard tab |
| `forms/exhibits/js/form-submission.js` | New flow for Dropbox import (skip upload, different endpoint), handle server-provided duplicate thumbnails |
| `forms/exhibits/js/duplicate-ui.js` | Support server-provided base64 thumbnails as alternative to client-side File object previews |
| `forms/exhibits/styles.css` | Dropbox browser, exhibit assignment panel, jobs dashboard styling |

### Backend — Modified Files

| File | Changes |
|------|---------|
| `services/exhibit-processor.js` | Read files from disk instead of memory, configurable parallelism, generate thumbnails for duplicate pairs |
| `services/duplicate-detector.js` | Return file paths with duplicate results (for thumbnail generation) |
| `routes/exhibits.js` | Accept Dropbox source as alternative to upload, async job creation endpoint |
| `dropbox-service.js` | Refactor: extract shared `getDropboxClient()` lazy-init factory for reuse by `dropbox-browser.js`. Current module-level singleton (`let dbx = null` with require-time init) becomes a lazy-init pattern. All existing consumers (`require('../dropbox-service')`) continue working — the factory caches the client on first call. |

### Infrastructure

| Component | Details |
|-----------|---------|
| Cloud Run Job | `exhibit-processor-job`: same container image, 8 vCPU / 8 GiB, 60-min timeout |
| Cloud Run Service | Bump request timeout from 5 min to 15 min |
| Database migration | New `exhibit_jobs` table in `legal_forms_db` |
| IAM | Web service SA needs `roles/run.developer` for job dispatch |
| Dropbox App | Verify scopes include `files.metadata.read` and `files.content.read` |
| NPM | Add `@sendgrid/mail`, `@google-cloud/run` |
| Deploy workflow | Updated for Cloud Run Job creation + deployment; update path triggers for new files |
| Express config | Bump JSON body size limit for `/api/exhibits/generate-from-dropbox` to 1MB (exhibit_mapping with 1000 paths exceeds default 100KB) |
| DB index | Partial index on `exhibit_jobs(status)` for active jobs: `WHERE status NOT IN ('complete', 'failed')` |

### Unchanged

- `services/pdf-page-builder.js` — works as-is
- `utils/concurrency.js` — works as-is

---

## Section 5: Performance Estimates

### 1000 Files Across Varying Exhibit Counts (dup detection within multi-file exhibits)

| Exhibits | Files/Exhibit | Dup Detection | Dropbox DL | PDF Assembly | Bates Stamp | **Total** |
|----------|--------------|---------------|------------|-------------|-------------|-----------|
| 5 | ~200 | ~8-12 min | ~1-2 min | ~6-10 min | ~3-4 min | **~18-28 min** |
| 10 | ~100 | ~4-7 min | ~1-2 min | ~6-10 min | ~3-4 min | **~14-23 min** |
| 15 | ~67 | ~2.5-4 min | ~1-2 min | ~6-10 min | ~3-4 min | **~12-20 min** |
| 20 | ~50 | ~1.5-3 min | ~1-2 min | ~6-10 min | ~3-4 min | **~11-19 min** |
| 26 | ~38 | ~1-2 min | ~1-2 min | ~6-10 min | ~3-4 min | **~11-18 min** |

### Common Case: 26 Exhibits, 5-20 Files Each (~200 files)

~2-7 minutes — sit-and-wait viable with real-time mode (within 15-min timeout).

### Small Sets: 10-20 Exhibits, 1-3 Files Each (~30 files)

~30-60 seconds — same experience as current tool.

---

## Data Flow

```
Dropbox File Browser UI
    │
    ├─ User browses Dropbox folders (GET /api/dropbox/list)
    ├─ Selects files, drags into exhibit letter slots (A-Z)
    ├─ Reviews assignment
    │
    ▼
POST /api/exhibits/generate-from-dropbox
    │
    ├─ < 50 files: real-time mode
    │   ├─ Download files from Dropbox → temp disk (15-20 concurrent)
    │   ├─ ExhibitProcessor.process() (unchanged pipeline)
    │   │   └─ Dup detection within multi-file exhibits only
    │   │   └─ Server generates thumbnails for duplicate preview
    │   ├─ SSE progress stream
    │   ├─ Upload PDF to GCS (1-hour signed URL) + Dropbox output folder
    │   └─ Return signed URL for download
    │
    └─ 50+ files: async mode
        ├─ Insert job row into exhibit_jobs (PostgreSQL)
        ├─ Dispatch Cloud Run Job via Admin API (env: JOB_ID)
        ├─ Return job ID + confirmation message
        │
        Cloud Run Job:
        ├─ Read job config from exhibit_jobs table
        ├─ Download files from Dropbox → temp disk
        ├─ ExhibitProcessor.process()
        ├─ Update progress in exhibit_jobs periodically
        ├─ Upload PDF to GCS (72-hour signed URL) + Dropbox output folder
        ├─ Send email via SendGrid
        └─ Update exhibit_jobs: status=complete, output URLs
        │
        Jobs Dashboard (polling GET /api/jobs/:id every 5s):
        └─ Shows progress, download link on completion
```

# Exhibit Duplicate Review Page — Design Spec

**Date:** 2026-03-18
**Branch:** `feat/exhibit-ui-improvements`
**Status:** Approved

## Problem

The current duplicate resolution flow uses a modal overlay that appears mid-processing. With 200–1000 files potentially generating dozens of duplicate groups, the modal becomes overwhelming and difficult to navigate. Users need a dedicated, full-page experience to review and resolve duplicates at scale.

## Solution Overview

Replace the modal-based duplicate resolution with a **dedicated review page** (`review.html`) that appears as a **pre-processing step**. Duplicate detection runs as a separate first pass before any exhibit PDF generation. If duplicates are found, the user is redirected to the review page. If none are found, processing proceeds directly with a brief message.

## User Flow

```
Upload/Assign Files → Click Generate → Scan for Duplicates
  → No duplicates found → Show message → Proceed to processing
  → Duplicates found → Redirect to review.html?jobId=xxx
    → User resolves duplicates → Click Continue
    → Confirmation summary dialog → Confirm
    → Redirect to index.html?jobId=xxx&resume=true → Processing begins
```

## Page Layout: `review.html`

### Header
- **Title:** "Duplicate Review"
- **Subtitle:** Case name, total files scanned, total duplicate groups found, number of exhibits affected
- **Actions (top-right):**
  - "Remove All Duplicates" button — bulk action that auto-resolves every group (keeps default file, removes the rest)
  - "Continue to Processing →" button

### Tab Bar
- One tab per exhibit that has duplicates (exhibits with zero duplicates are **not shown**)
- Each tab displays the exhibit letter and a badge with the group count (e.g., `A (3)`)
- Active tab has a green underline indicator
- Tabs scroll horizontally if many exhibits have duplicates

### Tab Content
- **Section header:** "Exhibit A — 3 duplicate groups · 9 files"
- **Group cards** — one card per duplicate group, stacked vertically:
  - **Group header:** "Group 1 · 3 files" with a "Keep All" button on the right
  - **File cards** in a horizontal flex-wrap layout:
    - Larger thumbnail (~170px wide, ~110px tall)
    - Filename (truncated with ellipsis)
    - File metadata: size + page count (PDFs) or dimensions (images)
    - Match type badge: "Exact Match" (blue) or "97.2% Visual" (orange with confidence %)
    - Keep/Remove toggle button
  - **Keep state styling:**
    - Keep: green border, full opacity, green "KEEP" button
    - Remove: red border, 50% opacity, red "REMOVE" button
  - **Last-kept-file guard:** at least one file in each group must remain marked as "keep" (existing behavior preserved)

### Sticky Footer
- **Running totals:** "Keeping X files · Removing Y files · across Z exhibits"
- **"Continue to Processing →"** button (duplicated from header for convenience)

### Confirmation Dialog
Appears as a centered overlay when the user clicks "Continue to Processing":
- **Stats breakdown:** total files scanned, files to keep, files to remove, exhibits affected
- **Warning:** "Removed files will not be included in the generated exhibits. This cannot be undone — you would need to re-upload to include them again."
- **Buttons:** "Go Back" (secondary) and "Process X Files →" (primary)

## Backend Changes

### Pipeline Split
The current pipeline runs duplicate detection inline within `ExhibitProcessor.process()`. This refactor extracts scanning into a separate phase:

**Current flow in `ExhibitProcessor.process()`:**
1. Download files from Dropbox (or receive uploads)
2. Run duplicate detection per exhibit
3. If duplicates found, pause and wait for resolution
4. Generate PDFs

**New flow:**
1. `POST /api/exhibits/generate-from-dropbox` (or upload equivalent) creates the job and downloads/receives files as before
2. Instead of calling the full `process()`, call a new `ExhibitProcessor.scanForDuplicates(jobId)` method that runs **only** the duplicate detection step across all exhibits
3. If duplicates found → set status to `awaiting_resolution`, store groups on job, send `scan-complete` SSE with `{ duplicates: true }` (groups fetched separately via GET endpoint)
4. If no duplicates → proceed directly to `ExhibitProcessor.process(jobId)` for PDF generation
5. On `POST /resolve` → existing behavior: filters exhibits, sets status to `processing`, calls `ExhibitProcessor.resume()`

**Implementation detail:** Extract the duplicate detection loop from `process()` into `scanForDuplicates()`. The `process()` / `resume()` methods continue to handle PDF generation. This is a method extraction refactor, not a rewrite.

1. **Scan phase:** On `POST /api/exhibits/generate-from-dropbox` (or equivalent upload endpoint), run **only** duplicate detection as a first pass
2. **SSE events for scan phase:**
   - `scan-start` — scan has begun
   - `scan-progress` — progress updates (e.g., "Scanning exhibit A: 45/120 files...")
   - `scan-complete` — scan finished, payload contains either `{ duplicates: false }` or `{ duplicates: true, groupCounts: { A: 3, C: 7, ... }, totalGroups: 23, totalFiles: 847 }`. Full group data (files, edges, metadata, thumbnails) is **not** included in the SSE event — the review page fetches it via the `GET /duplicates` endpoint with per-exhibit lazy loading.
3. **Review pending state:** Job record tracks `status: 'awaiting_resolution'` (matches existing codebase convention) when duplicates are found. Duplicate group data + thumbnails + metadata are stored on the job object so the review page can fetch them via GET endpoint.
4. **Resolution:** Existing `POST /api/exhibits/jobs/{jobId}/resolve` endpoint stays the same — same payload format `{ groupId, keep[], remove[] }`. **Important:** The current resolve endpoint sets status to `processing` and calls `ExhibitProcessor.resume()` inline, meaning processing starts immediately on resolve. The review page should NOT redirect to index.html expecting to "trigger" processing — instead, after posting resolve, it redirects to `index.html?jobId=xxx&resume=true` where the main page reconnects to the **already-running** SSE stream to show progress.
5. **Resume on main page:** `index.html` with `?resume=true&jobId=xxx` reconnects to `GET /api/exhibits/jobs/{jobId}/stream` to pick up the in-flight processing progress. No separate resume endpoint needed — resolve already kicks off processing.

### No Changes Required
- Duplicate detection logic (two-layer: exact hash + visual dHash)
- Union-Find group building
- Resolution payload format
- Thumbnail generation (MuPDF for PDFs, Sharp for images)
- "Keep All" per-group logic
- Last-kept-file guard

## Frontend Changes

### New File: `forms/exhibits/review.html`
- Standalone page that loads duplicate data for a job via `GET /api/exhibits/jobs/{jobId}/duplicates` (new endpoint)
- Renders the tabbed UI with enhanced group cards
- Posts resolution via existing `/resolve` endpoint
- Redirects to `index.html?jobId=xxx&resume=true` on confirm

### New File: `forms/exhibits/js/review-ui.js`
- Tab management (render tabs, switch active tab, badge counts)
- Group card rendering (enhanced cards with metadata and match type badges)
- Keep/Remove toggle logic (with last-kept-file guard)
- "Remove All Duplicates" bulk action
- Running totals calculation (sticky footer)
- Confirmation dialog show/hide and confirm action

### Modified: `forms/exhibits/js/form-submission.js`
- Handle new SSE events (`scan-start`, `scan-progress`, `scan-complete`)
- On `scan-complete` with duplicates: redirect to `review.html?jobId=xxx`
- On `scan-complete` without duplicates: show "No duplicates detected" message, proceed to processing
- Handle `?resume=true` URL param: reconnect to SSE stream for the processing phase

### Modified: `forms/exhibits/index.html`
- Remove the `#duplicate-modal` markup (no longer needed)
- Add scan progress UI (can reuse existing progress indicator area)

### Removed: `forms/exhibits/js/duplicate-ui.js`
- Entire file replaced by `review-ui.js` on the new page
- **Dependency cleanup:** `form-submission.js` currently calls `DuplicateUI.showModal()` when duplicates are detected via SSE. This code path must be replaced with the redirect-to-review-page logic before `duplicate-ui.js` is deleted. The `<script src="js/duplicate-ui.js">` tag in `index.html` should also be removed.

### Modified: `forms/exhibits/styles.css`
- Remove modal-specific duplicate styles (`.modal-overlay`, `.duplicate-modal-content`, etc.)
- Add styles for review page (tabs, enhanced cards, sticky footer, confirmation dialog)
- Shared styles (file cards, keep/remove states) can be kept and reused

## New Backend Endpoint

### `GET /api/exhibits/jobs/{jobId}/duplicates`
Returns the duplicate groups data for a job that is in `awaiting_resolution` status.

**Response:**
```json
{
  "caseName": "Smith v. Johnson",
  "totalFiles": 847,
  "groups": {
    "A": [
      {
        "groupId": "A-g0",
        "files": ["lease_agreement.pdf", "lease_agreement_copy.pdf"],
        "defaultKeep": "lease_agreement.pdf",
        "edges": [{"file1": "...", "file2": "...", "matchType": "EXACT_DUPLICATE", "confidence": 1.0}],
        "thumbnails": {"lease_agreement.pdf": "data:image/png;base64,..."},
        "metadata": {
          "lease_agreement.pdf": {"size": 1843200, "pages": 24},
          "lease_agreement_copy.pdf": {"size": 1843200, "pages": 24}
        }
      }
    ]
  }
}
```

**Note:** File metadata (size, page count/dimensions) needs to be collected during the scan phase and included in the response. This is new data not currently captured by `detectDuplicates()`.

**Thumbnail payload size mitigation:** Thumbnails are base64-encoded JPEG (not PNG) at quality 60 to reduce payload size. For jobs with 200+ duplicate files, the endpoint supports an optional `?exhibit=A` query parameter to fetch groups for a single exhibit at a time (lazy-load per tab). The initial response without `?exhibit` returns group metadata (file list, match types, metadata) but **excludes thumbnails** — thumbnails are fetched per-exhibit when the user switches tabs.

## Upload Mode Support

The review page works identically for both **direct upload** and **Dropbox import** flows. Both flows create a job with downloaded/uploaded files on disk. The scan phase runs the same `detectDuplicates()` logic regardless of source. The only difference is the initial trigger endpoint (`/generate` vs `/generate-from-dropbox`), which is already handled before the scan phase begins.

## Edge Cases

- **No duplicates found:** Skip review page entirely, show inline message "No duplicates detected — proceeding to processing", continue pipeline
- **All groups resolved as "Keep All":** Valid — no files removed, processing proceeds with all files
- **User navigates away from review page:** Job stays in `awaiting_resolution` state. Returning to the URL with the same jobId reloads the review page
- **Browser refresh on review page:** Fetches duplicate data again from the endpoint, state is server-side
- **Single file in a group after resolution:** Not possible — last-kept-file guard prevents removing all files

## File Inventory

| File | Action | Purpose |
|------|--------|---------|
| `forms/exhibits/review.html` | Create | New duplicate review page |
| `forms/exhibits/js/review-ui.js` | Create | Tab management, card rendering, resolution logic |
| `forms/exhibits/js/duplicate-ui.js` | Delete | Replaced by review-ui.js |
| `forms/exhibits/js/form-submission.js` | Modify | New SSE events, redirect logic, resume handling |
| `forms/exhibits/index.html` | Modify | Remove duplicate modal markup, add scan progress |
| `forms/exhibits/styles.css` | Modify | Remove modal styles, add review page styles |
| `routes/exhibits.js` | Modify | Split pipeline, add duplicates endpoint, scan SSE events |
| `services/exhibit-processor.js` | Modify | Extract `scanForDuplicates()` method; collect file metadata (size, pages/dimensions) during scan since it has access to file paths |
| `services/duplicate-detector.js` | No change | Detection logic stays the same — metadata is collected by the caller (`scanForDuplicates`) not by `detectDuplicates()` |

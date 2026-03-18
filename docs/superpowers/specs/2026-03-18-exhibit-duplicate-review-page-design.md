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
The current pipeline runs duplicate detection inline during processing. This changes to:

1. **Scan phase:** On `POST /api/exhibits/generate-from-dropbox` (or equivalent), run **only** duplicate detection as a first pass
2. **SSE events for scan phase:**
   - `scan-start` — scan has begun
   - `scan-progress` — progress updates (e.g., "Scanning exhibit A: 45/120 files...")
   - `scan-complete` — scan finished, payload contains either `{ duplicates: false }` or `{ groups: [...] }` with the full duplicate group data including thumbnails
3. **Review pending state:** Job record tracks `status: 'review_pending'` when duplicates are found
4. **Resolution:** Existing `POST /api/exhibits/jobs/{jobId}/resolve` endpoint stays the same — same payload format `{ groupId, keep[], remove[] }`
5. **Resume processing:** After resolution, the main page hits a resume endpoint or reconnects to SSE which triggers the PDF generation phase

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

### Modified: `forms/exhibits/styles.css`
- Remove modal-specific duplicate styles (`.modal-overlay`, `.duplicate-modal-content`, etc.)
- Add styles for review page (tabs, enhanced cards, sticky footer, confirmation dialog)
- Shared styles (file cards, keep/remove states) can be kept and reused

## New Backend Endpoint

### `GET /api/exhibits/jobs/{jobId}/duplicates`
Returns the duplicate groups data for a job that is in `review_pending` status.

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

## Edge Cases

- **No duplicates found:** Skip review page entirely, show inline message "No duplicates detected — proceeding to processing", continue pipeline
- **All groups resolved as "Keep All":** Valid — no files removed, processing proceeds with all files
- **User navigates away from review page:** Job stays in `review_pending` state. Returning to the URL with the same jobId reloads the review page
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
| `services/duplicate-detector.js` | Modify | Return file metadata alongside groups |

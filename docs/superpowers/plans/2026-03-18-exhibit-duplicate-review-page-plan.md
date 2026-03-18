# Exhibit Duplicate Review Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal-based duplicate resolution with a dedicated review page that appears as a pre-processing scan step, supporting 200-1000 file sets with tabbed navigation by exhibit.

**Architecture:** Extract duplicate detection from `ExhibitProcessor.process()` into a standalone `scanForDuplicates()` method. Add a new `GET /duplicates` endpoint for lazy-loading group data. Create `review.html` + `review-ui.js` as a standalone page with exhibit tabs, enhanced file cards, and confirmation dialog. Modify `form-submission.js` to redirect on scan-complete instead of showing the modal.

**Tech Stack:** Node.js/Express, vanilla JS, Sharp (image thumbnails), MuPDF WASM (PDF thumbnails), SSE (EventSource)

**Spec:** `docs/superpowers/specs/2026-03-18-exhibit-duplicate-review-page-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `services/exhibit-processor.js` | Modify | Extract `scanForDuplicates()` method from `process()`, collect file metadata |
| `routes/exhibits.js` | Modify | Add `GET /jobs/:jobId/duplicates` endpoint, split generate flow to call scan first, add scan SSE events |
| `forms/exhibits/review.html` | Create | Standalone duplicate review page (HTML structure) |
| `forms/exhibits/js/review-ui.js` | Create | Tab management, card rendering, keep/remove toggling, confirmation dialog, resolution POST |
| `forms/exhibits/js/form-submission.js` | Modify | Handle scan SSE events, redirect to review page, handle `?resume=true` |
| `forms/exhibits/index.html` | Modify | Remove duplicate modal markup and script tag |
| `forms/exhibits/review-styles.css` | Create | Review page styles (tabs, enhanced cards, sticky footer, confirmation dialog) |
| `forms/exhibits/styles.css` | Modify | Remove modal-specific duplicate styles |
| `forms/exhibits/js/duplicate-ui.js` | Delete | Replaced by review-ui.js |

---

### Task 1: Extract `scanForDuplicates()` from ExhibitProcessor

**Files:**
- Modify: `services/exhibit-processor.js:145-228`
- Test: `tests/services/exhibit-processor.test.js` (if exists, otherwise manual verification)

This extracts the duplicate detection loop (lines 170-223 of `process()`) into a standalone method and adds file metadata collection.

- [ ] **Step 1: Read the current `process()` method**

Read `services/exhibit-processor.js` to understand the exact duplicate detection block that needs extraction. The block runs from the `DuplicateDetector.detectDuplicates()` calls through thumbnail generation and the `{duplicates, paused: true}` return.

- [ ] **Step 2: Create `scanForDuplicates()` static method**

Add a new static method that extracts the duplicate detection + thumbnail generation logic from `process()`. It should:
- Accept `{ exhibits, onProgress }` (same shape as process params)
- Pre-load file buffers (same as process does at lines 154-162)
- Call `DuplicateDetector.detectDuplicates()` per exhibit letter
- Generate thumbnails for each group
- **NEW:** Collect file metadata (size via `fs.stat`, page count via pdf-lib or MuPDF, dimensions via Sharp)
- Emit `scan-start`, `scan-progress` events via `onProgress`
- Return `{ hasGroups: true/false, groups: {...}, groupCounts: {...}, totalGroups, totalFiles }` or `null` if no duplicates

```javascript
static async scanForDuplicates({ exhibits, onProgress, generateThumbnails = true }) {
  // Pre-load buffers for disk-based files
  for (const [letter, exhibit] of Object.entries(exhibits)) {
    if (exhibit.files) {
      for (const file of exhibit.files) {
        if (file.path && !file.buffer) {
          file.buffer = await fs.promises.readFile(file.path);
        }
      }
    }
  }

  onProgress?.({ phase: 'duplicate_detection', message: 'Scanning for duplicates...', progress: 5 });

  const duplicateReport = {};
  const exhibitLetters = Object.keys(exhibits);

  for (let i = 0; i < exhibitLetters.length; i++) {
    const letter = exhibitLetters[i];
    const exhibit = exhibits[letter];
    const files = exhibit.files || [];

    if (files.length < 2) continue;

    onProgress?.({
      phase: 'duplicate_detection',
      message: `Scanning exhibit ${letter}: ${files.length} files...`,
      progress: 5 + Math.round((i / exhibitLetters.length) * 30)
    });

    const result = await DuplicateDetector.detectDuplicates(files);

    if (result.groups && result.groups.length > 0) {
      // Generate thumbnails
      if (generateThumbnails) {
        for (const group of result.groups) {
          group.thumbnails = group.thumbnails || {};
          for (const filename of group.files) {
            const file = files.find(f => (f.originalname || f.name) === filename);
            if (file && !group.thumbnails[filename]) {
              group.thumbnails[filename] = await ExhibitProcessor.generateThumbnail(file);
            }
          }
        }
      }

      // Collect file metadata (NEW)
      for (const group of result.groups) {
        group.metadata = group.metadata || {};
        for (const filename of group.files) {
          const file = files.find(f => (f.originalname || f.name) === filename);
          if (file) {
            const meta = { size: file.buffer ? file.buffer.length : 0 };
            const ext = filename.toLowerCase().split('.').pop();
            if (['pdf'].includes(ext) && file.buffer) {
              try {
                const { PDFDocument } = require('pdf-lib');
                const pdfDoc = await PDFDocument.load(file.buffer);
                meta.pages = pdfDoc.getPageCount();
              } catch (e) { /* skip metadata on failure */ }
            } else if (['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'].includes(ext) && file.buffer) {
              try {
                const sharp = require('sharp');
                const info = await sharp(file.buffer).metadata();
                meta.width = info.width;
                meta.height = info.height;
              } catch (e) { /* skip metadata on failure */ }
            }
            group.metadata[filename] = meta;
          }
        }
      }

      duplicateReport[letter] = result.groups;
    }
  }

  if (Object.keys(duplicateReport).length === 0) {
    return null; // No duplicates found
  }

  // Build summary
  const groupCounts = {};
  let totalGroups = 0;
  let totalFiles = 0;
  for (const [letter, groups] of Object.entries(duplicateReport)) {
    groupCounts[letter] = groups.length;
    totalGroups += groups.length;
    for (const group of groups) {
      totalFiles += group.files.length;
    }
  }

  return { groups: duplicateReport, groupCounts, totalGroups, totalFiles };
}
```

- [ ] **Step 3: Modify `process()` to skip inline duplicate detection**

Remove the duplicate detection block from `process()`. The method should now assume duplicates have already been handled (either scanned and resolved, or skipped). Keep `_buildPdf()` call and everything after it. The `skipDuplicateDetection` param is no longer needed — `process()` always just builds PDFs now.

```javascript
// process() becomes:
static async process({ caseName, exhibits, outputDir, onProgress }) {
  // Validate
  if (!exhibits || Object.keys(exhibits).length === 0) {
    throw new Error('No exhibits provided');
  }

  // Pre-load buffers for disk-based files
  for (const [letter, exhibit] of Object.entries(exhibits)) {
    if (exhibit.files) {
      for (const file of exhibit.files) {
        if (file.path && !file.buffer) {
          file.buffer = await fs.promises.readFile(file.path);
        }
      }
    }
  }

  // Go straight to PDF generation (duplicates already resolved)
  return ExhibitProcessor._buildPdf({ caseName, exhibits, outputDir, onProgress });
}
```

- [ ] **Step 4: Verify `resume()` still works**

`resume()` calls `_buildPdf()` directly — it should be unaffected. Verify the call signature matches.

- [ ] **Step 5: Run existing tests**

Run: `npm test -- --grep exhibit` or `npx jest tests/ --testPathPattern exhibit`
Expected: All existing exhibit tests still pass (duplicate detection logic untouched, just extracted).

- [ ] **Step 6: Commit**

```bash
git add services/exhibit-processor.js
git commit -m "refactor: extract scanForDuplicates() from ExhibitProcessor.process()"
```

---

### Task 2: Add `GET /duplicates` endpoint and split generate flow

**Files:**
- Modify: `routes/exhibits.js:270-451` (generate endpoint), add new endpoint
- Test: Manual via curl

This adds the new endpoint for the review page to fetch group data, and modifies the generate flow to call `scanForDuplicates()` first.

**Important:** Both `POST /generate-from-dropbox` AND `POST /generate` (direct upload) must be updated to call `scanForDuplicates()` first. The scan-first flow applies identically to both upload modes. Apply the same pattern to both endpoints.

- [ ] **Step 1: Add `GET /jobs/:jobId/duplicates` endpoint**

Add the endpoint after the existing stream endpoint (around line 235). It returns group data from the job object, with optional `?exhibit=X` for per-exhibit lazy loading (thumbnails only included when filtering by exhibit).

```javascript
// GET /jobs/:jobId/duplicates — fetch duplicate group data for review page
router.get('/jobs/:jobId/duplicates', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'awaiting_resolution' || !job.duplicates) {
    return res.status(400).json({ error: 'No duplicates pending review for this job' });
  }

  const exhibitFilter = req.query.exhibit;

  if (exhibitFilter) {
    // Per-exhibit response WITH thumbnails (lazy-load per tab)
    const groups = job.duplicates[exhibitFilter] || [];
    return res.json({
      caseName: job.caseName,
      totalFiles: job.totalFiles || 0,
      groups: { [exhibitFilter]: groups }
    });
  }

  // Initial response WITHOUT thumbnails (lightweight metadata)
  const groupsWithoutThumbnails = {};
  for (const [letter, groups] of Object.entries(job.duplicates)) {
    groupsWithoutThumbnails[letter] = groups.map(g => ({
      groupId: g.groupId,
      files: g.files,
      defaultKeep: g.defaultKeep,
      edges: g.edges,
      metadata: g.metadata
      // thumbnails intentionally omitted
    }));
  }

  return res.json({
    caseName: job.caseName,
    totalFiles: job.totalFiles || 0,
    groupCounts: job.groupCounts || {},
    totalGroups: job.totalGroups || 0,
    groups: groupsWithoutThumbnails
  });
});
```

- [ ] **Step 2: Modify generate-from-dropbox to call scanForDuplicates first**

In the realtime flow (around line 335), after downloading files, call `scanForDuplicates()` instead of `process()`. If duplicates found, store on job and broadcast `scan-complete`. If not, proceed to call `process()`.

Replace the existing `ExhibitProcessor.process()` call block (around lines 373-398) with:

```javascript
// Step 1: Scan for duplicates
broadcastJobEvent(job, 'progress', {
  phase: 'duplicate_detection',
  message: 'Scanning for duplicates...',
  progress: 5
});

const scanResult = await ExhibitProcessor.scanForDuplicates({
  exhibits: job.exhibits,
  onProgress: (data) => broadcastJobEvent(job, 'progress', data),
  generateThumbnails: true
});

if (scanResult) {
  // Duplicates found — pause for review
  job.status = 'awaiting_resolution';
  job.duplicates = scanResult.groups;
  job.groupCounts = scanResult.groupCounts;
  job.totalGroups = scanResult.totalGroups;
  job.totalFiles = scanResult.totalFiles;

  broadcastJobEvent(job, 'scan-complete', {
    duplicates: true,
    groupCounts: scanResult.groupCounts,
    totalGroups: scanResult.totalGroups,
    totalFiles: scanResult.totalFiles
  });
} else {
  // No duplicates — proceed to processing
  broadcastJobEvent(job, 'scan-complete', { duplicates: false });
  broadcastJobEvent(job, 'progress', {
    phase: 'processing',
    message: 'Generating exhibits...',
    progress: 40
  });

  const result = await ExhibitProcessor.process({
    caseName: job.caseName,
    exhibits: job.exhibits,
    outputDir: job.tempDir,
    onProgress: (data) => broadcastJobEvent(job, 'progress', data)
  });

  // Existing complete logic: upload to GCS, broadcast complete...
  // (keep existing code from lines 400-440)
}
```

- [ ] **Step 3: Update the SSE stream endpoint for scan events**

**Coupled dependency:** This step and Task 3 Step 1 MUST both be completed. The stream endpoint currently replays `event: duplicates` for `awaiting_resolution` jobs. Task 3 removes the `duplicates` listener and adds `scan-complete`. If only one side is updated, reconnecting clients will receive an event that nothing handles.

The existing `GET /jobs/:jobId/stream` endpoint (lines 194-235) already broadcasts job state on connect. Update the `awaiting_resolution` branch to send `scan-complete` format instead of `duplicates` event:

```javascript
// In stream endpoint, where it checks job.status === 'awaiting_resolution':
if (job.status === 'awaiting_resolution' && job.duplicates) {
  broadcastJobEvent(job, 'scan-complete', {
    duplicates: true,
    groupCounts: job.groupCounts || {},
    totalGroups: job.totalGroups || 0,
    totalFiles: job.totalFiles || 0
  });
}
```

- [ ] **Step 4: Run existing tests**

Run: `npx jest tests/ --testPathPattern exhibit`
Expected: All existing tests pass. The resolve endpoint is unchanged.

- [ ] **Step 5: Commit**

```bash
git add routes/exhibits.js
git commit -m "feat: add GET /duplicates endpoint and split generate flow for scan-first pipeline"
```

---

### Task 3: Modify `form-submission.js` for scan events and redirect

**Files:**
- Modify: `forms/exhibits/js/form-submission.js:144-252`

Replace the `duplicates` SSE event handler with `scan-complete` handling. Add redirect logic and `?resume=true` support.

- [ ] **Step 1: Replace `duplicates` event handler with `scan-complete`**

In `connectSSE()` (around line 144), replace the `duplicates` event listener with:

```javascript
eventSource.addEventListener('scan-complete', (event) => {
  const data = JSON.parse(event.data);

  if (data.duplicates) {
    // Redirect to review page
    eventSource.close();
    window.location.href = `/exhibits/review.html?jobId=${jobId}`;
  } else {
    // No duplicates — show message and continue
    updateProgress({
      phase: 'processing',
      message: 'No duplicates detected — proceeding to processing...',
      progress: 40
    });
  }
});
```

Remove the old `duplicates` event listener and the `DuplicateUI.showModal()` call entirely.

- [ ] **Step 2: Add `?resume=true` handling on page load**

At the top of the file (or in a DOMContentLoaded handler), check for resume params:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const resumeJobId = params.get('jobId');
  const isResume = params.get('resume') === 'true';

  if (isResume && resumeJobId) {
    // Show progress overlay and reconnect to SSE
    showProgressOverlay();
    connectSSE(resumeJobId);

    // Clean up URL
    window.history.replaceState({}, '', '/exhibits/');
  }
});
```

- [ ] **Step 3: Remove DuplicateUI import/reference**

Remove the `DuplicateUI` reference. The `<script src="js/duplicate-ui.js">` tag removal happens in Task 6 (index.html cleanup).

- [ ] **Step 4: Test manually**

Start dev server, trigger a generate with known duplicate files. Verify:
1. SSE receives `scan-complete` with `duplicates: true`
2. Browser redirects to `review.html?jobId=xxx`

- [ ] **Step 5: Commit**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat: handle scan-complete SSE event with redirect to review page"
```

---

### Task 4: Create `review.html` page structure

**Files:**
- Create: `forms/exhibits/review.html`

The HTML shell for the review page. Matches the existing exhibit page styling but with the review-specific layout.

- [ ] **Step 1: Read `forms/exhibits/index.html` for style/structure reference**

Note the `<head>` structure, stylesheet link, font imports, and overall page wrapper pattern.

- [ ] **Step 2: Create `review.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Duplicate Review — Exhibit Collector</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="review-styles.css">
</head>
<body>
  <div class="review-page">
    <!-- Header -->
    <div class="review-header">
      <div class="review-header-info">
        <h1 class="review-title">Duplicate Review</h1>
        <p class="review-subtitle" id="review-subtitle">Loading...</p>
      </div>
      <div class="review-header-actions">
        <button class="btn-remove-all" id="btn-remove-all">Remove All Duplicates</button>
        <button class="btn-continue" id="btn-continue-top">Continue to Processing →</button>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="review-tabs" id="review-tabs">
      <!-- Tabs rendered by JS -->
    </div>

    <!-- Tab Content -->
    <div class="review-content" id="review-content">
      <!-- Group cards rendered by JS -->
    </div>

    <!-- Sticky Footer -->
    <div class="review-footer">
      <div class="review-footer-stats" id="review-footer-stats">
        <!-- "Keeping X files · Removing Y files · across Z exhibits" -->
      </div>
      <button class="btn-continue" id="btn-continue-bottom">Continue to Processing →</button>
    </div>

    <!-- Confirmation Dialog -->
    <div class="confirm-overlay" id="confirm-overlay" style="display: none;">
      <div class="confirm-dialog">
        <h2 class="confirm-title">Confirm & Process</h2>
        <div class="confirm-stats" id="confirm-stats">
          <!-- Stats rendered by JS -->
        </div>
        <div class="confirm-warning">
          <p class="confirm-warning-title">⚠ Removed files will not be included in the generated exhibits.</p>
          <p class="confirm-warning-detail">This cannot be undone — you would need to re-upload to include them again.</p>
        </div>
        <div class="confirm-actions">
          <button class="btn-secondary" id="btn-go-back">Go Back</button>
          <button class="btn-continue" id="btn-confirm-process">Process Files →</button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div class="review-loading" id="review-loading">
      <p>Loading duplicate data...</p>
    </div>
  </div>

  <script src="js/review-ui.js"></script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/review.html
git commit -m "feat: add review.html page structure for duplicate review"
```

---

### Task 5: Create `review-styles.css`

**Files:**
- Create: `forms/exhibits/review-styles.css`

Separate stylesheet for the review page to avoid bloating the main `styles.css`. The existing `styles.css` uses a light theme with white backgrounds, navy text, and teal accents.

- [ ] **Step 1: Read `forms/exhibits/styles.css` for theme reference**

Note the color scheme, font families, border-radius patterns, and shadow styles used across the existing page.

- [ ] **Step 2: Create `review-styles.css`**

```css
/* Review Page Layout */
.review-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 80px;
  font-family: inherit;
}

.review-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #6b7280;
  font-size: 16px;
}

.review-loading.hidden {
  display: none;
}

/* Header */
.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  border-bottom: 1px solid #e5e7eb;
}

.review-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.review-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0;
}

.review-header-actions {
  display: flex;
  gap: 10px;
}

/* Buttons */
.btn-remove-all {
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(239, 68, 68, 0.3);
  cursor: pointer;
  transition: background 0.2s;
}

.btn-remove-all:hover {
  background: rgba(239, 68, 68, 0.2);
}

.btn-continue {
  padding: 8px 20px;
  border-radius: 6px;
  background: #4CAF50;
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-continue:hover {
  background: #43a047;
}

.btn-secondary {
  padding: 8px 20px;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  border: 1px solid #d1d5db;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

/* Tab Bar */
.review-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  padding: 0;
}

.review-tab {
  padding: 12px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font-family: inherit;
}

.review-tab:hover {
  color: #374151;
}

.review-tab.active {
  color: #1a1a2e;
  border-bottom-color: #4CAF50;
  font-weight: 500;
}

.review-tab-badge {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
  font-size: 11px;
}

.review-tab.active .review-tab-badge {
  background: rgba(76, 175, 80, 0.15);
  color: #4CAF50;
}

/* Tab Content */
.review-content {
  padding: 24px 0;
}

.review-section-header {
  font-size: 15px;
  color: #374151;
  font-weight: 500;
  margin-bottom: 16px;
}

/* Group Card */
.review-group-card {
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.review-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.review-group-label {
  font-size: 13px;
  color: #6b7280;
}

.btn-keep-all {
  padding: 4px 12px;
  border-radius: 4px;
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  font-size: 12px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-keep-all:hover {
  background: rgba(76, 175, 80, 0.2);
}

/* File Cards */
.review-file-cards {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.review-file-card {
  width: 170px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 10px;
  background: rgba(76, 175, 80, 0.04);
  transition: opacity 0.2s, border-color 0.2s;
}

.review-file-card.marked-remove {
  border-color: #ef4444;
  opacity: 0.5;
  background: rgba(239, 68, 68, 0.04);
}

.review-file-card.marked-keep-locked {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.08);
}

.review-file-card.marked-keep-locked .review-file-toggle {
  cursor: not-allowed;
  opacity: 0.6;
}

.review-file-thumbnail {
  width: 100%;
  height: 110px;
  background: #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.review-file-thumbnail img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.review-file-thumbnail .file-icon {
  font-size: 32px;
  color: #9ca3af;
}

.review-file-name {
  font-size: 12px;
  color: #374151;
  margin-top: 8px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-file-meta {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
}

.review-file-match {
  margin-top: 4px;
}

.match-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
}

.match-badge.exact {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
}

.match-badge.visual {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.match-badge.likely {
  background: rgba(156, 39, 176, 0.1);
  color: #9c27b0;
}

.review-file-toggle {
  margin-top: 8px;
  padding: 6px;
  border-radius: 5px;
  color: white;
  font-size: 11px;
  text-align: center;
  cursor: pointer;
  font-weight: 500;
  border: none;
  width: 100%;
  transition: background 0.2s;
}

.review-file-toggle.toggle-keep {
  background: #4CAF50;
}

.review-file-toggle.toggle-keep:hover {
  background: #43a047;
}

.review-file-toggle.toggle-remove {
  background: #ef4444;
}

.review-file-toggle.toggle-remove:hover {
  background: #dc2626;
}

/* Sticky Footer */
.review-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.review-footer-stats {
  font-size: 13px;
  color: #6b7280;
}

.review-footer-stats .keep-count {
  color: #4CAF50;
  font-weight: 500;
}

.review-footer-stats .remove-count {
  color: #ef4444;
  font-weight: 500;
}

/* Confirmation Dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  padding: 28px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 16px;
}

.confirm-stats {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.confirm-stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.confirm-stat-row:last-child {
  margin-bottom: 0;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.confirm-stat-label {
  color: #6b7280;
}

.confirm-stat-value {
  color: #374151;
  font-weight: 500;
}

.confirm-stat-value.keep {
  color: #4CAF50;
}

.confirm-stat-value.remove {
  color: #ef4444;
}

.confirm-warning {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.confirm-warning-title {
  font-size: 13px;
  color: #b45309;
  font-weight: 500;
  margin: 0 0 4px;
}

.confirm-warning-detail {
  font-size: 12px;
  color: #92400e;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
```

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/review-styles.css
git commit -m "feat: add review page styles (tabs, cards, footer, confirmation dialog)"
```

---

### Task 6: Create `review-ui.js` — core review page logic

**Files:**
- Create: `forms/exhibits/js/review-ui.js`

This is the main JS for the review page. It handles: fetching data, rendering tabs and cards, keep/remove toggling, bulk actions, and the confirmation + resolution POST.

- [ ] **Step 1: Create `review-ui.js` with initialization and data fetching**

```javascript
const ReviewUI = (() => {
  // State
  let jobId = null;
  let caseName = '';
  let totalFiles = 0;
  let groupCounts = {};
  let groups = {};        // { A: [groups], B: [groups] } — loaded per-exhibit
  let resolutions = {};   // { A: [{ groupId, keep, remove }], ... }
  let activeTab = null;
  let loadedTabs = {};    // Track which exhibit tabs have full data loaded

  // DOM refs
  const els = {};

  function init() {
    const params = new URLSearchParams(window.location.search);
    jobId = params.get('jobId');

    if (!jobId) {
      document.getElementById('review-loading').textContent = 'Error: No job ID provided.';
      return;
    }

    // Cache DOM refs
    els.subtitle = document.getElementById('review-subtitle');
    els.tabs = document.getElementById('review-tabs');
    els.content = document.getElementById('review-content');
    els.footerStats = document.getElementById('review-footer-stats');
    els.confirmOverlay = document.getElementById('confirm-overlay');
    els.confirmStats = document.getElementById('confirm-stats');
    els.loading = document.getElementById('review-loading');

    // Bind buttons
    document.getElementById('btn-remove-all').addEventListener('click', removeAllDuplicates);
    document.getElementById('btn-continue-top').addEventListener('click', showConfirmation);
    document.getElementById('btn-continue-bottom').addEventListener('click', showConfirmation);
    document.getElementById('btn-go-back').addEventListener('click', hideConfirmation);
    document.getElementById('btn-confirm-process').addEventListener('click', confirmAndProcess);

    fetchDuplicateData();
  }

  async function fetchDuplicateData() {
    try {
      const resp = await fetch(`/api/exhibits/jobs/${jobId}/duplicates`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      caseName = data.caseName || '';
      totalFiles = data.totalFiles || 0;
      groupCounts = data.groupCounts || {};
      groups = data.groups || {};

      // Initialize resolutions from group data
      for (const [letter, letterGroups] of Object.entries(groups)) {
        resolutions[letter] = letterGroups.map(g => ({
          groupId: g.groupId,
          keep: [g.defaultKeep],
          remove: g.files.filter(f => f !== g.defaultKeep)
        }));
      }

      renderPage();
    } catch (err) {
      els.loading.textContent = `Error loading duplicate data: ${err.message}`;
    }
  }

  async function fetchExhibitThumbnails(letter) {
    if (loadedTabs[letter]) return;
    try {
      const resp = await fetch(`/api/exhibits/jobs/${jobId}/duplicates?exhibit=${letter}`);
      if (!resp.ok) return;
      const data = await resp.json();
      // Merge thumbnails into existing groups
      if (data.groups && data.groups[letter]) {
        const fullGroups = data.groups[letter];
        for (let i = 0; i < fullGroups.length; i++) {
          if (groups[letter] && groups[letter][i]) {
            groups[letter][i].thumbnails = fullGroups[i].thumbnails || {};
          }
        }
      }
      loadedTabs[letter] = true;
    } catch (err) {
      console.error(`Failed to load thumbnails for exhibit ${letter}:`, err);
    }
  }

  function renderPage() {
    // Hide loading
    els.loading.classList.add('hidden');

    // Subtitle
    const exhibitCount = Object.keys(groupCounts).length;
    const totalGroupCount = Object.values(groupCounts).reduce((a, b) => a + b, 0);
    els.subtitle.textContent = `${caseName} — ${totalFiles} files scanned · ${totalGroupCount} duplicate groups found across ${exhibitCount} exhibits`;

    // Render tabs
    renderTabs();

    // Activate first tab
    const firstLetter = Object.keys(groupCounts).sort()[0];
    if (firstLetter) {
      switchTab(firstLetter);
    }

    updateFooterStats();
  }

  function renderTabs() {
    els.tabs.innerHTML = '';
    const letters = Object.keys(groupCounts).sort();
    for (const letter of letters) {
      const tab = document.createElement('button');
      tab.className = 'review-tab';
      tab.dataset.letter = letter;
      tab.innerHTML = `${letter} <span class="review-tab-badge">${groupCounts[letter]}</span>`;
      tab.addEventListener('click', () => switchTab(letter));
      els.tabs.appendChild(tab);
    }
  }

  async function switchTab(letter) {
    activeTab = letter;

    // Update tab active state
    els.tabs.querySelectorAll('.review-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.letter === letter);
    });

    // Fetch thumbnails for this tab if not loaded
    await fetchExhibitThumbnails(letter);

    // Render content
    renderTabContent(letter);
  }

  function renderTabContent(letter) {
    const letterGroups = groups[letter] || [];
    const letterResolutions = resolutions[letter] || [];
    let totalFilesInExhibit = 0;
    letterGroups.forEach(g => totalFilesInExhibit += g.files.length);

    let html = `<div class="review-section-header">Exhibit ${letter} — ${letterGroups.length} duplicate group${letterGroups.length !== 1 ? 's' : ''} · ${totalFilesInExhibit} files</div>`;

    letterGroups.forEach((group, groupIdx) => {
      const res = letterResolutions[groupIdx];
      html += `<div class="review-group-card" data-letter="${letter}" data-group="${groupIdx}">`;
      html += `<div class="review-group-header">`;
      html += `<span class="review-group-label">Group ${groupIdx + 1} · ${group.files.length} files</span>`;
      html += `<button class="btn-keep-all" onclick="ReviewUI.keepAll('${letter}', ${groupIdx})">Keep All</button>`;
      html += `</div>`;
      html += `<div class="review-file-cards">`;

      group.files.forEach(filename => {
        const isKeep = res.keep.includes(filename);
        const isRemove = res.remove.includes(filename);
        const isLocked = isKeep && res.keep.length <= 1;
        const meta = (group.metadata && group.metadata[filename]) || {};
        const thumbnail = (group.thumbnails && group.thumbnails[filename]) || null;

        // Determine match type from edges
        let matchBadge = '';
        const edge = (group.edges || []).find(e => e.file1 === filename || e.file2 === filename);
        if (edge) {
          if (edge.matchType === 'EXACT_DUPLICATE') {
            matchBadge = '<span class="match-badge exact">Exact Match</span>';
          } else if (edge.matchType === 'VISUAL_MATCH') {
            const pct = edge.confidence ? (edge.confidence * 100).toFixed(1) : '97.0';
            matchBadge = `<span class="match-badge visual">${pct}% Visual</span>`;
          } else if (edge.matchType === 'LIKELY_MATCH') {
            const pct = edge.confidence ? (edge.confidence * 100).toFixed(1) : '90.0';
            matchBadge = `<span class="match-badge likely">${pct}% Likely</span>`;
          }
        }

        // Format metadata
        let metaText = '';
        if (meta.size) {
          metaText = formatFileSize(meta.size);
          if (meta.pages) metaText += ` · ${meta.pages} page${meta.pages !== 1 ? 's' : ''}`;
          if (meta.width && meta.height) metaText += ` · ${meta.width}×${meta.height}`;
        }

        const cardClass = isLocked ? 'review-file-card marked-keep-locked' :
                          isRemove ? 'review-file-card marked-remove' : 'review-file-card';
        const toggleClass = isRemove ? 'review-file-toggle toggle-remove' : 'review-file-toggle toggle-keep';
        const toggleText = isRemove ? 'REMOVE' : 'KEEP';

        html += `<div class="${cardClass}" data-filename="${escapeHtml(filename)}">`;
        html += `<div class="review-file-thumbnail">`;
        if (thumbnail) {
          html += `<img src="${thumbnail}" alt="${escapeHtml(filename)}">`;
        } else {
          html += `<span class="file-icon">📄</span>`;
        }
        html += `</div>`;
        html += `<div class="review-file-name" title="${escapeHtml(filename)}">${escapeHtml(filename)}</div>`;
        html += `<div class="review-file-meta">${metaText}</div>`;
        html += `<div class="review-file-match">${matchBadge}</div>`;
        html += `<button class="${toggleClass}" onclick="ReviewUI.toggleFile('${letter}', ${groupIdx}, '${escapeJs(filename)}')">${toggleText}</button>`;
        html += `</div>`;
      });

      html += `</div>`; // file-cards
      html += `</div>`; // group-card
    });

    els.content.innerHTML = html;
  }

  function toggleFile(letter, groupIdx, filename) {
    const res = resolutions[letter][groupIdx];

    if (res.keep.includes(filename)) {
      // Try to remove — guard last kept file
      if (res.keep.length <= 1) return;
      res.keep = res.keep.filter(f => f !== filename);
      res.remove.push(filename);
    } else {
      // Keep it
      res.remove = res.remove.filter(f => f !== filename);
      res.keep.push(filename);
    }

    renderTabContent(letter);
    updateFooterStats();
  }

  function keepAll(letter, groupIdx) {
    const group = groups[letter][groupIdx];
    const res = resolutions[letter][groupIdx];
    res.keep = [...group.files];
    res.remove = [];

    renderTabContent(letter);
    updateFooterStats();
  }

  function removeAllDuplicates() {
    for (const [letter, letterResolutions] of Object.entries(resolutions)) {
      for (const res of letterResolutions) {
        const group = groups[letter].find(g => g.groupId === res.groupId);
        if (group) {
          res.keep = [group.defaultKeep];
          res.remove = group.files.filter(f => f !== group.defaultKeep);
        }
      }
    }

    if (activeTab) renderTabContent(activeTab);
    updateFooterStats();
  }

  function updateFooterStats() {
    let keepCount = 0;
    let removeCount = 0;
    const exhibitsAffected = new Set();

    for (const [letter, letterResolutions] of Object.entries(resolutions)) {
      for (const res of letterResolutions) {
        keepCount += res.keep.length;
        removeCount += res.remove.length;
        if (res.remove.length > 0) exhibitsAffected.add(letter);
      }
    }

    els.footerStats.innerHTML = `<span class="keep-count">Keeping ${keepCount} files</span> · <span class="remove-count">Removing ${removeCount} files</span> · across ${exhibitsAffected.size} exhibits`;

    // Update confirm button text
    const btnConfirm = document.getElementById('btn-confirm-process');
    if (btnConfirm) {
      btnConfirm.textContent = `Process ${totalFiles - removeCount} Files →`;
    }
  }

  function showConfirmation() {
    let keepCount = 0;
    let removeCount = 0;
    const exhibitsAffected = new Set();

    for (const [letter, letterResolutions] of Object.entries(resolutions)) {
      for (const res of letterResolutions) {
        keepCount += res.keep.length;
        removeCount += res.remove.length;
        if (res.remove.length > 0) exhibitsAffected.add(letter);
      }
    }

    els.confirmStats.innerHTML = `
      <div class="confirm-stat-row">
        <span class="confirm-stat-label">Total files scanned</span>
        <span class="confirm-stat-value">${totalFiles}</span>
      </div>
      <div class="confirm-stat-row">
        <span class="confirm-stat-label">Files to keep</span>
        <span class="confirm-stat-value keep">${totalFiles - removeCount}</span>
      </div>
      <div class="confirm-stat-row">
        <span class="confirm-stat-label">Files to remove</span>
        <span class="confirm-stat-value remove">${removeCount}</span>
      </div>
      <div class="confirm-stat-row">
        <span class="confirm-stat-label">Exhibits affected</span>
        <span class="confirm-stat-value">${exhibitsAffected.size} of ${Object.keys(groups).length}</span>
      </div>
    `;

    document.getElementById('btn-confirm-process').textContent = `Process ${totalFiles - removeCount} Files →`;
    els.confirmOverlay.style.display = 'flex';
  }

  function hideConfirmation() {
    els.confirmOverlay.style.display = 'none';
  }

  async function confirmAndProcess() {
    hideConfirmation();

    // POST resolution
    try {
      const resp = await fetch(`/api/exhibits/jobs/${jobId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolutions)
      });

      if (!resp.ok) {
        const err = await resp.json();
        alert(`Resolution failed: ${err.error || resp.statusText}`);
        return;
      }

      // Redirect to main page to pick up processing SSE stream
      window.location.href = `/exhibits/?jobId=${jobId}&resume=true`;
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    }
  }

  // Helpers
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeJs(str) {
    return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  }

  // Public API
  return { init, toggleFile, keepAll, removeAllDuplicates };
})();

document.addEventListener('DOMContentLoaded', ReviewUI.init);
```

- [ ] **Step 2: Test manually**

Start dev server. Navigate to `review.html?jobId=xxx` with a valid job in `awaiting_resolution` state. Verify:
1. Tabs render for exhibits with duplicates
2. File cards show thumbnails, metadata, match badges
3. Keep/Remove toggles work
4. Last-kept-file guard prevents removing all files
5. "Keep All" works per group
6. "Remove All Duplicates" bulk action works
7. Footer stats update in real-time
8. Confirmation dialog shows correct stats
9. "Process" posts resolution and redirects

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/review-ui.js
git commit -m "feat: add review-ui.js with tabs, cards, toggling, and confirmation flow"
```

---

### Task 7: Clean up index.html and remove duplicate modal

**Files:**
- Modify: `forms/exhibits/index.html:98-114` (remove modal), line 152 (remove script tag)

- [ ] **Step 1: Read `forms/exhibits/index.html`**

Read the file to find the exact duplicate modal markup and duplicate-ui.js script tag.

- [ ] **Step 2: Remove duplicate modal markup**

Remove the `#duplicate-modal` div (lines 98-114 approximately):

```html
<!-- DELETE THIS BLOCK -->
<div id="duplicate-modal" class="modal-overlay">
  ...everything inside...
</div>
```

- [ ] **Step 3: Remove duplicate-ui.js script tag**

Remove: `<script src="js/duplicate-ui.js"></script>` from the script tags section.

- [ ] **Step 4: Verify page loads without errors**

Open `index.html` in browser. Verify no console errors about missing `DuplicateUI`.

- [ ] **Step 5: Commit**

```bash
git add forms/exhibits/index.html
git commit -m "refactor: remove duplicate modal markup and duplicate-ui.js script tag"
```

---

### Task 8: Clean up CSS — remove modal styles

**Files:**
- Modify: `forms/exhibits/styles.css:351-596`

- [ ] **Step 1: Read `forms/exhibits/styles.css`**

Identify the duplicate modal CSS block (approximately lines 351-596).

- [ ] **Step 2: Remove modal-specific styles**

Remove CSS rules for:
- `.modal-overlay`
- `.duplicate-modal-content`
- `.modal-header`
- `.modal-footer`
- `#duplicate-pairs`
- `.duplicate-pair-card`
- `.duplicate-pair-header`
- `.duplicate-group-files`
- `.duplicate-file-card`
- `.duplicate-toggle`
- `.duplicate-preview`
- `.duplicate-preview-img`
- `.duplicate-actions`
- `.marked-keep`, `.marked-remove`, `.marked-keep-locked` (these are now in `review-styles.css`)
- `#btn-resolve-continue`
- `#duplicate-file-count`

- [ ] **Step 3: Verify main page styling is unaffected**

Load `index.html` and verify no visual regressions.

- [ ] **Step 4: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "refactor: remove duplicate modal CSS (moved to review-styles.css)"
```

---

### Task 9: Delete `duplicate-ui.js`

**Files:**
- Delete: `forms/exhibits/js/duplicate-ui.js`

- [ ] **Step 1: Verify no remaining references**

Search for `duplicate-ui` and `DuplicateUI` across the codebase to confirm all references have been removed in previous tasks.

- [ ] **Step 2: Delete the file**

```bash
rm forms/exhibits/js/duplicate-ui.js
```

- [ ] **Step 3: Commit**

```bash
git add -u forms/exhibits/js/duplicate-ui.js
git commit -m "refactor: delete duplicate-ui.js (replaced by review-ui.js)"
```

---

### Task 10: Serve `review.html` via Express route

**Files:**
- Modify: `routes/exhibits.js` or `server.js`

Ensure the review page is served correctly. The existing exhibit routes serve `forms/exhibits/` as static files — verify `review.html` and `review-styles.css` are accessible.

- [ ] **Step 1: Check how exhibit static files are served**

Read `server.js` or `routes/exhibits.js` to find the `express.static` middleware for `forms/exhibits/`.

- [ ] **Step 2: Verify `review.html` is accessible**

If the existing static middleware serves everything in `forms/exhibits/`, no change is needed. If explicit routes are defined, add one for `review.html` and `review-styles.css`.

- [ ] **Step 3: Test access**

Start dev server. Navigate to `/exhibits/review.html`. Verify the page loads (even without a jobId, it should show the error state).

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add server.js  # or routes/exhibits.js
git commit -m "feat: serve review.html via exhibit static routes"
```

---

### Task 11: End-to-end manual testing

**Files:** None (testing only)

- [ ] **Step 1: Test the full happy path with Dropbox files**

1. Start dev server
2. Enter case name, browse Dropbox, assign files to exhibits (use files with known duplicates)
3. Click Generate
4. Verify: progress shows "Scanning for duplicates..."
5. Verify: browser redirects to `review.html?jobId=xxx`
6. Verify: tabs show only exhibits with duplicates
7. Verify: file cards show thumbnails, metadata, match badges
8. Toggle some files keep/remove
9. Click "Continue to Processing"
10. Verify: confirmation dialog shows correct stats
11. Click "Process X Files"
12. Verify: redirects to main page, progress resumes, PDF generates

- [ ] **Step 2: Test "no duplicates" path**

1. Use files with no duplicates
2. Click Generate
3. Verify: "No duplicates detected" message appears
4. Verify: processing continues without redirect

- [ ] **Step 3: Test "Remove All Duplicates" bulk action**

1. On review page with multiple groups
2. Click "Remove All Duplicates"
3. Verify: all groups show default keep, rest removed
4. Verify: footer stats update

- [ ] **Step 4: Test browser refresh on review page**

1. On review page, hit F5
2. Verify: page reloads and shows the same duplicate data (fetched from server)

- [ ] **Step 5: Test direct upload flow (not Dropbox)**

1. Use the regular file upload flow
2. Verify: duplicate scan still runs and review page works identically

- [ ] **Step 6: Commit any fixes discovered during testing**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```

# Dropbox Multi-Select & File Preview Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select, thumbnails, and preview modal to the Dropbox file browser in the exhibit collector.

**Architecture:** Two new server endpoints (thumbnail batch + temp link) on existing Dropbox router. All frontend changes in existing `dropbox-browser.js` and `forms/exhibits/styles.css`. No new files.

**Tech Stack:** Dropbox SDK (`filesGetThumbnailBatch`, `filesGetTemporaryLink`), PDF.js (already loaded), Express, supertest/jest for testing.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `routes/dropbox.js` | Modify | Add `POST /thumbnails` and `GET /temp-link` endpoints |
| `forms/exhibits/js/dropbox-browser.js` | Modify | Rename state, add checkboxes, thumbnails, multi-select, preview modal, selection toolbar |
| `forms/exhibits/styles.css` | Modify | Add thumbnail, checkbox, selection toolbar, preview modal CSS |
| `forms/exhibits/index.html` | Modify | Add preview modal HTML container |
| `tests/routes/dropbox.test.js` | Modify | Add tests for new endpoints |

---

## Chunk 1: Server Endpoints + Tests

### Task 1: Add thumbnail batch endpoint with tests

**Files:**
- Modify: `tests/routes/dropbox.test.js`
- Modify: `routes/dropbox.js`

- [ ] **Step 1: Write failing tests for POST /api/dropbox/thumbnails**

Add to `tests/routes/dropbox.test.js`. The mock at the top needs to be updated to include the `getDropboxClient` from `dropbox-service`. Since the thumbnail endpoint calls `getDropboxClient()` directly (not through `dropbox-browser`), we need a separate mock.

```js
// Add at top of file, after existing requires:
jest.mock('../../dropbox-service', () => {
    const mockClient = {
        filesGetThumbnailBatch: jest.fn(),
        filesGetTemporaryLink: jest.fn(),
    };
    return {
        getDropboxClient: () => mockClient,
        isEnabled: () => true,
        _mockClient: mockClient,
    };
});
const { _mockClient: mockDbxClient } = require('../../dropbox-service');

// Add new describe block after existing tests:
describe('POST /api/dropbox/thumbnails', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return thumbnails for image files', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockResolvedValue({
            result: {
                entries: [
                    { '.tag': 'success', metadata: { path_display: '/photo.jpg' }, thumbnail: 'base64data1' },
                    { '.tag': 'success', metadata: { path_display: '/img.png' }, thumbnail: 'base64data2' },
                ],
            },
        });

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/photo.jpg', '/img.png'] });

        expect(res.status).toBe(200);
        expect(res.body.thumbnails).toHaveLength(2);
        expect(res.body.thumbnails[0]).toEqual({ path: '/photo.jpg', data: 'base64data1' });
        expect(res.body.thumbnails[1]).toEqual({ path: '/img.png', data: 'base64data2' });
    });

    it('should return null data for failed thumbnails (e.g. PDFs)', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockResolvedValue({
            result: {
                entries: [
                    { '.tag': 'failure', failure: { '.tag': 'unsupported_extension' }, metadata: { path_display: '/doc.pdf' } },
                ],
            },
        });

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/doc.pdf'] });

        expect(res.status).toBe(200);
        expect(res.body.thumbnails[0]).toEqual({ path: '/doc.pdf', data: null });
    });

    it('should enforce max 25 paths', async () => {
        const paths = Array.from({ length: 30 }, (_, i) => `/file${i}.jpg`);

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/25/);
    });

    it('should return 400 if paths is empty or missing', async () => {
        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({});

        expect(res.status).toBe(400);
    });

    it('should return 503 when Dropbox is disabled', async () => {
        // Temporarily override getDropboxClient to return null
        const dropboxService = require('../../dropbox-service');
        const original = dropboxService.getDropboxClient;
        dropboxService.getDropboxClient = () => null;

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/photo.jpg'] });

        expect(res.status).toBe(503);
        dropboxService.getDropboxClient = original;
    });

    it('should return 500 on Dropbox API error', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockRejectedValue(new Error('API error'));

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/photo.jpg'] });

        expect(res.status).toBe(500);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: New tests FAIL (endpoint doesn't exist yet), existing tests still pass.

- [ ] **Step 3: Implement POST /api/dropbox/thumbnails endpoint**

Add to `routes/dropbox.js` before `module.exports`:

```js
const { getDropboxClient } = require('../dropbox-service');

/**
 * POST /api/dropbox/thumbnails
 * Batch fetch thumbnails from Dropbox.
 *
 * Body: { paths: string[] } (max 25)
 * Returns: { thumbnails: [{ path: string, data: string|null }] }
 */
router.post('/thumbnails', async (req, res) => {
    try {
        const { paths } = req.body;
        if (!Array.isArray(paths) || paths.length === 0) {
            return res.status(400).json({ success: false, error: 'paths array is required' });
        }
        if (paths.length > 25) {
            return res.status(400).json({ success: false, error: 'Maximum 25 paths per request' });
        }

        const dbx = getDropboxClient();
        if (!dbx) {
            return res.status(503).json({ success: false, error: 'Dropbox is not configured' });
        }

        const response = await dbx.filesGetThumbnailBatch({
            entries: paths.map(p => ({
                path: p,
                format: { '.tag': 'jpeg' },
                size: { '.tag': 'w64h64' },
            })),
        });

        const thumbnails = response.result.entries.map(entry => {
            if (entry['.tag'] === 'success') {
                return { path: entry.metadata.path_display, data: entry.thumbnail };
            }
            // For failures (unsupported format, not found, etc.), return null data
            const failPath = entry.metadata?.path_display || entry.failure?.path || null;
            return { path: failPath, data: null };
        });

        res.json({ thumbnails });
    } catch (error) {
        console.error('Dropbox thumbnails error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch thumbnails' });
    }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: All tests PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add routes/dropbox.js tests/routes/dropbox.test.js
git commit -m "feat(dropbox): add POST /thumbnails endpoint with batch Dropbox thumbnail fetching"
```

---

### Task 2: Add temp-link endpoint with tests

**Files:**
- Modify: `tests/routes/dropbox.test.js`
- Modify: `routes/dropbox.js`

- [ ] **Step 1: Write failing tests for GET /api/dropbox/temp-link**

Add to `tests/routes/dropbox.test.js`:

```js
describe('GET /api/dropbox/temp-link', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return a temporary link for a file', async () => {
        mockDbxClient.filesGetTemporaryLink.mockResolvedValue({
            result: { link: 'https://dl.dropboxusercontent.com/temp/file.jpg' },
        });

        const res = await request(app)
            .get('/api/dropbox/temp-link')
            .query({ path: '/photo.jpg' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.link).toBe('https://dl.dropboxusercontent.com/temp/file.jpg');
        expect(mockDbxClient.filesGetTemporaryLink).toHaveBeenCalledWith({ path: '/photo.jpg' });
    });

    it('should return 400 if path is missing', async () => {
        const res = await request(app).get('/api/dropbox/temp-link');
        expect(res.status).toBe(400);
    });

    it('should return 503 when Dropbox is disabled', async () => {
        const dropboxService = require('../../dropbox-service');
        const original = dropboxService.getDropboxClient;
        dropboxService.getDropboxClient = () => null;

        const res = await request(app)
            .get('/api/dropbox/temp-link')
            .query({ path: '/photo.jpg' });

        expect(res.status).toBe(503);
        dropboxService.getDropboxClient = original;
    });

    it('should return 500 on Dropbox API error', async () => {
        mockDbxClient.filesGetTemporaryLink.mockRejectedValue(new Error('Not found'));

        const res = await request(app)
            .get('/api/dropbox/temp-link')
            .query({ path: '/missing.jpg' });

        expect(res.status).toBe(500);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: New tests FAIL, existing tests pass.

- [ ] **Step 3: Implement GET /api/dropbox/temp-link endpoint**

Add to `routes/dropbox.js` before `module.exports`:

```js
/**
 * GET /api/dropbox/temp-link
 * Get a temporary direct download link for a Dropbox file.
 *
 * Query params:
 *   path - Dropbox file path (required)
 * Returns: { success: true, link: string }
 */
router.get('/temp-link', async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'path query parameter is required' });
        }

        const dbx = getDropboxClient();
        if (!dbx) {
            return res.status(503).json({ success: false, error: 'Dropbox is not configured' });
        }

        const response = await dbx.filesGetTemporaryLink({ path: filePath });
        res.json({ success: true, link: response.result.link });
    } catch (error) {
        console.error('Dropbox temp-link error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to get temporary link' });
    }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add routes/dropbox.js tests/routes/dropbox.test.js
git commit -m "feat(dropbox): add GET /temp-link endpoint for preview modal"
```

---

## Chunk 2: State Rename + CSS Foundation

### Task 3: Rename selectedFiles → exhibitAssignments

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

This is a pure rename — no behavior change. Every reference to `selectedFiles` becomes `exhibitAssignments`.

- [ ] **Step 1: Rename all references**

In `forms/exhibits/js/dropbox-browser.js`, replace all occurrences of `selectedFiles` with `exhibitAssignments`. There are 9 references across 8 lines:
- Line 8: `const selectedFiles = new Map();`
- Line 118: `!selectedFiles.has(l) || selectedFiles.get(l).length === 0`
- Line 181: `selectedFiles.delete(letter);`
- Line 188: `if (!selectedFiles.has(letter)) selectedFiles.set(letter, []);`
- Line 189: `const files = selectedFiles.get(letter);`
- Line 210: `const files = selectedFiles.get(letter) || [];`
- Line 241: `for (const [letter, files] of selectedFiles.entries())`
- Line 249: `for (const files of selectedFiles.values())`

- [ ] **Step 2: Verify existing behavior unchanged**

Run: `npx jest tests/routes/dropbox.test.js tests/routes/exhibits-dropbox.test.js --verbose`
Expected: All tests pass (server-side tests unaffected by frontend rename, but confirms no import issues).

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "refactor(dropbox): rename selectedFiles to exhibitAssignments for clarity"
```

---

### Task 4: Add CSS for thumbnails, checkboxes, selection toolbar, and preview modal

**Files:**
- Modify: `forms/exhibits/styles.css`

- [ ] **Step 1: Add all new CSS classes**

Append to `forms/exhibits/styles.css` after the existing Dropbox/exhibit slot styles (after line ~1110):

```css
/* === DROPBOX THUMBNAILS & MULTI-SELECT === */

.dropbox-entry .entry-checkbox {
    margin: 0;
    cursor: pointer;
    flex-shrink: 0;
}

.dropbox-entry .thumbnail {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
}

.dropbox-entry .thumbnail-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background: #f5f5f5;
    border: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 18px;
}

.dropbox-entry.checked {
    background: #e8f0fe;
}

.dropbox-entry.checked:hover {
    background: #d3e3fd;
}

.dropbox-nav .select-all-label {
    font-size: 0.85em;
    color: #555;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
}

/* === SELECTION TOOLBAR === */

.selection-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #1a73e8;
    color: white;
    font-size: 0.9em;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.selection-toolbar .selection-count {
    font-weight: 600;
}

.selection-toolbar .selection-actions {
    display: flex;
    gap: 6px;
    align-items: center;
}

.selection-toolbar select {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 0.9em;
}

.selection-toolbar select option {
    color: #333;
    background: white;
}

.selection-toolbar .btn-assign {
    padding: 4px 12px;
    background: white;
    color: #1a73e8;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9em;
}

.selection-toolbar .btn-assign:hover {
    background: #e8e8e8;
}

/* === PREVIEW MODAL === */

.preview-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-modal {
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    border-radius: 8px;
    overflow: hidden;
    min-width: 500px;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
}

.preview-header .preview-file-info {
    overflow: hidden;
}

.preview-header .preview-filename {
    font-weight: 600;
    font-size: 0.95em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.preview-header .preview-meta {
    font-size: 0.75em;
    color: #aaa;
    margin-top: 2px;
}

.preview-header .preview-nav {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-shrink: 0;
}

.preview-header .preview-nav button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
}

.preview-header .preview-nav button:hover {
    background: rgba(255, 255, 255, 0.1);
}

.preview-header .preview-nav button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.preview-header .preview-counter {
    font-size: 0.8em;
    color: #aaa;
}

.preview-header .btn-close-preview {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    margin-left: 12px;
}

.preview-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 350px;
    padding: 20px;
    overflow: auto;
}

.preview-body img {
    max-width: 100%;
    max-height: 60vh;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.preview-body canvas {
    max-width: 100%;
    max-height: 60vh;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.preview-body .preview-spinner {
    color: #aaa;
    font-size: 0.95em;
}

.preview-body .preview-error {
    color: #ff6b6b;
    font-size: 0.95em;
}

.preview-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
}

.preview-footer .preview-status {
    font-size: 0.85em;
    color: #aaa;
}

.preview-footer .preview-status.assigned {
    color: #4caf50;
}

.preview-footer .preview-assign {
    display: flex;
    gap: 8px;
    align-items: center;
}

.preview-footer select {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 0.85em;
}

.preview-footer select option {
    color: #333;
    background: white;
}

.preview-footer .btn-preview-assign {
    padding: 4px 12px;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85em;
}

.preview-footer .btn-preview-assign:hover {
    background: #1557b0;
}
```

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "style(exhibits): add CSS for thumbnails, multi-select toolbar, and preview modal"
```

---

## Chunk 3: Thumbnails + Checkboxes in File List

### Task 5: Add thumbnail placeholders and checkboxes to file list rendering

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`
- Modify: `forms/exhibits/index.html`

- [ ] **Step 1: Add new state variables**

In `forms/exhibits/js/dropbox-browser.js`, after line 9 (`const LETTERS = ...`), add:

```js
    const checkedFiles = new Set(); // Dropbox paths of checked files in current folder
    const thumbnailCache = new Map(); // path -> base64 data (persists across folder navigation)
    let currentEntries = []; // entries from current folder (for preview navigation)
    let thumbnailAbortController = null; // AbortController for in-flight thumbnail requests
    let lastUsedLetter = 'A'; // remembers last exhibit letter used for assignment
```

- [ ] **Step 2: Update renderFileList to include checkboxes and thumbnail placeholders**

Replace the existing `renderFileList` function body in `forms/exhibits/js/dropbox-browser.js`. The new version adds a checkbox per supported file, a thumbnail placeholder (or cached thumbnail), and wires click handlers for preview modal.

```js
    function renderFileList(entries) {
        const fileList = document.getElementById('dropbox-file-list');
        checkedFiles.clear();

        if (entries.length === 0) {
            fileList.innerHTML = '<div class="empty">Empty folder</div>';
            currentEntries = [];
            renderSelectionToolbar();
            return;
        }

        const sorted = [...entries].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        currentEntries = sorted;

        fileList.innerHTML = sorted.map((entry, index) => {
            const isFile = entry.type === 'file';
            const isSupported = isFile && entry.supported;
            const disabledClass = (isFile && !entry.supported) ? 'disabled' : '';
            const tooltip = disabledClass ? 'title="Unsupported file type"' : '';
            const draggable = isSupported ? 'draggable="true"' : '';

            // Checkbox (only for supported files)
            const checkbox = isSupported
                ? `<input type="checkbox" class="entry-checkbox" data-path="${escapeAttr(entry.path)}">`
                : '';

            // Thumbnail or icon
            let thumbnailHtml;
            if (!isFile) {
                thumbnailHtml = '<span class="entry-icon">📁</span>';
            } else if (thumbnailCache.has(entry.path)) {
                thumbnailHtml = `<img class="thumbnail" src="data:image/jpeg;base64,${thumbnailCache.get(entry.path)}" alt="">`;
            } else {
                const ext = (entry.extension || '').toLowerCase();
                const isPdf = ext === 'pdf';
                const icon = !entry.supported ? '⚠️' : isPdf ? '📄' : '🖼️';
                thumbnailHtml = `<div class="thumbnail-placeholder" data-path="${escapeAttr(entry.path)}">${icon}</div>`;
            }

            const sizeStr = entry.size ? formatSize(entry.size) : '';

            return `
                <div class="dropbox-entry ${entry.type} ${disabledClass}" ${tooltip}
                     data-path="${escapeAttr(entry.path)}"
                     data-name="${escapeAttr(entry.name)}"
                     data-type="${entry.type}"
                     data-index="${index}"
                     ${draggable}>
                    ${checkbox}
                    ${thumbnailHtml}
                    <span class="entry-name">${escapeHtml(entry.name)}</span>
                    <span class="entry-size">${sizeStr}</span>
                </div>
            `;
        }).join('');

        // Wire folder click handlers
        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.addEventListener('click', () => loadFolder(el.dataset.path));
        });

        // Wire checkbox handlers
        fileList.querySelectorAll('.entry-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                const path = cb.dataset.path;
                const row = cb.closest('.dropbox-entry');
                if (cb.checked) {
                    checkedFiles.add(path);
                    row.classList.add('checked');
                } else {
                    checkedFiles.delete(path);
                    row.classList.remove('checked');
                }
                renderSelectionToolbar();
                updateSelectAllCheckbox();
            });
            // Prevent checkbox click from triggering preview
            cb.addEventListener('click', (e) => e.stopPropagation());
        });

        // Wire file click for preview modal (click on name or thumbnail, not checkbox)
        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('click', (e) => {
                // Don't open preview if clicking checkbox
                if (e.target.classList.contains('entry-checkbox')) return;
                const index = parseInt(el.dataset.index);
                openPreviewModal(index);
            });
        });

        // Wire drag handlers (single + multi)
        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                const filePath = el.dataset.path;
                if (checkedFiles.has(filePath) && checkedFiles.size > 1) {
                    // Multi-drag: serialize all checked files
                    const files = [];
                    checkedFiles.forEach(p => {
                        const entry = currentEntries.find(ent => ent.path === p);
                        if (entry) files.push({ dropboxPath: entry.path, name: entry.name });
                    });
                    e.dataTransfer.setData('application/json', JSON.stringify(files));
                } else {
                    // Single drag
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        dropboxPath: el.dataset.path,
                        name: el.dataset.name,
                    }));
                }
                e.dataTransfer.effectAllowed = 'copy';
            });

            el.addEventListener('dblclick', () => {
                const emptySlot = LETTERS.find(l => !exhibitAssignments.has(l) || exhibitAssignments.get(l).length === 0);
                if (emptySlot) {
                    addFileToSlot(emptySlot, { dropboxPath: el.dataset.path, name: el.dataset.name });
                }
            });
        });

        // Wire folder drag
        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    folderPath: el.dataset.path,
                    name: el.dataset.name,
                    type: 'folder',
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        renderSelectionToolbar();
        loadThumbnails(sorted);
    }
```

- [ ] **Step 3: Add Select All checkbox to breadcrumb nav in HTML**

In `forms/exhibits/index.html`, update the dropbox nav area (around line 43) to include Select All. Find the existing nav section:

```html
            <div class="dropbox-nav">
                <div class="dropbox-breadcrumb" id="dropbox-breadcrumb">
                    <span class="breadcrumb-item" data-path="/">/</span>
                </div>
                <button type="button" id="btn-dropbox-refresh" class="btn-small" title="Refresh">↻</button>
            </div>
```

Replace with:

```html
            <div class="dropbox-nav">
                <div class="dropbox-breadcrumb" id="dropbox-breadcrumb">
                    <span class="breadcrumb-item" data-path="/">/</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label class="select-all-label">
                        <input type="checkbox" id="dropbox-select-all"> Select All
                    </label>
                    <button type="button" id="btn-dropbox-refresh" class="btn-small" title="Refresh">↻</button>
                </div>
            </div>
```

- [ ] **Step 4: Add toggleSelectAll and updateSelectAllCheckbox functions**

In `dropbox-browser.js`, add these functions after the `renderFileList` function:

```js
    function toggleSelectAll() {
        const selectAllCb = document.getElementById('dropbox-select-all');
        const checkboxes = document.querySelectorAll('#dropbox-file-list .entry-checkbox');

        if (selectAllCb.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                checkedFiles.add(cb.dataset.path);
                cb.closest('.dropbox-entry').classList.add('checked');
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
                checkedFiles.delete(cb.dataset.path);
                cb.closest('.dropbox-entry').classList.remove('checked');
            });
        }
        renderSelectionToolbar();
    }

    function updateSelectAllCheckbox() {
        const selectAllCb = document.getElementById('dropbox-select-all');
        if (!selectAllCb) return;
        const checkboxes = document.querySelectorAll('#dropbox-file-list .entry-checkbox');
        const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
        selectAllCb.checked = allChecked;
    }
```

- [ ] **Step 5: Wire Select All in init()**

In the `init()` function, add after the refresh button handler:

```js
        const selectAllCb = document.getElementById('dropbox-select-all');
        if (selectAllCb) {
            selectAllCb.addEventListener('change', toggleSelectAll);
        }
```

- [ ] **Step 6: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js forms/exhibits/index.html
git commit -m "feat(dropbox): add checkboxes, thumbnail placeholders, and multi-select to file list"
```

---

### Task 6: Implement thumbnail loading from Dropbox API

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

- [ ] **Step 1: Add loadThumbnails function**

Add after `updateSelectAllCheckbox` in `dropbox-browser.js`:

```js
    async function loadThumbnails(entries) {
        // Abort any in-flight requests from previous folder
        if (thumbnailAbortController) {
            thumbnailAbortController.abort();
        }
        thumbnailAbortController = new AbortController();
        const signal = thumbnailAbortController.signal;

        // Filter to supported image files only (Dropbox API doesn't thumbnail PDFs)
        const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic']);
        const imageEntries = entries.filter(e =>
            e.type === 'file' && e.supported && IMAGE_EXTENSIONS.has((e.extension || '').toLowerCase())
            && !thumbnailCache.has(e.path)
        );

        if (imageEntries.length === 0) return;

        // Chunk into batches of 25
        const chunks = [];
        for (let i = 0; i < imageEntries.length; i += 25) {
            chunks.push(imageEntries.slice(i, i + 25));
        }

        for (const chunk of chunks) {
            if (signal.aborted) return;

            try {
                const res = await fetch('/api/dropbox/thumbnails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paths: chunk.map(e => e.path) }),
                    signal,
                });

                if (!res.ok) continue;
                const data = await res.json();

                for (const thumb of data.thumbnails) {
                    if (thumb.data && thumb.path) {
                        thumbnailCache.set(thumb.path, thumb.data);
                        // Swap placeholder in DOM
                        const placeholder = document.querySelector(
                            `.thumbnail-placeholder[data-path="${CSS.escape(thumb.path)}"]`
                        );
                        if (placeholder) {
                            const img = document.createElement('img');
                            img.className = 'thumbnail';
                            img.src = `data:image/jpeg;base64,${thumb.data}`;
                            img.alt = '';
                            placeholder.replaceWith(img);
                        }
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Thumbnail batch error:', err);
            }
        }
    }
```

- [ ] **Step 2: Verify thumbnails load visually**

Manual test: Open the exhibit collector, click "Import from Dropbox", navigate to a folder with image files. Verify:
- File list appears immediately with placeholder icons
- Thumbnails progressively replace placeholders
- PDF files keep their 📄 placeholder icon
- Navigating to a new folder aborts previous thumbnail loading

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "feat(dropbox): load thumbnails progressively from Dropbox API with caching"
```

---

## Chunk 4: Selection Toolbar + Multi-Drag Drop Handler

### Task 7: Implement selection toolbar

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

- [ ] **Step 1: Add renderSelectionToolbar and assignCheckedFiles functions**

Add in `dropbox-browser.js`:

```js
    function renderSelectionToolbar() {
        const fileList = document.getElementById('dropbox-file-list');
        // Remove existing toolbar if present
        const existing = fileList.parentElement.querySelector('.selection-toolbar');
        if (existing) existing.remove();

        if (checkedFiles.size === 0) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'selection-toolbar';

        const letterOptions = LETTERS.map(l =>
            `<option value="${l}" ${l === lastUsedLetter ? 'selected' : ''}>Exhibit ${l}</option>`
        ).join('');

        toolbar.innerHTML = `
            <span class="selection-count">${checkedFiles.size} file${checkedFiles.size !== 1 ? 's' : ''} selected</span>
            <div class="selection-actions">
                <select class="toolbar-letter-select">${letterOptions}</select>
                <button type="button" class="btn-assign">Assign</button>
            </div>
        `;

        toolbar.querySelector('.btn-assign').addEventListener('click', () => {
            const letter = toolbar.querySelector('.toolbar-letter-select').value;
            assignCheckedFiles(letter);
        });

        toolbar.querySelector('.toolbar-letter-select').addEventListener('change', (e) => {
            lastUsedLetter = e.target.value;
        });

        // Insert toolbar after the file list (inside the dropbox-browser container)
        fileList.after(toolbar);
    }

    function assignCheckedFiles(letter) {
        lastUsedLetter = letter;
        checkedFiles.forEach(path => {
            const entry = currentEntries.find(e => e.path === path);
            if (entry) {
                addFileToSlot(letter, { dropboxPath: entry.path, name: entry.name });
            }
        });
        // Clear selections
        checkedFiles.clear();
        document.querySelectorAll('#dropbox-file-list .dropbox-entry.checked').forEach(el => {
            el.classList.remove('checked');
        });
        document.querySelectorAll('#dropbox-file-list .entry-checkbox').forEach(cb => {
            cb.checked = false;
        });
        updateSelectAllCheckbox();
        renderSelectionToolbar();
    }
```

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "feat(dropbox): add selection toolbar with exhibit assignment"
```

---

### Task 8: Update drop handler for multi-drag arrays

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

- [ ] **Step 1: Update the drop handler in renderExhibitSlots**

In `renderExhibitSlots()`, replace the existing drop handler:

```js
            slot.addEventListener('drop', async (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const letter = slot.dataset.letter;
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (data.type === 'folder') {
                    await addFolderToSlot(letter, data.folderPath);
                } else {
                    addFileToSlot(letter, data);
                }
            });
```

With:

```js
            slot.addEventListener('drop', async (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const letter = slot.dataset.letter;
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (Array.isArray(data)) {
                    // Multi-drag: array of files
                    for (const file of data) {
                        addFileToSlot(letter, file);
                    }
                } else if (data.type === 'folder') {
                    await addFolderToSlot(letter, data.folderPath);
                } else {
                    addFileToSlot(letter, data);
                }
            });
```

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "feat(dropbox): support multi-file drag-and-drop to exhibit slots"
```

---

## Chunk 5: Preview Modal

### Task 9: Add preview modal HTML container

**Files:**
- Modify: `forms/exhibits/index.html`

- [ ] **Step 1: Add modal container to HTML**

In `forms/exhibits/index.html`, add the preview modal container just before the closing `</body>` tag (or just before the script tags at the bottom):

```html
    <!-- Dropbox Preview Modal -->
    <div id="preview-modal-overlay" class="preview-modal-overlay" style="display: none;">
        <div class="preview-modal">
            <div class="preview-header">
                <div class="preview-file-info">
                    <div class="preview-filename" id="preview-filename"></div>
                    <div class="preview-meta" id="preview-meta"></div>
                </div>
                <div class="preview-nav">
                    <button type="button" id="btn-preview-prev">◀ Prev</button>
                    <span class="preview-counter" id="preview-counter"></span>
                    <button type="button" id="btn-preview-next">Next ▶</button>
                    <button type="button" class="btn-close-preview" id="btn-close-preview">✕</button>
                </div>
            </div>
            <div class="preview-body" id="preview-body">
                <span class="preview-spinner">Loading preview...</span>
            </div>
            <div class="preview-footer">
                <span class="preview-status" id="preview-status"></span>
                <div class="preview-assign">
                    <select id="preview-letter-select"></select>
                    <button type="button" class="btn-preview-assign" id="btn-preview-assign">Assign →</button>
                </div>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/index.html
git commit -m "feat(dropbox): add preview modal HTML container"
```

---

### Task 10: Implement preview modal logic

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

- [ ] **Step 1: Add preview modal state and helper**

Add near the top state variables (after the ones added in Task 5):

```js
    let previewIndex = -1; // current index in currentEntries being previewed
```

Add a helper to find the exhibit assignment status for a file:

```js
    function getFileAssignment(dropboxPath) {
        for (const [letter, files] of exhibitAssignments.entries()) {
            if (files.some(f => f.dropboxPath === dropboxPath)) return letter;
        }
        return null;
    }
```

- [ ] **Step 2: Add openPreviewModal function**

```js
    function openPreviewModal(index) {
        const entry = currentEntries[index];
        if (!entry || entry.type !== 'file' || !entry.supported) return;

        previewIndex = index;
        const overlay = document.getElementById('preview-modal-overlay');
        overlay.style.display = 'flex';

        // Populate letter dropdown
        const letterSelect = document.getElementById('preview-letter-select');
        letterSelect.innerHTML = LETTERS.map(l =>
            `<option value="${l}" ${l === lastUsedLetter ? 'selected' : ''}>Exhibit ${l}</option>`
        ).join('');

        // Wire event listeners (remove old ones first via clone trick)
        const btnPrev = document.getElementById('btn-preview-prev');
        const btnNext = document.getElementById('btn-preview-next');
        const btnClose = document.getElementById('btn-close-preview');
        const btnAssign = document.getElementById('btn-preview-assign');

        btnPrev.onclick = () => navigatePreview(-1);
        btnNext.onclick = () => navigatePreview(1);
        btnClose.onclick = closePreviewModal;
        btnAssign.onclick = () => {
            const letter = letterSelect.value;
            handleAssignFromModal(letter);
        };
        letterSelect.onchange = () => { lastUsedLetter = letterSelect.value; };

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) closePreviewModal();
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', previewKeyHandler);

        renderPreviewContent(entry);
    }
```

- [ ] **Step 3: Add renderPreviewContent function**

```js
    async function renderPreviewContent(entry) {
        const body = document.getElementById('preview-body');
        const filename = document.getElementById('preview-filename');
        const meta = document.getElementById('preview-meta');
        const counter = document.getElementById('preview-counter');
        const status = document.getElementById('preview-status');

        // Update header info
        filename.textContent = entry.name;
        const sizeStr = entry.size ? formatSize(entry.size) : '';
        const fileExt = (entry.extension || '').toUpperCase();
        meta.textContent = [sizeStr, fileExt].filter(Boolean).join(' · ');

        // Update counter (count only supported files)
        const supportedFiles = currentEntries.filter(e => e.type === 'file' && e.supported);
        const currentNum = supportedFiles.findIndex(e => e.path === entry.path) + 1;
        counter.textContent = `${currentNum} of ${supportedFiles.length}`;

        // Update prev/next button states
        const prevFile = findAdjacentFile(previewIndex, -1);
        const nextFile = findAdjacentFile(previewIndex, 1);
        document.getElementById('btn-preview-prev').disabled = prevFile === -1;
        document.getElementById('btn-preview-next').disabled = nextFile === -1;

        // Update assignment status
        const assignedLetter = getFileAssignment(entry.path);
        if (assignedLetter) {
            status.textContent = `✓ Already in Exhibit ${assignedLetter}`;
            status.className = 'preview-status assigned';
        } else {
            status.textContent = '';
            status.className = 'preview-status';
        }

        // Show loading
        body.innerHTML = '<span class="preview-spinner">Loading preview...</span>';

        try {
            const res = await fetch(`/api/dropbox/temp-link?path=${encodeURIComponent(entry.path)}`);
            const data = await res.json();

            if (!data.success || !data.link) {
                body.innerHTML = '<span class="preview-error">Failed to load preview</span>';
                return;
            }

            const ext = (entry.extension || '').toLowerCase();
            const isPdf = ext === 'pdf';

            if (isPdf) {
                // Render PDF first page via PDF.js
                body.innerHTML = '';
                try {
                    const pdf = await pdfjsLib.getDocument(data.link).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    body.innerHTML = '';
                    body.appendChild(canvas);
                } catch (pdfErr) {
                    // Fallback to iframe
                    console.warn('PDF.js failed, falling back to iframe:', pdfErr);
                    body.innerHTML = `<iframe src="${data.link}" style="width:100%;height:60vh;border:none;border-radius:4px;"></iframe>`;
                }
            } else {
                // Image
                const img = document.createElement('img');
                img.src = data.link;
                img.alt = entry.name;
                img.onload = () => { body.innerHTML = ''; body.appendChild(img); };
                img.onerror = () => { body.innerHTML = '<span class="preview-error">Failed to load image</span>'; };
            }
        } catch (err) {
            body.innerHTML = '<span class="preview-error">Failed to load preview</span>';
            console.error('Preview load error:', err);
        }
    }
```

- [ ] **Step 4: Add navigation, close, assign, and keyboard handler functions**

```js
    function findAdjacentFile(fromIndex, direction) {
        let i = fromIndex + direction;
        while (i >= 0 && i < currentEntries.length) {
            const entry = currentEntries[i];
            if (entry.type === 'file' && entry.supported) return i;
            i += direction;
        }
        return -1;
    }

    function navigatePreview(direction) {
        const nextIndex = findAdjacentFile(previewIndex, direction);
        if (nextIndex === -1) return;
        previewIndex = nextIndex;
        renderPreviewContent(currentEntries[previewIndex]);
    }

    function closePreviewModal() {
        document.getElementById('preview-modal-overlay').style.display = 'none';
        document.removeEventListener('keydown', previewKeyHandler);
        previewIndex = -1;
    }

    function handleAssignFromModal(letter) {
        const entry = currentEntries[previewIndex];
        if (!entry) return;

        lastUsedLetter = letter;
        addFileToSlot(letter, { dropboxPath: entry.path, name: entry.name });

        // Try to advance to next file
        const nextIndex = findAdjacentFile(previewIndex, 1);
        if (nextIndex === -1) {
            // Last file — close modal
            closePreviewModal();
        } else {
            previewIndex = nextIndex;
            renderPreviewContent(currentEntries[previewIndex]);
        }
    }

    function previewKeyHandler(e) {
        if (document.getElementById('preview-modal-overlay').style.display === 'none') return;

        switch (e.key) {
            case 'Escape':
                closePreviewModal();
                break;
            case 'ArrowLeft':
                navigatePreview(-1);
                break;
            case 'ArrowRight':
                navigatePreview(1);
                break;
            case 'Enter':
                e.preventDefault();
                const letter = document.getElementById('preview-letter-select').value;
                handleAssignFromModal(letter);
                break;
        }
    }
```

- [ ] **Step 5: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "feat(dropbox): implement preview modal with navigation, assign, and keyboard shortcuts"
```

---

## Chunk 6: Integration + Final Verification

### Task 11: Update module exports and final wiring

**Files:**
- Modify: `forms/exhibits/js/dropbox-browser.js`

- [ ] **Step 1: Update the return statement to expose new public methods**

Update the `return` at the bottom of the IIFE:

```js
    return { getExhibitMapping, getTotalFiles, loadFolder };
```

To:

```js
    return { getExhibitMapping, getTotalFiles, loadFolder, openPreviewModal };
```

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js
git commit -m "feat(dropbox): expose openPreviewModal in public API"
```

---

### Task 12: Run all tests and verify

**Files:** None (verification only)

- [ ] **Step 1: Run the full exhibit test suite**

Run: `npx jest tests/ --testPathPattern="(dropbox|exhibit)" --verbose`
Expected: All tests pass (existing + new endpoint tests).

- [ ] **Step 2: Manual integration test**

Open the exhibit collector in the browser. Verify all flows:

1. **Thumbnails**: Navigate to a folder with images → thumbnails load progressively, PDFs keep icon
2. **Select All**: Check "Select All" → all file checkboxes toggle, toolbar appears
3. **Multi-select assign**: Check 3 files → toolbar shows "3 files selected" → pick exhibit → click Assign → files appear in slot
4. **Multi-drag**: Check 2 files → drag one → both land in exhibit slot
5. **Preview modal**: Click a file → modal opens with preview → arrow keys navigate → Escape closes
6. **Quick assign**: In modal, pick exhibit → click "Assign →" → auto-advances to next file
7. **Keyboard**: Enter assigns, arrows navigate, Escape closes
8. **Status indicator**: Assign a file, re-open preview for it → shows "✓ Already in Exhibit A"
9. **Existing flows**: Single drag-and-drop still works, folder drop still works, double-click auto-assign works
10. **Generate**: After assigning files, click Generate → processing pipeline works unchanged

- [ ] **Step 3: Final commit if any fixes needed**

If fixes are needed during manual testing, commit them:
```bash
git add -A
git commit -m "fix(dropbox): address integration issues from manual testing"
```

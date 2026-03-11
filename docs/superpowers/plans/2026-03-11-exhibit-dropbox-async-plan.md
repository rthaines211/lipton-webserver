# Exhibit Collector: Dropbox Integration + Async Processing — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the exhibit collector to pull files directly from Dropbox via an in-app file browser and process large exhibit sets (200-1000 files) asynchronously via Cloud Run Jobs.

**Architecture:** Two new layers on top of the existing exhibit processing pipeline: (1) a Dropbox file browser UI + server-side file ingestion that replaces browser uploads, and (2) an async processing mode using Cloud Run Jobs + PostgreSQL job persistence for large sets. The existing duplicate detection, PDF assembly, and Bates stamping pipeline remains unchanged.

**Tech Stack:** Node.js/Express, Dropbox SDK (`dropbox` npm), Google Cloud Run Jobs (`@google-cloud/run`), PostgreSQL (`pg`), SendGrid (`@sendgrid/mail`), Sharp, pdf-lib, PDF.js + `canvas` npm (server-side thumbnails)

**Spec:** `docs/superpowers/specs/2026-03-11-exhibit-collector-dropbox-async-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `services/dropbox-browser.js` | Dropbox folder listing + file download. Reuses client from `dropbox-service.js` |
| `services/async-job-manager.js` | CRUD for `exhibit_jobs` table, Cloud Run Job dispatch, progress updates |
| `routes/dropbox.js` | `GET /api/dropbox/list` — folder browsing API |
| `routes/jobs.js` | `GET /api/jobs`, `GET /api/jobs/:id` — jobs dashboard API |
| `job-entrypoint.js` | Cloud Run Job CMD: reads JOB_ID from env, loads config from DB, runs pipeline |
| `migrations/005_create_exhibit_jobs_table.sql` | Database migration for `exhibit_jobs` table |
| `forms/exhibits/js/dropbox-browser.js` | File explorer UI + exhibit assignment panel |
| `forms/exhibits/js/jobs-dashboard.js` | Jobs list, polling, download links |
| `tests/services/dropbox-browser.test.js` | Tests for Dropbox browsing/download service |
| `tests/services/async-job-manager.test.js` | Tests for job persistence + dispatch |
| `tests/routes/dropbox.test.js` | Tests for Dropbox API routes |
| `tests/routes/jobs.test.js` | Tests for jobs dashboard routes |

### Modified Files
| File | Changes |
|------|---------|
| `dropbox-service.js` | Extract `getDropboxClient()` lazy-init factory |
| `services/exhibit-processor.js` | Support disk-based file input (alongside memory buffers), generate server-side thumbnails for duplicate previews |
| `routes/exhibits.js` | New `POST /api/exhibits/generate-from-dropbox` endpoint |
| `forms/exhibits/index.html` | Add Dropbox browser panel, exhibit assignment panel, jobs dashboard tab |
| `forms/exhibits/js/form-submission.js` | New Dropbox import flow, handle server-provided thumbnails |
| `forms/exhibits/js/duplicate-ui.js` | Support base64 thumbnail data URLs from server |
| `forms/exhibits/styles.css` | Dropbox browser + assignment panel + jobs dashboard styles |
| `server.js` | Mount new routes (`/api/dropbox`, `/api/jobs`) |
| `middleware/auth.js` | Add `/api/dropbox/*` and `/api/jobs/*` to bypass list |
| `.github/workflows/deploy-exhibit-collector.yml` | Bump timeout, add path triggers, add Cloud Run Job deploy |
| `package.json` | Add `@google-cloud/run`, `@sendgrid/mail`, `canvas` dependencies |

---

## Chunk 1: Foundation — Dropbox Client Refactor + Database Migration

### Task 1: Refactor Dropbox Client Initialization

Extract a shared `getDropboxClient()` factory from the module-level singleton in `dropbox-service.js` so the new `dropbox-browser.js` can reuse it.

**Files:**
- Modify: `dropbox-service.js:43-95`
- Test: `tests/services/dropbox-service.test.js` (new)

- [ ] **Step 1: Write test for `getDropboxClient()` factory**

Create `tests/services/dropbox-service.test.js`:

```javascript
const { getDropboxClient, getConfig } = require('../../dropbox-service');

describe('dropbox-service', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getDropboxClient', () => {
        it('should return null when DROPBOX_ENABLED is not true', () => {
            process.env.DROPBOX_ENABLED = 'false';
            const { getDropboxClient } = require('../../dropbox-service');
            expect(getDropboxClient()).toBeNull();
        });

        it('should return a Dropbox instance when refresh token credentials are set', () => {
            process.env.DROPBOX_ENABLED = 'true';
            process.env.DROPBOX_APP_KEY = 'test-key';
            process.env.DROPBOX_APP_SECRET = 'test-secret';
            process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh';
            const { getDropboxClient } = require('../../dropbox-service');
            const client = getDropboxClient();
            expect(client).not.toBeNull();
            expect(client).toBeDefined();
        });

        it('should return the same instance on multiple calls (cached)', () => {
            process.env.DROPBOX_ENABLED = 'true';
            process.env.DROPBOX_APP_KEY = 'test-key';
            process.env.DROPBOX_APP_SECRET = 'test-secret';
            process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh';
            const { getDropboxClient } = require('../../dropbox-service');
            const client1 = getDropboxClient();
            const client2 = getDropboxClient();
            expect(client1).toBe(client2);
        });
    });

    describe('getConfig', () => {
        it('should return config object with expected keys', () => {
            const { getConfig } = require('../../dropbox-service');
            const config = getConfig();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('basePath');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/dropbox-service.test.js --verbose`
Expected: FAIL — `getDropboxClient` is not exported

- [ ] **Step 3: Refactor `dropbox-service.js` to export `getDropboxClient()`**

Replace the module-level `let dbx = null; if (DROPBOX_CONFIG.enabled) { ... }` block (lines 59-95) with a lazy-init factory:

```javascript
// Replace lines 59-95 with:
let _dbxInstance = null;
let _dbxInitialized = false;

/**
 * Returns a cached Dropbox client instance (lazy initialization).
 * Returns null if Dropbox is disabled or no credentials provided.
 */
function getDropboxClient() {
    if (_dbxInitialized) return _dbxInstance;
    _dbxInitialized = true;

    if (!DROPBOX_CONFIG.enabled) {
        console.log('ℹ️  Dropbox service disabled');
        return null;
    }

    try {
        if (DROPBOX_CONFIG.refreshToken && DROPBOX_CONFIG.appKey && DROPBOX_CONFIG.appSecret) {
            _dbxInstance = new Dropbox({
                refreshToken: DROPBOX_CONFIG.refreshToken,
                clientId: DROPBOX_CONFIG.appKey,
                clientSecret: DROPBOX_CONFIG.appSecret
            });
            console.log('✅ Dropbox service initialized (OAuth refresh token)');
            console.log(`   Base path: ${DROPBOX_CONFIG.basePath}`);
            console.log(`   App key: ${DROPBOX_CONFIG.appKey.substring(0, 4)}...${DROPBOX_CONFIG.appKey.slice(-4)}`);
            console.log(`   Refresh token length: ${DROPBOX_CONFIG.refreshToken.length} chars`);
            console.log('   🔄 Token auto-refresh enabled (never expires)');
        } else if (DROPBOX_CONFIG.accessToken) {
            _dbxInstance = new Dropbox({ accessToken: DROPBOX_CONFIG.accessToken });
            console.log('✅ Dropbox service initialized (legacy access token)');
            console.log(`   Base path: ${DROPBOX_CONFIG.basePath}`);
            console.warn('   ⚠️  WARNING: Using short-lived access token (expires in ~4 hours)');
            console.warn('   ⚠️  Migrate to OAuth refresh tokens to prevent expiration');
        } else {
            console.warn('⚠️  Dropbox enabled but no credentials provided');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Dropbox service:', error.message);
    }

    return _dbxInstance;
}
```

Update **all** internal functions that reference `dbx` to call `getDropboxClient()` instead. Each function should start with `const dbx = getDropboxClient(); if (!dbx) ...`:

- `ensureFolderExists()` (line 156): `if (!dbx)` → `const dbx = getDropboxClient(); if (!dbx)`
- `ensureParentFoldersExist()` (line 199): `if (!dbx)` → `const dbx = getDropboxClient(); if (!dbx)`
- `uploadFile()` (line 241): `if (!dbx)` → `const dbx = getDropboxClient(); if (!dbx)`
- `uploadFiles()` (line 318): `!dbx` → `!getDropboxClient()`
- `getAccountInfo()` (line 345): `if (!dbx)` → `const dbx = getDropboxClient(); if (!dbx)`
- `createSharedLink()` (line 376): `if (!dbx || !DROPBOX_CONFIG.enabled)` → `const dbx = getDropboxClient(); if (!dbx || !DROPBOX_CONFIG.enabled)`

Update the `isEnabled()` export (line 459):
- Replace `() => DROPBOX_CONFIG.enabled && dbx !== null` with `() => DROPBOX_CONFIG.enabled && getDropboxClient() !== null`

Add to `module.exports`:
```javascript
module.exports = {
    uploadFile,
    uploadFiles,
    mapLocalPathToDropbox,
    getAccountInfo,
    createSharedLink,
    getDropboxClient,          // NEW
    getConfig: () => DROPBOX_CONFIG,  // NEW
    isEnabled: () => DROPBOX_CONFIG.enabled && getDropboxClient() !== null,
    config: DROPBOX_CONFIG
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/services/dropbox-service.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx jest --verbose`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add dropbox-service.js tests/services/dropbox-service.test.js
git commit -m "refactor(dropbox): extract getDropboxClient() lazy-init factory for reuse"
```

---

### Task 2: Database Migration — `exhibit_jobs` Table

**Files:**
- Create: `migrations/005_create_exhibit_jobs_table.sql`

- [ ] **Step 1: Create migration file**

Create `migrations/005_create_exhibit_jobs_table.sql`:

```sql
-- Migration: Create exhibit_jobs table for async exhibit processing
-- Date: 2026-03-11

CREATE TABLE IF NOT EXISTS exhibit_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    case_name VARCHAR(255) NOT NULL,
    total_files INTEGER NOT NULL,
    exhibit_mapping JSONB NOT NULL,
    dropbox_source_path VARCHAR(500),
    dropbox_output_path VARCHAR(500),
    gcs_output_url TEXT,
    email VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Partial index for active jobs (used by jobs dashboard polling)
CREATE INDEX idx_exhibit_jobs_active
    ON exhibit_jobs (status)
    WHERE status NOT IN ('complete', 'failed');

-- Index for cleanup queries
CREATE INDEX idx_exhibit_jobs_created_at ON exhibit_jobs (created_at);

-- Add status constraint
ALTER TABLE exhibit_jobs
    ADD CONSTRAINT chk_exhibit_jobs_status
    CHECK (status IN ('pending', 'downloading', 'processing', 'complete', 'failed'));
```

- [ ] **Step 2: Run migration against local database**

Run: `psql -d legal_forms_db -f migrations/005_create_exhibit_jobs_table.sql`
Expected: CREATE TABLE, CREATE INDEX (x2), ALTER TABLE all succeed

- [ ] **Step 3: Verify table exists and schema is correct**

Run: `psql -d legal_forms_db -c "\d exhibit_jobs"`
Expected: Table with all columns, UUID primary key, JSONB exhibit_mapping

- [ ] **Step 4: Commit**

```bash
git add migrations/005_create_exhibit_jobs_table.sql
git commit -m "feat(exhibits): add exhibit_jobs table migration for async processing"
```

---

### Task 3: Dropbox Browser Service — Folder Listing

**Files:**
- Create: `services/dropbox-browser.js`
- Test: `tests/services/dropbox-browser.test.js`

- [ ] **Step 1: Write tests for `listFolder()`**

Create `tests/services/dropbox-browser.test.js`:

```javascript
const DropboxBrowser = require('../../services/dropbox-browser');

// Mock the dropbox-service module
jest.mock('../../dropbox-service', () => {
    const mockClient = {
        filesListFolder: jest.fn(),
        filesListFolderContinue: jest.fn(),
        filesDownload: jest.fn(),
    };
    return {
        getDropboxClient: () => mockClient,
        getConfig: () => ({ basePath: '/Current Clients', enabled: true }),
        isEnabled: () => true,
        _mockClient: mockClient,
    };
});

const { _mockClient: mockClient } = require('../../dropbox-service');

describe('DropboxBrowser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        DropboxBrowser.clearCache();
    });

    describe('listFolder', () => {
        it('should list folder contents with metadata', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'folder', name: 'Case Files', path_lower: '/case files', path_display: '/Case Files' },
                        { '.tag': 'file', name: 'doc.pdf', path_lower: '/doc.pdf', path_display: '/doc.pdf', size: 1024, server_modified: '2026-03-01T00:00:00Z' },
                        { '.tag': 'file', name: '.DS_Store', path_lower: '/.ds_store', path_display: '/.DS_Store', size: 100, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: false,
                },
            });

            const result = await DropboxBrowser.listFolder('/');
            expect(result).toHaveLength(2); // .DS_Store filtered out
            expect(result[0]).toEqual({
                name: 'Case Files',
                type: 'folder',
                path: '/Case Files',
                size: null,
                modified: null,
                extension: null,
                supported: true,
            });
            expect(result[1]).toEqual({
                name: 'doc.pdf',
                type: 'file',
                path: '/doc.pdf',
                size: 1024,
                modified: '2026-03-01T00:00:00Z',
                extension: 'pdf',
                supported: true,
            });
        });

        it('should mark unsupported file types', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'file', name: 'doc.docx', path_lower: '/doc.docx', path_display: '/doc.docx', size: 2048, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: false,
                },
            });

            const result = await DropboxBrowser.listFolder('/');
            expect(result[0].supported).toBe(false);
        });

        it('should handle pagination (has_more)', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'file', name: 'a.pdf', path_lower: '/a.pdf', path_display: '/a.pdf', size: 100, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: true,
                    cursor: 'cursor123',
                },
            });
            mockClient.filesListFolderContinue.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'file', name: 'b.pdf', path_lower: '/b.pdf', path_display: '/b.pdf', size: 200, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: false,
                },
            });

            const result = await DropboxBrowser.listFolder('/');
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('a.pdf');
            expect(result[1].name).toBe('b.pdf');
        });

        it('should use cache on second call within TTL', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: { entries: [], has_more: false },
            });

            await DropboxBrowser.listFolder('/test');
            await DropboxBrowser.listFolder('/test');

            expect(mockClient.filesListFolder).toHaveBeenCalledTimes(1);
        });

        it('should bypass cache when refresh=true', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: { entries: [], has_more: false },
            });

            await DropboxBrowser.listFolder('/test');
            await DropboxBrowser.listFolder('/test', { refresh: true });

            expect(mockClient.filesListFolder).toHaveBeenCalledTimes(2);
        });

        it('should return null when Dropbox is disabled', async () => {
            jest.resetModules();
            jest.mock('../../dropbox-service', () => ({
                getDropboxClient: () => null,
                getConfig: () => ({ enabled: false }),
                isEnabled: () => false,
            }));
            const DB = require('../../services/dropbox-browser');
            const result = await DB.listFolder('/');
            expect(result).toBeNull();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/dropbox-browser.test.js --verbose`
Expected: FAIL — `Cannot find module '../../services/dropbox-browser'`

- [ ] **Step 3: Implement `services/dropbox-browser.js`**

Create `services/dropbox-browser.js`:

```javascript
/**
 * Dropbox Browser Service
 *
 * Provides folder listing and file download from Dropbox.
 * Reuses the Dropbox client from dropbox-service.js.
 */

const path = require('path');
const fs = require('fs').promises;
const { getDropboxClient, isEnabled } = require('../dropbox-service');

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic']);
const HIDDEN_FILES = new Set(['.ds_store', 'thumbs.db', '.thumbs', 'desktop.ini']);
const CACHE_TTL_MS = 30_000; // 30 seconds

// Simple in-memory cache for folder listings
const _cache = new Map();

/**
 * List contents of a Dropbox folder.
 *
 * @param {string} folderPath - Dropbox folder path (e.g., '/' or '/Cases/Smith')
 * @param {Object} [options]
 * @param {boolean} [options.refresh=false] - Bypass cache
 * @returns {Promise<Array|null>} Array of entries or null if Dropbox disabled
 */
async function listFolder(folderPath, { refresh = false } = {}) {
    const dbx = getDropboxClient();
    if (!dbx) return null;

    const cacheKey = folderPath.toLowerCase();

    // Check cache
    if (!refresh && _cache.has(cacheKey)) {
        const cached = _cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
        _cache.delete(cacheKey);
    }

    // Fetch from Dropbox (handle pagination)
    const allEntries = [];
    let response = await dbx.filesListFolder({ path: folderPath === '/' ? '' : folderPath });
    allEntries.push(...response.result.entries);

    while (response.result.has_more) {
        response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
        allEntries.push(...response.result.entries);
    }

    // Transform and filter
    const entries = allEntries
        .filter(entry => !HIDDEN_FILES.has(entry.name.toLowerCase()))
        .map(entry => {
            const isFile = entry['.tag'] === 'file';
            const ext = isFile ? path.extname(entry.name).slice(1).toLowerCase() : null;
            return {
                name: entry.name,
                type: entry['.tag'],
                path: entry.path_display,
                size: isFile ? entry.size : null,
                modified: isFile ? entry.server_modified : null,
                extension: ext,
                supported: isFile ? SUPPORTED_EXTENSIONS.has(ext) : true,
            };
        });

    // Cache result
    _cache.set(cacheKey, { data: entries, timestamp: Date.now() });

    return entries;
}

/**
 * Download a single file from Dropbox to a local path.
 *
 * @param {string} dropboxPath - Full Dropbox file path
 * @param {string} localDir - Local directory to save to
 * @returns {Promise<{localPath: string, name: string, size: number}>}
 */
async function downloadFile(dropboxPath, localDir) {
    const dbx = getDropboxClient();
    if (!dbx) throw new Error('Dropbox client not initialized');

    const response = await dbx.filesDownload({ path: dropboxPath });
    const fileName = response.result.name;
    const localPath = path.join(localDir, fileName);

    await fs.writeFile(localPath, response.result.fileBinary);

    return {
        localPath,
        name: fileName,
        size: response.result.size,
    };
}

/**
 * Download multiple files from Dropbox with bounded concurrency.
 *
 * @param {Array<{dropboxPath: string, letter: string}>} files - Files to download
 * @param {string} baseDir - Base local directory
 * @param {number} [concurrency=15] - Max concurrent downloads
 * @param {Function} [onProgress] - Progress callback (completed, total)
 * @returns {Promise<Map<string, Array<{localPath, name, size}>>>} Map of letter → downloaded files
 */
async function downloadFiles(files, baseDir, concurrency = 15, onProgress = null) {
    const dbx = getDropboxClient();
    if (!dbx) throw new Error('Dropbox client not initialized');

    const results = new Map();
    let completed = 0;
    const total = files.length;

    // Group by letter for directory creation
    const byLetter = new Map();
    for (const file of files) {
        if (!byLetter.has(file.letter)) byLetter.set(file.letter, []);
        byLetter.get(file.letter).push(file);
    }

    // Create letter subdirectories
    for (const letter of byLetter.keys()) {
        const letterDir = path.join(baseDir, letter);
        await fs.mkdir(letterDir, { recursive: true });
        results.set(letter, []);
    }

    // Download with bounded concurrency
    const queue = [...files];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
            const file = queue.shift();
            if (!file) break;

            const letterDir = path.join(baseDir, file.letter);
            try {
                const result = await downloadFile(file.dropboxPath, letterDir);
                results.get(file.letter).push(result);
            } catch (error) {
                console.error(`Failed to download ${file.dropboxPath}: ${error.message}`);
                throw error;
            }

            completed++;
            if (onProgress) onProgress(completed, total);
        }
    });

    await Promise.all(workers);
    return results;
}

/**
 * Clear the folder listing cache.
 */
function clearCache() {
    _cache.clear();
}

module.exports = {
    listFolder,
    downloadFile,
    downloadFiles,
    clearCache,
    SUPPORTED_EXTENSIONS,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/services/dropbox-browser.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/dropbox-browser.js tests/services/dropbox-browser.test.js
git commit -m "feat(dropbox): add Dropbox browser service with folder listing and file download"
```

---

### Task 4: Dropbox API Route

**Files:**
- Create: `routes/dropbox.js`
- Modify: `server.js:484-485`
- Modify: `middleware/auth.js:53-60`
- Test: `tests/routes/dropbox.test.js`

- [ ] **Step 1: Write route tests**

Create `tests/routes/dropbox.test.js`:

```javascript
const request = require('supertest');
const express = require('express');
const dropboxRoutes = require('../../routes/dropbox');

// Mock dropbox-browser service
jest.mock('../../services/dropbox-browser', () => ({
    listFolder: jest.fn(),
}));
const DropboxBrowser = require('../../services/dropbox-browser');

const app = express();
app.use(express.json());
app.use('/api/dropbox', dropboxRoutes);

describe('GET /api/dropbox/list', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return folder contents for root path', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([
            { name: 'Cases', type: 'folder', path: '/Cases', size: null, modified: null, extension: null, supported: true },
        ]);

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].name).toBe('Cases');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/', { refresh: false });
    });

    it('should pass refresh=true when query param set', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([]);

        await request(app).get('/api/dropbox/list?path=/Cases&refresh=true');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/Cases', { refresh: true });
    });

    it('should default path to / when not provided', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([]);

        await request(app).get('/api/dropbox/list');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/', { refresh: false });
    });

    it('should return 503 when Dropbox is disabled', async () => {
        DropboxBrowser.listFolder.mockResolvedValue(null);

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/disabled/i);
    });

    it('should return 500 on Dropbox API error', async () => {
        DropboxBrowser.listFolder.mockRejectedValue(new Error('Dropbox rate limit'));

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(500);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: FAIL — `Cannot find module '../../routes/dropbox'`

- [ ] **Step 3: Implement `routes/dropbox.js`**

Create `routes/dropbox.js`:

```javascript
const express = require('express');
const router = express.Router();
const DropboxBrowser = require('../services/dropbox-browser');

/**
 * GET /api/dropbox/list
 * List contents of a Dropbox folder.
 *
 * Query params:
 *   path    - Dropbox folder path (default: '/')
 *   refresh - Set to 'true' to bypass cache
 */
router.get('/list', async (req, res) => {
    try {
        const folderPath = req.query.path || '/';
        const refresh = req.query.refresh === 'true';

        const entries = await DropboxBrowser.listFolder(folderPath, { refresh });

        if (entries === null) {
            return res.status(503).json({
                success: false,
                error: 'Dropbox integration is disabled or not configured',
            });
        }

        res.json({ success: true, path: folderPath, entries });
    } catch (error) {
        console.error('Dropbox list error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to list Dropbox folder',
            details: error.message,
        });
    }
});

module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/routes/dropbox.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Mount route in `server.js`**

Add after the exhibit routes mount (line 485 of `server.js`):

```javascript
const dropboxRoutes = require('./routes/dropbox');
app.use('/api/dropbox', dropboxRoutes);
```

- [ ] **Step 6: Add `/api/dropbox/*` to auth bypass in `middleware/auth.js`**

Add `/api/dropbox/` to the bypass patterns list (after the `/api/exhibits/*` entry around line 57):

```javascript
'/api/dropbox/',
```

Note: This bypasses token auth. The exhibit form pages already use session-based password auth which protects these endpoints.

- [ ] **Step 7: Commit**

```bash
git add routes/dropbox.js tests/routes/dropbox.test.js server.js middleware/auth.js
git commit -m "feat(dropbox): add Dropbox folder browsing API endpoint"
```

---

### Task 5: Async Job Manager Service

**Files:**
- Create: `services/async-job-manager.js`
- Test: `tests/services/async-job-manager.test.js`

- [ ] **Step 1: Write tests for job CRUD**

Create `tests/services/async-job-manager.test.js`:

```javascript
const mockQuery = jest.fn();

// Mock pg Pool — async-job-manager creates its own pool internally
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        query: mockQuery,
    })),
}));

const AsyncJobManager = require('../../services/async-job-manager');

describe('AsyncJobManager', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('createJob', () => {
        it('should insert a job and return the row', async () => {
            const job = {
                caseName: 'Smith v Jones',
                totalFiles: 150,
                exhibitMapping: { A: [{ path: '/a.pdf', name: 'a.pdf' }] },
                dropboxSourcePath: '/Cases/Smith',
                email: 'test@example.com',
            };

            mockQuery.mockResolvedValue({
                rows: [{ id: 'uuid-123', status: 'pending', ...job }],
            });

            const result = await AsyncJobManager.createJob(job);
            expect(result.id).toBe('uuid-123');
            expect(result.status).toBe('pending');
            expect(mockQuery).toHaveBeenCalledTimes(1);
            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/INSERT INTO exhibit_jobs/);
            expect(params).toContain('Smith v Jones');
            expect(params).toContain(150);
        });
    });

    describe('getJob', () => {
        it('should return a job by ID', async () => {
            mockQuery.mockResolvedValue({
                rows: [{ id: 'uuid-123', status: 'processing', progress: 45 }],
            });

            const result = await AsyncJobManager.getJob('uuid-123');
            expect(result.status).toBe('processing');
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['uuid-123']
            );
        });

        it('should return null for non-existent job', async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const result = await AsyncJobManager.getJob('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('updateProgress', () => {
        it('should update progress and message', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });

            await AsyncJobManager.updateProgress('uuid-123', {
                status: 'processing',
                progress: 50,
                progressMessage: 'Processing files...',
            });

            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/UPDATE exhibit_jobs/);
            expect(params).toContain('processing');
            expect(params).toContain(50);
        });
    });

    describe('completeJob', () => {
        it('should set status to complete with output URLs', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });

            await AsyncJobManager.completeJob('uuid-123', {
                gcsOutputUrl: 'https://storage.googleapis.com/...',
                dropboxOutputPath: '/Cases/Smith/Exhibits.pdf',
            });

            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/status = 'complete'/);
            expect(sql).toMatch(/completed_at = NOW/);
        });
    });

    describe('failJob', () => {
        it('should set status to failed with error message', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });

            await AsyncJobManager.failJob('uuid-123', 'Out of memory');

            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/status = 'failed'/);
            expect(params).toContain('Out of memory');
        });
    });

    describe('listJobs', () => {
        it('should return recent jobs ordered by created_at desc', async () => {
            mockQuery.mockResolvedValue({
                rows: [
                    { id: 'uuid-2', status: 'processing', created_at: '2026-03-11' },
                    { id: 'uuid-1', status: 'complete', created_at: '2026-03-10' },
                ],
            });

            const result = await AsyncJobManager.listJobs();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('uuid-2');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/async-job-manager.test.js --verbose`
Expected: FAIL — `Cannot find module '../../services/async-job-manager'`

- [ ] **Step 3: Implement `services/async-job-manager.js`**

Create `services/async-job-manager.js`:

```javascript
/**
 * Async Job Manager
 *
 * Manages exhibit processing jobs in PostgreSQL for async mode.
 * Jobs are persisted to survive instance restarts and enable
 * status tracking via the jobs dashboard.
 */

const { Pool } = require('pg');

// Database connection — reuse existing pool config from environment
let _pool = null;

function getPool() {
    if (!_pool) {
        _pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return _pool;
}

/**
 * Create a new exhibit processing job.
 */
async function createJob({ caseName, totalFiles, exhibitMapping, dropboxSourcePath, email }) {
    const pool = getPool();
    const result = await pool.query(
        `INSERT INTO exhibit_jobs (case_name, total_files, exhibit_mapping, dropbox_source_path, email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [caseName, totalFiles, JSON.stringify(exhibitMapping), dropboxSourcePath, email || null]
    );
    return result.rows[0];
}

/**
 * Get a job by ID.
 */
async function getJob(jobId) {
    const pool = getPool();
    const result = await pool.query(
        'SELECT * FROM exhibit_jobs WHERE id = $1',
        [jobId]
    );
    return result.rows[0] || null;
}

/**
 * Update job progress.
 */
async function updateProgress(jobId, { status, progress, progressMessage }) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = $1, progress = $2, progress_message = $3, updated_at = NOW()
         WHERE id = $4`,
        [status, progress, progressMessage, jobId]
    );
}

/**
 * Mark job as complete.
 */
async function completeJob(jobId, { gcsOutputUrl, dropboxOutputPath }) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = 'complete', progress = 100, gcs_output_url = $1,
             dropbox_output_path = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [gcsOutputUrl, dropboxOutputPath, jobId]
    );
}

/**
 * Mark job as failed.
 */
async function failJob(jobId, errorMessage) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMessage, jobId]
    );
}

/**
 * List recent jobs (for dashboard).
 */
async function listJobs({ limit = 20 } = {}) {
    const pool = getPool();
    const result = await pool.query(
        `SELECT id, status, progress, progress_message, case_name, total_files,
                gcs_output_url, dropbox_output_path, error_message,
                created_at, updated_at, completed_at
         FROM exhibit_jobs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

module.exports = {
    createJob,
    getJob,
    updateProgress,
    completeJob,
    failJob,
    listJobs,
    getPool,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/services/async-job-manager.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/async-job-manager.js tests/services/async-job-manager.test.js
git commit -m "feat(exhibits): add async job manager with PostgreSQL persistence"
```

---

### Task 6: Jobs Dashboard API Route

**Files:**
- Create: `routes/jobs.js`
- Test: `tests/routes/jobs.test.js`
- Modify: `server.js`
- Modify: `middleware/auth.js`

- [ ] **Step 1: Write route tests**

Create `tests/routes/jobs.test.js`:

```javascript
const request = require('supertest');
const express = require('express');
const jobsRoutes = require('../../routes/jobs');

jest.mock('../../services/async-job-manager', () => ({
    listJobs: jest.fn(),
    getJob: jest.fn(),
}));
const AsyncJobManager = require('../../services/async-job-manager');

const app = express();
app.use(express.json());
app.use('/api/jobs', jobsRoutes);

describe('Jobs API', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('GET /api/jobs', () => {
        it('should return list of recent jobs', async () => {
            AsyncJobManager.listJobs.mockResolvedValue([
                { id: 'uuid-1', status: 'complete', case_name: 'Smith v Jones' },
            ]);

            const res = await request(app).get('/api/jobs');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.jobs).toHaveLength(1);
        });
    });

    describe('GET /api/jobs/:id', () => {
        it('should return a specific job', async () => {
            AsyncJobManager.getJob.mockResolvedValue({
                id: 'uuid-1', status: 'processing', progress: 42,
            });

            const res = await request(app).get('/api/jobs/uuid-1');
            expect(res.status).toBe(200);
            expect(res.body.job.progress).toBe(42);
        });

        it('should return 404 for non-existent job', async () => {
            AsyncJobManager.getJob.mockResolvedValue(null);

            const res = await request(app).get('/api/jobs/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/routes/jobs.test.js --verbose`
Expected: FAIL — `Cannot find module '../../routes/jobs'`

- [ ] **Step 3: Implement `routes/jobs.js`**

Create `routes/jobs.js`:

```javascript
const express = require('express');
const router = express.Router();
const AsyncJobManager = require('../services/async-job-manager');

/**
 * GET /api/jobs
 * List recent exhibit processing jobs.
 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const jobs = await AsyncJobManager.listJobs({ limit });
        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Failed to list jobs:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list jobs' });
    }
});

/**
 * GET /api/jobs/:id
 * Get a specific job's status and details.
 */
router.get('/:id', async (req, res) => {
    try {
        const job = await AsyncJobManager.getJob(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        res.json({ success: true, job });
    } catch (error) {
        console.error('Failed to get job:', error.message);
        res.status(500).json({ success: false, error: 'Failed to get job' });
    }
});

module.exports = router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/routes/jobs.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Mount route in `server.js` and add auth bypass**

In `server.js`, after the dropbox routes mount:
```javascript
const jobsRoutes = require('./routes/jobs');
app.use('/api/jobs', jobsRoutes);
```

In `middleware/auth.js`, the `/api/jobs/` bypass already exists (line ~58). Verify it covers the new exhibit jobs endpoints (it should, since the pattern is `/api/jobs/*`).

- [ ] **Step 6: Commit**

```bash
git add routes/jobs.js tests/routes/jobs.test.js server.js
git commit -m "feat(exhibits): add jobs dashboard API endpoints"
```

---

## Chunk 2: Exhibit Processor Disk Mode + Server Thumbnails

### Task 7: Exhibit Processor — Support Disk-Based File Input

The exhibit processor currently receives files as `{name, type, buffer}` objects from multer (in-memory). For Dropbox imports, files will be on temp disk. Add support for reading from disk paths.

**Files:**
- Modify: `services/exhibit-processor.js:93-156`
- Test: `tests/services/exhibit-processor.test.js` (add new tests)

- [ ] **Step 1: Write test for disk-based input**

Add to `tests/services/exhibit-processor.test.js`:

```javascript
describe('process with disk-based files', () => {
    it('should accept file objects with filePath instead of buffer', async () => {
        // Create a real PDF file on disk
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        const pdfBytes = await pdfDoc.save();
        const filePath = path.join(tempDir, 'test.pdf');
        fs.writeFileSync(filePath, Buffer.from(pdfBytes));

        const exhibits = {
            A: [{ name: 'test.pdf', type: 'pdf', filePath }],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'Disk Test',
            exhibits,
            outputDir: tempDir,
            onProgress: () => {},
        });

        expect(result.filename).toBeDefined();
        expect(result.pdfBuffer).toBeInstanceOf(Uint8Array);
    });

    it('should support mixed buffer and filePath inputs', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        const pdfBytes = await pdfDoc.save();

        const filePath = path.join(tempDir, 'disk.pdf');
        fs.writeFileSync(filePath, Buffer.from(pdfBytes));

        const exhibits = {
            A: [
                { name: 'memory.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes) },
                { name: 'disk.pdf', type: 'pdf', filePath },
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'Mixed Test',
            exhibits,
            outputDir: tempDir,
            onProgress: () => {},
        });

        expect(result.filename).toBeDefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose -t "disk-based"`
Expected: FAIL — processor tries to read `buffer` property which is undefined

- [ ] **Step 3: Add `getFileBuffer()` helper to exhibit processor**

Add a helper at the top of `services/exhibit-processor.js` (after the requires):

```javascript
const fsPromises = require('fs').promises;

/**
 * Get file buffer — supports both in-memory (multer) and disk-based (Dropbox) files.
 * @param {Object} file - {name, type, buffer?} or {name, type, filePath?}
 * @returns {Promise<Buffer>}
 */
async function getFileBuffer(file) {
    if (file.buffer) return file.buffer;
    if (file.filePath) return fsPromises.readFile(file.filePath);
    throw new Error(`File ${file.name} has neither buffer nor filePath`);
}
```

Then update every place in `_buildPdf()` that accesses `file.buffer` directly to use `await getFileBuffer(file)` instead. Key locations:
- Where files are passed to Sharp for image processing
- Where files are passed to PDFDocument.load() for PDF processing

**Important: Duplicate detector compatibility.** The `duplicate-detector.js` accesses `file.buffer` directly in multiple places (`hashFile(file.buffer)`, visual comparison, OCR). Rather than modifying the detector, pre-load buffers from disk before passing files to it. In the `process()` method, before calling `DuplicateDetector.detectDuplicates()`, add:

```javascript
// Pre-load buffers for disk-based files before duplicate detection
// (DuplicateDetector expects file.buffer to exist)
for (const letter of activeExhibits) {
    for (const file of exhibits[letter]) {
        if (!file.buffer && file.filePath) {
            file.buffer = await fsPromises.readFile(file.filePath);
        }
    }
}
```

This keeps the change localized to the processor and avoids touching the detector's internals. The buffer is cached on the file object so it's only read from disk once.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: PASS (all existing + new tests)

- [ ] **Step 5: Commit**

```bash
git add services/exhibit-processor.js tests/services/exhibit-processor.test.js
git commit -m "feat(exhibits): support disk-based file input in exhibit processor"
```

---

### Task 8: Server-Side Duplicate Thumbnails

For Dropbox imports, duplicate preview thumbnails must be generated server-side since the browser doesn't have the File objects.

**Files:**
- Modify: `services/exhibit-processor.js`
- Modify: `services/duplicate-detector.js`
- Modify: `forms/exhibits/js/duplicate-ui.js`

- [ ] **Step 1: Add thumbnail generation to duplicate detector results**

In `services/exhibit-processor.js`, after duplicate detection returns results, add a step that generates thumbnails for each file in each duplicate pair. Add this function:

```javascript
const sharp = require('sharp');

/**
 * Generate base64 thumbnail for a file (for server-side duplicate preview).
 * @param {Object} file - File with buffer or filePath
 * @returns {Promise<string|null>} base64 data URL or null
 */
async function generateThumbnail(file) {
    try {
        const buffer = await getFileBuffer(file);
        const ext = path.extname(file.name).toLowerCase();

        if (['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.heic'].includes(ext)) {
            const thumb = await sharp(buffer)
                .resize(400, null, { withoutEnlargement: true })
                .jpeg({ quality: 70 })
                .toBuffer();
            return `data:image/jpeg;base64,${thumb.toString('base64')}`;
        }

        if (ext === '.pdf') {
            // Render first page to PNG using pdf.js + canvas
            try {
                const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
                const { createCanvas } = require('canvas');
                const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
                const page = await doc.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 }); // ~400px width
                const canvas = createCanvas(viewport.width, viewport.height);
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                const pngBuffer = canvas.toBuffer('image/png');
                return `data:image/png;base64,${pngBuffer.toString('base64')}`;
            } catch (pdfError) {
                console.error(`PDF thumbnail failed for ${file.name}:`, pdfError.message);
                return null; // Fallback: client shows PDF icon
            }
        }

        return null;
    } catch (error) {
        console.error(`Thumbnail generation failed for ${file.name}:`, error.message);
        return null;
    }
}
```

In the `process()` method, after duplicate detection returns pairs, add thumbnails:

```javascript
// After: const duplicates = await detectDuplicatesForAllExhibits(...)
// Before: return { duplicates, paused: true }

// Generate thumbnails for duplicate preview (server-side for Dropbox imports)
if (options.generateThumbnails) {
    for (const letter of Object.keys(duplicates)) {
        for (const pair of duplicates[letter]) {
            const file1 = exhibits[letter].find(f => f.name === pair.file1);
            const file2 = exhibits[letter].find(f => f.name === pair.file2);
            pair.thumbnail1 = file1 ? await generateThumbnail(file1) : null;
            pair.thumbnail2 = file2 ? await generateThumbnail(file2) : null;
        }
    }
}
```

Pass `generateThumbnails: true` from the Dropbox import flow (Task 11), `false` from the browser upload flow (existing behavior).

- [ ] **Step 2: Update `duplicate-ui.js` to handle server-provided thumbnails**

In `forms/exhibits/js/duplicate-ui.js`, modify `renderPreview()` (around line 19) to check for a `thumbnail` property on the pair before attempting client-side preview:

```javascript
// At the top of renderPreview, add:
function renderPreview(letter, filename, serverThumbnail) {
    // If server provided a thumbnail (Dropbox imports), use it directly
    if (serverThumbnail) {
        const img = document.createElement('img');
        img.src = serverThumbnail;
        img.className = 'preview-image';
        img.alt = filename;
        return Promise.resolve(img);
    }

    // Otherwise, use existing client-side preview logic...
    // (existing code unchanged)
}
```

Update the call sites in `renderPairs()` to pass the thumbnail from the pair data:

```javascript
// Where file1 preview is rendered:
renderPreview(letter, pair.file1, pair.thumbnail1)
// Where file2 preview is rendered:
renderPreview(letter, pair.file2, pair.thumbnail2)
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `npx jest --verbose`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add services/exhibit-processor.js forms/exhibits/js/duplicate-ui.js
git commit -m "feat(exhibits): add server-side thumbnail generation for Dropbox duplicate previews"
```

---

## Chunk 3: Generate-from-Dropbox Endpoint + Frontend

### Task 9: `POST /api/exhibits/generate-from-dropbox` Endpoint

This is the main endpoint that ties together Dropbox download → exhibit processing → SSE progress → output delivery.

**Files:**
- Modify: `routes/exhibits.js`
- Test: `tests/routes/exhibits-dropbox.test.js` (new)

- [ ] **Step 1: Write integration test**

Create `tests/routes/exhibits-dropbox.test.js`:

```javascript
const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../services/dropbox-browser');
jest.mock('../../services/exhibit-processor');
jest.mock('../../services/async-job-manager');

const DropboxBrowser = require('../../services/dropbox-browser');
const ExhibitProcessor = require('../../services/exhibit-processor');
const AsyncJobManager = require('../../services/async-job-manager');

// Mount the exhibit routes on a test app
const exhibitRoutes = require('../../routes/exhibits');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/exhibits', exhibitRoutes);

describe('POST /api/exhibits/generate-from-dropbox', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 400 when caseName is missing', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({ exhibitMapping: { A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }] } });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/caseName/);
    });

    it('should return 400 when exhibitMapping is missing', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({ caseName: 'Test' });
        expect(res.status).toBe(400);
    });

    it('should return jobId in realtime mode for small sets', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({
                caseName: 'Smith v Jones',
                exhibitMapping: {
                    A: [{ dropboxPath: '/lease.pdf', name: 'lease.pdf' }],
                },
                mode: 'realtime',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.mode).toBe('realtime');
        expect(res.body.jobId).toBeDefined();
    });

    it('should create async job for large sets (50+ files)', async () => {
        const largeMapping = {};
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            largeMapping[letter] = Array.from({ length: 3 }, (_, j) => ({
                dropboxPath: `/Cases/${letter}_${j}.pdf`,
                name: `${letter}_${j}.pdf`,
            }));
        }
        // 26 × 3 = 78 files → async mode

        AsyncJobManager.createJob.mockResolvedValue({
            id: 'uuid-async',
            status: 'pending',
        });

        // Mock Cloud Run Job dispatch (will be wired in Task 17)
        // For now the endpoint creates the job but dispatch may throw
        // This test verifies the async path is selected correctly

        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({
                caseName: 'Large Case',
                exhibitMapping: largeMapping,
                mode: 'async',
                email: 'test@example.com',
            });

        // Expect either success (job created) or 500 (dispatch not yet wired)
        // After Task 17, this should be 200
        expect(AsyncJobManager.createJob).toHaveBeenCalledWith(
            expect.objectContaining({
                caseName: 'Large Case',
                totalFiles: 78,
                email: 'test@example.com',
            })
        );
    });
});
```

- [ ] **Step 2: Implement the endpoint in `routes/exhibits.js`**

Add the following route to `routes/exhibits.js` (after the existing `/generate` route):

```javascript
const DropboxBrowser = require('../services/dropbox-browser');
const AsyncJobManager = require('../services/async-job-manager');
const os = require('os');
const fsPromises = require('fs').promises;

/**
 * POST /generate-from-dropbox
 * Generate exhibit package from Dropbox files.
 *
 * Body: {
 *   caseName: string,
 *   exhibitMapping: { [letter]: [{dropboxPath, name}] },
 *   mode: 'realtime' | 'async',
 *   email?: string  // for async notification
 * }
 */
router.post('/generate-from-dropbox', async (req, res) => {
    try {
        const { caseName, exhibitMapping, mode, email } = req.body;

        if (!caseName || !exhibitMapping) {
            return res.status(400).json({ success: false, error: 'caseName and exhibitMapping are required' });
        }

        // Count total files
        const totalFiles = Object.values(exhibitMapping).flat().length;
        const effectiveMode = mode || (totalFiles >= 50 ? 'async' : 'realtime');

        if (effectiveMode === 'async') {
            // Async mode: persist job, dispatch Cloud Run Job
            const job = await AsyncJobManager.createJob({
                caseName,
                totalFiles,
                exhibitMapping,
                dropboxSourcePath: null, // Could be derived from common parent
                email,
            });

            // TODO (Task 13): Dispatch Cloud Run Job via Admin API
            // For now, return the job ID for dashboard tracking

            return res.json({
                success: true,
                mode: 'async',
                jobId: job.id,
                message: `Processing ${totalFiles} files. Check the jobs dashboard for progress.`,
            });
        }

        // Real-time mode: download, process, stream
        const sessionId = `dropbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempDir = path.join(os.tmpdir(), 'exhibits', sessionId);
        await fsPromises.mkdir(tempDir, { recursive: true });

        const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Create job entry for SSE
        jobs.set(jobId, {
            sessionId,
            status: 'processing',
            progress: 0,
            phase: 'downloading',
            message: 'Downloading files from Dropbox...',
            sseClients: [],
        });

        res.json({ success: true, mode: 'realtime', jobId });

        // Process in background (after response sent)
        setImmediate(async () => {
            const job = jobs.get(jobId);
            const broadcast = (data) => {
                if (job && job.sseClients) {
                    job.sseClients.forEach(client => {
                        client.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
                    });
                }
            };

            try {
                // Phase 1: Download from Dropbox (0-20%)
                const flatFiles = [];
                for (const [letter, files] of Object.entries(exhibitMapping)) {
                    for (const file of files) {
                        flatFiles.push({ dropboxPath: file.dropboxPath, letter });
                    }
                }

                const downloadedFiles = await DropboxBrowser.downloadFiles(
                    flatFiles,
                    tempDir,
                    15,
                    (completed, total) => {
                        const pct = Math.round((completed / total) * 20);
                        broadcast({
                            progress: pct,
                            phase: 'downloading',
                            message: `Downloading files from Dropbox (${completed}/${total})...`,
                            timestamp: Date.now(),
                        });
                    }
                );

                // Build exhibits object with filePath references
                const exhibits = {};
                for (const [letter, files] of downloadedFiles.entries()) {
                    exhibits[letter] = files.map(f => ({
                        name: f.name,
                        type: path.extname(f.name).slice(1).toLowerCase(),
                        filePath: f.localPath,
                    }));
                }

                // Phase 2-5: Process (20-100%)
                const result = await ExhibitProcessor.process({
                    caseName,
                    exhibits,
                    outputDir: tempDir,
                    generateThumbnails: true,
                    onProgress: (percent, message, phase) => {
                        // Map processor's 0-100% to our 20-100%
                        const adjusted = 20 + Math.round(percent * 0.8);
                        broadcast({
                            progress: adjusted,
                            phase: phase || 'processing',
                            message,
                            timestamp: Date.now(),
                        });
                    },
                });

                // Handle duplicate pause
                if (result.paused) {
                    job.status = 'paused';
                    job.duplicates = result.duplicates;
                    job.exhibits = exhibits;
                    job.tempDir = tempDir;
                    job.caseName = caseName;

                    job.sseClients.forEach(client => {
                        client.write(`event: duplicates\ndata: ${JSON.stringify(result.duplicates)}\n\n`);
                    });
                    return;
                }

                // Upload to GCS + Dropbox
                // (Reuse existing GCS upload logic from the generate route)
                job.status = 'completed';
                job.outputPath = result.outputPath;
                job.filename = result.filename;
                job.pdfBuffer = result.pdfBuffer;

                // GCS upload (same as existing generate route)
                let downloadUrl = null;
                try {
                    const { Storage } = require('@google-cloud/storage');
                    const storage = new Storage();
                    const bucket = storage.bucket('docmosis-tornado-form-submissions');
                    const gcsPath = `exhibits/${sessionId}/${jobId}/${result.filename}`;
                    const file = bucket.file(gcsPath);
                    await file.save(Buffer.from(result.pdfBuffer), { contentType: 'application/pdf' });
                    [downloadUrl] = await file.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 60 * 60 * 1000,
                        responseDisposition: `attachment; filename="${result.filename}"`,
                    });
                    job.downloadUrl = downloadUrl;
                } catch (gcsError) {
                    console.error('GCS upload failed, using fallback:', gcsError.message);
                }

                // Upload to Dropbox output folder
                try {
                    const dropboxService = require('../dropbox-service');
                    if (dropboxService.isEnabled()) {
                        await dropboxService.uploadFile(result.outputPath, Buffer.from(result.pdfBuffer));
                    }
                } catch (dbxError) {
                    console.error('Dropbox output upload failed:', dbxError.message);
                }

                // Send complete event
                job.sseClients.forEach(client => {
                    client.write(`event: complete\ndata: ${JSON.stringify({
                        filename: result.filename,
                        downloadUrl: downloadUrl || `/api/exhibits/jobs/${jobId}/download`,
                    })}\n\n`);
                });

            } catch (error) {
                console.error('Dropbox processing error:', error);
                job.status = 'failed';
                job.sseClients.forEach(client => {
                    client.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                });
            } finally {
                // Cleanup temp directory
                try {
                    await fsPromises.rm(tempDir, { recursive: true, force: true });
                } catch (cleanupError) {
                    console.error('Temp cleanup failed:', cleanupError.message);
                }
            }
        });

    } catch (error) {
        console.error('Generate from Dropbox error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
```

- [ ] **Step 3: Run tests**

Run: `npx jest tests/routes/exhibits-dropbox.test.js --verbose`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add routes/exhibits.js tests/routes/exhibits-dropbox.test.js
git commit -m "feat(exhibits): add generate-from-dropbox endpoint with real-time and async modes"
```

---

### Task 10: Frontend — Dropbox File Browser UI

**Files:**
- Create: `forms/exhibits/js/dropbox-browser.js`
- Modify: `forms/exhibits/index.html`
- Modify: `forms/exhibits/styles.css`

- [ ] **Step 1: Add HTML structure for Dropbox browser panel**

In `forms/exhibits/index.html`, add a new panel after the case info section (after line 38) and before the exhibit grid section:

```html
<!-- Dropbox Import Panel -->
<div id="dropbox-panel" class="section" style="display: none;">
    <div class="dropbox-browser">
        <div class="dropbox-nav">
            <div class="dropbox-breadcrumb" id="dropbox-breadcrumb">
                <span class="breadcrumb-item" data-path="/">/</span>
            </div>
            <button type="button" id="btn-dropbox-refresh" class="btn-small" title="Refresh">↻</button>
        </div>
        <div class="dropbox-file-list" id="dropbox-file-list">
            <div class="loading-placeholder">Click "Import from Dropbox" to browse files</div>
        </div>
    </div>
    <div class="exhibit-assignment-panel">
        <h3>Exhibit Assignment</h3>
        <p class="hint">Drag files from the browser into exhibit slots</p>
        <div id="exhibit-slots" class="exhibit-slots">
            <!-- A-Z slots generated by JS -->
        </div>
    </div>
</div>
```

Add an "Import from Dropbox" button near the "Add Exhibit" button area (around line 50):

```html
<button type="button" id="btn-import-dropbox" class="btn-secondary">Import from Dropbox</button>
```

Add a Jobs Dashboard tab (after the progress overlay, around line 80):

```html
<!-- Jobs Dashboard -->
<div id="jobs-dashboard" class="section" style="display: none;">
    <h3>Recent Jobs</h3>
    <div id="jobs-list" class="jobs-list">
        <p class="hint">No recent jobs</p>
    </div>
    <button type="button" id="btn-close-dashboard" class="btn-small">Close</button>
</div>
<button type="button" id="btn-show-jobs" class="btn-link" style="display: none;">View Jobs</button>
```

Add the new script tags before the closing `</body>`:

```html
<script src="js/dropbox-browser.js"></script>
<script src="js/jobs-dashboard.js"></script>
```

- [ ] **Step 2: Implement `dropbox-browser.js`**

Create `forms/exhibits/js/dropbox-browser.js`:

```javascript
/**
 * Dropbox File Browser UI
 *
 * Provides a file explorer for browsing Dropbox and assigning files to exhibit letters.
 */
const DropboxBrowserUI = (() => {
    let currentPath = '/';
    const selectedFiles = new Map(); // letter → [{dropboxPath, name}]
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function init() {
        const importBtn = document.getElementById('btn-import-dropbox');
        const refreshBtn = document.getElementById('btn-dropbox-refresh');

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('dropbox-panel').style.display = 'flex';
                importBtn.style.display = 'none';
                loadFolder('/');
                renderExhibitSlots();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadFolder(currentPath, true));
        }
    }

    async function loadFolder(folderPath, refresh = false) {
        currentPath = folderPath;
        const fileList = document.getElementById('dropbox-file-list');
        fileList.innerHTML = '<div class="loading-placeholder">Loading...</div>';

        try {
            const params = new URLSearchParams({ path: folderPath });
            if (refresh) params.set('refresh', 'true');

            const res = await fetch(`/api/dropbox/list?${params}`);
            const data = await res.json();

            if (!data.success) {
                fileList.innerHTML = `<div class="error">${data.error}</div>`;
                return;
            }

            renderBreadcrumb(folderPath);
            renderFileList(data.entries);
        } catch (error) {
            fileList.innerHTML = `<div class="error">Failed to load: ${error.message}</div>`;
        }
    }

    function renderBreadcrumb(folderPath) {
        const breadcrumb = document.getElementById('dropbox-breadcrumb');
        const parts = folderPath === '/' ? ['/'] : ['/', ...folderPath.split('/').filter(Boolean)];
        let accumulated = '';

        breadcrumb.innerHTML = parts.map((part, i) => {
            accumulated = i === 0 ? '/' : accumulated + '/' + part;
            const pathAttr = accumulated;
            return `<span class="breadcrumb-item" data-path="${escapeAttr(pathAttr)}">${escapeHtml(part === '/' ? 'Dropbox' : part)}</span>`;
        }).join(' / ');

        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => loadFolder(item.dataset.path));
        });
    }

    function renderFileList(entries) {
        const fileList = document.getElementById('dropbox-file-list');

        if (entries.length === 0) {
            fileList.innerHTML = '<div class="empty">Empty folder</div>';
            return;
        }

        // Sort: folders first, then files alphabetically
        const sorted = [...entries].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        fileList.innerHTML = sorted.map(entry => {
            const icon = entry.type === 'folder' ? '📁' :
                entry.supported ? '📄' : '⚠️';
            const sizeStr = entry.size ? formatSize(entry.size) : '';
            const disabledClass = (!entry.supported && entry.type !== 'folder') ? 'disabled' : '';
            const tooltip = disabledClass ? 'title="Unsupported file type"' : '';
            const draggable = entry.type === 'file' && entry.supported ? 'draggable="true"' : '';

            return `
                <div class="dropbox-entry ${entry.type} ${disabledClass}" ${tooltip}
                     data-path="${escapeAttr(entry.path)}"
                     data-name="${escapeAttr(entry.name)}"
                     data-type="${entry.type}"
                     ${draggable}>
                    <span class="entry-icon">${icon}</span>
                    <span class="entry-name">${escapeHtml(entry.name)}</span>
                    <span class="entry-size">${sizeStr}</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.addEventListener('click', () => loadFolder(el.dataset.path));
        });

        // Add drag handlers for files
        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    dropboxPath: el.dataset.path,
                    name: el.dataset.name,
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });

            // Also support click-to-add to first empty slot
            el.addEventListener('dblclick', () => {
                const emptySlot = LETTERS.find(l => !selectedFiles.has(l) || selectedFiles.get(l).length === 0);
                if (emptySlot) {
                    addFileToSlot(emptySlot, { dropboxPath: el.dataset.path, name: el.dataset.name });
                }
            });
        });

        // Support dragging entire folders
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
    }

    function renderExhibitSlots() {
        const container = document.getElementById('exhibit-slots');
        container.innerHTML = LETTERS.map(letter => `
            <div class="exhibit-slot" data-letter="${letter}" id="slot-${letter}">
                <div class="slot-header">
                    <strong>Exhibit ${letter}</strong>
                    <span class="file-count" id="count-${letter}">0 files</span>
                    <button type="button" class="btn-clear-slot" data-letter="${letter}" title="Clear">✕</button>
                </div>
                <div class="slot-files" id="files-${letter}">
                    <span class="slot-placeholder">Drop files here</span>
                </div>
            </div>
        `).join('');

        // Add drop handlers
        container.querySelectorAll('.exhibit-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', async (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const letter = slot.dataset.letter;
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (data.type === 'folder') {
                    // Load folder contents and add all supported files
                    await addFolderToSlot(letter, data.folderPath);
                } else {
                    addFileToSlot(letter, data);
                }
            });
        });

        // Clear buttons
        container.querySelectorAll('.btn-clear-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const letter = btn.dataset.letter;
                selectedFiles.delete(letter);
                updateSlotUI(letter);
            });
        });
    }

    function addFileToSlot(letter, file) {
        if (!selectedFiles.has(letter)) selectedFiles.set(letter, []);
        const files = selectedFiles.get(letter);

        // Prevent duplicate paths in same slot
        if (files.some(f => f.dropboxPath === file.dropboxPath)) return;

        files.push(file);
        updateSlotUI(letter);
    }

    async function addFolderToSlot(letter, folderPath) {
        try {
            const res = await fetch(`/api/dropbox/list?path=${encodeURIComponent(folderPath)}`);
            const data = await res.json();
            if (!data.success) return;

            // Add only direct children that are supported files
            const supportedFiles = data.entries.filter(e => e.type === 'file' && e.supported);
            for (const entry of supportedFiles) {
                addFileToSlot(letter, { dropboxPath: entry.path, name: entry.name });
            }
        } catch (error) {
            console.error('Failed to load folder for slot:', error);
        }
    }

    function updateSlotUI(letter) {
        const files = selectedFiles.get(letter) || [];
        const filesEl = document.getElementById(`files-${letter}`);
        const countEl = document.getElementById(`count-${letter}`);

        countEl.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;

        if (files.length === 0) {
            filesEl.innerHTML = '<span class="slot-placeholder">Drop files here</span>';
            return;
        }

        filesEl.innerHTML = files.map((f, i) => `
            <div class="slot-file" data-index="${i}">
                <span class="file-name">${escapeHtml(f.name)}</span>
                <button type="button" class="btn-remove-file" data-letter="${letter}" data-index="${i}" title="Remove">✕</button>
            </div>
        `).join('');

        filesEl.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                files.splice(parseInt(btn.dataset.index), 1);
                updateSlotUI(letter);
            });
        });
    }

    /**
     * Get the current exhibit mapping for submission.
     * @returns {Object} { letter: [{dropboxPath, name}] } (only non-empty slots)
     */
    function getExhibitMapping() {
        const mapping = {};
        for (const [letter, files] of selectedFiles.entries()) {
            if (files.length > 0) {
                mapping[letter] = files;
            }
        }
        return mapping;
    }

    /**
     * Get total file count across all slots.
     */
    function getTotalFiles() {
        let total = 0;
        for (const files of selectedFiles.values()) {
            total += files.length;
        }
        return total;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { getExhibitMapping, getTotalFiles, loadFolder };
})();
```

- [ ] **Step 3: Add CSS for Dropbox browser and exhibit slots**

Add to `forms/exhibits/styles.css`:

```css
/* Dropbox Browser Panel */
#dropbox-panel {
    display: none;
    gap: 20px;
    margin-bottom: 20px;
}

.dropbox-browser {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    max-height: 500px;
    display: flex;
    flex-direction: column;
}

.dropbox-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
}

.dropbox-breadcrumb {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.breadcrumb-item {
    cursor: pointer;
    color: #0066cc;
}

.breadcrumb-item:hover {
    text-decoration: underline;
}

.dropbox-file-list {
    overflow-y: auto;
    flex: 1;
    padding: 8px;
}

.dropbox-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
}

.dropbox-entry:hover {
    background: #f0f0f0;
}

.dropbox-entry.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.dropbox-entry .entry-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dropbox-entry .entry-size {
    color: #888;
    font-size: 0.85em;
    white-space: nowrap;
}

/* Exhibit Assignment Panel */
.exhibit-assignment-panel {
    width: 350px;
    flex-shrink: 0;
}

.exhibit-slots {
    max-height: 500px;
    overflow-y: auto;
}

.exhibit-slot {
    border: 2px dashed #ccc;
    border-radius: 6px;
    margin-bottom: 8px;
    padding: 8px;
    transition: border-color 0.2s, background 0.2s;
}

.exhibit-slot.drag-over {
    border-color: #0066cc;
    background: #e8f0fe;
}

.slot-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.slot-header .file-count {
    color: #888;
    font-size: 0.85em;
    flex: 1;
}

.slot-placeholder {
    color: #aaa;
    font-style: italic;
    font-size: 0.9em;
}

.slot-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: #f8f8f8;
    border-radius: 4px;
    margin-top: 4px;
    font-size: 0.9em;
}

.slot-file .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}

.btn-clear-slot,
.btn-remove-file {
    background: none;
    border: none;
    cursor: pointer;
    color: #cc0000;
    font-size: 0.9em;
    padding: 2px 6px;
}

.btn-small {
    padding: 4px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
}

.btn-secondary {
    padding: 8px 16px;
    border: 1px solid #0066cc;
    border-radius: 4px;
    background: #fff;
    color: #0066cc;
    cursor: pointer;
}

.btn-secondary:hover {
    background: #e8f0fe;
}

.btn-link {
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    text-decoration: underline;
    padding: 4px;
}

/* Jobs Dashboard */
.jobs-list {
    max-height: 400px;
    overflow-y: auto;
}

.job-card {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
}

.job-card .job-status {
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.8em;
}

.job-card .job-status.complete { color: #2e7d32; }
.job-card .job-status.processing,
.job-card .job-status.downloading { color: #1565c0; }
.job-card .job-status.failed { color: #c62828; }
.job-card .job-status.pending { color: #888; }
```

- [ ] **Step 4: Test manually in browser**

1. Run `npm run dev`
2. Navigate to the exhibit collector page
3. Verify the "Import from Dropbox" button appears
4. Click it and verify the Dropbox browser panel shows
5. (If Dropbox is configured) Navigate folders, verify file listing, drag files to slots

- [ ] **Step 5: Commit**

```bash
git add forms/exhibits/js/dropbox-browser.js forms/exhibits/index.html forms/exhibits/styles.css
git commit -m "feat(exhibits): add Dropbox file browser UI with drag-and-drop exhibit assignment"
```

---

### Task 11: Frontend — Dropbox Submission Flow

Wire the Dropbox browser's exhibit mapping into the form submission flow.

**Files:**
- Modify: `forms/exhibits/js/form-submission.js`

- [ ] **Step 1: Add Dropbox submission handler**

In `forms/exhibits/js/form-submission.js`, add a new function alongside the existing `handleGenerate()`:

```javascript
/**
 * Handle generate from Dropbox import.
 * Skips the upload phase — sends exhibit mapping to server for server-side download.
 */
async function handleGenerateFromDropbox() {
    const caseName = document.getElementById('case-name').value.trim();
    if (!caseName) {
        alert('Please enter a case name');
        return;
    }

    const exhibitMapping = DropboxBrowserUI.getExhibitMapping();
    const totalFiles = DropboxBrowserUI.getTotalFiles();

    if (totalFiles === 0) {
        alert('Please assign at least one file to an exhibit slot');
        return;
    }

    // Determine mode
    const defaultMode = totalFiles >= 50 ? 'async' : 'realtime';
    let mode = defaultMode;

    // Offer mode override for borderline cases
    if (totalFiles >= 40 && totalFiles < 60) {
        const useAsync = confirm(
            `You have ${totalFiles} files. Would you like to process in the background?\n\n` +
            `OK = Background processing (email notification when done)\n` +
            `Cancel = Wait for results now`
        );
        mode = useAsync ? 'async' : 'realtime';
    }

    if (mode === 'async') {
        const email = prompt('Enter email for notification when processing is complete:');
        try {
            const res = await fetch('/api/exhibits/generate-from-dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseName, exhibitMapping, mode: 'async', email }),
            });
            const data = await res.json();

            if (data.success) {
                alert(data.message);
                // Show jobs dashboard
                document.getElementById('btn-show-jobs').style.display = 'inline';
                if (typeof JobsDashboard !== 'undefined') JobsDashboard.show();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed to start processing: ' + error.message);
        }
        return;
    }

    // Real-time mode: similar to existing handleGenerate but different endpoint
    showProgress();
    try {
        const res = await fetch('/api/exhibits/generate-from-dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseName, exhibitMapping, mode: 'realtime' }),
        });
        const data = await res.json();

        if (!data.success) {
            hideProgress();
            alert('Error: ' + data.error);
            return;
        }

        // Connect to SSE — reuse existing connectSSE function
        await connectSSE(data.jobId);
    } catch (error) {
        hideProgress();
        alert('Failed: ' + error.message);
    }
}
```

Wire the generate button to detect which mode is active:

```javascript
// In the existing btn-generate click handler, add detection:
document.getElementById('btn-generate').addEventListener('click', () => {
    const dropboxPanel = document.getElementById('dropbox-panel');
    if (dropboxPanel && dropboxPanel.style.display !== 'none') {
        handleGenerateFromDropbox();
    } else {
        handleGenerate(); // existing flow
    }
});
```

- [ ] **Step 2: Test manually**

1. Open exhibit collector
2. Click "Import from Dropbox"
3. Assign files to slots
4. Click Generate
5. Verify SSE progress works with the new endpoint

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat(exhibits): wire Dropbox import flow into form submission"
```

---

### Task 12: Frontend — Jobs Dashboard

**Files:**
- Create: `forms/exhibits/js/jobs-dashboard.js`

- [ ] **Step 1: Implement jobs dashboard UI**

Create `forms/exhibits/js/jobs-dashboard.js`:

```javascript
/**
 * Jobs Dashboard
 *
 * Displays recent exhibit processing jobs with status polling.
 */
const JobsDashboard = (() => {
    let pollInterval = null;

    function show() {
        document.getElementById('jobs-dashboard').style.display = 'block';
        document.getElementById('btn-show-jobs').style.display = 'inline';
        loadJobs();
        startPolling();
    }

    function hide() {
        document.getElementById('jobs-dashboard').style.display = 'none';
        stopPolling();
    }

    async function loadJobs() {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            if (data.success) {
                renderJobs(data.jobs);
                // Keep polling if any jobs are active
                const hasActive = data.jobs.some(j =>
                    ['pending', 'downloading', 'processing'].includes(j.status)
                );
                if (!hasActive) stopPolling();
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    }

    function renderJobs(jobs) {
        const container = document.getElementById('jobs-list');

        if (jobs.length === 0) {
            container.innerHTML = '<p class="hint">No recent jobs</p>';
            return;
        }

        container.innerHTML = jobs.map(job => {
            const statusClass = job.status;
            const timeStr = new Date(job.created_at).toLocaleString();
            const progressBar = ['pending', 'downloading', 'processing'].includes(job.status)
                ? `<div class="progress-bar-mini"><div class="progress-fill-mini" style="width:${job.progress}%"></div></div>
                   <span class="progress-text">${job.progress}% — ${job.progress_message || job.status}</span>`
                : '';

            const downloadBtn = job.status === 'complete' && job.gcs_output_url
                ? `<a href="${escapeAttr(job.gcs_output_url)}" class="btn-small" download>Download PDF</a>`
                : '';

            const errorMsg = job.status === 'failed' && job.error_message
                ? `<p class="error-text">${escapeHtml(job.error_message)}</p>`
                : '';

            return `
                <div class="job-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${escapeHtml(job.case_name)}</strong>
                        <span class="job-status ${statusClass}">${job.status}</span>
                    </div>
                    <div style="color:#888;font-size:0.85em;">${job.total_files} files — ${timeStr}</div>
                    ${progressBar}
                    ${errorMsg}
                    ${downloadBtn}
                </div>
            `;
        }).join('');
    }

    function startPolling() {
        stopPolling();
        pollInterval = setInterval(loadJobs, 5000);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/"/g, '&quot;');
    }

    // Wire close button
    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('btn-close-dashboard');
        if (closeBtn) closeBtn.addEventListener('click', hide);

        const showBtn = document.getElementById('btn-show-jobs');
        if (showBtn) showBtn.addEventListener('click', show);
    });

    return { show, hide, loadJobs };
})();
```

- [ ] **Step 2: Add mini progress bar CSS**

Add to `forms/exhibits/styles.css`:

```css
.progress-bar-mini {
    height: 6px;
    background: #eee;
    border-radius: 3px;
    margin: 6px 0 4px;
    overflow: hidden;
}

.progress-fill-mini {
    height: 100%;
    background: #1565c0;
    border-radius: 3px;
    transition: width 0.3s;
}

.progress-text {
    font-size: 0.8em;
    color: #555;
}

.error-text {
    color: #c62828;
    font-size: 0.85em;
    margin: 4px 0;
}
```

- [ ] **Step 3: Test manually**

1. Trigger an async job (or verify dashboard loads with empty state)
2. Verify polling starts/stops correctly
3. Verify completed jobs show download link

- [ ] **Step 4: Commit**

```bash
git add forms/exhibits/js/jobs-dashboard.js forms/exhibits/styles.css
git commit -m "feat(exhibits): add jobs dashboard UI with status polling"
```

---

## Chunk 4: Cloud Run Job + Deployment

### Task 13: Cloud Run Job Entrypoint

**Files:**
- Create: `job-entrypoint.js`
- Test: `tests/job-entrypoint.test.js`

- [ ] **Step 1: Write test for job entrypoint logic**

Create `tests/job-entrypoint.test.js`:

```javascript
// Test the job processing logic (not the full entrypoint which calls process.exit)
jest.mock('../services/async-job-manager');
jest.mock('../services/dropbox-browser');
jest.mock('../services/exhibit-processor');
jest.mock('../dropbox-service');

const AsyncJobManager = require('../services/async-job-manager');
const DropboxBrowser = require('../services/dropbox-browser');
const ExhibitProcessor = require('../services/exhibit-processor');
const dropboxService = require('../dropbox-service');

// Import the processJob function (we'll extract it as a testable export)
const { processJob } = require('../job-entrypoint');

describe('processJob', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should download files, process, and mark job complete', async () => {
        AsyncJobManager.getJob.mockResolvedValue({
            id: 'uuid-1',
            case_name: 'Test Case',
            total_files: 2,
            exhibit_mapping: {
                A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }],
                B: [{ dropboxPath: '/b.pdf', name: 'b.pdf' }],
            },
        });

        DropboxBrowser.downloadFiles.mockResolvedValue(new Map([
            ['A', [{ localPath: '/tmp/A/a.pdf', name: 'a.pdf', size: 100 }]],
            ['B', [{ localPath: '/tmp/B/b.pdf', name: 'b.pdf', size: 200 }]],
        ]));

        ExhibitProcessor.process.mockResolvedValue({
            filename: 'Test_Case_Exhibits.pdf',
            pdfBuffer: Buffer.from('pdf-data'),
            outputPath: '/tmp/output.pdf',
        });

        dropboxService.isEnabled.mockReturnValue(false);

        AsyncJobManager.updateProgress.mockResolvedValue();
        AsyncJobManager.completeJob.mockResolvedValue();

        await processJob('uuid-1');

        expect(AsyncJobManager.updateProgress).toHaveBeenCalled();
        expect(AsyncJobManager.completeJob).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            gcsOutputUrl: expect.any(String),
        }));
    });

    it('should mark job as failed on error', async () => {
        AsyncJobManager.getJob.mockResolvedValue({
            id: 'uuid-2',
            case_name: 'Fail Case',
            total_files: 1,
            exhibit_mapping: { A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }] },
        });

        DropboxBrowser.downloadFiles.mockRejectedValue(new Error('Download failed'));
        AsyncJobManager.failJob.mockResolvedValue();

        await processJob('uuid-2');

        expect(AsyncJobManager.failJob).toHaveBeenCalledWith('uuid-2', 'Download failed');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/job-entrypoint.test.js --verbose`
Expected: FAIL — `Cannot find module '../job-entrypoint'`

- [ ] **Step 3: Implement `job-entrypoint.js`**

Create `job-entrypoint.js`:

```javascript
/**
 * Cloud Run Job Entrypoint
 *
 * Reads JOB_ID from environment, loads job config from PostgreSQL,
 * downloads files from Dropbox, runs the exhibit processing pipeline,
 * and delivers the output.
 *
 * CMD override in Cloud Run Job: node job-entrypoint.js
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const AsyncJobManager = require('./services/async-job-manager');
const DropboxBrowser = require('./services/dropbox-browser');
const ExhibitProcessor = require('./services/exhibit-processor');

/**
 * Process a single exhibit job.
 * Exported for testing.
 */
async function processJob(jobId) {
    let tempDir = null;

    try {
        // Load job config
        const job = await AsyncJobManager.getJob(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        const { case_name: caseName, exhibit_mapping: exhibitMapping, total_files: totalFiles } = job;

        // Create temp directory
        tempDir = path.join(os.tmpdir(), 'exhibits', `job-${jobId}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Phase 1: Download from Dropbox (0-20%)
        await AsyncJobManager.updateProgress(jobId, {
            status: 'downloading',
            progress: 0,
            progressMessage: 'Downloading files from Dropbox...',
        });

        const flatFiles = [];
        for (const [letter, files] of Object.entries(exhibitMapping)) {
            for (const file of files) {
                flatFiles.push({ dropboxPath: file.dropboxPath, letter });
            }
        }

        const downloadedFiles = await DropboxBrowser.downloadFiles(
            flatFiles,
            tempDir,
            15,
            (completed, total) => {
                const pct = Math.round((completed / total) * 20);
                AsyncJobManager.updateProgress(jobId, {
                    status: 'downloading',
                    progress: pct,
                    progressMessage: `Downloading files (${completed}/${total})...`,
                }).catch(() => {}); // Fire-and-forget progress update
            }
        );

        // Build exhibits object
        const exhibits = {};
        for (const [letter, files] of downloadedFiles.entries()) {
            exhibits[letter] = files.map(f => ({
                name: f.name,
                type: path.extname(f.name).slice(1).toLowerCase(),
                filePath: f.localPath,
            }));
        }

        // Phase 2-5: Process (20-100%)
        await AsyncJobManager.updateProgress(jobId, {
            status: 'processing',
            progress: 20,
            progressMessage: 'Processing exhibits...',
        });

        // Skip duplicate detection in async mode
        const result = await ExhibitProcessor.process({
            caseName,
            exhibits,
            outputDir: tempDir,
            skipDuplicateDetection: true, // Async mode: no interactive resolution
            onProgress: (percent, message, phase) => {
                const adjusted = 20 + Math.round(percent * 0.8);
                AsyncJobManager.updateProgress(jobId, {
                    status: 'processing',
                    progress: adjusted,
                    progressMessage: message,
                }).catch(() => {});
            },
        });

        // Upload to GCS
        let gcsOutputUrl = null;
        try {
            const { Storage } = require('@google-cloud/storage');
            const storage = new Storage();
            const bucket = storage.bucket('docmosis-tornado-form-submissions');
            const gcsPath = `exhibits/async/${jobId}/${result.filename}`;
            const file = bucket.file(gcsPath);
            await file.save(Buffer.from(result.pdfBuffer), { contentType: 'application/pdf' });
            [gcsOutputUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 72 * 60 * 60 * 1000, // 72 hours for async
                responseDisposition: `attachment; filename="${result.filename}"`,
            });
        } catch (gcsError) {
            console.error('GCS upload failed:', gcsError.message);
            gcsOutputUrl = null;
        }

        // Upload to Dropbox
        let dropboxOutputPath = null;
        try {
            const dropboxService = require('./dropbox-service');
            if (dropboxService.isEnabled()) {
                const uploadResult = await dropboxService.uploadFile(
                    result.outputPath,
                    Buffer.from(result.pdfBuffer)
                );
                dropboxOutputPath = uploadResult.dropboxPath;
            }
        } catch (dbxError) {
            console.error('Dropbox upload failed:', dbxError.message);
        }

        // Send email notification
        try {
            if (job.email && gcsOutputUrl) {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                await sgMail.send({
                    to: job.email,
                    from: process.env.SENDGRID_FROM_EMAIL || 'exhibits@liptonlegal.com',
                    subject: `Exhibit Package Ready: ${caseName}`,
                    html: `<p>Your exhibit package for <strong>${caseName}</strong> is ready.</p>
                           <p><a href="${gcsOutputUrl}">Download PDF</a> — link expires in 72 hours.</p>
                           ${dropboxOutputPath ? '<p>The PDF has also been saved to your Dropbox.</p>' : ''}`,
                });
            }
        } catch (emailError) {
            console.error('Email notification failed:', emailError.message);
            // Non-fatal: PDF is still in GCS and Dropbox
        }

        // Mark complete
        await AsyncJobManager.completeJob(jobId, {
            gcsOutputUrl: gcsOutputUrl || '',
            dropboxOutputPath: dropboxOutputPath || '',
        });

        console.log(`Job ${jobId} completed successfully`);

    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        await AsyncJobManager.failJob(jobId, error.message).catch(() => {});
    } finally {
        // Cleanup temp directory
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.error('Temp cleanup failed:', e.message);
            }
        }
    }
}

// Main: run if invoked directly (Cloud Run Job)
if (require.main === module) {
    const jobId = process.env.JOB_ID;
    if (!jobId) {
        console.error('JOB_ID environment variable is required');
        process.exit(1);
    }

    processJob(jobId)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { processJob };
```

- [ ] **Step 4: Run tests**

Run: `npx jest tests/job-entrypoint.test.js --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add job-entrypoint.js tests/job-entrypoint.test.js
git commit -m "feat(exhibits): add Cloud Run Job entrypoint for async exhibit processing"
```

---

### Task 14: Add `skipDuplicateDetection` Option to Exhibit Processor

The job entrypoint passes `skipDuplicateDetection: true` for async mode. Add support for this flag.

**Files:**
- Modify: `services/exhibit-processor.js`
- Test: `tests/services/exhibit-processor.test.js`

- [ ] **Step 1: Write test**

Add to `tests/services/exhibit-processor.test.js`:

```javascript
describe('skipDuplicateDetection option', () => {
    it('should skip duplicate detection when flag is true', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        const pdfBytes = await pdfDoc.save();

        const exhibits = {
            A: [
                { name: 'doc1.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes) },
                { name: 'doc2.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes) }, // same content = duplicate
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'Skip Dup Test',
            exhibits,
            outputDir: tempDir,
            skipDuplicateDetection: true,
            onProgress: () => {},
        });

        // Should NOT pause for duplicates — should produce output
        expect(result.paused).toBeFalsy();
        expect(result.filename).toBeDefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/exhibit-processor.test.js -t "skipDuplicateDetection" --verbose`
Expected: FAIL — process pauses with duplicates found

- [ ] **Step 3: Add the flag to `process()` method**

In `services/exhibit-processor.js`, in the `process()` method (around line 93), add `skipDuplicateDetection` to the destructured params:

```javascript
static async process({
    caseName,
    exhibits,
    outputDir,
    onProgress,
    skipDuplicateDetection = false,
    generateThumbnails = false,
}) {
```

Then wrap the duplicate detection phase in a condition:

```javascript
// Before the duplicate detection block, add:
if (!skipDuplicateDetection) {
    // ... existing duplicate detection code ...
}
// If skipping, jump straight to PDF assembly
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add services/exhibit-processor.js tests/services/exhibit-processor.test.js
git commit -m "feat(exhibits): add skipDuplicateDetection option for async processing mode"
```

---

### Task 15: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

Run:
```bash
npm install @google-cloud/run @sendgrid/mail canvas
```

Note: `canvas` is needed for future server-side PDF page rendering. It requires native build tools — verify it installs cleanly. If build fails on the CI Docker image, add `apt-get install build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev` to the Dockerfile.

- [ ] **Step 2: Verify no breaking changes**

Run: `npx jest --verbose`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(exhibits): add dependencies for Cloud Run Jobs, SendGrid, and canvas"
```

---

### Task 16: Update Deployment Workflow

**Files:**
- Modify: `.github/workflows/deploy-exhibit-collector.yml`

- [ ] **Step 1: Update path triggers**

Add new file paths to the `paths` filter (around line 14-30):

```yaml
paths:
  - 'forms/exhibits/**'
  - 'routes/exhibits.js'
  - 'routes/dropbox.js'        # NEW
  - 'routes/jobs.js'            # NEW
  - 'services/exhibit-processor.js'
  - 'services/duplicate-detector.js'
  - 'services/pdf-page-builder.js'
  - 'services/dropbox-browser.js'   # NEW
  - 'services/async-job-manager.js'  # NEW
  - 'dropbox-service.js'            # NEW (refactored)
  - 'job-entrypoint.js'             # NEW
  - 'middleware/**'
  - 'monitoring/instrument.js'
  - 'server.js'
  - 'package*.json'
  - 'Dockerfile'
```

- [ ] **Step 2: Bump Cloud Run service timeout**

In the `gcloud run deploy` command, change `--timeout=300` to `--timeout=900` (15 minutes).

- [ ] **Step 3: Add Cloud Run Job deployment step**

After the existing deploy step, add:

```yaml
- name: Deploy Cloud Run Job
  run: |
    gcloud run jobs create exhibit-processor-job \
      --image=${{ env.IMAGE_URL }} \
      --region=us-central1 \
      --project=docmosis-tornado \
      --memory=8Gi \
      --cpu=8 \
      --task-timeout=3600 \
      --max-retries=0 \
      --command="node" \
      --args="job-entrypoint.js" \
      --set-env-vars="NODE_ENV=production" \
      --set-secrets="DB_PASSWORD=db-password:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,DROPBOX_ACCESS_TOKEN=dropbox-token:latest,DROPBOX_APP_KEY=dropbox-app-key:latest,DROPBOX_APP_SECRET=dropbox-app-secret:latest,DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
      --service-account=${{ env.SERVICE_ACCOUNT }} \
      2>/dev/null || \
    gcloud run jobs update exhibit-processor-job \
      --image=${{ env.IMAGE_URL }} \
      --region=us-central1 \
      --project=docmosis-tornado \
      --memory=8Gi \
      --cpu=8 \
      --task-timeout=3600 \
      --command="node" \
      --args="job-entrypoint.js"
```

Note: Uses `create || update` pattern — first deploy creates, subsequent deploys update.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-exhibit-collector.yml
git commit -m "feat(exhibits): update deploy workflow for Dropbox integration and Cloud Run Job"
```

---

### Task 17: Wire Async Job Dispatch in Generate Endpoint

Currently Task 9's endpoint has a `TODO` comment for dispatching the Cloud Run Job. Implement it.

**Files:**
- Modify: `routes/exhibits.js`

- [ ] **Step 1: Add Cloud Run Job dispatch**

In the `generate-from-dropbox` endpoint's async branch, replace the TODO with:

```javascript
if (effectiveMode === 'async') {
    const job = await AsyncJobManager.createJob({
        caseName,
        totalFiles,
        exhibitMapping,
        dropboxSourcePath: null,
        email,
    });

    // Dispatch Cloud Run Job
    try {
        const { JobsClient } = require('@google-cloud/run').v2;
        const jobsClient = new JobsClient();
        await jobsClient.runJob({
            name: `projects/docmosis-tornado/locations/us-central1/jobs/exhibit-processor-job`,
            overrides: {
                containerOverrides: [{
                    env: [{ name: 'JOB_ID', value: job.id }],
                }],
            },
        });
    } catch (dispatchError) {
        console.error('Failed to dispatch Cloud Run Job:', dispatchError.message);
        await AsyncJobManager.failJob(job.id, 'Failed to dispatch processing job');
        return res.status(500).json({ success: false, error: 'Failed to start processing' });
    }

    return res.json({
        success: true,
        mode: 'async',
        jobId: job.id,
        message: `Processing ${totalFiles} files. ${email ? 'You\'ll receive an email' : 'Check the jobs dashboard'} when it's ready.`,
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add routes/exhibits.js
git commit -m "feat(exhibits): wire Cloud Run Job dispatch for async exhibit processing"
```

---

### Task 18: End-to-End Manual Testing Checklist

This is not a code task — it's a verification checklist to run manually before considering the feature complete.

- [ ] **Dropbox Browser**
  - [ ] "Import from Dropbox" button visible on exhibit collector
  - [ ] Folder navigation works (click folders, breadcrumb back)
  - [ ] File type filtering works (unsupported files grayed out)
  - [ ] Refresh button re-fetches folder contents
  - [ ] Hidden files (.DS_Store) not shown

- [ ] **Exhibit Assignment**
  - [ ] Drag individual file to slot → appears in slot
  - [ ] Drag folder to slot → all supported files added
  - [ ] Double-click file → added to first empty slot
  - [ ] Remove file from slot works
  - [ ] Clear entire slot works
  - [ ] File count updates correctly

- [ ] **Real-Time Processing (< 50 files)**
  - [ ] Generate triggers Dropbox download + processing
  - [ ] SSE progress shows download phase, then processing phases
  - [ ] Duplicate detection works within multi-file exhibits
  - [ ] Server-provided thumbnails display in duplicate modal
  - [ ] Download link works after completion
  - [ ] Output PDF has correct separator pages + Bates stamps

- [ ] **Async Processing (50+ files)**
  - [ ] Async mode prompt appears
  - [ ] Email prompt shown
  - [ ] Job created successfully
  - [ ] Jobs dashboard shows job with progress
  - [ ] Job completes, download link appears
  - [ ] Email notification received (if configured)
  - [ ] PDF delivered to Dropbox output folder

- [ ] **Error Handling**
  - [ ] Dropbox disabled → 503 on browse
  - [ ] Invalid folder path → error message
  - [ ] No files assigned → validation error
  - [ ] No case name → validation error
  - [ ] Cloud Run Job dispatch failure → error message + job marked failed

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 (Foundation) | 1-6 | Dropbox client refactor, DB migration, browsing service + API, job manager + API |
| 2 (Processor) | 7-8 | Disk-based file input, server-side duplicate thumbnails |
| 3 (Frontend + Endpoint) | 9-12 | Generate-from-Dropbox endpoint, Dropbox browser UI, submission flow, jobs dashboard |
| 4 (Deployment) | 13-18 | Job entrypoint, skip-dup flag, dependencies, deploy workflow, manual testing |

Each chunk produces working, testable code. Chunks 1-2 can be developed in parallel with Chunk 3 since they have no frontend dependencies. Chunk 4 depends on all prior chunks.

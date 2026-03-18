# Duplicate Group Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign pair-based duplicate detection to support groups of 3+ files using Union-Find, with a group-based resolution UI.

**Architecture:** Keep existing two-layer detection pipeline (SHA-256 hash + dHash/pixel comparison). Add Union-Find post-processing to merge pairs into connected component groups. Rewrite frontend modal from pair cards to group cards with per-file keep/remove toggles.

**Tech Stack:** Node.js, Sharp, vanilla JS frontend, SSE, Jest

**Spec:** `docs/superpowers/specs/2026-03-18-duplicate-group-detection-design.md`

**Already implemented (no changes needed):** The spec calls for `computeDHash()`, `hammingDistance()`, and a dHash pre-filter in Layer 2. These already exist in `duplicate-detector.js` (lines 37-68, used at line 236). No task is needed for them.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `services/duplicate-detector.js` | Modify | Add `buildGroups()` Union-Find function, change `detectDuplicates()` return type from `{duplicates}` to `{groups}` |
| `services/exhibit-processor.js` | Modify | Consume `{groups}` instead of `{duplicates}`, adapt thumbnail generation to group format, adapt `thumbnails` map per group |
| `routes/exhibits.js` | Modify | Update resolve endpoint for `{groupId, keep, remove}` payload, update SSE broadcast |
| `forms/exhibits/js/duplicate-ui.js` | Rewrite | Group cards with per-file toggles, relationship lines, Keep All button |
| `forms/exhibits/js/form-submission.js` | Modify | Update resolution payload construction to group format |
| `forms/exhibits/styles.css` | Modify | Add `marked-keep-locked` state, group card layout adjustments |
| `tests/services/duplicate-detector.test.js` | Modify | Update for `{groups}` return type, add Union-Find grouping tests |
| `tests/services/exhibit-processor.test.js` | Modify | Update for group-based duplicate report |
| `tests/routes/exhibits-dropbox.test.js` | Modify | Update resolve endpoint tests for new payload |

---

### Task 1: Add `buildGroups()` Union-Find to duplicate-detector.js

**Files:**
- Modify: `services/duplicate-detector.js:409-443` (detectDuplicates function)
- Test: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Write failing tests for buildGroups()**

Add tests to `tests/services/duplicate-detector.test.js`:

```js
describe('buildGroups', () => {
    it('should group a simple pair into one group', () => {
        const files = ['a.png', 'b.png', 'c.png'];
        const pairs = [
            { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'A');
        expect(groups).toHaveLength(1);
        expect(groups[0].files).toEqual(['a.png', 'b.png']);
        expect(groups[0].edges).toEqual(pairs);
        expect(groups[0].defaultKeep).toBe('a.png');
        expect(groups[0].groupId).toBe('A-g0');
    });

    it('should merge transitive matches into one group', () => {
        const files = ['a.png', 'b.png', 'c.png'];
        const pairs = [
            { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
            { file1: 'b.png', file2: 'c.png', matchType: 'VISUAL_MATCH', confidence: 96, layer: 2, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'A');
        expect(groups).toHaveLength(1);
        expect(groups[0].files).toEqual(['a.png', 'b.png', 'c.png']);
        expect(groups[0].edges).toHaveLength(2);
    });

    it('should produce separate groups for unconnected pairs', () => {
        const files = ['a.png', 'b.png', 'c.png', 'd.png'];
        const pairs = [
            { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
            { file1: 'c.png', file2: 'd.png', matchType: 'VISUAL_MATCH', confidence: 97, layer: 2, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'X');
        expect(groups).toHaveLength(2);
        expect(groups[0].groupId).toBe('X-g0');
        expect(groups[1].groupId).toBe('X-g1');
    });

    it('should handle a large group (5+ files all connected)', () => {
        const files = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png'];
        const pairs = [
            { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
            { file1: 'a.png', file2: 'c.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
            { file1: 'a.png', file2: 'd.png', matchType: 'VISUAL_MATCH', confidence: 98, layer: 2, details: 'test' },
            { file1: 'd.png', file2: 'e.png', matchType: 'VISUAL_MATCH', confidence: 95, layer: 2, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'A');
        expect(groups).toHaveLength(1);
        expect(groups[0].files).toEqual(['a.png', 'b.png', 'c.png', 'd.png', 'e.png']);
        expect(groups[0].edges).toHaveLength(4);
    });

    it('should skip pairs with unknown filenames and log warning', () => {
        const files = ['a.png', 'b.png'];
        const pairs = [
            { file1: 'a.png', file2: 'unknown.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'A');
        expect(groups).toHaveLength(0);
    });

    it('should skip self-pairs', () => {
        const files = ['a.png'];
        const pairs = [
            { file1: 'a.png', file2: 'a.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'A');
        expect(groups).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
        expect(DuplicateDetector.buildGroups([], [], 'A')).toEqual([]);
    });

    it('should sort groups by alphabetically-first filename', () => {
        const files = ['x.png', 'y.png', 'a.png', 'b.png'];
        const pairs = [
            { file1: 'x.png', file2: 'y.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
            { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1, details: 'test' },
        ];
        const groups = DuplicateDetector.buildGroups(files, pairs, 'Z');
        expect(groups[0].files[0]).toBe('a.png');
        expect(groups[0].groupId).toBe('Z-g0');
        expect(groups[1].files[0]).toBe('x.png');
        expect(groups[1].groupId).toBe('Z-g1');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/services/duplicate-detector.test.js --testNamePattern="buildGroups" --verbose`
Expected: FAIL — `DuplicateDetector.buildGroups is not a function`

- [ ] **Step 3: Implement buildGroups()**

Add to `services/duplicate-detector.js` as a new static method on the `DuplicateDetector` class, before the `detectDuplicates` method:

```js
/**
 * Group duplicate pairs into connected components using Union-Find.
 * @param {Array<string>} fileNames - All filenames in the exhibit
 * @param {Array<Object>} pairs - Flat array of pair objects from detection
 * @param {string} letter - Exhibit letter for groupId prefix
 * @returns {Array<Object>} Array of group objects with files, edges, defaultKeep, groupId
 */
static buildGroups(fileNames, pairs, letter) {
    if (fileNames.length === 0 || pairs.length === 0) return [];

    const fileSet = new Set(fileNames);
    const parent = new Map();
    const rank = new Map();

    function find(x) {
        if (!parent.has(x)) { parent.set(x, x); rank.set(x, 0); }
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
        return parent.get(x);
    }

    function union(a, b) {
        const ra = find(a), rb = find(b);
        if (ra === rb) return;
        if (rank.get(ra) < rank.get(rb)) { parent.set(ra, rb); }
        else if (rank.get(ra) > rank.get(rb)) { parent.set(rb, ra); }
        else { parent.set(rb, ra); rank.set(ra, rank.get(ra) + 1); }
    }

    // Build unions from valid pairs
    const validPairs = [];
    for (const pair of pairs) {
        if (pair.file1 === pair.file2) continue;
        if (!fileSet.has(pair.file1) || !fileSet.has(pair.file2)) {
            logger.warn(`buildGroups: skipping pair with unknown file(s): ${pair.file1}, ${pair.file2}`);
            continue;
        }
        union(pair.file1, pair.file2);
        validPairs.push(pair);
    }

    // Collect connected components
    const components = new Map(); // root -> { files: Set, edges: [] }
    for (const pair of validPairs) {
        const root = find(pair.file1);
        if (!components.has(root)) components.set(root, { files: new Set(), edges: [] });
        const comp = components.get(root);
        comp.files.add(pair.file1);
        comp.files.add(pair.file2);
        comp.edges.push(pair);
    }

    // Build sorted group objects
    const groups = [...components.values()]
        .map(comp => ({
            files: [...comp.files].sort(),
            edges: comp.edges,
        }))
        .sort((a, b) => a.files[0].localeCompare(b.files[0]))
        .map((group, idx) => ({
            groupId: `${letter}-g${idx}`,
            files: group.files,
            defaultKeep: group.files[0],
            edges: group.edges,
        }));

    return groups;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/services/duplicate-detector.test.js --testNamePattern="buildGroups" --verbose`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/duplicate-detector.js tests/services/duplicate-detector.test.js
git commit -m "feat(duplicates): add Union-Find buildGroups() for connected component grouping"
```

---

### Task 2: Change detectDuplicates() return type to `{groups}`

**Files:**
- Modify: `services/duplicate-detector.js:409-443` (detectDuplicates method)
- Test: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Write failing test for new return type**

Update existing `detectDuplicates` tests in `tests/services/duplicate-detector.test.js`. Add a test that verifies the new shape:

```js
describe('detectDuplicates returns groups', () => {
    it('should return { groups: [] } for files with no duplicates', async () => {
        const files = [
            { name: 'unique1.png', buffer: Buffer.from('aaa'), type: 'png' },
            { name: 'unique2.png', buffer: Buffer.from('bbb'), type: 'png' },
        ];
        const result = await DuplicateDetector.detectDuplicates(files);
        expect(result).toHaveProperty('groups');
        expect(result.groups).toEqual([]);
        expect(result).not.toHaveProperty('duplicates');
    });

    it('should return groups with edges for exact duplicates', async () => {
        const buf = Buffer.from('identical-content');
        const files = [
            { name: 'a.png', buffer: buf, type: 'png' },
            { name: 'b.png', buffer: buf, type: 'png' },
            { name: 'c.png', buffer: buf, type: 'png' },
        ];
        const result = await DuplicateDetector.detectDuplicates(files, null, 'A');
        expect(result.groups).toHaveLength(1);
        expect(result.groups[0].files).toEqual(['a.png', 'b.png', 'c.png']);
        expect(result.groups[0].groupId).toBe('A-g0');
        expect(result.groups[0].defaultKeep).toBe('a.png');
        expect(result.groups[0].edges.length).toBeGreaterThanOrEqual(2);
        expect(result.groups[0].edges[0].matchType).toBe('EXACT_DUPLICATE');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/services/duplicate-detector.test.js --testNamePattern="returns groups" --verbose`
Expected: FAIL — `result.groups` is undefined (still returns `{duplicates}`)

- [ ] **Step 3: Update detectDuplicates() to return groups**

In `services/duplicate-detector.js`, modify the `detectDuplicates` method signature and return:

Change the signature from:
```js
static async detectDuplicates(files, onProgress) {
```
to:
```js
static async detectDuplicates(files, onProgress, letter = '') {
```

Change the final return (around line 440) from:
```js
return { duplicates: allDuplicates };
```
to:
```js
const fileNames = files.map(f => f.name);
const groups = DuplicateDetector.buildGroups(fileNames, allDuplicates, letter);
return { groups };
```

- [ ] **Step 4: Update any existing tests that expect `{duplicates}` to use `{groups}`**

Search through `tests/services/duplicate-detector.test.js` for references to `result.duplicates` and update them to work with `result.groups` and `result.groups[n].edges`. For each assertion like:
```js
expect(result.duplicates).toHaveLength(1);
expect(result.duplicates[0].matchType).toBe('EXACT_DUPLICATE');
```
Change to:
```js
expect(result.groups).toHaveLength(1);
expect(result.groups[0].edges[0].matchType).toBe('EXACT_DUPLICATE');
```

- [ ] **Step 5: Run all duplicate-detector tests**

Run: `npx jest tests/services/duplicate-detector.test.js --verbose`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add services/duplicate-detector.js tests/services/duplicate-detector.test.js
git commit -m "feat(duplicates): change detectDuplicates() return type from {duplicates} to {groups}"
```

---

### Task 3: Update exhibit-processor.js to consume `{groups}`

**Files:**
- Modify: `services/exhibit-processor.js:145-230` (process method, duplicate handling + thumbnail generation)
- Test: `tests/services/exhibit-processor.test.js`

- [ ] **Step 1: Write failing test**

Add/update test in `tests/services/exhibit-processor.test.js` that verifies the processor returns group-format duplicates:

```js
it('should return duplicate groups with thumbnails map when duplicates found', async () => {
    // Use identical buffers to trigger exact duplicate detection
    const buf = fs.readFileSync(path.join(__dirname, '../../test-exhibit-files/sample.png'));
    const result = await ExhibitProcessor.process({
        caseName: 'Test',
        exhibits: { A: [
            { name: 'a.png', buffer: buf, type: 'png' },
            { name: 'b.png', buffer: buf, type: 'png' },
        ]},
        outputDir: tmpDir,
        generateThumbnails: true,
    });
    expect(result.paused).toBe(true);
    expect(result.duplicates.A).toBeDefined();
    expect(result.duplicates.A[0]).toHaveProperty('groupId');
    expect(result.duplicates.A[0]).toHaveProperty('files');
    expect(result.duplicates.A[0]).toHaveProperty('edges');
    expect(result.duplicates.A[0]).toHaveProperty('thumbnails');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/exhibit-processor.test.js --testNamePattern="duplicate groups" --verbose`
Expected: FAIL — `result.duplicates.A[0]` has `file1`/`file2` (old pair format), not `groupId`/`files`

- [ ] **Step 3: Update exhibit-processor.js**

In `services/exhibit-processor.js`, update the `process()` method:

1. Pass the exhibit `letter` to `detectDuplicates()`:
```js
// Before:
const { duplicates } = await DuplicateDetector.detectDuplicates(exhibits[letter], progressCb);
// After:
const { groups } = await DuplicateDetector.detectDuplicates(exhibits[letter], progressCb, letter);
```

2. Change `hasDuplicates` check:
```js
// Before:
if (duplicates.length > 0) { duplicateReport[letter] = duplicates; }
// After:
if (groups.length > 0) { duplicateReport[letter] = groups; }
```

3. Update thumbnail generation to produce a `thumbnails` map per group instead of per-pair `thumbnail1`/`thumbnail2`:
```js
// For each group in duplicateReport[letter]:
for (const group of duplicateReport[letter]) {
    group.thumbnails = {};
    for (const fileName of group.files) {
        const file = exhibits[letter].find(f => f.name === fileName);
        if (!file) continue;
        try {
            const thumb = await generateThumbnail(file);
            group.thumbnails[fileName] = thumb;
        } catch (err) {
            logger.warn(`Thumbnail generation failed for ${fileName}: ${err.message}`);
        }
    }
}
```

`generateThumbnail(file)` already exists as a standalone function in `exhibit-processor.js` (around line 44). Use it directly — no extraction needed.

**Important:** Remove the old per-pair `pair.thumbnail1`/`pair.thumbnail2` assignment code (around lines 207-212 in the current file). Replace the entire `for (const pair of duplicateReport[letter])` thumbnail loop with the new group-based loop above.

- [ ] **Step 4: Run all exhibit-processor tests**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/exhibit-processor.js tests/services/exhibit-processor.test.js
git commit -m "feat(duplicates): update exhibit-processor to consume group-based duplicate report"
```

---

### Task 4: Update resolve endpoint in routes/exhibits.js

**Files:**
- Modify: `routes/exhibits.js:53-170` (POST /jobs/:jobId/resolve)
- Test: `tests/routes/exhibits-dropbox.test.js`

- [ ] **Step 1: Write failing test for new resolve payload**

Add test in `tests/routes/exhibits-dropbox.test.js`:

First, read the existing test file to understand the test setup pattern: `tests/routes/exhibits-dropbox.test.js`. Look for how `jobs` Map is populated and how `jobId` is created. Then adapt this pattern for the new tests.

The test setup should create a job in the `jobs` Map with:
- `status: 'awaiting_resolution'`
- `duplicates` in the new group format
- `exhibits` with the actual file objects

```js
describe('POST /jobs/:jobId/resolve - group format', () => {
    let jobId;

    beforeEach(() => {
        // Follow the existing pattern in this test file for creating jobs.
        // The key requirement is populating the jobs Map with group-format duplicates:
        jobId = 'test-group-resolve';
        const buf = Buffer.from('test-content');
        jobs.set(jobId, {
            status: 'awaiting_resolution',
            exhibits: {
                A: [
                    { name: 'a.png', buffer: buf, type: 'png' },
                    { name: 'b.png', buffer: Buffer.from(buf), type: 'png' },
                    { name: 'c.png', buffer: Buffer.from(buf), type: 'png' },
                ],
            },
            duplicates: {
                A: [{
                    groupId: 'A-g0',
                    files: ['a.png', 'b.png', 'c.png'],
                    defaultKeep: 'a.png',
                    edges: [
                        { file1: 'a.png', file2: 'b.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1 },
                        { file1: 'a.png', file2: 'c.png', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1 },
                    ],
                }],
            },
            sseClients: [],
        });
    });

    afterEach(() => {
        jobs.delete(jobId);
    });

    it('should accept group-based resolutions and remove files', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{
                        groupId: 'A-g0',
                        keep: ['a.png'],
                        remove: ['b.png', 'c.png'],
                    }],
                },
            });
        expect(res.status).toBe(200);
    });

    it('should reject resolutions with empty keep array', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{
                        groupId: 'A-g0',
                        keep: [],
                        remove: ['a.png', 'b.png', 'c.png'],
                    }],
                },
            });
        expect(res.status).toBe(400);
    });

    it('should reject resolutions where keep+remove does not match group files', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{
                        groupId: 'A-g0',
                        keep: ['a.png'],
                        remove: ['b.png'],
                        // missing c.png
                    }],
                },
            });
        expect(res.status).toBe(400);
    });

    it('should reject resolutions for non-existent exhibit letter', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    Z: [{
                        groupId: 'Z-g0',
                        keep: ['a.png'],
                        remove: ['b.png'],
                    }],
                },
            });
        expect(res.status).toBe(400);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/routes/exhibits-dropbox.test.js --testNamePattern="group format" --verbose`
Expected: FAIL — resolve endpoint still expects old `{file1, file2, action}` format

- [ ] **Step 3: Update the resolve endpoint**

In `routes/exhibits.js`, rewrite the POST `/jobs/:jobId/resolve` handler:

1. **Validation:** For each resolution entry, check:
   - `groupId` matches a group in `job.duplicates[letter]`
   - `keep.length >= 1`
   - Sort and compare `[...keep, ...remove]` against group's `files` array

2. **Processing:** Collect all filenames from `remove` arrays across all letters/groups. Filter `exhibits[letter]` to exclude removed files. Same downstream logic.

```js
// Collect files to remove
const filesToRemove = new Set();
const exhibits = job.exhibits || sessions.get(job.sessionId)?.exhibits;
for (const [letter, groupResolutions] of Object.entries(resolutions)) {
    // Validate exhibit letter exists
    if (!exhibits[letter]) return res.status(400).json({ error: `Exhibit letter ${letter} not found in job` });
    const groups = job.duplicates[letter];
    if (!groups) return res.status(400).json({ error: `No duplicate groups for exhibit ${letter}` });

    for (const resolution of groupResolutions) {
        const group = groups.find(g => g.groupId === resolution.groupId);
        if (!group) return res.status(400).json({ error: `Unknown groupId: ${resolution.groupId}` });
        if (!resolution.keep || resolution.keep.length === 0) {
            return res.status(400).json({ error: `Must keep at least one file in group ${resolution.groupId}` });
        }
        const allFiles = [...resolution.keep, ...resolution.remove].sort();
        const groupFiles = [...group.files].sort();
        if (JSON.stringify(allFiles) !== JSON.stringify(groupFiles)) {
            return res.status(400).json({ error: `keep+remove does not match files in group ${resolution.groupId}` });
        }
        for (const file of resolution.remove) {
            filesToRemove.add(`${letter}:${file}`);
        }
    }
}

// Filter exhibits
for (const [letter, files] of Object.entries(exhibits)) {
    exhibits[letter] = files.filter(f => !filesToRemove.has(`${letter}:${f.name}`));
}
```

- [ ] **Step 4: Run all exhibits-dropbox tests**

Run: `npx jest tests/routes/exhibits-dropbox.test.js --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add routes/exhibits.js tests/routes/exhibits-dropbox.test.js
git commit -m "feat(duplicates): update resolve endpoint for group-based resolution payload"
```

---

### Task 5: Rewrite duplicate-ui.js for group cards

**Files:**
- Rewrite: `forms/exhibits/js/duplicate-ui.js`

- [ ] **Step 0: Verify required DOM elements exist**

Read `forms/exhibits/index.html` and verify these element IDs exist: `duplicate-modal`, `duplicate-pairs`, `btn-resolve-continue`, `duplicate-file-count`. Also verify that `dup-badges-${letter}` elements exist for exhibit cards. If any are missing, add them to the HTML before proceeding.

- [ ] **Step 1: Rewrite the module**

Replace the contents of `forms/exhibits/js/duplicate-ui.js` with the group-based UI. Key changes:

1. **`showModal(report)`** — `report` is now `{ letter: [groups] }` instead of `{ letter: [pairs] }`
2. **`resolutions` object** changes from `{ letter: [{ file1, file2, action }] }` to `{ letter: [{ groupId, keep, remove }] }`
3. **`renderGroups()`** replaces `renderPairs()`:
   - Each group card shows all files horizontally with thumbnail + filename + keep/remove toggle
   - Click a file card to flip keep↔remove
   - "Keep All" button per group
   - Relationship lines section below file cards (one line per edge)
   - Last-kept-file guard: disable toggle when only 1 file is kept
4. **`updateFileCount()`** — counts total removals across all groups
5. **Thumbnails** — use `group.thumbnails[filename]` for server-provided thumbnails, fallback icon otherwise

```js
const DuplicateUI = (() => {
    let currentReport = null;
    const resolutions = {}; // { letter: [{ groupId, keep: [], remove: [] }] }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderPreview(filename, serverThumbnail) {
        if (serverThumbnail) {
            const img = document.createElement('img');
            img.src = serverThumbnail;
            img.className = 'duplicate-preview-img';
            img.alt = filename;
            return img;
        }
        const ext = filename.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'].includes(ext);
        const icon = document.createElement('i');
        icon.className = `fas ${isImage ? 'fa-file-image' : 'fa-file-pdf'}`;
        icon.style.cssText = 'font-size:2rem;color:#999;';
        return icon;
    }

    function showModal(report) {
        currentReport = report;

        // Initialize resolutions from groups
        for (const [letter, groups] of Object.entries(report)) {
            resolutions[letter] = groups.map(group => ({
                groupId: group.groupId,
                keep: [group.defaultKeep],
                remove: group.files.filter(f => f !== group.defaultKeep),
            }));
        }

        renderGroups();
        updateFileCount();

        const modal = document.getElementById('duplicate-modal');
        modal.style.display = 'flex';
        addInlineBadges(report);

        return new Promise((resolve) => {
            const btn = document.getElementById('btn-resolve-continue');
            const handler = () => {
                btn.removeEventListener('click', handler);
                modal.style.display = 'none';
                clearInlineBadges();
                resolve(resolutions);
            };
            btn.addEventListener('click', handler);
        });
    }

    function renderGroups() {
        const container = document.getElementById('duplicate-pairs');
        container.innerHTML = '';

        for (const [letter, groups] of Object.entries(currentReport)) {
            groups.forEach((group, groupIdx) => {
                const card = document.createElement('div');
                card.className = 'duplicate-pair-card';

                // Header
                const header = document.createElement('div');
                header.className = 'duplicate-pair-header';
                header.innerHTML = `
                    <span>Exhibit ${escapeHtml(letter)}: Group ${groupIdx + 1} &mdash; ${group.files.length} duplicates</span>
                `;
                card.appendChild(header);

                // File cards container
                const filesContainer = document.createElement('div');
                filesContainer.className = 'duplicate-group-files';

                group.files.forEach(filename => {
                    const fileCard = document.createElement('div');
                    fileCard.className = 'duplicate-file-card';
                    fileCard.dataset.filename = filename;

                    const isKept = resolutions[letter][groupIdx].keep.includes(filename);
                    fileCard.classList.add(isKept ? 'marked-keep' : 'marked-remove');

                    // Preview
                    const previewEl = document.createElement('div');
                    previewEl.className = 'duplicate-preview';
                    const thumbnail = group.thumbnails ? group.thumbnails[filename] : null;
                    previewEl.appendChild(renderPreview(filename, thumbnail));
                    fileCard.appendChild(previewEl);

                    // Filename
                    const nameEl = document.createElement('div');
                    nameEl.className = 'file-name';
                    nameEl.textContent = filename;
                    fileCard.appendChild(nameEl);

                    // Toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = `duplicate-toggle ${isKept ? 'toggle-keep' : 'toggle-remove'}`;
                    toggleBtn.textContent = isKept ? 'Keep' : 'Remove';
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFile(letter, groupIdx, filename);
                    });
                    fileCard.appendChild(toggleBtn);

                    filesContainer.appendChild(fileCard);
                });

                card.appendChild(filesContainer);

                // Relationships section
                if (group.edges.length > 0) {
                    const relSection = document.createElement('div');
                    relSection.className = 'duplicate-relationships';
                    relSection.innerHTML = '<strong>Relationships:</strong>';
                    for (const edge of group.edges) {
                        const line = document.createElement('div');
                        line.className = 'duplicate-relationship-line';
                        const badgeClass = edge.matchType === 'EXACT_DUPLICATE' ? 'exact' : 'similar';
                        const label = edge.matchType === 'EXACT_DUPLICATE'
                            ? 'Exact Duplicate'
                            : `Visual Match (${edge.confidence}%)`;
                        line.innerHTML = `${escapeHtml(edge.file1)} &harr; ${escapeHtml(edge.file2)} &mdash; <span class="duplicate-badge ${badgeClass}">${label}</span>`;
                        relSection.appendChild(line);
                    }
                    card.appendChild(relSection);
                }

                // Keep All button
                const actionsEl = document.createElement('div');
                actionsEl.className = 'duplicate-actions';
                const keepAllBtn = document.createElement('button');
                keepAllBtn.textContent = 'Keep All';
                keepAllBtn.addEventListener('click', () => {
                    resolutions[letter][groupIdx].keep = [...group.files];
                    resolutions[letter][groupIdx].remove = [];
                    renderGroups();
                    updateFileCount();
                });
                actionsEl.appendChild(keepAllBtn);
                card.appendChild(actionsEl);

                container.appendChild(card);
            });
        }

        updateToggleStates();
    }

    function toggleFile(letter, groupIdx, filename) {
        const res = resolutions[letter][groupIdx];
        if (res.keep.includes(filename)) {
            // Don't allow removing the last kept file
            if (res.keep.length <= 1) return;
            res.keep = res.keep.filter(f => f !== filename);
            res.remove.push(filename);
        } else {
            res.remove = res.remove.filter(f => f !== filename);
            res.keep.push(filename);
        }
        renderGroups();
        updateFileCount();
    }

    function updateToggleStates() {
        // Lock the last kept file's toggle in each group
        // Scope to group cards to avoid cross-group filename collisions
        const container = document.getElementById('duplicate-pairs');
        const groupCards = container.querySelectorAll('.duplicate-pair-card');
        let cardIdx = 0;

        for (const [letter, groupResolutions] of Object.entries(resolutions)) {
            groupResolutions.forEach((res) => {
                const groupCard = groupCards[cardIdx++];
                if (!groupCard) return;
                if (res.keep.length === 1) {
                    const fileCards = groupCard.querySelectorAll('.duplicate-file-card');
                    fileCards.forEach(card => {
                        if (card.dataset.filename === res.keep[0] && card.classList.contains('marked-keep')) {
                            card.classList.add('marked-keep-locked');
                            const btn = card.querySelector('.duplicate-toggle');
                            if (btn) btn.disabled = true;
                        }
                    });
                }
            });
        }
    }

    function updateFileCount() {
        const countEl = document.getElementById('duplicate-file-count');
        let removeCount = 0;
        for (const groups of Object.values(resolutions)) {
            for (const group of groups) {
                removeCount += group.remove.length;
            }
        }
        countEl.textContent = removeCount === 0
            ? 'Keeping all files'
            : `Removing ${removeCount} file(s)`;
    }

    function addInlineBadges(report) {
        for (const [letter, groups] of Object.entries(report)) {
            const badgeContainer = document.getElementById(`dup-badges-${letter}`);
            if (!badgeContainer) continue;
            badgeContainer.innerHTML = '';
            const totalDupes = groups.reduce((sum, g) => sum + g.files.length, 0);
            const badge = document.createElement('span');
            badge.className = 'duplicate-badge exact';
            badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${totalDupes} duplicates`;
            badgeContainer.appendChild(badge);
        }
    }

    function clearInlineBadges() {
        document.querySelectorAll('.duplicate-badges').forEach(el => { el.innerHTML = ''; });
    }

    function hide() {
        document.getElementById('duplicate-modal').style.display = 'none';
        clearInlineBadges();
    }

    return { showModal, hide };
})();
```

- [ ] **Step 2: Manually verify the modal renders correctly**

This is a frontend UI rewrite — manual testing is required. Start the dev server (`npm run dev`), trigger a duplicate detection with known duplicate files, and verify:
- Group card renders with all files
- Keep/Remove toggles work
- Last-kept-file guard works (can't remove all)
- Keep All button works
- Relationship lines show correct edges
- File count updates correctly

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/duplicate-ui.js
git commit -m "feat(duplicates): rewrite duplicate-ui.js for group-based resolution cards"
```

---

### Task 6: Update form-submission.js resolution payload

**Files:**
- Modify: `forms/exhibits/js/form-submission.js:144-273` (connectSSE duplicates handler)

- [ ] **Step 1: Read form-submission.js and understand current resolve flow**

Read `forms/exhibits/js/form-submission.js` lines 144-273 (the `connectSSE` function). Specifically examine:
1. How the `duplicates` event listener calls `DuplicateUI.showModal()`
2. Whether the return value of `showModal()` is transformed before POSTing to `/resolve`
3. The exact shape of the `body` in the fetch call

- [ ] **Step 2: Adapt the resolve POST if needed**

Since `DuplicateUI.showModal()` now returns `{ letter: [{ groupId, keep, remove }] }` (from Task 5), the resolve POST body `{ resolutions }` should pass through directly. However, if the current code transforms or restructures the resolutions object before posting (e.g., extracting specific fields, remapping keys), update that transformation to match the new shape.

If the code does something like:
```js
// Old: might be reshaping the resolutions
const formatted = {};
for (const [letter, pairs] of Object.entries(resolutions)) {
    formatted[letter] = pairs.map(p => ({ file1: p.file1, file2: p.file2, action: p.action }));
}
```
Remove/replace that transformation so the new group format passes through unchanged.

If the code simply does `body: JSON.stringify({ resolutions })` with no transformation, no changes are needed.

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat(duplicates): update form-submission resolve payload for group format"
```

---

### Task 7: Update CSS for group cards

**Files:**
- Modify: `forms/exhibits/styles.css` (duplicate-related styles, lines ~366-529)

- [ ] **Step 1: Add group-specific styles**

Add to `forms/exhibits/styles.css`:

```css
/* Group file cards - horizontal wrap layout */
.duplicate-group-files {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
}

/* Locked keep state - last remaining kept file */
.duplicate-file-card.marked-keep-locked {
    border-color: #28a745;
    background-color: rgba(40, 167, 69, 0.08);
    opacity: 0.7;
    cursor: not-allowed;
}

.duplicate-file-card.marked-keep-locked .duplicate-toggle {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Relationship lines section */
.duplicate-relationships {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: #666;
    border-top: 1px solid #eee;
}

.duplicate-relationship-line {
    padding: 2px 0;
}

.duplicate-relationship-line .duplicate-badge {
    font-size: 0.75rem;
    padding: 1px 6px;
}
```

Also verify/update `.duplicate-group-files` if it already exists (the exploration found it at lines 426-432). Adjust as needed to ensure the horizontal flex layout accommodates 3+ cards.

- [ ] **Step 2: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "style(duplicates): add group card, locked keep, and relationship line styles"
```

---

### Task 8: Integration test — end-to-end group flow

**Files:**
- Test: `tests/services/exhibit-integration.test.js`

- [ ] **Step 1: Write integration test**

Add an integration test that verifies the full flow: 3+ identical files → group detection → resolution → file removal:

```js
describe('Group duplicate detection integration', () => {
    it('should detect a group of 3 exact duplicates and resolve correctly', async () => {
        const buf = fs.readFileSync(path.join(__dirname, '../../test-exhibit-files/sample.png'));
        const exhibits = {
            A: [
                { name: 'original.png', buffer: buf, type: 'png' },
                { name: 'copy1.png', buffer: Buffer.from(buf), type: 'png' },
                { name: 'copy2.png', buffer: Buffer.from(buf), type: 'png' },
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'GroupTest',
            exhibits,
            outputDir: tmpDir,
        });

        expect(result.paused).toBe(true);
        const groups = result.duplicates.A;
        expect(groups).toHaveLength(1);
        expect(groups[0].files).toHaveLength(3);
        expect(groups[0].files).toContain('original.png');
        expect(groups[0].files).toContain('copy1.png');
        expect(groups[0].files).toContain('copy2.png');

        // Simulate resolution: keep original, remove copies
        const filesToRemove = new Set(['copy1.png', 'copy2.png']);
        exhibits.A = exhibits.A.filter(f => !filesToRemove.has(f.name));
        expect(exhibits.A).toHaveLength(1);
        expect(exhibits.A[0].name).toBe('original.png');
    });

    it('should detect two separate groups in one exhibit', async () => {
        // Use real image files — raw Buffers are not valid PNGs and will crash Sharp/dHash.
        // Create two distinct real images using Sharp:
        const sharp = require('sharp');
        const buf1 = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
        const buf2 = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toBuffer();

        const exhibits = {
            A: [
                { name: 'set1-a.png', buffer: buf1, type: 'png' },
                { name: 'set1-b.png', buffer: Buffer.from(buf1), type: 'png' },
                { name: 'set2-a.png', buffer: buf2, type: 'png' },
                { name: 'set2-b.png', buffer: Buffer.from(buf2), type: 'png' },
                { name: 'unique.png', buffer: await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer(), type: 'png' },
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'MultiGroupTest',
            exhibits,
            outputDir: tmpDir,
        });

        expect(result.paused).toBe(true);
        const groups = result.duplicates.A;
        expect(groups).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npx jest tests/services/exhibit-integration.test.js --testNamePattern="Group duplicate" --verbose`
Expected: All PASS

- [ ] **Step 3: Run full test suite**

Run: `npx jest --verbose`
Expected: All tests PASS. If any old tests fail due to the format change, fix them.

- [ ] **Step 4: Commit**

```bash
git add tests/services/exhibit-integration.test.js
git commit -m "test(duplicates): add integration tests for group-based duplicate detection"
```

---

### Task 9: Final verification and cleanup

- [ ] **Step 1: Run full test suite one more time**

Run: `npx jest --verbose`
Expected: All tests PASS

- [ ] **Step 2: Verify no console errors or regressions**

Start dev server: `npm run dev`
- Test with 2 identical files → should show 1 group with 2 files
- Test with 3 identical files → should show 1 group with 3 files
- Test with 2 separate pairs → should show 2 groups
- Test keep/remove toggles, Keep All, last-file guard
- Test Continue → pipeline resumes and produces PDF

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore(duplicates): final cleanup for group-based duplicate detection"
```

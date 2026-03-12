# PDF Visual Duplicate Detection — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Layer 2 visual duplicate detection to include PDF pages (rendered via MuPDF), remove Layer 3 (OCR/Tesseract), and update the frontend to handle new match types and page numbers.

**Architecture:** New `renderPdfPages` method renders PDF pages to PNG via MuPDF WASM. Modified `findVisualMatches` uses a two-pass approach: Pass 1 renders each page and computes dHash (discards buffer), Pass 2 re-renders only candidate pairs for pixel comparison. `detectDuplicates` drops the Layer 3 OCR call; 80-95% similarity pairs become `LIKELY_MATCH` instead. Frontend gets a new badge type and page number display.

**Tech Stack:** Node.js, MuPDF WASM (`mupdf` package, already installed), Sharp, pdf-lib, Jest

**Design Spec:** `docs/superpowers/specs/2026-03-12-pdf-visual-duplicate-detection-design.md`

---

## Chunk 1: renderPdfPages Method (Tasks 1-2)

### Task 1: Add `renderPdfPages` static method

Renders all pages of a PDF to PNG buffers via MuPDF WASM. Returns an array of `{ pageNum, buffer }` objects. Returns empty array on failure. Explicitly destroys MuPDF objects in `finally` blocks.

**Files:**
- Modify: `services/duplicate-detector.js` (add method after `hammingDistance` at line 76)

- [ ] **Step 1: Add the `renderPdfPages` method**

Insert after the `hammingDistance` method (after line 76). The MuPDF usage pattern matches the existing code in `services/exhibit-processor.js:58-70`:

```javascript
/**
 * Render all pages of a PDF to PNG buffers via MuPDF WASM.
 * @param {Buffer} buffer - PDF file contents
 * @returns {Promise<Array<{pageNum: number, buffer: Buffer}>>} PNG buffers per page, or empty array on failure
 */
static async renderPdfPages(buffer) {
    let doc;
    try {
        const mupdf = await import('mupdf');
        doc = mupdf.default.Document.openDocument(buffer, 'application/pdf');
        const pageCount = doc.countPages();
        const pages = [];

        for (let i = 0; i < pageCount; i++) {
            let page, pixmap;
            try {
                page = doc.loadPage(i);
                pixmap = page.toPixmap(
                    [0.5, 0, 0, 0.5, 0, 0],
                    mupdf.default.ColorSpace.DeviceRGB,
                    false,
                    true
                );
                const pngBuffer = Buffer.from(pixmap.asPNG());
                pages.push({ pageNum: i + 1, buffer: pngBuffer });
            } catch (pageErr) {
                logger.warn(`PDF page ${i + 1} render failed: ${pageErr.message}`);
            } finally {
                if (pixmap) pixmap.destroy();
                if (page) page.destroy();
            }
        }

        return pages;
    } catch (err) {
        logger.warn(`PDF render failed: ${err.message}`);
        return [];
    } finally {
        if (doc) doc.destroy();
    }
}
```

Key details:
- Uses `await import('mupdf')` for dynamic ESM import in CJS (matches existing pattern)
- Scale matrix `[0.5, 0, 0, 0.5, 0, 0]` = 0.5× (matches `exhibit-processor.js:63`)
- Per-page try/catch: a single bad page doesn't kill the whole PDF
- All MuPDF objects (`doc`, `page`, `pixmap`) destroyed in `finally` blocks
- Returns 1-indexed page numbers (`pageNum: i + 1`)

- [ ] **Step 2: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): add renderPdfPages method for MuPDF-based PDF page rendering"
```

---

### Task 2: Tests for `renderPdfPages`

**Files:**
- Modify: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Add `renderPdfPages` test suite**

We need a real PDF buffer to test against MuPDF. Use `pdf-lib` (already a dependency) to create test PDFs programmatically. Add this `describe` block after the `hammingDistance` tests (after line 157):

```javascript
describe('renderPdfPages', () => {
    const { PDFDocument } = require('pdf-lib');

    it('should render a single-page PDF to one PNG buffer', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([200, 200]);
        const pdfBytes = await pdfDoc.save();

        const pages = await DuplicateDetector.renderPdfPages(Buffer.from(pdfBytes));
        expect(pages).toHaveLength(1);
        expect(pages[0].pageNum).toBe(1);
        expect(Buffer.isBuffer(pages[0].buffer)).toBe(true);
        // PNG magic bytes: 0x89 0x50 0x4E 0x47
        expect(pages[0].buffer[0]).toBe(0x89);
        expect(pages[0].buffer[1]).toBe(0x50);
    });

    it('should render a multi-page PDF to correct number of pages', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([200, 200]);
        pdfDoc.addPage([200, 200]);
        pdfDoc.addPage([200, 200]);
        const pdfBytes = await pdfDoc.save();

        const pages = await DuplicateDetector.renderPdfPages(Buffer.from(pdfBytes));
        expect(pages).toHaveLength(3);
        expect(pages[0].pageNum).toBe(1);
        expect(pages[1].pageNum).toBe(2);
        expect(pages[2].pageNum).toBe(3);
    });

    it('should return empty array for corrupt buffer', async () => {
        const pages = await DuplicateDetector.renderPdfPages(Buffer.from('not a pdf'));
        expect(pages).toEqual([]);
    });

    it('should return empty array for empty buffer', async () => {
        const pages = await DuplicateDetector.renderPdfPages(Buffer.alloc(0));
        expect(pages).toEqual([]);
    });
});
```

- [ ] **Step 2: Run tests**

```bash
npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All existing tests pass + 4 new `renderPdfPages` tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/services/duplicate-detector.test.js
git commit -m "test(exhibits): add renderPdfPages unit tests"
```

---

## Chunk 2: Rewrite findVisualMatches with PDF Support (Tasks 3-4)

### Task 3: Rewrite `findVisualMatches` with two-pass PDF support

The current method (lines 140-220) only processes image files. The new version:
1. Expands both images and PDFs into "visual entries" (Pass 1: render + dHash, discard buffer)
2. Filters pairs by hamming distance, skipping same-file pairs
3. Re-renders candidate pairs on demand for pixel comparison (Pass 2)
4. Returns matches with `page1`/`page2` fields and `LIKELY_MATCH` for 80-95% band

**Files:**
- Modify: `services/duplicate-detector.js` — replace `findVisualMatches` method (lines 140-220)

- [ ] **Step 1: Replace `findVisualMatches` method body**

Replace lines 140-220 with the new implementation. The new method accepts the same signature and returns the same shape, but now processes PDFs too:

```javascript
static async findVisualMatches(files, alreadyMatchedPairs = new Set(), onPairProgress, onRenderProgress) {
    const matches = [];
    const likelyMatches = [];
    const IMAGE_TYPES_SET = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);
    const PDF_TYPES_SET = new Set(['pdf']);
    const { processWithConcurrency } = require('../utils/concurrency');
    const HAMMING_THRESHOLD = 15;

    // --- Pass 1: Expand files to visual entries and compute dHash ---
    // Each entry: { sourceIndex, page, hash }
    // sourceIndex = index in original files array, page = null for images or 1-based for PDFs
    const visualEntries = [];
    let renderedFiles = 0;
    const totalFilesToRender = files.length;

    await processWithConcurrency(
        files.map((f, idx) => ({ file: f, idx })),
        async ({ file, idx }) => {
            if (IMAGE_TYPES_SET.has(file.type)) {
                const hash = await DuplicateDetector.computeDHash(file.buffer);
                visualEntries.push({ sourceIndex: idx, page: null, hash });
            } else if (PDF_TYPES_SET.has(file.type)) {
                const pages = await DuplicateDetector.renderPdfPages(file.buffer);
                for (const { pageNum, buffer: pngBuf } of pages) {
                    const hash = await DuplicateDetector.computeDHash(pngBuf);
                    // pngBuf is NOT stored — only the hash is kept (memory optimization)
                    visualEntries.push({ sourceIndex: idx, page: pageNum, hash });
                }
            }
            renderedFiles++;
            if (onRenderProgress) {
                onRenderProgress(renderedFiles, totalFilesToRender);
            }
        },
        4
    );

    if (visualEntries.length < 2) return { matches, likelyMatches };

    // --- Hamming distance filter ---
    const candidatePairs = [];
    for (let a = 0; a < visualEntries.length; a++) {
        for (let b = a + 1; b < visualEntries.length; b++) {
            const ea = visualEntries[a];
            const eb = visualEntries[b];

            // Skip same-file pairs (pages within the same PDF)
            if (ea.sourceIndex === eb.sourceIndex) continue;

            // Skip already matched pairs (use original file names)
            const pairKey = `${files[ea.sourceIndex].name}|${files[eb.sourceIndex].name}`;
            if (alreadyMatchedPairs.has(pairKey)) continue;

            // Null hash = include as candidate (safe fallback)
            if (ea.hash === null || eb.hash === null) {
                candidatePairs.push({ a, b });
                continue;
            }

            if (DuplicateDetector.hammingDistance(ea.hash, eb.hash) <= HAMMING_THRESHOLD) {
                candidatePairs.push({ a, b });
            }
        }
    }

    // --- Pass 2: Re-render and pixel compare candidates ---
    const totalPairs = candidatePairs.length;
    let completedPairs = 0;

    // Helper: get PNG buffer for a visual entry (re-render if PDF page)
    const getBuffer = async (entry) => {
        if (entry.page === null) {
            return files[entry.sourceIndex].buffer; // image: use directly
        }
        // PDF page: re-render just this page
        let doc, page, pixmap;
        try {
            const mupdf = await import('mupdf');
            doc = mupdf.default.Document.openDocument(
                files[entry.sourceIndex].buffer, 'application/pdf'
            );
            page = doc.loadPage(entry.page - 1); // 0-indexed
            pixmap = page.toPixmap(
                [0.5, 0, 0, 0.5, 0, 0],
                mupdf.default.ColorSpace.DeviceRGB, false, true
            );
            return Buffer.from(pixmap.asPNG());
        } finally {
            if (pixmap) pixmap.destroy();
            if (page) page.destroy();
            if (doc) doc.destroy();
        }
    };

    // Build details string with page info
    const detailStr = (similarity, ea, eb) => {
        const pct = Math.round(similarity * 100);
        const name1 = files[ea.sourceIndex].name;
        const name2 = files[eb.sourceIndex].name;
        const p1 = ea.page ? ` p.${ea.page}` : '';
        const p2 = eb.page ? ` p.${eb.page}` : '';
        if (p1 || p2) {
            return `Visual similarity: ${pct}% (${name1}${p1} vs ${name2}${p2})`;
        }
        return `Visual similarity: ${pct}%`;
    };

    await processWithConcurrency(candidatePairs, async ({ a, b }) => {
        const ea = visualEntries[a];
        const eb = visualEntries[b];

        completedPairs++;
        if (onPairProgress && totalPairs > 0) {
            onPairProgress(completedPairs, totalPairs);
        }

        try {
            const [buf1, buf2] = await Promise.all([getBuffer(ea), getBuffer(eb)]);
            const similarity = await DuplicateDetector.computeVisualSimilarity(buf1, buf2);

            if (similarity >= VISUAL_MATCH_THRESHOLD) {
                matches.push({
                    file1: files[ea.sourceIndex].name,
                    file2: files[eb.sourceIndex].name,
                    page1: ea.page,
                    page2: eb.page,
                    matchType: 'VISUAL_MATCH',
                    confidence: Math.round(similarity * 100),
                    layer: 2,
                    details: detailStr(similarity, ea, eb),
                });
            } else if (similarity >= VISUAL_MAYBE_LOW) {
                likelyMatches.push({
                    file1: files[ea.sourceIndex].name,
                    file2: files[eb.sourceIndex].name,
                    page1: ea.page,
                    page2: eb.page,
                    matchType: 'LIKELY_MATCH',
                    confidence: Math.round(similarity * 100),
                    layer: 2,
                    details: detailStr(similarity, ea, eb),
                });
            }
        } catch (err) {
            logger.warn(`Visual comparison failed for ${files[ea.sourceIndex].name} vs ${files[eb.sourceIndex].name}: ${err.message}`);
        }
    }, 4);

    return { matches, likelyMatches };
}
```

Key changes from the current implementation:
- `IMAGE_TYPES_SET` check expanded: PDFs now enter the pipeline via `renderPdfPages`
- **Two-pass memory strategy**: Pass 1 computes dHash only (PNG buffers discarded). Pass 2 re-renders only candidate pairs via `getBuffer()`.
- **Same-file pair skip**: `ea.sourceIndex === eb.sourceIndex` prevents comparing pages within the same PDF
- **`alreadyMatchedPairs`** uses original file names (not page-suffixed), preserving Layer 1 → Layer 2 deduplication
- **Return shape change**: returns `{ matches, likelyMatches }` instead of `{ matches, maybePairs }`. The `likelyMatches` array contains full match objects (not indices) since Layer 3 is removed.
- **New `onRenderProgress` callback**: reports file-level progress during Pass 1
- **Match objects** include `page1` and `page2` fields (null for images)

- [ ] **Step 2: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): rewrite findVisualMatches with PDF page support and two-pass memory strategy"
```

---

### Task 4: Update `detectDuplicates` to remove Layer 3 and adjust progress

The `detectDuplicates` method (lines 303-344) currently calls Layer 3 (OCR) on maybePairs. Remove that call. Adjust progress ranges. Handle the new `likelyMatches` return from `findVisualMatches`.

**Files:**
- Modify: `services/duplicate-detector.js` — rewrite `detectDuplicates` method

- [ ] **Step 1: Replace `detectDuplicates` method body**

Replace the existing `detectDuplicates` method (lines 303-344):

```javascript
static async detectDuplicates(files, onProgress) {
    if (files.length < 2) return { duplicates: [] };

    const allDuplicates = [];
    const progressFn = onProgress || (() => {});

    // Layer 1: Exact hash matching (0-10%)
    progressFn(0, `Checking exact hashes: ${files.length} files`);
    const exactDupes = DuplicateDetector.findExactDuplicates(files);
    allDuplicates.push(...exactDupes);
    progressFn(10, `Hash check complete: ${exactDupes.length} exact match(es)`);

    const matchedPairs = new Set(exactDupes.map(d => `${d.file1}|${d.file2}`));

    // Layer 2: Visual similarity with PDF pages (10-90%)
    const { matches: visualMatches, likelyMatches } = await DuplicateDetector.findVisualMatches(
        files,
        matchedPairs,
        (pairNum, totalPairs) => {
            const subPct = 30 + Math.round((pairNum / totalPairs) * 60);
            progressFn(subPct, `Visual comparison: pair ${pairNum} of ${totalPairs}`);
        },
        (fileNum, totalFiles) => {
            const subPct = 10 + Math.round((fileNum / totalFiles) * 20);
            progressFn(subPct, `Rendering pages: file ${fileNum} of ${totalFiles}`);
        }
    );
    allDuplicates.push(...visualMatches);
    allDuplicates.push(...likelyMatches);
    progressFn(90, `Visual check complete: ${visualMatches.length} match(es), ${likelyMatches.length} likely`);

    progressFn(100, `Duplicate scan complete: ${allDuplicates.length} total match(es)`);

    return { duplicates: allDuplicates };
}
```

Key changes:
- **Layer 3 removed**: No more `findContentMatches` call, no Tesseract
- **`likelyMatches`** (80-95% band) pushed directly into `allDuplicates` instead of being sent to OCR
- **Progress ranges**: render phase 10-30%, compare phase 30-90%, complete at 90-100%
- **Two callbacks** passed to `findVisualMatches`: `onPairProgress` for pixel comparison, `onRenderProgress` for PDF rendering
- **Module docstring** at top of file should be updated from "Three-layer" to "Two-layer"

- [ ] **Step 2: Update module docstring**

Replace lines 1-10 at the top of the file:

```javascript
/**
 * Duplicate Detector Service
 *
 * Two-layer duplicate detection for exhibit files:
 * Layer 1: SHA-256 hash comparison (instant, exact matches)
 * Layer 2: Visual similarity via dHash pre-filter + pixel comparison (images and PDF pages)
 *
 * @module services/duplicate-detector
 */
```

- [ ] **Step 3: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): remove Layer 3 OCR, add LIKELY_MATCH type, update progress ranges"
```

---

## Chunk 3: Tests for New Visual Matching (Tasks 5-6)

### Task 5: Tests for PDF visual matching in `findVisualMatches`

**Files:**
- Modify: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Update existing `findVisualMatches` tests for new return shape**

The existing test at line 192 checks `maybePairs`. Update it to check `likelyMatches`:

```javascript
// In the "should filter out very different images via dHash" test:
const { matches, likelyMatches } = await DuplicateDetector.findVisualMatches(files);
expect(matches).toHaveLength(0);
expect(likelyMatches).toHaveLength(0);
```

- [ ] **Step 2: Add PDF visual matching tests**

Add a new `describe` block after the existing `findVisualMatches with dHash pre-filter` block. These tests use `pdf-lib` to create test PDFs with visually identical or different content:

```javascript
describe('findVisualMatches with PDF pages', () => {
    const sharp = require('sharp');
    const { PDFDocument, rgb } = require('pdf-lib');

    async function createPdfWithColor(r, g, b, pageCount = 1) {
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < pageCount; i++) {
            const page = pdfDoc.addPage([200, 200]);
            page.drawRectangle({ x: 0, y: 0, width: 200, height: 200, color: rgb(r, g, b) });
        }
        return Buffer.from(await pdfDoc.save());
    }

    it('should detect identical PDFs as VISUAL_MATCH', async () => {
        const pdf = await createPdfWithColor(1, 0, 0);
        const files = [
            { name: 'doc1.pdf', buffer: pdf, type: 'pdf' },
            { name: 'doc2.pdf', buffer: Buffer.from(pdf), type: 'pdf' },
        ];

        const { matches } = await DuplicateDetector.findVisualMatches(files);
        expect(matches.length).toBeGreaterThanOrEqual(1);
        expect(matches[0].file1).toBe('doc1.pdf');
        expect(matches[0].file2).toBe('doc2.pdf');
        expect(matches[0].page1).toBe(1);
        expect(matches[0].page2).toBe(1);
        expect(matches[0].matchType).toBe('VISUAL_MATCH');
    });

    it('should skip same-file page pairs', async () => {
        const pdf = await createPdfWithColor(1, 0, 0, 3);
        const files = [
            { name: 'multi.pdf', buffer: pdf, type: 'pdf' },
        ];

        // Single file with 3 pages — no cross-file pairs exist
        const { matches, likelyMatches } = await DuplicateDetector.findVisualMatches(files);
        expect(matches).toHaveLength(0);
        expect(likelyMatches).toHaveLength(0);
    });

    it('should include page numbers in match details', async () => {
        const pdf = await createPdfWithColor(1, 0, 0);
        const files = [
            { name: 'a.pdf', buffer: pdf, type: 'pdf' },
            { name: 'b.pdf', buffer: Buffer.from(pdf), type: 'pdf' },
        ];

        const { matches } = await DuplicateDetector.findVisualMatches(files);
        expect(matches[0].details).toContain('p.1');
    });

    it('should compare images and PDF pages cross-type', async () => {
        // Create a red image and a red-background PDF — they should be somewhat similar
        const redImage = await sharp({
            create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 0, b: 0 } }
        }).png().toBuffer();
        const redPdf = await createPdfWithColor(1, 0, 0);

        const files = [
            { name: 'red.png', buffer: redImage, type: 'png' },
            { name: 'red.pdf', buffer: redPdf, type: 'pdf' },
        ];

        // Should at minimum not crash — cross-type comparison works
        const result = await DuplicateDetector.findVisualMatches(files);
        expect(result).toHaveProperty('matches');
        expect(result).toHaveProperty('likelyMatches');
    });

    it('should report render progress', async () => {
        const pdf = await createPdfWithColor(1, 0, 0);
        const files = [
            { name: 'a.pdf', buffer: pdf, type: 'pdf' },
            { name: 'b.pdf', buffer: Buffer.from(pdf), type: 'pdf' },
        ];

        const renderCalls = [];
        await DuplicateDetector.findVisualMatches(
            files,
            new Set(),
            null,
            (done, total) => renderCalls.push({ done, total })
        );

        expect(renderCalls.length).toBeGreaterThan(0);
        expect(renderCalls[renderCalls.length - 1].done).toBe(2);
    });

    it('should handle corrupt PDF gracefully (no visual entries)', async () => {
        const files = [
            { name: 'bad.pdf', buffer: Buffer.from('not a pdf'), type: 'pdf' },
            { name: 'also-bad.pdf', buffer: Buffer.from('also not a pdf'), type: 'pdf' },
        ];

        const { matches, likelyMatches } = await DuplicateDetector.findVisualMatches(files);
        expect(matches).toHaveLength(0);
        expect(likelyMatches).toHaveLength(0);
    });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/services/duplicate-detector.test.js
git commit -m "test(exhibits): add PDF visual matching and cross-type comparison tests"
```

---

### Task 6: Tests for updated `detectDuplicates` pipeline

**Files:**
- Modify: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Add tests for the updated pipeline**

Add to the existing `detectDuplicates (full pipeline)` describe block:

```javascript
it('should not call findContentMatches (Layer 3 removed)', async () => {
    const spy = jest.spyOn(DuplicateDetector, 'findContentMatches');
    const sharp = require('sharp');
    const img = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).png().toBuffer();

    const files = [
        { name: 'a.png', buffer: img, type: 'png' },
        { name: 'b.png', buffer: Buffer.from(img), type: 'png' },
    ];

    await DuplicateDetector.detectDuplicates(files);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

it('should include LIKELY_MATCH results in duplicates array', async () => {
    // Mock findVisualMatches to return a likelyMatch
    const originalFVM = DuplicateDetector.findVisualMatches;
    DuplicateDetector.findVisualMatches = jest.fn().mockResolvedValue({
        matches: [],
        likelyMatches: [{
            file1: 'a.png',
            file2: 'b.png',
            page1: null,
            page2: null,
            matchType: 'LIKELY_MATCH',
            confidence: 87,
            layer: 2,
            details: 'Visual similarity: 87%',
        }],
    });

    const files = [
        { name: 'a.png', buffer: Buffer.from('x'), type: 'png' },
        { name: 'b.png', buffer: Buffer.from('y'), type: 'png' },
    ];

    const result = await DuplicateDetector.detectDuplicates(files);
    expect(result.duplicates.some(d => d.matchType === 'LIKELY_MATCH')).toBe(true);

    DuplicateDetector.findVisualMatches = originalFVM;
});
```

- [ ] **Step 2: Run tests**

```bash
npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/services/duplicate-detector.test.js
git commit -m "test(exhibits): add detectDuplicates pipeline tests for Layer 3 removal and LIKELY_MATCH"
```

---

## Chunk 4: Frontend Updates (Task 7)

### Task 7: Update `duplicate-ui.js` for LIKELY_MATCH and page numbers

The frontend needs to:
1. Display a "Likely Match" badge for `LIKELY_MATCH` type (currently falls through to "Content Match")
2. Show page numbers in file names when `page1`/`page2` are present

**Files:**
- Modify: `forms/exhibits/js/duplicate-ui.js` — lines 88-93 (badge logic) and lines 96-97 (file name display)

- [ ] **Step 1: Update badge rendering**

Replace lines 88-93 in `duplicate-ui.js`:

```javascript
const badgeClass = pair.matchType === 'EXACT_DUPLICATE' ? 'exact' : 'similar';
const badgeText = pair.matchType === 'EXACT_DUPLICATE'
    ? 'Exact Duplicate'
    : pair.matchType === 'VISUAL_MATCH'
        ? `Visual Match (${pair.confidence}%)`
        : pair.matchType === 'LIKELY_MATCH'
            ? `Likely Match (${pair.confidence}%)`
            : `Content Match (${pair.confidence}%)`;
```

- [ ] **Step 2: Update file name display to show page numbers**

Replace lines 96-97 where `safeFile1` and `safeFile2` are built:

```javascript
const safeFile1 = escapeHtml(pair.file1) + (pair.page1 ? ` <span class="page-ref">p.${pair.page1}</span>` : '');
const safeFile2 = escapeHtml(pair.file2) + (pair.page2 ? ` <span class="page-ref">p.${pair.page2}</span>` : '');
```

Note: The `page-ref` span can be styled in the exhibit styles if needed, but the default rendering is fine for now.

- [ ] **Step 3: Update inline badge rendering**

In `addInlineBadges` (line 206-208), update the badge text to handle `LIKELY_MATCH`:

```javascript
const isExact = pair.matchType === 'EXACT_DUPLICATE';
const isLikely = pair.matchType === 'LIKELY_MATCH';
badge.className = `duplicate-badge ${isExact ? 'exact' : 'similar'}`;
badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${isExact ? 'Duplicate' : isLikely ? 'Likely' : 'Similar'}`;
```

- [ ] **Step 4: Commit**

```bash
git add forms/exhibits/js/duplicate-ui.js
git commit -m "feat(exhibits): add LIKELY_MATCH badge and page number display in duplicate UI"
```

---

## Chunk 5: Full Verification (Task 8)

### Task 8: End-to-end verification

- [ ] **Step 1: Run full duplicate detector test suite**

```bash
npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All tests pass (existing + new).

- [ ] **Step 2: Run all exhibit-related test suites**

```bash
npx jest tests/services/ --verbose
```

Expected: All exhibit service tests pass. The exhibit-processor tests should still pass since `detectDuplicates` returns the same `{ duplicates: [...] }` shape.

- [ ] **Step 3: Verify interface compatibility**

Confirm:
- `detectDuplicates` signature unchanged: `(files, onProgress) → { duplicates }`
- Match objects still have `file1`, `file2`, `matchType`, `confidence`, `layer`, `details`
- New `page1`, `page2` fields are additive (null for images, number for PDF pages)
- `findContentMatches` and `jaccardSimilarity` still exist (just not called)
- `LIKELY_MATCH` objects appear in the `duplicates` array alongside `VISUAL_MATCH` and `EXACT_DUPLICATE`

- [ ] **Step 4: Final commit (if any fixups needed)**

Only if earlier steps required adjustments.

---

## Summary

| Chunk | Tasks | What Changes |
|-------|-------|-------------|
| 1 | 1-2 | Add `renderPdfPages` method + tests |
| 2 | 3-4 | Rewrite `findVisualMatches` with PDF support, two-pass memory; update `detectDuplicates` to remove Layer 3 |
| 3 | 5-6 | Tests for PDF visual matching, cross-type comparison, pipeline changes |
| 4 | 7 | Frontend: `LIKELY_MATCH` badge + page number display |
| 5 | 8 | Full verification |

**Total: 8 tasks, ~7 commits**

**Files modified:**
- `services/duplicate-detector.js` (new method + 2 method rewrites + docstring update)
- `tests/services/duplicate-detector.test.js` (~6 new test suites)
- `forms/exhibits/js/duplicate-ui.js` (badge + page number display)

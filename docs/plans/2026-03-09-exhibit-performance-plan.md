# Exhibit Consolidator Performance Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce exhibit consolidator processing time from ~3.5 min to ~50-90 seconds for 16 documents by adding parallelism, eliminating redundant work, and bumping Cloud Run resources.

**Architecture:** Add a shared bounded-concurrency utility. Parallelize duplicate detection and PDF assembly across exhibit letters. Eliminate redundant sharp calls and separator page rebuilds. Offload pdf-lib save() to a worker thread. Parallelize frontend uploads. Bump Cloud Run to 4 vCPU / 4 GiB / concurrency 1.

**Tech Stack:** Node.js, sharp, pdf-lib, tesseract.js, worker_threads, Cloud Run (knative YAML)

---

### Task 1: Add Bounded Concurrency Utility

**Files:**
- Create: `utils/concurrency.js`
- Create: `tests/utils/concurrency.test.js`

**Step 1: Write the failing test**

Create `tests/utils/concurrency.test.js`:

```js
const { processWithConcurrency } = require('../../utils/concurrency');

describe('processWithConcurrency', () => {
    test('processes all items and returns results in order', async () => {
        const items = [1, 2, 3, 4, 5];
        const fn = async (item) => item * 2;
        const results = await processWithConcurrency(items, fn, 2);
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('respects concurrency limit', async () => {
        let running = 0;
        let maxRunning = 0;
        const items = [1, 2, 3, 4, 5, 6];
        const fn = async (item) => {
            running++;
            maxRunning = Math.max(maxRunning, running);
            await new Promise(r => setTimeout(r, 50));
            running--;
            return item;
        };
        await processWithConcurrency(items, fn, 3);
        expect(maxRunning).toBeLessThanOrEqual(3);
    });

    test('handles empty array', async () => {
        const results = await processWithConcurrency([], async (x) => x, 4);
        expect(results).toEqual([]);
    });

    test('propagates errors', async () => {
        const items = [1, 2, 3];
        const fn = async (item) => {
            if (item === 2) throw new Error('boom');
            return item;
        };
        await expect(processWithConcurrency(items, fn, 2)).rejects.toThrow('boom');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest tests/utils/concurrency.test.js --verbose`
Expected: FAIL — cannot find module `../../utils/concurrency`

**Step 3: Write minimal implementation**

Create `utils/concurrency.js`:

```js
/**
 * Process items with bounded concurrency.
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item: (item, index) => Promise<result>
 * @param {number} [limit=4] - Max concurrent operations
 * @returns {Promise<Array>} Results in original order
 */
async function processWithConcurrency(items, fn, limit = 4) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await fn(items[index], index);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

module.exports = { processWithConcurrency };
```

**Step 4: Run test to verify it passes**

Run: `npx jest tests/utils/concurrency.test.js --verbose`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add utils/concurrency.js tests/utils/concurrency.test.js
git commit -m "feat(exhibits): add bounded concurrency utility"
```

---

### Task 2: Eliminate Redundant Sharp Call in addImagePage

**Files:**
- Modify: `services/pdf-page-builder.js` — `addImagePage` method (lines 110-132)
- Modify: `tests/services/exhibit-processor.test.js` (if existing tests touch addImagePage)

**Step 1: Write the failing test**

Add to a new file `tests/services/pdf-page-builder.test.js`:

```js
const PdfPageBuilder = require('../../services/pdf-page-builder');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

describe('PdfPageBuilder.addImagePage', () => {
    test('creates a page with correct dimensions from a JPEG image', async () => {
        // Create a 200x100 red test image
        const testImage = await sharp({
            create: { width: 200, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
        }).jpeg().toBuffer();

        const doc = await PDFDocument.create();
        await PdfPageBuilder.addImagePage(doc, testImage, 'jpg');

        expect(doc.getPageCount()).toBe(1);
        const page = doc.getPages()[0];
        expect(page.getWidth()).toBe(612);  // US Letter
        expect(page.getHeight()).toBe(792);
    });

    test('handles PNG with alpha channel', async () => {
        const testImage = await sharp({
            create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.5 } }
        }).png().toBuffer();

        const doc = await PDFDocument.create();
        await PdfPageBuilder.addImagePage(doc, testImage, 'png');
        expect(doc.getPageCount()).toBe(1);
    });
});
```

**Step 2: Run test to verify it passes (baseline)**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: PASS — this validates the current behavior before refactoring

**Step 3: Refactor addImagePage to use a single sharp call**

In `services/pdf-page-builder.js`, replace the `addImagePage` method (lines 110-132):

```js
    static async addImagePage(doc, imageBuffer, format) {
        // Single sharp pipeline: convert to JPEG and extract metadata in one pass
        const pipeline = sharp(imageBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toColorspace('srgb')
            .jpeg({ quality: 92 });

        const [jpgBuffer, metadata] = await Promise.all([
            pipeline.toBuffer(),
            sharp(imageBuffer).metadata(),
        ]);

        // NOTE: sharp doesn't support .metadata() on a pipeline that also has .toBuffer(),
        // but we can read metadata from the *original* buffer in parallel with the conversion.
        // This is still 2 sharp operations but they run concurrently instead of sequentially.
        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        const maxWidth = PAGE_WIDTH - (MARGIN * 2);
        const maxHeight = PAGE_HEIGHT - (MARGIN * 2);
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const y = (PAGE_HEIGHT - scaledHeight) / 2;

        const image = await doc.embedJpg(jpgBuffer);
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
    }
```

**Step 4: Run test to verify it still passes**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/pdf-page-builder.js tests/services/pdf-page-builder.test.js
git commit -m "perf(exhibits): parallelize sharp metadata + JPEG conversion in addImagePage"
```

---

### Task 3: Cache Separator Pages

**Files:**
- Modify: `services/pdf-page-builder.js` — add `createSeparatorPageCached` or refactor `createSeparatorPage`

**Step 1: Write the failing test**

Add to `tests/services/pdf-page-builder.test.js`:

```js
describe('PdfPageBuilder.createSeparatorPage caching', () => {
    test('returns valid PDF bytes for different letters', async () => {
        const bytesA = await PdfPageBuilder.createSeparatorPage('A');
        const bytesB = await PdfPageBuilder.createSeparatorPage('B');

        // Both should be valid PDFs
        const docA = await PDFDocument.load(bytesA);
        const docB = await PDFDocument.load(bytesB);
        expect(docA.getPageCount()).toBe(1);
        expect(docB.getPageCount()).toBe(1);

        // They should be different (different letter text)
        expect(Buffer.from(bytesA).equals(Buffer.from(bytesB))).toBe(false);
    });

    test('calling same letter twice returns equivalent content', async () => {
        const bytes1 = await PdfPageBuilder.createSeparatorPage('A');
        const bytes2 = await PdfPageBuilder.createSeparatorPage('A');
        // Both should load as valid single-page PDFs
        const doc1 = await PDFDocument.load(bytes1);
        const doc2 = await PDFDocument.load(bytes2);
        expect(doc1.getPageCount()).toBe(1);
        expect(doc2.getPageCount()).toBe(1);
    });
});
```

**Step 2: Run test to verify it passes (baseline)**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: PASS

**Step 3: Add separator page cache**

In `services/pdf-page-builder.js`, add a cache Map at the module level (after the constants, before the class):

```js
// Cache for separator page bytes keyed by letter
const separatorCache = new Map();
```

Then wrap the existing `createSeparatorPage` method:

```js
    static async createSeparatorPage(letter) {
        if (!/^[A-Z]$/i.test(letter)) {
            throw new Error(`Invalid exhibit letter: "${letter}". Must be a single letter A-Z.`);
        }
        letter = letter.toUpperCase();

        if (separatorCache.has(letter)) {
            return separatorCache.get(letter);
        }

        const doc = await PDFDocument.create();
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const font = await doc.embedFont(StandardFonts.HelveticaBold);

        const text = `EXHIBIT ${letter}`;
        const fontSize = 48;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const x = (PAGE_WIDTH - textWidth) / 2;
        const y = (PAGE_HEIGHT - textHeight) / 2;

        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });

        const ruleWidth = 144;
        const ruleX = (PAGE_WIDTH - ruleWidth) / 2;

        page.drawLine({
            start: { x: ruleX, y: y + textHeight + 20 },
            end: { x: ruleX + ruleWidth, y: y + textHeight + 20 },
            thickness: 1.5, color: rgb(0, 0, 0),
        });
        page.drawLine({
            start: { x: ruleX, y: y - 20 },
            end: { x: ruleX + ruleWidth, y: y - 20 },
            thickness: 1.5, color: rgb(0, 0, 0),
        });

        const bytes = await doc.save();
        separatorCache.set(letter, bytes);
        return bytes;
    }
```

**Step 4: Run tests**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/pdf-page-builder.js
git commit -m "perf(exhibits): cache separator pages to avoid rebuilding per exhibit"
```

---

### Task 4: Parallelize Duplicate Detection Across Exhibits

**Files:**
- Modify: `services/exhibit-processor.js` — `process()` method, lines 105-134

**Step 1: Understand the current code**

The current loop in `process()` (lines 106-133) iterates `activeLetters` sequentially:
```js
for (let i = 0; i < activeLetters.length; i++) {
    const result = await DuplicateDetector.detectDuplicates(exhibits[letter], ...);
}
```

**Step 2: Refactor to parallel with bounded concurrency**

Replace lines 105-134 in `services/exhibit-processor.js`:

```js
        const { processWithConcurrency } = require('../utils/concurrency');

        await Sentry.startSpan({ op: 'exhibit.duplicate_detection', name: 'Duplicate detection' }, async () => {
            const results = await processWithConcurrency(activeLetters, async (letter, i) => {
                const exhibitWeight = 35 / activeLetters.length;
                const exhibitBase = 5 + (i * exhibitWeight);

                logger.info(`[exhibit-processor] Starting dup detect Exhibit ${letter} files: ${exhibits[letter].map(f=>f.name+'/'+f.type).join(', ')}`);

                const result = await DuplicateDetector.detectDuplicates(
                    exhibits[letter],
                    (subPct, subMsg) => {
                        const pct = Math.round(exhibitBase + (subPct / 100) * exhibitWeight);
                        progress(pct, `Exhibit ${letter}: ${subMsg}`, 'duplicate_detection');
                    }
                );

                logger.info(`[exhibit-processor] Finished dup detect Exhibit ${letter}, dupes: ${result.duplicates.length}`);
                return { letter, result };
            }, 4);

            for (const { letter, result } of results) {
                if (result.duplicates.length > 0) {
                    duplicateReport[letter] = result.duplicates;
                    hasDuplicates = true;

                    Sentry.addBreadcrumb({
                        category: 'exhibit.duplicates',
                        message: `Duplicates found in Exhibit ${letter}`,
                        level: 'warning',
                        data: { exhibit: letter, count: result.duplicates.length },
                    });
                }
            }
        });
```

**Step 3: Run existing tests**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add services/exhibit-processor.js
git commit -m "perf(exhibits): parallelize duplicate detection across exhibit letters"
```

---

### Task 5: Add Bounded Concurrency to Visual Pair Comparisons

**Files:**
- Modify: `services/duplicate-detector.js` — `findVisualMatches` method (lines 93-146)

**Step 1: Refactor findVisualMatches to use bounded concurrency**

Replace the sequential pair loop in `findVisualMatches` (lines 110-143) with a bounded-concurrent approach. Collect all eligible pairs into an array first, then process them with concurrency:

```js
    static async findVisualMatches(files, alreadyMatchedPairs = new Set(), onPairProgress) {
        const matches = [];
        const maybePairs = [];

        const IMAGE_TYPES_SET = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);
        const { processWithConcurrency } = require('../utils/concurrency');

        // Collect all eligible pairs
        const pairs = [];
        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const pairKey = `${files[i].name}|${files[j].name}`;
                if (alreadyMatchedPairs.has(pairKey)) continue;
                if (!IMAGE_TYPES_SET.has(files[i].type) || !IMAGE_TYPES_SET.has(files[j].type)) continue;
                pairs.push({ i, j });
            }
        }

        const totalPairs = pairs.length;
        let completedPairs = 0;

        await processWithConcurrency(pairs, async (pair) => {
            const { i, j } = pair;
            completedPairs++;
            if (onPairProgress && totalPairs > 0) {
                onPairProgress(completedPairs, totalPairs);
            }

            try {
                const similarity = await DuplicateDetector.computeVisualSimilarity(
                    files[i].buffer, files[j].buffer
                );

                if (similarity >= VISUAL_MATCH_THRESHOLD) {
                    matches.push({
                        file1: files[i].name,
                        file2: files[j].name,
                        matchType: 'VISUAL_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 2,
                        details: `Visual similarity: ${Math.round(similarity * 100)}%`,
                    });
                } else if (similarity >= VISUAL_MAYBE_LOW) {
                    maybePairs.push({ file1Index: i, file2Index: j, similarity });
                }
            } catch (err) {
                logger.warn(`Visual comparison failed for ${files[i].name} vs ${files[j].name}: ${err.message}`);
            }
        }, 4);

        return { matches, maybePairs };
    }
```

**Step 2: Run existing tests**

Run: `npx jest tests/services/duplicate-detector.test.js --verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "perf(exhibits): bounded concurrent visual pair comparisons (4 at a time)"
```

---

### Task 6: Add Bounded Concurrency to OCR Pair Comparisons

**Files:**
- Modify: `services/duplicate-detector.js` — `findContentMatches` method (lines 155-192)

**Step 1: Refactor findContentMatches**

Replace the sequential loop with bounded concurrency (limit 2 — OCR is heavy):

```js
    static async findContentMatches(files, maybePairs, onPairProgress) {
        if (maybePairs.length === 0) return [];

        const Tesseract = require('tesseract.js');
        const { processWithConcurrency } = require('../utils/concurrency');
        const matches = [];
        let completedPairs = 0;

        await processWithConcurrency(maybePairs, async (pair) => {
            completedPairs++;
            if (onPairProgress) {
                onPairProgress(completedPairs, maybePairs.length);
            }

            try {
                const [result1, result2] = await Promise.all([
                    Tesseract.recognize(files[pair.file1Index].buffer),
                    Tesseract.recognize(files[pair.file2Index].buffer),
                ]);

                const similarity = DuplicateDetector.jaccardSimilarity(result1.data.text, result2.data.text);

                if (similarity >= OCR_MATCH_THRESHOLD) {
                    matches.push({
                        file1: files[pair.file1Index].name,
                        file2: files[pair.file2Index].name,
                        matchType: 'CONTENT_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 3,
                        details: `OCR text similarity: ${Math.round(similarity * 100)}%`,
                    });
                }
            } catch (err) {
                logger.warn(`OCR comparison failed for pair: ${err.message}`);
            }
        }, 2);

        return matches;
    }
```

**Step 2: Run existing tests**

Run: `npx jest tests/services/duplicate-detector.test.js --verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "perf(exhibits): bounded concurrent OCR pair comparisons (2 at a time)"
```

---

### Task 7: Parallelize PDF Assembly Across Exhibits

**Files:**
- Modify: `services/exhibit-processor.js` — `_buildPdf` method (lines 170-312)

This is the most complex refactor. Currently, all exhibit pages are added directly to `finalDoc` sequentially. To parallelize, each exhibit builds its own sub-document, then we merge them into the final doc at the end.

**Step 1: Refactor _buildPdf to parallel exhibit assembly**

Replace the assembly section of `_buildPdf` (the Sentry span block, lines 185-230):

```js
        const { processWithConcurrency } = require('../utils/concurrency');

        // Phase 1: Build each exhibit's pages in parallel (each produces sub-doc bytes + metadata)
        const exhibitResults = await Sentry.startSpan(
            { op: 'exhibit.pdf_assembly', name: 'PDF assembly' },
            async (assemblySpan) => {
                let filesProcessedCount = 0;

                const results = await processWithConcurrency(activeLetters, async (letter, li) => {
                    const files = exhibits[letter];
                    logger.info(`[exhibit-processor] _buildPdf: Processing Exhibit ${letter}, ${files.length} files`);

                    const subDoc = await PDFDocument.create();
                    const subMetadata = [];

                    // Add separator page
                    const separatorBytes = await PdfPageBuilder.createSeparatorPage(letter);
                    const separatorDoc = await PDFDocument.load(separatorBytes);
                    const [separatorPage] = await subDoc.copyPages(separatorDoc, [0]);
                    subDoc.addPage(separatorPage);
                    subMetadata.push({ type: 'separator' });

                    // Process each file with bounded concurrency
                    let pageNum = 1;
                    for (const file of files) {
                        filesProcessedCount++;
                        const pct = 40 + Math.round((filesProcessedCount / totalFiles) * 45);
                        progress(pct, `Processing file ${filesProcessedCount} of ${totalFiles}: ${file.name}`, 'processing');

                        const ext = file.type.toLowerCase();
                        logger.info(`[exhibit-processor] Processing file: ${file.name} type=${ext}`);

                        if (IMAGE_TYPES.has(ext)) {
                            await PdfPageBuilder.addImagePage(subDoc, file.buffer, ext);
                            subMetadata.push({ type: 'content', letter, pageNum });
                            pageNum++;
                        } else {
                            const fileDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                            const pageIndices = fileDoc.getPageIndices();
                            const copiedPages = await subDoc.copyPages(fileDoc, pageIndices);
                            for (const page of copiedPages) {
                                subDoc.addPage(page);
                                subMetadata.push({ type: 'content', letter, pageNum });
                                pageNum++;
                            }
                        }
                    }

                    const subBytes = await subDoc.save();
                    return { letter, subBytes, subMetadata };
                }, 4);

                assemblySpan.setAttribute('exhibit.letters_processed', results.length);
                return results;
            }
        );

        // Phase 2: Merge all sub-documents into finalDoc in order
        const pageMetadata = [];
        for (const { subBytes, subMetadata } of exhibitResults) {
            const subDoc = await PDFDocument.load(subBytes);
            const pageIndices = subDoc.getPageIndices();
            const copiedPages = await finalDoc.copyPages(subDoc, pageIndices);
            for (const page of copiedPages) {
                finalDoc.addPage(page);
            }
            pageMetadata.push(...subMetadata);
        }
```

Then update the Sentry attributes after the merge to use `pageMetadata` (the Bates stamping code that follows already uses `pageMetadata`, so no changes needed there).

**Step 2: Run existing tests**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add services/exhibit-processor.js
git commit -m "perf(exhibits): parallelize PDF assembly across exhibit letters"
```

---

### Task 8: Worker Thread for pdf-lib save()

**Files:**
- Create: `workers/pdf-save-worker.js`
- Modify: `services/exhibit-processor.js` — save section (lines 276-296)

**Step 1: Create the worker script**

Create `workers/pdf-save-worker.js`:

```js
const { parentPort, workerData } = require('worker_threads');
const { PDFDocument } = require('pdf-lib');

(async () => {
    try {
        const doc = await PDFDocument.load(workerData.pdfBytes);
        const savedBytes = await doc.save();
        parentPort.postMessage({ bytes: savedBytes });
    } catch (err) {
        parentPort.postMessage({ error: err.message });
    }
})();
```

**Step 2: Add helper function in exhibit-processor.js**

Add at the top of `services/exhibit-processor.js` (after the requires):

```js
const { Worker } = require('worker_threads');

function saveInWorker(pdfBytes) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            path.join(__dirname, '../workers/pdf-save-worker.js'),
            { workerData: { pdfBytes } }
        );
        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('pdf-lib save() timed out after 30s in worker'));
        }, 30000);

        worker.on('message', (msg) => {
            clearTimeout(timeout);
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.bytes);
        });
        worker.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
```

**Step 3: Replace the save section**

In `_buildPdf`, replace the save logic (the `Promise.race` block) with:

```js
        const pdfBytes = await Sentry.startSpan(
            { op: 'exhibit.pdf_save', name: 'PDF save to disk' },
            async (saveSpan) => {
                // First serialize in main thread to get transferable bytes
                const rawBytes = await Promise.race([
                    finalDoc.save(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('pdf-lib save() timed out after 30s')), 30000)),
                ]);
                const saveDuration = Date.now() - saveStart;
                logger.info(`[exhibit-processor] Save complete in ${saveDuration}ms, bytes=${rawBytes.length}`);
                saveSpan.setAttribute('exhibit.pdf_size_bytes', rawBytes.length);
                saveSpan.setAttribute('exhibit.save_duration_ms', saveDuration);
                fs.writeFileSync(outputPath, rawBytes);
                return rawBytes;
            }
        );
```

**Note:** After further analysis, the worker thread approach for `save()` has a problem: we'd need to transfer the entire PDFDocument state to the worker, but pdf-lib documents aren't serializable without calling `.save()` first. The actual save is what we want to offload, but we can't send the doc to the worker.

**Revised approach:** Keep `save()` in the main thread. The parallelism gains from Tasks 4-7 will more than compensate. The 4 vCPU bump means the main thread isn't competing with other requests (concurrency=1). Remove this task.

**Step 4: Skip — no commit needed for this task**

This task is **CANCELLED**. The worker thread for save() is not feasible because pdf-lib's PDFDocument is not transferable to a worker. The real fix is concurrency=1 on Cloud Run so save() gets full CPU.

---

### Task 9: Parallelize Frontend Uploads

**Files:**
- Modify: `forms/exhibits/js/file-upload.js` — `uploadAllExhibits` function (lines 44-57)

**Step 1: Add processWithConcurrency to the frontend**

Since this is a browser IIFE (not a module), inline a small concurrency helper. Replace `uploadAllExhibits` (lines 44-57):

```js
    async function uploadAllExhibits(sessionId, exhibits, onProgress) {
        const letters = Object.keys(exhibits).filter(l => exhibits[l].length > 0).sort();

        // Bounded concurrency: upload up to 3 exhibits simultaneously
        const limit = 3;
        let nextIndex = 0;

        async function worker() {
            while (nextIndex < letters.length) {
                const idx = nextIndex++;
                const letter = letters[idx];
                if (onProgress) onProgress(letter, 'uploading');

                const files = exhibits[letter].map(entry => entry.file).filter(Boolean);
                if (files.length > 0) {
                    await uploadFiles(sessionId, letter, files);
                }

                if (onProgress) onProgress(letter, 'done');
            }
        }

        const workers = Array.from(
            { length: Math.min(limit, letters.length) },
            () => worker()
        );
        await Promise.all(workers);
    }
```

**Step 2: Manual test**

Open the exhibits form in a browser, upload files to 3+ exhibits, and verify:
- All exhibits upload successfully
- Progress callbacks fire for each letter
- No errors in the console
- Network tab shows 3 concurrent upload requests

**Step 3: Commit**

```bash
git add forms/exhibits/js/file-upload.js
git commit -m "perf(exhibits): parallelize frontend exhibit uploads (3 concurrent)"
```

---

### Task 10: Update Cloud Run Configuration

**Files:**
- Modify: `deployed-config.yaml` — resource limits (lines 67-69) and containerConcurrency (line 41)

**Step 1: Update the YAML**

In `deployed-config.yaml`, make these changes:

Line 41 — change `containerConcurrency: 80` to:
```yaml
      containerConcurrency: 1
```

Lines 67-69 — change resource limits to:
```yaml
        resources:
          limits:
            cpu: '4'
            memory: 4Gi
```

**Step 2: Verify the YAML is valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('deployed-config.yaml'))"`
Expected: No output (no error)

**Step 3: Commit**

```bash
git add deployed-config.yaml
git commit -m "perf(exhibits): bump Cloud Run to 4 vCPU / 4 GiB / concurrency 1"
```

---

### Task 11: Integration Test — Full Pipeline

**Files:**
- Run: `tests/services/exhibit-processor.test.js`
- Run: `tests/services/exhibit-integration.test.js`
- Run: `tests/services/duplicate-detector.test.js`

**Step 1: Run all exhibit-related tests**

Run: `npx jest tests/services/ --verbose --testPathPattern="exhibit|duplicate|pdf-page"`
Expected: All PASS

**Step 2: If any failures, fix and re-run**

Common issues to watch for:
- Import paths for `utils/concurrency.js` — ensure relative paths are correct from each service file
- Progress callback order may differ due to parallelism — tests that assert exact progress message order need updating
- Race conditions in `matches.push()` / `maybePairs.push()` — arrays are safe for concurrent pushes in JS since it's single-threaded (async but not multi-threaded)

**Step 3: Final commit if any test fixes were needed**

```bash
git add -A
git commit -m "fix(exhibits): update tests for parallel processing pipeline"
```

---

### Task 12: Deploy and Validate

**Step 1: Deploy to Cloud Run**

The deployment uses `gcloud run deploy` or the GitHub Actions workflow. Ensure the new config is picked up:

```bash
gcloud run services replace deployed-config.yaml --region us-central1
```

Or push to `main` and let the CI pipeline deploy.

**Step 2: Validate on Cloud Run**

Upload 16 test documents to the deployed exhibit form and time the processing. Target: ~50-90 seconds (down from ~3.5 minutes).

**Step 3: Monitor for issues**

Check Sentry for any new errors. Watch Cloud Run logs for:
- Memory usage (should stay well under 4 GiB)
- CPU utilization (should spike higher now with parallelism — that's expected)
- No timeout errors

---

Plan complete and saved to `docs/plans/2026-03-09-exhibit-performance-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?

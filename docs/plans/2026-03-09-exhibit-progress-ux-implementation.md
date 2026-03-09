# Exhibit Progress UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace coarse exhibit-level progress updates with granular sub-step SSE events so users never see a "stuck" progress bar during processing.

**Architecture:** The backend's `onProgress` callback is already wired end-to-end (exhibit-processor → routes → SSE → frontend). We add `phase` and `timestamp` fields to every progress event, make each processing step emit granular updates (per-file hashing, per-pair visual comparison, per-pair OCR, per-file PDF conversion, per-page Bates stamping), and enhance the frontend to display phase labels, a shimmer animation, time estimates, and stale detection.

**Tech Stack:** Node.js/Express (backend), vanilla JS (frontend), CSS animations, SSE (EventSource)

---

### Task 1: Enhance SSE broadcast to include `phase` and `timestamp`

**Files:**
- Modify: `routes/exhibits.js:58-69` (broadcastJobEvent)
- Modify: `routes/exhibits.js:150-159` (job object init)
- Modify: `routes/exhibits.js:198-204` (onProgress callback in /generate)
- Modify: `routes/exhibits.js:310-314` (onProgress callback in /resolve)
- Modify: `routes/exhibits.js:351` (initial SSE state on connect)

**Step 1: Update job object to track phase**

In `routes/exhibits.js`, update the job initialization at line 150 to include a `phase` field:

```javascript
jobs.set(jobId, {
    sessionId,
    status: 'processing',
    progress: 0,
    phase: 'starting',
    message: 'Starting...',
    duplicates: null,
    outputPath: null,
    filename: null,
    sseClients: [],
});
```

**Step 2: Update onProgress callback to accept and broadcast phase + timestamp**

Change the `onProgress` callback in the `/generate` route (line 198) to accept a third `phase` parameter:

```javascript
onProgress: (pct, msg, phase) => {
    const job = jobs.get(jobId);
    if (job) {
        job.progress = pct;
        job.message = msg;
        if (phase) job.phase = phase;
        broadcastJobEvent(jobId, 'progress', {
            progress: pct,
            message: msg,
            phase: job.phase,
            timestamp: Date.now(),
        });
    }
},
```

Apply the same change to the `/resolve` route's `onProgress` callback (line 310):

```javascript
onProgress: (pct, msg, phase) => {
    job.progress = pct;
    job.message = msg;
    if (phase) job.phase = phase;
    broadcastJobEvent(jobId, 'progress', {
        progress: pct,
        message: msg,
        phase: job.phase,
        timestamp: Date.now(),
    });
},
```

**Step 3: Update initial SSE connect to include phase and timestamp**

Change line 351 to include the new fields:

```javascript
res.write(`event: progress\ndata: ${JSON.stringify({
    progress: job.progress,
    message: job.message,
    phase: job.phase || 'starting',
    timestamp: Date.now(),
})}\n\n`);
```

**Step 4: Commit**

```bash
git add routes/exhibits.js
git commit -m "feat(exhibits): add phase and timestamp to SSE progress events"
```

---

### Task 2: Add granular progress to duplicate detector

**Files:**
- Modify: `services/duplicate-detector.js:205-230` (detectDuplicates method)
- Modify: `services/duplicate-detector.js:92-130` (findVisualMatches method)
- Modify: `services/duplicate-detector.js:138-169` (findContentMatches method)

**Step 1: Update `detectDuplicates` to pass progress through to each layer**

Replace the `detectDuplicates` method. The `onProgress` callback now receives `(subPercent, message)` where `subPercent` is 0-100 *within* the duplicate detection phase. The caller (exhibit-processor) will map this to the overall 5-40% range.

```javascript
static async detectDuplicates(files, onProgress) {
    if (files.length < 2) return { duplicates: [] };

    const allDuplicates = [];
    const progressFn = onProgress || (() => {});

    // Layer 1: Exact hash matching (~0-10% of dup phase)
    progressFn(0, `Checking exact hashes: ${files.length} files`);
    const exactDupes = DuplicateDetector.findExactDuplicates(files);
    allDuplicates.push(...exactDupes);
    progressFn(10, `Hash check complete: ${exactDupes.length} exact match(es)`);

    const matchedPairs = new Set(exactDupes.map(d => `${d.file1}|${d.file2}`));

    // Layer 2: Visual similarity (~10-70% of dup phase)
    const { matches: visualMatches, maybePairs } = await DuplicateDetector.findVisualMatches(
        files,
        matchedPairs,
        (pairNum, totalPairs) => {
            const subPct = 10 + Math.round((pairNum / totalPairs) * 60);
            progressFn(subPct, `Visual comparison: pair ${pairNum} of ${totalPairs}`);
        }
    );
    allDuplicates.push(...visualMatches);
    progressFn(70, `Visual check complete: ${visualMatches.length} match(es)`);

    // Layer 3: OCR text comparison (~70-100% of dup phase)
    if (maybePairs.length > 0) {
        const contentMatches = await DuplicateDetector.findContentMatches(
            files,
            maybePairs,
            (pairNum, totalPairs) => {
                const subPct = 70 + Math.round((pairNum / totalPairs) * 30);
                progressFn(subPct, `OCR analysis: pair ${pairNum} of ${maybePairs.length}`);
            }
        );
        allDuplicates.push(...contentMatches);
    }
    progressFn(100, `Duplicate scan complete: ${allDuplicates.length} total match(es)`);

    return { duplicates: allDuplicates };
}
```

**Step 2: Add per-pair progress callback to `findVisualMatches`**

Update the method signature and add a callback inside the inner loop. Add `onPairProgress` as the third parameter:

```javascript
static async findVisualMatches(files, alreadyMatchedPairs = new Set(), onPairProgress) {
    const matches = [];
    const maybePairs = [];

    const IMAGE_TYPES_SET = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);

    // Pre-count total eligible pairs for progress reporting
    let totalPairs = 0;
    for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
            const pairKey = `${files[i].name}|${files[j].name}`;
            if (alreadyMatchedPairs.has(pairKey)) continue;
            if (!IMAGE_TYPES_SET.has(files[i].type) || !IMAGE_TYPES_SET.has(files[j].type)) continue;
            totalPairs++;
        }
    }

    let pairNum = 0;
    for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
            const pairKey = `${files[i].name}|${files[j].name}`;
            if (alreadyMatchedPairs.has(pairKey)) continue;
            if (!IMAGE_TYPES_SET.has(files[i].type) || !IMAGE_TYPES_SET.has(files[j].type)) continue;

            pairNum++;
            if (onPairProgress && totalPairs > 0) {
                onPairProgress(pairNum, totalPairs);
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
        }
    }

    return { matches, maybePairs };
}
```

**Step 3: Add per-pair progress callback to `findContentMatches`**

Update the method to accept `onPairProgress`:

```javascript
static async findContentMatches(files, maybePairs, onPairProgress) {
    if (maybePairs.length === 0) return [];

    const Tesseract = require('tesseract.js');
    const matches = [];

    for (let idx = 0; idx < maybePairs.length; idx++) {
        const pair = maybePairs[idx];

        if (onPairProgress) {
            onPairProgress(idx + 1, maybePairs.length);
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
    }

    return matches;
}
```

**Step 4: Commit**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): add per-pair progress callbacks to duplicate detector"
```

---

### Task 3: Add granular progress to exhibit processor

**Files:**
- Modify: `services/exhibit-processor.js:92-133` (process method)
- Modify: `services/exhibit-processor.js:144-149` (resume method)
- Modify: `services/exhibit-processor.js:162-292` (_buildPdf method)

**Step 1: Update `process` method with granular validation + duplicate detection progress**

Replace the `process` method body (lines 92-133). The `onProgress` callback now takes three args: `(percent, message, phase)`.

```javascript
static async process({ caseName, exhibits, outputDir, onProgress }) {
    const progress = onProgress || (() => {});

    // Step 1: Validate (0-5%)
    progress(2, 'Validating exhibits...', 'validation');
    ExhibitProcessor.validateExhibits(exhibits);
    const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);
    progress(5, `Validated ${activeLetters.length} exhibit(s)`, 'validation');

    // Step 2: Duplicate detection per exhibit (5-40%)
    const duplicateReport = {};
    let hasDuplicates = false;

    await Sentry.startSpan({ op: 'exhibit.duplicate_detection', name: 'Duplicate detection' }, async () => {
        for (let i = 0; i < activeLetters.length; i++) {
            const letter = activeLetters[i];
            const exhibitWeight = 35 / activeLetters.length; // 35% total for dup detection
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

    if (hasDuplicates) {
        return { duplicates: duplicateReport, paused: true };
    }

    return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
}
```

**Step 2: Update `resume` method to pass phase**

```javascript
static async resume({ caseName, exhibits, outputDir, onProgress }) {
    const progress = onProgress || (() => {});
    const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);
    progress(30, 'Resuming after duplicate resolution...', 'processing');
    return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
}
```

**Step 3: Update `_buildPdf` with per-file and per-page progress**

Replace the `_buildPdf` method body (lines 162-292). Key changes:
- Count total files up front for accurate per-file progress
- Report per-file during PDF assembly
- Report per-page during Bates stamping

```javascript
static async _buildPdf({ caseName, exhibits, activeLetters, outputDir, progress }) {
    const finalDoc = await PDFDocument.create();

    // Count total files and estimate pages for progress + padding
    let totalFiles = 0;
    let estimatedPages = 0;
    for (const letter of activeLetters) {
        totalFiles += exhibits[letter].length;
        estimatedPages += exhibits[letter].length * 2;
    }
    const padDigits = ExhibitProcessor.determinePadding(estimatedPages);

    const pageMetadata = [];
    let filesProcessed = 0;

    await Sentry.startSpan({ op: 'exhibit.pdf_assembly', name: 'PDF assembly' }, async (assemblySpan) => {
        for (let li = 0; li < activeLetters.length; li++) {
            const letter = activeLetters[li];
            const files = exhibits[letter];
            logger.info(`[exhibit-processor] _buildPdf: Processing Exhibit ${letter}, ${files.length} files`);

            // Add separator page
            const separatorBytes = await PdfPageBuilder.createSeparatorPage(letter);
            const separatorDoc = await PDFDocument.load(separatorBytes);
            const [separatorPage] = await finalDoc.copyPages(separatorDoc, [0]);
            finalDoc.addPage(separatorPage);
            pageMetadata.push({ type: 'separator' });

            // Process each file
            let pageNum = 1;
            for (const file of files) {
                filesProcessed++;
                const pct = 40 + Math.round((filesProcessed / totalFiles) * 45); // 40-85%
                progress(pct, `Processing file ${filesProcessed} of ${totalFiles}: ${file.name}`, 'processing');

                const ext = file.type.toLowerCase();
                logger.info(`[exhibit-processor] Processing file: ${file.name} type=${ext}`);

                if (IMAGE_TYPES.has(ext)) {
                    logger.info(`[exhibit-processor] addImagePage start: buffer type=${file.buffer?.constructor?.name} size=${file.buffer?.length}`);
                    await PdfPageBuilder.addImagePage(finalDoc, file.buffer, ext);
                    logger.info('[exhibit-processor] addImagePage complete');
                    pageMetadata.push({ type: 'content', letter, pageNum });
                    pageNum++;
                } else {
                    const fileDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                    const pageIndices = fileDoc.getPageIndices();
                    logger.info(`[exhibit-processor] Loaded PDF ${file.name}, pages=${fileDoc.getPageCount()}`);
                    const copiedPages = await finalDoc.copyPages(fileDoc, pageIndices);
                    for (const page of copiedPages) {
                        finalDoc.addPage(page);
                        pageMetadata.push({ type: 'content', letter, pageNum });
                        pageNum++;
                    }
                }
            }
        }

        assemblySpan.setAttribute('exhibit.total_pages', pageMetadata.length);
        assemblySpan.setAttribute('exhibit.content_pages', pageMetadata.filter(m => m.type === 'content').length);
    });

    // Second pass: Bates stamps on content pages only (85-95%)
    logger.info('[exhibit-processor] All exhibits processed, starting Bates stamp pass');
    progress(85, 'Applying Bates stamps...', 'stamping');
    const font = await finalDoc.embedFont(StandardFonts.Helvetica);

    const contentPages = pageMetadata.reduce((count, m) => count + (m.type === 'content' ? 1 : 0), 0);
    let stampedCount = 0;

    for (let i = 0; i < pageMetadata.length; i++) {
        const meta = pageMetadata[i];
        if (meta.type !== 'content') continue;

        stampedCount++;
        if (stampedCount % 5 === 0 || stampedCount === contentPages) {
            const pct = 85 + Math.round((stampedCount / contentPages) * 10); // 85-95%
            progress(pct, `Stamping page ${stampedCount} of ${contentPages}`, 'stamping');
        }

        const page = finalDoc.getPages()[i];
        const batesNum = PdfPageBuilder.formatBatesNumber(meta.letter, meta.pageNum, padDigits);

        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(batesNum, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const padding = 4;

        const x = page.getWidth() - 36 - textWidth - padding;
        const y = 36;

        page.drawRectangle({
            x: x - padding, y: y - padding,
            width: textWidth + (padding * 2),
            height: textHeight + (padding * 2),
            color: rgb(1, 1, 1),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });

        page.drawText(batesNum, {
            x, y, size: fontSize, font, color: rgb(0, 0, 0),
        });
    }

    // Save (95-100%)
    logger.info('[exhibit-processor] Saving final PDF...');
    const saveStart = Date.now();
    progress(95, 'Saving exhibit package...', 'finalizing');
    const filename = ExhibitProcessor.generateOutputFilename(caseName);
    const outputPath = path.join(outputDir, filename);

    const pdfBytes = await Sentry.startSpan(
        { op: 'exhibit.pdf_save', name: 'PDF save to disk' },
        async (saveSpan) => {
            const bytes = await Promise.race([
                finalDoc.save(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('pdf-lib save() timed out after 30s')), 30000)),
            ]);
            const saveDuration = Date.now() - saveStart;
            logger.info(`[exhibit-processor] Save complete in ${saveDuration}ms, bytes=${bytes.length}`);
            saveSpan.setAttribute('exhibit.pdf_size_bytes', bytes.length);
            saveSpan.setAttribute('exhibit.save_duration_ms', saveDuration);
            fs.writeFileSync(outputPath, bytes);
            return bytes;
        }
    );

    Sentry.addBreadcrumb({
        category: 'exhibit.complete',
        message: `Exhibit package saved: ${filename}`,
        level: 'info',
        data: {
            filename,
            sizeBytes: pdfBytes.length,
            saveDurationMs: Date.now() - saveStart,
            totalPages: pageMetadata.length,
        },
    });

    progress(100, 'Complete!', 'finalizing');
    return { outputPath, filename };
}
```

**Step 4: Commit**

```bash
git add services/exhibit-processor.js
git commit -m "feat(exhibits): add granular per-file progress to exhibit processor"
```

---

### Task 4: Add shimmer animation to progress bar CSS

**Files:**
- Modify: `forms/exhibits/styles.css:513-518` (progress bar styles)

**Step 1: Add shimmer keyframes and apply to `.progress-bar`**

After the existing `.progress-bar` rule (line 513-518), add:

```css
.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--secondary-teal), #00D4AA);
    border-radius: 4px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
}

.progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 100%
    );
    animation: shimmer 1.5s ease-in-out infinite;
}

.progress-bar.complete::after {
    animation: none;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
```

Note: Replace the existing `.progress-bar` rule entirely (lines 513-518) with the updated version above that adds `position: relative` and `overflow: hidden`.

**Step 2: Add a subtle pulse animation for stale messages**

Add this after the shimmer styles:

```css
.progress-stale {
    animation: stale-pulse 2s ease-in-out infinite;
}

@keyframes stale-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

**Step 3: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "feat(exhibits): add shimmer animation and stale pulse to progress bar"
```

---

### Task 5: Enhance frontend progress modal with phase labels, ETA, and stale detection

**Files:**
- Modify: `forms/exhibits/index.html:65-77` (progress overlay HTML)
- Modify: `forms/exhibits/js/form-submission.js:131-228` (connectSSE function)
- Modify: `forms/exhibits/js/form-submission.js:231-247` (showProgress/updateProgress/hideProgress)

**Step 1: Add phase label and ETA elements to HTML**

Replace the progress overlay (lines 65-78) with:

```html
<!-- Progress Overlay -->
<div id="progress-overlay" class="progress-overlay" style="display: none;">
    <div class="progress-content">
        <div class="progress-spinner">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h3 id="progress-title">Processing Exhibits</h3>
        <p id="progress-phase" style="font-weight: 700; color: var(--primary-navy); margin-bottom: 8px; font-size: 0.95rem;"></p>
        <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
        </div>
        <p id="progress-message">Preparing...</p>
        <p id="progress-percent" class="progress-percent">0%</p>
        <p id="progress-eta" style="color: #999; font-size: 0.85rem; margin-top: 4px;"></p>
    </div>
</div>
```

**Step 2: Rewrite the progress functions in form-submission.js**

Replace `showProgress`, `updateProgress`, and `hideProgress` (lines 231-247) with:

```javascript
// Phase label mapping
const PHASE_LABELS = {
    starting: 'Starting',
    validation: 'Validating',
    duplicate_detection: 'Scanning for Duplicates',
    processing: 'Processing Files',
    stamping: 'Applying Bates Stamps',
    finalizing: 'Finalizing',
};

// Progress state for ETA calculation and stale detection
let progressState = {
    startTime: null,
    lastEventTime: null,
    staleTimer: null,
    staleActive: false,
};

function showProgress(title, percent, message) {
    document.getElementById('progress-overlay').style.display = 'flex';
    document.getElementById('progress-title').textContent = title;
    document.getElementById('progress-phase').textContent = '';
    document.getElementById('progress-eta').textContent = '';
    progressState = { startTime: null, lastEventTime: null, staleTimer: null, staleActive: false };
    updateProgress(percent, message);
}

function updateProgress(percent, message, phase, timestamp) {
    const bar = document.getElementById('progress-bar');
    bar.style.width = percent + '%';
    document.getElementById('progress-percent').textContent = percent + '%';

    if (percent >= 100) {
        bar.classList.add('complete');
    } else {
        bar.classList.remove('complete');
    }

    if (message) {
        const msgEl = document.getElementById('progress-message');
        msgEl.textContent = message;
        msgEl.classList.remove('progress-stale');
    }

    // Phase label
    if (phase && PHASE_LABELS[phase]) {
        document.getElementById('progress-phase').textContent = PHASE_LABELS[phase];
    }

    // ETA calculation
    if (timestamp) {
        if (!progressState.startTime && percent > 0) {
            progressState.startTime = timestamp;
        }
        progressState.lastEventTime = Date.now();
        progressState.staleActive = false;

        if (progressState.startTime && percent >= 10 && percent < 100) {
            const elapsed = timestamp - progressState.startTime;
            const remaining = (elapsed / percent) * (100 - percent);
            const etaSec = Math.round(remaining / 1000);
            if (etaSec > 0) {
                const etaText = etaSec >= 60
                    ? `~${Math.round(etaSec / 60)}m ${etaSec % 60}s remaining`
                    : `~${etaSec}s remaining`;
                document.getElementById('progress-eta').textContent = etaText;
            }
        } else {
            document.getElementById('progress-eta').textContent = '';
        }

        // Reset stale timer
        resetStaleTimer();
    }
}

function resetStaleTimer() {
    if (progressState.staleTimer) {
        clearTimeout(progressState.staleTimer);
    }
    // After 5 seconds with no event, show "Still processing..."
    progressState.staleTimer = setTimeout(() => {
        const msgEl = document.getElementById('progress-message');
        if (!progressState.staleActive) {
            progressState.staleActive = true;
            msgEl.textContent = 'Still processing...';
        }
        // After 15 seconds total, add pulse animation
        progressState.staleTimer = setTimeout(() => {
            msgEl.classList.add('progress-stale');
        }, 10000);
    }, 5000);
}

function hideProgress() {
    document.getElementById('progress-overlay').style.display = 'none';
    if (progressState.staleTimer) {
        clearTimeout(progressState.staleTimer);
    }
    progressState = { startTime: null, lastEventTime: null, staleTimer: null, staleActive: false };
}
```

**Step 3: Update the SSE progress listener in `connectSSE`**

Replace the `progress` event listener (lines 135-139) to pass `phase` and `timestamp`:

```javascript
evtSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    const displayPct = 20 + Math.round(data.progress * 0.8);
    updateProgress(displayPct, data.message, data.phase, data.timestamp);
});
```

**Step 4: Commit**

```bash
git add forms/exhibits/index.html forms/exhibits/js/form-submission.js
git commit -m "feat(exhibits): add phase labels, ETA, and stale detection to progress modal"
```

---

### Task 6: Manual end-to-end test on Cloud Run

**Files:** None to modify

**Step 1: Start local server and test**

```bash
npm run dev
```

Open `http://localhost:3000/forms/exhibits/` in a browser. Upload several files (mix of images and PDFs) into a single exhibit letter. Click Generate and verify:

1. Progress bar shows shimmer animation throughout
2. Phase label updates as it moves through phases
3. Message shows granular detail (e.g., "Visual comparison: pair 3 of 10")
4. ETA appears after ~10% and updates
5. If you wait during a slow operation, "Still processing..." appears after 5s
6. Bar never appears frozen for more than 1-2 seconds
7. On completion, shimmer stops and bar shows 100%
8. Duplicate resolution modal still works correctly if duplicates are found

**Step 2: Commit all changes if any fixes needed**

```bash
git add -A
git commit -m "fix(exhibits): address issues found in progress UX testing"
```

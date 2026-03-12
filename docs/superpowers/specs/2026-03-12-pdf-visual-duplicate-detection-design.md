# PDF Visual Duplicate Detection — Design Spec

## Goal

Extend Layer 2 (visual similarity) duplicate detection to include PDF pages, and remove Layer 3 (OCR/Tesseract). PDFs are currently invisible to visual duplicate detection — only byte-for-byte identical PDFs are caught (Layer 1 SHA-256). This change renders every PDF page to a PNG via MuPDF, then runs the same dHash pre-filter + pixel comparison pipeline used for images.

## Current State

Three-layer pipeline per exhibit:
- **Layer 1:** SHA-256 exact hash (all file types)
- **Layer 2:** dHash pre-filter + 64×64 pixel comparison (images only: png, jpg, jpeg, tiff, heic)
- **Layer 3:** Tesseract OCR text comparison on "maybe" pairs from Layer 2

PDFs are skipped by Layer 2. Layer 3 only processes image pairs that scored 80-95% visual similarity. No PDF content is ever visually compared.

## New Design

Two-layer pipeline per exhibit:
- **Layer 1:** SHA-256 exact hash (all file types, unchanged)
- **Layer 2:** dHash pre-filter + 64×64 pixel comparison (images AND PDF pages)

Layer 3 (OCR) is removed. Visual comparison of rendered PDF pages replaces the need for OCR-based text matching.

### How PDF Pages Enter the Pipeline

New static method: `DuplicateDetector.renderPdfPages(buffer)`
- Uses MuPDF WASM (`await import('mupdf')`) to open the PDF
- Renders every page to PNG at 0.5× scale (matching existing MuPDF usage in `exhibit-processor.js:58-70`)
- Returns an array of `{ pageNum: number, buffer: Buffer }` objects
- Returns empty array on failure (corrupt PDF, encrypted, password-protected)
- Logged as warning on failure, never throws
- **MuPDF cleanup:** All MuPDF objects (`doc`, `page`, `pixmap`) must be explicitly destroyed in a `finally` block to free native WASM memory

### Modified `findVisualMatches` Flow

1. **Expand files to visual entries:**
   - For each file in the exhibit:
     - If image type (`png`, `jpg`, `jpeg`, `tiff`, `heic`) → one entry with `sourceIndex` (original file index), `page: null`
     - If PDF → render all pages → one entry per page with `sourceIndex` (original file index), `page: <pageNum>`
   - Run page rendering with `processWithConcurrency(..., 4)` to bound memory usage
   - Progress callback during rendering phase (before pair comparison begins)

2. **Compute dHash** on all visual entries (same as current)

3. **Hamming distance filter** on all pairs (threshold ≤ 15, same for all pair types)
   - **Skip same-file pairs:** If two entries share the same `sourceIndex`, skip the pair (don't compare pages within the same PDF against each other)

4. **Pixel comparison** on candidate pairs only (same as current)

5. **Return matches** with original file names preserved for downstream compatibility

### Memory Management

Rendering all PDF pages upfront would hold hundreds of PNG buffers in memory simultaneously. Instead, use a two-pass approach:

- **Pass 1 (dHash only):** Render each page, compute its dHash (tiny: one BigInt), then discard the PNG buffer. This keeps memory flat — only one PNG buffer exists at a time per concurrent worker.
- **Pass 2 (pixel comparison):** For candidate pairs that survive the hamming filter, re-render the specific pages on demand. Only the two buffers being compared exist at any time.

The re-render cost is small (~25ms per page) and only applies to the small fraction of pairs that pass the dHash filter. This trades a bit of CPU for dramatically less memory.

### Match Object Format

`file1` and `file2` remain the **original filename** (e.g., `"Contract_0008.pdf"`) to preserve compatibility with all downstream consumers (`exhibit-processor.js` thumbnail lookup, `routes/exhibits.js` file removal, `duplicate-ui.js` rendering).

New fields added for page-level context:
```javascript
{
    file1: "Contract_0008.pdf",       // original filename (unchanged)
    file2: "Lease_0001.pdf",          // original filename (unchanged)
    page1: 3,                         // page number (null for images)
    page2: 1,                         // page number (null for images)
    matchType: 'VISUAL_MATCH',
    confidence: 97,
    layer: 2,
    details: 'Visual similarity: 97% (Contract_0008.pdf p.3 vs Lease_0001.pdf p.1)',
}
```

For image-vs-image matches: `page1` and `page2` are `null`, `details` has no page suffix. Downstream code that only reads `file1`/`file2` is unaffected.

### alreadyMatchedPairs Key Format

Layer 1 exact hash matches produce pair keys like `"Contract.pdf|Lease.pdf"`. Layer 2 must check these same keys to skip already-matched pairs. Since visual entries carry a `sourceIndex` back to the original file, the pair key is always built from original file names — never from page-suffixed names. This ensures Layer 1 → Layer 2 deduplication works correctly.

### Maybe Pairs (Layer 3 Removal)

The `maybePairs` array (80-95% visual similarity) is no longer sent to OCR. Instead:
- Pairs ≥ 0.95 → `VISUAL_MATCH` (same as current)
- Pairs 0.80-0.95 → `LIKELY_MATCH` (new type, reported to user for review)
- Pairs < 0.80 → discarded

The `findContentMatches` method and Tesseract dependency are kept in the codebase but no longer called from `detectDuplicates`. This avoids a large diff and keeps the option open for future use.

**Frontend note:** `duplicate-ui.js` currently handles `EXACT_DUPLICATE`, `VISUAL_MATCH`, and falls back to "Content Match" for unknown types. A new branch is needed for `LIKELY_MATCH` to display as "Likely Match (N%)" with an appropriate badge color.

### Progress Callbacks

The `detectDuplicates` progress mapping changes:
- **Layer 1 (hash):** 0-10% (unchanged)
- **Layer 2 (render + hash):** 10-30% (new sub-phase: rendering PDF pages and computing dHash)
- **Layer 2 (compare):** 30-90% (pixel comparison on candidate pairs)
- **Complete:** 90-100%

Note: The current code reports "Visual check complete" at 70%. This moves to 90% since Layer 3 is removed and the visual comparison phase expands.

Rendering progress reports per-file: `"Rendering pages: file 5 of 130"`
Comparison progress reports per-pair: `"Visual comparison: pair 12 of 847"`

## What Changes

**Modified:** `services/duplicate-detector.js`
- New static method: `renderPdfPages(buffer)` — renders all PDF pages to PNG via MuPDF with explicit resource cleanup
- Modified: `findVisualMatches` — expands PDFs to per-page visual entries, two-pass memory strategy, skips same-file pairs
- Modified: `detectDuplicates` — removes Layer 3 call, adjusts progress ranges, `maybePairs` become `LIKELY_MATCH` results

**Modified:** `forms/exhibits/js/duplicate-ui.js`
- New badge branch for `LIKELY_MATCH` type
- Display page numbers from `page1`/`page2` fields when present

**Unchanged:**
- Layer 1 (exact SHA-256 hash)
- `computeDHash`, `hammingDistance` — unchanged
- `computeVisualSimilarity` — unchanged, just called on more pairs (PDF pages too)
- `findContentMatches`, `jaccardSimilarity` — kept but not called from `detectDuplicates`
- `detectDuplicates` public signature — same parameters, same return shape
- Tesseract remains in `package.json` (may be used elsewhere; cleanup is a follow-up)

## Error Handling

- If `renderPdfPages` fails for a PDF (corrupt, encrypted, unsupported):
  - Log a warning
  - Return empty array (PDF contributes zero visual entries)
  - That PDF is still checked by Layer 1 (exact hash)
  - This is safe: worst case we miss a visual duplicate for one corrupt PDF

- If a single page render fails within a PDF:
  - Log warning, skip that page, continue with remaining pages
  - Partial results are better than no results

- MuPDF objects (`doc`, `page`, `pixmap`) are destroyed in `finally` blocks to prevent native memory leaks across a batch of 100+ PDFs

## Performance Estimates

Assumptions: 218 files (130 PDFs averaging 5 pages = 650 page images, 88 direct images = 738 total visual entries).

**Two-pass approach:**

| Phase | Cost | Time Estimate |
|-------|------|---------------|
| Pass 1: Render + dHash (all entries) | 738 × ~35ms (render + hash), 4 concurrent | ~7 seconds |
| Hamming filter | 271,953 pairs × microseconds (minus same-file pairs) | <1 second |
| Pass 2: Re-render + pixel compare (candidates) | ~5,400 pairs × ~75ms (2 renders + compare), 4 concurrent | ~100 seconds |

Note: Same-file pairs are skipped. For 130 PDFs averaging 5 pages, that eliminates ~1,300 self-pairs from comparison (10 pairs per 5-page doc × 130 docs).

With hamming threshold ≤ 15, expect ~2% of cross-file pairs to survive as candidates.

| Files | Visual Entries | Cross-File Pairs | After dHash (~2%) | Pixel Time (4 concurrent) |
|-------|---------------|-----------------|-------------------|--------------------------|
| 50 (mixed) | ~150 | ~10,000 | ~200 | ~4 seconds |
| 218 (mixed) | ~738 | ~270,000 | ~5,400 | ~100 seconds |
| 500 (mixed) | ~1,800 | ~1,600,000 | ~32,000 | ~10 minutes |

The 500-file scenario (~10 minutes for pixel comparison alone) may benefit from the async processing path (Cloud Run Job with 8 vCPU).

## Testing

**`renderPdfPages`:**
- Known single-page PDF → returns 1 PNG buffer
- Multi-page PDF → returns correct page count
- Corrupt buffer → returns empty array without throwing
- MuPDF objects cleaned up (no memory leak across repeated calls)

**`findVisualMatches` with PDFs:**
- Identical PDFs → detected as VISUAL_MATCH with correct page numbers
- Different PDFs → filtered by dHash, no match
- Image-vs-PDF-page cross-type comparison works
- Same-file page pairs are skipped (pages within one PDF not compared against each other)
- Progress callback fires for both render and comparison phases
- Null dHash fallback still includes pair as candidate

**`detectDuplicates`:**
- Layer 3 (OCR) no longer called
- 80-95% similarity pairs returned as `LIKELY_MATCH` (not sent to Tesseract)
- Progress ranges updated (render 10-30%, compare 30-90%)

**`duplicate-ui.js`:**
- `LIKELY_MATCH` renders with correct badge text
- Page numbers displayed when `page1`/`page2` present

**Integration:**
- Existing duplicate-detector tests still pass
- Mix of images and PDFs in same exhibit works end-to-end
- Large PDF (50+ pages) doesn't OOM (two-pass memory strategy)

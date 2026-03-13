# Duplicate Detection Tuning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce false positives in visual duplicate detection by switching to RGB comparison at 128x128 with tighter thresholds.

**Architecture:** Single-file change to `services/duplicate-detector.js` — update constants and remove `.grayscale()` from the thumbnail pipeline. No API, UI, or orchestration changes needed.

**Tech Stack:** Sharp (image processing), Jest (testing)

**Spec:** `docs/superpowers/specs/2026-03-12-duplicate-detection-tuning-design.md`

---

## Chunk 1: Implementation

### Task 1: Update threshold constants

**Files:**
- Modify: `services/duplicate-detector.js:15-19` (module-level constants)
- Modify: `services/duplicate-detector.js:183` (local HAMMING_THRESHOLD inside findVisualMatches)

- [ ] **Step 1: Update module-level constants**

Change lines 15-17 in `services/duplicate-detector.js`:

```js
// Before:
const THUMB_SIZE = 64;
const VISUAL_MATCH_THRESHOLD = 0.95;
const VISUAL_MAYBE_LOW = 0.80;

// After:
const THUMB_SIZE = 128;
const VISUAL_MATCH_THRESHOLD = 0.97;
const VISUAL_MAYBE_LOW = 0.90;
```

- [ ] **Step 2: Update HAMMING_THRESHOLD inside findVisualMatches**

Change line 183 in `services/duplicate-detector.js`:

```js
// Before:
const HAMMING_THRESHOLD = 15;

// After:
const HAMMING_THRESHOLD = 10;
```

- [ ] **Step 3: Commit constants change**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): tighten duplicate detection thresholds"
```

---

### Task 2: Switch computeVisualSimilarity to RGB

**Files:**
- Modify: `services/duplicate-detector.js:141-166` (computeVisualSimilarity method)

- [ ] **Step 1: Remove .grayscale() from the thumbnail pipeline**

In `computeVisualSimilarity()`, change the `toThumb` function (lines 149-155):

```js
// Before:
const toThumb = async (buf) => {
    return sharp(buf)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();
};

// After:
const toThumb = async (buf) => {
    return sharp(buf)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer();
};
```

Note: `.removeAlpha()` ensures consistent 3-channel RGB output regardless of input format (PNG with alpha, TIFF with alpha, etc.). Without it, `thumb.length` would vary by input format, breaking the similarity math.

- [ ] **Step 2: Update the JSDoc comment**

Change lines 141-146:

```js
// Before:
/**
 * Compute visual similarity between two image buffers.
 * Resizes both to 64x64 grayscale thumbnails and compares pixel values.

// After:
/**
 * Compute visual similarity between two image buffers.
 * Resizes both to 128x128 RGB thumbnails and compares pixel values.
```

The similarity formula on line 165 (`1.0 - (totalDiff / pixelCount / 255)`) stays unchanged. `pixelCount` is `thumb1.length` which equals `W * H * channels` (128×128×3 = 49152 bytes). Each byte is still 0-255, so the normalization is correct.

- [ ] **Step 3: Commit RGB change**

```bash
git add services/duplicate-detector.js
git commit -m "feat(exhibits): switch visual comparison from grayscale to RGB"
```

---

### Task 3: Update existing tests for new thresholds

**Files:**
- Modify: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Update the "low similarity for very different images" test**

The test at line 62-73 creates solid red vs solid blue images and asserts `similarity < 0.85`. With RGB mode, red vs blue will score much lower (previously grayscale made them both "medium gray"). Update the assertion to be tighter:

```js
// Before (line 72):
expect(similarity).toBeLessThan(0.85);

// After:
expect(similarity).toBeLessThan(0.70);
```

- [ ] **Step 2: Update hamming distance boundary tests**

The test at line 147-151 ("should return 15 for exactly 15 differing bits (boundary: included)") documents the old threshold boundary. Update the test description to reflect the new threshold of 10:

```js
// Before (lines 147-156):
it('should return 15 for exactly 15 differing bits (boundary: included)', () => {
    const hash = (1n << 15n) - 1n;
    expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(15);
});

it('should return 16 for exactly 16 differing bits (boundary: excluded)', () => {
    const hash = (1n << 16n) - 1n;
    expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(16);
});

// After:
it('should return 10 for exactly 10 differing bits (boundary: included)', () => {
    const hash = (1n << 10n) - 1n;
    expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(10);
});

it('should return 11 for exactly 11 differing bits (boundary: excluded)', () => {
    const hash = (1n << 11n) - 1n;
    expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(11);
});
```

- [ ] **Step 3: Update the "similar hashes for same image at different resolutions" test**

The test at line 98-109 asserts hamming distance ≤ 15. Update to match new threshold:

```js
// Before (line 108):
expect(DuplicateDetector.hammingDistance(hash1, hash2)).toBeLessThanOrEqual(15);

// After:
expect(DuplicateDetector.hammingDistance(hash1, hash2)).toBeLessThanOrEqual(10);
```

- [ ] **Step 4: Run all tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All tests pass.

- [ ] **Step 5: Commit test updates**

```bash
git add tests/services/duplicate-detector.test.js
git commit -m "test(exhibits): update duplicate detector tests for RGB mode and tighter thresholds"
```

---

### Task 4: Add RGB-specific regression test

**Files:**
- Modify: `tests/services/duplicate-detector.test.js`

- [ ] **Step 1: Add test that different-colored same-layout images score low**

This is the key regression test — it verifies that the RGB change actually prevents false positives. Add this test inside the `Layer 2: computeVisualSimilarity` describe block (after the existing "low similarity" test around line 73):

```js
it('should score low for same-layout different-color images (RGB sensitivity)', async () => {
    const sharp = require('sharp');
    // Two solid-color images: same layout, different colors
    // Under grayscale, these would both become identical gray
    const redOnWhite = await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 240, b: 240 } }
    }).png().toBuffer();
    const blueOnWhite = await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 240, g: 240, b: 255 } }
    }).png().toBuffer();

    const similarity = await DuplicateDetector.computeVisualSimilarity(redOnWhite, blueOnWhite);
    // These are visually distinct colors — should not match at VISUAL_MATCH level (0.97)
    expect(similarity).toBeLessThan(0.97);
});
```

- [ ] **Step 2: Add test that identical images still score 1.0 with RGB**

This is a sanity check — make sure we didn't break true duplicate detection. Add after the previous test:

```js
it('should still return 1.0 for identical color images (RGB mode)', async () => {
    const sharp = require('sharp');
    const img = await sharp({
        create: { width: 150, height: 150, channels: 3, background: { r: 100, g: 200, b: 50 } }
    }).png().toBuffer();

    const similarity = await DuplicateDetector.computeVisualSimilarity(img, Buffer.from(img));
    expect(similarity).toBeCloseTo(1.0, 2);
});
```

- [ ] **Step 3: Add test for LIKELY_MATCH band (90-97%)**

Add a test that verifies the narrowed LIKELY_MATCH band still catches compression-like variants:

```js
it('should classify slight variations as LIKELY_MATCH in the 90-97% band', async () => {
    const sharp = require('sharp');
    // Create two images that are very similar but not identical
    const base = await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 200, g: 100, b: 50 } }
    }).png().toBuffer();

    // Slightly different — simulate minor quality/brightness difference
    const variant = await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 205, g: 103, b: 52 } }
    }).png().toBuffer();

    const similarity = await DuplicateDetector.computeVisualSimilarity(base, variant);
    // Should be in the high range (similar but not identical)
    expect(similarity).toBeGreaterThan(0.90);
    expect(similarity).toBeLessThan(1.0);
});
```

- [ ] **Step 4: Run all tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/services/duplicate-detector.test.js --verbose
```

Expected: All tests pass, including new RGB-specific tests.

- [ ] **Step 5: Commit new tests**

```bash
git add tests/services/duplicate-detector.test.js
git commit -m "test(exhibits): add RGB regression tests for duplicate detection"
```

---

### Task 5: Deploy

- [ ] **Step 1: Push to remote**

```bash
git push
```

- [ ] **Step 2: Build and deploy to Cloud Run**

Deploy manually (no CI/CD trigger on main):

```bash
IMAGE_TAG="duplicate-tuning-$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --tag "gcr.io/docmosis-tornado/node-server:${IMAGE_TAG}" --project "docmosis-tornado" --timeout=20m
gcloud run deploy node-server --image "gcr.io/docmosis-tornado/node-server:${IMAGE_TAG}" --region us-central1 --project docmosis-tornado --allow-unauthenticated
```

- [ ] **Step 3: Verify health**

```bash
curl -s https://$(gcloud run services describe node-server --region us-central1 --format='value(status.url)' | sed 's|https://||')/health
```

Expected: 200 OK

---

## Rollback

If false negatives are reported after deploy:

1. Revert `HAMMING_THRESHOLD` to 15 and `VISUAL_MAYBE_LOW` to 0.80 first
2. If still missing matches, revert `VISUAL_MATCH_THRESHOLD` to 0.95
3. RGB change should NOT be reverted (it only improves discrimination)

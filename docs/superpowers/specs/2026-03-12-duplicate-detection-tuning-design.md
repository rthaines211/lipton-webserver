# Duplicate Detection Tuning — Reduce False Positives

**Date**: 2026-03-12
**Status**: Draft
**Branch**: TBD

## Problem

The visual duplicate detection (Layer 2) produces excessive false positives, especially with text-heavy PDF pages. Two root causes:

1. **Grayscale comparison** strips color information — pages with different colored headers, logos, and backgrounds score as matches because they share a "white page with dark text" pattern.
2. **Low resolution (64x64)** and **loose thresholds** (hamming ≤15, visual match ≥95%, likely match ≥80%) mean most text documents look alike.

Example: An inspection report page 26 flagged as 92% match against an unrelated affidavit page 1.

## Goal

Dramatically reduce false positives while preserving detection of real duplicates (same photo as JPG + embedded in PDF, same document uploaded under different names, screenshots of documents).

An occasional false positive is acceptable. Half the results being false positives is not.

## Design

### Change 1: RGB Comparison (instead of grayscale)

In `computeVisualSimilarity()`:
- Remove `.grayscale()` from the Sharp pipeline
- Compare 3-channel (RGB) pixel data instead of 1-channel
- The existing similarity formula (`1.0 - (totalDiff / pixelCount / 255)`) works unchanged because `pixelCount` is `thumb.length` (total bytes = W×H×channels), not pixel count. Each byte is still 0-255, so the normalization holds.

This is the highest-impact change. Different documents almost always have different color profiles (logos, headers, form tints, photo content).

### Change 2: Increase Thumbnail Resolution

- `THUMB_SIZE`: 64 → **128**
- More pixels = more layout detail captured = better discrimination between text pages with different content arrangements
- Memory per thumbnail: 128×128×3 = 49KB (vs 64×64×1 = 4KB) — still trivial

### Change 3: Tighten dHash Hamming Threshold

- `HAMMING_THRESHOLD`: 15 → **10** (note: this is a local `const` inside `findVisualMatches()`, not a module-level constant)
- Reduces candidate pairs entering the expensive pixel comparison pass
- 10 bits of 64 still allows ~15% structural difference, enough for compression/quality variants
- **Risk**: JPEG quality variants and brightness tweaks that previously had hamming distance 11-15 will be filtered out before pixel comparison. If stress testing shows missed matches, increase back toward 12-13 before reverting fully to 15.

### Change 4: Raise Visual Similarity Thresholds

- `VISUAL_MATCH_THRESHOLD`: 0.95 → **0.97** (97%)
- `VISUAL_MAYBE_LOW`: 0.80 → **0.90** (90%)
- Combined with RGB comparison and higher resolution, these thresholds should catch real duplicates while filtering out "similar layout" false positives

### Change 5: Update dHash to Use Color

The dHash computation also uses grayscale. Update to compute dHash on each RGB channel separately and combine, or keep grayscale dHash as a coarse pre-filter (since its purpose is just to quickly eliminate non-candidates).

**Decision**: Keep dHash as grayscale. It's a fast pre-filter — the tightened hamming threshold (10) plus the RGB pixel comparison in Pass 2 will handle the rest. No need to over-engineer the pre-filter.

## Files Modified

| File | Change |
|------|--------|
| `services/duplicate-detector.js` | All threshold constants, `computeVisualSimilarity()` RGB mode, `THUMB_SIZE` |

## Unchanged

- Layer 1 (exact SHA-256 hash) — no changes needed
- dHash algorithm — stays grayscale (pre-filter only)
- `MAX_CANDIDATE_PAIRS` cap (500) — still needed
- UI, API routes, exhibit processor orchestration — all unchanged
- Cross-document page comparison — kept (every page vs every page)

## Risks

- **Missed matches where color differs**: A photo with very different white balance or color grading across two copies might score lower with RGB. Mitigation: real duplicates of the same photo will still be near-identical in color. Only extreme color shifts would cause a miss, and those are rare in legal document workflows.
- **Still some false positives**: Text-only pages with identical color schemes (e.g., two plain white pages with black text) may still match at high similarity. The 128x128 resolution helps distinguish different text layouts, and the 97%/90% thresholds set a higher bar.

## Rollback

If false negatives increase after deploy: revert `HAMMING_THRESHOLD` to 15 and `VISUAL_MAYBE_LOW` to 0.80 first, then investigate.

## Testing

- Run against existing stress test files (1000 files in `test-exhibit-files/stress-test-1000/`)
- Verify exact clones still detected
- Verify JPEG quality variants still detected
- Verify LIKELY_MATCH band (90-97%) fires for compression variants and screenshots
- Verify different documents no longer flagged as matches
- Update unit tests for new threshold values and RGB mode

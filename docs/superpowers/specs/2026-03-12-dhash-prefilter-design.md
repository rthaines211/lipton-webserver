# dHash Pre-Filter for Duplicate Detection

## Goal

Reduce Layer 2 (visual similarity) duplicate detection from O(n²) expensive pixel comparisons to O(n) hashing + O(n²) cheap hamming distance checks + expensive pixel comparison only on candidate pairs. This turns 19 minutes for 218 files into ~5-10 seconds, and makes 1,000 files feasible (~30-90 seconds instead of 6-16 hours).

## Approach: Hash-First Filter + Visual Verify

### Stage 1: Compute dHash per file (O(n))

For each image file in the exhibit (only files where `IMAGE_TYPES_SET.has(file.type)` — matching the existing filter in `findVisualMatches`. PDFs and non-image types are skipped):

1. Resize to 9x8 grayscale via sharp (72 pixels)
2. Compare each pixel to its right neighbor: pixel[row][col] > pixel[row][col+1] → 1, else 0
3. Produces 64 bits (8 rows × 8 comparisons per row)
4. Store as a BigInt (bits packed row-major, left-to-right, MSB-first)

This runs once per file. Cost: ~10ms per file (one sharp resize).

### Stage 2: Hamming distance filter (O(n²) but microseconds per pair)

For every pair of image files:

1. XOR the two 64-bit hashes
2. Count set bits (popcount) = hamming distance
3. If hamming distance ≤ 15 → candidate pair, send to pixel comparison
4. If hamming distance > 15 → skip pair entirely

At 1,000 files, this is 499,500 XOR + popcount operations — completes in milliseconds.

### Stage 3: Pixel comparison on candidates only (existing code)

Run the existing `computeVisualSimilarity` (sharp resize to 64x64 + pixel diff) only on candidate pairs from Stage 2. With threshold 15, expect ~5-10% of pairs to survive the hamming filter (varies by file diversity). Worst case (all hashes null due to failures) degrades to current behavior — no regression, just no improvement.

The existing thresholds remain:
- similarity ≥ 0.95 → VISUAL_MATCH (duplicate)
- similarity 0.80-0.95 → "maybe" pair, sent to Layer 3 (OCR)
- similarity < 0.80 → not a duplicate

## What Changes

**Modified:** `services/duplicate-detector.js`
- New static method: `computeDHash(buffer)` — returns BigInt
- New static method: `hammingDistance(hash1, hash2)` — returns number
- Modified: `findVisualMatches` — computes dHash for all files first, filters pairs by hamming distance before running pixel comparison

**Unchanged:**
- Layer 1 (exact SHA-256 hash) — untouched
- Layer 3 (OCR text comparison) — untouched
- `computeVisualSimilarity` — untouched, just called on fewer pairs
- `detectDuplicates` public interface — same signature, same return format
- Progress callbacks — still report pair progress, just fewer pairs to report on

## Error Handling

If `computeDHash` fails for a file (corrupt image, unsupported format):
- Log a warning
- Mark that file's hash as `null`
- Any pair involving a `null`-hashed file is automatically included as a candidate (sent to pixel comparison)
- This is the safe default: never silently skip a potential duplicate

## Threshold Choice

Hamming distance ≤ 15 (out of 64 bits) is conservative — it catches near-duplicates including scan quality variations, minor cropping differences, and compression artifacts, while still filtering out the vast majority of non-matching pairs. For legal exhibits, false positives (flagging non-duplicates for review) are acceptable; false negatives (missing real duplicates) are not.

## Performance Estimates

| Files | Pairs | Current (pixel all) | After (hash + filter) |
|-------|-------|--------------------|-----------------------|
| 218   | 23,653 | ~19 min          | ~5-10 sec             |
| 500   | 124,750 | ~2 hours         | ~15-30 sec            |
| 1,000 | 499,500 | ~6-16 hours      | ~30-90 sec            |

Estimates assume ~5-10% of pairs survive the hamming filter at threshold 15.

## Testing

- `computeDHash`: known image → expected hash value; same image at different resolutions → hash within hamming distance threshold (not strict equality, due to interpolation differences); different images → different hashes
- `hammingDistance`: known hash pairs → expected distances; edge cases: `0n` vs `0n` (distance 0), all-ones (distance 64), boundary test at distance 15 (included) vs 16 (excluded)
- `findVisualMatches` with dHash: verify candidate filtering (mock sharp to control hash output); verify null-hash fallback includes pair in candidates; verify progress callback reports filtered candidate count as `totalPairs`
- Integration: existing duplicate detector tests should still pass (same interface, same results, just faster)

# Exhibit Collector — Progress UX Improvement Design

**Date:** 2026-03-09
**Branch:** `feat/complaint-creator` (or new branch TBD)
**Status:** Approved

## Problem

When processing 16 files in a single exhibit, the progress modal sits at ~28% saying "Scanning Exhibit A for duplicates" with no visible movement for an extended period. The bar then jumps to ~44% and suddenly starts outputting. Users can't tell if the process is stuck or working.

**Root cause:** The backend emits progress events at coarse exhibit-level granularity. During duplicate detection, progress only updates when moving to the next exhibit letter. With all files in one exhibit, there are zero intermediate updates during the most expensive phase.

## Approach: Granular SSE Events

Emit fine-grained progress events from every sub-step in the processing pipeline. Enhance the frontend progress modal with richer messages, a shimmer animation, time estimates, and stale detection.

## Backend Changes

### Exhibit Processor (`services/exhibit-processor.js`)

New progress breakdown:

| Range | Phase ID | Phase | Sub-step granularity |
|-------|----------|-------|---------------------|
| 0-5% | `validation` | Validation | Per-exhibit: "Validating Exhibit A (1/3)" |
| 5-40% | `duplicate_detection` | Duplicate Detection | Per-layer, per-pair: "Exhibit A: visual comparison 7/120 pairs" |
| 40-85% | `processing` | Image Processing + PDF Assembly | Per-file: "Processing file 3/16 in Exhibit A" |
| 85-95% | `stamping` | Bates Stamping | Per-page: "Stamping page 12/48" |
| 95-100% | `finalizing` | Save + Finalize | "Writing final PDF...", "Complete" |

### Duplicate Detector (`services/duplicate-detector.js`)

- Accept parent `onProgress` callback
- Report per-pair progress within each detection layer:
  - Layer 1 (hash): "Checking exact hashes: file 3/16"
  - Layer 2 (visual): "Visual comparison: pair 7/120"
  - Layer 3 (OCR): "OCR analysis: pair 2/5"
- Total pairs known up front: `n*(n-1)/2` for visual, filtered count for OCR

### SSE Event Format

Current:
```json
{ "progress": 45, "message": "Scanning Exhibit A for duplicates..." }
```

Enhanced:
```json
{
  "progress": 45,
  "phase": "duplicate_detection",
  "message": "Exhibit A: visual comparison 7 of 120 pairs",
  "timestamp": 1741520000000
}
```

- `phase`: Machine-readable phase ID for frontend label mapping
- `timestamp`: Server timestamp for ETA calculation
- `progress` and `message`: Same semantics as before (backward compatible)

Event types unchanged: `progress`, `duplicates`, `complete`, `error`.

## Frontend Changes

### Progress Modal Enhancements (`forms/exhibits/js/form-submission.js`)

**1. Phase label display:**
- Map `phase` to human-readable label shown bold above the bar
- Phase labels: "Validating" → "Scanning for Duplicates" → "Processing Files" → "Applying Bates Stamps" → "Finalizing"
- `message` shown as detail text below the bar

**2. Shimmer animation on progress bar (`forms/exhibits/styles.css`):**
- CSS animated diagonal stripe overlay on `.progress-bar`
- Runs continuously while progress is active
- Communicates "still working" even when width doesn't change
- Stops at 100%

**3. Time estimate:**
- Track `startTime` when first progress event with `timestamp` arrives
- After 10% progress: display "Estimated time remaining: ~Xs"
- Formula: `(elapsed / currentPercent) * (100 - currentPercent)`
- Update on every progress event
- Display below detail message

**4. Stale detection:**
- Track time since last SSE event
- After 5 seconds with no event: show "Still processing..." as detail message
- After 15 seconds: add subtle pulse animation to message text
- Reset on next event arrival

### Upload Phase (0-20% display range)

Already has per-exhibit upload tracking. No changes needed — this phase works well.

### Server Phase Mapping (20-80% display range)

Current mapping: `displayPct = 20 + Math.round(data.progress * 0.8)`

This stays the same. The improvement is that `data.progress` now updates much more frequently, so the bar moves smoothly instead of jumping.

## Files to Modify

| File | Changes |
|------|---------|
| `services/exhibit-processor.js` | Granular `onProgress` calls at every sub-step |
| `services/duplicate-detector.js` | Accept + call `onProgress` per-pair in each layer |
| `routes/exhibits.js` | Add `phase` and `timestamp` to broadcast data |
| `forms/exhibits/js/form-submission.js` | Phase labels, ETA calculation, stale detection |
| `forms/exhibits/styles.css` | Shimmer animation on progress bar |

## Non-Goals

- No layout changes to the progress modal
- No step timeline / multi-bar UI
- No changes to duplicate resolution modal
- No changes to gap detection

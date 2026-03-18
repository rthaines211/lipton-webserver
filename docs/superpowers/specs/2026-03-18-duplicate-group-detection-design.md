# Duplicate Group Detection Design

**Date:** 2026-03-18
**Branch:** `feat/exhibit-dropbox-async`
**Status:** Draft

## Problem

The current duplicate detection system compares files in pairs and presents each pair independently to the user. When 3+ files are duplicates of each other (e.g., files A, B, C are all identical), the system produces pairs (A,B), (A,C), (B,C) — each shown as a separate card. The user can make contradictory decisions (remove A in one pair, keep A in another). The UI doesn't scale well beyond pairs.

## Decisions

- **Resolution UX:** Keep/remove toggle per file within a group (option C). Default: keep first file alphabetically, remove rest. User can flip any file. Must keep at least 1.
- **Mixed-confidence groups:** One consolidated group (option A). If A↔B is exact and A↔C is visual, they're shown as one group with per-edge relationship details.
- **Transitive grouping:** Group by connected component (option A). If A matches B and B matches C, all three are in one group even if A↔C isn't a direct match.
- **Algorithm:** Hybrid approach — keep existing pair pipeline (Layers 1 + 2), add dHash pre-filter to Layer 2, post-process pairs into groups via Union-Find.
- **Edge completeness:** Star topology edges are sufficient. `findExactDuplicates` only pairs each file with the first occurrence sharing the same hash (e.g., 3 identical files A,B,C produce edges A↔B and A↔C, not B↔C). Union-Find still groups them correctly. The UI shows the edges that were detected, not all possible edges — this is intentional and clearly conveys the group membership.

## Architecture

### Detection Pipeline (unchanged flow, new post-processing)

```
Files → Layer 1 (SHA-256 exact) → Layer 2 (dHash pre-filter + pixel comparison) → Flat pairs
                                                                                       ↓
                                                                             Union-Find grouping
                                                                                       ↓
                                                                                 Group output
```

> **Note:** Layer 3 (OCR) was previously removed from the pipeline. If re-enabled in the future, its pairs would feed into the same Union-Find post-processing step.

### Data Structures

#### Group Output (replaces flat pair array)

```js
// Per-exhibit output: array of groups
{
  A: [
    {
      groupId: 'A-g0',
      files: ['scan-001.pdf', 'scan-001-copy.pdf', 'scan-001-resized.jpg'],
      defaultKeep: 'scan-001.pdf',  // first file alphabetically — frontend uses this as authoritative default
      edges: [
        { file1: 'scan-001.pdf', file2: 'scan-001-copy.pdf', matchType: 'EXACT_DUPLICATE', confidence: 100, layer: 1 },
        { file1: 'scan-001.pdf', file2: 'scan-001-resized.jpg', matchType: 'VISUAL_MATCH', confidence: 96, layer: 2 },
      ],
      thumbnails: {
        'scan-001.pdf': 'data:image/jpeg;base64,...',
        'scan-001-copy.pdf': 'data:image/jpeg;base64,...',
        'scan-001-resized.jpg': 'data:image/jpeg;base64,...',
      }  // server-provided thumbnails (Dropbox imports); null/absent for local uploads
    }
  ]
}
```

#### Resolution Payload

```js
// POST /api/exhibits/jobs/:jobId/resolve
{
  resolutions: {
    A: [
      {
        groupId: 'A-g0',
        keep: ['scan-001.pdf'],
        remove: ['scan-001-copy.pdf', 'scan-001-resized.jpg']
      }
    ]
  }
}
```

**Validation rules:**
- `keep` array must have ≥1 file
- `keep ∪ remove` must exactly equal the group's `files` array (no missing, no extras)
- All files must belong to the correct exhibit letter

## Union-Find Grouping Algorithm

New `buildGroups(files, pairs)` function in `duplicate-detector.js`:

1. Initialize each file as its own set (Map-based Union-Find)
2. For each pair `(file1, file2)` in the flat pairs array: `union(file1, file2)`
3. Collect connected components — each component = one group
4. Attach the original pair objects as `edges` on the group
5. Sort files within each group alphabetically; first file = `defaultKeep`
6. Assign `groupId` as `${letter}-g${index}`

Single-file components (no matches) are excluded from output.

The Union-Find uses path compression and union-by-rank. ~30 lines, no external dependencies.

**Group ordering:** Groups are sorted by the alphabetically-first filename in each group before assigning `groupId` indices. This ensures deterministic IDs across runs for the same input.

**Error handling in `buildGroups`:**
- Pairs referencing unknown filenames are skipped (log warning)
- Self-pairs (`file1 === file2`) are skipped
- Empty input returns empty groups array

`detectDuplicates` return type changes from `{ duplicates: Array<Pair> }` to `{ groups: Array<Group> }`.

## dHash Pre-filter for Layer 2

Currently Layer 2 does O(n²) pixel comparisons (resize to 64x64 grayscale, diff every pixel). Adding a dHash pre-filter:

1. **Compute dHash per file** (once, before pair loop) — resize to 9x8 grayscale, compare adjacent pixels → 64-bit hash. ~2ms per file.
2. **Before pixel comparison**, compute hamming distance between dHashes. If distance > 10 bits, skip the pair — they can't be visually similar.
3. Only pairs passing the pre-filter proceed to expensive pixel comparison.

Reuses the approach validated in the PDF visual duplicate detection work (hamming ≤10 = candidate).

New static methods:
- `DuplicateDetector.computeDHash(buffer)` → `BigInt`
- `DuplicateDetector.hammingDistance(hash1, hash2)` → `number`

For 100 image files: reduces ~4,950 pixel comparisons to potentially a few dozen.

## Frontend — Group-Based Resolution UI

The modal changes from pair cards to group cards:

```
┌─────────────────────────────────────────────────┐
│ Exhibit A: Group 1 — 3 duplicates               │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│ │ [thumb] │  │ [thumb] │  │ [thumb] │          │
│ │ scan.pdf│  │ copy.pdf│  │ resz.jpg│          │
│ │  ✓ KEEP │  │ ✗ REMOVE│  │ ✗ REMOVE│          │
│ └─────────┘  └─────────┘  └─────────┘          │
│                                                  │
│ Relationships:                                   │
│  scan.pdf ↔ copy.pdf — Exact Duplicate (100%)   │
│  scan.pdf ↔ resz.jpg — Visual Match (96%)       │
│                                                  │
│ [Keep All]                                       │
└─────────────────────────────────────────────────┘
```

**Behaviors:**
- **Default state:** First file (alphabetically) = keep, rest = remove
- **Toggle:** Click a file card to flip keep ↔ remove
- **Guard:** Cannot remove the last kept file — toggle disabled when only 1 file is kept
- **"Keep All" button:** Resets all files in the group to keep. "Remove All" is intentionally omitted to prevent accidental data loss.
- **Relationship lines:** One line per edge, shown below file cards
- **File count summary:** Total removals across all groups (same location as current)

**File card states:**
- `marked-keep`: green border/background (reuses existing CSS class)
- `marked-remove`: red border/background (reuses existing CSS class)
- `marked-keep-locked`: green + disabled toggle (last remaining kept file)

## Backend Resolution Endpoint

`POST /api/exhibits/jobs/:jobId/resolve` changes:

**Validation:**
- Each resolution must have a valid `groupId` matching a group in the report
- `keep` array must have ≥1 file
- `keep` + `remove` must exactly equal the group's `files`
- All files must belong to the correct exhibit letter

**Processing** (same logic, different input shape):
1. Collect all files from `remove` arrays across all groups
2. Filter `job.exhibits[letter]` to exclude removed files
3. Resume pipeline via `ExhibitProcessor.resume()`

No change to downstream pipeline — it still receives a filtered file list.

## Backward Compatibility

- **SSE event:** `event: duplicates` payload changes from `{ letter: [pairs] }` to `{ letter: [groups] }`. Breaking change to frontend contract, but frontend/backend deploy together (same Cloud Run service) — no versioning needed. During rolling deploys, Cloud Run may briefly run two versions; with `concurrency=2` and session affinity, the window where an old frontend hits a new backend is negligible. No dual-format support needed.
- **Async jobs (2000+ files):** Skip duplicate detection entirely. No change needed.
- **Database:** No schema changes. Duplicate reports are held in memory during SSE sessions, not persisted to `exhibit_jobs`.

## Testing

**Updated tests:**
- Duplicate detection tests: new `{ groups }` return type
- Resolution endpoint tests: new payload shape

**New tests:**
- Union-Find grouping: 3+ file groups, transitive grouping, mixed match types in one group
- dHash pre-filter: skip behavior (high hamming distance), pass behavior (low hamming distance)
- UI resolution validation: at-least-one-keep guard, keep+remove = group files
- Group edge metadata: correct edges attached to correct groups

## Files Modified

| File | Change |
|------|--------|
| `services/duplicate-detector.js` | Add `buildGroups()`, `computeDHash()`, `hammingDistance()`, dHash pre-filter in `findVisualMatches()`, change `detectDuplicates()` return type |
| `services/exhibit-processor.js` | Update to consume `{ groups }` instead of `{ duplicates }` |
| `routes/exhibits.js` | Update SSE broadcast and resolve endpoint for group format |
| `forms/exhibits/js/duplicate-ui.js` | Rewrite modal rendering for group cards with per-file toggles |
| `forms/exhibits/js/form-submission.js` | Update resolution payload construction |
| `forms/exhibits/styles.css` | Add group card styles, `marked-keep-locked` state |

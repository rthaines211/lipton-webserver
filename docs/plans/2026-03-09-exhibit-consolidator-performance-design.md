# Exhibit Consolidator Performance Optimization — Design

**Date:** 2026-03-09
**Branch:** TBD
**Status:** Approved

## Problem

The exhibit consolidator takes ~3.5 minutes to process 16 documents on Cloud Run. Real-world usage ranges from 10 to 200+ documents, making this unacceptably slow. The root causes are: zero parallelism in the processing pipeline, redundant work (double sharp calls, separator page rebuilds), a single vCPU on Cloud Run, and sequential frontend uploads.

## Approach: Parallel + More Muscle (Approach B)

Code-level parallelism optimizations combined with a Cloud Run infrastructure bump to 4 vCPU / 4 GiB.

**Expected result:** 16 docs from ~3.5 min → ~50-90 seconds. Larger jobs see even bigger relative improvements.

## Design

### 1. Parallelize Across Exhibits

**Duplicate Detection:** Process all exhibit letters in parallel via `Promise.all` — each exhibit's files are independent.

**PDF Assembly:** Process all exhibit letters in parallel — each letter produces its own set of pages, then merge in order at the end.

### 2. Bounded Concurrent Processing Within Exhibits

Use a shared utility function:
```js
async function processWithConcurrency(items, fn, limit = 4)
```

**Duplicate detection:** Run visual similarity pairs with bounded concurrency (4 pairs at a time) instead of one-by-one. Also process multiple OCR pairs concurrently (2-3 at a time).

**Image conversion:** Batch image conversions through sharp with bounded concurrency (4-6 images at a time).

### 3. Eliminate Redundant Work

**Sharp double-call:** Currently every image hits sharp twice — once for JPEG conversion, once for `.metadata()`. Instead, extract dimensions during or after conversion in a single pipeline. One sharp call per image instead of two.

**Separator pages:** Currently creates a fresh `PDFDocument`, saves to bytes, reloads, and copies pages for every exhibit. Instead, create one separator PDF template at the start of the job. For each exhibit, clone the page and overwrite the letter text.

### 4. Worker Thread for pdf-lib `save()`

`finalDoc.save()` is pure JS that blocks the event loop during serialization. Offload to a Node.js `worker_thread`. The main thread sends the document data to the worker, the worker serializes it, and returns the buffer. Keeps the event loop responsive for SSE progress updates.

### 5. Frontend Upload Parallelism

Currently exhibits upload one letter at a time via a sequential `for` loop with `await`. Change to upload all exhibit letters in parallel with bounded concurrency (3-4 simultaneous uploads).

### 6. Cloud Run Infrastructure

| Setting | Current | New | Why |
|---|---|---|---|
| CPU | 1 | 4 | sharp and Tesseract use native threads — more cores = direct speedup |
| Memory | 1 GiB | 4 GiB | Room for parallel processing and large PDF serialization |
| Concurrency | 80 | 1 | Dedicate full instance resources to one job — no CPU contention |
| Request timeout | 300s | 300s | Keep as-is |
| Min instances | 1 | 1 | Keep warm instance |

**Cost impact:** Minimal. Cloud Run bills per vCPU-second and GiB-second only while processing. A job that takes 60s on 4 vCPU costs the same as 240s on 1 vCPU.

## Files Affected

| File | Changes |
|---|---|
| `services/exhibit-processor.js` | Parallel exhibit processing, worker thread for save() |
| `services/duplicate-detector.js` | Parallel exhibits, bounded concurrent pairs |
| `services/pdf-page-builder.js` | Single sharp call, separator page caching |
| `forms/exhibits/js/main.js` | Parallel uploads with bounded concurrency |
| `deployed-config.yaml` | 4 vCPU, 4 GiB, concurrency 1 |

## What's NOT Changing

- Bates stamping (already fast)
- Tesseract staying in-process (Cloud Vision API is overkill for the small number of OCR pairs)
- SSE progress architecture (works fine)
- GCS upload flow (already fixed)

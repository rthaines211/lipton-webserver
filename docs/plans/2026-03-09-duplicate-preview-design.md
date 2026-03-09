# Duplicate Modal Preview Design

**Date:** 2026-03-09
**Branch:** `feat/exhibit-duplicate-preview`
**Status:** Approved

## Problem

The exhibit consolidator's duplicate detection modal shows only FontAwesome icons (file-image / file-pdf) with filenames. Users can't visually verify whether flagged files are actually duplicates without leaving the modal to check the original files.

## Solution

Add inline image/PDF previews to each file card in the duplicate modal. All rendering is client-side — no backend changes.

## Approach: Client-Side Rendering

The original `File` objects are still in memory via `ExhibitManager.getExhibits()` when the modal displays (they aren't cleared until the `complete` event). PDF.js is already loaded on the page.

- **Images** (png/jpg/jpeg/tiff/heic): `URL.createObjectURL(file)` rendered in an `<img>` tag
- **PDFs**: PDF.js renders page 1 to a `<canvas>` displayed inline

### Why Not Server-Side

- Adds CPU/memory overhead during an already intensive duplicate detection phase
- Bloats SSE event payloads with base64 data
- Cloud Run multi-instance routing means files may not be on the instance serving the request

## Detailed Design

### Data Flow

1. SSE `duplicates` event fires, `DuplicateUI.showModal(report)` called
2. `showModal` looks up `File` objects from `ExhibitManager.getExhibits()` by matching filenames to exhibit letters
3. For each file in a pair:
   - **Images**: `URL.createObjectURL(file)` → `<img>` tag
   - **PDFs**: PDF.js renders page 1 to `<canvas>` → displayed inline
4. Previews render inside `.duplicate-file-card`, replacing the FontAwesome icon
5. Action buttons toggle `.marked-keep` / `.marked-remove` on file cards

### File Changes

**`forms/exhibits/js/duplicate-ui.js`:**
- New helper: `getPreviewElement(letter, filename)` — async, returns an HTML element (img or canvas)
- `renderPairs()` becomes async — renders card shells with loading spinner, fills previews as they resolve
- Action button handler toggles `.marked-keep` / `.marked-remove` CSS classes on file cards

**`forms/exhibits/styles.css`:**
- Use existing `.duplicate-preview`, `.duplicate-preview-img`, `.duplicate-preview-canvas` rules
- Preview: `max-height: 200px; object-fit: contain; width: 100%`

### Preview Sizing

- Images: `<img>` with `max-height: 200px; max-width: 100%; object-fit: contain`
- PDFs: Canvas rendered at viewport width ~400px, displayed with same constraints
- Loading state: spinner placeholder while PDF.js renders

### Visual Feedback on Selection

- **Keep Both**: both cards get `.marked-keep` (green border)
- **Remove File1**: file1 → `.marked-remove` (red border + 0.55 opacity), file2 → `.marked-keep`
- **Remove File2**: vice versa

### Error Handling

- File object not found: fall back to FontAwesome icon
- PDF.js render failure: fall back to PDF icon with error note

## Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **A: Client-side (chosen)** | Zero backend changes, File objects + PDF.js already available | Relies on Files being in memory |
| **B: Server-side thumbnails** | Pre-rendered, instant display | CPU overhead, SSE bloat, backend changes |
| **C: Hybrid endpoint** | Clean separation | Cloud Run routing issues, new endpoint |

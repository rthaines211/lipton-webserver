# Exhibit Collector - Design Document

**Date:** 2026-02-26
**Status:** Approved
**Author:** Ryan Haines

---

## Overview

A standalone Exhibit Collector form that intakes PDF and image file attachments for exhibits A-Z, detects duplicates within each exhibit, and outputs a single combined PDF with exhibit separator pages and Bates stamping. Shares the Lipton Legal shell design with the agreement and document generator forms but has a unique interior purpose.

## Goals

- Collect file attachments (PDF, PNG, JPG, TIFF, HEIC) for up to 26 exhibits (A-Z)
- Merge multiple files per exhibit into a single multi-page PDF per letter
- Resize images to fit US Letter pages while maintaining readability
- Apply exhibit-aware Bates stamping (`EX-A-001`, `EX-B-001`, etc.)
- Detect duplicate files within each exhibit using a three-layer pipeline
- Output a single combined PDF with separator pages between exhibits
- Match the Lipton Legal design language (same shell, different interior)

## Non-Goals

- Case management integration (standalone for now)
- Exhibits beyond A-Z (26 max)
- Client-side PDF processing (server handles all heavy lifting)
- Auto-removal of duplicates (flag only, user decides)

---

## UI Layout & User Flow

### Shell (Shared with Agreement/Document Generator)

- Navy gradient header (`#1F2A44 → #2A3B5A`) with Lipton logo + "Exhibit Collector" title
- Teal-to-pink accent bar below header (`#00AEEF → #F2C8D0`)
- White card container, 1000px max-width, 12px border-radius, subtle shadow
- Open Sans body / Merriweather headings / Font Awesome icons
- Brand colors: Primary Navy `#1F2A44`, Secondary Teal `#00AEEF`, Neutral Gray `#F5F5F5`, Text `#333333`

### Interior - 3 Sections

**1. Case Info Section**
- Case name/number text input (used for output filename)
- Optional description field
- Simple top section to label the output

**2. Exhibit Grid**
- 26 exhibit slots (A-Z), each rendered as a collapsible card
- Each card contains:
  - Letter badge on the left (e.g., "A")
  - Exhibit label/description input (optional, e.g., "Lease Agreement")
  - Drag-and-drop upload zone accepting PDF, PNG, JPG, TIFF, HEIC
  - File list showing uploaded files with thumbnails, size, and remove button
  - Duplicate warning badges (amber) when duplicates are detected within that exhibit
- Empty exhibits collapsed by default, expand on click or file drop
- File count badge on each exhibit card header
- Only exhibits with files show as "active"

**3. Output & Submit Section**
- "Generate Exhibit Package" button (navy gradient, full-width, matches existing submit style)
- Progress overlay with SSE-driven real-time status updates matching existing progress modal pattern

### User Flow

1. Enter case name/number
2. Upload PDFs and images to exhibit slots A-Z
3. Click "Generate Exhibit Package"
4. Server runs duplicate detection pipeline
5. If duplicates found → pipeline pauses → user reviews flagged pairs side-by-side → decides keep/remove
6. User clicks "Continue" → server processes remaining pipeline
7. Real-time progress via SSE
8. Single combined PDF downloads

---

## File & Directory Structure

### Frontend (New)

```
forms/
├── shared/
│   ├── js/
│   │   ├── sse-client.js          (existing - reuse)
│   │   ├── sse-manager.js         (existing - reuse)
│   │   └── progress-state.js      (existing - reuse)
│   └── images/                    (existing - shared logo, etc.)
├── agreement/                     (existing - untouched)
├── docs/                          (existing - untouched)
└── exhibits/                      (NEW)
    ├── index.html                 (main page - Lipton shell + exhibit grid)
    ├── styles.css                 (exhibit-specific styles)
    └── js/
        ├── exhibit-manager.js     (exhibit card state, file tracking, drag-drop)
        ├── file-upload.js         (chunked upload to server)
        ├── duplicate-ui.js        (duplicate warning display + user actions)
        └── form-submission.js     (submit handler, SSE progress connection)
```

### Backend (New)

```
routes/
└── exhibits.js                    (NEW - upload, process, download endpoints)

services/
├── exhibit-processor.js           (NEW - PDF merge, resize, Bates stamping)
├── duplicate-detector.js          (NEW - hash → visual → OCR pipeline)
└── pdf-page-builder.js            (NEW - separator pages, image-to-page conversion)
```

### New Dependencies

- `sharp` - image resizing, conversion (HEIC, TIFF support), visual similarity thumbnails
- `multer` - multipart file upload middleware
- `tesseract.js` - OCR text extraction for duplicate detection Layer 3

### Existing Dependencies Used

- `pdf-lib` - PDF assembly, Bates stamping, separator page creation
- `express` - routing
- SSE infrastructure (existing `sse-client.js`, `sse-manager.js`, `progress-state.js`)

---

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/exhibits/upload` | Upload files to a specific exhibit letter (chunked, per-letter) |
| `POST` | `/api/exhibits/generate` | Kick off full exhibit package generation |
| `POST` | `/api/exhibits/jobs/:jobId/resolve` | Submit user's duplicate resolution decisions, resume pipeline |
| `GET` | `/api/exhibits/jobs/:jobId/stream` | SSE stream for real-time progress |
| `GET` | `/api/exhibits/jobs/:jobId/download` | Download the final combined PDF |
| `DELETE` | `/api/exhibits/sessions/:sessionId` | Clean up temp files for a session |

---

## Server Processing Pipeline

Triggered by `POST /api/exhibits/generate`:

### Step 1: Validate (5%)
- Check all exhibits have valid file formats
- Verify at least one exhibit has files

### Step 2: Duplicate Detection (5-30%)
- Run three-layer pipeline per exhibit letter (see Duplicate Detection section)
- If duplicates found: send report via SSE, pause pipeline, wait for user resolution
- If no duplicates: continue automatically

### Step 3: Image Processing (30-50%)
- Convert all images to PDF pages via `sharp` + `pdf-lib`
- Convert HEIC/TIFF to PNG intermediate before embedding
- Convert to RGB colorspace
- Resize to fit US Letter with 0.75" margins (printable area: 7" × 9.5")
- Maintain aspect ratio, center on page
- Landscape images: keep landscape and center (no forced rotation)

### Step 4: PDF Assembly per Exhibit (50-80%)
- For each active exhibit A-Z:
  - Create separator page
  - Merge all files for that letter into sequential pages
  - Apply Bates stamps to each content page

### Step 5: Final Merge (80-95%)
- Combine all exhibit PDFs into one document in A-Z order
- Only include exhibits that have files (skip empty letters)

### Step 6: Delivery (95-100%)
- Store final PDF in temp storage
- Send download-ready SSE event
- Client triggers download

### Temp Storage
- Upload files stored in session-scoped temp directory: `/tmp/exhibits/{sessionId}/`
- Cleaned up after download or after 1-hour TTL

---

## Duplicate Detection

Three-layer pipeline, run per exhibit letter. Each subsequent layer only runs when the previous layer doesn't produce a definitive result.

### Layer 1: Hash Match (instant)
- **Method:** SHA-256 hash of raw file bytes
- **Catches:** Exact same file uploaded twice, same file renamed
- **Threshold:** Exact match
- **Result:** `EXACT_DUPLICATE` (100% confidence)
- **UI Display:** Red badge - "Exact duplicate of [filename]"

### Layer 2: Visual Similarity (~1-2s per pair)
- **Method:** Convert each file's first page to 64×64 grayscale thumbnail via `sharp`, compute normalized pixel difference between all pairs
- **Catches:** Same document as PNG vs PDF, different resolution screenshots, re-exported PDFs
- **Threshold:** >85% similarity = flagged
- **Result:** `VISUAL_MATCH` with similarity percentage
- **UI Display:** Amber badge - "Visually similar to [filename] (92%)"

### Layer 3: OCR Text Comparison (triggered selectively)
- **Trigger:** Only runs on pairs with 60-85% visual similarity (the "maybe" zone)
- **Method:** Extract text via `tesseract.js`, compare using Jaccard similarity (word set overlap)
- **Catches:** Screenshot of email vs PDF print, different crops of same document, photo of printed doc vs digital
- **Threshold:** >80% text overlap = flagged
- **Result:** `CONTENT_MATCH` with text similarity percentage
- **UI Display:** Amber badge - "Similar content to [filename] (87% text match)"

### Duplicate Report Structure (SSE payload)

```json
{
  "exhibit": "A",
  "duplicates": [
    {
      "file1": "email-screenshot.png",
      "file2": "email-print.pdf",
      "matchType": "CONTENT_MATCH",
      "confidence": 87,
      "layer": 3,
      "details": "OCR text similarity: 87%"
    }
  ]
}
```

### User Resolution UI
- Each duplicate pair shown as side-by-side card within the exhibit
- Thumbnail preview of both files
- Match type badge and confidence percentage
- Three actions per pair: **Keep Both** | **Remove File 1** | **Remove File 2**
- "Continue with [X] files" button to resume pipeline

---

## Bates Stamping

### Format
- Pattern: `EX-{letter}-{number}` (e.g., `EX-A-001`, `EX-A-002`, `EX-B-001`)
- Zero-padded to 3 digits (adjusts to 4 digits if an exhibit exceeds 999 pages)
- Numbering resets per exhibit letter

### Placement & Style
- Position: bottom-right corner, 0.5" from page edges
- Font: Helvetica, 9pt, black
- Background: small white rectangle with 1px gray border (ensures readability over any content)
- Separator pages are **not** Bates stamped

---

## PDF Output

### Separator Pages
- US Letter (8.5" × 11")
- "EXHIBIT A" centered horizontally and vertically
- Font: Helvetica Bold, 48pt, black
- Horizontal rule above and below text, 2" wide, centered
- No other content, no Bates stamp

### Page Order

```
[Separator: EXHIBIT A]
[EX-A-001] first file, page 1
[EX-A-002] first file, page 2
[EX-A-003] second file, page 1
...
[Separator: EXHIBIT B]
[EX-B-001] first file, page 1
...
```

### Image-to-Page Conversion
- All images converted to RGB colorspace via `sharp`
- Scaled to fit within US Letter with 0.75" margins (printable area: 7" × 9.5")
- Aspect ratio maintained, image centered on page
- HEIC/TIFF converted to PNG intermediate before embedding in PDF

### Output File
- Single combined PDF in A-Z order
- Only exhibits with files included (empty letters skipped)
- Filename: `{case_name}_Exhibits.pdf` (sanitized, spaces to underscores)
- Fallback: `Exhibit_Package_{timestamp}.pdf`

---

## Error Handling

- **Upload failures:** Retry with exponential backoff, show per-file error in UI
- **Processing failures:** Pipeline reports error via SSE, user can retry from last successful step
- **OCR failures:** Layer 3 gracefully skipped for that pair, pipeline continues
- **Large file handling:** Chunked uploads prevent timeout, server streams processing to avoid memory exhaustion
- **Temp cleanup:** 1-hour TTL ensures orphaned files don't accumulate

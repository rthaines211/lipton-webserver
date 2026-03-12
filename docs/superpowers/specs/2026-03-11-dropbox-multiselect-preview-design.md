# Dropbox Multi-Select & File Preview — Design Spec

## Problem

The current Dropbox file browser in the exhibit collector only supports single-file assignment (drag-and-drop or double-click) and shows no file previews. Users working with 200-1000 files need to:

1. Select multiple files at once and assign them to an exhibit in bulk
2. See thumbnails in the file list to identify files without opening them
3. Preview files at full size before deciding which exhibit to assign them to

## Solution Overview

Three additions to the existing Dropbox browser UI:

1. **Thumbnails** — 40x40 thumbnail previews in the file list, fetched via Dropbox `getThumbnailBatchV2` API
2. **Multi-select** — checkboxes on each file row with Select All, selection toolbar, and multi-drag
3. **Preview modal** — Quick Look-style modal with full-size preview, navigation, and quick assign

## Architecture

### New Server Endpoints

Two new routes on the existing `/api/dropbox` router (`routes/dropbox.js`):

#### `POST /api/dropbox/thumbnails`

Batch thumbnail fetcher using Dropbox `filesGetThumbnailBatchV2`.

- **Request**: `{ paths: string[] }` (max 25 per call, enforced server-side)
- **Response**: `{ thumbnails: [{ path: string, data: string|null }] }` where `data` is base64 JPEG or null on failure
- **Dropbox params**: `size: "w64h64"`, `format: "jpeg"`
- **Error handling**: individual thumbnail failures return `null` data, request-level errors return 500

#### `GET /api/dropbox/temp-link?path=<dropboxPath>`

Fetches a temporary direct download link for the preview modal.

- **Response**: `{ success: true, link: string }` — link valid for 4 hours (Dropbox default)
- **Usage**: frontend loads this URL directly in `<img>` (images) or `<iframe>` (PDFs)

No new service files — both endpoints call Dropbox SDK methods via the existing `getDropboxClient()` from `dropbox-service.js`.

### Frontend Changes

All changes scoped to existing files. No new JS files.

#### `dropbox-browser.js`

**State changes:**
- Rename existing `selectedFiles` Map to `exhibitAssignments` (letter → file array, exhibit slot assignments)
- Add `checkedFiles` Set (Dropbox paths of checked files in the file list)

**Modified functions:**
- `renderFileList(entries)` — add checkbox + 40x40 thumbnail placeholder per file row. Folders keep folder icon, no checkbox. Wire click handler on thumbnail/filename to open preview modal.
- `updateSlotUI(letter)` — update references from `selectedFiles` to `exhibitAssignments`
- `addFileToSlot()`, `addFolderToSlot()`, `getExhibitMapping()`, `getTotalFiles()` — update references

**New functions:**
- `loadThumbnails(entries)` — after file list renders, filters to supported files, chunks paths into groups of 25, fires sequential `POST /api/dropbox/thumbnails` requests, swaps placeholder icons with `<img>` tags as each batch returns. Aborts in-flight requests when navigating to a new folder.
- `openPreviewModal(fileIndex)` — opens modal overlay for the file at given index in the current folder's file list. Fetches temp link via `GET /api/dropbox/temp-link`, shows spinner while loading, renders `<img>` for images or `<iframe>` for PDFs.
- `closePreviewModal()` — closes modal, cleans up event listeners
- `navigatePreview(direction)` — moves to prev/next file in folder, skips folders and unsupported files
- `handleAssignFromModal(letter)` — calls `addFileToSlot(letter, file)`, then `navigatePreview(1)` to advance. If last file, closes modal.
- `renderSelectionToolbar()` — shows/hides sticky toolbar at bottom of file list based on `checkedFiles.size`. Contains file count, exhibit letter dropdown (remembers last-used letter), and "Assign" button.
- `assignCheckedFiles(letter)` — iterates `checkedFiles`, calls `addFileToSlot()` for each, clears `checkedFiles`, hides toolbar.
- `toggleSelectAll()` — toggles all supported files in current folder

**Multi-drag:**
- In `dragstart` handler: if the dragged file is in `checkedFiles`, serialize all checked files into dataTransfer (as JSON array). Otherwise, drag only the single file (current behavior).
- In exhibit slot `drop` handler: detect array vs single object in dataTransfer, handle both.

#### `styles.css`

New CSS classes:
- `.dropbox-entry .thumbnail` — 40x40, border-radius: 4px, object-fit: cover, flex-shrink: 0
- `.dropbox-entry .thumbnail-placeholder` — same dimensions, background: #f5f5f5, centered file-type icon
- `.dropbox-entry .entry-checkbox` — checkbox styling, margin-right
- `.dropbox-entry.checked` — background: #e8f0fe (light blue highlight)
- `.selection-toolbar` — sticky bottom bar, blue background, flex layout with count + controls
- `.preview-modal-overlay` — fixed fullscreen, background: rgba(0,0,0,0.85), z-index: 1000, flex center
- `.preview-modal` — max-width: 90vw, max-height: 90vh, flex column
- `.preview-modal .preview-header` — filename, metadata, prev/next, close button
- `.preview-modal .preview-body` — centered image/iframe container with min-height
- `.preview-modal .preview-footer` — exhibit dropdown + "Assign →" button

#### No changes to:
- `exhibit-manager.js` — exhibit slots work via existing `addFileToSlot()` calls
- `dropbox-browser.js` service (`services/dropbox-browser.js`) — unchanged
- `form-submission.js` — generate flow unchanged
- `routes/exhibits.js` — processing pipeline unchanged

### Thumbnail Loading Strategy

Optimized for 200-1000 files:

1. **File list renders immediately** with placeholder icons (generic file-type icon based on extension)
2. **Sequential batch requests** — `loadThumbnails()` chunks paths into groups of 25, fires them one after another
3. **Progressive swap** — each batch response swaps placeholder icons for real `<img>` thumbnails
4. **Abort on navigation** — navigating to a new folder aborts in-flight thumbnail requests via AbortController
5. **No client-side caching** — thumbnails are small (~2-5KB base64 each), server-side Dropbox cache handles repeat visits within 30s

Performance expectations:
- 200 files: 8 batch calls, ~2-3 seconds for all thumbnails
- 1000 files: 40 batch calls, ~10-15 seconds total, first batch visible in <1 second

### Preview Modal Behavior

- **Open**: click thumbnail or filename in file list
- **Close**: click ✕ button, press Escape, or click outside modal
- **Navigate**: Prev/Next buttons or left/right arrow keys, skips folders and unsupported files
- **Assign →**: assigns current file to selected exhibit letter, auto-advances to next file
- **Dropdown memory**: last-used exhibit letter persists across navigations (enables rapid-fire assignment)
- **Status indicator**: left side of footer shows "✓ Already in Exhibit X" if file is assigned
- **Image preview**: `<img>` tag with Dropbox temporary link
- **PDF preview**: `<iframe>` with Dropbox temporary link (browser native PDF viewer)
- **Loading state**: spinner shown while temp link is being fetched
- **Last file**: after assigning the last file in the folder, modal closes automatically
- **Keyboard shortcuts**: Enter = Assign + advance, ← → = prev/next, Esc = close

### Multi-Select Behavior

- **Checkbox per file** — each supported file row gets a checkbox (folders do not)
- **Select All** — header checkbox toggles all supported files in current folder
- **Selection toolbar** — appears at bottom of file list when any files are checked
  - Shows count: "N files selected"
  - Exhibit letter dropdown (remembers last-used)
  - "Assign" button — adds all checked files to selected exhibit, clears selection
- **Multi-drag** — dragging a checked file drags all checked files together
- **Visual feedback** — checked rows get light blue background highlight
- **Folder navigation clears** — checking files in one folder, navigating away, and coming back starts fresh (no stale selections)

## Data Flow

### Thumbnail Loading
```
renderFileList() → placeholders visible
  → loadThumbnails(entries)
    → chunk paths into groups of 25
    → for each chunk:
        POST /api/dropbox/thumbnails { paths }
          → server: filesGetThumbnailBatchV2()
          → response: { thumbnails: [{path, data}] }
        → swap placeholder → <img src="data:image/jpeg;base64,{data}">
```

### Preview Modal
```
click thumbnail/filename
  → openPreviewModal(fileIndex)
    → show modal with spinner
    → GET /api/dropbox/temp-link?path=...
      → server: filesGetTemporaryLink()
      → response: { link }
    → render <img src={link}> or <iframe src={link}>

click "Assign →"
  → addFileToSlot(letter, file)
  → navigatePreview(1) → loads next file
```

### Multi-Select Assignment
```
check files via checkboxes
  → checkedFiles Set updated
  → selection toolbar appears

click "Assign" in toolbar (or drop on slot)
  → assignCheckedFiles(letter)
    → for each path in checkedFiles:
        addFileToSlot(letter, {dropboxPath, name})
    → checkedFiles.clear()
    → toolbar hides
```

## Testing

- Unit tests for new server endpoints (thumbnail batch, temp link)
- Manual testing: thumbnail loading with varying folder sizes
- Manual testing: multi-select + assign via toolbar and drag
- Manual testing: preview modal navigation, assign + advance, keyboard shortcuts
- Verify existing drag-and-drop single-file flow still works
- Verify existing folder-drop flow still works
- Verify generate flow unchanged after state rename

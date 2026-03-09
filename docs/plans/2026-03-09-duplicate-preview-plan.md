# Duplicate Modal Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline image/PDF previews to the exhibit consolidator's duplicate detection modal so users can visually verify flagged duplicates.

**Architecture:** Client-side only. Use `File` objects already in memory via `ExhibitManager.getExhibits()` and the already-loaded PDF.js library. Images get `URL.createObjectURL()` thumbnails; PDFs get page-1 rendered via PDF.js onto a `<canvas>`. Action buttons toggle `.marked-keep`/`.marked-remove` CSS classes on file cards for visual feedback.

**Tech Stack:** Vanilla JS, PDF.js 3.11.174 (already loaded), existing CSS rules

---

### Task 1: Add async preview rendering helper to duplicate-ui.js

**Files:**
- Modify: `forms/exhibits/js/duplicate-ui.js:6-8` (inside IIFE, after `resolutions` declaration)

**Step 1: Add the `renderPreview` helper function**

Insert after line 8 (`const resolutions = {};`) inside the IIFE:

```js
/**
 * Render a preview element for a file in the duplicate modal.
 * Images: <img> via object URL. PDFs: <canvas> via PDF.js page 1.
 * Falls back to FontAwesome icon on error.
 */
async function renderPreview(letter, filename) {
    const exhibits = ExhibitManager.getExhibits();
    const files = exhibits[letter] || [];
    const entry = files.find(f => f.name === filename);

    if (!entry || !entry.file) {
        return createFallbackIcon(filename);
    }

    const ext = filename.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'].includes(ext);

    try {
        if (isImage) {
            const img = document.createElement('img');
            img.className = 'duplicate-preview-img';
            img.alt = filename;
            img.src = URL.createObjectURL(entry.file);
            return img;
        } else {
            // PDF — render page 1 via PDF.js
            const arrayBuffer = await entry.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1 });
            const scale = 400 / viewport.width; // target ~400px wide
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.className = 'duplicate-preview-canvas';
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: scaledViewport,
            }).promise;

            return canvas;
        }
    } catch (err) {
        console.warn(`Preview failed for ${filename}:`, err);
        return createFallbackIcon(filename);
    }
}

function createFallbackIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'].includes(ext);
    const icon = document.createElement('i');
    icon.className = `fas ${isImage ? 'fa-file-image' : 'fa-file-pdf'}`;
    icon.style.cssText = 'font-size:2rem;color:#999;';
    return icon;
}
```

**Step 2: Verify no syntax errors**

Open `forms/exhibits/index.html` in browser, open console, confirm no JS errors on page load.

**Step 3: Commit**

```bash
git add forms/exhibits/js/duplicate-ui.js
git commit -m "feat(exhibits): add async preview renderer for duplicate modal"
```

---

### Task 2: Refactor renderPairs to show previews and wire up card marking

**Files:**
- Modify: `forms/exhibits/js/duplicate-ui.js:48-110` (replace `renderPairs` function entirely)

**Step 1: Replace the `renderPairs` function**

Replace the existing `renderPairs()` (lines 48-110) with:

```js
function renderPairs() {
    const container = document.getElementById('duplicate-pairs');
    container.innerHTML = '';

    for (const [letter, pairs] of Object.entries(currentReport)) {
        pairs.forEach((pair, idx) => {
            const card = document.createElement('div');
            card.className = 'duplicate-pair-card';

            const badgeClass = pair.matchType === 'EXACT_DUPLICATE' ? 'exact' : 'similar';
            const badgeText = pair.matchType === 'EXACT_DUPLICATE'
                ? 'Exact Duplicate'
                : pair.matchType === 'VISUAL_MATCH'
                    ? `Visual Match (${pair.confidence}%)`
                    : `Content Match (${pair.confidence}%)`;

            // Build card shell with loading spinners as placeholders
            card.innerHTML = `
                <div class="duplicate-pair-header">
                    <span>Exhibit ${letter}:</span>
                    <span class="duplicate-badge ${badgeClass}">
                        <i class="fas ${pair.matchType === 'EXACT_DUPLICATE' ? 'fa-copy' : 'fa-eye'}"></i>
                        ${badgeText}
                    </span>
                </div>
                <div class="duplicate-pair-files">
                    <div class="duplicate-file-card marked-keep" id="file-card-${letter}-${idx}-1">
                        <div class="duplicate-preview">
                            <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#999;"></i>
                        </div>
                        <div class="file-name">${pair.file1}</div>
                    </div>
                    <div class="duplicate-file-card marked-keep" id="file-card-${letter}-${idx}-2">
                        <div class="duplicate-preview">
                            <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#999;"></i>
                        </div>
                        <div class="file-name">${pair.file2}</div>
                    </div>
                </div>
                <div class="duplicate-actions" id="actions-${letter}-${idx}">
                    <button data-action="keep_both" class="selected">Keep Both</button>
                    <button data-action="remove_file1">Remove ${pair.file1}</button>
                    <button data-action="remove_file2">Remove ${pair.file2}</button>
                </div>
            `;

            // Action button handlers with card marking
            const file1Card = card.querySelector(`#file-card-${letter}-${idx}-1`);
            const file2Card = card.querySelector(`#file-card-${letter}-${idx}-2`);
            const actionsEl = card.querySelector('.duplicate-actions');

            actionsEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    actionsEl.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    resolutions[letter][idx].action = btn.dataset.action;

                    // Update card marking
                    file1Card.classList.remove('marked-keep', 'marked-remove');
                    file2Card.classList.remove('marked-keep', 'marked-remove');

                    switch (btn.dataset.action) {
                        case 'keep_both':
                            file1Card.classList.add('marked-keep');
                            file2Card.classList.add('marked-keep');
                            break;
                        case 'remove_file1':
                            file1Card.classList.add('marked-remove');
                            file2Card.classList.add('marked-keep');
                            break;
                        case 'remove_file2':
                            file1Card.classList.add('marked-keep');
                            file2Card.classList.add('marked-remove');
                            break;
                    }

                    updateFileCount();
                });
            });

            container.appendChild(card);

            // Async: load previews and replace spinners
            const preview1 = card.querySelector(`#file-card-${letter}-${idx}-1 .duplicate-preview`);
            const preview2 = card.querySelector(`#file-card-${letter}-${idx}-2 .duplicate-preview`);

            renderPreview(letter, pair.file1).then(el => {
                preview1.innerHTML = '';
                preview1.appendChild(el);
            });
            renderPreview(letter, pair.file2).then(el => {
                preview2.innerHTML = '';
                preview2.appendChild(el);
            });
        });
    }
}
```

**Step 2: Test manually**

1. Open exhibit collector in browser
2. Upload two identical image files to Exhibit A
3. Click "Generate Exhibit Package"
4. Verify: duplicate modal shows with actual image thumbnails (not just icons)
5. Verify: both cards start with green border (`.marked-keep`)
6. Click "Remove [file1]" → file1 card dims (red border, 0.55 opacity), file2 stays green
7. Click "Keep Both" → both cards return to green border
8. Click "Continue" → modal closes, processing resumes

**Step 3: Test with PDF files**

1. Upload two identical PDF files to Exhibit A
2. Generate → duplicate modal should show first page of each PDF rendered on a canvas
3. Verify canvas is readable and not distorted

**Step 4: Commit**

```bash
git add forms/exhibits/js/duplicate-ui.js
git commit -m "feat(exhibits): show image/PDF previews in duplicate modal with visual feedback"
```

---

### Task 3: Add loading spinner CSS for preview placeholders

**Files:**
- Modify: `forms/exhibits/styles.css` (after `.duplicate-preview-canvas` block, ~line 735)

**Step 1: Add spinner styling for the preview container**

Insert after line 735 (after `.duplicate-preview-canvas` block):

```css
.duplicate-preview .fa-spinner {
    color: var(--secondary-teal);
}
```

This is minimal — the existing `.duplicate-preview` already has `display: flex; align-items: center; justify-content: center;` which centers the spinner. The FA spin animation is built into FontAwesome.

**Step 2: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "style(exhibits): add spinner color for duplicate preview loading state"
```

---

### Task 4: Bump cache-bust version in HTML script tags

**Files:**
- Modify: `forms/exhibits/index.html:131` (duplicate-ui.js script tag)

**Step 1: Bump the version query parameter**

Change line 131 from:
```html
<script src="js/duplicate-ui.js?v=9"></script>
```
to:
```html
<script src="js/duplicate-ui.js?v=10"></script>
```

**Step 2: Commit**

```bash
git add forms/exhibits/index.html
git commit -m "chore(exhibits): bump duplicate-ui.js cache version"
```

---

### Task 5: End-to-end manual smoke test

**Step 1: Test with images**

1. Open exhibit collector at `http://localhost:3000/forms/exhibits/`
2. Upload two identical PNG/JPG files into Exhibit A
3. Click "Generate Exhibit Package"
4. Confirm: progress overlay shows, then duplicate modal appears
5. Confirm: both file cards show actual image previews (not icons)
6. Confirm: both cards have green borders initially
7. Click "Remove [filename]" → one card dims with red border
8. Click "Continue" → modal closes, PDF generates

**Step 2: Test with PDFs**

1. Upload two identical PDF files into Exhibit A
2. Generate → confirm first page of each PDF renders as canvas preview
3. Verify the canvas is not blank and renders at a readable size

**Step 3: Test mixed files**

1. Upload one image and one PDF that are NOT duplicates
2. Generate → confirm no duplicate modal appears (they won't match)
3. Upload two copies of a PDF → confirm modal shows with PDF previews

**Step 4: Test error fallback**

1. If you can trigger a corrupted file scenario, verify it falls back to the FontAwesome icon gracefully

**Step 5: Commit any fixes found during testing**

If any issues found, fix and commit with descriptive message.

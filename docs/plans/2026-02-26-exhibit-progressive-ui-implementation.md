# Exhibit Progressive UI & Gap Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the exhibit collector to show exhibits progressively (A first, add more on demand), validate required fields, and detect/resolve exhibit gaps.

**Architecture:** Client-side only changes. `ExhibitManager` refactored from bulk A-Z rendering to incremental card creation. New `GapDetector` module handles real-time warnings and submit-time modal. No backend changes.

**Tech Stack:** Vanilla JS (IIFE modules), HTML, CSS. No new dependencies.

---

### Task 1: HTML — Required Fields & Add Exhibit Button

**Files:**
- Modify: `forms/exhibits/index.html:22-46`

**Step 1: Update Case Info section to make fields required**

Replace lines 26-35 of `index.html` with:

```html
        <div class="form-row">
            <div class="form-group flex-2">
                <label for="case-name">Case Name / Number <span class="required">*</span></label>
                <input type="text" id="case-name" placeholder="e.g., Smith v. Jones, Case #2026-CV-1234" required>
                <span class="field-error" id="case-name-error"></span>
            </div>
        </div>
        <div class="form-group">
            <label for="case-description">Exhibit Description <span class="required">*</span></label>
            <textarea id="case-description" rows="2" placeholder="Brief description of exhibits..." required></textarea>
            <span class="field-error" id="case-description-error"></span>
        </div>
```

**Step 2: Add "Add Exhibit" button below the exhibit grid**

Replace lines 43-45 of `index.html` (the `#exhibit-grid` div and its comment) with:

```html
        <div id="exhibit-grid">
            <!-- Exhibit cards rendered progressively by JS -->
        </div>
        <button type="button" id="btn-add-exhibit" class="btn-add-exhibit">
            <i class="fas fa-plus"></i> <span id="add-exhibit-label">Add Exhibit B</span>
        </button>
```

**Step 3: Add gap-detector.js script tag before form-submission.js**

Insert after line 103 (`duplicate-ui.js` script tag):

```html
<script src="js/gap-detector.js?v=7"></script>
```

Also bump all other script version params from `v=6` to `v=7`.

**Step 4: Add the gap resolution modal markup**

Insert after the duplicate modal closing `</div>` (after line 92), before the PDF.js script:

```html
<!-- Gap Resolution Modal -->
<div id="gap-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content gap-modal-content">
        <div class="modal-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Empty Exhibits Detected</h3>
            <p class="modal-subtitle" id="gap-modal-message">Some exhibits are empty between exhibits that have files.</p>
        </div>
        <div id="gap-list" class="gap-list">
            <!-- Gap items rendered by JS -->
        </div>
        <div class="modal-footer">
            <button type="button" id="btn-collapse-gaps" class="btn-collapse-gaps">
                <i class="fas fa-compress-arrows-alt"></i> Collapse Gaps
            </button>
            <button type="button" id="btn-continue-gaps" class="btn-submit">
                <i class="fas fa-arrow-right"></i> Continue Anyway
            </button>
        </div>
    </div>
</div>
```

**Step 5: Commit**

```bash
git add forms/exhibits/index.html
git commit -m "feat: add required fields, add-exhibit button, and gap modal markup"
```

---

### Task 2: CSS — Required Fields, Add Button, Gap Warning Styles

**Files:**
- Modify: `forms/exhibits/styles.css` (append new rules at end, before responsive section)

**Step 1: Add required field and validation error styles**

Insert before the `/* === RESPONSIVE === */` comment (line 744):

```css
/* === REQUIRED FIELDS === */

.required {
    color: var(--error-color);
    font-weight: 700;
}

.field-error {
    display: block;
    color: var(--error-color);
    font-size: 0.85rem;
    margin-top: 4px;
    min-height: 1.2em;
}

input.input-error,
textarea.input-error {
    border-color: var(--error-color);
}

input.input-error:focus,
textarea.input-error:focus {
    border-color: var(--error-color);
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
}
```

**Step 2: Add "Add Exhibit" button styles**

```css
/* === ADD EXHIBIT BUTTON === */

.btn-add-exhibit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    margin-top: 12px;
    border: 2px dashed #C0C8D0;
    border-radius: 8px;
    background: transparent;
    color: #666;
    font-size: 1rem;
    font-weight: 600;
    font-family: 'Open Sans', sans-serif;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.btn-add-exhibit:hover {
    border-color: var(--secondary-teal);
    color: var(--secondary-teal);
    background: rgba(0, 174, 239, 0.05);
}

.btn-add-exhibit:disabled {
    display: none;
}
```

**Step 3: Add gap warning banner styles**

```css
/* === GAP WARNING === */

.exhibit-card.gap-warning {
    border-color: var(--warning-color);
    background: rgba(240, 173, 78, 0.05);
}

.gap-warning-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(240, 173, 78, 0.12);
    border-bottom: 1px solid rgba(240, 173, 78, 0.3);
    color: #856404;
    font-size: 0.85rem;
    font-weight: 500;
}

.gap-warning-banner i {
    color: var(--warning-color);
    font-size: 1rem;
    flex-shrink: 0;
}
```

**Step 4: Add gap resolution modal styles**

```css
/* === GAP RESOLUTION MODAL === */

.gap-modal-content {
    background: white;
    border-radius: 12px;
    max-width: 550px;
    width: 95%;
    max-height: 85vh;
    overflow-y: auto;
}

.gap-list {
    padding: 16px 24px;
}

.gap-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(240, 173, 78, 0.1);
    border: 1px solid rgba(240, 173, 78, 0.3);
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: #856404;
}

.gap-item i {
    color: var(--warning-color);
    flex-shrink: 0;
}

.btn-collapse-gaps {
    padding: 10px 24px;
    border: 2px solid var(--warning-color);
    border-radius: 6px;
    background: transparent;
    color: #856404;
    font-size: 1rem;
    font-weight: 600;
    font-family: 'Open Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

.btn-collapse-gaps:hover {
    background: var(--warning-color);
    color: white;
}
```

**Step 5: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "feat: add styles for required fields, add-exhibit button, gap warnings, and gap modal"
```

---

### Task 3: Refactor ExhibitManager — Progressive Rendering

**Files:**
- Modify: `forms/exhibits/js/exhibit-manager.js` (full rewrite of init/renderGrid, new methods)

**Step 1: Replace the module internals**

Replace the entire contents of `exhibit-manager.js` with:

```javascript
/**
 * Exhibit Manager
 * Manages exhibit cards progressively (starts with A, user adds more).
 * File state, drag-and-drop, and UI rendering.
 */

const ExhibitManager = (() => {
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const exhibits = {}; // { A: [{ file, name, size, type }], B: [...], ... }
    const renderedLetters = []; // tracks which letters have cards in the DOM
    let sessionId = null;

    function init() {
        sessionId = crypto.randomUUID();
        LETTERS.forEach(letter => {
            exhibits[letter] = [];
        });

        // Render only Exhibit A, expanded
        addExhibitCard('A');
        expandCard('A');
        updateAddButton();
        updateGenerateButton();
    }

    function getSessionId() {
        return sessionId;
    }

    function getExhibits() {
        return exhibits;
    }

    function getActiveExhibits() {
        return LETTERS.filter(l => exhibits[l].length > 0);
    }

    function getRenderedLetters() {
        return [...renderedLetters];
    }

    /**
     * Create and append a single exhibit card for the given letter.
     */
    function addExhibitCard(letter) {
        if (renderedLetters.includes(letter)) return;

        const grid = document.getElementById('exhibit-grid');
        const card = document.createElement('div');
        card.className = 'exhibit-card';
        card.id = `exhibit-${letter}`;
        card.innerHTML = `
            <div class="exhibit-card-header" data-letter="${letter}">
                <div class="letter-badge">${letter}</div>
                <span class="exhibit-card-title">Exhibit ${letter}</span>
                <span class="file-count-badge" id="badge-${letter}">0</span>
                <span class="duplicate-badges" id="dup-badges-${letter}"></span>
                <i class="fas fa-chevron-down exhibit-card-chevron"></i>
            </div>
            <div class="exhibit-card-body">
                <input type="text" class="exhibit-label-input"
                       id="label-${letter}"
                       placeholder="Exhibit description (e.g., Lease Agreement)">
                <div class="drop-zone" id="drop-${letter}">
                    <div class="drop-zone-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                    <p class="drop-zone-text">Drag files here or <strong>browse</strong></p>
                    <input type="file" id="file-input-${letter}"
                           multiple
                           accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.heic">
                </div>
                <div class="file-list" id="files-${letter}"></div>
            </div>
        `;
        grid.appendChild(card);
        renderedLetters.push(letter);

        // Header click → expand/collapse
        const header = card.querySelector('.exhibit-card-header');
        header.addEventListener('click', () => toggleCard(letter));

        // Drop zone events
        const dropZone = card.querySelector('.drop-zone');
        const fileInput = card.querySelector(`#file-input-${letter}`);

        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            addFiles(letter, files);
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            addFiles(letter, files);
            e.target.value = ''; // reset for re-upload
        });
    }

    /**
     * Add the next exhibit letter card. Called by the "Add Exhibit" button.
     */
    function addNextExhibit() {
        const nextIndex = renderedLetters.length;
        if (nextIndex >= LETTERS.length) return;

        const letter = LETTERS[nextIndex];
        addExhibitCard(letter);
        expandCard(letter);
        updateAddButton();

        // Scroll the new card into view
        const card = document.getElementById(`exhibit-${letter}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Update the "Add Exhibit" button label and disabled state.
     */
    function updateAddButton() {
        const btn = document.getElementById('btn-add-exhibit');
        if (!btn) return;

        const nextIndex = renderedLetters.length;
        if (nextIndex >= LETTERS.length) {
            btn.disabled = true;
            return;
        }

        btn.disabled = false;
        const nextLetter = LETTERS[nextIndex];
        document.getElementById('add-exhibit-label').textContent = `Add Exhibit ${nextLetter}`;
    }

    function toggleCard(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
        card.classList.toggle('expanded');
    }

    function expandCard(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
        if (card && !card.classList.contains('expanded')) {
            card.classList.add('expanded');
        }
    }

    function addFiles(letter, fileList) {
        const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'];

        for (const file of fileList) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowed.includes(ext)) {
                alert(`Unsupported file type: .${ext}`);
                continue;
            }
            exhibits[letter].push({
                file: file,
                name: file.name,
                size: file.size,
                type: ext === 'tif' ? 'tiff' : ext,
            });
        }

        expandCard(letter);
        updateCardUI(letter);
        updateGenerateButton();
        updateSummary();

        // Trigger real-time gap detection
        if (typeof GapDetector !== 'undefined') {
            GapDetector.checkRealTime();
        }
    }

    function removeFile(letter, index) {
        exhibits[letter].splice(index, 1);
        updateCardUI(letter);
        updateGenerateButton();
        updateSummary();

        // Trigger real-time gap detection
        if (typeof GapDetector !== 'undefined') {
            GapDetector.checkRealTime();
        }
    }

    function updateCardUI(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
        if (!card) return;
        const badge = document.getElementById(`badge-${letter}`);
        const fileListEl = document.getElementById(`files-${letter}`);
        const count = exhibits[letter].length;

        // Active state
        if (count > 0) {
            card.classList.add('active');
            badge.textContent = count;
            badge.classList.add('visible');
        } else {
            card.classList.remove('active');
            badge.classList.remove('visible');
        }

        // Render file list
        fileListEl.innerHTML = '';
        exhibits[letter].forEach((fileEntry, idx) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'heic'].includes(fileEntry.type);
            let thumbHtml;
            if (isImage && fileEntry.file) {
                const url = URL.createObjectURL(fileEntry.file);
                thumbHtml = `<div class="file-thumb"><img src="${url}" alt="${fileEntry.name}"></div>`;
            } else {
                thumbHtml = `<div class="file-thumb"><i class="fas fa-file-pdf"></i></div>`;
            }

            item.innerHTML = `
                ${thumbHtml}
                <div class="file-info">
                    <div class="file-name">${fileEntry.name}</div>
                    <div class="file-size">${formatSize(fileEntry.size)}</div>
                </div>
                <button class="file-remove" data-letter="${letter}" data-index="${idx}" title="Remove">
                    <i class="fas fa-times"></i> Remove
                </button>
            `;

            const removeBtn = item.querySelector('.file-remove');
            removeBtn.addEventListener('click', () => removeFile(letter, idx));

            fileListEl.appendChild(item);
        });
    }

    function updateGenerateButton() {
        const btn = document.getElementById('btn-generate');
        const hasFiles = LETTERS.some(l => exhibits[l].length > 0);
        btn.disabled = !hasFiles;
    }

    function updateSummary() {
        const summaryEl = document.getElementById('exhibit-summary');
        const active = getActiveExhibits();

        if (active.length === 0) {
            summaryEl.style.display = 'none';
            return;
        }

        summaryEl.style.display = 'block';
        const totalFiles = active.reduce((sum, l) => sum + exhibits[l].length, 0);

        summaryEl.innerHTML = `
            <h3><i class="fas fa-list-check"></i> Package Summary: ${active.length} exhibit(s), ${totalFiles} file(s)</h3>
            <ul class="exhibit-summary-list">
                ${active.map(l => `
                    <li class="exhibit-summary-item">
                        ${l} (${exhibits[l].length} file${exhibits[l].length !== 1 ? 's' : ''})
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Collapse gaps: shift exhibits to fill empty slots.
     * Returns the list of letters that were moved (for UI feedback).
     */
    function collapseGaps() {
        const rendered = getRenderedLetters();
        const nonEmpty = rendered.filter(l => exhibits[l].length > 0);

        // Build new mapping: nonEmpty[0] → rendered[0], nonEmpty[1] → rendered[1], etc.
        const moves = [];
        for (let i = 0; i < nonEmpty.length; i++) {
            const targetLetter = LETTERS[i];
            const sourceLetter = nonEmpty[i];
            if (sourceLetter !== targetLetter) {
                moves.push({ from: sourceLetter, to: targetLetter });
            }
        }

        if (moves.length === 0) return [];

        // Collect all data first (files, labels)
        const fileData = {};
        const labelData = {};
        for (const letter of rendered) {
            fileData[letter] = [...exhibits[letter]];
            const labelEl = document.getElementById(`label-${letter}`);
            labelData[letter] = labelEl ? labelEl.value : '';
        }

        // Clear all rendered exhibits
        for (const letter of rendered) {
            exhibits[letter] = [];
        }

        // Place non-empty exhibits into sequential slots
        for (let i = 0; i < nonEmpty.length; i++) {
            const targetLetter = LETTERS[i];
            const sourceLetter = nonEmpty[i];
            exhibits[targetLetter] = fileData[sourceLetter];

            const labelEl = document.getElementById(`label-${targetLetter}`);
            if (labelEl) {
                labelEl.value = labelData[sourceLetter];
            }
        }

        // Clear labels on now-empty slots
        for (let i = nonEmpty.length; i < rendered.length; i++) {
            const letter = rendered[i];
            const labelEl = document.getElementById(`label-${letter}`);
            if (labelEl) labelEl.value = '';
        }

        // Remove trailing empty cards from DOM
        const keepCount = nonEmpty.length;
        while (renderedLetters.length > keepCount) {
            const removeLetter = renderedLetters.pop();
            const card = document.getElementById(`exhibit-${removeLetter}`);
            if (card) card.remove();
        }

        // Update UI for all remaining cards
        for (const letter of renderedLetters) {
            updateCardUI(letter);
        }

        updateAddButton();
        updateGenerateButton();
        updateSummary();

        return moves;
    }

    function clearAll() {
        LETTERS.forEach(letter => {
            exhibits[letter] = [];
        });
        // Remove all cards except A
        while (renderedLetters.length > 1) {
            const removeLetter = renderedLetters.pop();
            const card = document.getElementById(`exhibit-${removeLetter}`);
            if (card) card.remove();
        }
        updateCardUI('A');
        updateAddButton();
        updateGenerateButton();
        updateSummary();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            // Wire up "Add Exhibit" button
            const addBtn = document.getElementById('btn-add-exhibit');
            if (addBtn) addBtn.addEventListener('click', addNextExhibit);
        });
    } else {
        init();
        const addBtn = document.getElementById('btn-add-exhibit');
        if (addBtn) addBtn.addEventListener('click', addNextExhibit);
    }

    return {
        getSessionId,
        getExhibits,
        getActiveExhibits,
        getRenderedLetters,
        addFiles,
        addNextExhibit,
        addExhibitCard,
        removeFile,
        collapseGaps,
        clearAll,
        expandCard,
        updateCardUI,
        updateAddButton,
        updateGenerateButton,
        updateSummary,
    };
})();
```

**Step 2: Verify page loads with only Exhibit A visible**

Open `http://localhost:3000/exhibits` in browser. Confirm:
- Only Exhibit A card visible, expanded
- "Add Exhibit B" button visible below
- Clicking button adds Exhibit B, auto-expands, scrolls into view
- Button updates to "Add Exhibit C"

**Step 3: Commit**

```bash
git add forms/exhibits/js/exhibit-manager.js
git commit -m "feat: refactor exhibit manager for progressive rendering with add-exhibit button"
```

---

### Task 4: Create GapDetector Module

**Files:**
- Create: `forms/exhibits/js/gap-detector.js`

**Step 1: Write the gap detector module**

```javascript
/**
 * Gap Detector Module
 * Detects empty exhibits between non-empty ones (gaps).
 * Provides real-time warnings and submit-time modal with collapse option.
 */

const GapDetector = (() => {

    /**
     * Find gaps among rendered exhibits.
     * A gap is a rendered exhibit with 0 files that sits between
     * two exhibits (before and after) that have files.
     * @returns {string[]} Array of gap letters (e.g., ['B', 'E'])
     */
    function findGaps() {
        const rendered = ExhibitManager.getRenderedLetters();
        const exhibits = ExhibitManager.getExhibits();
        const gaps = [];

        // Find the last exhibit with files
        let lastWithFiles = -1;
        for (let i = rendered.length - 1; i >= 0; i--) {
            if (exhibits[rendered[i]].length > 0) {
                lastWithFiles = i;
                break;
            }
        }

        if (lastWithFiles <= 0) return gaps; // No gaps possible

        // Find the first exhibit with files
        let firstWithFiles = -1;
        for (let i = 0; i < rendered.length; i++) {
            if (exhibits[rendered[i]].length > 0) {
                firstWithFiles = i;
                break;
            }
        }

        // Any empty exhibit between firstWithFiles and lastWithFiles is a gap
        for (let i = firstWithFiles + 1; i < lastWithFiles; i++) {
            if (exhibits[rendered[i]].length === 0) {
                gaps.push(rendered[i]);
            }
        }

        return gaps;
    }

    /**
     * Real-time gap check: add/remove warning banners on exhibit cards.
     */
    function checkRealTime() {
        const rendered = ExhibitManager.getRenderedLetters();
        const gaps = findGaps();

        // Clear all existing warnings
        for (const letter of rendered) {
            const card = document.getElementById(`exhibit-${letter}`);
            if (!card) continue;
            card.classList.remove('gap-warning');
            const existing = card.querySelector('.gap-warning-banner');
            if (existing) existing.remove();
        }

        // Add warnings to gap exhibits
        for (const letter of gaps) {
            const card = document.getElementById(`exhibit-${letter}`);
            if (!card) continue;
            card.classList.add('gap-warning');

            const banner = document.createElement('div');
            banner.className = 'gap-warning-banner';
            banner.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Exhibit ${letter} is empty — exhibits before and after it have files.</span>
            `;

            // Insert banner after header, before body
            const header = card.querySelector('.exhibit-card-header');
            header.insertAdjacentElement('afterend', banner);
        }
    }

    /**
     * Submit-time gap check. If gaps found, shows modal and returns a Promise.
     * Resolves with 'collapse' | 'continue' | 'none' (no gaps).
     */
    function checkOnSubmit() {
        const gaps = findGaps();
        if (gaps.length === 0) return Promise.resolve('none');

        return new Promise((resolve) => {
            const modal = document.getElementById('gap-modal');
            const listEl = document.getElementById('gap-list');
            const msgEl = document.getElementById('gap-modal-message');

            // Populate message
            const gapLabels = gaps.map(l => `Exhibit ${l}`).join(', ');
            msgEl.textContent = `${gapLabels} ${gaps.length === 1 ? 'is' : 'are'} empty but ${gaps.length === 1 ? 'has exhibits' : 'have exhibits'} with files before and after.`;

            // Populate gap list
            listEl.innerHTML = '';
            for (const letter of gaps) {
                const item = document.createElement('div');
                item.className = 'gap-item';
                item.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Exhibit ${letter} — no files attached</span>
                `;
                listEl.appendChild(item);
            }

            modal.style.display = 'flex';

            const collapseBtn = document.getElementById('btn-collapse-gaps');
            const continueBtn = document.getElementById('btn-continue-gaps');

            const cleanup = () => {
                modal.style.display = 'none';
                collapseBtn.removeEventListener('click', handleCollapse);
                continueBtn.removeEventListener('click', handleContinue);
            };

            const handleCollapse = () => {
                cleanup();
                ExhibitManager.collapseGaps();
                checkRealTime(); // Re-check (should be clean now)
                resolve('collapse');
            };

            const handleContinue = () => {
                cleanup();
                resolve('continue');
            };

            collapseBtn.addEventListener('click', handleCollapse);
            continueBtn.addEventListener('click', handleContinue);
        });
    }

    return {
        findGaps,
        checkRealTime,
        checkOnSubmit,
    };
})();
```

**Step 2: Verify gap detection in browser**

1. Open page, add Exhibit B and C
2. Upload a file to A and C (skip B)
3. Confirm amber warning banner appears on Exhibit B
4. Upload a file to B — warning should disappear

**Step 3: Commit**

```bash
git add forms/exhibits/js/gap-detector.js
git commit -m "feat: add gap detector module with real-time warnings and submit-time modal"
```

---

### Task 5: Update FormSubmission — Required Validation & Gap Check

**Files:**
- Modify: `forms/exhibits/js/form-submission.js:8-59`

**Step 1: Replace the init and handleGenerate functions**

Replace the entire contents of `form-submission.js` with:

```javascript
/**
 * Form Submission Module
 * Orchestrates: validate → gap check → upload all files → generate → SSE progress → duplicate resolution → download.
 */

const FormSubmission = (() => {

    function init() {
        const btn = document.getElementById('btn-generate');
        btn.addEventListener('click', handleGenerate);

        // Blur validation for required fields
        const caseName = document.getElementById('case-name');
        const caseDesc = document.getElementById('case-description');

        caseName.addEventListener('blur', () => validateField(caseName, 'case-name-error'));
        caseDesc.addEventListener('blur', () => validateField(caseDesc, 'case-description-error'));

        // Clear error on input
        caseName.addEventListener('input', () => clearFieldError(caseName, 'case-name-error'));
        caseDesc.addEventListener('input', () => clearFieldError(caseDesc, 'case-description-error'));
    }

    /**
     * Validate a required field. Returns true if valid.
     */
    function validateField(inputEl, errorId) {
        const value = inputEl.value.trim();
        const errorEl = document.getElementById(errorId);
        if (!value) {
            inputEl.classList.add('input-error');
            errorEl.textContent = 'This field is required.';
            return false;
        }
        inputEl.classList.remove('input-error');
        errorEl.textContent = '';
        return true;
    }

    function clearFieldError(inputEl, errorId) {
        if (inputEl.value.trim()) {
            inputEl.classList.remove('input-error');
            document.getElementById(errorId).textContent = '';
        }
    }

    /**
     * Validate all required fields. Returns true if all valid.
     */
    function validateRequiredFields() {
        const caseName = document.getElementById('case-name');
        const caseDesc = document.getElementById('case-description');

        const nameValid = validateField(caseName, 'case-name-error');
        const descValid = validateField(caseDesc, 'case-description-error');

        if (!nameValid) {
            caseName.focus();
            caseName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (!descValid) {
            caseDesc.focus();
            caseDesc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return nameValid && descValid;
    }

    async function handleGenerate() {
        // Step 1: Validate required fields
        if (!validateRequiredFields()) return;

        const btn = document.getElementById('btn-generate');
        btn.disabled = true;

        // Step 2: Gap detection
        if (typeof GapDetector !== 'undefined') {
            const gapResult = await GapDetector.checkOnSubmit();
            if (gapResult === 'collapse') {
                // Gaps were collapsed — re-enable button, let user review and re-submit
                btn.disabled = false;
                return;
            }
            // 'continue' or 'none' — proceed with generation
        }

        const sessionId = ExhibitManager.getSessionId();
        const caseName = document.getElementById('case-name').value.trim();
        const exhibits = ExhibitManager.getExhibits();

        try {
            // Phase 1: Upload all files to server
            showProgress('Uploading Files', 0, 'Preparing uploads...');

            const activeLetters = ExhibitManager.getActiveExhibits();
            let uploadCount = 0;

            await FileUploader.uploadAllExhibits(sessionId, exhibits, (letter, status) => {
                if (status === 'done') {
                    uploadCount++;
                    const pct = Math.round((uploadCount / activeLetters.length) * 20);
                    updateProgress(pct, `Uploaded Exhibit ${letter}...`);
                }
            });

            updateProgress(20, 'All files uploaded. Starting generation...');

            // Phase 2: Trigger generation
            const genResponse = await fetch('/api/exhibits/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, caseName }),
            });

            if (!genResponse.ok) {
                const err = await genResponse.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start generation');
            }

            const { jobId } = await genResponse.json();

            // Phase 3: Connect SSE for progress
            await connectSSE(jobId);

        } catch (error) {
            hideProgress();
            alert(`Error: ${error.message}`);
            btn.disabled = false;
        }
    }

    function connectSSE(jobId) {
        return new Promise((resolve, reject) => {
            const evtSource = new EventSource(`/api/exhibits/jobs/${jobId}/stream`);

            evtSource.addEventListener('progress', (e) => {
                const data = JSON.parse(e.data);
                const displayPct = 20 + Math.round(data.progress * 0.8);
                updateProgress(displayPct, data.message);
            });

            evtSource.addEventListener('duplicates', async (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();

                hideProgress();
                const resolutions = await DuplicateUI.showModal(data.duplicates);

                showProgress('Processing Exhibits', 30, 'Resuming after duplicate resolution...');

                const resolveResponse = await fetch(`/api/exhibits/jobs/${jobId}/resolve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resolutions }),
                });

                if (!resolveResponse.ok) {
                    throw new Error('Failed to resolve duplicates');
                }

                connectSSE(jobId).then(resolve).catch(reject);
            });

            evtSource.addEventListener('complete', (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();
                updateProgress(100, 'Complete! Downloading...');

                setTimeout(() => {
                    window.location.href = `/api/exhibits/jobs/${jobId}/download`;
                    hideProgress();
                    document.getElementById('btn-generate').disabled = false;
                }, 500);

                resolve();
            });

            evtSource.addEventListener('error', (e) => {
                if (evtSource.readyState === EventSource.CLOSED) return;
            });

            evtSource.addEventListener('error', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data && data.error) {
                        evtSource.close();
                        hideProgress();
                        alert(`Processing error: ${data.error}`);
                        document.getElementById('btn-generate').disabled = false;
                        reject(new Error(data.error));
                    }
                } catch {
                    // Not our JSON error event, ignore
                }
            });

            evtSource.onerror = () => {
                // Connection lost - don't reject immediately, SSE may reconnect
            };
        });
    }

    function showProgress(title, percent, message) {
        document.getElementById('progress-overlay').style.display = 'flex';
        document.getElementById('progress-title').textContent = title;
        updateProgress(percent, message);
    }

    function updateProgress(percent, message) {
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';
        if (message) {
            document.getElementById('progress-message').textContent = message;
        }
    }

    function hideProgress() {
        document.getElementById('progress-overlay').style.display = 'none';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        handleGenerate,
    };
})();
```

**Step 2: Verify validation in browser**

1. Click "Generate Exhibit Package" with empty Case Name — red border + error message appears, generation blocked
2. Fill in Case Name, leave Description empty, click Generate — Description gets error
3. Fill both, upload a file to A, upload a file to C (add B and C first), click Generate — gap modal appears with "Exhibit B" listed
4. Click "Collapse Gaps" — C's files move to B, card C removed, button re-enabled
5. Click Generate again — proceeds to upload phase

**Step 3: Commit**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat: add required field validation and gap detection to form submission flow"
```

---

### Task 6: Integration Test & Polish

**Files:**
- Review all modified files for consistency

**Step 1: Full end-to-end manual test**

1. Load page — only Exhibit A visible, expanded
2. Case Name and Description show red asterisks, no "(optional)" text
3. Click "Add Exhibit B" — B card appears, expands, scrolls into view. Button now says "Add Exhibit C"
4. Upload files to A and C (add C first via button)
5. Amber gap warning appears on B immediately
6. Click Generate with empty required fields — blocked with inline errors
7. Fill required fields, click Generate — gap modal appears listing B
8. Click "Collapse Gaps" — C's files move to B, C card removed, button updates to "Add Exhibit C"
9. Click Generate again — proceeds normally
10. Re-test: add A, B, D (skip C). Click Generate. Modal shows C. Click "Continue Anyway" — proceeds with gap intact

**Step 2: Add all 26 exhibits to verify Z cap**

Click "Add Exhibit" repeatedly until Z. Verify button disappears after Z.

**Step 3: Final commit (all files together if any tweaks needed)**

```bash
git add -A
git commit -m "feat: complete progressive exhibit UI with gap detection and required field validation"
```

---

Plan complete and saved to `docs/plans/2026-02-26-exhibit-progressive-ui-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
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
        // Delete old server session so uploads don't accumulate
        if (sessionId) {
            fetch(`/api/exhibits/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {});
        }
        // New session ID for next submission
        sessionId = crypto.randomUUID();

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

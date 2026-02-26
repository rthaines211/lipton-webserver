/**
 * Exhibit Manager
 * Manages 26 exhibit cards (A-Z), file state, drag-and-drop, and UI rendering.
 */

const ExhibitManager = (() => {
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const exhibits = {}; // { A: [{ file, name, size, type }], B: [...], ... }
    let sessionId = null;

    function init() {
        sessionId = crypto.randomUUID();
        LETTERS.forEach(letter => {
            exhibits[letter] = [];
        });
        renderGrid();
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

    function renderGrid() {
        const grid = document.getElementById('exhibit-grid');
        grid.innerHTML = '';

        LETTERS.forEach(letter => {
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
        });
    }

    function toggleCard(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
        card.classList.toggle('expanded');
    }

    function expandCard(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
        if (!card.classList.contains('expanded')) {
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
    }

    function removeFile(letter, index) {
        exhibits[letter].splice(index, 1);
        updateCardUI(letter);
        updateGenerateButton();
        updateSummary();
    }

    function updateCardUI(letter) {
        const card = document.getElementById(`exhibit-${letter}`);
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

    function clearAll() {
        LETTERS.forEach(letter => {
            exhibits[letter] = [];
            updateCardUI(letter);
        });
        updateGenerateButton();
        updateSummary();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        getSessionId,
        getExhibits,
        getActiveExhibits,
        addFiles,
        removeFile,
        clearAll,
        expandCard,
    };
})();

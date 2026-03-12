/**
 * Dropbox File Browser UI
 *
 * Provides a file explorer for browsing Dropbox and assigning files to exhibit letters.
 */
const DropboxBrowserUI = (() => {
    let currentPath = '/';
    const exhibitAssignments = new Map(); // letter -> [{dropboxPath, name}]
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const checkedFiles = new Set(); // Dropbox paths of checked files in current folder
    const thumbnailCache = new Map(); // path -> base64 data (persists across folder navigation)
    let currentEntries = []; // entries from current folder (for preview navigation)
    let thumbnailAbortController = null; // AbortController for in-flight thumbnail requests
    let lastUsedLetter = 'A'; // remembers last exhibit letter used for assignment

    function init() {
        const importBtn = document.getElementById('btn-import-dropbox');
        const refreshBtn = document.getElementById('btn-dropbox-refresh');

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('dropbox-panel').style.display = 'flex';
                importBtn.style.display = 'none';
                loadFolder('/');
                renderExhibitSlots();
                if (typeof ExhibitManager !== 'undefined') ExhibitManager.updateGenerateButton();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadFolder(currentPath, true));
        }

        const selectAllCb = document.getElementById('dropbox-select-all');
        if (selectAllCb) {
            selectAllCb.addEventListener('change', toggleSelectAll);
        }
    }

    async function loadFolder(folderPath, refresh = false) {
        currentPath = folderPath;
        const fileList = document.getElementById('dropbox-file-list');
        fileList.innerHTML = '<div class="loading-placeholder">Loading...</div>';

        try {
            const params = new URLSearchParams({ path: folderPath });
            if (refresh) params.set('refresh', 'true');

            const res = await fetch(`/api/dropbox/list?${params}`);
            const data = await res.json();

            if (!data.success) {
                fileList.innerHTML = `<div class="error">${escapeHtml(data.error)}</div>`;
                return;
            }

            renderBreadcrumb(folderPath);
            renderFileList(data.entries);
        } catch (error) {
            fileList.innerHTML = `<div class="error">Failed to load: ${escapeHtml(error.message)}</div>`;
        }
    }

    function renderBreadcrumb(folderPath) {
        const breadcrumb = document.getElementById('dropbox-breadcrumb');
        const parts = folderPath === '/' ? ['/'] : ['/', ...folderPath.split('/').filter(Boolean)];
        let accumulated = '';

        breadcrumb.innerHTML = parts.map((part, i) => {
            accumulated = i === 0 ? '/' : accumulated + '/' + part;
            const pathAttr = accumulated;
            return `<span class="breadcrumb-item" data-path="${escapeAttr(pathAttr)}">${escapeHtml(part === '/' ? 'Dropbox' : part)}</span>`;
        }).join(' / ');

        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => loadFolder(item.dataset.path));
        });
    }

    function renderFileList(entries) {
        const fileList = document.getElementById('dropbox-file-list');
        checkedFiles.clear();

        if (entries.length === 0) {
            fileList.innerHTML = '<div class="empty">Empty folder</div>';
            currentEntries = [];
            renderSelectionToolbar();
            return;
        }

        const sorted = [...entries].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        currentEntries = sorted;

        fileList.innerHTML = sorted.map((entry, index) => {
            const isFile = entry.type === 'file';
            const isSupported = isFile && entry.supported;
            const disabledClass = (isFile && !entry.supported) ? 'disabled' : '';
            const tooltip = disabledClass ? 'title="Unsupported file type"' : '';
            const draggable = isSupported ? 'draggable="true"' : '';

            const checkbox = isSupported
                ? `<input type="checkbox" class="entry-checkbox" data-path="${escapeAttr(entry.path)}">`
                : '';

            let thumbnailHtml;
            if (!isFile) {
                thumbnailHtml = '<span class="entry-icon">📁</span>';
            } else if (thumbnailCache.has(entry.path)) {
                thumbnailHtml = `<img class="thumbnail" src="data:image/jpeg;base64,${thumbnailCache.get(entry.path)}" alt="">`;
            } else {
                const ext = (entry.extension || '').toLowerCase();
                const isPdf = ext === 'pdf';
                const icon = !entry.supported ? '⚠️' : isPdf ? '📄' : '🖼️';
                thumbnailHtml = `<div class="thumbnail-placeholder" data-path="${escapeAttr(entry.path)}">${icon}</div>`;
            }

            const sizeStr = entry.size ? formatSize(entry.size) : '';

            return `
                <div class="dropbox-entry ${entry.type} ${disabledClass}" ${tooltip}
                     data-path="${escapeAttr(entry.path)}"
                     data-name="${escapeAttr(entry.name)}"
                     data-type="${entry.type}"
                     data-index="${index}"
                     ${draggable}>
                    ${checkbox}
                    ${thumbnailHtml}
                    <span class="entry-name">${escapeHtml(entry.name)}</span>
                    <span class="entry-size">${sizeStr}</span>
                </div>
            `;
        }).join('');

        // Wire folder click handlers
        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.addEventListener('click', () => loadFolder(el.dataset.path));
        });

        // Wire checkbox handlers
        fileList.querySelectorAll('.entry-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                const path = cb.dataset.path;
                const row = cb.closest('.dropbox-entry');
                if (cb.checked) {
                    checkedFiles.add(path);
                    row.classList.add('checked');
                } else {
                    checkedFiles.delete(path);
                    row.classList.remove('checked');
                }
                renderSelectionToolbar();
                updateSelectAllCheckbox();
            });
            cb.addEventListener('click', (e) => e.stopPropagation());
        });

        // Wire file click for preview modal
        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('entry-checkbox')) return;
                const index = parseInt(el.dataset.index);
                openPreviewModal(index);
            });
        });

        // Wire drag handlers (single + multi)
        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                const filePath = el.dataset.path;
                if (checkedFiles.has(filePath) && checkedFiles.size > 1) {
                    const files = [];
                    checkedFiles.forEach(p => {
                        const entry = currentEntries.find(ent => ent.path === p);
                        if (entry) files.push({ dropboxPath: entry.path, name: entry.name });
                    });
                    e.dataTransfer.setData('application/json', JSON.stringify(files));
                } else {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        dropboxPath: el.dataset.path,
                        name: el.dataset.name,
                    }));
                }
                e.dataTransfer.effectAllowed = 'copy';
            });

            el.addEventListener('dblclick', () => {
                const emptySlot = LETTERS.find(l => !exhibitAssignments.has(l) || exhibitAssignments.get(l).length === 0);
                if (emptySlot) {
                    addFileToSlot(emptySlot, { dropboxPath: el.dataset.path, name: el.dataset.name });
                }
            });
        });

        // Wire folder drag
        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    folderPath: el.dataset.path,
                    name: el.dataset.name,
                    type: 'folder',
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        renderSelectionToolbar();
        loadThumbnails(sorted);
    }

    function openPreviewModal(index) {
        // Will be implemented in Task 10
        console.log('Preview modal not yet implemented, index:', index);
    }

    function toggleSelectAll() {
        const selectAllCb = document.getElementById('dropbox-select-all');
        const checkboxes = document.querySelectorAll('#dropbox-file-list .entry-checkbox');

        if (selectAllCb.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                checkedFiles.add(cb.dataset.path);
                cb.closest('.dropbox-entry').classList.add('checked');
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
                checkedFiles.delete(cb.dataset.path);
                cb.closest('.dropbox-entry').classList.remove('checked');
            });
        }
        renderSelectionToolbar();
    }

    function updateSelectAllCheckbox() {
        const selectAllCb = document.getElementById('dropbox-select-all');
        if (!selectAllCb) return;
        const checkboxes = document.querySelectorAll('#dropbox-file-list .entry-checkbox');
        const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
        selectAllCb.checked = allChecked;
    }

    async function loadThumbnails(entries) {
        if (thumbnailAbortController) {
            thumbnailAbortController.abort();
        }
        thumbnailAbortController = new AbortController();
        const signal = thumbnailAbortController.signal;

        const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic']);
        const imageEntries = entries.filter(e =>
            e.type === 'file' && e.supported && IMAGE_EXTENSIONS.has((e.extension || '').toLowerCase())
            && !thumbnailCache.has(e.path)
        );

        if (imageEntries.length === 0) return;

        const chunks = [];
        for (let i = 0; i < imageEntries.length; i += 25) {
            chunks.push(imageEntries.slice(i, i + 25));
        }

        for (const chunk of chunks) {
            if (signal.aborted) return;

            try {
                const res = await fetch('/api/dropbox/thumbnails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paths: chunk.map(e => e.path) }),
                    signal,
                });

                if (!res.ok) continue;
                const data = await res.json();

                for (const thumb of data.thumbnails) {
                    if (thumb.data && thumb.path) {
                        thumbnailCache.set(thumb.path, thumb.data);
                        const placeholder = document.querySelector(
                            `.thumbnail-placeholder[data-path="${CSS.escape(thumb.path)}"]`
                        );
                        if (placeholder) {
                            const img = document.createElement('img');
                            img.className = 'thumbnail';
                            img.src = `data:image/jpeg;base64,${thumb.data}`;
                            img.alt = '';
                            placeholder.replaceWith(img);
                        }
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Thumbnail batch error:', err);
            }
        }
    }

    function renderSelectionToolbar() {
        const fileList = document.getElementById('dropbox-file-list');
        const existing = fileList.parentElement.querySelector('.selection-toolbar');
        if (existing) existing.remove();

        if (checkedFiles.size === 0) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'selection-toolbar';

        const letterOptions = LETTERS.map(l =>
            `<option value="${l}" ${l === lastUsedLetter ? 'selected' : ''}>Exhibit ${l}</option>`
        ).join('');

        toolbar.innerHTML = `
            <span class="selection-count">${checkedFiles.size} file${checkedFiles.size !== 1 ? 's' : ''} selected</span>
            <div class="selection-actions">
                <select class="toolbar-letter-select">${letterOptions}</select>
                <button type="button" class="btn-assign">Assign</button>
            </div>
        `;

        toolbar.querySelector('.btn-assign').addEventListener('click', () => {
            const letter = toolbar.querySelector('.toolbar-letter-select').value;
            assignCheckedFiles(letter);
        });

        toolbar.querySelector('.toolbar-letter-select').addEventListener('change', (e) => {
            lastUsedLetter = e.target.value;
        });

        fileList.after(toolbar);
    }

    function assignCheckedFiles(letter) {
        lastUsedLetter = letter;
        checkedFiles.forEach(path => {
            const entry = currentEntries.find(e => e.path === path);
            if (entry) {
                addFileToSlot(letter, { dropboxPath: entry.path, name: entry.name });
            }
        });
        checkedFiles.clear();
        document.querySelectorAll('#dropbox-file-list .dropbox-entry.checked').forEach(el => {
            el.classList.remove('checked');
        });
        document.querySelectorAll('#dropbox-file-list .entry-checkbox').forEach(cb => {
            cb.checked = false;
        });
        updateSelectAllCheckbox();
        renderSelectionToolbar();
    }

    function renderExhibitSlots() {
        const container = document.getElementById('exhibit-slots');
        container.innerHTML = LETTERS.map(letter => `
            <div class="exhibit-slot" data-letter="${letter}" id="slot-${letter}">
                <div class="slot-header">
                    <strong>Exhibit ${letter}</strong>
                    <span class="file-count" id="count-${letter}">0 files</span>
                    <button type="button" class="btn-clear-slot" data-letter="${letter}" title="Clear">✕</button>
                </div>
                <div class="slot-files" id="files-${letter}">
                    <span class="slot-placeholder">Drop files here</span>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.exhibit-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', async (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const letter = slot.dataset.letter;
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (Array.isArray(data)) {
                    for (const file of data) {
                        addFileToSlot(letter, file);
                    }
                } else if (data.type === 'folder') {
                    await addFolderToSlot(letter, data.folderPath);
                } else {
                    addFileToSlot(letter, data);
                }
            });
        });

        container.querySelectorAll('.btn-clear-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const letter = btn.dataset.letter;
                exhibitAssignments.delete(letter);
                updateSlotUI(letter);
            });
        });
    }

    function addFileToSlot(letter, file) {
        if (!exhibitAssignments.has(letter)) exhibitAssignments.set(letter, []);
        const files = exhibitAssignments.get(letter);
        if (files.some(f => f.dropboxPath === file.dropboxPath)) return;
        files.push(file);
        updateSlotUI(letter);
    }

    async function addFolderToSlot(letter, folderPath) {
        try {
            const res = await fetch(`/api/dropbox/list?path=${encodeURIComponent(folderPath)}`);
            const data = await res.json();
            if (!data.success) return;
            const supportedFiles = data.entries.filter(e => e.type === 'file' && e.supported);
            for (const entry of supportedFiles) {
                addFileToSlot(letter, { dropboxPath: entry.path, name: entry.name });
            }
        } catch (error) {
            console.error('Failed to load folder for slot:', error);
        }
    }

    function updateSlotUI(letter) {
        const files = exhibitAssignments.get(letter) || [];
        const filesEl = document.getElementById(`files-${letter}`);
        const countEl = document.getElementById(`count-${letter}`);

        countEl.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;

        if (files.length === 0) {
            filesEl.innerHTML = '<span class="slot-placeholder">Drop files here</span>';
            return;
        }

        filesEl.innerHTML = files.map((f, i) => `
            <div class="slot-file" data-index="${i}">
                <span class="file-name">${escapeHtml(f.name)}</span>
                <button type="button" class="btn-remove-file" data-letter="${letter}" data-index="${i}" title="Remove">✕</button>
            </div>
        `).join('');

        filesEl.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                files.splice(parseInt(btn.dataset.index), 1);
                updateSlotUI(letter);
            });
        });

        // Update generate button state
        if (typeof ExhibitManager !== 'undefined') ExhibitManager.updateGenerateButton();
    }

    function getExhibitMapping() {
        const mapping = {};
        for (const [letter, files] of exhibitAssignments.entries()) {
            if (files.length > 0) mapping[letter] = files;
        }
        return mapping;
    }

    function getTotalFiles() {
        let total = 0;
        for (const files of exhibitAssignments.values()) total += files.length;
        return total;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { getExhibitMapping, getTotalFiles, loadFolder };
})();

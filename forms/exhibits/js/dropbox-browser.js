/**
 * Dropbox File Browser UI
 *
 * Provides a file explorer for browsing Dropbox and assigning files to exhibit letters.
 */
const DropboxBrowserUI = (() => {
    let currentPath = '/';
    const selectedFiles = new Map(); // letter -> [{dropboxPath, name}]
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function init() {
        const importBtn = document.getElementById('btn-import-dropbox');
        const refreshBtn = document.getElementById('btn-dropbox-refresh');

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('dropbox-panel').style.display = 'flex';
                importBtn.style.display = 'none';
                loadFolder('/');
                renderExhibitSlots();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadFolder(currentPath, true));
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

        if (entries.length === 0) {
            fileList.innerHTML = '<div class="empty">Empty folder</div>';
            return;
        }

        const sorted = [...entries].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        fileList.innerHTML = sorted.map(entry => {
            const icon = entry.type === 'folder' ? '📁' :
                entry.supported ? '📄' : '⚠️';
            const sizeStr = entry.size ? formatSize(entry.size) : '';
            const disabledClass = (!entry.supported && entry.type !== 'folder') ? 'disabled' : '';
            const tooltip = disabledClass ? 'title="Unsupported file type"' : '';
            const draggable = entry.type === 'file' && entry.supported ? 'draggable="true"' : '';

            return `
                <div class="dropbox-entry ${entry.type} ${disabledClass}" ${tooltip}
                     data-path="${escapeAttr(entry.path)}"
                     data-name="${escapeAttr(entry.name)}"
                     data-type="${entry.type}"
                     ${draggable}>
                    <span class="entry-icon">${icon}</span>
                    <span class="entry-name">${escapeHtml(entry.name)}</span>
                    <span class="entry-size">${sizeStr}</span>
                </div>
            `;
        }).join('');

        fileList.querySelectorAll('.dropbox-entry.folder').forEach(el => {
            el.addEventListener('click', () => loadFolder(el.dataset.path));
        });

        fileList.querySelectorAll('.dropbox-entry.file:not(.disabled)').forEach(el => {
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    dropboxPath: el.dataset.path,
                    name: el.dataset.name,
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });

            el.addEventListener('dblclick', () => {
                const emptySlot = LETTERS.find(l => !selectedFiles.has(l) || selectedFiles.get(l).length === 0);
                if (emptySlot) {
                    addFileToSlot(emptySlot, { dropboxPath: el.dataset.path, name: el.dataset.name });
                }
            });
        });

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

                if (data.type === 'folder') {
                    await addFolderToSlot(letter, data.folderPath);
                } else {
                    addFileToSlot(letter, data);
                }
            });
        });

        container.querySelectorAll('.btn-clear-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const letter = btn.dataset.letter;
                selectedFiles.delete(letter);
                updateSlotUI(letter);
            });
        });
    }

    function addFileToSlot(letter, file) {
        if (!selectedFiles.has(letter)) selectedFiles.set(letter, []);
        const files = selectedFiles.get(letter);
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
        const files = selectedFiles.get(letter) || [];
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
    }

    function getExhibitMapping() {
        const mapping = {};
        for (const [letter, files] of selectedFiles.entries()) {
            if (files.length > 0) mapping[letter] = files;
        }
        return mapping;
    }

    function getTotalFiles() {
        let total = 0;
        for (const files of selectedFiles.values()) total += files.length;
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

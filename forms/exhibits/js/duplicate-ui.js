const DuplicateUI = (() => {
    let currentReport = null;
    const resolutions = {}; // { letter: [{ groupId, keep: [], remove: [] }] }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderPreview(filename, serverThumbnail) {
        if (serverThumbnail) {
            const img = document.createElement('img');
            img.src = serverThumbnail;
            img.className = 'duplicate-preview-img';
            img.alt = filename;
            return img;
        }
        const ext = filename.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'].includes(ext);
        const icon = document.createElement('i');
        icon.className = `fas ${isImage ? 'fa-file-image' : 'fa-file-pdf'}`;
        icon.style.cssText = 'font-size:2rem;color:#999;';
        return icon;
    }

    function showModal(report) {
        currentReport = report;

        // Initialize resolutions from groups
        for (const [letter, groups] of Object.entries(report)) {
            resolutions[letter] = groups.map(group => ({
                groupId: group.groupId,
                keep: [group.defaultKeep],
                remove: group.files.filter(f => f !== group.defaultKeep),
            }));
        }

        renderGroups();
        updateFileCount();

        const modal = document.getElementById('duplicate-modal');
        modal.style.display = 'flex';
        addInlineBadges(report);

        return new Promise((resolve) => {
            const btn = document.getElementById('btn-resolve-continue');
            const handler = () => {
                btn.removeEventListener('click', handler);
                modal.style.display = 'none';
                clearInlineBadges();
                resolve(resolutions);
            };
            btn.addEventListener('click', handler);
        });
    }

    function renderGroups() {
        const container = document.getElementById('duplicate-pairs');
        container.innerHTML = '';

        for (const [letter, groups] of Object.entries(currentReport)) {
            groups.forEach((group, groupIdx) => {
                const card = document.createElement('div');
                card.className = 'duplicate-pair-card';
                card.dataset.groupIdx = groupIdx;
                card.dataset.letter = letter;

                // Header
                const header = document.createElement('div');
                header.className = 'duplicate-pair-header';
                header.innerHTML = `
                    <span>Exhibit ${escapeHtml(letter)}: Group ${groupIdx + 1} &mdash; ${group.files.length} duplicates</span>
                `;
                card.appendChild(header);

                // File cards container
                const filesContainer = document.createElement('div');
                filesContainer.className = 'duplicate-group-files';

                group.files.forEach(filename => {
                    const fileCard = document.createElement('div');
                    fileCard.className = 'duplicate-file-card';
                    fileCard.dataset.filename = filename;

                    const isKept = resolutions[letter][groupIdx].keep.includes(filename);
                    fileCard.classList.add(isKept ? 'marked-keep' : 'marked-remove');

                    // Preview
                    const previewEl = document.createElement('div');
                    previewEl.className = 'duplicate-preview';
                    const thumbnail = group.thumbnails ? group.thumbnails[filename] : null;
                    previewEl.appendChild(renderPreview(filename, thumbnail));
                    fileCard.appendChild(previewEl);

                    // Filename
                    const nameEl = document.createElement('div');
                    nameEl.className = 'file-name';
                    nameEl.textContent = filename;
                    fileCard.appendChild(nameEl);

                    // Toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = `duplicate-toggle ${isKept ? 'toggle-keep' : 'toggle-remove'}`;
                    toggleBtn.textContent = isKept ? 'Keep' : 'Remove';
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFile(letter, groupIdx, filename);
                    });
                    fileCard.appendChild(toggleBtn);

                    filesContainer.appendChild(fileCard);
                });

                card.appendChild(filesContainer);

                // Relationships section
                if (group.edges.length > 0) {
                    const relSection = document.createElement('div');
                    relSection.className = 'duplicate-relationships';
                    relSection.innerHTML = '<strong>Relationships:</strong>';
                    for (const edge of group.edges) {
                        const line = document.createElement('div');
                        line.className = 'duplicate-relationship-line';
                        const badgeClass = edge.matchType === 'EXACT_DUPLICATE' ? 'exact' : 'similar';
                        const label = edge.matchType === 'EXACT_DUPLICATE'
                            ? 'Exact Duplicate'
                            : `Visual Match (${edge.confidence}%)`;
                        line.innerHTML = `${escapeHtml(edge.file1)} &harr; ${escapeHtml(edge.file2)} &mdash; <span class="duplicate-badge ${badgeClass}">${label}</span>`;
                        relSection.appendChild(line);
                    }
                    card.appendChild(relSection);
                }

                // Keep All button
                const actionsEl = document.createElement('div');
                actionsEl.className = 'duplicate-actions';
                const keepAllBtn = document.createElement('button');
                keepAllBtn.textContent = 'Keep All';
                keepAllBtn.addEventListener('click', () => {
                    resolutions[letter][groupIdx].keep = [...group.files];
                    resolutions[letter][groupIdx].remove = [];
                    renderGroups();
                    updateFileCount();
                });
                actionsEl.appendChild(keepAllBtn);
                card.appendChild(actionsEl);

                container.appendChild(card);
            });
        }

        updateToggleStates();
    }

    function toggleFile(letter, groupIdx, filename) {
        const res = resolutions[letter][groupIdx];
        if (res.keep.includes(filename)) {
            // Don't allow removing the last kept file
            if (res.keep.length <= 1) return;
            res.keep = res.keep.filter(f => f !== filename);
            res.remove.push(filename);
        } else {
            res.remove = res.remove.filter(f => f !== filename);
            res.keep.push(filename);
        }
        renderGroups();
        updateFileCount();
    }

    function updateToggleStates() {
        // Lock the last kept file's toggle in each group
        // Scope to group cards to avoid cross-group filename collisions
        const container = document.getElementById('duplicate-pairs');
        const groupCards = container.querySelectorAll('.duplicate-pair-card');
        let cardIdx = 0;

        for (const [letter, groupResolutions] of Object.entries(resolutions)) {
            groupResolutions.forEach((res) => {
                const groupCard = groupCards[cardIdx++];
                if (!groupCard) return;
                if (res.keep.length === 1) {
                    const fileCards = groupCard.querySelectorAll('.duplicate-file-card');
                    fileCards.forEach(card => {
                        if (card.dataset.filename === res.keep[0] && card.classList.contains('marked-keep')) {
                            card.classList.add('marked-keep-locked');
                            const btn = card.querySelector('.duplicate-toggle');
                            if (btn) btn.disabled = true;
                        }
                    });
                }
            });
        }
    }

    function updateFileCount() {
        const countEl = document.getElementById('duplicate-file-count');
        let removeCount = 0;
        for (const groups of Object.values(resolutions)) {
            for (const group of groups) {
                removeCount += group.remove.length;
            }
        }
        countEl.textContent = removeCount === 0
            ? 'Keeping all files'
            : `Removing ${removeCount} file(s)`;
    }

    function addInlineBadges(report) {
        for (const [letter, groups] of Object.entries(report)) {
            const badgeContainer = document.getElementById(`dup-badges-${letter}`);
            if (!badgeContainer) continue;
            badgeContainer.innerHTML = '';
            const totalDupes = groups.reduce((sum, g) => sum + g.files.length, 0);
            const badge = document.createElement('span');
            badge.className = 'duplicate-badge exact';
            badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${totalDupes} duplicates`;
            badgeContainer.appendChild(badge);
        }
    }

    function clearInlineBadges() {
        document.querySelectorAll('.duplicate-badges').forEach(el => { el.innerHTML = ''; });
    }

    function hide() {
        document.getElementById('duplicate-modal').style.display = 'none';
        clearInlineBadges();
    }

    return { showModal, hide };
})();

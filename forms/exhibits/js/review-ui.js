/**
 * Review UI — Duplicate review page logic
 * Handles tab navigation, file cards, keep/remove toggling, and resolution confirmation.
 */
const ReviewUI = (() => {
    let jobId = null;
    let data = null;           // full response from /duplicates (no thumbnails)
    const thumbnails = {};     // { letter: { filename: dataUrl } } — lazy loaded
    const resolutions = {};    // { letter: [{ groupId, keep: [], remove: [] }] }
    let activeTab = null;

    // DOM cache
    const dom = {};

    // ── Helpers ──

    function formatFileSize(bytes) {
        if (bytes == null) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function escapeJs(str) {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    function truncate(str, max) {
        if (!str || str.length <= max) return str;
        const ext = str.lastIndexOf('.') !== -1 ? str.slice(str.lastIndexOf('.')) : '';
        const base = str.slice(0, str.length - ext.length);
        const keep = max - ext.length - 1;
        if (keep < 4) return str.slice(0, max - 1) + '\u2026';
        return base.slice(0, keep) + '\u2026' + ext;
    }

    // ── Initialization ──

    function init() {
        const params = new URLSearchParams(window.location.search);
        jobId = params.get('jobId');
        if (!jobId) {
            document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#c00;">Missing jobId parameter.</p>';
            return;
        }

        // Cache DOM
        dom.subtitle = document.getElementById('review-subtitle');
        dom.tabs = document.getElementById('review-tabs');
        dom.content = document.getElementById('review-content');
        dom.footerStats = document.getElementById('review-footer-stats');
        dom.confirmOverlay = document.getElementById('confirm-overlay');
        dom.confirmStats = document.getElementById('confirm-stats');
        dom.loading = document.getElementById('review-loading');
        dom.btnRemoveAll = document.getElementById('btn-remove-all');
        dom.btnContinueTop = document.getElementById('btn-continue-top');
        dom.btnContinueBottom = document.getElementById('btn-continue-bottom');
        dom.btnGoBack = document.getElementById('btn-go-back');
        dom.btnConfirmProcess = document.getElementById('btn-confirm-process');

        // Bind handlers
        dom.btnRemoveAll.addEventListener('click', () => removeAllDuplicates());
        dom.btnContinueTop.addEventListener('click', () => showConfirmation());
        dom.btnContinueBottom.addEventListener('click', () => showConfirmation());
        dom.btnGoBack.addEventListener('click', () => hideConfirmation());
        dom.btnConfirmProcess.addEventListener('click', () => confirmAndProcess());

        fetchDuplicateData();
    }

    // ── Data fetching ──

    async function fetchDuplicateData() {
        try {
            const res = await fetch(`/api/exhibits/jobs/${jobId}/duplicates`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();

            // Initialize resolutions from groups
            for (const [letter, groups] of Object.entries(data.groups || {})) {
                resolutions[letter] = groups.map(group => ({
                    groupId: group.groupId,
                    keep: [group.defaultKeep],
                    remove: group.files.filter(f => f !== group.defaultKeep),
                }));
            }

            dom.loading.style.display = 'none';
            dom.subtitle.textContent = `${data.caseName || 'Case'} \u2014 ${data.totalGroups || 0} duplicate group${data.totalGroups === 1 ? '' : 's'} across ${data.totalFiles || 0} files`;

            renderTabs();
            updateFooterStats();

            // Auto-select first tab
            const letters = Object.keys(data.groups || {}).sort();
            if (letters.length > 0) switchTab(letters[0]);
        } catch (err) {
            dom.loading.innerHTML = `<p style="color:#c00;">Failed to load duplicate data: ${escapeHtml(err.message)}</p>`;
        }
    }

    async function fetchExhibitThumbnails(letter) {
        if (thumbnails[letter]) return;
        try {
            const res = await fetch(`/api/exhibits/jobs/${jobId}/duplicates?exhibit=${encodeURIComponent(letter)}`);
            if (!res.ok) return;
            const result = await res.json();
            const groups = (result.groups || {})[letter] || [];
            thumbnails[letter] = {};
            groups.forEach(group => {
                if (group.thumbnails) {
                    Object.assign(thumbnails[letter], group.thumbnails);
                }
            });
        } catch (_) {
            // Thumbnails are optional — render placeholders
        }
    }

    // ── Tab rendering ──

    function renderTabs() {
        const letters = Object.keys(data.groups || {}).sort();
        dom.tabs.innerHTML = '';

        letters.forEach(letter => {
            const count = (data.groupCounts && data.groupCounts[letter]) || (data.groups[letter] || []).length;
            const btn = document.createElement('button');
            btn.className = 'review-tab';
            btn.dataset.letter = letter;
            btn.innerHTML = `Exhibit ${escapeHtml(letter)} <span class="review-tab-badge">${count}</span>`;
            btn.addEventListener('click', () => switchTab(letter));
            dom.tabs.appendChild(btn);
        });
    }

    async function switchTab(letter) {
        activeTab = letter;

        // Update tab active state
        dom.tabs.querySelectorAll('.review-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.letter === letter);
        });

        // Show loading in content area while thumbnails load
        dom.content.innerHTML = '<p style="text-align:center;padding:30px;color:#888;">Loading thumbnails...</p>';

        await fetchExhibitThumbnails(letter);
        renderTabContent(letter);
    }

    // ── Card rendering ──

    function renderTabContent(letter) {
        const groups = (data.groups || {})[letter] || [];
        if (groups.length === 0) {
            dom.content.innerHTML = '<p style="padding:30px;text-align:center;color:#888;">No duplicates for this exhibit.</p>';
            return;
        }

        let html = `<h3 class="review-section-header">Exhibit ${escapeHtml(letter)} &mdash; ${groups.length} group${groups.length === 1 ? '' : 's'}</h3>`;

        groups.forEach((group, groupIdx) => {
            html += `<div class="review-group-card">`;
            html += `<div class="review-group-header">`;
            html += `<span class="review-group-label">Group ${groupIdx + 1} &middot; ${group.files.length} files</span>`;
            html += `<button class="btn-keep-all" onclick="ReviewUI.keepAll('${escapeJs(letter)}', ${groupIdx})">Keep All</button>`;
            html += `</div>`;
            html += `<div class="review-file-cards">`;

            const res = resolutions[letter] ? resolutions[letter][groupIdx] : null;

            group.files.forEach(filename => {
                const isKept = res ? res.keep.includes(filename) : true;
                const isLocked = res && res.keep.length === 1 && res.keep[0] === filename;

                let cardClass = 'review-file-card';
                if (!isKept) cardClass += ' marked-remove';
                if (isLocked) cardClass += ' marked-keep-locked';

                html += `<div class="${cardClass}">`;

                // Thumbnail
                html += `<div class="review-file-thumbnail">`;
                const thumb = thumbnails[letter] && thumbnails[letter][filename];
                if (thumb) {
                    html += `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(filename)}">`;
                } else {
                    const ext = filename.split('.').pop().toLowerCase();
                    const isImage = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'].includes(ext);
                    html += `<i class="fas ${isImage ? 'fa-file-image' : 'fa-file-pdf'}" style="font-size:2rem;color:#999;"></i>`;
                }
                html += `</div>`;

                // Filename
                html += `<div class="review-file-name" title="${escapeHtml(filename)}">${escapeHtml(truncate(filename, 28))}</div>`;

                // Metadata (size + pages/dimensions)
                const meta = group.metadata ? group.metadata[filename] : null;
                if (meta) {
                    let metaText = formatFileSize(meta.size);
                    if (meta.pages) metaText += ` \u00B7 ${meta.pages} pg`;
                    if (meta.dimensions) metaText += ` \u00B7 ${meta.dimensions}`;
                    html += `<div class="review-file-meta">${escapeHtml(metaText)}</div>`;
                }

                // Match badge
                const edge = findBestEdge(group, filename);
                if (edge) {
                    html += `<div class="review-file-match">${renderMatchBadge(edge)}</div>`;
                }

                // Toggle button
                const toggleClass = isKept ? 'toggle-keep' : 'toggle-remove';
                const toggleIcon = isKept ? 'fa-check' : 'fa-times';
                const toggleLabel = isKept ? 'Keep' : 'Remove';
                html += `<button class="review-file-toggle ${toggleClass}" onclick="ReviewUI.toggleFile('${escapeJs(letter)}', ${groupIdx}, '${escapeJs(filename)}')">`;
                html += `<i class="fas ${toggleIcon}"></i> ${toggleLabel}</button>`;

                html += `</div>`; // .review-file-card
            });

            html += `</div>`; // .review-file-cards
            html += `</div>`; // .review-group-card
        });

        dom.content.innerHTML = html;
    }

    function findBestEdge(group, filename) {
        if (!group.edges) return null;
        // Find the edge with the highest similarity involving this file
        let best = null;
        for (const edge of group.edges) {
            if (edge.file1 === filename || edge.file2 === filename) {
                if (!best || (edge.similarity || 0) > (best.similarity || 0)) {
                    best = edge;
                }
            }
        }
        return best;
    }

    function renderMatchBadge(edge) {
        const type = edge.matchType || edge.type || '';
        if (type === 'EXACT_DUPLICATE') {
            return '<span class="match-badge exact">Exact Match</span>';
        }
        const pct = edge.similarity != null ? (edge.similarity * 100).toFixed(1) : '?';
        if (type === 'VISUAL_MATCH') {
            return `<span class="match-badge visual">${pct}% Visual</span>`;
        }
        if (type === 'LIKELY_MATCH') {
            return `<span class="match-badge likely">${pct}% Likely</span>`;
        }
        return `<span class="match-badge exact">${pct}% Match</span>`;
    }

    // ── Toggle logic ──

    function toggleFile(letter, groupIdx, filename) {
        const res = resolutions[letter] && resolutions[letter][groupIdx];
        if (!res) return;

        if (res.keep.includes(filename)) {
            // Don't allow removing the last kept file
            if (res.keep.length <= 1) return;
            res.keep = res.keep.filter(f => f !== filename);
            res.remove.push(filename);
        } else {
            res.remove = res.remove.filter(f => f !== filename);
            res.keep.push(filename);
        }

        renderTabContent(letter);
        updateFooterStats();
    }

    // ── Bulk actions ──

    function keepAll(letter, groupIdx) {
        const group = (data.groups || {})[letter] && data.groups[letter][groupIdx];
        const res = resolutions[letter] && resolutions[letter][groupIdx];
        if (!group || !res) return;

        res.keep = [...group.files];
        res.remove = [];

        renderTabContent(letter);
        updateFooterStats();
    }

    function removeAllDuplicates() {
        for (const [letter, groups] of Object.entries(data.groups || {})) {
            groups.forEach((group, groupIdx) => {
                const res = resolutions[letter] && resolutions[letter][groupIdx];
                if (!res) return;
                res.keep = [group.defaultKeep];
                res.remove = group.files.filter(f => f !== group.defaultKeep);
            });
        }

        if (activeTab) renderTabContent(activeTab);
        updateFooterStats();
    }

    // ── Footer stats ──

    function updateFooterStats() {
        let totalKeep = 0;
        let totalRemove = 0;

        for (const groups of Object.values(resolutions)) {
            for (const res of groups) {
                totalKeep += res.keep.length;
                totalRemove += res.remove.length;
            }
        }

        dom.footerStats.innerHTML =
            `<span class="keep-count"><i class="fas fa-check"></i> Keeping ${totalKeep} file${totalKeep === 1 ? '' : 's'}</span>` +
            `<span class="remove-count"><i class="fas fa-times"></i> Removing ${totalRemove} file${totalRemove === 1 ? '' : 's'}</span>`;

        // Update continue button text
        const btnText = totalRemove > 0
            ? `Process (removing ${totalRemove}) \u2192`
            : 'Continue to Processing \u2192';
        dom.btnContinueTop.textContent = btnText;
        dom.btnContinueBottom.textContent = btnText;
    }

    // ── Confirmation ──

    function showConfirmation() {
        let totalKeep = 0;
        let totalRemove = 0;
        const exhibitStats = [];

        for (const [letter, groups] of Object.entries(resolutions)) {
            let exKeep = 0, exRemove = 0;
            for (const res of groups) {
                exKeep += res.keep.length;
                exRemove += res.remove.length;
            }
            totalKeep += exKeep;
            totalRemove += exRemove;
            if (exRemove > 0) {
                exhibitStats.push({ letter, keep: exKeep, remove: exRemove });
            }
        }

        let statsHtml = `<div class="confirm-stat-row"><span>Total files keeping</span><strong class="keep-count">${totalKeep}</strong></div>`;
        statsHtml += `<div class="confirm-stat-row"><span>Total files removing</span><strong class="remove-count">${totalRemove}</strong></div>`;

        exhibitStats.forEach(({ letter, keep, remove }) => {
            statsHtml += `<div class="confirm-stat-row"><span>Exhibit ${escapeHtml(letter)}</span><span>${keep} keep / ${remove} remove</span></div>`;
        });

        dom.confirmStats.innerHTML = statsHtml;
        dom.confirmOverlay.style.display = 'flex';
    }

    function hideConfirmation() {
        dom.confirmOverlay.style.display = 'none';
    }

    async function confirmAndProcess() {
        dom.btnConfirmProcess.disabled = true;
        dom.btnConfirmProcess.textContent = 'Processing...';

        try {
            // Build payload: { A: [{ groupId, keep, remove }], B: [...] }
            const payload = {};
            for (const [letter, groups] of Object.entries(resolutions)) {
                payload[letter] = groups.map(res => ({
                    groupId: res.groupId,
                    keep: res.keep,
                    remove: res.remove,
                }));
            }

            const res = await fetch(`/api/exhibits/jobs/${jobId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            // Redirect back to main page to resume processing
            window.location.href = `./?jobId=${encodeURIComponent(jobId)}&resume=true`;
        } catch (err) {
            alert('Failed to process resolutions: ' + err.message);
            dom.btnConfirmProcess.disabled = false;
            dom.btnConfirmProcess.textContent = 'Process Files \u2192';
        }
    }

    // ── Public API ──

    return {
        init,
        toggleFile,
        keepAll,
        removeAllDuplicates,
    };
})();

document.addEventListener('DOMContentLoaded', () => ReviewUI.init());

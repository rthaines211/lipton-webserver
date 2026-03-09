/**
 * Duplicate UI Module
 * Renders duplicate resolution modal and inline badges.
 */

const DuplicateUI = (() => {
    let currentReport = null;
    const resolutions = {}; // { letter: [{ file1, file2, action }] }

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

    /**
     * Show the duplicate modal with the report.
     * @param {Object} report - { letter: [{ file1, file2, matchType, confidence, layer, details }] }
     * @returns {Promise<Object>} Resolved resolutions when user clicks Continue
     */
    function showModal(report) {
        currentReport = report;

        // Initialize resolutions with 'keep_both' default
        for (const [letter, pairs] of Object.entries(report)) {
            resolutions[letter] = pairs.map(p => ({
                file1: p.file1,
                file2: p.file2,
                action: 'keep_both',
            }));
        }

        renderPairs();
        updateFileCount();

        const modal = document.getElementById('duplicate-modal');
        modal.style.display = 'flex';

        // Also add inline badges to exhibit cards
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

    function updateFileCount() {
        const countEl = document.getElementById('duplicate-file-count');
        let removeCount = 0;
        for (const pairs of Object.values(resolutions)) {
            for (const pair of pairs) {
                if (pair.action === 'remove_file1' || pair.action === 'remove_file2') {
                    removeCount++;
                }
            }
        }

        if (removeCount === 0) {
            countEl.textContent = 'Keeping all files';
        } else {
            countEl.textContent = `Removing ${removeCount} file(s)`;
        }
    }

    function addInlineBadges(report) {
        for (const [letter, pairs] of Object.entries(report)) {
            const badgeContainer = document.getElementById(`dup-badges-${letter}`);
            if (!badgeContainer) continue;

            badgeContainer.innerHTML = '';
            for (const pair of pairs) {
                const badge = document.createElement('span');
                const isExact = pair.matchType === 'EXACT_DUPLICATE';
                badge.className = `duplicate-badge ${isExact ? 'exact' : 'similar'}`;
                badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${isExact ? 'Duplicate' : 'Similar'}`;
                badgeContainer.appendChild(badge);
            }

            // Expand the card to show the badges
            if (typeof ExhibitManager !== 'undefined') {
                ExhibitManager.expandCard(letter);
            }
        }
    }

    function clearInlineBadges() {
        document.querySelectorAll('.duplicate-badges').forEach(el => {
            el.innerHTML = '';
        });
    }

    function hide() {
        document.getElementById('duplicate-modal').style.display = 'none';
        clearInlineBadges();
    }

    return {
        showModal,
        hide,
    };
})();

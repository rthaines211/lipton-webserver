/**
 * Duplicate UI Module
 * Renders duplicate resolution modal and inline badges.
 */

const DuplicateUI = (() => {
    let currentReport = null;
    const resolutions = {}; // { letter: [{ file1, file2, action }] }

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

                card.innerHTML = `
                    <div class="duplicate-pair-header">
                        <span>Exhibit ${letter}:</span>
                        <span class="duplicate-badge ${badgeClass}">
                            <i class="fas ${pair.matchType === 'EXACT_DUPLICATE' ? 'fa-copy' : 'fa-eye'}"></i>
                            ${badgeText}
                        </span>
                    </div>
                    <div class="duplicate-pair-files">
                        <div class="duplicate-file-card">
                            <i class="fas fa-file" style="font-size: 1.5rem; color: #999;"></i>
                            <div class="file-name">${pair.file1}</div>
                        </div>
                        <div class="duplicate-file-card">
                            <i class="fas fa-file" style="font-size: 1.5rem; color: #999;"></i>
                            <div class="file-name">${pair.file2}</div>
                        </div>
                    </div>
                    <div class="duplicate-actions" id="actions-${letter}-${idx}">
                        <button data-action="keep_both" class="selected">Keep Both</button>
                        <button data-action="remove_file1">Remove ${pair.file1}</button>
                        <button data-action="remove_file2">Remove ${pair.file2}</button>
                    </div>
                `;

                // Action button handlers
                const actionsEl = card.querySelector('.duplicate-actions');
                actionsEl.querySelectorAll('button').forEach(btn => {
                    btn.addEventListener('click', () => {
                        actionsEl.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        resolutions[letter][idx].action = btn.dataset.action;
                        updateFileCount();
                    });
                });

                container.appendChild(card);
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

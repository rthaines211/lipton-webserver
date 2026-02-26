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

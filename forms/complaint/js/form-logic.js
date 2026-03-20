/**
 * Complaint Form Logic
 * Handles multi-page navigation, dynamic add/remove parties,
 * and city-based cause-of-action filtering
 */
(function() {
    'use strict';

    let plaintiffCount = 1;
    let defendantCount = 1;

    function init() {
        // Party buttons
        document.getElementById('add-plaintiff-btn').addEventListener('click', addPlaintiff);
        document.getElementById('add-defendant-btn').addEventListener('click', addDefendant);

        // Page navigation
        document.getElementById('btn-next').addEventListener('click', goToPage2);
        document.getElementById('btn-back').addEventListener('click', goToPage1);

        // City dropdown controls city-specific causes section
        const citySelect = document.getElementById('city');
        if (citySelect) {
            citySelect.addEventListener('change', handleCityChange);
        }

        // Create sidebar and load causes of action
        createSidebar();
        loadCauses();
    }

    // ======================== Page Navigation ========================

    function goToPage2() {
        // Validate page 1 fields before proceeding
        const page1Inputs = document.querySelectorAll('#page-1 [required]');
        for (const input of page1Inputs) {
            if (!input.checkValidity()) {
                input.reportValidity();
                return;
            }
        }

        document.getElementById('page-1').classList.remove('active');
        document.getElementById('page-2').classList.add('active');

        // Update step indicator
        document.querySelector('.step[data-step="1"]').classList.remove('active');
        document.querySelector('.step[data-step="1"]').classList.add('completed');
        document.querySelector('.step[data-step="2"]').classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToPage1() {
        document.getElementById('page-2').classList.remove('active');
        document.getElementById('page-1').classList.add('active');

        // Update step indicator
        document.querySelector('.step[data-step="2"]').classList.remove('active');
        document.querySelector('.step[data-step="1"]').classList.remove('completed');
        document.querySelector('.step[data-step="1"]').classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ======================== City Filtering ========================

    function handleCityChange() {
        const city = document.getElementById('city').value;
        const citySection = document.getElementById('causes-city-section');
        const cityTitle = document.getElementById('causes-city-title');
        const cityName = document.getElementById('causes-city-name');

        // Hide all city-specific cause groups
        document.querySelectorAll('.city-causes').forEach(el => {
            el.style.display = 'none';
            // Uncheck hidden city causes
            el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                const option = cb.closest('.cause-row');
                if (option) option.classList.remove('selected');
            });
        });

        if (city === 'Los Angeles') {
            citySection.style.display = '';
            cityTitle.textContent = 'Los Angeles';
            cityName.textContent = 'Los Angeles';
            document.getElementById('causes-los-angeles').style.display = '';
        } else if (city === 'Santa Monica') {
            citySection.style.display = '';
            cityTitle.textContent = 'Santa Monica';
            cityName.textContent = 'Santa Monica';
            document.getElementById('causes-santa-monica').style.display = '';
        } else {
            citySection.style.display = 'none';
        }
    }

    // ======================== Causes of Action ========================

    const categoryContainerMap = {
        'general': 'causes-general',
        'special': 'causes-special',
        'los-angeles': 'causes-los-angeles',
        'santa-monica': 'causes-santa-monica',
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ======================== Sidebar Preview ========================

    let sidebarEl = null;
    let activeCauseBtn = null;

    function createSidebar() {
        if (sidebarEl) return;
        sidebarEl = document.createElement('div');
        sidebarEl.id = 'cause-preview-sidebar';
        sidebarEl.innerHTML = `
            <div class="sidebar-header">
                <h3 id="sidebar-cause-title"></h3>
                <button type="button" class="sidebar-close" aria-label="Close preview">&times;</button>
            </div>
            <div class="sidebar-body">
                <div class="legal-heading" id="sidebar-cause-heading"></div>
                <div class="legal-text" id="sidebar-cause-text"></div>
            </div>
        `;
        document.body.appendChild(sidebarEl);

        sidebarEl.querySelector('.sidebar-close').addEventListener('click', closeSidebar);

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebarEl.classList.contains('open')) {
                closeSidebar();
            }
        });
    }

    function openSidebar(btn, cause) {
        // Toggle off if same button clicked
        if (activeCauseBtn === btn) {
            closeSidebar();
            return;
        }

        // Deactivate previous
        if (activeCauseBtn) activeCauseBtn.classList.remove('active');

        activeCauseBtn = btn;
        btn.classList.add('active');

        document.getElementById('sidebar-cause-title').textContent = cause.checkboxText;
        document.getElementById('sidebar-cause-heading').textContent = cause.heading;

        // Format insertText as paragraphs ({n} is the paragraph delimiter)
        const paragraphs = cause.insertText
            .split(/\{n\}/)
            .map(p => p.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(p => p);
        document.getElementById('sidebar-cause-text').innerHTML =
            paragraphs.map(p => '<p>' + escapeHtml(p) + '</p>').join('');

        sidebarEl.classList.add('open');
    }

    function closeSidebar() {
        if (sidebarEl) sidebarEl.classList.remove('open');
        if (activeCauseBtn) {
            activeCauseBtn.classList.remove('active');
            activeCauseBtn = null;
        }
    }

    // ======================== Load Causes ========================

    async function loadCauses() {
        try {
            const res = await fetch('/api/complaint-entries/causes');
            const result = await res.json();
            if (!result.success || !result.data) return;

            // Track counts per category for badges
            const categoryCounts = {};

            result.data.forEach(cause => {
                const containerId = categoryContainerMap[cause.category];
                const container = containerId && document.getElementById(containerId);
                if (!container) return;

                // Count per category
                categoryCounts[cause.category] = (categoryCounts[cause.category] || 0) + 1;

                const row = document.createElement('div');
                row.className = 'cause-row';
                row.dataset.category = cause.category;

                row.innerHTML = `
                    <input type="checkbox" name="cause-${escapeHtml(cause.id)}" value="${escapeHtml(cause.id)}">
                    <span class="cause-name">${escapeHtml(cause.checkboxText)}</span>
                    <button type="button" class="cause-info-btn" aria-label="Preview ${escapeHtml(cause.checkboxText)}">&#9432;</button>
                `;

                // Click row to toggle checkbox (but not when clicking info button)
                row.addEventListener('click', function(e) {
                    if (e.target.tagName === 'INPUT' || e.target.classList.contains('cause-info-btn')) return;
                    const cb = row.querySelector('input[type="checkbox"]');
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change'));
                });

                // Toggle selected class on change
                const cb = row.querySelector('input[type="checkbox"]');
                cb.addEventListener('change', function() {
                    row.classList.toggle('selected', this.checked);
                });

                // Info button opens sidebar
                const infoBtn = row.querySelector('.cause-info-btn');
                infoBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openSidebar(this, cause);
                });

                container.appendChild(row);
            });

            // Add count badges to category headers
            for (const [category, containerId] of Object.entries(categoryContainerMap)) {
                const count = categoryCounts[category];
                if (!count) continue;
                const container = document.getElementById(containerId);
                if (!container) continue;
                const section = container.closest('.form-section');
                if (!section) continue;
                const h2 = section.querySelector('h2');
                if (h2 && !h2.querySelector('.category-count')) {
                    const badge = document.createElement('span');
                    badge.className = 'category-count';
                    badge.textContent = `(${count})`;
                    h2.appendChild(badge);
                }
            }
        } catch (err) {
            console.error('Failed to load causes of action:', err);
        }
    }

    // ======================== Plaintiffs ========================

    function addPlaintiff() {
        plaintiffCount++;
        const container = document.getElementById('plaintiffs-container');
        const block = document.createElement('div');
        block.className = 'party-block';
        block.dataset.index = plaintiffCount;

        block.innerHTML = `
            <div class="party-header">
                <h3>Plaintiff ${plaintiffCount}</h3>
                <button type="button" class="btn-remove" onclick="window.complaintForm.removePlaintiff(${plaintiffCount})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="form-row three-col">
                <div class="form-group">
                    <label>First Name <span class="required">*</span></label>
                    <input type="text" name="plaintiff-${plaintiffCount}-first-name" required placeholder="First name">
                </div>
                <div class="form-group">
                    <label>Last Name <span class="required">*</span></label>
                    <input type="text" name="plaintiff-${plaintiffCount}-last-name" required placeholder="Last name">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="plaintiff-${plaintiffCount}-type" onchange="window.complaintForm.toggleGuardian(${plaintiffCount})">
                        <option value="individual">Individual</option>
                        <option value="minor">Minor</option>
                    </select>
                </div>
            </div>
            <div class="unit-number-container" style="display: none;">
                <div class="form-group">
                    <label>Unit #</label>
                    <input type="text" name="plaintiff-${plaintiffCount}-unit" placeholder="e.g. 101, 2B">
                </div>
            </div>
            <div id="plaintiff-${plaintiffCount}-guardian-container" class="guardian-select-container" style="display: none;">
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-guardian">Guardian (select plaintiff) <span class="required">*</span></label>
                    <select id="plaintiff-${plaintiffCount}-guardian" name="plaintiff-${plaintiffCount}-guardian">
                        <option value="">Select Guardian...</option>
                    </select>
                </div>
            </div>
        `;

        container.appendChild(block);
        updatePlaintiffCount();
        updateGuardianSelects();
        updateSinglePlaintiffFields();
        updateUnitFields();
    }

    function removePlaintiff(index) {
        const block = document.querySelector(`#plaintiffs-container .party-block[data-index="${index}"]`);
        if (block) {
            block.remove();
            reindexPlaintiffs();
        }
    }

    function reindexPlaintiffs() {
        const blocks = document.querySelectorAll('#plaintiffs-container .party-block');
        plaintiffCount = blocks.length;

        blocks.forEach((block, i) => {
            const num = i + 1;
            block.dataset.index = num;
            block.querySelector('h3').textContent = `Plaintiff ${num}`;

            block.querySelectorAll('input, select').forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    input.setAttribute('name', name.replace(/plaintiff-\d+-/, `plaintiff-${num}-`));
                }
                const id = input.getAttribute('id');
                if (id && id.startsWith('plaintiff-')) {
                    input.setAttribute('id', id.replace(/plaintiff-\d+-/, `plaintiff-${num}-`));
                }
            });

            // Update type select onchange
            const typeSelect = block.querySelector('select[name$="-type"]');
            if (typeSelect) {
                typeSelect.setAttribute('onchange', `window.complaintForm.toggleGuardian(${num})`);
            }

            // Update guardian container id
            const guardianContainer = block.querySelector('.guardian-select-container');
            if (guardianContainer) {
                guardianContainer.id = `plaintiff-${num}-guardian-container`;
            }

            // Update guardian select label for attribute
            const guardianLabel = block.querySelector('.guardian-select-container label');
            if (guardianLabel) {
                guardianLabel.setAttribute('for', `plaintiff-${num}-guardian`);
            }

            const removeBtn = block.querySelector('.btn-remove');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `window.complaintForm.removePlaintiff(${num})`);
            }
        });

        updatePlaintiffCount();
        updateGuardianSelects();
        updateSinglePlaintiffFields();
        updateUnitFields();
    }

    function updatePlaintiffCount() {
        document.getElementById('plaintiff-count').value = document.querySelectorAll('#plaintiffs-container .party-block').length;
    }

    function updateSinglePlaintiffFields() {
        const container = document.getElementById('single-plaintiff-fields');
        if (!container) return;
        const typeSelects = document.querySelectorAll('#plaintiffs-container .party-block select[name$="-type"]');
        const individualCount = Array.from(typeSelects).filter(s => s.value === 'individual').length;
        container.style.display = individualCount === 1 ? '' : 'none';
    }

    function updateUnitFields() {
        const blocks = document.querySelectorAll('#plaintiffs-container .party-block');
        const typeSelects = document.querySelectorAll('#plaintiffs-container .party-block select[name$="-type"]');
        const individualCount = Array.from(typeSelects).filter(s => s.value === 'individual').length;
        const showUnits = individualCount >= 2;

        blocks.forEach(block => {
            const num = parseInt(block.dataset.index);
            const typeSelect = block.querySelector(`[name="plaintiff-${num}-type"]`);
            const container = block.querySelector('.unit-number-container');
            if (!container) return;

            // Only show unit field on individual plaintiffs when 2+ individuals exist
            if (showUnits && typeSelect && typeSelect.value === 'individual') {
                container.style.display = '';
            } else {
                container.style.display = 'none';
                const input = container.querySelector('input');
                if (input) input.value = '';
            }
        });
    }

    // ======================== Defendants ========================

    const defendantPlaceholders = {
        individual: 'First and last name',
        corporate: 'Corporation or LLC name',
        government_entity: 'Agency or department name',
        trust: 'Trust name',
        estate: 'Estate name',
        partnership: 'Partnership name',
        association: 'Association or HOA name',
    };

    function updateDefendantPlaceholder(selectEl) {
        const nameInput = selectEl.closest('.party-block').querySelector('input[name$="-name"]');
        if (nameInput) {
            nameInput.placeholder = defendantPlaceholders[selectEl.value] || 'Name';
        }
    }

    function addDefendant() {
        defendantCount++;
        const container = document.getElementById('defendants-container');
        const block = document.createElement('div');
        block.className = 'party-block';
        block.dataset.index = defendantCount;

        block.innerHTML = `
            <div class="party-header">
                <h3>Defendant ${defendantCount}</h3>
                <button type="button" class="btn-remove" onclick="window.complaintForm.removeDefendant(${defendantCount})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="form-row two-col">
                <div class="form-group">
                    <label>Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-name" required placeholder="First and last name">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="defendant-${defendantCount}-type" onchange="window.complaintForm.updateDefendantPlaceholder(this)">
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                        <option value="government_entity">Government Entity</option>
                        <option value="trust">Trust</option>
                        <option value="estate">Estate</option>
                        <option value="partnership">Partnership</option>
                        <option value="association">Association</option>
                    </select>
                </div>
            </div>
        `;

        container.appendChild(block);
        updateDefendantCount();
    }

    function removeDefendant(index) {
        const block = document.querySelector(`#defendants-container .party-block[data-index="${index}"]`);
        if (block) {
            block.remove();
            reindexDefendants();
        }
    }

    function reindexDefendants() {
        const blocks = document.querySelectorAll('#defendants-container .party-block');
        defendantCount = blocks.length;

        blocks.forEach((block, i) => {
            const num = i + 1;
            block.dataset.index = num;
            block.querySelector('h3').textContent = `Defendant ${num}`;

            block.querySelectorAll('input, select').forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    input.setAttribute('name', name.replace(/defendant-\d+-/, `defendant-${num}-`));
                }
            });

            const removeBtn = block.querySelector('.btn-remove');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `window.complaintForm.removeDefendant(${num})`);
            }
        });

        updateDefendantCount();
    }

    function updateDefendantCount() {
        document.getElementById('defendant-count').value = document.querySelectorAll('#defendants-container .party-block').length;
    }

    // ======================== Guardian Logic ========================

    function toggleGuardian(plaintiffNumber) {
        const typeSelect = document.querySelector(`select[name="plaintiff-${plaintiffNumber}-type"]`);
        const container = document.getElementById(`plaintiff-${plaintiffNumber}-guardian-container`);
        const select = document.getElementById(`plaintiff-${plaintiffNumber}-guardian`);

        if (!typeSelect || !container) return;

        if (typeSelect.value === 'minor') {
            container.style.display = 'block';
            if (select) select.required = true;
            updateGuardianSelects();
        } else {
            container.style.display = 'none';
            if (select) {
                select.required = false;
                select.value = '';
            }
        }
        updateSinglePlaintiffFields();
        updateUnitFields();

        // Invalidate any guardian selections pointing to this plaintiff if they became a minor
        if (typeSelect.value === 'minor') {
            const blocks = document.querySelectorAll('#plaintiffs-container .party-block');
            blocks.forEach(block => {
                const blockNum = parseInt(block.dataset.index);
                if (blockNum === plaintiffNumber) return;
                const guardianSelect = document.getElementById(`plaintiff-${blockNum}-guardian`);
                if (guardianSelect && guardianSelect.value === String(plaintiffNumber)) {
                    guardianSelect.value = '';
                }
            });
        }
    }

    function updateGuardianSelects() {
        const blocks = document.querySelectorAll('#plaintiffs-container .party-block');

        blocks.forEach(block => {
            const num = parseInt(block.dataset.index);
            const select = document.getElementById(`plaintiff-${num}-guardian`);
            if (!select) return;

            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Guardian...</option>';

            // Add all other plaintiffs as options
            blocks.forEach(otherBlock => {
                const otherNum = parseInt(otherBlock.dataset.index);
                if (otherNum === num) return; // Can't be guardian of self

                // Only show individual (adult) plaintiffs as guardian options
                const otherType = otherBlock.querySelector(`[name="plaintiff-${otherNum}-type"]`);
                if (otherType && otherType.value === 'minor') return;

                const firstName = otherBlock.querySelector(`[name="plaintiff-${otherNum}-first-name"]`)?.value || '';
                const lastName = otherBlock.querySelector(`[name="plaintiff-${otherNum}-last-name"]`)?.value || '';
                const label = firstName || lastName ? `${firstName} ${lastName}`.trim() : `Plaintiff ${otherNum}`;

                const option = document.createElement('option');
                option.value = otherNum;
                option.textContent = label;
                select.appendChild(option);
            });

            // Restore previous selection if still valid
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    // Expose for onclick/onchange handlers
    window.complaintForm = {
        removePlaintiff,
        removeDefendant,
        toggleGuardian,
        updateDefendantPlaceholder
    };

    document.addEventListener('DOMContentLoaded', function() {
        init();

        // Update guardian selects when plaintiff names change
        document.getElementById('complaint-form').addEventListener('input', function(e) {
            if (e.target.matches('input[name*="plaintiff"][name$="-first-name"], input[name*="plaintiff"][name$="-last-name"]')) {
                updateGuardianSelects();
            }
        });
    });
})();

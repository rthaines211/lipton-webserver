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

        // Toggle cause-option selected class on all checkboxes
        bindCauseCheckboxes();
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
                const option = cb.closest('.cause-option');
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

    // ======================== Cause Checkboxes ========================

    function bindCauseCheckboxes() {
        document.querySelectorAll('.cause-option input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                this.closest('.cause-option').classList.toggle('selected', this.checked);
            });
        });
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
                    <select name="plaintiff-${plaintiffCount}-type">
                        <option value="individual">Individual</option>
                        <option value="minor">Minor</option>
                    </select>
                </div>
            </div>
        `;

        container.appendChild(block);
        updatePlaintiffCount();
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
            });

            const removeBtn = block.querySelector('.btn-remove');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `window.complaintForm.removePlaintiff(${num})`);
            }
        });

        updatePlaintiffCount();
    }

    function updatePlaintiffCount() {
        document.getElementById('plaintiff-count').value = document.querySelectorAll('#plaintiffs-container .party-block').length;
    }

    // ======================== Defendants ========================

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
            <div class="form-row three-col">
                <div class="form-group">
                    <label>First Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-first-name" required placeholder="First name">
                </div>
                <div class="form-group">
                    <label>Last Name <span class="required">*</span></label>
                    <input type="text" name="defendant-${defendantCount}-last-name" required placeholder="Last name">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="defendant-${defendantCount}-type">
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
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

    // Expose for onclick handlers
    window.complaintForm = {
        removePlaintiff,
        removeDefendant
    };

    document.addEventListener('DOMContentLoaded', init);
})();

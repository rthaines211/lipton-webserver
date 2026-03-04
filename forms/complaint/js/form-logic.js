/**
 * Complaint Form Logic
 * Handles dynamic add/remove for plaintiff and defendant sections
 */
(function() {
    'use strict';

    let plaintiffCount = 1;
    let defendantCount = 1;

    function init() {
        document.getElementById('add-plaintiff-btn').addEventListener('click', addPlaintiff);
        document.getElementById('add-defendant-btn').addEventListener('click', addDefendant);

        // City dropdown controls which causes of action are visible
        const citySelect = document.getElementById('city');
        if (citySelect) {
            citySelect.addEventListener('change', filterCausesByCity);
        }

        // Toggle cause-option selected class
        document.querySelectorAll('.cause-option input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                this.closest('.cause-option').classList.toggle('selected', this.checked);
            });
        });
    }

    /**
     * Show/hide causes of action based on selected city.
     * Each .cause-option has a data-cities attribute:
     *   "all"              → always visible
     *   "Los Angeles"      → only when LA selected
     *   "Los Angeles,Santa Monica" → visible for either
     */
    function filterCausesByCity() {
        const city = document.getElementById('city').value;
        const hint = document.getElementById('causes-city-hint');
        const cityName = document.getElementById('causes-city-name');

        if (city) {
            hint.style.display = 'block';
            cityName.textContent = city;
        } else {
            hint.style.display = 'none';
        }

        document.querySelectorAll('#causes-container .cause-option').forEach(option => {
            const allowedCities = option.dataset.cities || 'all';

            if (allowedCities === 'all' || !city) {
                option.style.display = '';
            } else {
                const cityList = allowedCities.split(',').map(c => c.trim());
                const visible = cityList.includes(city) || city === 'Other';
                option.style.display = visible ? '' : 'none';

                // Uncheck hidden causes
                if (!visible) {
                    const cb = option.querySelector('input[type="checkbox"]');
                    if (cb) {
                        cb.checked = false;
                        option.classList.remove('selected');
                    }
                }
            }
        });
    }

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

            const inputs = block.querySelectorAll('input, select');
            inputs.forEach(input => {
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

            const inputs = block.querySelectorAll('input, select');
            inputs.forEach(input => {
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

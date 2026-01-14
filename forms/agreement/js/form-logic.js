/**
 * Contingency Agreement Form - Dynamic Logic
 * Handles adding/removing plaintiffs and defendants
 */

let plaintiffCount = 1;
let defendantCount = 1;

/**
 * Add a new plaintiff block
 */
function addPlaintiff() {
    plaintiffCount++;
    const container = document.getElementById('plaintiffs-container');

    const plaintiffBlock = document.createElement('div');
    plaintiffBlock.className = 'plaintiff-block';
    plaintiffBlock.setAttribute('data-plaintiff-number', plaintiffCount);

    plaintiffBlock.innerHTML = `
        <div class="block-header">
            <h3>Plaintiff ${plaintiffCount}</h3>
            <button type="button" class="btn-remove" onclick="removePlaintiff(${plaintiffCount})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="plaintiff-${plaintiffCount}-first-name">First Name <span class="required">*</span></label>
                <input type="text" id="plaintiff-${plaintiffCount}-first-name" name="plaintiff-${plaintiffCount}-first-name" required>
            </div>
            <div class="form-group">
                <label for="plaintiff-${plaintiffCount}-last-name">Last Name <span class="required">*</span></label>
                <input type="text" id="plaintiff-${plaintiffCount}-last-name" name="plaintiff-${plaintiffCount}-last-name" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group flex-2">
                <label for="plaintiff-${plaintiffCount}-address">Street Address <span class="required">*</span></label>
                <input type="text" id="plaintiff-${plaintiffCount}-address" name="plaintiff-${plaintiffCount}-address" required
                       placeholder="123 Main Street">
            </div>
            <div class="form-group flex-1">
                <label for="plaintiff-${plaintiffCount}-unit">Unit # (optional)</label>
                <input type="text" id="plaintiff-${plaintiffCount}-unit" name="plaintiff-${plaintiffCount}-unit"
                       placeholder="Apt 5">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="plaintiff-${plaintiffCount}-email">Email Address <span class="required">*</span></label>
                <input type="email" id="plaintiff-${plaintiffCount}-email" name="plaintiff-${plaintiffCount}-email" required
                       placeholder="john.doe@example.com">
            </div>
            <div class="form-group">
                <label for="plaintiff-${plaintiffCount}-phone">Phone Number <span class="required">*</span></label>
                <input type="tel" id="plaintiff-${plaintiffCount}-phone" name="plaintiff-${plaintiffCount}-phone" required
                       placeholder="(555) 123-4567">
            </div>
        </div>

        <div class="form-group minor-section">
            <label class="checkbox-label">
                <input type="checkbox" id="plaintiff-${plaintiffCount}-is-minor" name="plaintiff-${plaintiffCount}-is-minor"
                       onchange="toggleGuardianSelect(${plaintiffCount})">
                This plaintiff is a minor
            </label>

            <div id="plaintiff-${plaintiffCount}-guardian-container" class="guardian-select-container" style="display: none;">
                <label for="plaintiff-${plaintiffCount}-guardian">Guardian (select plaintiff) <span class="required">*</span></label>
                <select id="plaintiff-${plaintiffCount}-guardian" name="plaintiff-${plaintiffCount}-guardian">
                    <option value="">Select Guardian...</option>
                </select>
            </div>
        </div>
    `;

    container.appendChild(plaintiffBlock);

    // Update the hidden count input
    document.getElementById('plaintiff-count').value = plaintiffCount;

    // Show remove button on first plaintiff if there are now multiple
    if (plaintiffCount > 1) {
        const firstRemoveBtn = document.querySelector('[data-plaintiff-number="1"] .btn-remove');
        if (firstRemoveBtn) {
            firstRemoveBtn.style.display = 'inline-flex';
        }
    }

    // Update all guardian dropdowns
    updateGuardianSelects();

    // Scroll to new plaintiff
    plaintiffBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Remove a plaintiff block
 */
function removePlaintiff(number) {
    const block = document.querySelector(`[data-plaintiff-number="${number}"]`);
    if (block) {
        block.remove();

        // Renumber remaining plaintiffs
        const remainingBlocks = document.querySelectorAll('.plaintiff-block');
        plaintiffCount = 0;

        remainingBlocks.forEach((block, index) => {
            plaintiffCount = index + 1;
            const newNumber = index + 1;
            const oldNumber = block.getAttribute('data-plaintiff-number');

            // Update block number
            block.setAttribute('data-plaintiff-number', newNumber);

            // Update header
            block.querySelector('h3').textContent = `Plaintiff ${newNumber}`;

            // Update all IDs and names
            updatePlaintiffReferences(block, oldNumber, newNumber);
        });

        // Update the hidden count input
        document.getElementById('plaintiff-count').value = plaintiffCount;

        // Hide remove button on first plaintiff if only one remains
        if (plaintiffCount === 1) {
            const firstRemoveBtn = document.querySelector('[data-plaintiff-number="1"] .btn-remove');
            if (firstRemoveBtn) {
                firstRemoveBtn.style.display = 'none';
            }
        }

        // Update all guardian dropdowns
        updateGuardianSelects();
    }
}

/**
 * Update plaintiff field references after renumbering
 */
function updatePlaintiffReferences(block, oldNumber, newNumber) {
    // Update all input IDs and names
    const inputs = block.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.id) {
            input.id = input.id.replace(`plaintiff-${oldNumber}-`, `plaintiff-${newNumber}-`);
        }
        if (input.name) {
            input.name = input.name.replace(`plaintiff-${oldNumber}-`, `plaintiff-${newNumber}-`);
        }
    });

    // Update all label for attributes
    const labels = block.querySelectorAll('label[for]');
    labels.forEach(label => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
            label.setAttribute('for', forAttr.replace(`plaintiff-${oldNumber}-`, `plaintiff-${newNumber}-`));
        }
    });

    // Update onclick handlers
    const removeBtn = block.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.setAttribute('onclick', `removePlaintiff(${newNumber})`);
    }

    const minorCheckbox = block.querySelector('input[type="checkbox"]');
    if (minorCheckbox) {
        minorCheckbox.setAttribute('onchange', `toggleGuardianSelect(${newNumber})`);
    }

    // Update container IDs
    const guardianContainer = block.querySelector('.guardian-select-container');
    if (guardianContainer) {
        guardianContainer.id = `plaintiff-${newNumber}-guardian-container`;
    }
}

/**
 * Toggle guardian select visibility
 */
function toggleGuardianSelect(plaintiffNumber) {
    const checkbox = document.getElementById(`plaintiff-${plaintiffNumber}-is-minor`);
    const container = document.getElementById(`plaintiff-${plaintiffNumber}-guardian-container`);
    const select = document.getElementById(`plaintiff-${plaintiffNumber}-guardian`);

    if (checkbox.checked) {
        container.style.display = 'block';
        select.required = true;
        updateGuardianSelects();
    } else {
        container.style.display = 'none';
        select.required = false;
        select.value = '';
    }
}

/**
 * Update all guardian select dropdowns with current plaintiffs
 */
function updateGuardianSelects() {
    const plaintiffBlocks = document.querySelectorAll('.plaintiff-block');

    plaintiffBlocks.forEach(block => {
        const plaintiffNumber = parseInt(block.getAttribute('data-plaintiff-number'));
        const select = block.querySelector('select[name$="-guardian"]');

        if (select) {
            const currentValue = select.value;

            // Clear options
            select.innerHTML = '<option value="">Select Guardian...</option>';

            // Add all other plaintiffs as options
            plaintiffBlocks.forEach(otherBlock => {
                const otherNumber = parseInt(otherBlock.getAttribute('data-plaintiff-number'));

                // Can't be guardian of self
                if (otherNumber !== plaintiffNumber) {
                    const firstName = otherBlock.querySelector(`input[name="plaintiff-${otherNumber}-first-name"]`)?.value || '';
                    const lastName = otherBlock.querySelector(`input[name="plaintiff-${otherNumber}-last-name"]`)?.value || '';
                    const label = firstName || lastName ? `${firstName} ${lastName}`.trim() : `Plaintiff ${otherNumber}`;

                    const option = document.createElement('option');
                    option.value = otherNumber;
                    option.textContent = label;
                    select.appendChild(option);
                }
            });

            // Restore previous value if still valid
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            }
        }
    });
}

/**
 * Add a new defendant block
 */
function addDefendant() {
    defendantCount++;
    const container = document.getElementById('defendants-container');

    const defendantBlock = document.createElement('div');
    defendantBlock.className = 'defendant-block';
    defendantBlock.setAttribute('data-defendant-number', defendantCount);

    defendantBlock.innerHTML = `
        <div class="block-header">
            <h3>Defendant ${defendantCount}</h3>
            <button type="button" class="btn-remove" onclick="removeDefendant(${defendantCount})">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="defendant-${defendantCount}-first-name">First Name <span class="required">*</span></label>
                <input type="text" id="defendant-${defendantCount}-first-name" name="defendant-${defendantCount}-first-name" required>
            </div>
            <div class="form-group">
                <label for="defendant-${defendantCount}-last-name">Last Name <span class="required">*</span></label>
                <input type="text" id="defendant-${defendantCount}-last-name" name="defendant-${defendantCount}-last-name" required>
            </div>
        </div>
    `;

    container.appendChild(defendantBlock);

    // Update the hidden count input
    document.getElementById('defendant-count').value = defendantCount;

    // Show remove button on first defendant if there are now multiple
    if (defendantCount > 1) {
        const firstRemoveBtn = document.querySelector('[data-defendant-number="1"] .btn-remove');
        if (firstRemoveBtn) {
            firstRemoveBtn.style.display = 'inline-flex';
        }
    }

    // Scroll to new defendant
    defendantBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Remove a defendant block
 */
function removeDefendant(number) {
    const block = document.querySelector(`[data-defendant-number="${number}"]`);
    if (block) {
        block.remove();

        // Renumber remaining defendants
        const remainingBlocks = document.querySelectorAll('.defendant-block');
        defendantCount = 0;

        remainingBlocks.forEach((block, index) => {
            defendantCount = index + 1;
            const newNumber = index + 1;
            const oldNumber = block.getAttribute('data-defendant-number');

            // Update block number
            block.setAttribute('data-defendant-number', newNumber);

            // Update header
            block.querySelector('h3').textContent = `Defendant ${newNumber}`;

            // Update all IDs and names
            updateDefendantReferences(block, oldNumber, newNumber);
        });

        // Update the hidden count input
        document.getElementById('defendant-count').value = defendantCount;

        // Hide remove button on first defendant if only one remains
        if (defendantCount === 1) {
            const firstRemoveBtn = document.querySelector('[data-defendant-number="1"] .btn-remove');
            if (firstRemoveBtn) {
                firstRemoveBtn.style.display = 'none';
            }
        }
    }
}

/**
 * Update defendant field references after renumbering
 */
function updateDefendantReferences(block, oldNumber, newNumber) {
    // Update all input IDs and names
    const inputs = block.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.id) {
            input.id = input.id.replace(`defendant-${oldNumber}-`, `defendant-${newNumber}-`);
        }
        if (input.name) {
            input.name = input.name.replace(`defendant-${oldNumber}-`, `defendant-${newNumber}-`);
        }
    });

    // Update all label for attributes
    const labels = block.querySelectorAll('label[for]');
    labels.forEach(label => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
            label.setAttribute('for', forAttr.replace(`defendant-${oldNumber}-`, `defendant-${newNumber}-`));
        }
    });

    // Update onclick handler
    const removeBtn = block.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.setAttribute('onclick', `removeDefendant(${newNumber})`);
    }
}

// Update guardian selects when plaintiff names change
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('contingency-form').addEventListener('input', function(e) {
        if (e.target.matches('input[name*="plaintiff"][name*="-first-name"], input[name*="plaintiff"][name*="-last-name"]')) {
            updateGuardianSelects();
        }
    });
});

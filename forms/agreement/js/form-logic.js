/**
 * Contingency Agreement Form - Dynamic Logic
 * Handles adding/removing plaintiffs and defendants
 */

let plaintiffCount = 0;
let defendantCount = 0;

/**
 * Add a new plaintiff block
 */
function addPlaintiff() {
    plaintiffCount++;
    const container = document.getElementById('plaintiffs-container');

    const plaintiffDiv = document.createElement('div');
    plaintiffDiv.className = 'repeatable-section';
    plaintiffDiv.id = `plaintiff-${plaintiffCount}`;

    plaintiffDiv.innerHTML = `
        <div class="repeatable-header">
            <button type="button" class="repeatable-toggle" id="plaintiff-${plaintiffCount}-toggle" aria-expanded="true" aria-controls="plaintiff-${plaintiffCount}-content">
                <span class="repeatable-title">Plaintiff #${plaintiffCount}</span>
                <span class="repeatable-indicator" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>
            </button>
            <button type="button" class="btn btn-remove" onclick="removePlaintiff(${plaintiffCount})" title="Remove Plaintiff"><i class="fa-regular fa-trash-can"></i></button>
        </div>
        <div class="repeatable-content" id="plaintiff-${plaintiffCount}-content" role="region" aria-labelledby="plaintiff-${plaintiffCount}-toggle">
            <div class="form-grid">
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-first-name">First Name <span class="required">*</span></label>
                    <input type="text" id="plaintiff-${plaintiffCount}-first-name" name="plaintiff-${plaintiffCount}-first-name" required>
                </div>
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-last-name">Last Name <span class="required">*</span></label>
                    <input type="text" id="plaintiff-${plaintiffCount}-last-name" name="plaintiff-${plaintiffCount}-last-name" required>
                </div>
            </div>

            <div class="form-grid">
                <div class="form-group" style="flex: 9;">
                    <label for="plaintiff-${plaintiffCount}-email">Email Address <span class="required">*</span></label>
                    <input type="email" id="plaintiff-${plaintiffCount}-email" name="plaintiff-${plaintiffCount}-email" required
                           placeholder="john.doe@example.com">
                </div>
                <div class="form-group" style="flex: 9;">
                    <label for="plaintiff-${plaintiffCount}-phone">Phone Number <span class="required">*</span></label>
                    <input type="tel" id="plaintiff-${plaintiffCount}-phone" name="plaintiff-${plaintiffCount}-phone" required
                           placeholder="(555) 123-4567">
                </div>
                <div class="form-group" style="flex: 2;">
                    <label for="plaintiff-${plaintiffCount}-unit">Unit #</label>
                    <input type="text" id="plaintiff-${plaintiffCount}-unit" name="plaintiff-${plaintiffCount}-unit"
                           placeholder="Apt 5">
                </div>
            </div>

            <div class="form-grid" style="margin-top: 15px;">
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 0;">
                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; margin: 0; font-weight: normal;">
                        <input type="checkbox" id="plaintiff-${plaintiffCount}-is-minor" name="plaintiff-${plaintiffCount}-is-minor"
                               onchange="toggleGuardianSelect(${plaintiffCount})" style="margin: 0; width: auto;">
                        <span>This plaintiff is a minor</span>
                    </label>
                </div>
            </div>

            <div id="plaintiff-${plaintiffCount}-guardian-container" class="guardian-select-container" style="display: none; margin-top: 15px;">
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-guardian">Guardian (select plaintiff) <span class="required">*</span></label>
                    <select id="plaintiff-${plaintiffCount}-guardian" name="plaintiff-${plaintiffCount}-guardian">
                        <option value="">Select Guardian...</option>
                    </select>
                </div>
            </div>

            <div class="form-grid" style="margin-top: 15px;">
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 0;">
                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; margin: 0; font-weight: normal;">
                        <input type="checkbox" id="plaintiff-${plaintiffCount}-different-address" name="plaintiff-${plaintiffCount}-different-address"
                               onchange="togglePlaintiffAddress(${plaintiffCount})" style="margin: 0; width: auto;">
                        <span>Address is different from property address</span>
                    </label>
                </div>
            </div>

            <div id="plaintiff-${plaintiffCount}-address-container" class="plaintiff-address-container" style="display: none; margin-top: 15px;">
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-street">Street Address</label>
                    <input type="text" id="plaintiff-${plaintiffCount}-street" name="plaintiff-${plaintiffCount}-street"
                           placeholder="123 Main Street">
                </div>
                <div class="form-group">
                    <label for="plaintiff-${plaintiffCount}-city-state-zip">City, State, Zip</label>
                    <input type="text" id="plaintiff-${plaintiffCount}-city-state-zip" name="plaintiff-${plaintiffCount}-city-state-zip"
                           placeholder="Concord, NC, 28027">
                </div>
            </div>
        </div>
    `;

    container.appendChild(plaintiffDiv);
    initializeRepeatableSection(plaintiffDiv);

    // Update the hidden count input
    document.getElementById('plaintiff-count').value = plaintiffCount;

    // Update all guardian dropdowns
    updateGuardianSelects();

    // Scroll to new plaintiff
    plaintiffDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Initialize collapsible functionality for repeatable section
 */
function initializeRepeatableSection(section) {
    const toggle = section.querySelector('.repeatable-toggle');
    const content = section.querySelector('.repeatable-content');

    if (toggle && content) {
        toggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            content.style.display = isExpanded ? 'none' : 'block';

            const indicator = this.querySelector('.repeatable-indicator i');
            if (indicator) {
                indicator.className = isExpanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
            }
        });
    }
}

/**
 * Remove a plaintiff block
 */
function removePlaintiff(number) {
    const block = document.getElementById(`plaintiff-${number}`);
    if (block) {
        block.remove();

        // Renumber remaining plaintiffs
        const remainingBlocks = document.querySelectorAll('.repeatable-section[id^="plaintiff-"]');
        plaintiffCount = 0;

        remainingBlocks.forEach((block, index) => {
            plaintiffCount = index + 1;
            const newNumber = index + 1;
            const oldId = block.id;
            const oldNumber = oldId.replace('plaintiff-', '');

            // Update block ID
            block.id = `plaintiff-${newNumber}`;

            // Update title
            const title = block.querySelector('.repeatable-title');
            if (title) {
                title.textContent = `Plaintiff #${newNumber}`;
            }

            // Update all IDs and names
            updatePlaintiffReferences(block, oldNumber, newNumber);
        });

        // Update the hidden count input
        document.getElementById('plaintiff-count').value = plaintiffCount;

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

    // Update toggle button
    const toggle = block.querySelector('.repeatable-toggle');
    if (toggle) {
        toggle.id = `plaintiff-${newNumber}-toggle`;
        toggle.setAttribute('aria-controls', `plaintiff-${newNumber}-content`);
    }

    // Update content div
    const content = block.querySelector('.repeatable-content');
    if (content) {
        content.id = `plaintiff-${newNumber}-content`;
        content.setAttribute('aria-labelledby', `plaintiff-${newNumber}-toggle`);
    }

    // Update onclick handlers
    const removeBtn = block.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.setAttribute('onclick', `removePlaintiff(${newNumber})`);
    }

    const minorCheckbox = block.querySelector('input[name$="-is-minor"]');
    if (minorCheckbox) {
        minorCheckbox.setAttribute('onchange', `toggleGuardianSelect(${newNumber})`);
    }

    const differentAddressCheckbox = block.querySelector('input[name$="-different-address"]');
    if (differentAddressCheckbox) {
        differentAddressCheckbox.setAttribute('onchange', `togglePlaintiffAddress(${newNumber})`);
    }

    // Update container IDs
    const guardianContainer = block.querySelector('.guardian-select-container');
    if (guardianContainer) {
        guardianContainer.id = `plaintiff-${newNumber}-guardian-container`;
    }

    const addressContainer = block.querySelector('.plaintiff-address-container');
    if (addressContainer) {
        addressContainer.id = `plaintiff-${newNumber}-address-container`;
    }
}

/**
 * Toggle guardian select visibility
 */
function toggleGuardianSelect(plaintiffNumber) {
    const checkbox = document.getElementById(`plaintiff-${plaintiffNumber}-is-minor`);
    const container = document.getElementById(`plaintiff-${plaintiffNumber}-guardian-container`);
    const select = document.getElementById(`plaintiff-${plaintiffNumber}-guardian`);
    const emailField = document.getElementById(`plaintiff-${plaintiffNumber}-email`);
    const phoneField = document.getElementById(`plaintiff-${plaintiffNumber}-phone`);
    const emailGroup = emailField?.closest('.form-group');
    const phoneGroup = phoneField?.closest('.form-group');

    // Get the different address checkbox
    const differentAddressCheckbox = document.getElementById(`plaintiff-${plaintiffNumber}-different-address`);

    if (checkbox.checked) {
        container.style.display = 'block';
        select.required = true;
        updateGuardianSelects();

        // Hide and disable email/phone fields for minors
        if (emailGroup) {
            emailGroup.style.display = 'none';
        }
        if (phoneGroup) {
            phoneGroup.style.display = 'none';
        }

        // Clear values and remove required
        if (emailField) {
            emailField.value = '';
            emailField.required = false;
        }
        if (phoneField) {
            phoneField.value = '';
            phoneField.required = false;
        }

        // Disable and uncheck the different address checkbox for minors
        if (differentAddressCheckbox) {
            differentAddressCheckbox.checked = false;
            differentAddressCheckbox.disabled = true;
            // Hide the address container if it was open
            const addressContainer = document.getElementById(`plaintiff-${plaintiffNumber}-address-container`);
            if (addressContainer) {
                addressContainer.style.display = 'none';
            }
        }
    } else {
        container.style.display = 'none';
        select.required = false;
        select.value = '';

        // Show and restore email/phone fields
        if (emailGroup) {
            emailGroup.style.display = '';
        }
        if (phoneGroup) {
            phoneGroup.style.display = '';
        }

        // Restore required attribute
        if (emailField) {
            emailField.required = true;
            emailField.value = '';
        }
        if (phoneField) {
            phoneField.required = true;
            phoneField.value = '';
        }

        // Re-enable the different address checkbox for adults
        if (differentAddressCheckbox) {
            differentAddressCheckbox.disabled = false;
        }
    }
}

/**
 * Toggle plaintiff address fields visibility
 */
function togglePlaintiffAddress(plaintiffNumber) {
    const checkbox = document.getElementById(`plaintiff-${plaintiffNumber}-different-address`);
    const container = document.getElementById(`plaintiff-${plaintiffNumber}-address-container`);
    const streetField = document.getElementById(`plaintiff-${plaintiffNumber}-street`);
    const cityStateZipField = document.getElementById(`plaintiff-${plaintiffNumber}-city-state-zip`);

    if (checkbox.checked) {
        container.style.display = 'block';
        // Make fields required when checked
        if (streetField) streetField.required = true;
        if (cityStateZipField) cityStateZipField.required = true;
    } else {
        container.style.display = 'none';
        // Remove required and clear values when unchecked
        if (streetField) {
            streetField.required = false;
            streetField.value = '';
        }
        if (cityStateZipField) {
            cityStateZipField.required = false;
            cityStateZipField.value = '';
        }
    }
}

/**
 * Update all guardian select dropdowns with current plaintiffs
 */
function updateGuardianSelects() {
    const plaintiffBlocks = document.querySelectorAll('.repeatable-section[id^="plaintiff-"]');

    plaintiffBlocks.forEach(block => {
        const plaintiffId = block.id;
        const plaintiffNumber = parseInt(plaintiffId.replace('plaintiff-', ''));
        const select = block.querySelector('select[name$="-guardian"]');

        if (select) {
            const currentValue = select.value;

            // Clear options
            select.innerHTML = '<option value="">Select Guardian...</option>';

            // Add all other plaintiffs as options
            plaintiffBlocks.forEach(otherBlock => {
                const otherId = otherBlock.id;
                const otherNumber = parseInt(otherId.replace('plaintiff-', ''));

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

    const defendantDiv = document.createElement('div');
    defendantDiv.className = 'repeatable-section';
    defendantDiv.id = `defendant-${defendantCount}`;

    defendantDiv.innerHTML = `
        <div class="repeatable-header">
            <button type="button" class="repeatable-toggle" id="defendant-${defendantCount}-toggle" aria-expanded="true" aria-controls="defendant-${defendantCount}-content">
                <span class="repeatable-title">Defendant #${defendantCount}</span>
                <span class="repeatable-indicator" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>
            </button>
            <button type="button" class="btn btn-remove" onclick="removeDefendant(${defendantCount})" title="Remove Defendant"><i class="fa-regular fa-trash-can"></i></button>
        </div>
        <div class="repeatable-content" id="defendant-${defendantCount}-content" role="region" aria-labelledby="defendant-${defendantCount}-toggle">
            <div class="form-grid">
                <div class="form-group">
                    <label for="defendant-${defendantCount}-first-name">First Name <span class="required">*</span></label>
                    <input type="text" id="defendant-${defendantCount}-first-name" name="defendant-${defendantCount}-first-name" required>
                </div>
                <div class="form-group">
                    <label for="defendant-${defendantCount}-last-name">Last Name <span class="required">*</span></label>
                    <input type="text" id="defendant-${defendantCount}-last-name" name="defendant-${defendantCount}-last-name" required>
                </div>
            </div>
        </div>
    `;

    container.appendChild(defendantDiv);
    initializeRepeatableSection(defendantDiv);

    // Update the hidden count input
    document.getElementById('defendant-count').value = defendantCount;

    // Scroll to new defendant
    defendantDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Remove a defendant block
 */
function removeDefendant(number) {
    const block = document.getElementById(`defendant-${number}`);
    if (block) {
        block.remove();

        // Renumber remaining defendants
        const remainingBlocks = document.querySelectorAll('.repeatable-section[id^="defendant-"]');
        defendantCount = 0;

        remainingBlocks.forEach((block, index) => {
            defendantCount = index + 1;
            const newNumber = index + 1;
            const oldId = block.id;
            const oldNumber = oldId.replace('defendant-', '');

            // Update block ID
            block.id = `defendant-${newNumber}`;

            // Update title
            const title = block.querySelector('.repeatable-title');
            if (title) {
                title.textContent = `Defendant #${newNumber}`;
            }

            // Update all IDs and names
            updateDefendantReferences(block, oldNumber, newNumber);
        });

        // Update the hidden count input
        document.getElementById('defendant-count').value = defendantCount;
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

    // Update toggle button
    const toggle = block.querySelector('.repeatable-toggle');
    if (toggle) {
        toggle.id = `defendant-${newNumber}-toggle`;
        toggle.setAttribute('aria-controls', `defendant-${newNumber}-content`);
    }

    // Update content div
    const content = block.querySelector('.repeatable-content');
    if (content) {
        content.id = `defendant-${newNumber}-content`;
        content.setAttribute('aria-labelledby', `defendant-${newNumber}-toggle`);
    }

    // Update onclick handler
    const removeBtn = block.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.setAttribute('onclick', `removeDefendant(${newNumber})`);
    }
}

// Initialize first plaintiff and defendant on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add first plaintiff
    addPlaintiff();

    // Add first defendant
    addDefendant();

    // Update guardian selects when plaintiff names change
    document.getElementById('contingency-form').addEventListener('input', function(e) {
        if (e.target.matches('input[name*="plaintiff"][name*="-first-name"], input[name*="plaintiff"][name*="-last-name"]')) {
            updateGuardianSelects();
        }
    });
});

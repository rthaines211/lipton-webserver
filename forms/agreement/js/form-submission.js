/**
 * Contingency Agreement Form - Submission Logic
 * Handles form validation and submission to backend API
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contingency-form');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Collect form data
        const formData = collectFormData();

        // Show progress indicator
        showProgress('Submitting your request...');

        try {
            // Submit to API
            const response = await fetch('/api/contingency-entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                showProgress('Generating documents...');

                // TODO: Trigger document generation
                // For now, just show success message after a delay
                setTimeout(() => {
                    hideProgress();
                    showSuccessMessage(result);
                }, 1500);
            } else {
                hideProgress();
                showError('Submission failed: ' + (result.error || 'Unknown error'));
            }

        } catch (error) {
            console.error('Submission error:', error);
            hideProgress();
            showError('Failed to submit form. Please try again.');
        }
    });
});

/**
 * Collect all form data into an object
 */
function collectFormData() {
    const formData = {};

    // Property address
    formData['property-address'] = document.getElementById('property-address').value;

    // Plaintiff count
    const plaintiffCount = parseInt(document.getElementById('plaintiff-count').value);
    formData.plaintiffCount = plaintiffCount;

    // Collect plaintiff data
    for (let i = 1; i <= plaintiffCount; i++) {
        formData[`plaintiff-${i}-first-name`] = document.getElementById(`plaintiff-${i}-first-name`)?.value || '';
        formData[`plaintiff-${i}-last-name`] = document.getElementById(`plaintiff-${i}-last-name`)?.value || '';
        formData[`plaintiff-${i}-address`] = document.getElementById(`plaintiff-${i}-address`)?.value || '';
        formData[`plaintiff-${i}-unit`] = document.getElementById(`plaintiff-${i}-unit`)?.value || '';
        formData[`plaintiff-${i}-email`] = document.getElementById(`plaintiff-${i}-email`)?.value || '';
        formData[`plaintiff-${i}-phone`] = document.getElementById(`plaintiff-${i}-phone`)?.value || '';

        const isMinorCheckbox = document.getElementById(`plaintiff-${i}-is-minor`);
        formData[`plaintiff-${i}-is-minor`] = isMinorCheckbox?.checked || false;

        if (isMinorCheckbox?.checked) {
            formData[`plaintiff-${i}-guardian`] = document.getElementById(`plaintiff-${i}-guardian`)?.value || '';
        }
    }

    // Defendant count
    const defendantCount = parseInt(document.getElementById('defendant-count').value);
    formData.defendantCount = defendantCount;

    // Collect defendant data
    for (let i = 1; i <= defendantCount; i++) {
        formData[`defendant-${i}-first-name`] = document.getElementById(`defendant-${i}-first-name`)?.value || '';
        formData[`defendant-${i}-last-name`] = document.getElementById(`defendant-${i}-last-name`)?.value || '';
    }

    // Add metadata
    formData.submittedAt = new Date().toISOString();

    return formData;
}

/**
 * Show progress indicator
 */
function showProgress(message) {
    const container = document.getElementById('progress-container');
    const messageEl = document.getElementById('progress-message');

    if (messageEl) {
        messageEl.textContent = message;
    }

    if (container) {
        container.style.display = 'flex';
    }
}

/**
 * Hide progress indicator
 */
function hideProgress() {
    const container = document.getElementById('progress-container');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Show success message
 */
function showSuccessMessage(result) {
    const plaintiffCount = parseInt(document.getElementById('plaintiff-count').value);
    const plural = plaintiffCount > 1 ? 's' : '';

    alert(`Success! Your contingency agreement${plural} ha${plural === 's' ? 've' : 's'} been submitted.\n\nCase ID: ${result.id}\n\n${plaintiffCount} agreement${plural} will be generated (one per plaintiff).`);

    // Reset form
    document.getElementById('contingency-form').reset();

    // Reset to 1 plaintiff and 1 defendant
    resetFormToDefaults();
}

/**
 * Show error message
 */
function showError(message) {
    alert('Error: ' + message);
}

/**
 * Reset form to default state (1 plaintiff, 1 defendant)
 */
function resetFormToDefaults() {
    // Remove all but first plaintiff
    const plaintiffBlocks = document.querySelectorAll('.plaintiff-block');
    for (let i = 1; i < plaintiffBlocks.length; i++) {
        plaintiffBlocks[i].remove();
    }

    // Remove all but first defendant
    const defendantBlocks = document.querySelectorAll('.defendant-block');
    for (let i = 1; i < defendantBlocks.length; i++) {
        defendantBlocks[i].remove();
    }

    // Reset counts
    plaintiffCount = 1;
    defendantCount = 1;
    document.getElementById('plaintiff-count').value = 1;
    document.getElementById('defendant-count').value = 1;

    // Hide remove buttons
    const firstPlaintiffRemove = document.querySelector('[data-plaintiff-number="1"] .btn-remove');
    if (firstPlaintiffRemove) {
        firstPlaintiffRemove.style.display = 'none';
    }

    const firstDefendantRemove = document.querySelector('[data-defendant-number="1"] .btn-remove');
    if (firstDefendantRemove) {
        firstDefendantRemove.style.display = 'none';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

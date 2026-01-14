/**
 * Contingency Agreement Form - Submission Logic
 * Handles form validation and submission to backend API
 */

/**
 * Get authentication token from URL parameters
 * @returns {string|null} The token if found, null otherwise
 */
function getAuthToken() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

/**
 * Get authentication headers for fetch requests
 * @returns {Object} Headers object with Authorization if token is present
 */
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

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
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                if (result.documentStatus === 'completed') {
                    showProgress('Documents generated successfully!');

                    // Trigger download after a short delay
                    setTimeout(() => {
                        hideProgress();
                        downloadDocuments(result.id);
                        showSuccessMessage(result);
                    }, 1500);
                } else if (result.documentStatus === 'failed') {
                    showProgress('Form submitted, but document generation failed.');
                    setTimeout(() => {
                        hideProgress();
                        showSuccessMessage(result);
                    }, 1500);
                } else {
                    showProgress('Processing documents...');
                    setTimeout(() => {
                        hideProgress();
                        showSuccessMessage(result);
                    }, 1500);
                }
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

    // Property address (now broken into separate fields)
    const streetEl = document.getElementById('property-street');
    const cityEl = document.getElementById('property-city');
    const stateEl = document.getElementById('property-state');
    const zipEl = document.getElementById('property-zip');

    formData['property-street'] = streetEl ? streetEl.value : '';
    formData['property-city'] = cityEl ? cityEl.value : '';
    formData['property-state'] = stateEl ? stateEl.value : '';
    formData['property-zip'] = zipEl ? zipEl.value : '';

    // Plaintiff count
    const plaintiffCount = parseInt(document.getElementById('plaintiff-count').value);
    formData.plaintiffCount = plaintiffCount;

    // Collect plaintiff data
    for (let i = 1; i <= plaintiffCount; i++) {
        formData[`plaintiff-${i}-first-name`] = document.getElementById(`plaintiff-${i}-first-name`)?.value || '';
        formData[`plaintiff-${i}-last-name`] = document.getElementById(`plaintiff-${i}-last-name`)?.value || '';
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

    let message = `Success! Your contingency agreement${plural} ha${plural === 's' ? 've' : 's'} been submitted.\n\nCase ID: ${result.id}`;

    if (result.documentStatus === 'completed') {
        message += `\n\n${result.generatedDocuments.length} agreement${plural} generated successfully!`;
    } else if (result.documentStatus === 'failed') {
        message += '\n\nNote: Document generation failed. Please contact support.';
    }

    alert(message);

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
    // Clear plaintiff container and re-add first plaintiff
    const plaintiffContainer = document.getElementById('plaintiffs-container');
    plaintiffContainer.innerHTML = '';

    // Clear defendant container and re-add first defendant
    const defendantContainer = document.getElementById('defendants-container');
    defendantContainer.innerHTML = '';

    // Reset counts in form-logic.js
    if (typeof window.plaintiffCount !== 'undefined') {
        window.plaintiffCount = 0;
    }
    if (typeof window.defendantCount !== 'undefined') {
        window.defendantCount = 0;
    }

    document.getElementById('plaintiff-count').value = 0;
    document.getElementById('defendant-count').value = 0;

    // Re-add first plaintiff and defendant by calling the functions
    if (typeof addPlaintiff === 'function') {
        addPlaintiff();
    }
    if (typeof addDefendant === 'function') {
        addDefendant();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Download documents for a case as a zip file
 */
function downloadDocuments(caseId) {
    // Create a hidden link and trigger download
    const downloadUrl = `/api/contingency-entries/${caseId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `ContingencyAgreements_${caseId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

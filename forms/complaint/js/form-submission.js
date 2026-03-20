/**
 * Complaint Form Submission
 * Handles form submit, SSE progress streaming, and file download
 */
(function() {
    'use strict';

    function init() {
        const form = document.getElementById('complaint-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }

        // Highlight warning modal buttons
        const goBackBtn = document.getElementById('highlight-go-back');
        if (goBackBtn) {
            goBackBtn.addEventListener('click', function() {
                hideHighlightWarning(false);
            });
        }

        const continueBtn = document.getElementById('highlight-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                this.disabled = true;
                hideHighlightWarning(true);
                proceedWithSubmit();
            });
        }
    }

    let _pendingFormData = null;

    async function handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        // Check for fields that will be yellow-highlighted
        const missingFields = getMissingHighlightFields();
        if (missingFields.length > 0) {
            _pendingFormData = collectFormData();
            showHighlightWarning(missingFields);
            return;
        }

        // No missing fields — proceed directly
        _pendingFormData = collectFormData();
        proceedWithSubmit();
    }

    async function proceedWithSubmit() {
        const formData = _pendingFormData;
        _pendingFormData = null;

        showProgress();
        updateProgress(5, 'Submitting form data...');

        try {
            const response = await fetch('/api/complaint-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Submission failed');
            }

            updateProgress(10, 'Form submitted. Generating document...');
            connectSSE(result.jobId);

        } catch (err) {
            hideProgress();
            document.getElementById('submit-btn').disabled = false;
            alert('Error submitting form: ' + err.message);
        }
    }

    function collectFormData() {
        const data = {};

        // Case info
        data['case-name'] = document.getElementById('case-name').value;
        data['property-address'] = document.getElementById('property-address').value;
        data['case-number'] = document.getElementById('case-number').value;
        data['filing-date'] = document.getElementById('filing-date').value;
        data['city'] = document.getElementById('city').value;
        data['county'] = document.getElementById('county').value;
        data['move-in-date'] = document.getElementById('move-in-date').value;
        data['pronouns'] = document.getElementById('pronouns').value;

        // Plaintiff count
        data.plaintiffCount = document.getElementById('plaintiff-count').value;

        // Plaintiffs
        const plaintiffBlocks = document.querySelectorAll('#plaintiffs-container .party-block');
        plaintiffBlocks.forEach((block, i) => {
            const num = i + 1;
            const firstName = block.querySelector(`[name="plaintiff-${num}-first-name"]`);
            const lastName = block.querySelector(`[name="plaintiff-${num}-last-name"]`);
            const type = block.querySelector(`[name="plaintiff-${num}-type"]`);
            const guardian = block.querySelector(`[name="plaintiff-${num}-guardian"]`);
            if (firstName) data[`plaintiff-${num}-first-name`] = firstName.value;
            if (lastName) data[`plaintiff-${num}-last-name`] = lastName.value;
            if (type) data[`plaintiff-${num}-type`] = type.value;
            if (guardian && guardian.value) data[`plaintiff-${num}-guardian`] = guardian.value;
            const unit = block.querySelector(`[name="plaintiff-${num}-unit"]`);
            if (unit && unit.value) data[`plaintiff-${num}-unit`] = unit.value;
        });

        // Defendant count
        data.defendantCount = document.getElementById('defendant-count').value;

        // Defendants
        const defendantBlocks = document.querySelectorAll('#defendants-container .party-block');
        defendantBlocks.forEach((block, i) => {
            const num = i + 1;
            const firstName = block.querySelector(`[name="defendant-${num}-first-name"]`);
            const lastName = block.querySelector(`[name="defendant-${num}-last-name"]`);
            const type = block.querySelector(`[name="defendant-${num}-type"]`);
            if (firstName) data[`defendant-${num}-first-name`] = firstName.value;
            if (lastName) data[`defendant-${num}-last-name`] = lastName.value;
            if (type) data[`defendant-${num}-type`] = type.value;
        });

        // Causes of action from all sections (general + special + city)
        const causes = [];
        document.querySelectorAll('#page-2 .cause-row input[type="checkbox"]:checked').forEach(cb => {
            causes.push(cb.value);
        });
        data.causesOfAction = causes;

        return data;
    }

    function getMissingHighlightFields() {
        const missing = [];
        const singleFields = document.getElementById('single-plaintiff-fields');

        // Only check when single-plaintiff fields are visible
        if (singleFields && singleFields.style.display !== 'none') {
            const moveInDate = document.getElementById('move-in-date');
            if (moveInDate && moveInDate.value === '') {
                missing.push('Move In Date');
            }

            const pronouns = document.getElementById('pronouns');
            if (pronouns && pronouns.value === '') {
                missing.push('Pronoun references (he/she, his/her, him/her)');
            }
        }

        return missing;
    }

    function showHighlightWarning(missingFields) {
        const overlay = document.getElementById('highlight-warning-overlay');
        const fieldsContainer = document.getElementById('highlight-warning-fields');

        // Populate field rows (field names are hardcoded strings, not user input — no XSS risk)
        fieldsContainer.innerHTML = missingFields.map(field =>
            `<div class="highlight-warning-field-row">
                <span class="highlight-warning-swatch"></span>
                ${field}
            </div>`
        ).join('');

        overlay.style.display = 'flex';

        // Re-enable Continue button (may have been disabled from previous attempt)
        document.getElementById('highlight-continue').disabled = false;

        // Focus the Continue button for keyboard users
        document.getElementById('highlight-continue').focus();

        // Escape key handler
        overlay._escHandler = function(e) {
            if (e.key === 'Escape') hideHighlightWarning(false);
        };
        document.addEventListener('keydown', overlay._escHandler);

        // Backdrop click handler
        overlay._backdropHandler = function(e) {
            if (e.target === overlay) hideHighlightWarning(false);
        };
        overlay.addEventListener('click', overlay._backdropHandler);
    }

    function hideHighlightWarning(proceed) {
        const overlay = document.getElementById('highlight-warning-overlay');
        overlay.style.display = 'none';

        // Remove escape handler
        if (overlay._escHandler) {
            document.removeEventListener('keydown', overlay._escHandler);
            overlay._escHandler = null;
        }

        // Remove backdrop handler
        if (overlay._backdropHandler) {
            overlay.removeEventListener('click', overlay._backdropHandler);
            overlay._backdropHandler = null;
        }

        if (!proceed) {
            // Go Back — navigate to page 1 where the fields are
            const page1Btn = document.querySelector('[data-page="1"]');
            if (page1Btn) page1Btn.click();
            document.getElementById('submit-btn').disabled = false;
        }
    }

    function connectSSE(jobId) {
        const es = new EventSource(`/api/complaint-entries/jobs/${jobId}/stream`);

        es.addEventListener('progress', function(e) {
            const { progress, message } = JSON.parse(e.data);
            updateProgress(progress, message);
        });

        es.addEventListener('complete', function(e) {
            const { filename } = JSON.parse(e.data);
            es.close();
            updateProgress(100, 'Document ready! Downloading...');

            // Auto-download
            setTimeout(() => {
                window.location.href = `/api/complaint-entries/jobs/${jobId}/download`;
                setTimeout(() => {
                    hideProgress();
                    document.getElementById('submit-btn').disabled = false;
                }, 2000);
            }, 500);
        });

        es.addEventListener('error', function(e) {
            if (e.data) {
                const { error } = JSON.parse(e.data);
                alert('Document generation failed: ' + error);
            }
            es.close();
            hideProgress();
            document.getElementById('submit-btn').disabled = false;
        });

        es.onerror = function() {
            es.close();
            hideProgress();
            document.getElementById('submit-btn').disabled = false;
        };
    }

    function showProgress() {
        document.getElementById('progress-overlay').style.display = 'flex';
    }

    function hideProgress() {
        document.getElementById('progress-overlay').style.display = 'none';
    }

    function updateProgress(percent, message) {
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';
        if (message) {
            document.getElementById('progress-message').textContent = message;
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();

/**
 * Form Submission Module
 * Orchestrates: validate → gap check → upload all files → generate → SSE progress → duplicate resolution → download.
 */

const FormSubmission = (() => {

    function init() {
        const btn = document.getElementById('btn-generate');
        btn.addEventListener('click', handleGenerate);

        // Blur validation for required fields
        const caseName = document.getElementById('case-name');
        const caseDesc = document.getElementById('case-description');

        caseName.addEventListener('blur', () => validateField(caseName, 'case-name-error'));
        caseDesc.addEventListener('blur', () => validateField(caseDesc, 'case-description-error'));

        // Clear error on input
        caseName.addEventListener('input', () => clearFieldError(caseName, 'case-name-error'));
        caseDesc.addEventListener('input', () => clearFieldError(caseDesc, 'case-description-error'));
    }

    /**
     * Validate a required field. Returns true if valid.
     */
    function validateField(inputEl, errorId) {
        const value = inputEl.value.trim();
        const errorEl = document.getElementById(errorId);
        if (!value) {
            inputEl.classList.add('input-error');
            errorEl.textContent = 'This field is required.';
            return false;
        }
        inputEl.classList.remove('input-error');
        errorEl.textContent = '';
        return true;
    }

    function clearFieldError(inputEl, errorId) {
        if (inputEl.value.trim()) {
            inputEl.classList.remove('input-error');
            document.getElementById(errorId).textContent = '';
        }
    }

    /**
     * Validate all required fields. Returns true if all valid.
     */
    function validateRequiredFields() {
        const caseName = document.getElementById('case-name');
        const caseDesc = document.getElementById('case-description');

        const nameValid = validateField(caseName, 'case-name-error');
        const descValid = validateField(caseDesc, 'case-description-error');

        if (!nameValid) {
            caseName.focus();
            caseName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (!descValid) {
            caseDesc.focus();
            caseDesc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return nameValid && descValid;
    }

    async function handleGenerate() {
        // Step 1: Validate required fields
        if (!validateRequiredFields()) return;

        const btn = document.getElementById('btn-generate');
        btn.disabled = true;

        // Step 2: Gap detection
        if (typeof GapDetector !== 'undefined') {
            const gapResult = await GapDetector.checkOnSubmit();
            if (gapResult === 'collapse') {
                // Gaps were collapsed — re-enable button, let user review and re-submit
                btn.disabled = false;
                return;
            }
            // 'continue' or 'none' — proceed with generation
        }

        const sessionId = ExhibitManager.getSessionId();
        const caseName = document.getElementById('case-name').value.trim();
        const exhibits = ExhibitManager.getExhibits();

        try {
            // Phase 1: Upload all files to server
            showProgress('Uploading Files', 0, 'Preparing uploads...');

            const activeLetters = ExhibitManager.getActiveExhibits();
            let uploadCount = 0;

            await FileUploader.uploadAllExhibits(sessionId, exhibits, (letter, status) => {
                if (status === 'done') {
                    uploadCount++;
                    const pct = Math.round((uploadCount / activeLetters.length) * 20);
                    updateProgress(pct, `Uploaded Exhibit ${letter}...`);
                }
            });

            updateProgress(20, 'All files uploaded. Starting generation...');

            // Phase 2: Trigger generation
            const genResponse = await fetch('/api/exhibits/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, caseName }),
            });

            if (!genResponse.ok) {
                const err = await genResponse.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to start generation');
            }

            const { jobId } = await genResponse.json();

            // Phase 3: Connect SSE for progress
            await connectSSE(jobId);

        } catch (error) {
            hideProgress();
            alert(`Error: ${error.message}`);
            btn.disabled = false;
        }
    }

    function connectSSE(jobId) {
        return new Promise((resolve, reject) => {
            const evtSource = new EventSource(`/api/exhibits/jobs/${jobId}/stream`);

            evtSource.addEventListener('progress', (e) => {
                const data = JSON.parse(e.data);
                const displayPct = 20 + Math.round(data.progress * 0.8);
                updateProgress(displayPct, data.message);
            });

            evtSource.addEventListener('duplicates', async (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();

                hideProgress();
                console.log('[duplicates] showing modal, report:', JSON.stringify(data.duplicates));
                let resolutions;
                try {
                    resolutions = await DuplicateUI.showModal(data.duplicates);
                } catch (modalErr) {
                    console.error('[duplicates] modal error:', modalErr);
                    alert('Error showing duplicate modal: ' + modalErr.message);
                    document.getElementById('btn-generate').disabled = false;
                    return;
                }
                console.log('[duplicates] modal resolved, resolutions:', JSON.stringify(resolutions));

                showProgress('Processing Exhibits', 30, 'Resuming after duplicate resolution...');

                const resolveResponse = await fetch(`/api/exhibits/jobs/${jobId}/resolve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resolutions }),
                });

                if (!resolveResponse.ok) {
                    throw new Error('Failed to resolve duplicates');
                }

                connectSSE(jobId).then(resolve).catch(reject);
            });

            evtSource.addEventListener('complete', (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();
                updateProgress(100, 'Complete! Downloading...');

                setTimeout(() => {
                    window.location.href = `/api/exhibits/jobs/${jobId}/download`;
                    hideProgress();
                    document.getElementById('btn-generate').disabled = false;
                    // Reset form to default state
                    document.getElementById('case-name').value = '';
                    document.getElementById('case-description').value = '';
                    ExhibitManager.clearAll();
                }, 500);

                resolve();
            });

            evtSource.addEventListener('error', (e) => {
                if (evtSource.readyState === EventSource.CLOSED) return;
            });

            evtSource.addEventListener('error', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data && data.error) {
                        evtSource.close();
                        hideProgress();
                        alert(`Processing error: ${data.error}`);
                        document.getElementById('btn-generate').disabled = false;
                        reject(new Error(data.error));
                    }
                } catch {
                    // Not our JSON error event, ignore
                }
            });

            evtSource.onerror = () => {
                // Connection lost - don't reject immediately, SSE may reconnect
            };
        });
    }

    function showProgress(title, percent, message) {
        document.getElementById('progress-overlay').style.display = 'flex';
        document.getElementById('progress-title').textContent = title;
        updateProgress(percent, message);
    }

    function updateProgress(percent, message) {
        document.getElementById('progress-bar').style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';
        if (message) {
            document.getElementById('progress-message').textContent = message;
        }
    }

    function hideProgress() {
        document.getElementById('progress-overlay').style.display = 'none';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        handleGenerate,
    };
})();

/**
 * Form Submission Module
 * Orchestrates: validate → gap check → upload all files → generate → SSE progress → duplicate resolution → download.
 */

const FormSubmission = (() => {

    function init() {
        const btn = document.getElementById('btn-generate');
        btn.addEventListener('click', () => {
            const dropboxPanel = document.getElementById('dropbox-panel');
            if (dropboxPanel && dropboxPanel.style.display !== 'none') {
                handleGenerateFromDropbox();
            } else {
                handleGenerate();
            }
        });

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

    /**
     * Handle generate from Dropbox import.
     * Skips the upload phase — sends exhibit mapping to server for server-side download.
     */
    async function handleGenerateFromDropbox() {
        if (!validateRequiredFields()) return;

        const caseName = document.getElementById('case-name').value.trim();
        const exhibitMapping = DropboxBrowserUI.getExhibitMapping();
        const totalFiles = DropboxBrowserUI.getTotalFiles();

        if (totalFiles === 0) {
            alert('Please assign at least one file to an exhibit slot');
            return;
        }

        const btn = document.getElementById('btn-generate');
        btn.disabled = true;

        // Determine mode
        const defaultMode = totalFiles >= 50 ? 'async' : 'realtime';
        let mode = defaultMode;

        if (totalFiles >= 40 && totalFiles < 60) {
            const useAsync = confirm(
                `You have ${totalFiles} files. Would you like to process in the background?\n\n` +
                `OK = Background processing (email notification when done)\n` +
                `Cancel = Wait for results now`
            );
            mode = useAsync ? 'async' : 'realtime';
        }

        if (mode === 'async') {
            const email = prompt('Enter email for notification when processing is complete:');
            try {
                const res = await fetch('/api/exhibits/generate-from-dropbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caseName, exhibitMapping, mode: 'async', email }),
                });
                const data = await res.json();

                if (data.success) {
                    alert(data.message);
                    document.getElementById('btn-show-jobs').style.display = 'inline';
                    if (typeof JobsDashboard !== 'undefined') JobsDashboard.show();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Failed to start processing: ' + error.message);
            }
            btn.disabled = false;
            return;
        }

        // Real-time mode
        showProgress('Downloading from Dropbox', 0, 'Starting Dropbox download...');
        try {
            const res = await fetch('/api/exhibits/generate-from-dropbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseName, exhibitMapping, mode: 'realtime' }),
            });
            const data = await res.json();

            if (!data.success) {
                hideProgress();
                alert('Error: ' + data.error);
                btn.disabled = false;
                return;
            }

            await connectSSE(data.jobId);
        } catch (error) {
            hideProgress();
            alert('Failed: ' + error.message);
            btn.disabled = false;
        }
    }

    function connectSSE(jobId) {
        return new Promise((resolve, reject) => {
            const evtSource = new EventSource(`/api/exhibits/jobs/${jobId}/stream`);

            evtSource.addEventListener('progress', (e) => {
                const data = JSON.parse(e.data);
                const displayPct = 20 + Math.round(data.progress * 0.8);
                updateProgress(displayPct, data.message, data.phase, data.timestamp);
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

                // Use signed GCS URL directly (works across Cloud Run instances)
                if (data.downloadUrl) {
                    const a = document.createElement('a');
                    a.href = data.downloadUrl;
                    a.download = data.filename || 'exhibit-package.pdf';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    // Fallback: fetch from server (local dev)
                    (async () => {
                        try {
                            const resp = await fetch(`/api/exhibits/jobs/${jobId}/download`);
                            if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
                            const blob = await resp.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = data.filename || 'exhibit-package.pdf';
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                        } catch (err) {
                            console.error('Download failed:', err);
                            alert('Failed to download the exhibit package. Please try again.');
                        }
                    })();
                }

                hideProgress();
                document.getElementById('btn-generate').disabled = false;
                document.getElementById('case-name').value = '';
                document.getElementById('case-description').value = '';
                ExhibitManager.clearAll();

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

    // Phase label mapping
    const PHASE_LABELS = {
        starting: 'Starting',
        validation: 'Validating',
        duplicate_detection: 'Scanning for Duplicates',
        processing: 'Processing Files',
        stamping: 'Applying Bates Stamps',
        finalizing: 'Finalizing',
    };

    // Progress state for elapsed timer and stale detection
    let progressState = {
        startTime: null,
        lastEventTime: null,
        staleTimer: null,
        staleActive: false,
        tickInterval: null,
        currentPercent: 0,
    };

    function tickElapsed() {
        if (!progressState.startTime || progressState.currentPercent >= 100) return;
        const elapsedSec = Math.round((Date.now() - progressState.startTime) / 1000);
        if (elapsedSec >= 1) {
            const text = elapsedSec >= 60
                ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s elapsed`
                : `${elapsedSec}s elapsed`;
            document.getElementById('progress-eta').textContent = text;
        }
    }

    function showProgress(title, percent, message) {
        document.getElementById('progress-overlay').style.display = 'flex';
        document.getElementById('progress-title').textContent = title;
        document.getElementById('progress-phase').textContent = '';
        document.getElementById('progress-eta').textContent = '';
        if (progressState.staleTimer) clearTimeout(progressState.staleTimer);
        if (progressState.tickInterval) clearInterval(progressState.tickInterval);
        progressState = { startTime: null, lastEventTime: null, staleTimer: null, staleActive: false, tickInterval: null, currentPercent: 0 };
        progressState.tickInterval = setInterval(tickElapsed, 1000);
        updateProgress(percent, message);
    }

    function updateProgress(percent, message, phase, timestamp) {
        const bar = document.getElementById('progress-bar');
        bar.style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';

        if (percent >= 100) {
            bar.classList.add('complete');
        } else {
            bar.classList.remove('complete');
        }

        if (message) {
            const msgEl = document.getElementById('progress-message');
            msgEl.textContent = message;
            msgEl.classList.remove('progress-stale');
        }

        // Phase label
        if (phase && PHASE_LABELS[phase]) {
            document.getElementById('progress-phase').textContent = PHASE_LABELS[phase];
        }

        // Track timing for elapsed display (interval handles rendering)
        if (timestamp) {
            const now = Date.now();
            if (!progressState.startTime && percent > 0) {
                progressState.startTime = now;
            }
            progressState.lastEventTime = now;
            progressState.staleActive = false;
            progressState.currentPercent = percent;

            if (percent >= 100) {
                document.getElementById('progress-eta').textContent = '';
            }

            // Reset stale timer
            resetStaleTimer();
        }
    }

    function resetStaleTimer() {
        if (progressState.staleTimer) {
            clearTimeout(progressState.staleTimer);
        }
        // After 5 seconds with no event, show "Still processing..."
        progressState.staleTimer = setTimeout(() => {
            const msgEl = document.getElementById('progress-message');
            if (!progressState.staleActive) {
                progressState.staleActive = true;
                msgEl.textContent = 'Still processing...';
            }
            // After 15 seconds total, add pulse animation
            progressState.staleTimer = setTimeout(() => {
                msgEl.classList.add('progress-stale');
            }, 10000);
        }, 5000);
    }

    function hideProgress() {
        document.getElementById('progress-overlay').style.display = 'none';
        if (progressState.staleTimer) clearTimeout(progressState.staleTimer);
        if (progressState.tickInterval) clearInterval(progressState.tickInterval);
        progressState = { startTime: null, lastEventTime: null, staleTimer: null, staleActive: false, tickInterval: null, currentPercent: 0 };
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

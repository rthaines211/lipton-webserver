/**
 * Form Submission Module
 * Orchestrates: validate → generate from Dropbox → SSE progress → duplicate resolution → download.
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
        const ASYNC_THRESHOLD = 2000;
        const defaultMode = totalFiles >= ASYNC_THRESHOLD ? 'async' : 'realtime';
        let mode = defaultMode;

        if (totalFiles >= ASYNC_THRESHOLD - 10 && totalFiles < ASYNC_THRESHOLD + 10) {
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

            evtSource.addEventListener('scan-complete', (e) => {
                const data = JSON.parse(e.data);

                if (data.duplicates) {
                    // Redirect to review page for duplicate resolution
                    evtSource.close();
                    window.location.href = `/exhibits/review.html?jobId=${jobId}`;
                } else {
                    // No duplicates — show message and continue
                    updateProgress(40, 'No duplicates detected — proceeding to processing...', 'processing');
                }
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

    /**
     * Check for resume params (returning from review page after duplicate resolution).
     */
    function checkResumeParams() {
        const params = new URLSearchParams(window.location.search);
        const resumeJobId = params.get('jobId');
        const isResume = params.get('resume') === 'true';

        if (isResume && resumeJobId) {
            showProgress('Processing Exhibits', 30, 'Resuming after duplicate resolution...');
            connectSSE(resumeJobId);

            // Clean up URL
            window.history.replaceState({}, '', '/exhibits/');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            checkResumeParams();
        });
    } else {
        init();
        checkResumeParams();
    }

    return {
        handleGenerate,
    };
})();

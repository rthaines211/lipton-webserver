/**
 * Form Submission Module
 * Orchestrates: upload all files → generate → SSE progress → duplicate resolution → download.
 */

const FormSubmission = (() => {

    function init() {
        const btn = document.getElementById('btn-generate');
        btn.addEventListener('click', handleGenerate);
    }

    async function handleGenerate() {
        const btn = document.getElementById('btn-generate');
        btn.disabled = true;

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
                // Map server 0-100 to our 20-100 range (first 20% was upload)
                const displayPct = 20 + Math.round(data.progress * 0.8);
                updateProgress(displayPct, data.message);
            });

            evtSource.addEventListener('duplicates', async (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();

                // Hide progress, show duplicate modal
                hideProgress();
                const resolutions = await DuplicateUI.showModal(data.duplicates);

                // Send resolutions and reconnect SSE
                showProgress('Processing Exhibits', 30, 'Resuming after duplicate resolution...');

                const resolveResponse = await fetch(`/api/exhibits/jobs/${jobId}/resolve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resolutions }),
                });

                if (!resolveResponse.ok) {
                    throw new Error('Failed to resolve duplicates');
                }

                // Reconnect SSE for remaining progress
                connectSSE(jobId).then(resolve).catch(reject);
            });

            evtSource.addEventListener('complete', (e) => {
                const data = JSON.parse(e.data);
                evtSource.close();
                updateProgress(100, 'Complete! Downloading...');

                // Trigger download
                setTimeout(() => {
                    window.location.href = `/api/exhibits/jobs/${jobId}/download`;
                    hideProgress();
                    document.getElementById('btn-generate').disabled = false;
                }, 500);

                resolve();
            });

            evtSource.addEventListener('error', (e) => {
                // SSE error event (not our custom error)
                if (evtSource.readyState === EventSource.CLOSED) return;
                // Try to read error data if it's our custom event
            });

            // Custom error event from server
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
                // If it's permanently closed, the user will see stale progress
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

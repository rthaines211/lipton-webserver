/**
 * Jobs Dashboard
 * Displays recent exhibit processing jobs with status polling.
 */
const JobsDashboard = (() => {
    let pollInterval = null;

    async function loadJobs() {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            if (data.success) {
                renderJobs(data.jobs);
                const hasActive = data.jobs.some(j =>
                    ['pending', 'downloading', 'processing'].includes(j.status)
                );
                if (!hasActive) stopPolling();
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    }

    function renderJobs(jobs) {
        const container = document.getElementById('jobs-list');

        if (jobs.length === 0) {
            container.innerHTML = '<p class="hint">No recent jobs</p>';
            return;
        }

        container.innerHTML = jobs.map(job => {
            const statusClass = job.status;
            const timeStr = new Date(job.created_at).toLocaleString();
            const progressBar = ['pending', 'downloading', 'processing'].includes(job.status)
                ? `<div class="progress-bar-mini"><div class="progress-fill-mini" style="width:${job.progress}%"></div></div>
                   <span class="progress-text">${job.progress}% — ${escapeHtml(job.progress_message || job.status)}</span>`
                : '';

            const downloadBtn = job.status === 'complete' && job.gcs_output_url
                ? `<a href="${escapeAttr(job.gcs_output_url)}" class="btn-small" download>Download PDF</a>`
                : '';

            const errorMsg = job.status === 'failed' && job.error_message
                ? `<p class="error-text">${escapeHtml(job.error_message)}</p>`
                : '';

            return `
                <div class="job-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${escapeHtml(job.case_name)}</strong>
                        <span class="job-status ${statusClass}">${job.status}</span>
                    </div>
                    <div style="color:#64748B;font-size:0.85em;">${job.total_files} files — ${timeStr}</div>
                    ${progressBar}
                    ${errorMsg}
                    ${downloadBtn}
                </div>
            `;
        }).join('');
    }

    function startPolling() {
        stopPolling();
        pollInterval = setInterval(loadJobs, 5000);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/"/g, '&quot;');
    }

    return { loadJobs, startPolling, stopPolling };
})();

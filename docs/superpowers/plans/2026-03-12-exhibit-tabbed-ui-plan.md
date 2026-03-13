# Exhibit Collector Tabbed UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the exhibit collector's hidden "View Jobs" button with doc-gen-style tabbed navigation (Exhibit Form | Recent Jobs).

**Architecture:** Add a `.nav-tabs` bar between the page header and form content. Existing form sections wrap in a `#form-tab` div. A new `#jobs-tab` div holds the jobs list. `jobs-dashboard.js` drops its show/hide logic and exposes `startPolling`/`stopPolling` for the tab switcher to call. `form-submission.js` switches to the jobs tab after async dispatch instead of calling `JobsDashboard.show()`.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework)

**Spec:** `docs/superpowers/specs/2026-03-12-exhibit-tabbed-ui-design.md`

---

## Chunk 1: Implementation

### Task 1: Add tab CSS styles

**Files:**
- Modify: `forms/exhibits/styles.css:825-880` (jobs dashboard section)

- [ ] **Step 1: Add tab navigation styles**

Add these styles **before** the existing `/* === JOBS DASHBOARD === */` section (before line 825):

```css
/* === TAB NAVIGATION === */

.nav-tabs {
    display: flex;
    background: #F5F5F5;
    border-bottom: 2px solid #E2E8F0;
    padding: 0 30px;
}

.nav-tab {
    background: none;
    border: none;
    padding: 15px 25px;
    font-family: 'Open Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    margin-right: 5px;
    transition: all 0.3s ease;
}

.nav-tab:hover {
    background: #E2E8F0;
    color: #1F2A44;
}

.nav-tab.active {
    background: #FFFFFF;
    color: #1F2A44;
    border-bottom: 3px solid #00AEEF;
}

.nav-tab i {
    margin-right: 8px;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}
```

- [ ] **Step 2: Update job card and dashboard styles**

Replace the entire `/* === JOBS DASHBOARD === */` section (lines 825-880) with:

```css
/* === JOBS DASHBOARD === */

#jobs-tab {
    padding: 20px 40px;
    background: #F5F5F5;
}

.jobs-list {
    max-height: 400px;
    overflow-y: auto;
}

.job-card {
    background: white;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 14px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.job-card strong {
    color: #1F2A44;
}

.job-card .job-status {
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.8em;
}

.job-card .job-status.complete { color: #2e7d32; }
.job-card .job-status.processing,
.job-card .job-status.downloading { color: #1565c0; }
.job-card .job-status.failed { color: #c62828; }
.job-card .job-status.pending { color: #888; }

.progress-bar-mini {
    height: 6px;
    background: #eee;
    border-radius: 3px;
    margin: 6px 0 4px;
    overflow: hidden;
}

.progress-fill-mini {
    height: 100%;
    background: #1565c0;
    border-radius: 3px;
    transition: width 0.3s;
}

.progress-text {
    font-size: 0.8em;
    color: #64748B;
}

.error-text {
    color: #c62828;
    font-size: 0.85em;
    margin: 4px 0;
}
```

- [ ] **Step 3: Verify CSS loads without errors**

Open `forms/exhibits/index.html` in a browser. Confirm no CSS parse errors in the console and that the page still renders correctly (tabs won't be visible yet since HTML hasn't changed).

- [ ] **Step 4: Commit**

```bash
git add forms/exhibits/styles.css
git commit -m "feat(exhibits): add tab navigation CSS and update job card styles"
```

---

### Task 2: Restructure HTML with tabs

**Files:**
- Modify: `forms/exhibits/index.html:20-75`

- [ ] **Step 1: Add tab bar after the form header**

After line 20 (closing `</div>` of `.form-header`), add:

```html
    <!-- Tab Navigation -->
    <div class="nav-tabs">
        <button class="nav-tab active" onclick="showTab('form', this)">
            <i class="fas fa-file-alt"></i> Exhibit Form
        </button>
        <button class="nav-tab" onclick="showTab('jobs', this)">
            <i class="fas fa-list"></i> Recent Jobs
        </button>
    </div>
```

- [ ] **Step 2: Restructure content into form tab and jobs tab**

Replace everything between the closing `</div>` of `.form-header` (line 20) and the closing `</div>` of `.form-container` (line 87) with this structure. The existing content of each section stays unchanged — only the wrapping divs and the jobs dashboard block change.

Delete lines 67-75 entirely (the `<!-- Jobs Dashboard -->` block, `#jobs-dashboard`, `#btn-close-dashboard`, and `#btn-show-jobs`).

Wrap the remaining sections (`#case-info-section`, `#dropbox-panel`, `#submit-section`) in a form tab div, and add a new jobs tab div after it:

```html
    <!-- Form Tab -->
    <div id="form-tab" class="tab-content active">
        <!-- Case Info Section -->
        <div class="form-section" id="case-info-section">
            ...existing content unchanged...
        </div>

        <!-- Dropbox File Browser -->
        <div id="dropbox-panel" class="section" style="display: flex;">
            ...existing content unchanged...
        </div>

        <!-- Submit Section -->
        <div class="form-section submit-section" id="submit-section">
            ...existing content unchanged...
        </div>
    </div>

    <!-- Jobs Tab -->
    <div id="jobs-tab" class="tab-content">
        <div id="jobs-list" class="jobs-list">
            <p class="hint">No recent jobs</p>
        </div>
        <p class="hint" style="text-align: center; margin-top: 16px;">Showing async jobs (2000+ files).</p>
    </div>
```

The key changes are:
1. `#form-tab` wraps case info, dropbox panel, and submit section (NOT the jobs dashboard)
2. `#jobs-tab` replaces the old `#jobs-dashboard`, `#btn-close-dashboard`, and `#btn-show-jobs`
3. Both tab divs sit inside `.form-container`, after `.nav-tabs`

- [ ] **Step 3: Add showTab function**

Add this inline `<script>` block before the existing `<!-- Scripts -->` comment (before line 160):

```html
<script>
function showTab(tabName, btn) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');

    if (tabName === 'jobs') {
        JobsDashboard.loadJobs();
        JobsDashboard.startPolling();
    } else {
        JobsDashboard.stopPolling();
    }
}
</script>
```

- [ ] **Step 4: Verify tab switching works visually**

Open the page in a browser. Click "Recent Jobs" tab — form should hide, jobs area should appear. Click "Exhibit Form" — form should reappear. Active tab should have white background with blue bottom border. Verify the tab bar sits between the header and the form content.

Expected: Tab switching works visually but jobs tab may show errors in console (because `JobsDashboard.startPolling` doesn't exist yet — that's Task 3).

- [ ] **Step 5: Commit**

```bash
git add forms/exhibits/index.html
git commit -m "feat(exhibits): add tabbed navigation HTML structure"
```

---

### Task 3: Update jobs-dashboard.js

**Files:**
- Modify: `forms/exhibits/js/jobs-dashboard.js` (entire file, 106 lines)

- [ ] **Step 1: Remove show/hide methods and DOMContentLoaded block**

Delete the `show()` function (lines 8-13), `hide()` function (lines 15-18), and the entire `DOMContentLoaded` event listener (lines 97-103).

- [ ] **Step 2: Update renderJobs card markup**

In `renderJobs()`, update line 66 to use the new text color:

```javascript
<div style="color:#64748B;font-size:0.85em;">${job.total_files} files — ${timeStr}</div>
```

This changes the meta text color from `#888` to `#64748B`.

- [ ] **Step 3: Update IIFE return object**

Replace line 105:

```javascript
return { show, hide, loadJobs };
```

With:

```javascript
return { loadJobs, startPolling, stopPolling };
```

- [ ] **Step 4: Verify the complete file**

The final `jobs-dashboard.js` should look like this:

```javascript
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
```

- [ ] **Step 5: Verify tab + jobs integration**

Open the page. Click "Recent Jobs" tab. Check browser console:
- No errors about undefined functions
- If the server is running and `/api/jobs` is reachable, jobs should load
- If `/api/jobs` returns empty, "No recent jobs" hint should appear
- Click back to "Exhibit Form" — polling should stop (no more network requests to `/api/jobs` in Network tab)

- [ ] **Step 6: Commit**

```bash
git add forms/exhibits/js/jobs-dashboard.js
git commit -m "feat(exhibits): update jobs dashboard for tab-based navigation"
```

---

### Task 4: Update form-submission.js async dispatch

**Files:**
- Modify: `forms/exhibits/js/form-submission.js:109-110`

- [ ] **Step 1: Replace JobsDashboard.show() with tab switch**

Replace lines 109-110:

```javascript
                    document.getElementById('btn-show-jobs').style.display = 'inline';
                    if (typeof JobsDashboard !== 'undefined') JobsDashboard.show();
```

With:

```javascript
                    showTab('jobs', document.querySelector('.nav-tab:last-child'));
```

- [ ] **Step 2: Verify async dispatch flow**

This requires a running server with Dropbox integration. If available:
1. Assign 2000+ files to exhibits
2. Click "Generate Exhibit Package"
3. Confirm async mode triggers
4. After dispatch, page should auto-switch to "Recent Jobs" tab
5. The newly dispatched job should appear in the jobs list

If the server isn't available, verify by reading the code: after a successful async dispatch (`data.success` is true), the page calls `showTab('jobs', ...)` which switches to the jobs tab and starts polling.

- [ ] **Step 3: Commit**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat(exhibits): auto-switch to jobs tab after async dispatch"
```

---

### Task 5: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Full visual check**

Open the exhibit collector page and verify:
1. Tab bar appears between header and form content
2. "Exhibit Form" tab is active by default with white background + blue bottom border
3. Clicking "Recent Jobs" tab switches content, tab styling updates
4. Clicking "Exhibit Form" returns to the form
5. No "View Jobs" link button visible anywhere
6. No "Close" button in the jobs area
7. Job cards have white background with subtle shadow on light gray (#F5F5F5) page
8. Case names are navy (#1F2A44), meta text is slate (#64748B)

- [ ] **Step 2: Verify no console errors**

Open browser console. Click through both tabs several times. Confirm:
- No JavaScript errors
- No 404s for removed elements
- Network tab shows `/api/jobs` requests only when jobs tab is active

- [ ] **Step 3: Verify form still works**

On the "Exhibit Form" tab:
1. Case name and description fields are editable
2. Dropbox browser loads (if server running)
3. Exhibit slots are present
4. Generate button enables/disables correctly

- [ ] **Step 4: Commit (if any fixes were needed)**

Only commit if fixes were applied during verification. Otherwise, skip.

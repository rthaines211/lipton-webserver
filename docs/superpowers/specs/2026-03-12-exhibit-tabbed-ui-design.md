# Exhibit Collector — Tabbed UI Design

## Overview

Replace the exhibit collector's hidden "View Jobs" button with a doc-gen-style tabbed navigation. Two tabs: **Exhibit Form** (default) and **Recent Jobs**. Jobs tab shows async (database-persisted) exhibit jobs as white cards on a light gray background.

## Motivation

The current jobs UI is hidden behind a "View Jobs" link at the bottom of the page — easy to miss and visually inconsistent with the rest of the app. The doc gen page already has a clean tabbed pattern (`Document Generation Form | View Submissions`) that works well. Adopting it for exhibits gives users a discoverable, familiar way to check on their async jobs.

## Scope

- Exhibit collector page only (`forms/exhibits/`)
- No changes to other tools (complaint, doc gen, contingency)
- Async jobs only (persisted in `exhibit_jobs` PostgreSQL table via `/api/jobs`)
- No new API endpoints needed

## HTML Changes (`forms/exhibits/index.html`)

1. **Add tab bar** between `.form-header` and form content:
   ```html
   <div class="nav-tabs">
       <button class="nav-tab active" onclick="showTab('form', this)">
           <i class="fas fa-file-alt"></i> Exhibit Form
       </button>
       <button class="nav-tab" onclick="showTab('jobs', this)">
           <i class="fas fa-list"></i> Recent Jobs
       </button>
   </div>
   ```

2. **Wrap form content** in `#form-tab.tab-content.active`:
   - `#case-info-section`
   - `#dropbox-panel`
   - `#submit-section`

3. **Create jobs tab** as `#jobs-tab.tab-content`:
   - Contains `#jobs-list` div for job cards (moved from old `#jobs-dashboard`)
   - Light gray background (#F5F5F5)

4. **Remove old navigation elements**:
   - Delete `#btn-show-jobs` link button
   - Delete `#btn-close-dashboard` close button
   - Delete `#jobs-dashboard` wrapper (content moves into `#jobs-tab`)

**Tab always defaults to "Exhibit Form" on page load** — no URL hash persistence.

## CSS Changes (`forms/exhibits/styles.css`)

### New — Tab styles (copied from doc gen)

```css
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

### Updated — Job card styles

```css
#jobs-tab {
    padding: 20px 40px;
    background: #F5F5F5;
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

.job-card .meta {
    color: #64748B;
}

.job-card .progress-text {
    color: #64748B;
}
```

### Kept — Existing progress bar styles

The existing `.progress-bar-mini`, `.progress-fill-mini`, `.job-status` color, and `.error-text` styles remain unchanged. Only `.job-card` base styles are updated (white background, border, shadow).

## JS Changes

### New — `showTab()` function

Add as inline `<script>` in `index.html` (page-level UI concern, not job-specific):

```javascript
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
```

The clicked button element is passed explicitly as `btn` — no reliance on the deprecated implicit `window.event`.

### Updated — `jobs-dashboard.js`

- Remove `show()` and `hide()` methods (replaced by tab switching)
- Remove the entire `DOMContentLoaded` event listener block that binds `btn-close-dashboard` and `btn-show-jobs` click handlers
- Keep `renderJobs()`, `loadJobs()`, and utility functions (`escapeHtml`, `escapeAttr`)
- Update `renderJobs()` to use updated card markup (white bg, navy text)
- Update IIFE return object: `{ loadJobs, startPolling, stopPolling }` (remove `show`, `hide`)
- Expose existing private `startPolling()` and `stopPolling()` functions in the return object
- Auto-load jobs on page load removed — only load when jobs tab is activated

### Updated — `form-submission.js`

After an async job is dispatched, `form-submission.js` currently calls `JobsDashboard.show()` and shows `btn-show-jobs`. Replace this with auto-switching to the jobs tab:

```javascript
// Replace: document.getElementById('btn-show-jobs').style.display = 'inline-block';
//          JobsDashboard.show();
// With:
showTab('jobs', document.querySelector('.nav-tab:last-child'));
```

This auto-navigates to the Recent Jobs tab so the user can see their newly dispatched job.

## Job Card Rendering

Each card displays:

| Field | Source | Style |
|-------|--------|-------|
| Case name | `job.case_name` | Bold, #1F2A44 |
| Status badge | `job.status` | Uppercase, color-coded |
| File count + time | `job.total_files`, `job.created_at` | #64748B, 0.82em |
| Progress bar | `job.progress` | 6px blue bar (processing/downloading/pending only) |
| Progress message | `job.progress_message` | #64748B, 0.8em |
| Error message | `job.error_message` | #c62828, 0.82em (failed only) |
| Download button | `job.gcs_output_url` | `.btn-small` styled link (complete only) |

Status colors: complete=#2e7d32, processing/downloading=#1565c0, failed=#c62828, pending=#888

## Empty State

When no jobs exist: `<p class="hint">No recent jobs</p>`

Footer hint: "Showing async jobs (2000+ files)."

Note: No retention period claim — the backend doesn't currently enforce a TTL on `exhibit_jobs` rows.

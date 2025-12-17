/**
 * CRM Dashboard - Case Detail Module
 *
 * Handles:
 * - Loading and displaying case details
 * - Status change dropdown (7C.6)
 * - Attorney assignment dropdown (7C.7)
 * - Notes CRUD UI (7C.8)
 * - Activity timeline display (7C.9)
 * - "Open in Doc Gen" button (7C.10)
 */

(function() {
    'use strict';

    // ============================================================================
    // State
    // ============================================================================

    const state = {
        currentCase: null,
        notes: [],
        activities: [],
        attorneys: [],
        isLoading: false
    };

    // Status options for dropdown
    const STATUS_OPTIONS = [
        { value: 'new', label: 'New' },
        { value: 'in_review', label: 'In Review' },
        { value: 'docs_in_progress', label: 'Docs In Progress' },
        { value: 'docs_generated', label: 'Docs Generated' },
        { value: 'filed', label: 'Filed' },
        { value: 'closed', label: 'Closed' },
        { value: 'on_hold', label: 'On Hold' }
    ];

    // ============================================================================
    // Auth Helper
    // ============================================================================

    function getAuthToken() {
        const params = new URLSearchParams(window.location.search);
        return params.get('token') || '';
    }

    function getCaseIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || null;
    }

    function getAuthHeaders(includeJson = false) {
        const token = getAuthToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (includeJson) headers['Content-Type'] = 'application/json';
        return headers;
    }

    // Check if we're on the standalone case detail page
    function isStandalonePage() {
        return window.location.pathname.includes('case-detail.html');
    }

    // ============================================================================
    // API Functions
    // ============================================================================

    async function fetchCaseDetail(id) {
        const response = await fetch(`/api/dashboard/${id}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch case details');
        return response.json();
    }

    async function fetchCaseNotes(dashboardId) {
        const response = await fetch(`/api/dashboard/${dashboardId}/notes`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch notes');
        return response.json();
    }

    async function fetchCaseActivities(dashboardId) {
        const response = await fetch(`/api/dashboard/${dashboardId}/activities`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch activities');
        return response.json();
    }

    async function updateCaseStatus(dashboardId, status) {
        const response = await fetch(`/api/dashboard/${dashboardId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update status');
        return response.json();
    }

    async function updateCaseAttorney(dashboardId, attorneyId) {
        const response = await fetch(`/api/dashboard/${dashboardId}/assign`, {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ attorney_id: attorneyId })
        });
        if (!response.ok) throw new Error('Failed to assign attorney');
        return response.json();
    }

    async function updateCasePriority(dashboardId, isPriority) {
        const response = await fetch(`/api/dashboard/${dashboardId}/priority`, {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ is_priority: isPriority })
        });
        if (!response.ok) throw new Error('Failed to update priority');
        return response.json();
    }

    async function addNote(dashboardId, content) {
        const response = await fetch(`/api/dashboard/${dashboardId}/notes`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Failed to add note');
        return response.json();
    }

    async function deleteNote(dashboardId, noteId) {
        const response = await fetch(`/api/dashboard/${dashboardId}/notes/${noteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete note');
        return response.json();
    }

    // Fallback attorneys if API call fails
    const FALLBACK_ATTORNEYS = [
        { id: 1, full_name: 'Kevin Lipton' },
        { id: 2, full_name: 'Michael Falsafi' }
    ];

    async function fetchAttorneys() {
        try {
            const response = await fetch('/api/attorneys', {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch attorneys');
            const data = await response.json();
            return data.attorneys || FALLBACK_ATTORNEYS;
        } catch (error) {
            console.error('Error fetching attorneys, using fallback:', error.message);
            return FALLBACK_ATTORNEYS;
        }
    }

    // ============================================================================
    // Render Functions
    // ============================================================================

    function renderCaseDetail() {
        const panel = document.getElementById('case-detail-panel');
        if (!panel) return;

        if (state.isLoading) {
            panel.innerHTML = `
                <div class="detail-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading case details...</p>
                </div>
            `;
            return;
        }

        if (!state.currentCase) {
            panel.innerHTML = `
                <div class="detail-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <p>Select a case to view details</p>
                </div>
            `;
            return;
        }

        const caseData = state.currentCase;
        // Get status label - use Dashboard config if available, otherwise fallback
        const STATUS_LABELS = {
            new: 'New',
            in_review: 'In Review',
            docs_in_progress: 'Docs In Progress',
            docs_generated: 'Docs Generated',
            filed: 'Filed',
            closed: 'Closed',
            on_hold: 'On Hold'
        };
        const statusLabel = (typeof Dashboard !== 'undefined' && Dashboard.STATUS_CONFIG)
            ? (Dashboard.STATUS_CONFIG[caseData.status]?.label || caseData.status)
            : (STATUS_LABELS[caseData.status] || caseData.status);

        panel.innerHTML = `
            <!-- Header -->
            <div class="detail-header">
                <div class="detail-header-top">
                    <div>
                        <h2 class="detail-client-name">${caseData.full_name || caseData.primary_client_name || 'Unknown Client'}</h2>
                        <div class="detail-intake-number">${caseData.intake_number || 'N/A'}</div>
                    </div>
                    ${!isStandalonePage() ? `
                    <button class="close-detail-btn" onclick="CaseDetail.closePanel()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </div>
                <div class="detail-header-meta">
                    <span><i class="fas fa-envelope"></i> ${caseData.email_address || caseData.client_email || 'No email'}</span>
                    <span><i class="fas fa-phone"></i> ${caseData.primary_phone || caseData.client_phone || 'No phone'}</span>
                    <span><i class="fas fa-calendar"></i> Created ${formatDate(caseData.created_at)}</span>
                </div>
            </div>

            <!-- Status & Assignment Section -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-tasks"></i> Case Management</h3>

                <div class="control-row">
                    <div class="control-group">
                        <label>Status</label>
                        <select id="status-select" onchange="CaseDetail.handleStatusChange(this.value)">
                            ${STATUS_OPTIONS.map(opt =>
                                `<option value="${opt.value}" ${opt.value === caseData.status ? 'selected' : ''}>${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Assigned Attorney</label>
                        <select id="attorney-select" onchange="CaseDetail.handleAttorneyChange(this.value)">
                            <option value="">Unassigned</option>
                            ${state.attorneys.map(att =>
                                `<option value="${att.id}" ${att.id === (caseData.assigned_attorney_id || caseData.attorney_id) ? 'selected' : ''}>${att.full_name || att.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="priority-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" id="priority-toggle"
                               ${caseData.is_priority ? 'checked' : ''}
                               onchange="CaseDetail.handlePriorityChange(this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label"><i class="fas fa-star" style="color: #F59E0B;"></i> Mark as Priority</span>
                </div>
            </div>

            <!-- Property Info Section -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-home"></i> Property Information</h3>
                <div class="info-grid">
                    <div class="info-item full-width">
                        <div class="info-label">Address</div>
                        <div class="info-value">${formatPropertyAddress(caseData)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Monthly Rent</div>
                        <div class="info-value">${caseData.monthly_rent ? '$' + parseFloat(caseData.monthly_rent).toLocaleString() : 'Not provided'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Lease Start</div>
                        <div class="info-value">${caseData.lease_start_date || caseData.lease_start ? formatDate(caseData.lease_start_date || caseData.lease_start) : 'Not provided'}</div>
                    </div>
                </div>
            </div>

            <!-- Notes Section -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-sticky-note"></i> Notes</h3>
                <div class="notes-container" id="notes-container">
                    ${renderNotes()}
                </div>
                <div class="add-note-form">
                    <textarea id="new-note-input" placeholder="Add a note..." rows="2"></textarea>
                </div>
                <button class="btn btn-primary btn-sm" style="margin-top: 8px;" onclick="CaseDetail.handleAddNote()">
                    <i class="fas fa-plus"></i> Add Note
                </button>
            </div>

            <!-- Activity Timeline Section -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-history"></i> Activity Timeline</h3>
                <div class="activity-timeline" id="activity-timeline">
                    ${renderActivities()}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="detail-actions">
                ${isStandalonePage() ? `
                <button class="btn btn-outline" onclick="CaseDetail.goBackToDashboard()">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </button>
                ` : ''}
                <button class="btn btn-success" onclick="CaseDetail.openInDocGen()">
                    <i class="fas fa-file-alt"></i> Open in Doc Gen
                </button>
                <button class="btn btn-secondary" onclick="CaseDetail.refreshCase()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;
    }

    function renderNotes() {
        if (state.notes.length === 0) {
            return '<p style="color: #94A3B8; font-size: 0.9rem;">No notes yet</p>';
        }

        return state.notes.map(note => `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-content">${escapeHtml(note.content)}</div>
                <div class="note-meta">
                    <span>${note.created_by || 'System'} - ${formatTimeAgo(note.created_at)}</span>
                    <div class="note-actions">
                        <button class="note-action-btn delete" onclick="CaseDetail.handleDeleteNote('${note.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderActivities() {
        if (state.activities.length === 0) {
            return '<p style="color: #94A3B8; font-size: 0.9rem;">No activity yet</p>';
        }

        return state.activities.map(activity => `
            <div class="activity-item">
                <span class="activity-dot ${activity.activity_type}"></span>
                <div class="activity-content">${escapeHtml(activity.description)}</div>
                <div class="activity-time">${activity.performed_by || 'System'} - ${formatTimeAgo(activity.created_at)}</div>
            </div>
        `).join('');
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatPropertyAddress(caseData) {
        // Try to use pre-computed full address first
        if (caseData.property_full_address && caseData.property_full_address.trim() !== ', ,  ') {
            return caseData.property_full_address;
        }
        // Construct from components
        const parts = [
            caseData.property_street_address,
            caseData.property_unit_number,
            caseData.property_city,
            caseData.property_state,
            caseData.property_zip_code
        ].filter(p => p && p.trim());

        if (parts.length === 0) return 'Not provided';

        // Format as "Street, City, State ZIP"
        const street = [caseData.property_street_address, caseData.property_unit_number].filter(Boolean).join(' ');
        const cityStateZip = [
            caseData.property_city,
            [caseData.property_state, caseData.property_zip_code].filter(Boolean).join(' ')
        ].filter(Boolean).join(', ');

        return [street, cityStateZip].filter(Boolean).join(', ') || 'Not provided';
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return 'Unknown';

        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return formatDate(dateStr);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showNotification(message, type = 'info') {
        // Use Dashboard notification if available (embedded mode)
        if (typeof Dashboard !== 'undefined' && Dashboard.showNotification) {
            Dashboard.showNotification(message, type);
            return;
        }

        // Standalone notification for case-detail.html page
        const container = document.getElementById('notification-container');
        if (!container) {
            console.log(`[${type}] ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        notification.innerHTML = `
            <i class="fas ${iconMap[type] || iconMap.info}"></i>
            <span>${message}</span>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ============================================================================
    // Data Loading
    // ============================================================================

    async function loadCase(id) {
        state.isLoading = true;
        state.currentCase = null;
        state.notes = [];
        state.activities = [];
        renderCaseDetail();

        try {
            // Load attorneys if not already loaded
            if (state.attorneys.length === 0) {
                const attorneysData = await fetchAttorneys();
                state.attorneys = attorneysData.data || attorneysData || [];
            }

            // Load case details
            const caseData = await fetchCaseDetail(id);
            state.currentCase = caseData.data || caseData;

            // Load notes and activities in parallel
            const [notesData, activitiesData] = await Promise.all([
                fetchCaseNotes(id).catch(() => ({ data: [] })),
                fetchCaseActivities(id).catch(() => ({ data: [] }))
            ]);

            state.notes = notesData.data || notesData || [];
            state.activities = activitiesData.data || activitiesData || [];

            state.isLoading = false;
            renderCaseDetail();

        } catch (error) {
            console.error('Failed to load case:', error);
            showNotification('Failed to load case details', 'error');
            state.isLoading = false;
            state.currentCase = null;
            renderCaseDetail();
        }
    }

    async function refreshCase() {
        if (state.currentCase) {
            await loadCase(state.currentCase.dashboard_id);
            showNotification('Case refreshed', 'success');
        }
    }

    // ============================================================================
    // Event Handlers
    // ============================================================================

    async function handleStatusChange(newStatus) {
        if (!state.currentCase) return;

        try {
            await updateCaseStatus(state.currentCase.dashboard_id, newStatus);
            state.currentCase.status = newStatus;
            showNotification('Status updated', 'success');

            // Refresh activities
            const activitiesData = await fetchCaseActivities(state.currentCase.dashboard_id);
            state.activities = activitiesData.data || activitiesData || [];

            // Re-render activity section
            const timeline = document.getElementById('activity-timeline');
            if (timeline) timeline.innerHTML = renderActivities();

            // Refresh dashboard list
            if (typeof Dashboard !== 'undefined' && Dashboard.loadDashboard) {
                Dashboard.loadDashboard();
            }

        } catch (error) {
            console.error('Failed to update status:', error);
            showNotification('Failed to update status', 'error');
            // Revert select
            const select = document.getElementById('status-select');
            if (select) select.value = state.currentCase.status;
        }
    }

    async function handleAttorneyChange(attorneyId) {
        if (!state.currentCase) return;

        try {
            await updateCaseAttorney(state.currentCase.dashboard_id, attorneyId || null);
            state.currentCase.assigned_attorney_id = attorneyId ? parseInt(attorneyId) : null;
            showNotification('Attorney assigned', 'success');

            // Refresh activities
            const activitiesData = await fetchCaseActivities(state.currentCase.dashboard_id);
            state.activities = activitiesData.data || activitiesData || [];

            const timeline = document.getElementById('activity-timeline');
            if (timeline) timeline.innerHTML = renderActivities();

            // Refresh dashboard list
            if (typeof Dashboard !== 'undefined' && Dashboard.loadDashboard) {
                Dashboard.loadDashboard();
            }

        } catch (error) {
            console.error('Failed to assign attorney:', error);
            showNotification('Failed to assign attorney', 'error');
        }
    }

    async function handlePriorityChange(isPriority) {
        if (!state.currentCase) return;

        try {
            await updateCasePriority(state.currentCase.dashboard_id, isPriority);
            state.currentCase.is_priority = isPriority;
            showNotification(isPriority ? 'Marked as priority' : 'Priority removed', 'success');

            // Refresh dashboard list
            if (typeof Dashboard !== 'undefined' && Dashboard.loadDashboard) {
                Dashboard.loadDashboard();
            }

        } catch (error) {
            console.error('Failed to update priority:', error);
            showNotification('Failed to update priority', 'error');
            // Revert checkbox
            const toggle = document.getElementById('priority-toggle');
            if (toggle) toggle.checked = state.currentCase.is_priority;
        }
    }

    async function handleAddNote() {
        const input = document.getElementById('new-note-input');
        if (!input || !state.currentCase) return;

        const content = input.value.trim();
        if (!content) {
            showNotification('Please enter a note', 'warning');
            return;
        }

        try {
            const result = await addNote(state.currentCase.dashboard_id, content);
            input.value = '';

            // Add to local state
            state.notes.unshift(result.data || result);

            // Re-render notes
            const container = document.getElementById('notes-container');
            if (container) container.innerHTML = renderNotes();

            // Refresh activities
            const activitiesData = await fetchCaseActivities(state.currentCase.dashboard_id);
            state.activities = activitiesData.data || activitiesData || [];

            const timeline = document.getElementById('activity-timeline');
            if (timeline) timeline.innerHTML = renderActivities();

            showNotification('Note added', 'success');

        } catch (error) {
            console.error('Failed to add note:', error);
            showNotification('Failed to add note', 'error');
        }
    }

    async function handleDeleteNote(noteId) {
        if (!state.currentCase) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await deleteNote(state.currentCase.dashboard_id, noteId);

            // Remove from local state
            state.notes = state.notes.filter(n => n.id !== noteId);

            // Re-render notes
            const container = document.getElementById('notes-container');
            if (container) container.innerHTML = renderNotes();

            showNotification('Note deleted', 'success');

        } catch (error) {
            console.error('Failed to delete note:', error);
            showNotification('Failed to delete note', 'error');
        }
    }

    function openInDocGen() {
        if (!state.currentCase || !state.currentCase.intake_id) {
            showNotification('No intake associated with this case', 'warning');
            return;
        }

        // Navigate to doc gen form with loadIntake parameter (preserve token)
        const token = getAuthToken();
        const tokenParam = token ? `&token=${token}` : '';
        window.location.href = `/?loadIntake=${state.currentCase.intake_id}${tokenParam}`;
    }

    function goBackToDashboard() {
        const token = getAuthToken();
        const tokenParam = token ? `?token=${token}` : '';
        window.location.href = `/dashboard.html${tokenParam}`;
    }

    function closePanel() {
        // On standalone page, navigate back to dashboard
        if (isStandalonePage()) {
            goBackToDashboard();
            return;
        }

        // Modal mode: close the modal
        const modal = document.getElementById('case-detail-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore background scroll
        }

        // Clear selection in list
        document.querySelectorAll('.case-card').forEach(card => {
            card.classList.remove('active');
        });

        if (typeof Dashboard !== 'undefined') {
            Dashboard.getState().selectedCaseId = null;
        }

        // Clear current case
        state.currentCase = null;
        state.notes = [];
        state.activities = [];
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    function init() {
        // Load attorneys on init
        fetchAttorneys()
            .then(data => {
                state.attorneys = data.data || data || [];
            })
            .catch(err => console.error('Failed to load attorneys:', err));

        // On standalone page, check for case ID in URL and load it
        if (isStandalonePage()) {
            const caseId = getCaseIdFromUrl();
            if (caseId) {
                loadCase(caseId);
            } else {
                // No case ID provided - show error
                const panel = document.getElementById('case-detail-panel');
                if (panel) {
                    panel.innerHTML = `
                        <div class="detail-placeholder">
                            <i class="fas fa-exclamation-circle" style="color: #EF4444;"></i>
                            <p>No case ID provided</p>
                            <button class="btn btn-outline" onclick="CaseDetail.goBackToDashboard()">
                                <i class="fas fa-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                    `;
                }
            }

            // Update the Back to Dashboard link in header to include token
            const backLink = document.getElementById('back-to-dashboard');
            if (backLink) {
                const token = getAuthToken();
                if (token) {
                    backLink.href = `/dashboard.html?token=${token}`;
                }
            }
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================================================
    // Public API
    // ============================================================================

    window.CaseDetail = {
        loadCase,
        refreshCase,
        closePanel,
        goBackToDashboard,
        handleStatusChange,
        handleAttorneyChange,
        handlePriorityChange,
        handleAddNote,
        handleDeleteNote,
        openInDocGen,
        getState: () => state
    };

})();

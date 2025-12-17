/**
 * CRM Dashboard - List & Filters Module
 *
 * Handles:
 * - Loading and displaying case list
 * - Status/attorney/priority filters
 * - Search functionality
 * - Pagination
 * - Case selection
 */

(function() {
    'use strict';

    // ============================================================================
    // State
    // ============================================================================

    const state = {
        cases: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        statusSummary: [],
        attorneys: [],
        filters: {
            status: null,
            attorney_id: null,
            priority: false,
            search: ''
        },
        sort: 'updated_at-desc',
        selectedCaseId: null,
        isLoading: false
    };

    // Status display configuration
    const STATUS_CONFIG = {
        new: { label: 'New', icon: 'fa-plus-circle' },
        in_review: { label: 'In Review', icon: 'fa-eye' },
        docs_in_progress: { label: 'Docs In Progress', icon: 'fa-cog' },
        docs_generated: { label: 'Docs Generated', icon: 'fa-check-circle' },
        filed: { label: 'Filed', icon: 'fa-gavel' },
        closed: { label: 'Closed', icon: 'fa-archive' },
        on_hold: { label: 'On Hold', icon: 'fa-pause-circle' }
    };

    // ============================================================================
    // Auth Helper
    // ============================================================================

    function getAuthToken() {
        const params = new URLSearchParams(window.location.search);
        return params.get('token') || '';
    }

    function getAuthHeaders() {
        const token = getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // ============================================================================
    // API Functions
    // ============================================================================

    async function fetchDashboard() {
        const params = new URLSearchParams();

        if (state.filters.status) params.set('status', state.filters.status);
        if (state.filters.attorney_id) params.set('attorney_id', state.filters.attorney_id);
        if (state.filters.priority) params.set('priority', 'true');
        if (state.filters.search) params.set('search', state.filters.search);

        params.set('page', state.pagination.page.toString());
        params.set('limit', state.pagination.limit.toString());

        const response = await fetch(`/api/dashboard?${params}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
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

    function renderStatusFilters() {
        const container = document.getElementById('status-filters');
        if (!container) return;

        // Calculate total for "All" option
        const total = state.statusSummary.reduce((sum, s) => sum + parseInt(s.count || 0), 0);

        let html = `
            <div class="status-filter-item ${state.filters.status === null ? 'active' : ''}"
                 data-status="">
                <span class="status-name">
                    <span class="status-dot" style="background: #1F2A44;"></span>
                    All Cases
                </span>
                <span class="status-count">${total}</span>
            </div>
        `;

        // Add each status from summary
        for (const statusItem of state.statusSummary) {
            const config = STATUS_CONFIG[statusItem.status] || { label: statusItem.status, icon: 'fa-circle' };
            const isActive = state.filters.status === statusItem.status;

            html += `
                <div class="status-filter-item ${isActive ? 'active' : ''}"
                     data-status="${statusItem.status}">
                    <span class="status-name">
                        <span class="status-dot ${statusItem.status}"></span>
                        ${config.label}
                    </span>
                    <span class="status-count">${statusItem.count}</span>
                </div>
            `;
        }

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.status-filter-item').forEach(item => {
            item.addEventListener('click', () => {
                const status = item.dataset.status || null;
                setFilter('status', status);
            });
        });
    }

    function renderAttorneyFilter() {
        const select = document.getElementById('attorney-filter');
        if (!select) return;

        let html = '<option value="">All Attorneys</option>';

        for (const attorney of state.attorneys) {
            const selected = state.filters.attorney_id == attorney.id ? 'selected' : '';
            html += `<option value="${attorney.id}" ${selected}>${attorney.full_name || attorney.name}</option>`;
        }

        select.innerHTML = html;
    }

    function renderStatsSummary() {
        const container = document.getElementById('stats-summary');
        if (!container) return;

        const total = state.statusSummary.reduce((sum, s) => sum + parseInt(s.count || 0), 0);
        const newCount = state.statusSummary.find(s => s.status === 'new')?.count || 0;
        const inProgressCount = state.statusSummary
            .filter(s => ['in_review', 'docs_in_progress'].includes(s.status))
            .reduce((sum, s) => sum + parseInt(s.count || 0), 0);
        const completedCount = state.statusSummary
            .filter(s => ['docs_generated', 'filed', 'closed'].includes(s.status))
            .reduce((sum, s) => sum + parseInt(s.count || 0), 0);

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total Cases</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #3B82F6;">${newCount}</div>
                <div class="stat-label">New</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #F59E0B;">${inProgressCount}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #10B981;">${completedCount}</div>
                <div class="stat-label">Completed</div>
            </div>
        `;
    }

    function renderCaseList() {
        const container = document.getElementById('case-list');
        if (!container) return;

        if (state.isLoading) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading cases...</span>
                </div>
            `;
            return;
        }

        if (state.cases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No cases found</p>
                    <button class="btn btn-outline" onclick="Dashboard.clearFilters()">
                        Clear filters
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        for (const caseItem of state.cases) {
            const statusConfig = STATUS_CONFIG[caseItem.status] || { label: caseItem.status };
            const isActive = state.selectedCaseId === caseItem.dashboard_id;

            html += `
                <div class="case-card ${isActive ? 'active' : ''}"
                     data-id="${caseItem.dashboard_id}"
                     onclick="Dashboard.selectCase('${caseItem.dashboard_id}')">
                    <div class="case-card-header">
                        <div class="case-card-title">
                            ${caseItem.primary_client_name || 'Unknown Client'}
                            ${caseItem.is_priority ? '<span class="priority-badge"><i class="fas fa-star"></i> Priority</span>' : ''}
                        </div>
                        <div class="case-card-intake">${caseItem.intake_number || 'N/A'}</div>
                    </div>
                    <div class="case-card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${caseItem.property_full_address || caseItem.property_address || 'No address'}</span>
                        <span><i class="fas fa-clock"></i> ${formatTimeAgo(caseItem.updated_at)}</span>
                    </div>
                    <div class="case-card-status">
                        <span class="status-badge ${caseItem.status}">
                            <span class="status-dot ${caseItem.status}"></span>
                            ${statusConfig.label}
                        </span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    function renderResultsCount() {
        const el = document.getElementById('results-count');
        if (!el) return;

        const { page, limit, total } = state.pagination;
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);

        if (total === 0) {
            el.textContent = 'No results';
        } else {
            el.textContent = `Showing ${start}-${end} of ${total} cases`;
        }
    }

    function renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const { page, totalPages } = state.pagination;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button ${page <= 1 ? 'disabled' : ''} onclick="Dashboard.goToPage(${page - 1})">
                <i class="fas fa-chevron-left"></i> Prev
            </button>
        `;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button onclick="Dashboard.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span style="padding: 8px;">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="Dashboard.goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span style="padding: 8px;">...</span>`;
            }
            html += `<button onclick="Dashboard.goToPage(${totalPages})">${totalPages}</button>`;
        }

        html += `
            <button ${page >= totalPages ? 'disabled' : ''} onclick="Dashboard.goToPage(${page + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = html;
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

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

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

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

    async function loadDashboard() {
        console.log('loadDashboard: Starting...');
        state.isLoading = true;
        renderCaseList();

        try {
            console.log('loadDashboard: Fetching data...');
            console.log('loadDashboard: Auth token:', getAuthToken() ? 'present' : 'MISSING');
            const data = await fetchDashboard();
            console.log('loadDashboard: Data received:', data);

            state.cases = data.data || [];
            state.pagination = data.pagination || state.pagination;
            state.statusSummary = data.statusSummary || [];
            state.isLoading = false;  // Set BEFORE rendering so spinner stops

            console.log('loadDashboard: Cases count:', state.cases.length);
            renderCaseList();
            renderResultsCount();
            renderPagination();
            renderStatusFilters();
            renderStatsSummary();

        } catch (error) {
            console.error('loadDashboard: FAILED:', error);
            showNotification('Failed to load dashboard data', 'error');
            state.isLoading = false;
            renderCaseList();
        }

        state.isLoading = false;
        console.log('loadDashboard: Complete');
    }

    async function loadAttorneys() {
        try {
            const data = await fetchAttorneys();
            state.attorneys = data.data || data || [];
            renderAttorneyFilter();
        } catch (error) {
            console.error('Failed to load attorneys:', error);
        }
    }

    // ============================================================================
    // Filter Functions
    // ============================================================================

    function setFilter(key, value) {
        state.filters[key] = value;
        state.pagination.page = 1; // Reset to first page
        loadDashboard();
    }

    function clearFilters() {
        state.filters = {
            status: null,
            attorney_id: null,
            priority: false,
            search: ''
        };
        state.pagination.page = 1;

        // Reset UI
        document.getElementById('search-input').value = '';
        document.getElementById('attorney-filter').value = '';
        document.getElementById('priority-filter').checked = false;

        loadDashboard();
    }

    function goToPage(page) {
        state.pagination.page = page;
        loadDashboard();
    }

    function selectCase(id) {
        console.log('selectCase called with id:', id);
        state.selectedCaseId = id;

        // Update visual state in list
        document.querySelectorAll('.case-card').forEach(card => {
            card.classList.toggle('active', card.dataset.id === id);
        });

        // Show modal
        const modal = document.getElementById('case-detail-modal');
        console.log('Modal element found:', !!modal);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Modal classes after add:', modal.className);
        } else {
            console.error('Modal element not found!');
        }

        // Load case details
        console.log('CaseDetail available:', typeof window.CaseDetail !== 'undefined');
        if (typeof window.CaseDetail !== 'undefined' && window.CaseDetail.loadCase) {
            window.CaseDetail.loadCase(id);
        } else {
            console.error('CaseDetail.loadCase not available');
        }
    }

    // ============================================================================
    // Event Handlers
    // ============================================================================

    function setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    setFilter('search', e.target.value);
                }, 300);
            });
        }

        // Attorney filter
        const attorneyFilter = document.getElementById('attorney-filter');
        if (attorneyFilter) {
            attorneyFilter.addEventListener('change', (e) => {
                setFilter('attorney_id', e.target.value || null);
            });
        }

        // Priority filter
        const priorityFilter = document.getElementById('priority-filter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                setFilter('priority', e.target.checked);
            });
        }

        // Clear filters button
        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearFilters);
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadDashboard();
                showNotification('Dashboard refreshed', 'success');
            });
        }

        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                state.sort = e.target.value;
                loadDashboard();
            });
        }

        // Modal overlay - close on background click
        const modalOverlay = document.getElementById('case-detail-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                // Only close if clicking the overlay itself, not the modal content
                if (e.target === modalOverlay) {
                    if (typeof window.CaseDetail !== 'undefined' && window.CaseDetail.closePanel) {
                        window.CaseDetail.closePanel();
                    }
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('case-detail-modal');
                if (modal && modal.classList.contains('active')) {
                    if (typeof window.CaseDetail !== 'undefined' && window.CaseDetail.closePanel) {
                        window.CaseDetail.closePanel();
                    }
                }
            }
        });
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    function init() {
        setupEventListeners();
        loadAttorneys();
        loadDashboard();

        // Update navigation links to include token
        const token = getAuthToken();
        if (token) {
            document.querySelectorAll('.header-nav .nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.includes('token=')) {
                    const separator = href.includes('?') ? '&' : '?';
                    link.setAttribute('href', `${href}${separator}token=${token}`);
                }
            });
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

    window.Dashboard = {
        loadDashboard,
        selectCase,
        goToPage,
        clearFilters,
        showNotification,
        getState: () => state,
        STATUS_CONFIG
    };

})();

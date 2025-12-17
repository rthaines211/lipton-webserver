/**
 * Intake Search Modal - Client Intake to Document Generation Bridge
 *
 * This module provides the interface for attorneys to search client intakes
 * and auto-populate the document generation form with intake data.
 *
 * Features:
 * - Search intakes by name, email, or address
 * - Filter by status and date range
 * - Transform intake data to doc-gen format
 * - Auto-populate form fields
 *
 * Last Updated: 2025-12-16
 */

// Wrap in IIFE to avoid global variable conflicts
(function() {
    'use strict';

    let currentIntakes = [];
    let INTAKE_ACCESS_TOKEN = null;

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string safe for innerHTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

/**
 * Initialize the intake modal system
 * Gets the access token from URL parameters or localStorage
 */
function initIntakeModal() {
    // Get access token from URL parameter first (primary method)
    const urlParams = new URLSearchParams(window.location.search);
    INTAKE_ACCESS_TOKEN = urlParams.get('token');

    // Fallback to localStorage if URL param not present
    if (!INTAKE_ACCESS_TOKEN) {
        INTAKE_ACCESS_TOKEN = localStorage.getItem('INTAKE_ACCESS_TOKEN');
    }

    // Store in localStorage for future use
    if (INTAKE_ACCESS_TOKEN) {
        localStorage.setItem('INTAKE_ACCESS_TOKEN', INTAKE_ACCESS_TOKEN);
    }
}

/**
 * Open the intake search modal
 * Loads initial intake list when opened
 */
async function openIntakeModal() {
    const modal = document.getElementById('intake-search-modal');
    if (!modal) {
        console.error('Intake modal not found in DOM');
        return;
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Load intakes
    await searchIntakes();
}

/**
 * Close the intake search modal
 */
function closeIntakeModal() {
    const modal = document.getElementById('intake-search-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

/**
 * Search intakes with current filter values
 * Fetches data from the backend API and displays results
 */
async function searchIntakes() {
    const loadingState = document.getElementById('intake-loading-state');
    const emptyState = document.getElementById('intake-empty-state');
    const tableBody = document.getElementById('intake-table-body');
    const table = document.getElementById('intake-results-table');

    // Show loading state
    if (loadingState) loadingState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = 'none';
    if (tableBody) tableBody.innerHTML = '';

    try {
        // Get filter values
        const searchInput = document.getElementById('intake-search-input');
        const statusSelect = document.getElementById('intake-filter-status');
        const dateSelect = document.getElementById('intake-filter-date');

        const search = searchInput ? searchInput.value.trim() : '';
        const status = statusSelect ? statusSelect.value : '';
        const dateRange = dateSelect ? dateSelect.value : '30';

        // Build query string
        let query = '?limit=20';
        if (status) query += `&status=${encodeURIComponent(status)}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;

        // Calculate date range
        if (dateRange !== 'all') {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange));
            query += `&dateFrom=${dateFrom.toISOString()}`;
        }

        // Fetch intakes from API
        const response = await fetch(`/api/intakes${query}`, {
            headers: {
                'Authorization': `Bearer ${INTAKE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication required. Please log in.');
            }
            throw new Error(`Failed to load intakes: ${response.statusText}`);
        }

        const data = await response.json();
        currentIntakes = data.intakes || [];

        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';

        // Display results or empty state
        if (currentIntakes.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
        } else {
            if (table) table.style.display = 'table';
            displayIntakes(currentIntakes);
        }

    } catch (error) {
        console.error('Error loading intakes:', error);
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            // Clear existing content and build safely to prevent XSS
            emptyState.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-triangle';
            const p = document.createElement('p');
            p.textContent = error.message || 'Failed to load intakes. Please try again.';
            emptyState.appendChild(icon);
            emptyState.appendChild(p);
        }
        showNotification(error.message || 'Failed to load intakes', 'error');
    }
}

/**
 * Display intakes in the results table
 * @param {Array} intakes - Array of intake objects
 */
function displayIntakes(intakes) {
    const tableBody = document.getElementById('intake-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    intakes.forEach(intake => {
        const row = document.createElement('tr');

        // Format date
        const submittedDate = new Date(intake.intake_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Get property address (prefer property address, fallback to current address)
        const address = intake.property_street_address || intake.current_street_address || 'N/A';

        // Status badge
        const statusBadge = getStatusBadge(intake.intake_status);

        row.innerHTML = `
            <td><strong>${escapeHtml(intake.first_name)} ${escapeHtml(intake.last_name)}</strong></td>
            <td>${escapeHtml(address)}</td>
            <td>${escapeHtml(submittedDate)}</td>
            <td>${statusBadge}</td>
            <td>
                <button
                    class="intake-action-btn intake-action-btn-primary"
                    onclick="loadIntakeIntoForm('${escapeHtml(intake.id)}')"
                    title="Load this intake into the form"
                >
                    <i class="fas fa-check"></i> Select
                </button>
                <button
                    class="intake-action-btn intake-action-btn-secondary"
                    onclick="previewIntake('${escapeHtml(intake.id)}')"
                    title="Preview full intake details"
                >
                    <i class="fas fa-eye"></i> Preview
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Get status badge HTML for an intake status
 * @param {string} status - Intake status
 * @returns {string} HTML for status badge
 */
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="intake-status-badge intake-status-pending"><i class="fas fa-clock"></i> New</span>',
        'under_review': '<span class="intake-status-badge intake-status-under_review"><i class="fas fa-eye"></i> Under Review</span>',
        'approved': '<span class="intake-status-badge intake-status-approved"><i class="fas fa-check-circle"></i> Approved</span>',
        'rejected': '<span class="intake-status-badge intake-status-rejected"><i class="fas fa-times-circle"></i> Rejected</span>',
        'assigned': '<span class="intake-status-badge intake-status-approved"><i class="fas fa-user-check"></i> Assigned</span>'
    };

    return badges[status] || `<span class="intake-status-badge">${escapeHtml(status)}</span>`;
}

/**
 * Load a specific intake into the document generation form
 * Fetches the intake in doc-gen format and populates all fields
 * @param {string} intakeId - UUID of the intake to load
 */
async function loadIntakeIntoForm(intakeId) {
    try {
        // Show loading indicator
        showNotification('Loading intake data...', 'info');

        // Fetch intake in doc-gen format
        const response = await fetch(`/api/intakes/${intakeId}/doc-gen-format`, {
            headers: {
                'Authorization': `Bearer ${INTAKE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication required. Please log in.');
            }
            throw new Error(`Failed to load intake: ${response.statusText}`);
        }

        const docGenData = await response.json();

        // Populate the form
        populateDocGenForm(docGenData);

        // Close modal
        closeIntakeModal();

        // Show success message
        showNotification('Intake loaded successfully! Review and edit as needed.', 'success');

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading intake:', error);
        showNotification(error.message || 'Failed to load intake. Please try again.', 'error');
    }
}

/**
 * Populate the document generation form with intake data
 * Maps doc-gen formatted data to form fields
 * @param {Object} data - Document generation formatted data
 */
function populateDocGenForm(data) {
    // Ensure at least one plaintiff exists before populating
    const plaintiffsContainer = document.getElementById('plaintiffs-container');

    if (plaintiffsContainer && plaintiffsContainer.children.length === 0) {
        // Call the global addPlaintiff function to create plaintiff #1
        if (typeof window.addPlaintiff === 'function') {
            window.addPlaintiff();
        }
    }

    // Wait for DOM to update before populating fields
    // Increased timeout to 500ms to ensure issue categories are rendered
    setTimeout(() => {
        // Property Information
        setFieldValue('property-address', data['property-address']);
        setFieldValue('apartment-unit', data['apartment-unit']);
        setFieldValue('city', data['city']);
        setFieldValue('state', data['state']);
        setFieldValue('zip-code', data['zip-code']);
        setFieldValue('filing-county', data['filing-county']);

        // Plaintiff 1 (Primary Client)
        // Handle both naming conventions (with and without hyphens in "firstname"/"lastname")
        setFieldValue('plaintiff-1-first-name', data['plaintiff-1-first-name'] || data['plaintiff-1-firstname']);
        setFieldValue('plaintiff-1-last-name', data['plaintiff-1-last-name'] || data['plaintiff-1-lastname']);

        // Set age radio button (adult/child) based on is-adult flag
        if (data['plaintiff-1-is-adult']) {
            setRadioValue('plaintiff-1-age', 'adult');
        } else if (data['plaintiff-1-is-adult'] === false) {
            setRadioValue('plaintiff-1-age', 'child');
        }

        // Set head of household radio button
        if (data['plaintiff-1-head-of-household']) {
            setRadioValue('plaintiff-1-head', 'yes');
        }

        // ===== BUILDING ISSUES POPULATION =====
        // The API returns field names that EXACTLY match the doc-gen form checkbox names
        // Format: hab-{category}-{item} (e.g., 'hab-pest-mice-rats', 'hab-heating-ac-problems')
        let issuesPopulated = 0;
        const categoriesToExpand = new Set();

        // Iterate through ALL fields in the API response
        for (const [fieldName, fieldValue] of Object.entries(data)) {
            // Process hab-* fields, edit-issue-* fields, *-toggle-* fields, AND individual checkbox fields
            const isIndividualCheckbox = fieldName.match(/^(vermin|insect|plumbing|electrical|hvac|appliances|health-hazard|structure|flooring|cabinets|door|windows|fire-hazard|nuisance|trash|common-areas|notices|utility|safety|harassment|government|direct)-[A-Za-z0-9]+-\d+$/);

            if ((fieldName.startsWith('hab-') || fieldName.startsWith('edit-issue-') || fieldName.includes('-toggle-') || isIndividualCheckbox) && fieldValue === true) {
                // Try checkbox first
                let success = setCheckboxValue(fieldName, true);

                // If checkbox not found, try radio button
                if (!success) {
                    success = setRadioValue(fieldName, 'yes');
                }

                // If still not found, check if it's a textarea
                if (!success) {
                    const textarea = document.querySelector(`textarea[name="${fieldName}"]`);
                    if (textarea) {
                        textarea.value = '(Issues reported in client intake form)';
                        success = true;
                    }
                }

                if (success) {
                    issuesPopulated++;
                }
            }
        }

        // ===== ISSUE DETAIL TEXTAREAS =====
        const detailFields = [
            'hab-electrical-details', 'hab-appliance-details', 'hab-heating-details',
            'hab-plumbing-details', 'hab-flooring-details', 'hab-windows-details',
            'hab-doors-details', 'hab-structure-details', 'hab-nuisances-details',
            'hab-pest-details', 'hab-common-details', 'hab-fire-details',
            'hab-health-details', 'hab-additional-notes', 'vermin-details',
            'insect-details', 'additional-notes'
        ];

        const severityFields = [
            'vermin-severity', 'insect-severity',
            'vermin-first-noticed', 'insect-first-noticed'
        ];

        for (const fieldName of detailFields) {
            const value = data[fieldName];
            if (value && typeof value === 'string' && value.trim()) {
                setFieldValue(fieldName, value);
            }
        }

        for (const fieldName of severityFields) {
            const value = data[fieldName];
            if (value) {
                setFieldValue(fieldName, value);
            }
        }

        // ===== POPULATE CATEGORY-SPECIFIC INTAKE NOTES =====
        const intakeCategoryMap = {
            'vermin': 'vermin', 'insect': 'insect', 'hvac': 'hvac',
            'electrical': 'electrical', 'plumbing': 'plumbing',
            'appliances': 'appliance', 'health-hazard': 'health-hazard',
            'structure': 'structure', 'flooring': 'flooring',
            'cabinets': 'cabinet', 'door': 'door', 'windows': 'window',
            'fire-hazard': 'fire-hazard', 'nuisance': 'nuisance',
            'trash': 'trash', 'common-areas': 'common-area',
            'notices': 'notices', 'utility': 'utility', 'safety': 'safety',
            'harassment': 'harassment', 'government': 'government'
        };

        Object.entries(intakeCategoryMap).forEach(([htmlCategory, apiPrefix]) => {
            const details = data[`${apiPrefix}-details`];
            const severity = data[`${apiPrefix}-severity`];
            const firstNoticed = data[`${apiPrefix}-first-noticed`];
            const repairHistory = data[`${apiPrefix}-repair-history`];

            if (details || severity || firstNoticed || repairHistory) {
                const plaintiffId = 1;
                const notesContainer = document.getElementById(`${htmlCategory}-intake-notes-${plaintiffId}`);

                if (notesContainer) {
                    notesContainer.style.display = 'block';

                    if (firstNoticed) {
                        const dateContainer = document.getElementById(`${htmlCategory}-intake-date-${plaintiffId}`);
                        if (dateContainer) {
                            dateContainer.style.display = 'block';
                            const dateText = dateContainer.querySelector('.intake-date-text');
                            if (dateText) dateText.textContent = firstNoticed;
                        }
                    }

                    if (severity) {
                        const severityContainer = document.getElementById(`${htmlCategory}-intake-severity-${plaintiffId}`);
                        if (severityContainer) {
                            severityContainer.style.display = 'block';
                            const severityText = severityContainer.querySelector('.intake-severity-text');
                            if (severityText) {
                                severityText.textContent = severity.charAt(0).toUpperCase() + severity.slice(1);
                                const severityColors = {
                                    'severe': '#dc2626', 'moderate': '#f59e0b', 'mild': '#16a34a'
                                };
                                severityText.style.color = severityColors[severity.toLowerCase()] || '#1e293b';
                            }
                        }
                    }

                    if (details) {
                        const detailsContainer = document.getElementById(`${htmlCategory}-intake-details-${plaintiffId}`);
                        if (detailsContainer) {
                            detailsContainer.style.display = 'block';
                            const detailsText = detailsContainer.querySelector('.intake-details-text');
                            if (detailsText) detailsText.textContent = details;
                        }
                    }

                    if (repairHistory) {
                        const repairContainer = document.getElementById(`${htmlCategory}-intake-repair-${plaintiffId}`);
                        if (repairContainer) {
                            repairContainer.style.display = 'block';
                            const repairText = repairContainer.querySelector('.intake-repair-text');
                            if (repairText) repairText.textContent = repairHistory;
                        }
                    }

                    // Expand the category section
                    const categoryContent = document.getElementById(`${htmlCategory}-content-${plaintiffId}`);
                    const categoryButton = document.getElementById(`${htmlCategory}-button-${plaintiffId}`);
                    if (categoryContent && categoryButton) {
                        categoryContent.removeAttribute('hidden');
                        categoryContent.classList.add('show');
                        categoryButton.setAttribute('aria-expanded', 'true');
                    }
                }
            }
        });

        // ===== POPULATE DIRECT ISSUE INTAKE NOTES =====
        const directIssuesMap = {
            'injury': 'Injury Issues',
            'nonresponsive': 'Nonresponsive Landlord',
            'unauthorized': 'Unauthorized Entries',
            'stolen': 'Stolen Items',
            'disabilityDiscrim': 'Disability Discrimination',
            'damaged': 'Damaged Items',
            'ageDiscrim': 'Age Discrimination',
            'racialDiscrim': 'Racial Discrimination',
            'securityDeposit': 'Security Deposit'
        };

        const plaintiffId = 1;
        const notesContainer = document.getElementById(`direct-issues-intake-notes-${plaintiffId}`);
        const notesGrid = document.getElementById(`direct-issues-notes-grid-${plaintiffId}`);

        if (notesContainer && notesGrid) {
            let directNotesHtml = '';
            let directNotesPopulated = 0;

            const severityColors = {
                'severe': '#dc2626', 'moderate': '#f59e0b', 'mild': '#16a34a'
            };

            Object.entries(directIssuesMap).forEach(([apiPrefix, title]) => {
                const kebabPrefix = apiPrefix.replace(/([A-Z])/g, '-$1').toLowerCase();
                const details = data[`${kebabPrefix}-details`];
                const severity = data[`${kebabPrefix}-severity`];
                const firstNoticed = data[`${kebabPrefix}-first-noticed`];
                const repairHistory = data[`${kebabPrefix}-repair-history`];

                if (details || severity || firstNoticed || repairHistory) {
                    directNotesPopulated++;
                    const severityColor = severityColors[severity?.toLowerCase()] || '#1e293b';
                    const severityLabel = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : '';

                    directNotesHtml += `
                        <div class="direct-issue-note-card" style="background: white; border: 1px solid #e0f2fe; border-radius: 6px; padding: 10px 12px;">
                            <div style="font-weight: 600; color: #0369a1; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #e0f2fe; padding-bottom: 6px;">${escapeHtml(title)}</div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: ${details || repairHistory ? '10px' : '0'};">
                                ${firstNoticed ? `<div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 2px;">First Noticed</div>
                                    <div style="font-size: 13px; color: #0c4a6e; font-weight: 600;">${escapeHtml(firstNoticed)}</div>
                                </div>` : ''}
                                ${severity ? `<div>
                                    <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 2px;">Severity</div>
                                    <div style="font-size: 13px; color: ${severityColor}; font-weight: 600;">${escapeHtml(severityLabel)}</div>
                                </div>` : ''}
                            </div>
                            ${details ? `<div style="margin-bottom: 10px;">
                                <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Details</div>
                                <div style="font-size: 13px; color: #1e293b; background: white; padding: 8px 10px; border-radius: 4px; border: 1px solid #e0f2fe;">${escapeHtml(details)}</div>
                            </div>` : ''}
                            ${repairHistory ? `<div>
                                <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Repair History</div>
                                <div style="font-size: 13px; color: #1e293b; background: white; padding: 8px 10px; border-radius: 4px; border: 1px solid #e0f2fe;">${escapeHtml(repairHistory)}</div>
                            </div>` : ''}
                        </div>
                    `;
                }
            });

            if (directNotesPopulated > 0) {
                notesGrid.innerHTML = directNotesHtml;
                notesContainer.style.display = 'block';
            }
        }

        // Expand categories that have populated checkboxes
        if (categoriesToExpand.size > 0) {
            categoriesToExpand.forEach(category => {
                if (typeof setCategoryExpansion === 'function') {
                    setCategoryExpansion(1, category, true);
                } else {
                    const content = document.getElementById(`${category}-content-1`);
                    const button = document.getElementById(`${category}-button-1`);
                    if (content && button) {
                        content.removeAttribute('hidden');
                        content.classList.add('show');
                        button.setAttribute('aria-expanded', 'true');
                    }
                }
            });
        }

    }, 500);
}

/**
 * Set a form field value by name or id
 * @param {string} fieldName - Name or ID of the field
 * @param {any} value - Value to set
 */
function setFieldValue(fieldName, value) {
    if (!value) return;

    let field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) {
        field = document.getElementById(fieldName);
    }

    if (field) {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

/**
 * Set a checkbox value by name or id
 * @param {string} fieldName - Name or ID of the checkbox
 * @param {boolean} checked - Whether to check the box
 * @returns {boolean} True if checkbox was found and set, false otherwise
 */
function setCheckboxValue(fieldName, checked) {
    let field = document.querySelector(`[name="${fieldName}"][type="checkbox"]`);
    if (!field) {
        field = document.querySelector(`#${fieldName}[type="checkbox"]`);
    }

    if (field && field.type === 'checkbox') {
        field.checked = checked;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    return false;
}

/**
 * Set a radio button value by name
 * @param {string} radioName - Name of the radio button group
 * @param {string} value - Value to select
 * @returns {boolean} True if radio was found and set, false otherwise
 */
function setRadioValue(radioName, value) {
    const radios = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);

    let found = false;
    radios.forEach(radio => {
        if (radio.value === value) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            found = true;
        }
    });

    return found;
}

/**
 * Preview intake details
 * @param {string} intakeId - UUID of the intake to preview
 */
function previewIntake(intakeId) {
    // Open intake in a new tab for preview
    const token = INTAKE_ACCESS_TOKEN ? `&token=${INTAKE_ACCESS_TOKEN}` : '';
    window.open(`/api/intakes/${intakeId}?format=html${token}`, '_blank');
}

/**
 * Show a notification toast message
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'success') {
    const existing = document.querySelectorAll('.intake-notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `intake-notification intake-notification-${type}`;

    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-circle' :
                 'info-circle';

    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ============================================================================
// Phase 7B.4: Auto-load intake from URL parameter
// ============================================================================
/**
 * Check for loadIntake URL parameter and auto-load the intake
 * Called after intake modal is initialized
 */
async function checkAutoLoadIntake() {
    const urlParams = new URLSearchParams(window.location.search);
    const intakeId = urlParams.get('loadIntake');

    if (intakeId) {
        showNotification('Loading intake from CRM Dashboard...', 'info');

        // Wait for form to fully initialize
        setTimeout(async () => {
            try {
                await loadIntakeIntoForm(intakeId);

                // Remove the URL parameter to avoid re-loading on refresh
                const url = new URL(window.location.href);
                url.searchParams.delete('loadIntake');
                window.history.replaceState({}, document.title, url.pathname + url.search);
            } catch (error) {
                console.error('Failed to auto-load intake:', error);
                showNotification('Failed to load intake from dashboard. Please try selecting it manually.', 'error');
            }
        }, 500);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initIntakeModal();
    checkAutoLoadIntake();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('intake-search-modal');
    if (modal && e.target === modal) {
        closeIntakeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('intake-search-modal');
        if (modal && modal.style.display === 'flex') {
            closeIntakeModal();
        }
    }
});

// Expose functions to global scope for inline event handlers
window.openIntakeModal = openIntakeModal;
window.closeIntakeModal = closeIntakeModal;
window.searchIntakes = searchIntakes;
window.loadIntakeIntoForm = loadIntakeIntoForm;
window.previewIntake = previewIntake;

})(); // Close IIFE

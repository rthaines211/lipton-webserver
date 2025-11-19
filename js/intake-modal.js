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
 * Last Updated: 2025-11-18
 */

// Wrap in IIFE to avoid global variable conflicts
(function() {
    'use strict';

    let currentIntakes = [];
    let INTAKE_ACCESS_TOKEN = null;

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
        console.log('Access token initialized for intake modal');
    } else {
        console.warn('No access token found. Intake modal will require authentication.');
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
            emptyState.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message || 'Failed to load intakes. Please try again.'}</p>
            `;
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
            <td><strong>${intake.first_name} ${intake.last_name}</strong></td>
            <td>${address}</td>
            <td>${submittedDate}</td>
            <td>${statusBadge}</td>
            <td>
                <button
                    class="intake-action-btn intake-action-btn-primary"
                    onclick="loadIntakeIntoForm('${intake.id}')"
                    title="Load this intake into the form"
                >
                    <i class="fas fa-check"></i> Select
                </button>
                <button
                    class="intake-action-btn intake-action-btn-secondary"
                    onclick="previewIntake('${intake.id}')"
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

    return badges[status] || `<span class="intake-status-badge">${status}</span>`;
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
    console.log('Populating form with data:', data);

    // Ensure at least one plaintiff exists before populating
    const plaintiffsContainer = document.getElementById('plaintiffs-container');
    if (plaintiffsContainer && plaintiffsContainer.children.length === 0) {
        // Call the global addPlaintiff function to create plaintiff #1
        if (typeof window.addPlaintiff === 'function') {
            window.addPlaintiff();
            console.log('Created plaintiff #1 for intake data population');
        }
    }

    // Wait for DOM to update before populating fields
    // Use setTimeout to allow plaintiff creation to complete
    setTimeout(() => {
        // Property Information
        setFieldValue('property-address', data['property-address']);
        setFieldValue('apartment-unit', data['apartment-unit']);
        setFieldValue('city', data['city']);
        setFieldValue('state', data['state']);
        setFieldValue('zip-code', data['zip-code']);
        setFieldValue('filing-county', data['filing-county']);

        // Plaintiff 1 (Primary Client)
        // Only populate fields that exist in the attorney form
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

        // Issue Checkboxes - Map from intake API field names to doc-gen form field names
        // Doc-gen form uses: {category}-{Item}-{plaintiffNumber}
        // API returns: issue-{category}-{item}
        //
        // Comprehensive mapping covering all issue categories
        const issueMapping = {
            // ===== PEST/VERMIN ISSUES =====
            'issue-pest-rodents': 'vermin-RatsMice-1',

            // ===== INSECT ISSUES =====
            'issue-pest-cockroaches': 'insect-Roaches-1',
            'issue-pest-bed-bugs': 'insect-Bedbugs-1',

            // ===== HVAC ISSUES =====
            'issue-hvac-no-heat': 'hvac-Heater-1',
            'issue-hvac-no-ac': 'hvac-AirConditioner-1',
            'issue-hvac-poor-ventilation': 'hvac-Ventilation-1',

            // ===== ELECTRICAL ISSUES =====
            'issue-electrical-outages': 'electrical-Panel-1',
            'issue-electrical-sparks': 'electrical-Outlets-1',
            'issue-electrical-overloaded': 'electrical-Panel-1',

            // ===== PLUMBING ISSUES =====
            'issue-plumbing-leaks': 'plumbing-Leaks-1',
            'issue-plumbing-no-pressure': 'plumbing-Insufficientwaterpressure-1',
            'issue-plumbing-no-hot-water': 'plumbing-Nohotwater-1',
            'issue-plumbing-sewer-backup': 'plumbing-Sewagecomingout-1',
            'issue-plumbing-clogged-drains': 'plumbing-Cloggedsinks-1',

            // ===== MOLD/HEALTH HAZARD ISSUES =====
            'issue-mold-visible': 'health-hazard-Mold-1',
            'issue-mold-smell': 'health-hazard-Mold-1',
            'issue-mold-extensive': 'health-hazard-Mold-1',

            // ===== WATER/STRUCTURE ISSUES =====
            'issue-water-leak': 'structure-Leaksingarage-1',
            'issue-water-damage': 'structure-Waterstainsonwall-1',
            'issue-water-standing': 'structure-Basementflood-1',

            // ===== FIRE SAFETY ISSUES =====
            'issue-safety-no-smoke': 'fire-hazard-SmokeAlarms-1',
            'issue-safety-no-co': 'fire-hazard-Carbonmonoxidedetectors-1',

            // ===== SAFETY/SECURITY ISSUES =====
            'issue-safety-broken-locks': 'safety-Inoperablelocks-1',

            // ===== STRUCTURAL ISSUES =====
            'issue-structural-cracks': 'structure-Holeinwall-1',
            'issue-structural-leaning': 'structure-Holeinceiling-1',
            'issue-structural-collapse': 'structure-Bumpsinceiling-1',
        };

        // Populate issue checkboxes using mapping
        console.log('Mapping issues from intake data:', data);
        let issuesPopulated = 0;
        for (const [apiFieldName, docGenFieldName] of Object.entries(issueMapping)) {
            if (data[apiFieldName] === true) {
                const success = setCheckboxValue(docGenFieldName, true);
                if (success) {
                    issuesPopulated++;
                    console.log(`✓ Mapped ${apiFieldName} → ${docGenFieldName}`);
                }
            }
        }
        console.log(`Successfully populated ${issuesPopulated} issue checkboxes`);

        console.log('Form population complete');
    }, 100); // Wait 100ms for DOM to update
}

/**
 * Set a form field value by name or id
 * @param {string} fieldName - Name or ID of the field
 * @param {any} value - Value to set
 */
function setFieldValue(fieldName, value) {
    if (!value) return; // Don't set empty/null values

    // Try by name first, then by ID
    let field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) {
        field = document.getElementById(fieldName);
    }

    if (field) {
        field.value = value;
        // Trigger change event for any listeners
        field.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        console.warn(`Field not found: ${fieldName}`);
    }
}

/**
 * Set a checkbox value by name or id
 * @param {string} fieldName - Name or ID of the checkbox
 * @param {boolean} checked - Whether to check the box
 * @returns {boolean} True if checkbox was found and set, false otherwise
 */
function setCheckboxValue(fieldName, checked) {
    // Try by name first, then by ID
    let field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) {
        field = document.getElementById(fieldName);
    }

    if (field && field.type === 'checkbox') {
        field.checked = checked;
        // Trigger change event for any listeners
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    } else {
        console.warn(`Checkbox not found: ${fieldName}`);
        return false;
    }
}

/**
 * Set a radio button value by name
 * @param {string} radioName - Name of the radio button group
 * @param {string} value - Value to select
 */
function setRadioValue(radioName, value) {
    // Find all radio buttons with this name
    const radios = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);

    // Select the one with matching value
    radios.forEach(radio => {
        if (radio.value === value) {
            radio.checked = true;
            // Trigger change event for any listeners
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    if (radios.length === 0) {
        console.warn(`Radio group not found: ${radioName}`);
    }
}

/**
 * Preview intake details (future enhancement)
 * @param {string} intakeId - UUID of the intake to preview
 */
function previewIntake(intakeId) {
    // TODO: Implement preview modal with full intake details
    showNotification('Preview feature coming soon!', 'info');
    console.log('Preview intake:', intakeId);
}

/**
 * Show a notification toast message
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existing = document.querySelectorAll('.intake-notification');
    existing.forEach(el => el.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `intake-notification intake-notification-${type}`;

    // Add icon based on type
    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-circle' :
                 'info-circle';

    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initIntakeModal();
    console.log('Intake modal system initialized');
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

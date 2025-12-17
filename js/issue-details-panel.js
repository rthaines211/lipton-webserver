/**
 * Issue Details Panel - Read-Only Display of Intake Issue Metadata
 *
 * Phase 5.2 Implementation (2025-12-11)
 *
 * This module provides read-only display of intake issue metadata
 * (Additional Details, First Noticed, Severity, Repair History) after loading
 * an intake into the document generation form.
 *
 * Features:
 * - Injects metadata directly into each issue category section
 * - Color-coded severity badges (Low=green, Medium=yellow, High=orange, Critical=red)
 * - Date formatting for First Noticed
 * - Photo count indicator
 * - Read-only display (no editing)
 * - Consistent styling with doc-gen form
 *
 * Usage:
 * 1. Fetch issue metadata from GET /api/intakes/:id/issue-metadata
 * 2. Call IssueDetailsPanel.injectIntoCategories(issueMetadata, plaintiffId)
 * 3. Metadata appears within each category's accordion content
 *
 * Last Updated: 2025-12-11
 */

(function() {
    'use strict';

    /**
     * Severity level colors and labels
     */
    const SEVERITY_CONFIG = {
        // Legacy severity values
        low: { label: 'Low', color: '#48BB78', bgColor: '#F0FFF4', textColor: '#1A202C' },
        medium: { label: 'Medium', color: '#ECC94B', bgColor: '#FFFFF0', textColor: '#1A202C' },
        high: { label: 'High', color: '#ED8936', bgColor: '#FFFAF0', textColor: '#1A202C' },
        critical: { label: 'Critical', color: '#F56565', bgColor: '#FFF5F5', textColor: '#1A202C' },
        // New intake form severity values (Phase 4)
        mild: { label: 'Mild', color: '#48BB78', bgColor: '#F0FFF4', textColor: '#1A202C' },
        moderate: { label: 'Moderate', color: '#ECC94B', bgColor: '#FFFFF0', textColor: '#1A202C' },
        severe: { label: 'Severe', color: '#ED8936', bgColor: '#FFFAF0', textColor: '#1A202C' },
        minor: { label: 'Minor', color: '#48BB78', bgColor: '#F0FFF4', textColor: '#1A202C' }
    };

    /**
     * Category display names mapping
     */
    const CATEGORY_DISPLAY_NAMES = {
        'vermin': 'Vermin',
        'insects': 'Insects',
        'electrical': 'Electrical',
        'hvac': 'HVAC',
        'plumbing': 'Plumbing',
        'appliances': 'Appliances',
        'flooring': 'Flooring',
        'windows': 'Windows',
        'doors': 'Doors',
        'structure': 'Structure',
        'fire_hazard': 'Fire Hazard',
        'health_hazard': 'Health Hazard',
        'common_areas': 'Common Areas',
        'trash': 'Trash',
        'nuisance': 'Nuisance',
        'harassment': 'Harassment',
        'cabinets': 'Cabinets',
        'notices': 'Notices',
        'utility': 'Utility',
        'safety': 'Safety',
        'mold': 'Mold',
        'lead': 'Lead',
        'asbestos': 'Asbestos',
        // Yes/No categories (Phase 4)
        'injury': 'Injury Issues',
        'nonresponsive': 'Nonresponsive Landlord',
        'unauthorized': 'Unauthorized Entries',
        'stolen': 'Stolen Items',
        'damaged': 'Damaged Items',
        'ageDiscrim': 'Age Discrimination',
        'racialDiscrim': 'Racial Discrimination',
        'disabilityDiscrim': 'Disability Discrimination',
        'securityDeposit': 'Security Deposit Issues'
    };

    /**
     * Category icons mapping
     */
    const CATEGORY_ICONS = {
        'vermin': 'fa-bug',
        'insects': 'fa-spider',
        'electrical': 'fa-bolt',
        'hvac': 'fa-fan',
        'plumbing': 'fa-faucet',
        'appliances': 'fa-blender',
        'flooring': 'fa-th-large',
        'windows': 'fa-window-maximize',
        'doors': 'fa-door-open',
        'structure': 'fa-building',
        'fire_hazard': 'fa-fire-extinguisher',
        'health_hazard': 'fa-biohazard',
        'common_areas': 'fa-users',
        'trash': 'fa-trash-alt',
        'nuisance': 'fa-volume-up',
        'harassment': 'fa-exclamation-circle',
        'cabinets': 'fa-archive',
        'notices': 'fa-file-alt',
        'utility': 'fa-plug',
        'safety': 'fa-shield-alt',
        'mold': 'fa-bacterium',
        'lead': 'fa-radiation',
        'asbestos': 'fa-radiation-alt',
        // Yes/No categories (Phase 4)
        'injury': 'fa-user-injured',
        'nonresponsive': 'fa-phone-slash',
        'unauthorized': 'fa-door-open',
        'stolen': 'fa-hand-holding',
        'damaged': 'fa-exclamation-triangle',
        'ageDiscrim': 'fa-user-clock',
        'racialDiscrim': 'fa-users',
        'disabilityDiscrim': 'fa-wheelchair',
        'securityDeposit': 'fa-piggy-bank'
    };

    /**
     * Format a date string for display
     * @param {string} dateStr - ISO date string or date string
     * @returns {string} Formatted date string
     */
    function formatDate(dateStr) {
        if (!dateStr) return 'Not specified';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Get severity badge HTML
     * @param {string} severity - Severity level (low, medium, high, critical)
     * @returns {string} HTML string for severity badge
     */
    function getSeverityBadge(severity) {
        const config = SEVERITY_CONFIG[severity?.toLowerCase()] || SEVERITY_CONFIG.medium;
        return `
            <span class="issue-severity-badge" style="
                display: inline-flex;
                align-items: center;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                background-color: ${config.bgColor};
                color: ${config.textColor};
                border: 1px solid ${config.color};
            ">
                <i class="fas fa-circle" style="font-size: 6px; margin-right: 4px; color: ${config.color};"></i>
                ${config.label}
            </span>
        `;
    }

    /**
     * Get photo count indicator HTML
     * @param {Array} photos - Array of photo URLs/paths
     * @returns {string} HTML string for photo indicator
     */
    function getPhotoIndicator(photos) {
        const count = Array.isArray(photos) ? photos.length : 0;
        if (count === 0) return '';

        return `
            <span class="issue-photo-indicator" style="
                display: inline-flex;
                align-items: center;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                background-color: #EBF4FF;
                color: #3182CE;
                margin-left: 8px;
            ">
                <i class="fas fa-camera" style="margin-right: 4px;"></i>
                ${count} photo${count !== 1 ? 's' : ''}
            </span>
        `;
    }

    /**
     * Create a single issue detail card HTML
     * @param {Object} metadata - Issue metadata object
     * @param {number} index - Index for unique IDs
     * @returns {string} HTML string for the card
     */
    function createIssueCard(metadata, index) {
        const categoryCode = metadata.categoryCode || '';
        const categoryName = metadata.categoryName || CATEGORY_DISPLAY_NAMES[categoryCode] || categoryCode;
        const icon = CATEGORY_ICONS[categoryCode] || 'fa-exclamation-triangle';
        const isExpanded = index === 0; // First card expanded by default

        const hasDetails = metadata.additionalDetails && metadata.additionalDetails.trim();
        const hasFirstNoticed = metadata.firstNoticed;
        const hasSeverity = metadata.severity;
        const hasRepairHistory = metadata.repairHistory && metadata.repairHistory.trim();
        const hasPhotos = metadata.photos && metadata.photos.length > 0;

        // If no metadata to display, return empty
        if (!hasDetails && !hasFirstNoticed && !hasSeverity && !hasRepairHistory && !hasPhotos) {
            return '';
        }

        return `
            <div class="issue-detail-card" style="
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                margin-bottom: 12px;
                overflow: hidden;
                background: #fff;
            ">
                <!-- Card Header (Collapsible) -->
                <button
                    type="button"
                    class="issue-detail-header"
                    onclick="window.IssueDetailsPanel.toggleCard(${index})"
                    aria-expanded="${isExpanded}"
                    aria-controls="issue-detail-content-${index}"
                    style="
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 16px;
                        background: #F7FAFC;
                        border: none;
                        cursor: pointer;
                        text-align: left;
                    "
                >
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas ${icon}" style="color: #2D3748; font-size: 1rem;"></i>
                        <span style="font-weight: 600; color: #2D3748;">${categoryName}</span>
                        ${hasSeverity ? getSeverityBadge(metadata.severity) : ''}
                        ${hasPhotos ? getPhotoIndicator(metadata.photos) : ''}
                    </div>
                    <i class="fas fa-chevron-down issue-detail-chevron" id="issue-chevron-${index}" style="
                        color: #718096;
                        transition: transform 0.2s;
                        ${isExpanded ? 'transform: rotate(180deg);' : ''}
                    "></i>
                </button>

                <!-- Card Content -->
                <div
                    id="issue-detail-content-${index}"
                    class="issue-detail-content"
                    style="
                        padding: 0 16px;
                        max-height: ${isExpanded ? '500px' : '0'};
                        overflow: hidden;
                        transition: max-height 0.3s ease-out, padding 0.3s ease-out;
                        ${isExpanded ? 'padding: 16px;' : ''}
                    "
                >
                    <div style="display: grid; gap: 12px;">
                        ${hasFirstNoticed ? `
                            <div class="issue-field">
                                <label style="display: block; font-size: 0.75rem; color: #718096; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>
                                    First Noticed
                                </label>
                                <p style="margin: 0; color: #2D3748;">${formatDate(metadata.firstNoticed)}</p>
                            </div>
                        ` : ''}

                        ${hasDetails ? `
                            <div class="issue-field">
                                <label style="display: block; font-size: 0.75rem; color: #718096; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    <i class="fas fa-comment-alt" style="margin-right: 4px;"></i>
                                    Additional Details
                                </label>
                                <p style="margin: 0; color: #2D3748; white-space: pre-wrap; background: #F7FAFC; padding: 10px; border-radius: 4px; border-left: 3px solid #00AEEF;">${escapeHtml(metadata.additionalDetails)}</p>
                            </div>
                        ` : ''}

                        ${hasRepairHistory ? `
                            <div class="issue-field">
                                <label style="display: block; font-size: 0.75rem; color: #718096; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    <i class="fas fa-tools" style="margin-right: 4px;"></i>
                                    Repair History
                                </label>
                                <p style="margin: 0; color: #2D3748; white-space: pre-wrap; background: #F7FAFC; padding: 10px; border-radius: 4px; border-left: 3px solid #ED8936;">${escapeHtml(metadata.repairHistory)}</p>
                            </div>
                        ` : ''}

                        ${hasPhotos ? `
                            <div class="issue-field">
                                <label style="display: block; font-size: 0.75rem; color: #718096; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
                                    <i class="fas fa-camera" style="margin-right: 4px;"></i>
                                    Photos (${metadata.photos.length})
                                </label>
                                <p style="margin: 0; color: #718096; font-style: italic;">Photos are stored with the intake record</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle a card's expanded/collapsed state
     * @param {number} index - Card index
     */
    function toggleCard(index) {
        const content = document.getElementById(`issue-detail-content-${index}`);
        const chevron = document.getElementById(`issue-chevron-${index}`);
        const button = content?.parentElement?.querySelector('.issue-detail-header');

        if (!content) return;

        const isExpanded = content.style.maxHeight !== '0px' && content.style.maxHeight !== '';

        if (isExpanded) {
            // Collapse
            content.style.maxHeight = '0';
            content.style.padding = '0 16px';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
            if (button) button.setAttribute('aria-expanded', 'false');
        } else {
            // Expand
            content.style.maxHeight = '500px';
            content.style.padding = '16px';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
            if (button) button.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Render the issue details panel in the specified container
     * @param {string} containerId - ID of the container element
     * @param {Array} issueMetadata - Array of issue metadata objects
     * @param {Object} options - Rendering options
     * @param {string} options.intakeNumber - Intake number for display
     * @param {boolean} options.showHeader - Whether to show the panel header (default true)
     */
    function render(containerId, issueMetadata, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`IssueDetailsPanel: Container #${containerId} not found`);
            return;
        }

        const showHeader = options.showHeader !== false;
        const intakeNumber = options.intakeNumber || '';

        // Filter out items with no displayable metadata
        const displayableItems = (issueMetadata || []).filter(item => {
            return (item.additionalDetails && item.additionalDetails.trim()) ||
                   item.firstNoticed ||
                   item.severity ||
                   (item.repairHistory && item.repairHistory.trim()) ||
                   (item.photos && item.photos.length > 0);
        });

        if (displayableItems.length === 0) {
            // No metadata to display - show minimal message or hide
            container.innerHTML = `
                <div class="issue-details-panel" style="
                    background: #F7FAFC;
                    border: 1px solid #E2E8F0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                ">
                    <p style="margin: 0; color: #718096; text-align: center; font-style: italic;">
                        <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                        No additional issue details available from the intake form.
                    </p>
                </div>
            `;
            return;
        }

        // Build the panel HTML
        const cardsHtml = displayableItems.map((item, index) => createIssueCard(item, index)).join('');

        container.innerHTML = `
            <div class="issue-details-panel" style="
                background: #fff;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
                ${showHeader ? `
                    <div class="issue-details-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 2px solid #00AEEF;
                    ">
                        <h3 style="margin: 0; color: #1F2A44; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-clipboard-list" style="color: #00AEEF;"></i>
                            Client-Reported Issue Details
                            ${intakeNumber ? `<span style="font-size: 0.85rem; color: #718096; font-weight: normal;">(${intakeNumber})</span>` : ''}
                        </h3>
                        <span style="font-size: 0.75rem; color: #718096;">
                            <i class="fas fa-eye" style="margin-right: 4px;"></i>
                            Read-Only
                        </span>
                    </div>
                ` : ''}

                <div class="issue-details-cards">
                    ${cardsHtml}
                </div>

                <div class="issue-details-footer" style="
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #E2E8F0;
                    font-size: 0.75rem;
                    color: #718096;
                    text-align: center;
                ">
                    <i class="fas fa-info-circle" style="margin-right: 4px;"></i>
                    This information was provided by the client during intake. Review and verify before document generation.
                </div>
            </div>
        `;
    }

    /**
     * Clear/remove the issue details panel from a container
     * @param {string} containerId - ID of the container element
     */
    function clear(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Fetch issue metadata from API and render the panel
     * @param {string} intakeId - The intake UUID
     * @param {string} containerId - ID of the container element
     * @param {string} accessToken - Authorization token
     * @returns {Promise<boolean>} - Whether rendering was successful
     */
    async function fetchAndRender(intakeId, containerId, accessToken) {
        try {
            const response = await fetch(`/api/intakes/${intakeId}/issue-metadata`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // No metadata found - that's okay, just don't show panel
                    console.log('IssueDetailsPanel: No issue metadata found for intake');
                    return false;
                }
                throw new Error(`Failed to fetch issue metadata: ${response.statusText}`);
            }

            const data = await response.json();

            render(containerId, data.issueMetadata || [], {
                intakeNumber: data.intakeNumber
            });

            return true;

        } catch (error) {
            console.error('IssueDetailsPanel: Error fetching/rendering:', error);
            return false;
        }
    }

    /**
     * Map API category codes to doc-gen form category names
     * API uses camelCase, form uses lowercase
     */
    const CATEGORY_CODE_TO_FORM_NAME = {
        'vermin': 'vermin',
        'insects': 'insect',
        'electrical': 'electrical',
        'hvac': 'hvac',
        'plumbing': 'plumbing',
        'appliances': 'appliances',
        'flooring': 'flooring',
        'windows': 'windows',
        'doors': 'door',
        'door': 'door',
        'structure': 'structure',
        'structural': 'structure',
        'fireHazard': 'fire-hazard',
        'fire_hazard': 'fire-hazard',
        'healthHazard': 'health-hazard',
        'health_hazard': 'health-hazard',
        'commonAreas': 'common-areas',
        'common_areas': 'common-areas',
        'trash': 'trash',
        'nuisance': 'nuisance',
        'harassment': 'harassment',
        'cabinets': 'cabinets',
        'cabinet': 'cabinets',
        'notices': 'notices',
        'notice': 'notices',
        'utility': 'utility',
        'safety': 'safety',
        'security': 'security',
        // Yes/No categories (Phase 4)
        'injury': 'injuryissues',
        'nonresponsive': 'nonresponsivelandlordissues',
        'unauthorized': 'unauthorizedentries',
        'stolen': 'stolenitems',
        'damaged': 'damageditems',
        'ageDiscrim': 'agediscrimination',
        'racialDiscrim': 'racialdiscrimination',
        'disabilityDiscrim': 'disabilitydiscrimination',
        'securityDeposit': 'securitydepositissues'
    };

    /**
     * Create HTML for inline metadata display within a category
     * @param {Object} metadata - Issue metadata object
     * @returns {string} HTML string for the metadata section
     */
    function createInlineMetadataHtml(metadata) {
        const hasDetails = metadata.additionalDetails && metadata.additionalDetails.trim();
        const hasFirstNoticed = metadata.firstNoticed;
        const hasSeverity = metadata.severity;
        const hasRepairHistory = metadata.repairHistory && metadata.repairHistory.trim();
        const hasPhotos = metadata.photos && metadata.photos.length > 0;

        if (!hasDetails && !hasFirstNoticed && !hasSeverity && !hasRepairHistory && !hasPhotos) {
            return '';
        }

        let html = `
            <div class="intake-metadata-section" style="
                margin-bottom: 16px;
                padding: 12px;
                background: linear-gradient(135deg, #EBF8FF 0%, #F0FFF4 100%);
                border: 1px solid #90CDF4;
                border-radius: 6px;
                border-left: 3px solid #00AEEF;
            ">
                <div style="display: flex; align-items: center; margin-bottom: 8px; gap: 6px;">
                    <i class="fas fa-user-edit" style="color: #00AEEF; font-size: 12px;"></i>
                    <span style="font-size: 11px; font-weight: 600; color: #2B6CB0; text-transform: uppercase; letter-spacing: 0.5px;">
                        Client's Notes from Intake
                    </span>
                    ${hasSeverity ? getSeverityBadge(metadata.severity) : ''}
                </div>
        `;

        if (hasFirstNoticed) {
            html += `
                <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; color: #718096; font-weight: 500;">
                        <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>First Noticed:
                    </span>
                    <span style="font-size: 12px; color: #2D3748; margin-left: 4px;">${formatDate(metadata.firstNoticed)}</span>
                </div>
            `;
        }

        if (hasDetails) {
            html += `
                <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; color: #718096; font-weight: 500; display: block; margin-bottom: 2px;">
                        <i class="fas fa-comment-alt" style="margin-right: 4px;"></i>Additional Details:
                    </span>
                    <p style="margin: 0; font-size: 12px; color: #2D3748; background: white; padding: 6px 8px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(metadata.additionalDetails)}</p>
                </div>
            `;
        }

        if (hasRepairHistory) {
            html += `
                <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; color: #718096; font-weight: 500; display: block; margin-bottom: 2px;">
                        <i class="fas fa-tools" style="margin-right: 4px;"></i>Repair History:
                    </span>
                    <p style="margin: 0; font-size: 12px; color: #2D3748; background: white; padding: 6px 8px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(metadata.repairHistory)}</p>
                </div>
            `;
        }

        if (hasPhotos) {
            html += `
                <div>
                    <span style="font-size: 11px; color: #718096;">
                        <i class="fas fa-camera" style="margin-right: 4px;"></i>${metadata.photos.length} photo${metadata.photos.length !== 1 ? 's' : ''} attached
                    </span>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Yes/No categories that use direct-issue-item structure instead of accordion
     */
    const YES_NO_CATEGORIES = [
        'injury', 'nonresponsive', 'unauthorized', 'stolen', 'damaged',
        'ageDiscrim', 'racialDiscrim', 'disabilityDiscrim', 'securityDeposit'
    ];

    /**
     * Create HTML for a single Yes/No category item within the grouped container
     * @param {Object} metadata - The metadata object
     * @returns {string} HTML string for the item
     */
    function createYesNoMetadataItem(metadata) {
        const displayName = CATEGORY_DISPLAY_NAMES[metadata.categoryCode] || metadata.categoryCode;
        const icon = CATEGORY_ICONS[metadata.categoryCode] || 'fa-exclamation-circle';

        const hasSeverity = metadata.severity && metadata.severity !== 'not_specified';
        const hasFirstNoticed = metadata.firstNoticed && metadata.firstNoticed.trim();
        const hasDetails = metadata.additionalDetails && metadata.additionalDetails.trim();
        const hasRepairHistory = metadata.repairHistory && metadata.repairHistory.trim();

        // Skip if no actual data
        if (!hasSeverity && !hasFirstNoticed && !hasDetails && !hasRepairHistory) {
            return '';
        }

        let html = `
            <div class="yesno-metadata-item" style="background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; height: fit-content;">
                <div style="font-weight: 600; color: #2D3748; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <i class="fas ${icon}" style="color: #4A90A4;"></i>
                    ${escapeHtml(displayName)}
                    ${hasSeverity ? getSeverityBadge(metadata.severity) : ''}
                </div>
        `;

        // First noticed date row
        if (hasFirstNoticed) {
            html += `
                <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; color: #718096; font-weight: 500;">
                        <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>First Noticed:
                    </span>
                    <span style="font-size: 12px; color: #2D3748; margin-left: 4px;">${formatDate(metadata.firstNoticed)}</span>
                </div>
            `;
        }

        if (hasDetails) {
            html += `
                <div style="margin-bottom: 4px;">
                    <span style="font-size: 11px; color: #718096; font-weight: 500;"><i class="fas fa-comment-alt" style="margin-right: 4px;"></i>Details:</span>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #2D3748; background: white; padding: 4px 6px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(metadata.additionalDetails)}</p>
                </div>
            `;
        }

        if (hasRepairHistory) {
            html += `
                <div>
                    <span style="font-size: 11px; color: #718096; font-weight: 500;"><i class="fas fa-tools" style="margin-right: 4px;"></i>Repair History:</span>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #2D3748; background: white; padding: 4px 6px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(metadata.repairHistory)}</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Inject issue metadata directly into each category section in the plaintiff details
     * @param {Array} issueMetadata - Array of issue metadata objects
     * @param {number} plaintiffId - The plaintiff ID (default 1)
     */
    function injectIntoCategories(issueMetadata, plaintiffId = 1) {
        if (!issueMetadata || issueMetadata.length === 0) {
            console.log('IssueDetailsPanel: No metadata to inject');
            return;
        }

        let injectedCount = 0;

        // Separate Yes/No categories from regular categories
        const yesNoMetadata = [];
        const regularMetadata = [];

        issueMetadata.forEach(metadata => {
            if (YES_NO_CATEGORIES.includes(metadata.categoryCode)) {
                yesNoMetadata.push(metadata);
            } else {
                regularMetadata.push(metadata);
            }
        });

        // Process regular categories (accordion-based)
        regularMetadata.forEach(metadata => {
            const categoryCode = metadata.categoryCode;
            const formCategoryName = CATEGORY_CODE_TO_FORM_NAME[categoryCode] || categoryCode.toLowerCase();

            const contentId = `${formCategoryName}-content-${plaintiffId}`;
            const content = document.getElementById(contentId);

            if (!content) {
                console.log(`IssueDetailsPanel: Category container not found for: ${categoryCode} (tried ${formCategoryName})`);
                return;
            }

            // Remove any existing metadata section
            const existing = content.querySelector('.intake-metadata-section');
            if (existing) {
                existing.remove();
            }

            // Create and inject the metadata HTML
            const metadataHtml = createInlineMetadataHtml(metadata);
            if (metadataHtml) {
                // For regular categories: insert at the TOP of the content
                content.insertAdjacentHTML('afterbegin', metadataHtml);
                console.log(`IssueDetailsPanel: Injected metadata into ${formCategoryName}-content-${plaintiffId}`);

                // Expand the category to show the metadata
                const button = document.getElementById(`${formCategoryName}-button-${plaintiffId}`);
                if (button && button.getAttribute('aria-expanded') !== 'true') {
                    // Use the global setCategoryExpansion if available
                    if (typeof window.setCategoryExpansion === 'function') {
                        window.setCategoryExpansion(plaintiffId, formCategoryName, true);
                    } else {
                        // Fallback: directly manipulate DOM
                        content.removeAttribute('hidden');
                        content.classList.add('show');
                        button.setAttribute('aria-expanded', 'true');
                    }
                }
                injectedCount++;
            }
        });

        // Process Yes/No categories - group all into one container
        if (yesNoMetadata.length > 0) {
            // Remove any existing grouped Yes/No container
            const existingContainer = document.getElementById('yesno-metadata-container');
            if (existingContainer) {
                existingContainer.remove();
            }

            // Build grouped container HTML
            let groupedHtml = `
                <div id="yesno-metadata-container" class="intake-metadata-section" style="
                    background: linear-gradient(135deg, #EBF4FF 0%, #E6FFFA 100%);
                    border: 1px solid #4A90A4;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 10px 0 15px 0;
                    box-shadow: 0 2px 4px rgba(74, 144, 164, 0.1);
                ">
                    <div style="font-size: 12px; font-weight: 600; color: #2C5282; margin-bottom: 10px; display: flex; align-items: center;">
                        <i class="fas fa-clipboard-list" style="margin-right: 6px;"></i>
                        CLIENT'S NOTES FROM INTAKE
                    </div>
                    <div class="yesno-metadata-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            `;

            let itemsHtml = '';
            yesNoMetadata.forEach(metadata => {
                const itemHtml = createYesNoMetadataItem(metadata);
                if (itemHtml) {
                    itemsHtml += itemHtml;

                    // Also check the corresponding checkbox
                    const formCategoryName = CATEGORY_CODE_TO_FORM_NAME[metadata.categoryCode] || metadata.categoryCode.toLowerCase();
                    const checkboxId = `direct-${formCategoryName}-${plaintiffId}`;
                    const checkbox = document.getElementById(checkboxId);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                    }

                    injectedCount++;
                }
            });

            if (itemsHtml) {
                groupedHtml += itemsHtml + '</div></div>'; // Close grid and container

                // Find insertion point: after "Direct Yes/No Issues" heading, before the grid
                // The heading is an h4, followed by direct-issues-grid
                const directIssuesGrid = document.querySelector('.direct-issues-grid');
                if (directIssuesGrid) {
                    // Insert before the grid
                    directIssuesGrid.insertAdjacentHTML('beforebegin', groupedHtml);
                    console.log(`IssueDetailsPanel: Injected grouped Yes/No metadata container with ${yesNoMetadata.length} items`);
                } else {
                    console.log('IssueDetailsPanel: Could not find .direct-issues-grid for Yes/No metadata insertion');
                }
            }
        }

        console.log(`IssueDetailsPanel: Injected metadata into ${injectedCount} categories`);
    }

    /**
     * Clear all injected metadata sections from categories
     * @param {number} plaintiffId - The plaintiff ID (default 1)
     */
    function clearFromCategories(plaintiffId = 1) {
        const sections = document.querySelectorAll('.intake-metadata-section');
        sections.forEach(section => section.remove());
        console.log(`IssueDetailsPanel: Cleared ${sections.length} metadata sections`);
    }

    /**
     * Fetch issue metadata and inject into categories
     * @param {string} intakeId - The intake UUID
     * @param {number} plaintiffId - The plaintiff ID (default 1)
     * @param {string} accessToken - Authorization token
     * @returns {Promise<boolean>} - Whether injection was successful
     */
    async function fetchAndInject(intakeId, plaintiffId, accessToken) {
        try {
            const response = await fetch(`/api/intakes/${intakeId}/issue-metadata`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('IssueDetailsPanel: No issue metadata found for intake');
                    return false;
                }
                throw new Error(`Failed to fetch issue metadata: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.issueMetadata && data.issueMetadata.length > 0) {
                injectIntoCategories(data.issueMetadata, plaintiffId);
                return true;
            }

            return false;

        } catch (error) {
            console.error('IssueDetailsPanel: Error fetching/injecting:', error);
            return false;
        }
    }

    // Expose to global scope
    window.IssueDetailsPanel = {
        render: render,
        clear: clear,
        fetchAndRender: fetchAndRender,
        toggleCard: toggleCard,
        getSeverityBadge: getSeverityBadge,
        formatDate: formatDate,
        // New injection methods
        injectIntoCategories: injectIntoCategories,
        clearFromCategories: clearFromCategories,
        fetchAndInject: fetchAndInject
    };

})();

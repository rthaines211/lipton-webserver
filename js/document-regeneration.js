/**
 * Document Regeneration Module
 *
 * Handles selective document regeneration for previously submitted cases.
 * Integrates with existing submission modal and SSE progress tracking.
 *
 * Dependencies:
 * - sse-client.js: createJobStream() function for SSE tracking
 * - Existing modal infrastructure in index.html
 *
 * @author Legal Forms Application
 * @version 1.0.0
 */

// ============================================================
// MODULE STATE
// ============================================================

let currentCaseId = null;
let currentJobStream = null;
let isRegenerating = false;

// ============================================================
// MAIN ENTRY POINT
// ============================================================

/**
 * Display case in regeneration modal with document selection options
 *
 * @param {string} caseId - Database case ID (UUID)
 * @param {Object} caseData - Case information from database
 * @param {string} caseData.caseNumber - Case number
 * @param {string} caseData.caseTitle - Case title
 * @param {string} caseData.plaintiffName - Plaintiff name
 * @param {Array<string>} caseData.documentTypesToGenerate - Previously selected documents
 */
function showCaseForRegeneration(caseId, caseData) {
    console.log('📄 Opening regeneration modal for case:', caseId);
    console.log('Case data:', caseData);

    // Store current case ID
    currentCaseId = caseId;

    // Get modal element
    const modal = document.getElementById('regenerationModal');

    if (!modal) {
        console.error('❌ Regeneration modal not found in DOM');
        return;
    }

    // ============================================================
    // STEP 1: POPULATE CASE INFORMATION
    // ============================================================

    const caseNumberEl = document.getElementById('regen-case-number');
    const caseTitleEl = document.getElementById('regen-case-title');
    const plaintiffNameEl = document.getElementById('regen-plaintiff-name');

    if (caseNumberEl) caseNumberEl.textContent = caseData.caseNumber || '-';
    if (caseTitleEl) caseTitleEl.textContent = caseData.caseTitle || '-';
    if (plaintiffNameEl) plaintiffNameEl.textContent = caseData.plaintiffName || '-';

    // ============================================================
    // STEP 2: SET DOCUMENT SELECTION CHECKBOXES
    // ============================================================

    // Get all regeneration document checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');

    // Pre-check previously selected documents or default to all
    const previousSelection = caseData.documentTypesToGenerate || ['srogs', 'pods', 'admissions'];

    checkboxes.forEach(checkbox => {
        checkbox.checked = previousSelection.includes(checkbox.value);
        checkbox.disabled = false; // Ensure enabled
    });

    console.log(`✅ Pre-selected documents: ${previousSelection.join(', ')}`);

    // ============================================================
    // STEP 3: RESET UI STATE
    // ============================================================

    // Hide error message
    const errorElement = document.getElementById('regen-document-selection-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }

    // Hide progress section
    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'none';
    }

    // Reset button state
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.className = 'btn btn-primary';
        regenerateBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Regenerate Selected Documents';
    }

    // Reset regeneration state
    isRegenerating = false;

    // ============================================================
    // STEP 4: SHOW MODAL
    // ============================================================

    modal.classList.add('show');
    modal.style.display = 'flex';

    console.log('✅ Regeneration modal opened');
}

/**
 * Close the regeneration modal
 */
function closeRegenerationModal() {
    const modal = document.getElementById('regenerationModal');

    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    // Clean up SSE connection if active
    if (currentJobStream) {
        try {
            currentJobStream.disconnect();
        } catch (e) {
            console.warn('Error disconnecting job stream:', e);
        }
        currentJobStream = null;
    }

    // Reset state
    currentCaseId = null;
    isRegenerating = false;

    console.log('✅ Regeneration modal closed');
}

// ============================================================
// DOCUMENT SELECTION FUNCTIONS
// ============================================================

/**
 * Get selected document types from regeneration checkboxes
 *
 * @returns {Array<string>} Array of selected document types
 */
function getRegenerationSelectedDocuments() {
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);

    console.log(`Selected documents for regeneration: ${selected.join(', ') || 'none'}`);

    return selected;
}

/**
 * Validate document selection
 *
 * @param {Array<string>} selectedDocuments - Selected document types
 * @returns {boolean} True if valid, false otherwise
 */
function validateRegenerationSelection(selectedDocuments) {
    const errorElement = document.getElementById('regen-document-selection-error');

    if (selectedDocuments.length === 0) {
        // Show error
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.style.animation = 'shake 0.3s ease';
        }
        return false;
    }

    // Hide error
    if (errorElement) {
        errorElement.style.display = 'none';
    }

    return true;
}

// ============================================================
// REGENERATION TRIGGER
// ============================================================

/**
 * Handle regenerate button click
 * Validates selection, calls API, starts SSE tracking
 */
async function handleRegenerateDocuments() {
    console.log('🔄 Regenerate button clicked');

    // Prevent double-clicks
    if (isRegenerating) {
        console.warn('⚠️ Regeneration already in progress');
        return;
    }

    // ============================================================
    // STEP 1: VALIDATE SELECTION
    // ============================================================

    const selectedDocuments = getRegenerationSelectedDocuments();

    if (!validateRegenerationSelection(selectedDocuments)) {
        console.error('❌ Validation failed: no documents selected');
        return;
    }

    // ============================================================
    // STEP 2: VALIDATE CASE ID
    // ============================================================

    if (!currentCaseId) {
        console.error('❌ No case ID available');
        alert('Error: Case ID not found. Please refresh and try again.');
        return;
    }

    // ============================================================
    // STEP 3: UPDATE UI TO "LOADING" STATE
    // ============================================================

    isRegenerating = true;

    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
        regenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Regeneration...';
    }

    // Disable checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = true);

    // ============================================================
    // STEP 4: CALL REGENERATION API
    // ============================================================

    try {
        console.log(`🚀 Calling regeneration API for case: ${currentCaseId}`);

        // Get auth token from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('token') || localStorage.getItem('authToken');

        if (!authToken) {
            throw new Error('Authentication token not found. Please ensure you have a valid access token.');
        }

        // Make API call
        const response = await fetch(`/api/regenerate-documents/${currentCaseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                documentTypes: selectedDocuments
            })
        });

        const result = await response.json();

        console.log('API response status:', response.status);
        console.log('API response data:', result);

        // ============================================================
        // STEP 5: HANDLE API RESPONSE
        // ============================================================

        if (!response.ok || !result.success) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }

        console.log('✅ Regeneration started successfully');
        console.log(`Job ID: ${result.jobId}`);

        // Start SSE tracking (will be implemented in Phase 5)
        startRegenerationTracking(result);

    } catch (error) {
        console.error('❌ Regeneration error:', error);

        // Show error to user
        alert(`Error starting regeneration:\n\n${error.message}\n\nPlease try again or contact support if the problem persists.`);

        // Reset UI
        resetRegenerationUI();
    }
}

/**
 * Start SSE tracking for regeneration progress
 *
 * @param {Object} result - API response containing jobId
 */
function startRegenerationTracking(result) {
    console.log('📡 Starting SSE tracking for regeneration');

    const jobId = result.jobId || result.caseId;

    if (!jobId) {
        console.error('❌ No job ID in API response');
        return;
    }

    // ============================================================
    // STEP 1: SHOW PROGRESS UI
    // ============================================================

    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'block';
    }

    // Update button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Regeneration in Progress...';
    }

    updateProgressUI(0, 'Connecting to regeneration pipeline...');

    // ============================================================
    // STEP 2: CREATE SSE CONNECTION
    // ============================================================

    // Check if createJobStream function exists (from sse-client.js)
    if (typeof createJobStream !== 'function') {
        console.error('❌ createJobStream function not found. Is sse-client.js loaded?');

        // Fallback: Show manual check message
        updateProgressUI(50, 'Document regeneration started. Pipeline processing in background...');

        // Update button after delay
        setTimeout(() => {
            const btn = document.getElementById('regenerate-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-info-circle"></i> Regeneration Started (check back later)';
            }
            isRegenerating = false;
        }, 3000);

        return;
    }

    try {
        // Create SSE stream
        currentJobStream = createJobStream(jobId);

        // ============================================================
        // STEP 3: CONFIGURE EVENT HANDLERS
        // ============================================================

        // Progress updates
        currentJobStream.onProgress = (data) => {
            console.log('📊 Regeneration progress:', data);

            const percentage = data.percentage || 0;
            const message = data.message || data.phase || 'Processing documents...';

            updateProgressUI(percentage, message);
        };

        // Completion
        currentJobStream.onComplete = (data) => {
            console.log('✅ Regeneration complete:', data);
            handleRegenerationComplete(data);
        };

        // Error
        currentJobStream.onError = (data) => {
            console.error('❌ Regeneration failed:', data);
            handleRegenerationError(data);
        };

        // ============================================================
        // STEP 4: CONNECT TO SSE STREAM
        // ============================================================

        currentJobStream.connect();
        console.log('✅ SSE connection established for job:', jobId);

    } catch (error) {
        console.error('❌ Failed to connect SSE:', error);
        handleRegenerationError({ message: error.message });
    }
}

/**
 * Update progress UI with percentage and message
 *
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} message - Status message
 */
function updateProgressUI(percentage, message) {
    // Update progress bar
    const progressBar = document.getElementById('regen-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    // Update percentage text
    const percentageElement = document.getElementById('regen-progress-percentage');
    if (percentageElement) {
        percentageElement.textContent = `${Math.round(percentage)}%`;
    }

    // Update message
    const messageElement = document.getElementById('regen-progress-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

/**
 * Handle successful regeneration completion
 *
 * @param {Object} data - Completion data from SSE
 */
function handleRegenerationComplete(data) {
    console.log('🎉 Regeneration completed successfully');

    // Update progress to 100%
    updateProgressUI(100, '✅ Documents regenerated successfully!');

    // Update button to success state
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.className = 'btn btn-primary success';
        regenerateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Regeneration Complete';
    }

    // Re-enable checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = false);

    // Clean up SSE connection
    if (currentJobStream) {
        currentJobStream.disconnect();
        currentJobStream = null;
    }

    // Reset regeneration state
    isRegenerating = false;

    // Show success notification
    showSuccessNotification('Documents have been regenerated successfully!');
}

/**
 * Handle regeneration error
 *
 * @param {Object} data - Error data from SSE or API
 */
function handleRegenerationError(data) {
    console.error('❌ Regeneration error:', data);

    const errorMessage = data.message || 'An unknown error occurred during regeneration';

    // Update progress UI with error
    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'block';
        progressSection.style.background = 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)';
        progressSection.style.borderColor = '#FCA5A5';
    }

    updateProgressUI(0, `❌ Error: ${errorMessage}`);

    // Update button to allow retry
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.className = 'btn btn-primary';
        regenerateBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Retry Regeneration';
    }

    // Re-enable checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = false);

    // Clean up SSE connection
    if (currentJobStream) {
        currentJobStream.disconnect();
        currentJobStream = null;
    }

    // Reset regeneration state
    isRegenerating = false;

    // Show error alert
    alert(`Regeneration Failed:\n\n${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
}

/**
 * Reset regeneration UI to initial state
 */
function resetRegenerationUI() {
    isRegenerating = false;

    // Re-enable button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.className = 'btn btn-primary';
        regenerateBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Regenerate Selected Documents';
    }

    // Re-enable checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = false);

    // Hide progress
    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'none';
        progressSection.style.background = 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)';
        progressSection.style.borderColor = '#E2E8F0';
    }

    // Hide error
    const errorElement = document.getElementById('regen-document-selection-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * Show success notification (toast-style)
 *
 * @param {string} message - Success message
 */
function showSuccessNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 1.2rem;"></i>
        <span>${message}</span>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideInFromRight 0.3s ease;
        max-width: 400px;
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

/**
 * Initialize regeneration event listeners
 * Call this on DOMContentLoaded
 */
function initializeRegenerationListeners() {
    console.log('🔧 Initializing regeneration event listeners');

    // Checkbox change listeners (hide error when selection changes)
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selected = getRegenerationSelectedDocuments();
            if (selected.length > 0) {
                const errorElement = document.getElementById('regen-document-selection-error');
                if (errorElement) {
                    errorElement.style.display = 'none';
                }
            }
        });
    });

    // Close modal when clicking outside
    const modal = document.getElementById('regenerationModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRegenerationModal();
            }
        });
    }

    console.log('✅ Regeneration event listeners initialized');
}

// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRegenerationListeners);
} else {
    // DOM already loaded
    initializeRegenerationListeners();
}

// ============================================================
// EXPORT FOR EXTERNAL USE
// ============================================================

// Make functions available globally for onclick handlers
window.showCaseForRegeneration = showCaseForRegeneration;
window.closeRegenerationModal = closeRegenerationModal;
window.handleRegenerateDocuments = handleRegenerateDocuments;
window.resetRegenerationUI = resetRegenerationUI;

// Add CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInFromRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutToRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

console.log('📦 Document regeneration module loaded successfully');

// ============================================================
// TEST HELPER FUNCTION
// ============================================================

/**
 * Test the regeneration modal with sample data
 * Call from browser console: testRegenerationModal()
 *
 * @param {string} caseId - Optional case ID (defaults to test ID)
 */
window.testRegenerationModal = function(caseId = 'test-case-id-12345') {
    console.log('🧪 Testing regeneration modal with sample data');

    const testData = {
        caseNumber: 'CASE-2025-TEST-001',
        caseTitle: 'Test Plaintiff v. Test Defendant',
        plaintiffName: 'John Test Doe',
        documentTypesToGenerate: ['srogs', 'pods']  // Pre-select SROG and POD
    };

    showCaseForRegeneration(caseId, testData);

    console.log('✅ Test modal opened. You can now:');
    console.log('   1. Change document selection');
    console.log('   2. Click "Regenerate Selected Documents"');
    console.log('   3. Watch the progress (requires valid auth token)');
};

console.log('💡 Tip: Test the feature by running: testRegenerationModal()');


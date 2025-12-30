/**
 * Form Submission Module
 *
 * Handles form submission, validation, and API communication with the backend.
 * Implements optimized fetch requests with proper error handling and retry logic.
 *
 * Updated: 2025-10-20
 * - Removed success page redirect - form now resets immediately after submission
 * - Added inline success alert notification with case ID
 * - Form resets to clean state with 1 plaintiff and 1 defendant
 * - Background document generation continues without blocking user
 * - Maintains SSE progress tracking for document generation status
 *
 * Performance Features:
 * - Async/await for non-blocking operations
 * - Request timeout handling
 * - Exponential backoff for retries
 * - Optimistic UI updates
 * - Non-blocking form reset (documents generate in background)
 *
 * Key Functions:
 * - submitForm(notificationEmail, optedIn): Main submission handler
 * - showReviewScreen(): Displays confirmation modal
 * - confirmSubmission(): Validates and submits after confirmation
 * - handleSubmissionSuccess(data): Handles successful submission and triggers form reset
 * - resetFormAfterSubmission(result): Resets form to initial state
 * - handleSubmissionError(error): Handles submission failures
 *
 * User Flow:
 * 1. User fills out form
 * 2. Clicks "Submit Form" → Confirmation modal appears
 * 3. Clicks "Confirm & Submit" → Email notification modal appears
 * 4. User provides email or skips → Form submits to server
 * 5. Success alert displays with case ID
 * 6. Form immediately resets to clean state
 * 7. Documents generate in background (non-blocking)
 * 8. User can start new submission immediately
 *
 * @module FormSubmission
 * @requires ./validation.js
 * @requires ./sse-client.js (optional - for progress tracking)
 * @requires ./toast-notifications.js (optional - for progress updates)
 */

/**
 * Get authentication token from URL parameters
 * @returns {string|null} The token if found, null otherwise
 */
function getAuthToken() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

/**
 * Get authentication headers for fetch requests
 * @returns {Object} Headers object with Authorization if token is present
 */
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Check if any plaintiffs are minors (age category = child)
 * @returns {boolean} True if at least one plaintiff is a minor
 */
function hasChildPlaintiffs() {
    // Search for any checked "child" radio button in plaintiff age fields
    // Radio buttons have names like "plaintiff-1-age", "plaintiff-2-age", etc.
    const childRadios = document.querySelectorAll('input[type="radio"][name*="plaintiff-"][name$="-age"][value="child"]:checked');

    const hasChildren = childRadios.length > 0;
    console.log('🔍 hasChildPlaintiffs check:', {
        childRadiosFound: childRadios.length,
        hasChildren
    });

    return hasChildren;
}

/**
 * Show/hide CIV-010 checkbox based on whether child plaintiffs exist
 */
function updateCiv010Visibility() {
    const hasChildren = hasChildPlaintiffs();

    // Update confirmation modal checkbox
    const confirmWrapper = document.getElementById('civ010-checkbox-wrapper');
    if (confirmWrapper) {
        confirmWrapper.style.display = hasChildren ? 'flex' : 'none';
    }

    // Update regeneration modal checkbox
    const regenWrapper = document.getElementById('regen-civ010-checkbox-wrapper');
    if (regenWrapper) {
        regenWrapper.style.display = hasChildren ? 'flex' : 'none';
    }

    console.log('📋 CIV-010 visibility updated:', hasChildren ? 'visible (child plaintiffs found)' : 'hidden');
}

/**
 * Show the confirmation modal before form submission
 * Performs pre-submission validation and displays review data
 */
function showReviewScreen() {
    const form = document.getElementById('main-form');

    // Run full validation before showing review
    if (typeof runFullValidation === 'function') {
        const isValid = runFullValidation(form);
        if (!isValid) {
            alert('Please fix all validation errors before submitting.');
            return;
        }
    }

    // Get the confirmation modal
    const modal = document.getElementById('confirmationModal');
    if (!modal) {
        console.error('Confirmation modal not found');
        return;
    }

    // Show/hide CIV-010 checkbox based on whether child plaintiffs exist
    updateCiv010Visibility();

    // Display the modal using the show class
    modal.classList.add('show');

    // Add click handler to close modal when clicking outside
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeConfirmationModal();
        }
    };

    console.log('Showing confirmation modal');
}

/**
 * Close the confirmation modal
 */
function closeConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('show');
        modal.onclick = null;
    }
}

/**
 * User confirmed submission - validate document selection and show email notification modal
 */
function confirmSubmission() {
    // Get selected document types
    const selectedDocuments = getSelectedDocuments();

    // Validate: at least one document must be selected
    if (selectedDocuments.length === 0) {
        // Show error message
        const errorElement = document.getElementById('document-selection-error');
        if (errorElement) {
            errorElement.style.display = 'flex';
        }

        // Scroll to error within modal
        const selectionSection = document.querySelector('.document-selection-section');
        if (selectionSection) {
            selectionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return; // Prevent submission
    }

    // Hide error if it was showing
    const errorElement = document.getElementById('document-selection-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }

    // Store selected documents in session storage for later use
    sessionStorage.setItem('selectedDocuments', JSON.stringify(selectedDocuments));

    console.log('📄 Documents selected for generation:', selectedDocuments);

    closeConfirmationModal();
    showEmailNotificationModal();
}

/**
 * Show email notification opt-in modal
 */
function showEmailNotificationModal() {
    const modal = document.getElementById('emailNotificationModal');
    if (!modal) {
        console.error('Email notification modal not found');
        // Fallback: submit without email
        submitForm(null, false);
        return;
    }

    modal.classList.add('show');

    // Add click handler to close modal when clicking outside
    modal.onclick = function(event) {
        if (event.target === modal) {
            skipEmailNotification();
        }
    };

    console.log('Showing email notification modal');
}

/**
 * Close email notification modal
 */
function closeEmailNotificationModal() {
    const modal = document.getElementById('emailNotificationModal');
    if (modal) {
        modal.classList.remove('show');
        modal.onclick = null;
    }
}

/**
 * User chose to skip email notification
 */
async function skipEmailNotification() {
    closeEmailNotificationModal();
    await submitForm(null, false);
}

/**
 * User provided email for notification
 */
async function submitEmailNotification() {
    const emailInput = document.getElementById('notificationEmailInput');
    const nameInput = document.getElementById('notification-name-input'); // Optional field

    if (!emailInput) {
        console.error('Email input field not found');
        return;
    }

    const email = emailInput.value.trim();
    const name = nameInput ? nameInput.value.trim() : null; // Name is optional

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    closeEmailNotificationModal();
    await submitForm(email || null, !!email, name || null);
}

/**
 * Submit form data to the server
 * Implements retry logic and error handling for robust submission
 *
 * Performance Optimizations:
 * - Uses fetch API with AbortController for timeout
 * - Implements exponential backoff for retries
 * - Compresses payload using JSON.stringify
 *
 * @param {string|null} notificationEmail - Optional email for notifications
 * @param {boolean} optedIn - Whether user opted in to notifications
 * @param {string|null} notificationName - Optional name for notifications
 * @param {number} retryCount - Current retry attempt (internal use)
 */
async function submitForm(notificationEmail = null, optedIn = false, notificationName = null, retryCount = 0) {
    const form = document.getElementById('main-form');
    if (!form) {
        console.error('Form not found');
        return;
    }

    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Add metadata
        data.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        data.submittedAt = new Date().toISOString();
        data.notificationEmail = notificationEmail;
        data.notificationEmailOptIn = optedIn;
        data.notificationName = notificationName;

        // Add selected document types from confirmation modal
        const selectedDocuments = JSON.parse(
            sessionStorage.getItem('selectedDocuments') || '["srogs", "pods", "admissions"]'
        );
        data.documentTypesToGenerate = selectedDocuments;

        // Store FULL form data in sessionStorage for PDF generation and progress modal
        sessionStorage.setItem('lastSubmissionFormData', JSON.stringify(data));

        console.log('Submitting form data:', data);
        console.log('📄 Document types to generate:', selectedDocuments);

        // Create AbortController for timeout (10 second timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Get access token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('token');

        // Submit to server with authentication
        const response = await fetch('/api/form-entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const result = await response.json();
        console.log('Form submitted successfully:', result);

        // Clean up session storage
        sessionStorage.removeItem('selectedDocuments');

        // Handle success
        handleSubmissionSuccess(result);

    } catch (error) {
        console.error('Form submission error:', error);

        // Retry logic with exponential backoff
        if (retryCount < 3 && error.name !== 'AbortError') {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`Retrying submission in ${delay}ms... (attempt ${retryCount + 1}/3)`);

            setTimeout(() => {
                submitForm(notificationEmail, optedIn, notificationName, retryCount + 1);
            }, delay);

            return;
        }

        // Handle error after retries exhausted
        handleSubmissionError(error);
    }
}

/**
 * Handle successful form submission
 * Resets form to initial state and shows success notification
 * Documents are generated in the background without blocking the form
 *
 * @param {Object} result - Server response data
 */
async function handleSubmissionSuccess(result) {
    // Store submission ID for reference
    if (result.id) {
        sessionStorage.setItem('lastSubmissionId', result.id);
    }

    // DEBUG: Log what we received from server
    console.log('📦 Server response:', {
        id: result.id,
        dbCaseId: result.dbCaseId,
        dbCaseId_type: typeof result.dbCaseId
    });

    // Get case ID for progress tracking
    const caseId = result.dbCaseId || result.id;

    console.log(`📍 Case submitted: ${caseId}`);

    // Get stored form data to check selected documents
    const storedFormData = JSON.parse(sessionStorage.getItem('lastSubmissionFormData') || '{}');
    const selectedDocuments = storedFormData.documentTypesToGenerate || [];

    // Check if ANY documents are selected (DOCX or PDF)
    const hasDocxDocuments = selectedDocuments.some(doc => ['srogs', 'pods', 'admissions'].includes(doc));
    const hasPdfDocuments = selectedDocuments.some(doc => ['cm110', 'civ109', 'cm010', 'sum100', 'sum200a', 'civ010'].includes(doc));
    const hasAnyDocuments = hasDocxDocuments || hasPdfDocuments;

    // Only show progress tracking if document generation is enabled
    // Check if the server indicated that document generation is happening
    const pipelineEnabled = result.pipelineEnabled || result.pipeline_enabled || false;

    console.log(`🔍 Progress modal check:`, {
        pipelineEnabled,
        hasDocxDocuments,
        hasPdfDocuments,
        hasAnyDocuments,
        caseId,
        createJobStreamExists: typeof createJobStream !== 'undefined'
    });

    // Show progress modal if EITHER pipeline is enabled (DOCX) OR any PDF is selected
    // Note: Only require createJobStream for DOCX documents (SSE), not for PDFs (polling)
    const shouldShowModal = caseId && (
        (pipelineEnabled && hasDocxDocuments && typeof createJobStream !== 'undefined') || // DOCX with SSE
        (!hasDocxDocuments && hasPdfDocuments) // PDF only (no SSE needed)
    );

    console.log(`🔍 Should show modal: ${shouldShowModal} (caseId: ${caseId}, DOCX: ${hasDocxDocuments}, PDF: ${hasPdfDocuments})`);
    console.log(`🔍 Modal decision breakdown:`, {
        hasCaseId: !!caseId,
        firstCondition: pipelineEnabled && hasDocxDocuments && typeof createJobStream !== 'undefined',
        secondCondition: !hasDocxDocuments && hasPdfDocuments,
        shouldShow: shouldShowModal
    });

    if (shouldShowModal) {
        console.log(`🚀 Starting document generation tracking for case: ${caseId}`);

        try {
            // Clean up any existing connection for this job
            if (window.currentJobStream) {
                console.log(`🧹 Cleaning up existing job stream`);
                window.currentJobStream.close();
                window.currentJobStream = null;
            }

            // Clean up any existing connection from the manager
            if (window.sseManager && window.sseManager.hasConnection(caseId)) {
                console.log(`🧹 Found existing connection for ${caseId}, closing it`);
                window.sseManager.closeConnection(caseId);
            }

            // Get form data for display in progress modal (from sessionStorage)
            const storedFormData = JSON.parse(sessionStorage.getItem('lastSubmissionFormData') || '{}');
            const plaintiffName = `${storedFormData['plaintiff-1-first-name'] || ''} ${storedFormData['plaintiff-1-last-name'] || ''}`.trim() || 'Unknown Plaintiff';

            const formData = {
                caseNumber: storedFormData['property-address'] || 'Unknown Property',
                plaintiffName: plaintiffName
            };

            console.log('📊 Showing progress modal with data:', formData);

            // Show progress modal with initial state
            showSubmissionProgress(caseId, formData);

            // Set initial progress immediately (10% - form submitted)
            setTimeout(() => {
                updateSubmissionProgressUI(10, 'Form submitted successfully...');
            }, 100);

            // Simulate intermediate progress updates while waiting for SSE connection
            setTimeout(() => {
                updateSubmissionProgressUI(20, 'Saving form data to database...');
            }, 400);

            setTimeout(() => {
                updateSubmissionProgressUI(30, 'Preparing document generation...');
            }, 800);

            // Trigger PDF generation in parallel with DOCX generation (for each selected PDF type)
            setTimeout(async () => {
                try {
                    // Get the full form data from session storage
                    const fullFormData = JSON.parse(sessionStorage.getItem('lastSubmissionFormData') || '{}');
                    const selectedDocuments = fullFormData.documentTypesToGenerate || [];

                    // Define PDF document types and their display names
                    const pdfDocumentTypes = {
                        'cm110': 'CM-110',
                        'civ109': 'CIV-109',
                        'cm010': 'CM-010',
                        'sum100': 'SUM-100',
                        'sum200a': 'SUM-200A',
                        'civ010': 'CIV-010'
                    };

                    // Generate each selected PDF document type
                    for (const [docType, displayName] of Object.entries(pdfDocumentTypes)) {
                        // Check if this PDF type is selected
                        if (!selectedDocuments.includes(docType)) {
                            console.log(`ℹ️  ${displayName} PDF not selected, skipping generation`);
                            addDebugLog(`ℹ️  ${displayName} PDF not selected`, 'info');
                            continue;
                        }

                        console.log(`📄 Triggering ${displayName} PDF generation...`);
                        addDebugLog(`📄 Starting ${displayName} PDF generation...`, 'info');

                        // Update document status UI
                        updateDocumentStatus(docType, 'processing', 'Starting generation...');

                        // Trigger PDF generation with document type
                        const pdfResponse = await fetch('/api/pdf/generate', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                formData: fullFormData,
                                documentType: docType
                            })
                        });

                        if (pdfResponse.ok) {
                            const pdfResult = await pdfResponse.json();
                            console.log(`✅ ${displayName} PDF generation started:`, pdfResult);
                            addDebugLog(`✅ ${displayName} PDF job started: ${pdfResult.jobId}`, 'success');

                            // Store PDF job ID for status tracking (use first PDF job ID)
                            if (!window.currentPdfJobId) {
                                window.currentPdfJobId = pdfResult.jobId;
                            }

                            // Start polling PDF status
                            pollPdfStatus(pdfResult.jobId, docType);
                        } else {
                            console.error(`❌ Failed to trigger ${displayName} PDF generation:`, pdfResponse.status);
                            addDebugLog(`⚠️  ${displayName} PDF generation failed to start`, 'warning');
                        }
                    }
                } catch (error) {
                    console.error('❌ Error triggering PDF generation:', error);
                    addDebugLog('⚠️  PDF generation error', 'warning');
                }
            }, 900); // Trigger PDF slightly after preparing message

            // Delay SSE connection to prevent reconnection loop
            // Backend takes ~500ms to initialize progress status after submission
            // Only connect to SSE if DOCX documents are being generated
            if (hasDocxDocuments) {
                setTimeout(() => {
                    console.log('🔌 Connecting to SSE stream for case:', caseId);
                    addDebugLog('🔌 Connecting to SSE stream...', 'info');

                    // Create SSE connection (will use manager if available)
                    const jobStream = createJobStream(caseId);

                    // Set up event handlers to update progress UI
                    jobStream.onProgress = (data) => {
                        console.log('Progress update:', data);
                        // Use data.progress if available, otherwise calculate from percentage
                        const progressPercent = data.progress || data.percentage || 0;
                        const message = data.currentPhase || data.message || 'Processing...';

                        updateSubmissionProgressUI(progressPercent, message);

                        // Update DOCX document status
                        updateDocumentStatus('docx', 'processing', `${Math.round(progressPercent)}% complete`);
                    };

                    jobStream.onComplete = (data) => {
                        console.log('Job completed:', data);

                        // Update DOCX document status
                        updateDocumentStatus('docx', 'completed', 'Generated successfully ✓');

                        // Only log and handle if not already completed
                        if (!window.submissionCompleted) {
                            addDebugLog('✅ Generation completed!', 'success');
                            handleSubmissionComplete(data);
                        }
                        // Ensure we clean up after completion
                        if (window.currentJobStream === jobStream) {
                            window.currentJobStream = null;
                        }
                    };

                    jobStream.onError = (data) => {
                        console.error('Job failed:', data);
                        addDebugLog(`❌ Error: ${data.error || 'Generation failed'}`, 'error');

                        // Update DOCX document status
                        updateDocumentStatus('docx', 'failed', 'Generation failed ✗');

                        handleSubmissionError(data);
                        // Clean up on error too
                        if (window.currentJobStream === jobStream) {
                            window.currentJobStream = null;
                        }
                    };

                    // Connect to SSE stream
                    jobStream.connect();

                    // Store stream reference for cleanup
                    window.currentJobStream = jobStream;
                }, 1200); // Wait 1.2s before connecting to SSE
            } else {
                // Only PDF documents selected - no DOCX pipeline to track via SSE
                console.log('ℹ️  Only PDF documents selected - skipping SSE connection');
                addDebugLog('ℹ️  Only PDF generation (no DOCX)', 'info');
            }

        } catch (error) {
            console.error('Failed to initialize progress tracking:', error);
            // Fall back to immediate reset if tracking fails
            resetFormAfterSubmission(result);
        }
    } else {
        console.log(`ℹ️ Document generation not enabled - form saved to database only`);
        // Reset form immediately if pipeline not enabled
        resetFormAfterSubmission(result);
    }
}

/**
 * Reset form to initial state after successful submission
 * Clears all fields and reinitializes with one plaintiff and defendant
 *
 * @param {Object} result - Server response data (for success message)
 */
function resetFormAfterSubmission(result) {
    const form = document.getElementById('main-form');
    if (!form) {
        console.error('Form not found');
        return;
    }

    console.log('✅ Form submitted successfully - Case ID:', result.dbCaseId || result.id);

    // Toast notification removed - form submission success logged to console above

    // Reset button state
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
    }

    // Clear the form
    form.reset();

    // Reset plaintiff and defendant sections
    const plaintiffsContainer = document.getElementById('plaintiffs-container');
    const defendantsContainer = document.getElementById('defendants-container');

    if (plaintiffsContainer) {
        plaintiffsContainer.innerHTML = '';
    }

    if (defendantsContainer) {
        defendantsContainer.innerHTML = '';
    }

    // Reset counters (access global variables from index.html)
    if (typeof window.plaintiffCounter !== 'undefined') {
        window.plaintiffCounter = 0;
    }

    if (typeof window.defendantCounter !== 'undefined') {
        window.defendantCounter = 0;
    }

    // Reinitialize with one plaintiff and defendant
    if (typeof window.addPlaintiff === 'function') {
        window.addPlaintiff();
    }

    if (typeof window.addDefendant === 'function') {
        window.addDefendant();
    }

    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log('🔄 Form reset complete - ready for new submission');
}

/**
 * Handle form submission error
 * Displays error message and restores form state
 *
 * @param {Error} error - The error that occurred
 */
function handleSubmissionError(error) {
    const form = document.getElementById('main-form');

    // Restore submit button
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Form';
    }

    // Display error message
    let errorMessage = 'Failed to submit form. Please try again.';

    if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
    }

    alert(errorMessage);
}

/**
 * Extract plaintiff data from form for preview
 * Used by confirmation modal to display summary
 *
 * @param {Object} data - Form data object
 * @returns {Array} Array of plaintiff objects
 */
function extractPlaintiffs(data) {
    const plaintiffs = [];
    const plaintiffIds = new Set();

    // Find all plaintiff IDs from form field names
    Object.keys(data).forEach(key => {
        const match = key.match(/plaintiff-(\d+)-/);
        if (match) {
            plaintiffIds.add(parseInt(match[1]));
        }
    });

    // Build plaintiff objects
    plaintiffIds.forEach(id => {
        const plaintiff = {
            id: id,
            firstName: data[`plaintiff-${id}-first-name`] || '',
            lastName: data[`plaintiff-${id}-last-name`] || '',
            type: data[`plaintiff-${id}-type`] || 'Individual',
            age: data[`plaintiff-${id}-age`] || 'adult',
            head: data[`plaintiff-${id}-head`] || 'no',
            unit: data[`plaintiff-${id}-unit`] || ''
        };
        plaintiffs.push(plaintiff);
    });

    return plaintiffs;
}

/**
 * Extract defendant data from form for preview
 *
 * @param {Object} data - Form data object
 * @returns {Array} Array of defendant objects
 */
function extractDefendants(data) {
    const defendants = [];
    const defendantIds = new Set();

    Object.keys(data).forEach(key => {
        const match = key.match(/defendant-(\d+)-/);
        if (match) {
            defendantIds.add(parseInt(match[1]));
        }
    });

    defendantIds.forEach(id => {
        const defendant = {
            id: id,
            firstName: data[`defendant-${id}-first-name`] || '',
            lastName: data[`defendant-${id}-last-name`] || '',
            entity: data[`defendant-${id}-entity`] || 'Individual',
            role: data[`defendant-${id}-role`] || 'owner'
        };
        defendants.push(defendant);
    });

    return defendants;
}

/**
 * Get array of selected document types from confirmation modal
 * @returns {string[]} Array of selected document types (e.g., ['srogs', 'pods'])
 */
function getSelectedDocuments() {
    const checkboxes = document.querySelectorAll('input[name="document-selection"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Initialize document status UI based on selected documents
 * Shows relevant document status items in the progress modal
 */
function initializeDocumentStatusUI() {
    const storedFormData = JSON.parse(sessionStorage.getItem('lastSubmissionFormData') || '{}');
    const selectedDocuments = storedFormData.documentTypesToGenerate || [];

    const documentList = document.getElementById('submission-document-list');
    const cm110Status = document.getElementById('doc-status-cm110');
    const civ109Status = document.getElementById('doc-status-civ109');
    const cm010Status = document.getElementById('doc-status-cm010');
    const sum100Status = document.getElementById('doc-status-sum100');
    const sum200aStatus = document.getElementById('doc-status-sum200a');
    const civ010Status = document.getElementById('doc-status-civ010');
    const docxStatus = document.getElementById('doc-status-docx');

    if (!documentList) return;

    // Check which PDF types are selected
    const hasCm110 = selectedDocuments.includes('cm110');
    const hasCiv109 = selectedDocuments.includes('civ109');
    const hasCm010 = selectedDocuments.includes('cm010');
    const hasSum100 = selectedDocuments.includes('sum100');
    const hasSum200a = selectedDocuments.includes('sum200a');
    const hasCiv010 = selectedDocuments.includes('civ010');
    // Check if any DOCX documents are selected
    const hasDocx = selectedDocuments.some(doc => ['srogs', 'pods', 'admissions'].includes(doc));

    // Show document list if any documents are selected
    if (hasCm110 || hasCiv109 || hasCm010 || hasSum100 || hasSum200a || hasCiv010 || hasDocx) {
        documentList.style.display = 'block';
    }

    // Show/hide individual status items
    if (cm110Status) {
        cm110Status.style.display = hasCm110 ? 'flex' : 'none';
    }

    if (civ109Status) {
        civ109Status.style.display = hasCiv109 ? 'flex' : 'none';
    }

    if (cm010Status) {
        cm010Status.style.display = hasCm010 ? 'flex' : 'none';
    }

    if (sum100Status) {
        sum100Status.style.display = hasSum100 ? 'flex' : 'none';
    }

    if (sum200aStatus) {
        sum200aStatus.style.display = hasSum200a ? 'flex' : 'none';
    }

    if (civ010Status) {
        civ010Status.style.display = hasCiv010 ? 'flex' : 'none';
    }

    if (docxStatus) {
        docxStatus.style.display = hasDocx ? 'flex' : 'none';
    }

    console.log('📄 Document status UI initialized:', { hasCm110, hasCiv109, hasCm010, hasSum100, hasSum200a, hasCiv010, hasDocx });
}

/**
 * Update document status in the progress modal
 * @param {string} docType - Document type ('cm110' or 'docx')
 * @param {string} status - Status ('processing', 'completed', 'failed')
 * @param {string} statusText - Status text to display
 */
function updateDocumentStatus(docType, status, statusText) {
    const statusItem = document.getElementById(`doc-status-${docType}`);
    const icon = document.getElementById(`doc-icon-${docType}`);
    const text = document.getElementById(`doc-status-text-${docType}`);

    if (!statusItem || !icon || !text) return;

    // Update status text
    text.textContent = statusText;

    // Update icon and styling based on status
    if (status === 'processing') {
        icon.className = 'fas fa-spinner fa-spin';
        icon.style.color = '#00AEEF';
        statusItem.classList.remove('completed', 'failed');
    } else if (status === 'completed') {
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#10B981';
        statusItem.classList.add('completed');
        statusItem.classList.remove('failed');
    } else if (status === 'failed') {
        icon.className = 'fas fa-times-circle';
        icon.style.color = '#EF4444';
        statusItem.classList.add('failed');
        statusItem.classList.remove('completed');
    }

    console.log(`📊 Updated ${docType} status:`, status, statusText);
}

/**
 * Initialize event listeners for document selection checkboxes
 * Hides error message when user makes a selection
 */
function initializeDocumentSelectionListeners() {
    const checkboxes = document.querySelectorAll('input[name="document-selection"]');
    const errorElement = document.getElementById('document-selection-error');

    if (!checkboxes.length) {
        // Checkboxes not loaded yet, try again after a short delay
        setTimeout(initializeDocumentSelectionListeners, 100);
        return;
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Hide error when user makes any selection
            if (errorElement && getSelectedDocuments().length > 0) {
                errorElement.style.display = 'none';
            }
        });
    });

    console.log('✅ Document selection listeners initialized');
}

/**
 * Show submission progress modal with case information
 * @param {string|number} caseId - Database case ID for SSE tracking
 * @param {Object} formData - Form data to display case information
 */
function showSubmissionProgress(caseId, formData) {
    // First, ensure email modal is closed
    closeEmailNotificationModal();

    const modal = document.getElementById('submissionProgressModal');
    if (!modal) {
        console.error('Submission progress modal not found');
        return;
    }

    // Populate case information
    const caseNumberElement = document.getElementById('submission-case-number');
    const plaintiffNameElement = document.getElementById('submission-plaintiff-name');

    if (caseNumberElement) {
        caseNumberElement.textContent = formData.caseNumber || '-';
    }

    if (plaintiffNameElement) {
        plaintiffNameElement.textContent = formData.plaintiffName || '-';
    }

    // Initialize document status UI based on selected documents
    initializeDocumentStatusUI();

    // Reset completion flag for new submission
    window.submissionCompleted = false;

    // Clear debug log
    const debugLog = document.getElementById('submission-debug-log');
    if (debugLog) {
        debugLog.innerHTML = '';
    }
    addDebugLog('Modal opened', 'info');
    addDebugLog(`Case ID: ${caseId}`, 'info');

    // Reset progress UI to initial state
    updateSubmissionProgressUI(0, 'Initializing document generation...');

    // Reset button state
    const closeBtn = document.getElementById('submission-close-btn');
    if (closeBtn) {
        closeBtn.disabled = true;
        closeBtn.classList.remove('success');
        closeBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> Processing...';
    }

    // Reset title to in-progress state
    const title = document.getElementById('submission-progress-title');
    if (title) {
        title.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Documents';
    }

    // Show modal
    modal.classList.add('show');
    console.log('📊 Submission progress modal opened for case:', caseId);
}

/**
 * Close submission progress modal and reset form
 */
function closeSubmissionProgressModal() {
    const modal = document.getElementById('submissionProgressModal');
    if (!modal) return;

    // Close modal
    modal.classList.remove('show');

    // Clean up SSE connection if it exists
    if (window.currentJobStream) {
        window.currentJobStream.close();
        window.currentJobStream = null;
    }

    // Clean up PDF polling interval if it exists
    if (window.currentPdfPollInterval) {
        clearInterval(window.currentPdfPollInterval);
        window.currentPdfPollInterval = null;
    }

    // Clean up PDF info
    if (window.currentPdfInfo) {
        delete window.currentPdfInfo;
    }
    if (window.currentPdfJobId) {
        delete window.currentPdfJobId;
    }

    // Clean up stored form data
    sessionStorage.removeItem('lastSubmissionFormData');

    // Clean up progress state
    if (window.submissionProgressState) {
        delete window.submissionProgressState;
    }

    // Clean up completion flag
    window.submissionCompleted = false;

    // Reset form after closing
    const form = document.getElementById('main-form');
    if (form) {
        // Clear the form
        form.reset();

        // Reset plaintiff and defendant sections
        const plaintiffsContainer = document.getElementById('plaintiffs-container');
        const defendantsContainer = document.getElementById('defendants-container');

        if (plaintiffsContainer) {
            plaintiffsContainer.innerHTML = '';
        }

        if (defendantsContainer) {
            defendantsContainer.innerHTML = '';
        }

        // Reset counters
        if (typeof window.plaintiffCounter !== 'undefined') {
            window.plaintiffCounter = 0;
        }

        if (typeof window.defendantCounter !== 'undefined') {
            window.defendantCounter = 0;
        }

        // Reinitialize with one plaintiff and defendant
        if (typeof window.addPlaintiff === 'function') {
            window.addPlaintiff();
        }

        if (typeof window.addDefendant === 'function') {
            window.addDefendant();
        }

        // Reset button state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
        }

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log('🔄 Form reset complete after closing progress modal');
    }

    console.log('✅ Submission progress modal closed');
}

/**
 * Add log entry to debug console
 * @param {string} message - Log message
 * @param {string} type - Log type (info, success, error, warning)
 */
function addDebugLog(message, type = 'info') {
    const debugLog = document.getElementById('submission-debug-log');
    if (!debugLog) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const colors = {
        info: '#0066cc',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107'
    };

    const logEntry = document.createElement('div');
    logEntry.style.color = colors[type] || colors.info;
    logEntry.style.marginBottom = '4px';
    logEntry.innerHTML = `<span style="color: #6c757d;">[${timestamp}]</span> ${message}`;

    debugLog.appendChild(logEntry);

    // Auto-scroll to bottom
    const console = document.getElementById('submission-debug-console');
    if (console) {
        console.scrollTop = console.scrollHeight;
    }
}

/**
 * Update submission progress UI with percentage and message
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} message - Status message to display
 * @param {boolean} animate - Whether to animate the progress (default: true)
 */
function updateSubmissionProgressUI(percentage, message, animate = true) {
    const progressBar = document.getElementById('submission-progress-bar');
    const percentageElement = document.getElementById('submission-progress-percentage');
    const messageElement = document.getElementById('submission-progress-message');

    // Log to debug console
    addDebugLog(`Progress: ${Math.round(percentage)}% - ${message}`, 'info');

    // Store current and target progress for smooth animation
    if (!window.submissionProgressState) {
        window.submissionProgressState = { current: 0, target: 0 };
    }

    const state = window.submissionProgressState;
    state.target = Math.min(100, Math.max(0, percentage));

    // Smooth animation to target percentage
    if (animate && state.current < state.target) {
        const step = () => {
            if (state.current < state.target) {
                // Increment by small steps for smooth animation
                const increment = Math.max(0.5, (state.target - state.current) / 20);
                state.current = Math.min(state.target, state.current + increment);

                if (progressBar) {
                    progressBar.style.width = `${state.current}%`;
                }

                if (percentageElement) {
                    percentageElement.textContent = `${Math.round(state.current)}%`;
                }

                // Continue animation if not at target
                if (state.current < state.target) {
                    requestAnimationFrame(step);
                }
            }
        };
        requestAnimationFrame(step);
    } else {
        // Instant update (for jumps backward or when animation disabled)
        state.current = state.target;

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        if (percentageElement) {
            percentageElement.textContent = `${Math.round(percentage)}%`;
        }
    }

    // Always update message immediately
    if (messageElement) {
        messageElement.textContent = message;
    }
}

/**
 * Handle submission progress completion
 * @param {Object} data - Completion data from SSE
 */
function handleSubmissionComplete(data) {
    // Prevent duplicate completion handling
    if (window.submissionCompleted) {
        console.log('⚠️  Completion already handled, skipping duplicate');
        return;
    }
    window.submissionCompleted = true;

    console.log('✅ Document generation completed:', data);

    // Update progress to 100%
    updateSubmissionProgressUI(100, '✅ Documents generated successfully!', false);

    // Update title
    const title = document.getElementById('submission-progress-title');
    if (title) {
        title.innerHTML = '<i class="fas fa-check-circle"></i> Generation Completed';
    }

    // Update status indicator
    const statusElement = document.getElementById('submission-progress-status');
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Generation Completed';
    }

    // Show download links
    showDownloadLinks(data);

    // Enable and update close button
    const closeBtn = document.getElementById('submission-close-btn');
    if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.classList.add('success');
        closeBtn.innerHTML = '<i class="fas fa-check"></i> Close';
    }

    // Show success notification toast (ONLY ONCE)
    if (typeof showSuccessNotification === 'function') {
        showSuccessNotification('Documents have been generated successfully!');
    }
}

/**
 * Show download links for completed documents
 * @param {Object} data - Completion data with outputUrl for DOCX documents
 */
function showDownloadLinks(data) {
    const downloadLinksSection = document.getElementById('submission-download-links');
    const cm110LinkContainer = document.getElementById('download-link-cm110');
    const cm110LinkElement = document.getElementById('download-link-cm110-url');
    const docxLinkContainer = document.getElementById('download-link-docx');
    const docxLinkElement = document.getElementById('download-link-docx-url');

    if (!downloadLinksSection) return;

    let hasLinks = false;

    // Show CM-110 PDF link if available
    if (window.currentPdfInfo && window.currentPdfInfo.dropboxUrl) {
        if (cm110LinkElement && cm110LinkContainer) {
            cm110LinkElement.href = window.currentPdfInfo.dropboxUrl;
            cm110LinkContainer.style.display = 'block';
            hasLinks = true;
            console.log('📎 Added CM-110 PDF download link:', window.currentPdfInfo.dropboxUrl);
        }
    }

    // Show DOCX documents link if available
    if (data && data.outputUrl) {
        if (docxLinkElement && docxLinkContainer) {
            docxLinkElement.href = data.outputUrl;
            docxLinkContainer.style.display = 'block';
            hasLinks = true;
            console.log('📎 Added DOCX documents download link:', data.outputUrl);
        }
    }

    // Show download links section if we have at least one link
    if (hasLinks) {
        downloadLinksSection.style.display = 'block';
    }
}

/**
 * Handle submission progress error
 * @param {Object} data - Error data from SSE
 */
function handleSubmissionError(data) {
    console.error('❌ Document generation failed:', data);

    // Update progress message with error
    const messageElement = document.getElementById('submission-progress-message');
    if (messageElement) {
        messageElement.innerHTML = `<span style="color: #DC2626;">❌ Error: ${data.message || 'Document generation failed'}</span>`;
    }

    // Update title
    const title = document.getElementById('submission-progress-title');
    if (title) {
        title.innerHTML = '<i class="fas fa-exclamation-circle"></i> Generation Failed';
    }

    // Update status indicator
    const statusElement = document.getElementById('submission-progress-status');
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Generation Failed';
    }

    // Enable close button
    const closeBtn = document.getElementById('submission-close-btn');
    if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    }
}

/**
 * Poll PDF generation status
 * @param {string} jobId - PDF generation job ID
 * @param {string} docType - Document type (cm110, civ109, cm010)
 */
function pollPdfStatus(jobId, docType = 'cm110') {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max (poll every 1 second)

    // Get display name for logging
    const displayNames = { 'cm110': 'CM-110', 'civ109': 'CIV-109', 'cm010': 'CM-010', 'sum100': 'SUM-100', 'sum200a': 'SUM-200A', 'civ010': 'CIV-010' };
    const displayName = displayNames[docType] || docType.toUpperCase();

    const pollInterval = setInterval(async () => {
        attempts++;

        try {
            const response = await fetch(`/api/pdf/status/${jobId}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.error(`❌ ${displayName} PDF status polling timed out`);
                    addDebugLog(`⚠️  ${displayName} PDF status check timed out`, 'warning');
                }
                return;
            }

            const data = await response.json();
            const job = data.job;

            console.log(`📊 ${displayName} PDF status [${attempts}s]:`, job.status, job.progress);

            // Update UI with progress
            if (job.status === 'processing') {
                updateDocumentStatus(docType, 'processing', `Generating... ${job.progress}%`);
            }

            if (job.status === 'completed') {
                clearInterval(pollInterval);
                console.log(`✅ ${displayName} PDF generation completed:`, job);
                addDebugLog(`✅ ${displayName} PDF generated successfully!`, 'success');

                // Update UI
                updateDocumentStatus(docType, 'completed', 'Generated successfully ✓');

                // Store PDF information for display (use first completed PDF)
                if (!window.currentPdfInfo) {
                    window.currentPdfInfo = {
                        jobId: job.jobId,
                        filename: job.filename,
                        dropboxUrl: job.dropboxUrl,
                        dropboxPath: job.dropboxPath,
                        sizeBytes: job.sizeBytes
                    };
                }

                // Log Dropbox upload status
                if (job.dropboxUrl) {
                    addDebugLog(`📦 ${displayName} PDF uploaded to Dropbox`, 'success');
                    console.log('📦 Dropbox URL:', job.dropboxUrl);
                } else {
                    addDebugLog(`ℹ️  ${displayName} PDF saved locally (Dropbox disabled)`, 'info');
                }

                // Check if all PDF generation is complete (no DOCX documents)
                checkAllPdfComplete();

            } else if (job.status === 'failed') {
                clearInterval(pollInterval);
                console.error(`❌ ${displayName} PDF generation failed:`, job.error);
                addDebugLog(`❌ ${displayName} PDF failed: ${job.error}`, 'error');

                // Update UI
                updateDocumentStatus(docType, 'failed', 'Generation failed ✗');
            }

            // Stop polling after max attempts
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                console.warn(`⚠️  ${displayName} PDF polling timed out`);
                addDebugLog(`⚠️  ${displayName} PDF generation timed out`, 'warning');
            }

        } catch (error) {
            console.error('Error polling PDF status:', error);
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                addDebugLog(`⚠️  ${displayName} PDF status check failed`, 'warning');
            }
        }
    }, 1000); // Poll every 1 second

    // Store interval ID for cleanup (store multiple if needed)
    if (!window.pdfPollIntervals) {
        window.pdfPollIntervals = {};
    }
    window.pdfPollIntervals[docType] = pollInterval;
}

/**
 * Check if all PDF documents have completed generation
 * Called after each PDF completes to see if we should mark submission complete
 */
function checkAllPdfComplete() {
    const storedFormData = JSON.parse(sessionStorage.getItem('lastSubmissionFormData') || '{}');
    const selectedDocuments = storedFormData.documentTypesToGenerate || [];
    const hasDocxDocuments = selectedDocuments.some(doc => ['srogs', 'pods', 'admissions'].includes(doc));

    // If DOCX documents are selected, SSE will handle completion
    if (hasDocxDocuments) {
        return;
    }

    // Check if all selected PDF types have completed status elements
    const pdfTypes = ['cm110', 'civ109', 'cm010', 'sum100', 'sum200a', 'civ010'];
    const selectedPdfTypes = pdfTypes.filter(type => selectedDocuments.includes(type));

    let allComplete = true;
    for (const type of selectedPdfTypes) {
        const statusItem = document.getElementById(`doc-status-${type}`);
        if (statusItem && !statusItem.classList.contains('completed')) {
            allComplete = false;
            break;
        }
    }

    if (allComplete && !window.submissionCompleted) {
        console.log('ℹ️  All PDF documents completed - marking generation as complete');
        handleSubmissionComplete({ outputUrl: window.currentPdfInfo?.dropboxUrl });
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.showReviewScreen = showReviewScreen;
    window.closeConfirmationModal = closeConfirmationModal;
    window.confirmSubmission = confirmSubmission;
    window.showEmailNotificationModal = showEmailNotificationModal;
    window.closeEmailNotificationModal = closeEmailNotificationModal;
    window.skipEmailNotification = skipEmailNotification;
    window.submitEmailNotification = submitEmailNotification;
    window.submitForm = submitForm;
    window.extractPlaintiffs = extractPlaintiffs;
    window.extractDefendants = extractDefendants;
    window.getSelectedDocuments = getSelectedDocuments;
    window.initializeDocumentSelectionListeners = initializeDocumentSelectionListeners;
    window.showSubmissionProgress = showSubmissionProgress;
    window.closeSubmissionProgressModal = closeSubmissionProgressModal;
    window.updateSubmissionProgressUI = updateSubmissionProgressUI;
    window.handleSubmissionComplete = handleSubmissionComplete;
    window.handleSubmissionError = handleSubmissionError;
    window.hasChildPlaintiffs = hasChildPlaintiffs;
    window.updateCiv010Visibility = updateCiv010Visibility;
}

// Initialize document selection listeners when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDocumentSelectionListeners);
    } else {
        // DOM already loaded, initialize immediately
        initializeDocumentSelectionListeners();
    }
}

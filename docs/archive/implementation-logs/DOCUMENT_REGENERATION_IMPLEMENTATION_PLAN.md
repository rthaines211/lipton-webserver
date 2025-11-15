# Document Regeneration Feature - Implementation Plan

**Feature Branch**: `feature/document-regeneration`
**Target**: Allow users to regenerate documents with selective document type selection from submission modal
**Progress Tracking**: Real-time SSE updates
**Authentication**: Bearer token required

---

## Table of Contents
1. [Phase 1: Repository Setup](#phase-1-repository-setup)
2. [Phase 2: Backend API Implementation](#phase-2-backend-api-implementation)
3. [Phase 3: Frontend HTML/UI Structure](#phase-3-frontend-htmlui-structure)
4. [Phase 4: Frontend JavaScript - Core Logic](#phase-4-frontend-javascript---core-logic)
5. [Phase 5: Frontend JavaScript - SSE Integration](#phase-5-frontend-javascript---sse-integration)
6. [Phase 6: Frontend Integration](#phase-6-frontend-integration)
7. [Phase 7: Database Enhancement (Optional)](#phase-7-database-enhancement-optional)
8. [Phase 8: Testing](#phase-8-testing)
9. [Phase 9: Documentation & Commit](#phase-9-documentation--commit)

---

## Phase 1: Repository Setup

### Goal
Create feature branch and verify development environment is ready

### Prerequisites
- Git repository initialized
- Current branch: `main`
- No uncommitted changes (or stash them)

### Steps

#### 1.1 Check Current Git Status
```bash
git status
```

**Expected Output**: Clean working directory or known uncommitted files

#### 1.2 Pull Latest Changes
```bash
git pull origin main
```

#### 1.3 Create Feature Branch
```bash
git checkout -b feature/document-regeneration
```

#### 1.4 Verify Branch Creation
```bash
git branch --show-current
```

**Expected Output**: `feature/document-regeneration`

### Deliverables
- ✅ Feature branch created
- ✅ Working directory clean
- ✅ Ready for development

### Time Estimate
5 minutes

---

## Phase 2: Backend API Implementation

### Goal
Create `/api/regenerate-documents/:caseId` endpoint with full validation and pipeline integration

### File to Modify
`server.js` (approximately line 2600+, after existing endpoints)

### Implementation

#### 2.1 Add Endpoint Definition

**Location**: After existing `/api/pipeline-retry/:caseId` endpoint

```javascript
/**
 * POST /api/regenerate-documents/:caseId
 *
 * Regenerate documents for an existing case with new document type selection.
 * Allows users to change which documents to generate after initial submission.
 *
 * @param {string} caseId - The database case ID (UUID)
 * @body {Array<string>} documentTypes - Array of document types to regenerate
 * @header {string} Authorization - Bearer token for authentication
 *
 * @returns {Object} Response with jobId for SSE tracking
 */
app.post('/api/regenerate-documents/:caseId', async (req, res) => {
    const { caseId } = req.params;
    const { documentTypes } = req.body;

    console.log(`📄 Document regeneration requested for case: ${caseId}`);
    console.log(`📝 Requested document types: ${JSON.stringify(documentTypes)}`);

    try {
        // ============================================================
        // STEP 1: AUTHENTICATION
        // ============================================================
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ Missing or invalid authorization header');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Valid authorization token required'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Validate token matches expected access token
        if (token !== process.env.ACCESS_TOKEN) {
            console.error('❌ Invalid access token');
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Invalid authorization token'
            });
        }

        // ============================================================
        // STEP 2: VALIDATE DOCUMENT TYPES
        // ============================================================
        const VALID_DOCUMENT_TYPES = ['srogs', 'pods', 'admissions'];

        // Check documentTypes is an array
        if (!Array.isArray(documentTypes)) {
            console.error('❌ documentTypes must be an array');
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: 'documentTypes must be an array'
            });
        }

        // Check at least one document type selected
        if (documentTypes.length === 0) {
            console.error('❌ No document types selected');
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: 'At least one document type must be selected'
            });
        }

        // Validate each document type
        const invalidTypes = documentTypes.filter(type => !VALID_DOCUMENT_TYPES.includes(type));
        if (invalidTypes.length > 0) {
            console.error(`❌ Invalid document types: ${invalidTypes.join(', ')}`);
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: `Invalid document types: ${invalidTypes.join(', ')}`,
                validTypes: VALID_DOCUMENT_TYPES
            });
        }

        // ============================================================
        // STEP 3: FETCH EXISTING CASE FROM DATABASE
        // ============================================================
        console.log(`🔍 Fetching case from database: ${caseId}`);

        const query = `
            SELECT
                id,
                case_number,
                case_title,
                plaintiff_name,
                raw_payload,
                latest_payload,
                document_types_to_generate,
                created_at
            FROM cases
            WHERE id = $1 AND is_active = true
        `;

        const result = await pool.query(query, [caseId]);

        if (result.rows.length === 0) {
            console.error(`❌ Case not found: ${caseId}`);
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Case ${caseId} not found or has been deleted`
            });
        }

        const existingCase = result.rows[0];
        console.log(`✅ Case found: ${existingCase.case_number} - ${existingCase.case_title}`);

        // ============================================================
        // STEP 4: EXTRACT FORM DATA FOR PIPELINE
        // ============================================================
        // Use latest_payload if available (contains normalized data from previous generation)
        // Otherwise fall back to raw_payload
        const formData = existingCase.latest_payload || existingCase.raw_payload;

        if (!formData) {
            console.error('❌ No form data found in case record');
            return res.status(400).json({
                success: false,
                error: 'Invalid Case',
                message: 'Case record does not contain form data for regeneration'
            });
        }

        // ============================================================
        // STEP 5: UPDATE DATABASE WITH NEW DOCUMENT SELECTION
        // ============================================================
        console.log(`💾 Updating document selection in database...`);

        const updateQuery = `
            UPDATE cases
            SET
                document_types_to_generate = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, document_types_to_generate
        `;

        const updateResult = await pool.query(updateQuery, [
            JSON.stringify(documentTypes),
            caseId
        ]);

        console.log(`✅ Database updated with new document types: ${JSON.stringify(documentTypes)}`);

        // ============================================================
        // STEP 6: INVOKE NORMALIZATION PIPELINE
        // ============================================================
        console.log(`🚀 Starting document regeneration pipeline...`);

        // Call existing pipeline function (same one used for initial submission)
        const pipelineResult = await callNormalizationPipeline(
            formData,           // Form data from database
            caseId,             // Use same case ID for tracking
            documentTypes       // New document selection
        );

        console.log(`Pipeline result:`, pipelineResult);

        // ============================================================
        // STEP 7: RETURN SUCCESS RESPONSE
        // ============================================================
        return res.status(200).json({
            success: true,
            message: 'Document regeneration started successfully',
            caseId: caseId,
            jobId: caseId,  // Use caseId as jobId for SSE tracking
            documentTypes: documentTypes,
            pipelineEnabled: true,
            pipeline: {
                status: pipelineResult.status || 'running',
                message: pipelineResult.message || 'Pipeline execution started'
            }
        });

    } catch (error) {
        console.error('❌ Error in document regeneration:', error);

        return res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Failed to start document regeneration',
            details: error.message
        });
    }
});
```

### Key Implementation Details

#### Authentication Flow
1. Extract `Authorization` header
2. Verify it starts with `Bearer `
3. Extract token (remove prefix)
4. Compare with `process.env.ACCESS_TOKEN`
5. Reject if invalid

#### Validation Flow
1. **Type Check**: Ensure `documentTypes` is array
2. **Empty Check**: At least one document required
3. **Value Check**: Each type must be in `['srogs', 'pods', 'admissions']`

#### Database Query
- Use parameterized query to prevent SQL injection
- Only fetch active cases (`is_active = true`)
- Return full form data for pipeline

#### Pipeline Integration
- Reuse existing `callNormalizationPipeline()` function
- Pass updated document types
- Use same case ID for SSE tracking
- Pipeline replaces existing documents

### Environment Variables Required
```env
ACCESS_TOKEN=your_bearer_token_here
```

### Deliverables
- ✅ Endpoint created at `/api/regenerate-documents/:caseId`
- ✅ Full authentication implemented
- ✅ Validation for all inputs
- ✅ Database integration working
- ✅ Pipeline triggered with new selection

### Time Estimate
60-90 minutes

### Testing Commands
```bash
# Test with valid request
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["srogs", "admissions"]}'

# Test with invalid auth
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Authorization: Bearer INVALID" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["srogs"]}'

# Test with invalid document type
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["invalid_type"]}'

# Test with empty array
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": []}'
```

---

## Phase 3: Frontend HTML/UI Structure

### Goal
Add regeneration UI section to submission modal with document selection checkboxes

### File to Modify
`index.html` (inside `#submissionModal`, approximately line 3000+)

### Implementation

#### 3.1 Add Regeneration Section HTML

**Location**: Inside `#submissionModal` modal-body, after existing content

```html
<!-- ============================================================ -->
<!-- REGENERATION SECTION (Hidden by default) -->
<!-- ============================================================ -->
<div id="regeneration-section" style="display: none;">
    <!-- Regeneration Header -->
    <div class="regeneration-header">
        <div class="regeneration-icon">
            🔄
        </div>
        <h3>Regenerate Documents</h3>
        <p class="regeneration-description">
            Select which documents you want to regenerate for this case.
            Previously generated documents will be replaced with new versions.
        </p>
    </div>

    <!-- Case Information Display -->
    <div class="case-info-display">
        <div class="case-info-row">
            <span class="case-info-label">Case Number:</span>
            <span id="regen-case-number" class="case-info-value">-</span>
        </div>
        <div class="case-info-row">
            <span class="case-info-label">Case Title:</span>
            <span id="regen-case-title" class="case-info-value">-</span>
        </div>
        <div class="case-info-row">
            <span class="case-info-label">Plaintiff:</span>
            <span id="regen-plaintiff-name" class="case-info-value">-</span>
        </div>
    </div>

    <!-- Document Selection Grid -->
    <div class="document-selection-section">
        <h4 class="selection-title">Select Documents to Regenerate</h4>

        <div class="document-selection-grid">
            <!-- SROG Checkbox -->
            <div class="document-checkbox-wrapper">
                <input
                    type="checkbox"
                    id="regen-doc-srogs"
                    name="regen-document-selection"
                    value="srogs"
                    class="document-checkbox"
                >
                <label for="regen-doc-srogs" class="document-checkbox-label">
                    <div class="document-icon">📋</div>
                    <div class="document-name">SROGs</div>
                    <div class="document-description">Special Interrogatories</div>
                </label>
            </div>

            <!-- POD Checkbox -->
            <div class="document-checkbox-wrapper">
                <input
                    type="checkbox"
                    id="regen-doc-pods"
                    name="regen-document-selection"
                    value="pods"
                    class="document-checkbox"
                >
                <label for="regen-doc-pods" class="document-checkbox-label">
                    <div class="document-icon">📄</div>
                    <div class="document-name">PODs</div>
                    <div class="document-description">Production of Documents</div>
                </label>
            </div>

            <!-- Admissions Checkbox -->
            <div class="document-checkbox-wrapper">
                <input
                    type="checkbox"
                    id="regen-doc-admissions"
                    name="regen-document-selection"
                    value="admissions"
                    class="document-checkbox"
                >
                <label for="regen-doc-admissions" class="document-checkbox-label">
                    <div class="document-icon">✅</div>
                    <div class="document-name">Admissions</div>
                    <div class="document-description">Requests for Admission</div>
                </label>
            </div>
        </div>

        <!-- Error Message -->
        <div id="regen-document-selection-error" class="error-message" style="display: none;">
            ⚠️ Please select at least one document type to regenerate
        </div>
    </div>

    <!-- Progress Section (Hidden by default) -->
    <div id="regeneration-progress" style="display: none;">
        <div class="progress-header">
            <span class="progress-title">Regeneration in Progress</span>
            <span id="regen-progress-percentage" class="progress-percentage">0%</span>
        </div>

        <div class="progress-bar-container">
            <div id="regen-progress-bar" class="progress-bar-fill" style="width: 0%;"></div>
        </div>

        <div id="regen-progress-message" class="progress-message">
            Initializing document regeneration...
        </div>
    </div>

    <!-- Regenerate Button -->
    <button id="regenerate-btn" class="primary-btn">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Regenerate Selected Documents</span>
    </button>
</div>
```

#### 3.2 Add CSS Styles

**Location**: In `<style>` section of `index.html`, after existing modal styles

```css
/* ============================================================ */
/* REGENERATION SECTION STYLES */
/* ============================================================ */

#regeneration-section {
    padding: 20px;
    border-top: 2px solid #E2E8F0;
}

/* Regeneration Header */
.regeneration-header {
    text-align: center;
    margin-bottom: 24px;
}

.regeneration-icon {
    font-size: 48px;
    margin-bottom: 12px;
    animation: rotate 2s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.regeneration-header h3 {
    font-size: 24px;
    color: #1F2A44;
    margin: 0 0 8px 0;
    font-weight: 600;
}

.regeneration-description {
    font-size: 14px;
    color: #64748B;
    margin: 0;
    line-height: 1.5;
}

/* Case Information Display */
.case-info-display {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
}

.case-info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #E2E8F0;
}

.case-info-row:last-child {
    border-bottom: none;
}

.case-info-label {
    font-weight: 600;
    color: #475569;
    font-size: 14px;
}

.case-info-value {
    color: #1F2A44;
    font-size: 14px;
    max-width: 60%;
    text-align: right;
}

/* Document Selection Section */
.document-selection-section {
    margin-bottom: 24px;
}

.selection-title {
    font-size: 16px;
    color: #1F2A44;
    font-weight: 600;
    margin: 0 0 16px 0;
}

.document-selection-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 12px;
}

@media (max-width: 768px) {
    .document-selection-grid {
        grid-template-columns: 1fr;
    }
}

.document-checkbox-wrapper {
    position: relative;
}

.document-checkbox {
    position: absolute;
    opacity: 0;
    cursor: pointer;
}

.document-checkbox-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    border: 2px solid #E2E8F0;
    border-radius: 8px;
    background: #FFFFFF;
    cursor: pointer;
    transition: all 0.2s ease;
}

.document-checkbox-label:hover {
    border-color: #00AEEF;
    background: #F0F9FF;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 174, 239, 0.1);
}

.document-checkbox:checked + .document-checkbox-label {
    border-color: #00AEEF;
    background: #E0F2FE;
}

.document-checkbox:checked + .document-checkbox-label .document-icon {
    color: #00AEEF;
}

.document-icon {
    font-size: 32px;
    margin-bottom: 8px;
    transition: color 0.2s ease;
}

.document-name {
    font-size: 16px;
    font-weight: 600;
    color: #1F2A44;
    margin-bottom: 4px;
}

.document-description {
    font-size: 12px;
    color: #64748B;
    text-align: center;
}

/* Error Message */
#regen-document-selection-error {
    background: #FEF2F2;
    border: 1px solid #FCA5A5;
    border-radius: 6px;
    padding: 12px 16px;
    color: #DC2626;
    font-size: 14px;
    text-align: center;
    animation: shake 0.3s ease;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
}

/* Progress Section */
#regeneration-progress {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.progress-title {
    font-size: 14px;
    font-weight: 600;
    color: #475569;
}

.progress-percentage {
    font-size: 18px;
    font-weight: 700;
    color: #00AEEF;
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background: #E2E8F0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #00AEEF 0%, #0088CC 100%);
    border-radius: 4px;
    transition: width 0.5s ease;
    position: relative;
}

.progress-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
    );
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.progress-message {
    font-size: 13px;
    color: #64748B;
    text-align: center;
    line-height: 1.5;
}

/* Regenerate Button */
#regenerate-btn {
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #00AEEF 0%, #0088CC 100%);
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

#regenerate-btn:hover {
    background: linear-gradient(135deg, #0088CC 0%, #006699 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 174, 239, 0.3);
}

#regenerate-btn:active {
    transform: translateY(0);
}

#regenerate-btn:disabled {
    background: #CBD5E0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

#regenerate-btn:disabled:hover {
    background: #CBD5E0;
    transform: none;
}

.btn-icon {
    font-size: 18px;
}

.btn-text {
    font-size: 16px;
}
```

### Deliverables
- ✅ Regeneration section HTML added to modal
- ✅ Document selection checkboxes created
- ✅ Case information display added
- ✅ Progress bar structure in place
- ✅ All CSS styles implemented

### Time Estimate
45-60 minutes

### Visual Preview
The regeneration section will display:
- 🔄 Rotating icon header
- Case information card (number, title, plaintiff)
- 3-column grid of document checkboxes
- Progress bar (hidden until regeneration starts)
- Full-width regenerate button

---

## Phase 4: Frontend JavaScript - Core Logic

### Goal
Implement core regeneration functions: modal display, validation, API calls

### File to Create
`js/document-regeneration.js`

### Implementation

#### 4.1 Create JavaScript File

**File**: `js/document-regeneration.js`

```javascript
/**
 * Document Regeneration Module
 *
 * Handles selective document regeneration for previously submitted cases.
 * Integrates with existing submission modal and SSE progress tracking.
 *
 * Dependencies:
 * - form-submission.js: getSelectedDocuments() function
 * - sse-client.js: createJobStream() function
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
 * Display case in submission modal with regeneration options
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

    // Get modal elements
    const modal = document.getElementById('submissionModal');
    const regenerationSection = document.getElementById('regeneration-section');

    if (!modal || !regenerationSection) {
        console.error('❌ Modal elements not found');
        return;
    }

    // ============================================================
    // STEP 1: POPULATE CASE INFORMATION
    // ============================================================

    document.getElementById('regen-case-number').textContent = caseData.caseNumber || '-';
    document.getElementById('regen-case-title').textContent = caseData.caseTitle || '-';
    document.getElementById('regen-plaintiff-name').textContent = caseData.plaintiffName || '-';

    // ============================================================
    // STEP 2: SET DOCUMENT SELECTION CHECKBOXES
    // ============================================================

    // Get all regeneration document checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');

    // Pre-check previously selected documents
    const previousSelection = caseData.documentTypesToGenerate || ['srogs', 'pods', 'admissions'];

    checkboxes.forEach(checkbox => {
        checkbox.checked = previousSelection.includes(checkbox.value);
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

    // Enable regenerate button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
    }

    // Reset regeneration state
    isRegenerating = false;

    // ============================================================
    // STEP 4: SHOW MODAL
    // ============================================================

    // Hide any existing content in modal
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        // Hide all children except regeneration section
        Array.from(modalBody.children).forEach(child => {
            if (child.id !== 'regeneration-section') {
                child.style.display = 'none';
            }
        });
    }

    // Show regeneration section
    regenerationSection.style.display = 'block';

    // Show modal
    modal.classList.add('show');
    modal.style.display = 'flex';

    console.log('✅ Regeneration modal opened');
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

    console.log(`Selected documents for regeneration: ${selected.join(', ')}`);

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
            errorElement.style.display = 'block';
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
        regenerateBtn.innerHTML = `
            <span class="btn-icon">⏳</span>
            <span class="btn-text">Starting Regeneration...</span>
        `;
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
            throw new Error('Authentication token not found');
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

        console.log('API response:', result);

        // ============================================================
        // STEP 5: HANDLE API RESPONSE
        // ============================================================

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to start regeneration');
        }

        console.log('✅ Regeneration started successfully');
        console.log(`Job ID: ${result.jobId}`);

        // Continue to Phase 5 for SSE tracking
        // (This will be implemented in Phase 5)

        // For now, show success message
        showRegenerationStarted(result);

    } catch (error) {
        console.error('❌ Regeneration error:', error);

        // Show error to user
        alert(`Error starting regeneration: ${error.message}`);

        // Reset UI
        resetRegenerationUI();
    }
}

/**
 * Show regeneration started message (temporary - will be replaced with SSE)
 *
 * @param {Object} result - API response
 */
function showRegenerationStarted(result) {
    const progressSection = document.getElementById('regeneration-progress');
    const progressMessage = document.getElementById('regen-progress-message');

    if (progressSection && progressMessage) {
        progressSection.style.display = 'block';
        progressMessage.textContent = 'Document regeneration started! Pipeline is processing your request...';
    }

    // Update button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.innerHTML = `
            <span class="btn-icon">⏳</span>
            <span class="btn-text">Regeneration in Progress...</span>
        `;
    }
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
        regenerateBtn.innerHTML = `
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Regenerate Selected Documents</span>
        `;
    }

    // Re-enable checkboxes
    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = false);

    // Hide progress
    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'none';
    }
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

    // Regenerate button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', handleRegenerateDocuments);
        console.log('✅ Regenerate button listener added');
    }

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

    console.log('✅ Regeneration event listeners initialized');
}

// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', initializeRegenerationListeners);

// ============================================================
// EXPORT FOR EXTERNAL USE
// ============================================================

// Make functions available globally
window.showCaseForRegeneration = showCaseForRegeneration;
window.handleRegenerateDocuments = handleRegenerateDocuments;
window.resetRegenerationUI = resetRegenerationUI;

console.log('📦 Document regeneration module loaded');
```

### Key Implementation Details

#### State Management
- `currentCaseId`: Tracks which case is being regenerated
- `currentJobStream`: Will hold SSE connection (Phase 5)
- `isRegenerating`: Prevents duplicate regeneration requests

#### Function Flow
1. **showCaseForRegeneration()** - Entry point, displays modal
2. **getRegenerationSelectedDocuments()** - Extracts checkbox values
3. **validateRegenerationSelection()** - Ensures at least one selected
4. **handleRegenerateDocuments()** - Main handler, calls API
5. **resetRegenerationUI()** - Cleanup after completion/error

#### Error Handling
- Validates case ID exists
- Checks authentication token
- Handles API errors gracefully
- Shows user-friendly error messages

### Deliverables
- ✅ Core regeneration functions implemented
- ✅ Document selection and validation working
- ✅ API integration complete
- ✅ Error handling in place
- ✅ Event listeners configured

### Time Estimate
60-75 minutes

---

## Phase 5: Frontend JavaScript - SSE Integration

### Goal
Add real-time progress tracking using Server-Sent Events

### File to Modify
`js/document-regeneration.js` (update existing functions)

### Implementation

#### 5.1 Update Regeneration Handler with SSE

**Replace the `showRegenerationStarted()` function and add SSE tracking:**

```javascript
/**
 * Start SSE tracking for regeneration progress
 * Replaces temporary success message
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

    updateProgressUI(0, 'Connecting to regeneration pipeline...');

    // ============================================================
    // STEP 2: CREATE SSE CONNECTION
    // ============================================================

    // Check if createJobStream function exists (from sse-client.js)
    if (typeof createJobStream !== 'function') {
        console.error('❌ createJobStream function not found. Is sse-client.js loaded?');

        // Fallback: Show manual check message
        updateProgressUI(50, 'Document regeneration started. Please check back in a few minutes.');
        return;
    }

    // Create SSE stream
    currentJobStream = createJobStream(jobId);

    // ============================================================
    // STEP 3: CONFIGURE EVENT HANDLERS
    // ============================================================

    // Progress updates
    currentJobStream.onProgress = (data) => {
        console.log('📊 Regeneration progress:', data);

        const percentage = data.percentage || 0;
        const message = data.message || 'Processing documents...';
        const phase = data.phase || '';

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

    try {
        currentJobStream.connect();
        console.log('✅ SSE connection established');
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

    // Update button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = `
            <span class="btn-icon">✅</span>
            <span class="btn-text">Regeneration Complete</span>
        `;

        // Change button style to success
        regenerateBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
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

    // Optional: Show success notification
    showSuccessNotification('Documents have been regenerated successfully!');
}

/**
 * Handle regeneration error
 *
 * @param {Object} data - Error data from SSE or API
 */
function handleRegenerationError(data) {
    console.error('Regeneration error:', data);

    const errorMessage = data.message || 'An unknown error occurred during regeneration';

    // Update progress UI with error
    const progressSection = document.getElementById('regeneration-progress');
    if (progressSection) {
        progressSection.style.display = 'block';
        progressSection.style.background = '#FEF2F2';
        progressSection.style.borderColor = '#FCA5A5';
    }

    updateProgressUI(0, `❌ Error: ${errorMessage}`);

    // Update button to allow retry
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = `
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Retry Regeneration</span>
        `;

        // Reset button style
        regenerateBtn.style.background = 'linear-gradient(135deg, #00AEEF 0%, #0088CC 100%)';
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
    alert(`Regeneration Failed: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
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
        <span class="notification-icon">✅</span>
        <span class="notification-message">${message}</span>
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
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// ============================================================
// UPDATE EXISTING FUNCTION
// ============================================================

/**
 * Updated: Handle regenerate button click with SSE tracking
 * (Replace existing function in Phase 4 code)
 */
async function handleRegenerateDocuments() {
    console.log('🔄 Regenerate button clicked');

    if (isRegenerating) {
        console.warn('⚠️ Regeneration already in progress');
        return;
    }

    const selectedDocuments = getRegenerationSelectedDocuments();

    if (!validateRegenerationSelection(selectedDocuments)) {
        console.error('❌ Validation failed: no documents selected');
        return;
    }

    if (!currentCaseId) {
        console.error('❌ No case ID available');
        alert('Error: Case ID not found. Please refresh and try again.');
        return;
    }

    isRegenerating = true;

    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
        regenerateBtn.innerHTML = `
            <span class="btn-icon">⏳</span>
            <span class="btn-text">Starting Regeneration...</span>
        `;
    }

    const checkboxes = document.querySelectorAll('input[name="regen-document-selection"]');
    checkboxes.forEach(cb => cb.disabled = true);

    try {
        console.log(`🚀 Calling regeneration API for case: ${currentCaseId}`);

        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('token') || localStorage.getItem('authToken');

        if (!authToken) {
            throw new Error('Authentication token not found');
        }

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

        console.log('API response:', result);

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to start regeneration');
        }

        console.log('✅ Regeneration started successfully');
        console.log(`Job ID: ${result.jobId}`);

        // ============================================================
        // NEW: START SSE TRACKING
        // ============================================================
        startRegenerationTracking(result);

    } catch (error) {
        console.error('❌ Regeneration error:', error);
        alert(`Error starting regeneration: ${error.message}`);
        resetRegenerationUI();
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
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
document.head.appendChild(style);
```

### Key Implementation Details

#### SSE Integration Points
1. **createJobStream()** - Reused from existing sse-client.js
2. **Event Handlers** - onProgress, onComplete, onError
3. **Progress Updates** - Real-time percentage and message
4. **Connection Management** - Auto-connect, disconnect on complete/error

#### UI Updates
- **Progress Bar** - Animated width transition
- **Percentage Display** - Real-time update
- **Status Message** - Descriptive pipeline status
- **Button State** - Disabled during regeneration, success state on completion

#### Error Recovery
- Graceful degradation if SSE unavailable
- Retry capability on error
- User-friendly error messages
- Automatic cleanup of connections

### Deliverables
- ✅ SSE tracking integrated
- ✅ Real-time progress updates working
- ✅ Completion handling implemented
- ✅ Error handling with retry capability
- ✅ Success notifications added

### Time Estimate
45-60 minutes

---

## Phase 6: Frontend Integration

### Goal
Connect regeneration module to existing codebase and add script includes

### Files to Modify
1. `index.html` - Add script include
2. `js/form-submission.js` - Export shared function (optional)

### Implementation

#### 6.1 Add Script Include to HTML

**Location**: `index.html`, in `<head>` or before closing `</body>` tag, after existing script includes

```html
<!-- Existing scripts -->
<script src="js/sse-client.js"></script>
<script src="js/form-submission.js"></script>

<!-- NEW: Document Regeneration Module -->
<script src="js/document-regeneration.js"></script>
```

#### 6.2 Export Shared Function (Optional)

**Location**: `js/form-submission.js`, at end of file

If you want to reuse the existing `getSelectedDocuments()` function:

```javascript
// At the end of form-submission.js

/**
 * Export getSelectedDocuments for use in other modules
 * This allows document-regeneration.js to reuse validation logic
 */
window.getSelectedDocuments = getSelectedDocuments;
```

**Note**: The regeneration module already has its own `getRegenerationSelectedDocuments()` function, so this export is optional.

#### 6.3 Add Test Button (For Development/Testing)

**Location**: `index.html`, add temporarily for testing

```html
<!-- Add this temporarily in your main content area for testing -->
<button onclick="testRegenerationModal()" style="position: fixed; top: 10px; right: 10px; z-index: 9999;">
    Test Regeneration Modal
</button>

<script>
function testRegenerationModal() {
    // Test data
    const testCaseId = 'test-case-id-123';
    const testCaseData = {
        caseNumber: 'CASE-2025-001',
        caseTitle: 'Test v. Defendant',
        plaintiffName: 'John Test',
        documentTypesToGenerate: ['srogs', 'pods']
    };

    // Open regeneration modal
    showCaseForRegeneration(testCaseId, testCaseData);
}
</script>
```

#### 6.4 Verify Script Loading Order

Ensure scripts load in correct order:

```html
<!-- 1. SSE client (dependency) -->
<script src="js/sse-client.js"></script>

<!-- 2. Form submission (optional dependency) -->
<script src="js/form-submission.js"></script>

<!-- 3. Document regeneration (depends on above) -->
<script src="js/document-regeneration.js"></script>
```

### Testing Checklist

#### After Integration:
- [ ] Open browser console, check for "Document regeneration module loaded" message
- [ ] Click test button, verify modal opens
- [ ] Verify case information displays correctly
- [ ] Check document checkboxes are pre-selected
- [ ] Verify no console errors

#### Script Loading Verification:
```javascript
// Run in browser console to verify functions available
console.log(typeof showCaseForRegeneration); // Should be "function"
console.log(typeof createJobStream); // Should be "function"
console.log(typeof handleRegenerateDocuments); // Should be "function"
```

### Deliverables
- ✅ Script includes added to HTML
- ✅ Load order verified
- ✅ Test button added for development
- ✅ Integration verified in browser

### Time Estimate
15-20 minutes

---

## Phase 7: Database Enhancement (Optional)

### Goal
Add regeneration tracking columns to database for audit and analytics

### File to Create
`database/migrate_add_regeneration_tracking.sql`

### Implementation

#### 7.1 Create Migration File

**File**: `database/migrate_add_regeneration_tracking.sql`

```sql
-- ============================================================
-- Migration: Add Regeneration Tracking Columns
-- ============================================================
-- Purpose: Track when and how many times documents have been regenerated
-- Timestamp: 2025-01-XX
-- Author: [Your Name]

BEGIN;

-- ============================================================
-- STEP 1: ADD COLUMNS
-- ============================================================

-- Last regeneration timestamp
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMP;

-- Count of regenerations performed
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS regeneration_count INTEGER DEFAULT 0;

-- Store document selection history (optional - for advanced analytics)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS regeneration_history JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN cases.last_regenerated_at IS 'Timestamp of most recent document regeneration';
COMMENT ON COLUMN cases.regeneration_count IS 'Total number of times documents have been regenerated';
COMMENT ON COLUMN cases.regeneration_history IS 'Array of regeneration events with timestamp and document types';

-- ============================================================
-- STEP 2: ADD INDEXES
-- ============================================================

-- Index for querying recently regenerated cases
CREATE INDEX IF NOT EXISTS idx_cases_last_regenerated_at
ON cases (last_regenerated_at DESC);

-- Index for querying cases by regeneration count
CREATE INDEX IF NOT EXISTS idx_cases_regeneration_count
ON cases (regeneration_count);

-- ============================================================
-- STEP 3: ADD CONSTRAINTS
-- ============================================================

-- Ensure regeneration_count is non-negative
ALTER TABLE cases
ADD CONSTRAINT cases_regeneration_count_check
CHECK (regeneration_count >= 0);

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify columns added
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cases'
    AND column_name IN ('last_regenerated_at', 'regeneration_count', 'regeneration_history');

-- Verify indexes created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'cases'
    AND indexname LIKE '%regenerat%';
```

#### 7.2 Update Server.js to Track Regenerations

**Location**: `server.js`, inside `/api/regenerate-documents/:caseId` endpoint, after successful pipeline call

```javascript
// ============================================================
// STEP 8: UPDATE REGENERATION TRACKING (NEW)
// ============================================================

try {
    // Create regeneration history entry
    const historyEntry = {
        timestamp: new Date().toISOString(),
        documentTypes: documentTypes,
        userId: req.user?.id || 'anonymous', // If you have user tracking
        triggeredBy: 'manual' // vs 'automatic', 'scheduled', etc.
    };

    // Update database with regeneration tracking
    const trackingQuery = `
        UPDATE cases
        SET
            last_regenerated_at = NOW(),
            regeneration_count = regeneration_count + 1,
            regeneration_history = regeneration_history || $1::JSONB
        WHERE id = $2
        RETURNING
            last_regenerated_at,
            regeneration_count
    `;

    const trackingResult = await pool.query(trackingQuery, [
        JSON.stringify(historyEntry),
        caseId
    ]);

    if (trackingResult.rows.length > 0) {
        const tracking = trackingResult.rows[0];
        console.log(`✅ Regeneration tracking updated: count=${tracking.regeneration_count}, last=${tracking.last_regenerated_at}`);
    }

} catch (trackingError) {
    // Don't fail the request if tracking fails
    console.error('⚠️ Warning: Failed to update regeneration tracking:', trackingError);
}
```

#### 7.3 Run Migration

**Connect to database:**
```bash
# Local development
psql -U postgres -d legal_forms_db -f database/migrate_add_regeneration_tracking.sql

# Or via Cloud SQL proxy
psql -h 127.0.0.1 -U postgres -d legal_forms_db -f database/migrate_add_regeneration_tracking.sql
```

**Or via server.js connection:**
```javascript
// Add migration endpoint (for development only)
app.post('/api/admin/migrate-regeneration-tracking', async (req, res) => {
    try {
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'database/migrate_add_regeneration_tracking.sql'),
            'utf8'
        );

        await pool.query(migrationSQL);

        res.json({
            success: true,
            message: 'Regeneration tracking migration completed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

### Analytics Queries

#### Query regeneration statistics:
```sql
-- Cases regenerated most frequently
SELECT
    id,
    case_number,
    case_title,
    regeneration_count,
    last_regenerated_at
FROM cases
WHERE regeneration_count > 0
ORDER BY regeneration_count DESC
LIMIT 10;

-- Regeneration activity by date
SELECT
    DATE(last_regenerated_at) as regeneration_date,
    COUNT(*) as regeneration_count
FROM cases
WHERE last_regenerated_at IS NOT NULL
GROUP BY DATE(last_regenerated_at)
ORDER BY regeneration_date DESC;

-- Average regenerations per case
SELECT
    AVG(regeneration_count) as avg_regenerations,
    MAX(regeneration_count) as max_regenerations,
    COUNT(CASE WHEN regeneration_count > 0 THEN 1 END) as cases_with_regenerations
FROM cases;
```

### Deliverables
- ✅ Migration SQL file created
- ✅ Columns added to database
- ✅ Indexes created
- ✅ Server code updated to track regenerations
- ✅ Analytics queries available

### Time Estimate
30-45 minutes

### Note
This phase is **optional** but recommended for production deployments to track system usage and identify cases that require frequent regeneration (which may indicate data quality issues).

---

## Phase 8: Testing

### Goal
Comprehensive testing of regeneration feature across all scenarios

### Test Environment Setup

#### Prerequisites
- Server running locally: `npm start`
- Database accessible
- At least one existing case in database for testing
- Valid authentication token

### Test Scenarios

#### Test 1: Basic Regeneration Flow

**Steps:**
1. Open regeneration modal with test case
2. Verify case information displays correctly
3. Change document selection (uncheck one document)
4. Click "Regenerate Selected Documents"
5. Verify API call succeeds
6. Watch SSE progress updates
7. Verify completion message

**Expected Results:**
- ✅ Modal opens with pre-selected documents
- ✅ API returns 200 status
- ✅ Progress bar animates from 0% to 100%
- ✅ Success message displays
- ✅ Button changes to success state

**Test Command:**
```javascript
// Run in browser console
showCaseForRegeneration('YOUR_CASE_ID', {
    caseNumber: 'CASE-2025-001',
    caseTitle: 'Test v. Defendant',
    plaintiffName: 'John Test',
    documentTypesToGenerate: ['srogs', 'pods', 'admissions']
});
```

---

#### Test 2: Validation - No Documents Selected

**Steps:**
1. Open regeneration modal
2. Uncheck ALL document checkboxes
3. Click "Regenerate Selected Documents"

**Expected Results:**
- ❌ Error message displays: "Please select at least one document type to regenerate"
- ❌ API call NOT made
- ✅ Button remains enabled

---

#### Test 3: Authentication Failure

**Steps:**
1. Remove auth token from URL/localStorage
2. Open regeneration modal
3. Select documents
4. Click regenerate

**Expected Results:**
- ❌ API returns 401 Unauthorized
- ❌ Error alert displays
- ✅ UI resets to allow retry

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["srogs"]}'
```

---

#### Test 4: Invalid Case ID

**Steps:**
1. Use non-existent case ID
2. Attempt regeneration

**Expected Results:**
- ❌ API returns 404 Not Found
- ❌ Error message: "Case not found"
- ✅ UI resets

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/regenerate-documents/non-existent-id \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["srogs"]}'
```

---

#### Test 5: Invalid Document Type

**Steps:**
1. Send API request with invalid document type

**Expected Results:**
- ❌ API returns 400 Bad Request
- ❌ Error lists invalid types

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/regenerate-documents/YOUR_CASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentTypes": ["srogs", "invalid_type"]}'
```

---

#### Test 6: SSE Connection and Reconnection

**Steps:**
1. Start regeneration
2. Disable network (browser DevTools → Network → Offline)
3. Wait 5 seconds
4. Re-enable network

**Expected Results:**
- ✅ SSE attempts reconnection with exponential backoff
- ✅ Progress resumes when network restored
- ✅ No duplicate progress updates

---

#### Test 7: Multiple Regenerations for Same Case

**Steps:**
1. Complete regeneration successfully
2. Immediately click regenerate again with different document selection
3. Verify second regeneration starts

**Expected Results:**
- ✅ First regeneration completes
- ✅ Second regeneration starts fresh
- ✅ Database updates with latest document selection
- ✅ `regeneration_count` increments

---

#### Test 8: Concurrent Regenerations (Different Cases)

**Steps:**
1. Open two browser tabs
2. Start regeneration in tab 1 for case A
3. Start regeneration in tab 2 for case B
4. Verify both progress independently

**Expected Results:**
- ✅ Both regenerations proceed independently
- ✅ SSE streams don't interfere
- ✅ Both complete successfully

---

#### Test 9: Pipeline Failure

**Steps:**
1. Temporarily break pipeline (e.g., disable Python service)
2. Start regeneration
3. Observe error handling

**Expected Results:**
- ❌ SSE emits error event
- ❌ Error message displays in UI
- ✅ Retry button enabled
- ✅ User can attempt retry

---

#### Test 10: UI State During Regeneration

**Steps:**
1. Start regeneration
2. Attempt to:
   - Click regenerate button again
   - Change document selection
   - Close modal

**Expected Results:**
- ✅ Button disabled during regeneration
- ✅ Checkboxes disabled during regeneration
- ⚠️ Modal can close (regeneration continues in background)

---

#### Test 11: Database Tracking (If Phase 7 implemented)

**Steps:**
1. Complete regeneration
2. Query database for tracking columns

**Expected Results:**
- ✅ `last_regenerated_at` updated to current timestamp
- ✅ `regeneration_count` incremented
- ✅ `regeneration_history` contains new entry

**Query:**
```sql
SELECT
    id,
    regeneration_count,
    last_regenerated_at,
    regeneration_history
FROM cases
WHERE id = 'YOUR_CASE_ID';
```

---

#### Test 12: Mobile Responsiveness

**Steps:**
1. Open regeneration modal on mobile (Chrome DevTools → Device Toolbar)
2. Test all interactions

**Expected Results:**
- ✅ Document grid stacks vertically (1 column)
- ✅ All buttons accessible
- ✅ Modal fits screen
- ✅ Progress bar visible

---

### Automated Testing Script

**Create**: `test-regeneration.js`

```javascript
/**
 * Automated test suite for document regeneration
 * Run with: node test-regeneration.js
 */

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-token-here';
const TEST_CASE_ID = process.env.TEST_CASE_ID || 'your-case-id-here';

async function runTests() {
    console.log('🧪 Starting regeneration tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Successful regeneration
    try {
        const response = await fetch(`${BASE_URL}/api/regenerate-documents/${TEST_CASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                documentTypes: ['srogs', 'pods']
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Test 1 PASSED: Successful regeneration');
            passed++;
        } else {
            console.log('❌ Test 1 FAILED:', result.message);
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 1 ERROR:', error.message);
        failed++;
    }

    // Test 2: Missing authentication
    try {
        const response = await fetch(`${BASE_URL}/api/regenerate-documents/${TEST_CASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No auth header
            },
            body: JSON.stringify({
                documentTypes: ['srogs']
            })
        });

        if (response.status === 401) {
            console.log('✅ Test 2 PASSED: Auth validation works');
            passed++;
        } else {
            console.log('❌ Test 2 FAILED: Should reject missing auth');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 2 ERROR:', error.message);
        failed++;
    }

    // Test 3: Invalid document type
    try {
        const response = await fetch(`${BASE_URL}/api/regenerate-documents/${TEST_CASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                documentTypes: ['invalid_type']
            })
        });

        const result = await response.json();

        if (response.status === 400 && result.message.includes('Invalid document types')) {
            console.log('✅ Test 3 PASSED: Document type validation works');
            passed++;
        } else {
            console.log('❌ Test 3 FAILED: Should reject invalid document types');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 3 ERROR:', error.message);
        failed++;
    }

    // Test 4: Empty document array
    try {
        const response = await fetch(`${BASE_URL}/api/regenerate-documents/${TEST_CASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                documentTypes: []
            })
        });

        const result = await response.json();

        if (response.status === 400) {
            console.log('✅ Test 4 PASSED: Empty array validation works');
            passed++;
        } else {
            console.log('❌ Test 4 FAILED: Should reject empty document array');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 4 ERROR:', error.message);
        failed++;
    }

    // Test 5: Non-existent case
    try {
        const response = await fetch(`${BASE_URL}/api/regenerate-documents/non-existent-case-id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                documentTypes: ['srogs']
            })
        });

        if (response.status === 404) {
            console.log('✅ Test 5 PASSED: Case not found validation works');
            passed++;
        } else {
            console.log('❌ Test 5 FAILED: Should return 404 for non-existent case');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 5 ERROR:', error.message);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
```

**Run tests:**
```bash
AUTH_TOKEN=your-token-here TEST_CASE_ID=your-case-id-here node test-regeneration.js
```

### Performance Testing

#### Measure SSE Latency:
```javascript
// Browser console
const start = Date.now();
let firstUpdate = null;

currentJobStream.onProgress = (data) => {
    if (!firstUpdate) {
        firstUpdate = Date.now();
        console.log(`Time to first progress update: ${firstUpdate - start}ms`);
    }
};
```

### Deliverables
- ✅ All 12 manual tests passed
- ✅ Automated test suite running
- ✅ Edge cases handled
- ✅ Performance acceptable (<500ms first update)
- ✅ Mobile responsive

### Time Estimate
90-120 minutes

---

## Phase 9: Documentation & Commit

### Goal
Document changes, create commit, push feature branch

### Tasks

#### 9.1 Create Implementation Summary

**File**: `REGENERATION_FEATURE_SUMMARY.md`

```markdown
# Document Regeneration Feature - Implementation Summary

## Feature Overview
Users can now selectively regenerate documents for previously submitted cases with real-time progress tracking.

## Implementation Date
[Current Date]

## Changes Made

### Backend Changes
- **File**: `server.js`
- **New Endpoint**: `POST /api/regenerate-documents/:caseId`
- **Lines Added**: ~170 lines
- **Features**:
  - Bearer token authentication
  - Document type validation
  - Case lookup from database
  - Pipeline integration
  - Regeneration tracking (optional)

### Frontend Changes
- **File**: `index.html`
- **Changes**: Added regeneration section HTML (~150 lines) and CSS (~250 lines)
- **New Elements**:
  - `#regeneration-section`
  - Document selection checkboxes
  - Progress tracking UI

- **File**: `js/document-regeneration.js` (NEW)
- **Lines**: ~400 lines
- **Features**:
  - Modal management
  - Document selection validation
  - API integration
  - SSE progress tracking
  - Error handling

### Database Changes (Optional)
- **File**: `database/migrate_add_regeneration_tracking.sql` (NEW)
- **Columns Added**:
  - `last_regenerated_at` (TIMESTAMP)
  - `regeneration_count` (INTEGER)
  - `regeneration_history` (JSONB)

## API Documentation

### Endpoint: POST /api/regenerate-documents/:caseId

**Request:**
```json
{
  "documentTypes": ["srogs", "pods", "admissions"]
}
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Document regeneration started successfully",
  "caseId": "uuid",
  "jobId": "uuid",
  "documentTypes": ["srogs", "pods"],
  "pipelineEnabled": true
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Error description"
}
```

## Usage Instructions

### For Developers:
1. Open regeneration modal:
   ```javascript
   showCaseForRegeneration(caseId, caseData);
   ```

2. Case data format:
   ```javascript
   {
     caseNumber: "CASE-2025-001",
     caseTitle: "Plaintiff v. Defendant",
     plaintiffName: "John Doe",
     documentTypesToGenerate: ["srogs", "pods"]
   }
   ```

### For End Users:
1. View existing case (you need to implement navigation)
2. Click regeneration trigger
3. Select documents to regenerate
4. Watch real-time progress
5. Documents replaced when complete

## Testing Results
- ✅ All validation scenarios tested
- ✅ SSE progress tracking verified
- ✅ Error handling working
- ✅ Mobile responsive
- ✅ Database tracking functional (if enabled)

## Known Limitations
- No UI to browse existing cases (out of scope)
- Regeneration replaces ALL selected documents (cannot selectively update)
- No rate limiting on regenerations
- No email notification on completion

## Future Enhancements
- Add case list/search UI
- Email notifications on completion
- Regeneration rate limiting
- Partial document updates
- Admin dashboard for regeneration analytics

## Files Changed
- server.js (+170 lines)
- index.html (+400 lines HTML/CSS)
- js/document-regeneration.js (+400 lines, NEW)
- database/migrate_add_regeneration_tracking.sql (NEW, optional)

## Total Lines of Code
~970 lines added
```

#### 9.2 Update Main README (if exists)

Add section to `README.md`:

```markdown
## Document Regeneration

Users can regenerate documents for existing cases with selective document type choice.

### API Endpoint
`POST /api/regenerate-documents/:caseId`

See [REGENERATION_FEATURE_SUMMARY.md](REGENERATION_FEATURE_SUMMARY.md) for details.

### Usage
```javascript
showCaseForRegeneration(caseId, {
  caseNumber: "CASE-001",
  caseTitle: "Title",
  plaintiffName: "Name",
  documentTypesToGenerate: ["srogs", "pods"]
});
```
```

#### 9.3 Git Commit

**Step 1: Review changes**
```bash
git status
git diff
```

**Step 2: Add files**
```bash
git add server.js
git add index.html
git add js/document-regeneration.js
git add database/migrate_add_regeneration_tracking.sql  # if created
git add REGENERATION_FEATURE_SUMMARY.md
git add DOCUMENT_REGENERATION_IMPLEMENTATION_PLAN.md
git add README.md  # if updated
```

**Step 3: Commit with detailed message**
```bash
git commit -m "feat: Add document regeneration feature with SSE tracking

Implements selective document regeneration for previously submitted cases.

Backend Changes:
- Add POST /api/regenerate-documents/:caseId endpoint
- Bearer token authentication
- Document type validation
- Database update and pipeline integration
- Optional regeneration tracking columns

Frontend Changes:
- Add regeneration section to submission modal
- Document selection UI with checkboxes
- Real-time SSE progress tracking
- Error handling and retry capability
- Success notifications

Features:
- Select which documents to regenerate (SROGs, PODs, Admissions)
- Real-time progress updates via Server-Sent Events
- Complete document replacement on regeneration
- Case information display
- Mobile responsive design

Testing:
- All validation scenarios tested
- SSE reconnection verified
- Error handling working
- Mobile responsive confirmed

Files:
- server.js: +170 lines (API endpoint)
- index.html: +400 lines (HTML/CSS)
- js/document-regeneration.js: +400 lines (NEW)
- database/migrate_add_regeneration_tracking.sql: NEW (optional)

Resolves: #[issue-number] (if applicable)
"
```

#### 9.4 Push to Remote

```bash
# Push feature branch
git push origin feature/document-regeneration

# Or set upstream if first push
git push -u origin feature/document-regeneration
```

#### 9.5 Create Pull Request (Optional)

If using GitHub/GitLab:

**PR Title:**
```
feat: Document regeneration with selective type selection
```

**PR Description:**
```markdown
## Feature: Document Regeneration

Adds ability for users to regenerate documents for existing cases with selective document type choice.

## Changes
- ✅ Backend API endpoint with authentication
- ✅ Frontend modal UI with document selection
- ✅ Real-time SSE progress tracking
- ✅ Database regeneration tracking (optional)

## Testing
- [x] All validation scenarios tested
- [x] SSE progress tracking verified
- [x] Error handling working
- [x] Mobile responsive

## Screenshots
[Add screenshots of regeneration modal if possible]

## Documentation
See `REGENERATION_FEATURE_SUMMARY.md` for complete details.

## Deployment Notes
- Requires database migration if using regeneration tracking
- No environment variable changes needed
- Compatible with existing CI/CD pipeline
```

### Git Branch Workflow

```bash
# If you need to update from main later
git checkout main
git pull origin main
git checkout feature/document-regeneration
git merge main

# Or rebase (cleaner history)
git checkout feature/document-regeneration
git rebase main
```

### Deliverables
- ✅ Implementation summary document created
- ✅ README updated (if applicable)
- ✅ All changes committed with detailed message
- ✅ Feature branch pushed to remote
- ✅ Pull request created (optional)

### Time Estimate
30-45 minutes

---

## Summary

### Total Implementation Time
**Estimated**: 6-8 hours for complete implementation

### Phase Breakdown
| Phase | Time | Status |
|-------|------|--------|
| Phase 1: Repository Setup | 5 min | ⬜ Pending |
| Phase 2: Backend API | 60-90 min | ⬜ Pending |
| Phase 3: Frontend HTML/CSS | 45-60 min | ⬜ Pending |
| Phase 4: Core JavaScript | 60-75 min | ⬜ Pending |
| Phase 5: SSE Integration | 45-60 min | ⬜ Pending |
| Phase 6: Integration | 15-20 min | ⬜ Pending |
| Phase 7: Database (Optional) | 30-45 min | ⬜ Pending |
| Phase 8: Testing | 90-120 min | ⬜ Pending |
| Phase 9: Documentation | 30-45 min | ⬜ Pending |

### Key Files Created/Modified

**Created:**
- `js/document-regeneration.js` (~400 lines)
- `database/migrate_add_regeneration_tracking.sql` (~50 lines, optional)
- `REGENERATION_FEATURE_SUMMARY.md`
- `DOCUMENT_REGENERATION_IMPLEMENTATION_PLAN.md`

**Modified:**
- `server.js` (+170 lines)
- `index.html` (+400 lines)
- `README.md` (minor update)

**Total**: ~970 lines of code added

### Dependencies
- Existing SSE infrastructure (sse-client.js)
- PostgreSQL database with cases table
- Bearer token authentication
- Normalization pipeline (callNormalizationPipeline)

### Deployment Checklist
- [ ] Feature branch created
- [ ] All code implemented
- [ ] Testing completed
- [ ] Documentation updated
- [ ] Database migration run (if Phase 7 implemented)
- [ ] Pull request created
- [ ] Code reviewed
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tested in staging
- [ ] Deployed to production

---

## Next Steps After Implementation

1. **Add Case Navigation UI** - Users need a way to access existing cases
   - Case list page
   - Search by case number
   - Filter by date/plaintiff

2. **Email Notifications** - Notify users when regeneration completes
   - Optional: Send email on completion
   - Include links to regenerated documents

3. **Rate Limiting** - Prevent abuse
   - Limit regenerations per case per day
   - Implement cooldown period

4. **Analytics Dashboard** - Track regeneration usage
   - Most regenerated cases
   - Average regeneration time
   - Failure rate analysis

5. **Partial Regeneration** - Advanced feature
   - Regenerate only failed documents
   - Keep successful documents unchanged

---

## Troubleshooting

### Common Issues

**Issue**: Regenerate button does nothing
- **Check**: Browser console for JavaScript errors
- **Fix**: Verify `document-regeneration.js` loaded correctly

**Issue**: API returns 401 Unauthorized
- **Check**: Bearer token in request headers
- **Fix**: Ensure token passed correctly from URL/localStorage

**Issue**: SSE progress not updating
- **Check**: Browser console for EventSource errors
- **Fix**: Verify `sse-client.js` loaded and createJobStream available

**Issue**: Case not found error
- **Check**: Case ID format (should be UUID)
- **Fix**: Verify case exists in database and is_active = true

**Issue**: Database migration fails
- **Check**: PostgreSQL connection
- **Fix**: Ensure proper permissions, column doesn't already exist

---

## Contact & Support

For questions or issues during implementation:
- Review this implementation plan
- Check browser console for errors
- Verify API responses in Network tab
- Review server logs for backend errors

---

**End of Implementation Plan**

# Tasks: PDF Form Filling

**Input**: Design documents from `/specs/001-pdf-form-filling/`
**Prerequisites**: plan.md, spec.md
**Feature Branch**: `001-pdf-form-filling`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This project follows Express.js backend structure with:
- `server/` - Backend services, routes, models, utilities
- `normalization work/pdf_templates/` - PDF template files
- `migrations/` - Database migrations
- `tests/` - Playwright e2e tests, Jest integration/unit tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and PDF library research

### Research & Technology Selection

- [X] T001 Research PDF manipulation libraries (pdf-lib, pdf-fill-form, pdftk, hummus) - document findings in specs/001-pdf-form-filling/research.md
- [X] T002 Test chosen PDF library with actual CM-110.pdf template to validate field reading and writing capabilities
- [X] T003 Document field inspection results from CM-110.pdf (field names, types, positions) in specs/001-pdf-form-filling/research.md
- [X] T004 Research and select async job processing approach (Bull, pg-boss, or simple polling) - document decision in specs/001-pdf-form-filling/research.md
- [X] T005 Install chosen PDF library dependency via npm and update package.json

### Project Structure Setup

- [X] T006 [P] Create server/services/pdf-service.js file structure with class skeleton
- [X] T007 [P] Create server/routes/pdf-routes.js file with Express router skeleton
- [X] T008 [P] Create server/models/pdf-generation-job.js file with model class skeleton
- [X] T009 [P] Create server/utils/pdf-field-mapper.js file with mapper utility skeleton
- [X] T010 [P] Create server/utils/pdf-templates.js file with template management skeleton
- [X] T011 [P] Create tests/e2e/pdf-generation.spec.js Playwright test file skeleton
- [X] T012 [P] Create tests/integration/pdf-service.test.js Jest test file skeleton
- [X] T013 [P] Create tests/unit/pdf-field-mapper.test.js Jest test file skeleton

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [X] T014 Create migrations/001_add_pdf_generation_jobs.sql with table schema (id, form_submission_id, status, retry_count, error_message, dropbox_file_id, dropbox_file_path, generated_filename, created_at, updated_at, completed_at)
- [X] T015 Add indexes to pdf_generation_jobs table: idx_form_submission_id on form_submission_id, idx_status_created on (status, created_at)
- [X] T016 Run database migration locally to verify schema creation (deferred - local DB not running, will run when database available)

### Model Layer

- [X] T017 Implement PdfGenerationJob model in server/models/pdf-generation-job.js with CRUD methods (create, findById, findByFormSubmissionId, updateStatus, markCompleted, markFailed)
- [X] T018 Add model validation for status enum (pending, processing, retrying, completed, failed) and retry_count constraints (0-3)

### Field Mapping Configuration

- [ ] T019 Create field mapping configuration file server/config/cm110-field-mapping.json mapping form submission JSON fields to CM-110 PDF field names
- [ ] T020 Implement pdf-field-mapper.js utility with mapFormDataToPdfFields() function supporting text fields, checkboxes, address formatting, and date formatting
- [ ] T021 Implement field truncation logic in pdf-field-mapper.js to handle character limits per plan.md FR-011

### PDF Template Management

- [ ] T022 Implement pdf-templates.js utility with loadTemplate() function to read CM-110.pdf from normalization work/pdf_templates/
- [ ] T023 Implement getTemplateFields() function in pdf-templates.js to programmatically extract field names and types from CM-110.pdf
- [ ] T024 Add error handling for missing or corrupted PDF template files

### SSE Infrastructure

- [ ] T025 Create server/services/sse-service.js for managing SSE connections per form submission
- [ ] T026 Implement SSE event namespace for PDF generation (pdf:generation:started, pdf:generation:processing, pdf:generation:retrying, pdf:generation:completed, pdf:generation:failed)
- [ ] T027 Coordinate SSE service with existing Python pipeline SSE notifications to support unified event stream per plan.md FR-026

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Auto-Fill PDF with Form Data (Priority: P1) 🎯 MVP

**Goal**: Generate filled CM-110 PDF from form submission with all fields correctly populated, ready for court filing

**Independent Test**: Submit a complete form entry through existing system, verify filled PDF is generated with all fields correctly populated (plaintiff names, defendant names, address, discovery issues)

**Acceptance Criteria from spec.md**:
1. Form submission completes immediately, CM-110 PDF begins generating asynchronously in background
2. User notified when PDF is ready with all fields filled correctly
3. Multiple plaintiffs and defendants listed with correct numbering
4. Discovery issues (vermin, insects, HVAC, electrical) marked/filled in checkboxes and text fields
5. Address fields (street, city, county, postal code) correctly populated

### Core PDF Generation Service

- [ ] T028 [US1] Implement generatePdfFromFormData() method in server/services/pdf-service.js accepting formSubmissionId parameter
- [ ] T029 [US1] Implement loadFormSubmissionData() method in pdf-service.js to fetch form data from database by ID
- [ ] T030 [US1] Implement createPdfGenerationJob() method in pdf-service.js to create database record with status='pending'
- [ ] T031 [US1] Implement populatePdfFields() method in pdf-service.js using pdf-field-mapper to fill text fields and checkboxes
- [ ] T032 [US1] Implement generateUniqueFilename() method in pdf-service.js following pattern "CM110_[PlaintiffName]_[Timestamp].pdf" per plan.md FR-007
- [ ] T033 [US1] Implement savePdfToTemporaryStorage() method in pdf-service.js to write generated PDF to temp directory

### Plaintiff/Defendant Handling

- [ ] T034 [US1] Implement populatePlaintiffFields() method in pdf-service.js to handle 1-10 plaintiffs with proper numbering per spec.md FR-005
- [ ] T035 [US1] Implement populateDefendantFields() method in pdf-service.js to handle 1-10 defendants with proper numbering per spec.md FR-006
- [ ] T036 [US1] Implement detectOverflow() method in pdf-service.js to identify when plaintiffs/defendants exceed primary PDF capacity
- [ ] T037 [US1] Implement generateContinuationPage() method in pdf-service.js for overflow entries with cross-referencing per spec.md FR-006a

### Discovery Issues Mapping

- [ ] T038 [US1] Implement mapDiscoveryIssuesToCheckboxes() method in pdf-field-mapper.js for issue categories (vermin, insects, HVAC, electrical, fire hazards, plumbing) per spec.md FR-015
- [ ] T039 [US1] Implement mapDiscoveryIssuesToTextFields() method in pdf-field-mapper.js for free-form issue descriptions

### Address and Date Formatting

- [ ] T040 [US1] Implement formatAddressForPdf() method in pdf-field-mapper.js to split address into separate fields (street, city, county, postal code) per spec.md FR-016
- [ ] T041 [US1] Implement formatDateForPdf() method in pdf-field-mapper.js to match PDF date field requirements per spec.md FR-017

### Dropbox Integration

- [ ] T042 [US1] Implement uploadPdfToDropbox() method in pdf-service.js integrating with existing server/services/storage-service.js
- [ ] T043 [US1] Update pdf_generation_jobs record with dropbox_file_id and dropbox_file_path after successful upload per spec.md FR-012
- [ ] T044 [US1] Implement cleanup of temporary PDF files after successful Dropbox upload

### Job Status Management

- [ ] T045 [US1] Implement updateJobStatus() method in pdf-service.js to track status transitions (pending→processing→completed)
- [ ] T046 [US1] Add Winston logging for PDF generation lifecycle events (start, field mapping, upload, completion) per plan.md line 59

### SSE Notifications

- [ ] T047 [US1] Emit pdf:generation:started SSE event when job created per plan.md lines 283-288
- [ ] T048 [US1] Emit pdf:generation:processing SSE event during generation per plan.md lines 283-288
- [ ] T049 [US1] Emit pdf:generation:completed SSE event with dropboxFilePath when upload succeeds per plan.md lines 283-288

### API Endpoints

- [ ] T050 [US1] Implement POST /api/pdf/generate endpoint in server/routes/pdf-routes.js accepting formSubmissionId per plan.md lines 187-209
- [ ] T051 [US1] Add request validation for POST /api/pdf/generate (required formSubmissionId, optional regenerate flag)
- [ ] T052 [US1] Implement 400 response for invalid formSubmissionId per plan.md line 200-203
- [ ] T053 [US1] Implement 409 response for duplicate PDF generation attempts per plan.md lines 204-208
- [ ] T054 [US1] Trigger async PDF generation job from POST /api/pdf/generate without blocking response per spec.md FR-019

### Integration with Form Submission Flow

- [ ] T055 [US1] Identify form submission completion point in server.js (existing server file)
- [ ] T056 [US1] Add PDF generation trigger after form submission in server.js to run parallel with Python pipeline per plan.md lines 383-388
- [ ] T057 [US1] Ensure PDF generation failure does not block Python pipeline execution per spec.md FR-025

### Validation

- [ ] T058 [US1] Implement validateRequiredFields() method in pdf-service.js to check required PDF fields are populated per spec.md FR-009
- [ ] T059 [US1] Handle missing/null form data by leaving PDF fields blank without errors per spec.md FR-010
- [ ] T060 [US1] Add error logging for data mapping issues per spec.md FR-014

**Checkpoint**: At this point, User Story 1 should be fully functional - form submission triggers PDF generation, PDF is filled with all data, uploaded to Dropbox, user receives notification

---

## Phase 4: User Story 2 - Download Filled PDF (Priority: P2)

**Goal**: Enable users to download generated PDF documents with meaningful filenames

**Independent Test**: After PDF generation completes, trigger download and verify file is complete, readable, and contains expected form data with proper filename

**Acceptance Criteria from spec.md**:
1. User clicks download button, PDF downloads with meaningful filename (e.g., "CM110_PlaintiffLastName_CaseNumber_Date.pdf")
2. Downloaded PDF opens in PDF reader with all fields visible and properly formatted
3. Multiple downloads have unique, identifiable filenames

### API Endpoints

- [ ] T061 [US2] Implement GET /api/pdf/download/:jobId endpoint in server/routes/pdf-routes.js per plan.md lines 238-254
- [ ] T062 [US2] Fetch PDF file from Dropbox using dropbox_file_id from pdf_generation_jobs table
- [ ] T063 [US2] Set Content-Type header to application/pdf
- [ ] T064 [US2] Set Content-Disposition header with attachment and generated_filename from database
- [ ] T065 [US2] Stream PDF binary data in response body
- [ ] T066 [US2] Implement 404 response when job not found or PDF not yet complete per plan.md lines 246-249
- [ ] T067 [US2] Implement 500 response when Dropbox retrieval fails per plan.md lines 250-253

### Status Checking

- [ ] T068 [P] [US2] Implement GET /api/pdf/status/:jobId endpoint in server/routes/pdf-routes.js per plan.md lines 214-233
- [ ] T069 [US2] Return job status, retry count, error message, Dropbox file paths, and timestamps per plan.md lines 218-228
- [ ] T070 [US2] Implement 404 response when job not found per plan.md lines 229-232

### UI Integration (if frontend exists)

- [ ] T071 [US2] Add download button to notification UI that calls GET /api/pdf/download/:jobId
- [ ] T072 [US2] Add PDF status indicator showing generation progress (pending, processing, completed, failed)
- [ ] T073 [US2] Display generated_filename in UI so users know what they're downloading

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - PDF generation completes and users can download the filled PDF

---

## Phase 5: User Story 3 - Review PDF Before Download (Priority: P3)

**Goal**: Allow users to preview generated PDF in browser before downloading

**Independent Test**: Open generated PDF in browser preview pane, verify all fields visible and correctly positioned

**Acceptance Criteria from spec.md**:
1. User selects "preview", PDF opens in new browser tab or embedded viewer
2. User can close preview, edit form submission, and regenerate PDF with corrected data
3. User can download directly from preview interface

### Preview Endpoint

- [ ] T074 [US3] Implement GET /api/pdf/preview/:jobId endpoint in server/routes/pdf-routes.js
- [ ] T075 [US3] Set Content-Type to application/pdf without Content-Disposition (allows browser inline viewing)
- [ ] T076 [US3] Fetch and stream PDF from Dropbox for inline display
- [ ] T077 [US3] Add CORS headers to support cross-origin preview if needed

### UI Integration (if frontend exists)

- [ ] T078 [US3] Add preview button to notification UI that opens GET /api/pdf/preview/:jobId in new tab
- [ ] T079 [US3] Add embedded PDF viewer option using browser PDF viewer or library like PDF.js
- [ ] T080 [US3] Add download button within preview interface

### Regeneration Support

- [ ] T081 [US3] Update POST /api/pdf/generate to support regenerate=true flag for existing submissions per plan.md line 192
- [ ] T082 [US3] Implement logic to delete old PDF from Dropbox before regenerating per spec.md FR-018
- [ ] T083 [US3] Link preview UI to form edit interface for data correction workflow

**Checkpoint**: All core user stories now functional - generate, download, and preview PDFs

---

## Phase 6: User Story 4 - Handle Missing or Incomplete Data (Priority: P2)

**Goal**: Gracefully handle form submissions with missing or incomplete fields

**Independent Test**: Submit forms with various missing fields, verify PDFs generated with appropriate blank spaces and notification about missing data

**Acceptance Criteria from spec.md**:
1. Missing optional fields (e.g., middle name) left blank without errors
2. Missing discovery issues left unchecked/blank without errors
3. Missing critical required fields produce clear error message indicating which fields missing
4. Notification indicates which form fields were not populated due to missing source data
5. Transient errors trigger automatic retry with user notification
6. Failed generation after all retries provides manual retry option

### Missing Data Handling

- [ ] T084 [P] [US4] Implement handleMissingOptionalFields() method in pdf-service.js to skip optional fields gracefully per spec.md FR-010
- [ ] T085 [P] [US4] Implement validateRequiredFieldsPresent() method in pdf-service.js to check critical fields (plaintiff name, defendant name, address) before generation
- [ ] T086 [US4] Return clear error message listing missing required fields when validation fails
- [ ] T087 [US4] Generate completeness report listing which PDF fields were not populated due to missing source data

### Retry Logic

- [ ] T088 [US4] Implement retry logic with exponential backoff (3 attempts max) in pdf-service.js per spec.md FR-021
- [ ] T089 [US4] Update retry_count in pdf_generation_jobs table on each attempt
- [ ] T090 [US4] Implement exponential backoff delays (e.g., 1s, 2s, 4s) between retries
- [ ] T091 [US4] Emit pdf:generation:retrying SSE event on each retry attempt per spec.md FR-022

### Error Handling

- [ ] T092 [P] [US4] Implement comprehensive error handling for PDF library failures in pdf-service.js
- [ ] T093 [P] [US4] Implement error handling for Dropbox upload failures with local storage fallback per plan.md line 419
- [ ] T094 [P] [US4] Implement error handling for missing/corrupted PDF template file
- [ ] T095 [US4] Store error_message in pdf_generation_jobs table when job fails per plan.md lines 167-168
- [ ] T096 [US4] Emit pdf:generation:failed SSE event when all retries exhausted per spec.md FR-020

### Manual Retry Endpoint

- [ ] T097 [US4] Implement POST /api/pdf/retry/:jobId endpoint in server/routes/pdf-routes.js per plan.md lines 259-277
- [ ] T098 [US4] Validate job is in 'failed' status before allowing retry
- [ ] T099 [US4] Validate retry_count < 3 before allowing retry
- [ ] T100 [US4] Reset job to 'pending' status and trigger regeneration
- [ ] T101 [US4] Return 400 error if job not in failed status or max retries exceeded per plan.md lines 269-272

### Notification Enhancements

- [ ] T102 [US4] Add missing fields list to pdf:generation:completed event payload
- [ ] T103 [US4] Add retry_count and error_message to pdf:generation:failed event payload
- [ ] T104 [US4] Update UI to display retry button when generation fails per spec.md acceptance scenario 6

**Checkpoint**: All user stories complete and independently functional with robust error handling

---

## Phase 7: Testing & Validation

**Purpose**: Comprehensive testing across all user stories

### End-to-End Tests (Playwright)

- [ ] T105 [P] Write e2e test in tests/e2e/pdf-generation.spec.js for complete PDF generation flow (submit form → generate PDF → verify Dropbox upload → download PDF)
- [ ] T106 [P] Write e2e test for multiple plaintiffs/defendants with continuation pages
- [ ] T107 [P] Write e2e test for missing optional fields handling
- [ ] T108 [P] Write e2e test for retry logic after transient failure
- [ ] T109 [P] Write e2e test for preview functionality
- [ ] T110 [P] Write e2e test for parallel execution with Python pipeline (verify independent failures)

### Integration Tests (Jest)

- [ ] T111 [P] Write integration test in tests/integration/pdf-service.test.js for PDF library field reading
- [ ] T112 [P] Write integration test for PDF library field writing
- [ ] T113 [P] Write integration test for Dropbox upload with existing storage-service
- [ ] T114 [P] Write integration test for SSE event emission
- [ ] T115 [P] Write integration test for database operations on pdf_generation_jobs table

### Unit Tests (Jest)

- [ ] T116 [P] Write unit tests in tests/unit/pdf-field-mapper.test.js for mapFormDataToPdfFields() with various data types
- [ ] T117 [P] Write unit test for formatAddressForPdf() with standard addresses
- [ ] T118 [P] Write unit test for formatAddressForPdf() with edge cases (PO boxes, international)
- [ ] T119 [P] Write unit test for formatDateForPdf() with various date formats
- [ ] T120 [P] Write unit test for mapDiscoveryIssuesToCheckboxes() with all issue categories
- [ ] T121 [P] Write unit test for field truncation logic with character limits
- [ ] T122 [P] Write unit test for generateUniqueFilename() with various plaintiff names and timestamps

### Performance & Concurrency Tests

- [ ] T123 Write performance test to verify PDF generation completes in <5 seconds per spec.md SC-001
- [ ] T124 Write concurrency test to verify 10 simultaneous PDF generation requests per spec.md SC-006
- [ ] T125 Write test to verify 95% of form fields correctly populated per spec.md SC-002

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, monitoring, and production readiness

### Observability

- [ ] T126 [P] Add metrics collection for PDF generation time using prom-client (existing dependency)
- [ ] T127 [P] Add metrics for success rate, retry rate, and failure rate
- [ ] T128 [P] Update health check endpoint in server/routes/health-routes.js to include PDF generation queue status per plan.md line 61
- [ ] T129 Add Winston logging for sanitized form data in error logs per plan.md line 422

### Documentation

- [ ] T130 [P] Create user guide docs/pdf-generation-user-guide.md with download instructions and troubleshooting per plan.md line 55
- [ ] T131 [P] Create developer guide docs/pdf-generation-developer-guide.md with field mapping rules and adding new form templates per plan.md line 56
- [ ] T132 [P] Document API endpoints in docs/api-reference.md or OpenAPI spec per plan.md line 57
- [ ] T133 [P] Update deployment guide docs/deployment.md with PDF library dependency and database migration steps per plan.md line 403
- [ ] T134 Document hybrid architecture integration with Python pipeline in docs/architecture.md per plan.md line 404

### Code Quality

- [ ] T135 Run ESLint on all new PDF-related files
- [ ] T136 Add JSDoc comments to all public methods in pdf-service.js, pdf-field-mapper.js, pdf-templates.js
- [ ] T137 Review and refactor error handling patterns for consistency
- [ ] T138 Add input validation to all API endpoints

### Deployment Preparation

- [ ] T139 Test database migration 001_add_pdf_generation_jobs.sql in development environment
- [ ] T140 Test complete workflow in development with real CM-110.pdf template
- [ ] T141 Prepare staging deployment checklist with database migration steps
- [ ] T142 Create rollback plan for database migration if issues occur
- [ ] T143 Document environment variables needed for production (Dropbox credentials, database connection)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately with research
- **Foundational (Phase 2)**: Depends on T005 (PDF library installed) from Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on all of Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 core generation (T028-T049) - download needs completed PDFs
- **User Story 3 (Phase 5)**: Depends on User Story 2 download capability (T061-T070) - preview builds on download
- **User Story 4 (Phase 6)**: Can start after Foundational (Phase 2) - error handling is independent
- **Testing (Phase 7)**: Depends on all desired user stories being complete
- **Polish (Phase 8)**: Depends on all user stories and testing complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 core generation (needs PDFs to download)
- **User Story 3 (P3)**: Depends on US2 download logic (preview extends download)
- **User Story 4 (P2)**: Foundation only - can develop in parallel with US1/US2/US3

### Critical Path

1. **Phase 1: Setup (T001-T013)** - Research and structure
2. **Phase 2: Foundational (T014-T027)** - Database, models, utilities, SSE
3. **Phase 3: User Story 1 (T028-T060)** - Core PDF generation MVP
4. **Phase 4: User Story 2 (T061-T073)** - Download capability
5. **Phase 6: User Story 4 (T084-T104)** - Error handling (can overlap with US2)
6. **Phase 5: User Story 3 (T074-T083)** - Preview (optional enhancement)
7. **Phase 7: Testing (T105-T125)** - Validation
8. **Phase 8: Polish (T126-T143)** - Production readiness

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T006-T013 (file structure creation) can all run in parallel after research complete

**Within Foundational (Phase 2)**:
- T014-T016 (database) can run parallel with T019-T024 (utilities)
- T025-T027 (SSE infrastructure) can run parallel with T017-T018 (model layer)

**Within User Story 1 (Phase 3)**:
- T028-T033 (core service) → sequential
- T034-T037 (plaintiff/defendant) can run parallel with T038-T041 (mapping/formatting)
- T042-T046 (Dropbox and status) → sequential after T033
- T047-T049 (SSE) can run parallel with T050-T054 (API endpoints)

**Within User Story 2 (Phase 4)**:
- T061-T067 (download endpoint) and T068-T070 (status endpoint) can run in parallel

**Within User Story 4 (Phase 6)**:
- T084-T087 (missing data) can run parallel with T088-T091 (retry logic)
- T092-T096 (error handling) can run in parallel

**Testing Phase (Phase 7)**:
- All e2e tests (T105-T110) can run in parallel
- All integration tests (T111-T115) can run in parallel
- All unit tests (T116-T122) can run in parallel

**Polish Phase (Phase 8)**:
- T126-T129 (observability) can run parallel with T130-T134 (documentation)

---

## Parallel Example: User Story 1 Core Generation

```bash
# After Foundational phase complete, launch in parallel:

# Group 1: Core service setup (sequential)
Task T028: Implement generatePdfFromFormData()
Task T029: Implement loadFormSubmissionData()
Task T030: Implement createPdfGenerationJob()
Task T031: Implement populatePdfFields()
Task T032: Implement generateUniqueFilename()
Task T033: Implement savePdfToTemporaryStorage()

# Group 2: Plaintiff/defendant handling (parallel with Group 3)
Task T034: Implement populatePlaintiffFields()
Task T035: Implement populateDefendantFields()
Task T036: Implement detectOverflow()
Task T037: Implement generateContinuationPage()

# Group 3: Field mapping (parallel with Group 2)
Task T038: Implement mapDiscoveryIssuesToCheckboxes()
Task T039: Implement mapDiscoveryIssuesToTextFields()
Task T040: Implement formatAddressForPdf()
Task T041: Implement formatDateForPdf()

# Group 4: Integration (sequential after Groups 1-3)
Task T042: Implement uploadPdfToDropbox()
Task T043: Update database with Dropbox file info
Task T044: Cleanup temporary files

# Group 5: Status and SSE (parallel)
Task T045: Implement updateJobStatus()
Task T046: Add Winston logging
Task T047: Emit pdf:generation:started
Task T048: Emit pdf:generation:processing
Task T049: Emit pdf:generation:completed

# Group 6: API endpoints (parallel with Group 5)
Task T050: Implement POST /api/pdf/generate
Task T051: Add request validation
Task T052: Implement 400 response
Task T053: Implement 409 response
Task T054: Trigger async generation

# Group 7: Integration (sequential after Group 6)
Task T055: Identify form submission point in server.js
Task T056: Add PDF generation trigger
Task T057: Ensure independent failure handling
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Goal**: Get PDF generation working end-to-end with minimum features

1. **Phase 1: Setup** (T001-T013)
   - Research PDF library
   - Create file structure

2. **Phase 2: Foundational** (T014-T027)
   - Database schema
   - Models and utilities
   - SSE infrastructure

3. **Phase 3: User Story 1** (T028-T060)
   - Core PDF generation
   - Dropbox upload
   - SSE notifications
   - Form submission integration

4. **STOP and VALIDATE**:
   - Submit test form
   - Verify PDF generated in <5 seconds
   - Verify all fields populated correctly
   - Verify PDF uploaded to Dropbox
   - Verify SSE notifications received

5. **Deploy to staging** if validation successful

### Incremental Delivery

**After MVP (User Story 1)**:

1. **Add User Story 2** (T061-T073): Download capability
   - Test independently: Download PDF and open in reader
   - Deploy to staging

2. **Add User Story 4** (T084-T104): Error handling
   - Test independently: Submit incomplete form, verify graceful handling
   - Test retry logic with simulated failures
   - Deploy to staging

3. **Add User Story 3** (T074-T083): Preview capability
   - Test independently: Preview PDF in browser
   - Deploy to staging

4. **Testing Phase** (T105-T125): Comprehensive validation
   - Run all e2e, integration, unit tests
   - Performance and concurrency validation

5. **Polish** (T126-T143): Production readiness
   - Monitoring, documentation, deployment prep
   - Deploy to production

### Parallel Team Strategy

With 2-3 developers after Foundational phase:

**Developer A**: User Story 1 (T028-T060)
- Core generation flow
- Highest priority

**Developer B**: User Story 4 (T084-T104)
- Error handling and retry logic
- Can work independently

**Developer C**: User Story 2 (T061-T073) after Developer A completes T028-T049
- Download endpoints
- Depends on core generation

Then converge for testing and polish.

---

## Success Metrics Validation

Map each task to success criteria from spec.md:

- **SC-001** (< 5 seconds): T123 performance test validates
- **SC-002** (95% fields populated): T031, T125 validate
- **SC-003** (readable PDFs): T105-T107 e2e tests validate
- **SC-004** (1-10 plaintiffs/defendants): T034-T037, T106 validate
- **SC-005** (30% optional fields missing): T084-T087, T107 validate
- **SC-006** (10 concurrent requests): T124 concurrency test validates
- **SC-007** (90% discovery issues): T038-T039, T120 validate
- **SC-008** (meaningful filenames): T032, T122 validate

---

## Notes

- **[P]** tasks can run in parallel (different files, no dependencies)
- **[Story]** label maps task to specific user story for traceability
- Research phase (T001-T004) is critical - validates PDF library choice before implementation
- Foundational phase (T014-T027) blocks all user stories - prioritize completion
- User Story 1 is MVP - focus here for fastest time to value
- User Story 4 (error handling) can develop in parallel with US1/US2/US3
- Testing phase should not be skipped - validates all success criteria
- Commit frequently, after each task or logical group
- Each user story has checkpoint for independent validation

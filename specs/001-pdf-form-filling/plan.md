# Implementation Plan: PDF Form Filling

**Branch**: `001-pdf-form-filling` | **Date**: 2025-11-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pdf-form-filling/spec.md`

## Summary

Develop an automated PDF form filling system that populates the CM-110 California court form with data collected from web form submissions. The system will generate filled PDFs asynchronously, upload them to Dropbox following existing document workflow patterns, and provide real-time notifications to users about generation status. This reduces manual data entry time and eliminates transcription errors for legal professionals.

**Technical Approach**: Implement a Node.js service using a PDF manipulation library to read CM-110 template fields and map form submission JSON data to corresponding PDF fields. Generate PDFs asynchronously in parallel with the existing Python discovery document pipeline. PDF generation uses deterministic field mapping (fast, <5 seconds) while the Python pipeline uses template-based document generation with webhooks to Docmosis (slower, 2-5 minutes). Both processes run concurrently after form submission, providing independent progress notifications via SSE. Integrate with existing Dropbox upload service for final PDF storage.

## Technical Context

**Language/Version**: Node.js 18+ (matches existing server.js runtime)
**Primary Dependencies**:
- `pdf-lib` or `pdf-fill-form` for PDF field manipulation
- `express` (existing) for API endpoints
- Existing Dropbox SDK integration
- PostgreSQL (existing) for job tracking
**Storage**:
- PostgreSQL for PDF generation job metadata and status
- Dropbox for final PDF storage (via existing dropbox-service.js)
- Temporary local filesystem for PDF generation workspace
**Testing**: Playwright for end-to-end tests, Jest for unit tests
**Target Platform**: Google Cloud Run (existing deployment target)
**Project Type**: Web application backend (Express.js server)
**Performance Goals**:
- PDF generation under 5 seconds for typical form (FR-001 per Success Criteria SC-001)
- Support 10 concurrent PDF generation requests (SC-006)
**Constraints**:
- Must integrate with existing Dropbox upload workflow
- Cannot block form submission (async generation required)
- Must handle forms with 1-10 plaintiffs/defendants (SC-004)
- Court form must maintain legal formatting requirements
**Scale/Scope**:
- Single CM-110 form template initially
- Expected 10-50 PDFs generated per day
- Architecture must support future additional form types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [.specify/memory/constitution.md](../../.specify/memory/constitution.md) principles:

- [x] **Multi-Environment Safety**: Feature will be deployed to staging first for validation, then production with manual approval. PDF generation tested in development environment before staging promotion.
- [x] **Data Reliability**: PDF generation jobs tracked in PostgreSQL (`pdf_generation_jobs` table). Generated PDFs uploaded to Dropbox (tertiary storage). Job status and metadata stored for audit trail.
- [x] **Real-Time Feedback**: Users receive SSE notifications when PDF generation starts, during retry attempts, on completion, and on failure. Clear error messages with actionable guidance (e.g., "Retry PDF generation").
- [x] **Test Coverage**:
  - Playwright tests for end-to-end PDF generation workflow
  - API contract tests for PDF generation endpoints
  - Unit tests for field mapping logic
  - Integration tests for PDF library and Dropbox upload
- [x] **Documentation**:
  - User guide: How to download generated PDFs, troubleshooting failures
  - Developer guide: PDF field mapping rules, adding new form templates
  - API reference: PDF generation endpoints in OpenAPI spec
- [x] **Observability**:
  - Winston logging for PDF generation start/completion/failure
  - Metrics for generation time, success rate, retry count
  - Health check updated to include PDF generation queue status

**Complexity Justification**: None required - feature follows existing architecture patterns (async processing similar to Python pipeline integration, Dropbox upload reuses existing service).

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-form-filling/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── pdf-api.yaml     # OpenAPI spec for PDF generation endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── services/
│   └── pdf-service.js        # PDF generation logic, field mapping
├── routes/
│   └── pdf-routes.js         # API endpoints for PDF generation
├── models/
│   └── pdf-generation-job.js # Database model for tracking jobs
└── utils/
    ├── pdf-field-mapper.js   # Maps form JSON to PDF fields
    └── pdf-templates.js      # Template management utilities

normalization work/
└── pdf_templates/
    ├── cm110.pdf             # CM-110 template (existing)
    └── continuation.pdf      # Continuation page template (to be created)

tests/
├── e2e/
│   └── pdf-generation.spec.js  # Playwright end-to-end tests
├── integration/
│   └── pdf-service.test.js     # Integration tests with PDF library
└── unit/
    └── pdf-field-mapper.test.js # Unit tests for field mapping

migrations/
└── 001_add_pdf_generation_jobs.sql # Database migration for job tracking
```

**Structure Decision**: Follows existing Express.js backend structure. PDF service added to `server/services/` alongside existing dropbox-service.js and email-service.js. Routes follow existing pattern in `server/routes/`. Database migrations use existing PostgreSQL migration approach.

## Complexity Tracking

> No Constitution violations - table intentionally left empty.

## Phase 0: Research & Technology Selection

### Research Questions

1. **PDF Manipulation Library Selection**
   - **Question**: Which Node.js library best handles fillable PDF form manipulation?
   - **Options to evaluate**: pdf-lib, pdf-fill-form, pdftk (via child_process), hummus
   - **Criteria**: Can read PDF form fields, can write to fields, preserves formatting, handles checkboxes, active maintenance

2. **Field Mapping Strategy**
   - **Question**: How to map JSON field names to PDF form field names when they don't match exactly?
   - **Research**: Best practices for fuzzy matching, manual mapping configuration, field name conventions

3. **Continuation Page Generation**
   - **Question**: How to generate standardized continuation pages for overflow plaintiffs/defendants?
   - **Research**: Court standards for continuation pages, PDF page concatenation techniques

4. **Async Job Processing**
   - **Question**: Should we use a job queue library or simple database polling?
   - **Options**: Bull (Redis-based), pg-boss (PostgreSQL-based), simple polling
   - **Criteria**: Fits existing infrastructure (prefer PostgreSQL), retry logic support, monitoring capabilities

5. **PDF Template Field Inspection**
   - **Question**: How to programmatically extract field names and types from CM-110.pdf?
   - **Research**: PDF inspection tools, field metadata extraction

### Research Tasks

For each question above, research agents will:
- Evaluate options against criteria
- Document pros/cons
- Recommend solution with rationale
- Identify alternatives considered

**Output**: [research.md](research.md) with all decisions documented

## Phase 1: Design & Contracts

### Data Model

**Entity**: PDF Generation Job

**Table**: `pdf_generation_jobs`

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | SERIAL PRIMARY KEY | Unique job identifier | Auto-increment |
| form_submission_id | INTEGER | Foreign key to form_submissions | NOT NULL, FK |
| status | VARCHAR(20) | Job status | NOT NULL, CHECK (status IN ('pending', 'processing', 'retrying', 'completed', 'failed')) |
| retry_count | INTEGER | Number of retry attempts | DEFAULT 0, CHECK (retry_count >= 0 AND retry_count <= 3) |
| error_message | TEXT | Error details if failed | NULL |
| dropbox_file_id | VARCHAR(255) | Dropbox file reference | NULL (populated on success) |
| dropbox_file_path | TEXT | Dropbox file path | NULL (populated on success) |
| generated_filename | VARCHAR(255) | Generated PDF filename | NULL (populated on success) |
| created_at | TIMESTAMP | Job creation time | DEFAULT NOW() |
| updated_at | TIMESTAMP | Last update time | DEFAULT NOW() |
| completed_at | TIMESTAMP | Completion timestamp | NULL |

**Indexes**:
- `idx_form_submission_id` on `form_submission_id` for lookup by submission
- `idx_status_created` on `(status, created_at)` for job queue processing

**Relationships**:
- `form_submission_id` → `form_entries.id` (many-to-one, one job per submission)

### API Contracts

**Endpoint 1: Trigger PDF Generation**

```yaml
POST /api/pdf/generate
Description: Trigger asynchronous PDF generation for a form submission
Request Body:
  {
    "formSubmissionId": "integer (required) - ID of the form submission",
    "regenerate": "boolean (optional) - Force regeneration if PDF already exists"
  }
Response 200:
  {
    "jobId": "integer - PDF generation job ID",
    "status": "string - Initial job status (pending)",
    "message": "string - Human-readable status message"
  }
Response 400:
  {
    "error": "string - Error message (e.g., 'Form submission not found')"
  }
Response 409:
  {
    "error": "string - Conflict message (e.g., 'PDF already generated')",
    "existingJobId": "integer - ID of existing job"
  }
```

**Endpoint 2: Check PDF Generation Status**

```yaml
GET /api/pdf/status/:jobId
Description: Check status of PDF generation job
Parameters:
  jobId: integer (path parameter) - PDF generation job ID
Response 200:
  {
    "jobId": "integer",
    "status": "string - (pending|processing|retrying|completed|failed)",
    "retryCount": "integer - Number of retry attempts",
    "errorMessage": "string|null - Error details if failed",
    "dropboxFileId": "string|null - Dropbox file ID if completed",
    "dropboxFilePath": "string|null - Dropbox file path if completed",
    "createdAt": "string (ISO 8601) - Job creation time",
    "completedAt": "string|null (ISO 8601) - Completion time"
  }
Response 404:
  {
    "error": "string - 'PDF generation job not found'"
  }
```

**Endpoint 3: Download Generated PDF**

```yaml
GET /api/pdf/download/:jobId
Description: Download generated PDF file
Parameters:
  jobId: integer (path parameter) - PDF generation job ID
Response 200:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="CM110_[PlaintiffName]_[Timestamp].pdf"
  Body: PDF file binary data
Response 404:
  {
    "error": "string - 'PDF not found' or 'PDF generation not yet complete'"
  }
Response 500:
  {
    "error": "string - 'Failed to retrieve PDF from Dropbox'"
  }
```

**Endpoint 4: Retry Failed PDF Generation**

```yaml
POST /api/pdf/retry/:jobId
Description: Manually trigger retry for failed PDF generation
Parameters:
  jobId: integer (path parameter) - PDF generation job ID
Response 200:
  {
    "jobId": "integer",
    "status": "string - Updated status (pending)",
    "message": "string - 'PDF generation retry initiated'"
  }
Response 400:
  {
    "error": "string - 'Job is not in failed status' or 'Maximum retries exceeded'"
  }
Response 404:
  {
    "error": "string - 'PDF generation job not found'"
  }
```

### SSE Event Stream

**Endpoint**: `GET /api/pdf/events/:formSubmissionId`

**Events**:
- `pdf:generation:started` - PDF generation job created
- `pdf:generation:processing` - PDF generation in progress
- `pdf:generation:retrying` - Retry attempt initiated
- `pdf:generation:completed` - PDF successfully generated and uploaded
- `pdf:generation:failed` - PDF generation failed after all retries

**Event Payload**:
```json
{
  "jobId": "integer",
  "status": "string",
  "retryCount": "integer",
  "errorMessage": "string|null",
  "dropboxFilePath": "string|null"
}
```

### Quick Start Guide

**For Developers**:

1. **Install dependencies** (PDF library will be chosen in research phase):
   ```bash
   npm install
   ```

2. **Run database migration**:
   ```bash
   psql -h localhost -U postgres -d legal_forms_db -f migrations/001_add_pdf_generation_jobs.sql
   ```

3. **Add CM-110 template to templates directory**:
   ```bash
   cp cm110.pdf "normalization work/pdf_templates/cm110.pdf"
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Test PDF generation**:
   ```bash
   curl -X POST http://localhost:3000/api/pdf/generate \
     -H "Content-Type: application/json" \
     -d '{"formSubmissionId": 1}'
   ```

6. **Run tests**:
   ```bash
   npm test  # Playwright e2e tests
   npm run test:unit  # Jest unit tests
   ```

**For Users**:

1. **Submit a form** through the web interface
2. **Wait for notification** - You'll receive an SSE notification when PDF is ready (typically under 5 seconds)
3. **Download PDF** - Click download button in notification or access from form submission history
4. **If generation fails** - Click "Retry" button in error notification

## Phase 2: Implementation Tasks

*Note: Detailed task breakdown will be generated by `/speckit.tasks` command*

**High-level task categories**:

1. **Database & Models** (Foundation)
   - Create database migration for pdf_generation_jobs table
   - Implement PdfGenerationJob model class
   - Add database indexes for performance

2. **PDF Library Integration** (Core)
   - Install chosen PDF library from research phase
   - Implement PDF field inspection utility
   - Create field mapping configuration file
   - Implement PDF field population logic
   - Handle checkbox vs text field types

3. **Service Layer** (Business Logic)
   - Implement PdfService class with generation logic
   - Implement field mapping from JSON to PDF
   - Handle overflow plaintiffs/defendants with continuation pages
   - Integrate with existing Dropbox service
   - Implement retry logic with exponential backoff

4. **API Endpoints** (Interface)
   - Create PDF routes file
   - Implement POST /api/pdf/generate
   - Implement GET /api/pdf/status/:jobId
   - Implement GET /api/pdf/download/:jobId
   - Implement POST /api/pdf/retry/:jobId
   - Add SSE endpoint for real-time updates

5. **Background Processing** (Async)
   - Implement job queue processing (polling or library-based)
   - Handle concurrent job processing
   - Implement cleanup for old completed jobs

6. **Hybrid Pipeline Integration** (Architecture)
   - Integrate PDF generation trigger into existing form submission flow (server.js)
   - Implement parallel execution of PDF generation and Python discovery pipeline
   - Coordinate SSE notifications from both processes through unified event stream
   - Ensure independent failure handling (PDF can fail without affecting discovery docs)
   - Update UI to display both PDF and discovery document progress/status

7. **Testing** (Quality)
   - Write Playwright tests for end-to-end PDF generation flow
   - Write integration tests for PDF library usage
   - Write unit tests for field mapping logic
   - Test error scenarios and retry logic
   - Test continuation page generation
   - Test parallel execution with Python pipeline
   - Test coordinated SSE notifications

8. **Documentation** (Knowledge Transfer)
   - Update API documentation with PDF endpoints
   - Document field mapping rules
   - Create troubleshooting guide for common issues
   - Update deployment guide with new dependencies
   - Document hybrid architecture integration with Python pipeline

9. **Deployment** (Operations)
   - Test in development environment
   - Deploy to staging with database migration
   - Validate in staging with real form submissions
   - Test parallel pipeline execution in staging
   - Deploy to production with monitoring

## Risk Mitigation

| Risk | Impact | Mitigation Strategy |
|------|---------|---------------------|
| PDF library doesn't support CM-110 form fields | High | Research phase will validate library with actual CM-110.pdf file before committing to implementation |
| Field mapping complexity exceeds estimates | Medium | Start with manual mapping file; automate later. Manual mapping provides explicit control and easy debugging |
| Dropbox upload failures block workflow | Medium | Implement retry logic with exponential backoff. Store PDFs temporarily in local storage as fallback |
| Continuation pages don't meet court standards | High | Research court continuation page requirements early. Validate with legal staff before production |
| Performance degrades with concurrent requests | Low | Implement job queue with concurrency limits. Monitor performance in staging |
| PDF generation errors difficult to debug | Medium | Implement comprehensive logging at each step (field inspection, mapping, population, upload). Include sample form data in error logs (sanitized) |
| SSE notification coordination fails between PDF and Python pipeline | Medium | Implement message deduplication and timestamp ordering. Each process emits events independently with clear namespacing (pdf:* vs pipeline:*). Test notification ordering extensively in staging |
| Parallel execution causes race conditions in UI state | Low | Design UI state management to handle out-of-order notifications. Each process (PDF, discovery) maintains independent progress state |

## Success Metrics

**From specification (Success Criteria)**:
- SC-001: PDF generation completes in under 5 seconds (P95 latency target)
- SC-002: 95% of form fields correctly populated (accuracy target)
- SC-003: PDFs readable in standard viewers without formatting issues
- SC-004: Successfully handles 1-10 plaintiffs/defendants without errors
- SC-005: Generation succeeds with 30% of optional fields missing
- SC-006: System processes 10 concurrent requests without degradation
- SC-007: 90% of discovery issues correctly mapped to PDF fields
- SC-008: Generated PDFs have meaningful, unique filenames

**Monitoring Metrics** (to be tracked in production):
- PDF generation success rate (target: >98%)
- Average generation time (target: <3 seconds)
- Retry rate (target: <5% of jobs require retry)
- Dropbox upload success rate (target: >99%)
- User-initiated regeneration rate (indicates UX issues if high)

## Next Steps

1. **Run `/speckit.tasks`** to generate detailed implementation tasks with dependencies
2. **Execute Phase 0**: Research PDF libraries and validate with CM-110.pdf
3. **Execute Phase 1**: Implement data model and API contracts
4. **Implement in phases**: Database → Core service → API → Testing
5. **Deploy to staging**: Validate with real form submissions
6. **Deploy to production**: Monitor metrics and user feedback

---

**Plan Status**: Ready for task generation (`/speckit.tasks`)
**Research Phase**: Ready to begin after plan approval
**Estimated Implementation Time**: 2-3 weeks (1 week research + design, 1-2 weeks implementation + testing)

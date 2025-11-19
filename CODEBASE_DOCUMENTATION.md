# Lipton Legal Forms Application - Complete Codebase Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Core Files](#core-files)
- [API Routes](#api-routes)
- [Services](#services)
- [Middleware](#middleware)
- [Client-Side JavaScript](#client-side-javascript)
- [Database](#database)
- [Configuration](#configuration)
- [Testing](#testing)
- [Scripts](#scripts)
- [Data Flow Architecture](#data-flow-architecture)
- [Key Features](#key-features)

---

## Project Overview

**Lipton Legal Forms Application** is a full-stack legal forms management system designed for attorneys to handle tenant habitability complaints and legal case documentation. The application features client intake forms, automated document generation, case management, and cloud integration.

**Current Branch:** `feature/load-from-intake-modal`
**Repository:** Git-based with CI/CD integration
**Platform:** Google Cloud Run (containerized deployment)

### Primary Use Cases
1. **Client Intake** - Multi-page form for collecting detailed habitability complaint information
2. **Document Generation** - Automated creation of legal documents (CM-110, etc.) from structured data
3. **Case Management** - Track submissions, link intakes to cases, manage attorney assignments
4. **Cloud Integration** - Automatic backup to Dropbox, email notifications, cloud storage

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+ with JSONB support
- **Job Queue:** pg-boss for background processing
- **Authentication:** Token-based (Bearer tokens or query parameters)
- **Logging:** Winston with daily rotating file transport
- **Monitoring:** Prometheus metrics + custom health checks
- **Email:** SendGrid API
- **Cloud Storage:** Google Cloud Storage
- **File Sync:** Dropbox API (OAuth refresh tokens)

### Frontend
- **Primary UI:** Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **Real-time Updates:** Server-Sent Events (SSE)
- **Secondary Intake App:** Vue.js-based application in `/client-intake`
- **Testing:** Playwright for E2E, Jest for unit tests

### Infrastructure
- **Container:** Docker multi-stage builds
- **Platform:** Google Cloud Run
- **CI/CD:** Google Cloud Build with GitHub integration
- **Database:** Cloud SQL (PostgreSQL)
- **Secrets:** Google Secret Manager

---

## Directory Structure

```
/Users/ryanhaines/Desktop/Lipton Webserver/
├── Root Files (Core Application)
├── /api (API modules - legacy)
├── /routes (Express route handlers)
├── /services (Business logic layer)
├── /middleware (Express middleware)
├── /config (Configuration management)
├── /monitoring (Observability utilities)
├── /js (Client-side JavaScript)
├── /client-intake (Vue.js intake app)
├── /database (Schema and taxonomy)
├── /migrations (Versioned DB migrations)
├── /tests (Automated test suites)
├── /scripts (Deployment and utilities)
├── /docs (VitePress documentation)
└── /data (Runtime data storage)
```

---

## Core Files

### Root Directory

#### `server.js` (1000+ lines, 30KB)
**Purpose:** Main Express application entry point

**Key Responsibilities:**
- Initialize Express server and middleware stack
- Configure routes for API endpoints
- Handle form submissions and data transformation
- Manage PostgreSQL connection pool
- Integrate with Python normalization pipeline
- Implement two-stage data transformation:
  1. Raw HTML form → PascalCase normalized JSON
  2. Normalized JSON → Human-readable format (revert keys/values)

**Important Functions:**
- `setupMiddleware()` - Configure Express middleware
- `initializeDatabase()` - Set up PostgreSQL connection
- `transformFormData()` - Convert form data through transformation pipeline
- `submitToPipeline()` - Queue document for Python processing

**Integration Points:**
- Routes: `/routes/*.js`
- Services: `/services/form-transformer.js`, `/services/pipeline-service.js`
- Database: PostgreSQL via `pg` library

---

#### `index.html` (366KB, heavily annotated)
**Purpose:** Main application interface

**Features:**
- **Three-Tab Interface:**
  1. Document Generation Form (primary use case)
  2. Habitability Intake Form (client data collection)
  3. View Submissions (case tracking)

**Document Generation Form:**
- Dynamic plaintiff/defendant management with unique IDs
- Comprehensive issue tracking across 5 categories:
  - Building issues (structural, electrical, plumbing, HVAC)
  - Health hazards (mold, lead paint, asbestos)
  - Safety concerns (broken locks, fire hazards)
  - Utility problems (heat, water, electricity)
  - Pest infestations (rodents, cockroaches, bedbugs)
- Real-time "At a Glance" case summary
- Aria-synced accordion controls for accessibility
- Professional styling (Lipton Legal brand colors: navy #1F2A44, teal #00AEEF)

**Habitability Intake Form:**
- 5-page wizard with 25+ sections
- Client information, property details, building conditions
- Issue documentation with photo upload capability
- Save-and-resume functionality

---

#### `review.html` (29KB)
**Purpose:** Review/confirmation page before final submission

**Features:**
- Display structured data for user verification
- Allow editing before final commit
- Show calculated case summary
- Confirm submission or return to form

---

#### `success.html` (18KB)
**Purpose:** Confirmation page after successful submission

**Features:**
- Display case ID and reference number
- Show next steps and expected timeline
- Link to document generation status tracking
- Return to main application

---

#### Configuration Files

##### `package.json` (2KB)
**Purpose:** Node.js project manifest

**Key Dependencies:**
- `express` (^4.18.0) - Web framework
- `pg` (^8.11.0) - PostgreSQL client
- `dropbox` (^10.34.0) - Dropbox SDK
- `pdf-lib` (^1.17.1) - PDF manipulation
- `@sendgrid/mail` (^7.7.0) - Email service
- `prom-client` (^14.2.0) - Prometheus metrics
- `winston` (^3.8.0) - Logging
- `dotenv` (^16.0.0) - Environment variables

**Scripts:**
- `start` - Production server
- `dev` - Development with nodemon
- `test` - Run Jest unit tests
- `test:e2e` - Run Playwright E2E tests
- `build` - Build production assets

---

##### `.env` (2KB, SENSITIVE - Not committed)
**Purpose:** Runtime environment variables

**Critical Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `DROPBOX_ACCESS_TOKEN` / `DROPBOX_REFRESH_TOKEN` - Dropbox OAuth
- `SENDGRID_API_KEY` - Email service API key
- `AUTH_TOKEN` - Application authentication token
- `PIPELINE_API_URL` - Python normalization service endpoint
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket

---

##### `.env.example` (2KB)
**Purpose:** Template for required environment variables

**Documentation:**
- Lists all required variables with descriptions
- No sensitive values (safe to commit)
- Categorized: Database, Auth, Email, Cloud, Pipeline

---

##### `Dockerfile` (1KB)
**Purpose:** Container build definition for Cloud Run

**Build Strategy:**
- Multi-stage build for optimized image size
- Node.js 18 Alpine base
- System dependencies: ca-certificates, postgresql-client
- Production dependencies only
- Non-root user for security

---

##### `cloudbuild-dev.yaml` (1.6KB)
**Purpose:** Google Cloud Build CI/CD configuration

**Build Steps:**
1. Docker image build
2. Push to Container Registry
3. Deploy to Cloud Run
4. Run database migrations
5. Verify deployment health

---

##### `jest.config.js` (1KB)
**Purpose:** Jest test framework configuration

**Settings:**
- Test environment: Node.js
- Test match patterns: `**/*.test.js`, `**/*.spec.js`
- Coverage thresholds: 80% statements, 75% branches
- Setup files: `tests/setup.js`

---

##### `playwright.config.js` (1.8KB)
**Purpose:** Playwright E2E test configuration

**Settings:**
- Browsers: Chromium, Firefox, WebKit
- Base URL: `http://localhost:3000`
- Timeout: 30 seconds per test
- Retries: 2 on CI, 0 locally
- Screenshot on failure

---

##### `build.js` (8.8KB)
**Purpose:** Production build script

**Tasks:**
- Minify CSS and JavaScript
- Generate optimized bundles
- Copy static assets
- Create source maps
- Output to `/dist` directory

---

##### `Makefile` (4.7KB)
**Purpose:** Common development tasks

**Targets:**
- `make build` - Build production assets
- `make test` - Run all tests
- `make deploy` - Deploy to Cloud Run
- `make db-init` - Initialize database
- `make db-migrate` - Run migrations
- `make db-seed` - Seed reference data
- `make clean` - Clean build artifacts

---

## API Routes

### `/routes` Directory
Express route handlers organized by domain

---

#### `forms.js` (300+ lines)
**Purpose:** Form submission and retrieval endpoints

**Endpoints:**

**POST /api/form-entries**
- Create new form submission
- Validates required fields (case number, plaintiffs, issues)
- Transforms raw form data to structured JSON
- Stores in Cloud Storage and PostgreSQL
- Triggers Python normalization pipeline (async)
- Sends email notifications
- Returns case ID and submission reference

**GET /api/form-entries/:id**
- Retrieve specific submission by ID
- Requires authentication
- Returns complete form data with metadata

**GET /api/form-entries**
- List all submissions with pagination
- Supports filtering by date range, status, attorney
- Default limit: 20 per page
- Returns array of submission summaries

**DELETE /api/form-entries/:id**
- Delete submission (soft delete with audit)
- Admin only
- Removes from database but preserves in Cloud Storage

---

#### `intakes-jsonb.js` (300+ lines)
**Purpose:** Client intake form submission and search

**Endpoints:**

**POST /api/intakes**
- Submit client intake form
- Generates unique intake number (format: `INT-YYYYMMDD-NNNN`)
- Validates required fields:
  - Personal info (name, contact)
  - Property address
  - At least one issue category
- Stores in `intake_submissions` table with JSONB page data
- Handles 5 pages of intake data
- **Public endpoint** (no authentication required for submission)

**GET /api/intakes**
- Search and list intakes with advanced filtering
- **Requires authentication**
- Query parameters:
  - `search` - Free text search (name, email, address)
  - `status` - Filter by review status (pending, reviewed, assigned)
  - `urgency` - Filter by urgency level (low, medium, high, critical)
  - `startDate`, `endDate` - Date range filter
  - `limit`, `offset` - Pagination
- Returns array of intake summaries with metadata

**GET /api/intakes/:id**
- Retrieve complete intake data by ID
- Requires authentication
- Includes all 5 pages of data
- Returns intake metadata and JSONB page content

---

#### `intakes.js` (Legacy)
**Purpose:** Alternative intake route handler (deprecated)

**Status:** Legacy file, replaced by `intakes-jsonb.js`

---

#### `intakes-expanded.js`
**Purpose:** Extended intake route with multi-page support

**Note:** Possible work-in-progress for enhanced pagination

---

#### `health.js` (100+ lines)
**Purpose:** Health check endpoints for Kubernetes probes

**Endpoints:**

**GET /health/live**
- Liveness probe (is the app running?)
- Always returns 200 if server is responsive
- No external dependency checks

**GET /health/ready**
- Readiness probe (is the app ready to serve traffic?)
- Checks:
  - Database connectivity
  - Memory utilization < 90%
  - Event loop lag < 500ms
- Returns 200 if ready, 503 if not

**GET /health/detailed**
- Detailed health status for debugging
- Checks all external dependencies:
  - PostgreSQL connection
  - Pipeline API availability
  - Dropbox API status
  - SendGrid API status
  - Memory/CPU metrics
- Returns JSON with component status

---

#### `pipeline.js` (100+ lines)
**Purpose:** Python normalization pipeline integration

**Endpoints:**

**POST /api/pipeline/submit**
- Submit case for document normalization
- Validates case data structure
- Queues job in Python service
- Returns job ID for tracking

**GET /api/pipeline/status/:caseId**
- Get current pipeline job status
- Returns cached status from in-memory store
- Status values: queued, processing, complete, error

**GET /api/jobs/:jobId/stream**
- Server-Sent Events (SSE) endpoint for real-time progress
- Streams job progress updates
- Auto-closes on completion or error
- 15-minute timeout for stale connections

---

#### `metrics.js` (50+ lines)
**Purpose:** Prometheus metrics exposition

**Endpoint:**

**GET /metrics**
- Expose Prometheus-compatible metrics
- Metrics tracked:
  - HTTP request counts by endpoint and status
  - Request latencies (histogram)
  - Database connection pool stats
  - Pipeline job status distribution
  - Error rates
  - Memory/CPU utilization
- Format: Prometheus text format

---

## Services

### `/services` Directory
Business logic and data handling layer

---

#### `form-transformer.js` (400+ lines)
**Purpose:** Transform raw HTML form data to structured JSON

**Key Functions:**

**`transformFormData(rawData)`**
- Main transformation entry point
- Converts raw form data through multiple stages
- Returns normalized JSON structure

**`extractPlaintiffs(rawData)`**
- Extracts plaintiff data with unique IDs
- Handles dynamic plaintiff sections
- Returns array of plaintiff objects

**`extractDefendants(rawData)`**
- Extracts defendant data
- Processes multiple defendant sections
- Returns array of defendant objects

**`processIssues(rawData)`**
- Categorizes issues into 5 types:
  - Building (structural, electrical, plumbing, HVAC)
  - Health (mold, lead, asbestos)
  - Safety (locks, fire hazards)
  - Utility (heat, water, electricity)
  - Pest (rodents, cockroaches, bedbugs)
- Consolidates checkbox values to canonical formats
- Handles checkbox array deduplication

**`revertNormalization(normalizedData)`**
- Converts PascalCase keys back to human-readable format
- Maps canonical values to original form labels
- Preserves data integrity while improving readability

**Transformation Pipeline:**
```
Raw Form Data
  ↓
Extract Plaintiffs/Defendants
  ↓
Process Issues by Category
  ↓
Normalize Keys (camelCase → PascalCase)
  ↓
Consolidate Duplicate Values
  ↓
Revert to Human-Readable Format
  ↓
Structured JSON Output
```

---

#### `intake-service.js` (300+ lines)
**Purpose:** Business logic for client intake operations

**Key Functions:**

**`createIntake(intakeData)`**
- Create new intake with transactional integrity
- Generates unique intake number
- Validates required fields
- Stores in PostgreSQL with JSONB page data
- Returns intake ID and reference number

**`getIntakeById(intakeId)`**
- Retrieve complete intake with all pages
- Joins intake_submissions with page tables
- Returns denormalized intake object

**`searchIntakes(filters, pagination)`**
- Advanced search with multiple criteria
- Supports full-text search on name, email, address
- Filters: status, urgency, date range
- Pagination: limit/offset
- Returns array of intake summaries

**`updateIntakeStatus(intakeId, status)`**
- Update review status
- Valid statuses: pending, reviewed, assigned, closed
- Logs status change in audit table

**`assignToAttorney(intakeId, attorneyId)`**
- Assign intake to attorney
- Creates assignment record
- Sends email notification
- Updates intake status to 'assigned'

---

#### `pipeline-service.js` (300+ lines)
**Purpose:** Python normalization pipeline integration

**Key Functions:**

**`submitForNormalization(caseData)`**
- Queue document for Python processing
- Makes HTTP POST to Python API
- Stores job ID for tracking
- Returns job ID

**`getPipelineStatus(jobId)`**
- Get cached job status
- Returns status from in-memory cache
- Cache TTL: 15 minutes

**`setPipelineStatus(jobId, status)`**
- Update job status in cache
- Used by webhook callbacks from Python service

**`callNormalizationAPI(payload)`**
- HTTP request to Python service
- Includes authentication token
- Timeout: 60 seconds
- Retry logic: 3 attempts with exponential backoff

**`streamJobProgress(jobId, res)`**
- Server-Sent Events stream for job progress
- Pushes updates to client in real-time
- Auto-closes on completion or timeout

**In-Memory Cache:**
- Key: job ID
- Value: { status, phase, progress, message, timestamp }
- TTL: 15 minutes
- Used for SSE streaming

---

#### `database-service.js` (200+ lines)
**Purpose:** PostgreSQL database connection management

**Key Functions:**

**`getPool()`**
- Get connection pool instance
- Singleton pattern
- Configuration from environment variables

**`query(sql, params)`**
- Execute parameterized query
- Automatic parameter escaping
- Returns query result

**`transaction(callback)`**
- Execute multiple queries in transaction
- Automatic rollback on error
- Commit on success

**`checkConnection()`**
- Health check for database
- Returns true if connected, false otherwise
- Used by readiness probe

**Connection Pool Settings:**
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds
- Statement timeout: 60 seconds

---

#### `database.js` (100+ lines)
**Purpose:** Alternative database module (possible legacy wrapper)

**Note:** May be deprecated in favor of `database-service.js`

---

#### `storage-service.js` (200+ lines)
**Purpose:** Google Cloud Storage integration

**Key Functions:**

**`uploadFile(localPath, remotePath)`**
- Upload file to GCS bucket
- Creates remote path if needed
- Returns public URL

**`downloadFile(remotePath, localPath)`**
- Download file from GCS
- Saves to local filesystem
- Returns local path

**`deleteFile(remotePath)`**
- Delete file from GCS
- Returns success/failure status

**`listFiles(prefix)`**
- List files in bucket with prefix
- Returns array of file metadata
- Supports pagination

**Bucket Configuration:**
- Bucket name from environment
- Public read access for generated documents
- Lifecycle policy: delete after 90 days

---

## Middleware

### `/middleware` Directory
Express middleware for cross-cutting concerns

---

#### `auth.js` (100+ lines)
**Purpose:** Token-based authentication middleware

**Authentication Methods:**
1. URL query parameter: `?token=xxx`
2. Authorization header: `Bearer xxx`

**Bypass Rules:**
- Development mode (NODE_ENV != production)
- Health check endpoints (`/health/*`)
- Metrics endpoint (`/metrics`)
- Static assets (`.js`, `.css`, images, fonts)
- **Public intake submission** (`POST /api/intakes`)

**Behavior:**
- Validates token against `AUTH_TOKEN` environment variable
- Returns 401 Unauthorized if token invalid
- Logs all access attempts (IP, endpoint, token validity)
- Attaches authenticated user info to `req.user`

---

#### `error-handler.js` (150+ lines)
**Purpose:** Global error handling middleware

**Features:**

**`asyncHandler(fn)` Wrapper:**
- Wraps async route handlers
- Catches promise rejections
- Forwards errors to error middleware

**`AppError` Class:**
- Custom error class with status code
- Supports error categorization (validation, authorization, system)
- Includes error code for client handling

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid case number format",
    "details": {...},
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

**HTTP Status Code Mapping:**
- 400: Validation errors
- 401: Authentication errors
- 403: Authorization errors
- 404: Resource not found
- 500: System errors

---

#### `validation.js` (100+ lines)
**Purpose:** Request validation middleware

**Validation Functions:**

**`validateFormSubmission(req, res, next)`**
- Validates document generation form data
- Required fields: case number, plaintiffs, issues
- Checks data types and formats
- Returns 400 with field-level errors

**`validateIntakeSubmission(req, res, next)`**
- Validates intake form data
- Required fields: personal info, property address, issues
- Validates email format, phone format
- Checks page data structure

**`validatePagination(req, res, next)`**
- Validates pagination parameters
- Default limit: 20
- Max limit: 100
- Offset must be non-negative

---

## Client-Side JavaScript

### `/js` Directory
Browser-based vanilla JavaScript modules

---

#### `form-submission.js` (400+ lines)
**Purpose:** Handle document generation form submission workflow

**Key Functions:**

**`submitForm()`**
- Main submission entry point
- Validates all required fields
- Shows review screen
- Prevents double submission

**`showReviewScreen(formData)`**
- Display confirmation modal with form summary
- Shows plaintiffs, defendants, issues
- Allows user to edit or confirm

**`confirmSubmission()`**
- Process confirmed submission
- Makes HTTP POST to `/api/form-entries`
- Includes authentication token from URL params
- Timeout: 30 seconds

**`handleSubmissionSuccess(response)`**
- Handle successful API response
- Display success notification with case ID
- Start background document generation (non-blocking)
- Reset form to clean state

**`resetFormAfterSubmission()`**
- Clear all form fields
- Reset plaintiffs/defendants to initial state
- Close modals and notifications
- Enable form for new submission

**Features:**
- Async/await for non-blocking operations
- Exponential backoff retry logic (3 attempts)
- Request timeout handling
- Real-time validation feedback
- Progress indicators during submission

---

#### `intake-modal.js` (500+ lines, updated 2025-11-18)
**Purpose:** Intake search modal for loading existing client data

**Key Functions:**

**`initIntakeModal(authToken)`**
- Initialize modal with authentication
- Store token for API requests
- Set up event listeners

**`openIntakeModal()`**
- Display modal overlay
- Load initial intakes list
- Disable body scrolling

**`closeIntakeModal()`**
- Hide modal
- Clear search filters
- Restore body scrolling

**`searchIntakes(filters)`**
- Query backend with filters
- Filters: name, email, status, date range
- Makes GET request to `/api/intakes`
- Updates modal with results

**`selectIntake(intakeId)`**
- Load selected intake data
- Transform intake format to document form format
- Auto-populate form fields
- Close modal

**`transformIntakeToFormData(intake)`**
- Convert intake submission format → document generation format
- Field mappings:
  - `intake.personal_info` → form personal info section
  - `intake.property_address` → plaintiff address
  - `intake.building_issues` → discovery checkboxes
  - `intake.pest_problems` → pest issue checkboxes
- Handles missing/optional fields gracefully

**Features:**
- Search by name, email, address (full-text)
- Filter by status (pending, reviewed, assigned)
- Date range picker
- Pagination (20 per page)
- Real-time search (debounced)
- Authentication token in request headers

**UI Components:**
- Modal overlay with backdrop click to close
- Search input with filters
- Results table with sortable columns
- Pagination controls
- Loading indicators

---

#### `sse-client.js` (300+ lines)
**Purpose:** Server-Sent Events client for real-time progress tracking

**`JobProgressStream` Class:**

**Constructor:**
- `new JobProgressStream(jobId, options)`
- Options: onProgress, onComplete, onError, onReconnect

**Methods:**

**`connect()`**
- Establish SSE connection to `/api/jobs/:jobId/stream`
- Includes authentication token in URL
- Set up event listeners

**`handleMessage(event)`**
- Parse SSE message data
- Update progress state
- Call onProgress callback

**`handleComplete(event)`**
- Handle job completion
- Close SSE connection
- Call onComplete callback

**`handleError(event)`**
- Handle connection or job errors
- Attempt reconnection with exponential backoff
- Call onError callback

**`disconnect()`**
- Close SSE connection
- Clear reconnection timers
- Mark as completed

**Features:**
- Automatic reconnection with exponential backoff (max 5 attempts)
- Silence detection (reconnect if no data for 20 seconds)
- Token-based authentication in SSE URL
- Tracks job completion state to prevent duplicate processing
- Progress event format: `{ phase, progress, message, timestamp }`

---

#### `sse-manager.js` (200+ lines)
**Purpose:** Higher-level SSE stream management

**Key Functions:**

**`createStream(jobId, callbacks)`**
- Create new JobProgressStream
- Store in active streams map
- Return stream instance

**`updateStream(jobId, data)`**
- Update existing stream with data
- Trigger progress callbacks
- Update UI progress indicators

**`destroyStream(jobId)`**
- Close stream connection
- Remove from active streams
- Clean up event listeners

**`getActiveStreams()`**
- Get list of all active streams
- Returns array of job IDs

**Features:**
- Manages multiple concurrent SSE streams
- Prevents duplicate streams for same job
- Automatic cleanup on completion/error
- Unified progress interface across streams

---

#### `document-regeneration.js` (200+ lines)
**Purpose:** Re-run document generation for existing cases

**Key Functions:**

**`regenerateDocument(caseId)`**
- Re-submit case to normalization pipeline
- Creates new job ID
- Returns job ID for tracking

**`showRegenerationProgress(jobId)`**
- Display progress modal
- Create SSE stream for job
- Update progress indicators

**`handleRegenerationComplete(result)`**
- Handle successful regeneration
- Download new documents
- Update case metadata

**Features:**
- Re-uses existing case data
- Creates new job for tracking
- Progress tracking via SSE
- Error handling and retry logic

---

#### `party-management.js` (300+ lines)
**Purpose:** Dynamic plaintiff/defendant section management

**Key Functions:**

**`addPlaintiff()`**
- Add new plaintiff section to form
- Generate unique ID (short alphanumeric, 8 chars)
- Clone plaintiff template
- Update field names with unique ID
- Initialize accordion controls

**`addDefendant()`**
- Add new defendant section
- Generate unique ID
- Clone defendant template
- Update field names

**`removePlaintiff(plaintiffId)`**
- Remove plaintiff section from DOM
- Clean up event listeners
- Update plaintiff counter
- Prevent removal of last plaintiff (min 1 required)

**`removeDefendant(defendantId)`**
- Remove defendant section
- Clean up references
- Update defendant counter

**`updatePlaintiffName(plaintiffId)`**
- Update section header as user types name
- Debounced (300ms)
- Fallback to "Plaintiff {n}" if empty

**`updateDefendantName(defendantId)`**
- Update section header from defendant name
- Real-time sync with input field

**`generateUniqueId()`**
- Generate short alphanumeric ID
- Format: [a-z0-9]{8}
- Example: `a7k2m9p1`
- Collision-resistant (random generation)

**Features:**
- Dynamic form field naming with unique IDs
- Accordion-style expand/collapse
- Section header auto-update from name inputs
- Minimum 1 plaintiff required
- Validation of party information
- Aria attributes for accessibility

---

#### `progress-state.js` (150+ lines)
**Purpose:** Track multi-phase document generation progress

**Key Functions:**

**`initializeProgress(jobId)`**
- Create progress tracking state
- Initialize phase counters
- Set start time

**`updateProgress(jobId, phase, percent)`**
- Update current phase progress
- Calculate overall completion percentage
- Estimate remaining time

**`getProgressState(jobId)`**
- Get current progress state
- Returns: { phase, progress, timeElapsed, timeRemaining }

**`completeProgress(jobId)`**
- Mark progress as complete
- Calculate total duration
- Clean up progress state

**Phases:**
1. Parsing (0-20%)
2. Normalization (20-40%)
3. Validation (40-60%)
4. Template Generation (60-80%)
5. PDF Creation (80-100%)

**Features:**
- Multi-phase progress tracking
- Time estimation based on phase progress
- Overall completion percentage
- Real-time UI updates

---

## Database

### `/database` Directory
Schema, taxonomy, and reference data

---

#### `schema.sql` (500+ lines)
**Purpose:** Complete PostgreSQL database schema

**Tables:**

**`intake_submissions`** (Main intake records)
- `id` (SERIAL PRIMARY KEY)
- `intake_number` (VARCHAR, UNIQUE, format: INT-YYYYMMDD-NNNN)
- `status` (VARCHAR: pending, reviewed, assigned, closed)
- `urgency` (VARCHAR: low, medium, high, critical)
- `created_at`, `updated_at` (TIMESTAMP)
- `assigned_attorney_id` (FK to attorneys)

**`intake_page_1` through `intake_page_5`** (Page-specific data)
- `id` (SERIAL PRIMARY KEY)
- `intake_id` (FK to intake_submissions)
- `data` (JSONB: flexible page content)
- `created_at`, `updated_at`

**`saved_sessions`** (Incomplete intake recovery)
- `id` (SERIAL PRIMARY KEY)
- `session_token` (VARCHAR, UNIQUE)
- `intake_data` (JSONB: partial intake data)
- `expires_at` (TIMESTAMP: 30-day expiry)
- `created_at`

**`attorneys`** (User accounts)
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `name` (VARCHAR)
- `role` (VARCHAR: attorney, admin)
- `created_at`, `updated_at`

**`audit_logs`** (Compliance tracking)
- `id` (SERIAL PRIMARY KEY)
- `entity_type` (VARCHAR: intake, form, case)
- `entity_id` (INTEGER)
- `action` (VARCHAR: create, update, delete, view)
- `user_id` (FK to attorneys)
- `changes` (JSONB: before/after state)
- `ip_address` (INET)
- `timestamp` (TIMESTAMP)

**`form_submissions`** (Document generation forms)
- `id` (SERIAL PRIMARY KEY)
- `case_number` (VARCHAR, UNIQUE)
- `intake_id` (FK to intake_submissions, nullable)
- `data` (JSONB: complete form data)
- `status` (VARCHAR: pending, processing, complete, error)
- `created_at`, `updated_at`

**`document_generation_jobs`** (PDF generation tracking)
- `id` (SERIAL PRIMARY KEY)
- `job_id` (VARCHAR, UNIQUE)
- `form_submission_id` (FK to form_submissions)
- `status` (VARCHAR: queued, processing, complete, error)
- `phase` (VARCHAR: parsing, normalization, generation)
- `progress` (INTEGER: 0-100)
- `error_message` (TEXT)
- `started_at`, `completed_at`

**`case_metadata`** (Case-level information)
- `id` (SERIAL PRIMARY KEY)
- `case_number` (VARCHAR, UNIQUE)
- `form_submission_id` (FK to form_submissions)
- `plaintiffs` (JSONB: array of plaintiff objects)
- `defendants` (JSONB: array of defendant objects)
- `issues` (JSONB: categorized issues)
- `documents_generated` (JSONB: list of generated docs)
- `dropbox_path` (VARCHAR)
- `created_at`, `updated_at`

**Indexes:**
- `idx_intake_number` on `intake_submissions(intake_number)`
- `idx_case_number` on `form_submissions(case_number)`
- `idx_job_id` on `document_generation_jobs(job_id)`
- `idx_intake_status` on `intake_submissions(status)`
- `idx_form_status` on `form_submissions(status)`
- GIN indexes on JSONB columns for full-text search

---

#### Taxonomy Files

**`baseline_taxonomy.sql`**
- Base vocabulary for issue categorization
- Standard issue types and subcategories

**`official_baseline_taxonomy.sql`**
- Authoritative taxonomy version
- Used for normalization pipeline

**`complete_taxonomy.sql`**
- Full taxonomy with all variations and synonyms
- Includes historical issue types

**`seed_discovery_taxonomy.sql`**
- Populate discovery issue types table
- Maps form fields to legal discovery categories

---

#### Maintenance Scripts

**`cleanup_taxonomy.sql`**
- Remove duplicate taxonomy entries
- Consolidate synonyms

**`migrate_fix_triggers.sql`**
- Fix trigger logic for automatic updates
- Corrects timestamp update triggers

**`migrate_add_regeneration_tracking.sql`**
- Add tables for document regeneration
- Track regeneration history

**`migrate_add_document_types.sql`**
- Add document type support
- Categorize generated documents (CM-110, discovery, etc.)

**`migrate_add_case_metadata.sql`**
- Add case metadata columns
- Enhance case tracking

---

## Configuration

### `/config` Directory
Application configuration and environment management

---

#### `env-validator.js` (200+ lines)
**Purpose:** Validate required environment variables at startup

**Features:**

**Variable Categories:**
- **Critical:** App fails to start if missing (DATABASE_URL, AUTH_TOKEN)
- **Important:** App starts with warnings (SENDGRID_API_KEY, DROPBOX_TOKEN)
- **Optional:** App uses defaults if missing (PORT, LOG_LEVEL)

**Validation Rules:**
- Required variables must be non-empty
- Database URLs must match PostgreSQL format
- API keys must meet minimum length requirements
- URLs must be valid HTTP/HTTPS
- Port numbers must be 1-65535

**Sensitive Variables:**
Marked as sensitive (masked in logs):
- Passwords
- API keys
- Access tokens
- Refresh tokens
- Database credentials

**Behavior:**
- Exits process (code 1) if critical variables missing
- Logs warnings for missing important variables
- Provides clear error messages with variable names

---

#### `index.js` (100+ lines)
**Purpose:** Centralized configuration object

**Exports:**
```javascript
module.exports = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      max: 20,
      idleTimeout: 30000,
      connectionTimeout: 10000
    }
  },
  auth: {
    token: process.env.AUTH_TOKEN,
    sessionExpiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  email: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: 'noreply@liptonlegal.com',
    fromName: 'Lipton Legal'
  },
  pipeline: {
    apiUrl: process.env.PIPELINE_API_URL,
    enabled: process.env.PIPELINE_API_ENABLED === 'true',
    timeout: 60000
  },
  storage: {
    bucket: process.env.GCS_BUCKET_NAME,
    projectId: process.env.GCP_PROJECT_ID
  },
  dropbox: {
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
    basePath: '/Current Clients'
  }
};
```

---

## Testing

### `/tests` Directory
Automated test suites

---

#### End-to-End Tests (Playwright)

**`form-completion.spec.js`**
- Full form submission workflow
- Fill all fields → submit → verify success

**`simple-form-test.spec.js`**
- Basic form interaction
- Field validation testing

**`all-issues-checked.spec.js`**
- Test all issue checkboxes
- Verify issue categorization

**`audit-all-checked.spec.js`**
- Comprehensive form audit
- Check all elements render correctly

**`visual-validation.spec.js`**
- Visual regression testing
- Screenshot comparison

**`test-end-to-end-pipeline.spec.js`**
- Full normalization pipeline
- Submit → process → verify documents

**`e2e/pdf-generation.spec.js`**
- PDF document generation flow
- Verify PDF output

---

#### Unit Tests (Jest)

**`services/pipeline-service.test.js`**
- Test pipeline service methods
- Mock HTTP requests
- Verify job queueing logic

**`services/database-service.test.js`**
- Test database operations
- Mock PostgreSQL connection
- Verify query execution

**`errors/AppError.test.js`**
- Test custom error class
- Verify error categorization

**`unit/pdf-field-mapper.test.js`**
- Test PDF form field mapping
- Verify field name transformations

---

#### Integration Tests

**`integration/pdf-service.test.js`**
- Test PDF generation integration
- Verify Docmosis API calls

**`integration/week1-integration-tests.js`**
- Multi-component testing
- End-to-end user flows

---

#### Utility Tests

**`test-python-api.js`**
- Test Python pipeline integration
- Verify API contract

**`test-dropbox-upload.js`**
- Test Dropbox functionality
- Verify file uploads

**`test-progress-tracking.js`**
- Test SSE progress tracking
- Verify real-time updates

**`performance-test.js`**
- Performance benchmarking
- Load testing

---

#### Test Setup

**`setup.js`**
- Test environment configuration
- Mock external services
- Seed test database

---

## Scripts

### `/scripts` Directory
Deployment, setup, and utility scripts

---

#### Deployment Scripts

**`deploy.sh`**
- Main deployment to Cloud Run
- Build Docker image → push → deploy

**`deploy-python-pipeline-staging.sh`**
- Deploy Python normalization service to staging

**`deploy-migration-to-dev.sh`**
- Apply database migrations to dev environment

**`deploy-dropbox-oauth-fix.sh`**
- Fix Dropbox OAuth configuration

**`fix-cloud-run-env-vars.sh`**
- Update Cloud Run environment variables

---

#### Environment Setup

**`setup-github-cicd.sh`**
- Configure GitHub Actions CI/CD
- Set up service account permissions

**`setup-staging-environment.sh`**
- Initialize staging environment
- Create staging database

**`setup-staging-db.py`**
- Python script to initialize staging database

**`init-staging-database.sh`**
- Bash version of DB initialization

---

#### Verification & Testing

**`verify-cicd-setup.sh`**
- Validate CI/CD configuration
- Check service account permissions

**`test-production-config.sh`**
- Test production settings
- Verify environment variables

**`test-deployment-flow.sh`**
- Test deployment process end-to-end

**`test-api-validation.sh`**
- Test API endpoints
- Verify authentication

**`quick-verify.sh`**
- Quick validation checks
- Run before deployment

---

#### Utilities

**`generate-dropbox-refresh-token.py`**
- Generate OAuth refresh token for Dropbox
- Interactive OAuth flow

**`check-local-env.sh`**
- Validate local development environment
- Check dependencies

**`start-db-proxy.sh`**
- Start Cloud SQL proxy for local development

**`test-db-connection.sh`**
- Test database connectivity
- Verify credentials

---

## Data Flow Architecture

### Form Submission Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    1. CLIENT SIDE (Browser)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
        index.html form → party-management.js
                            ↓
        Form validation (required fields)
                            ↓
        Confirmation modal → form-submission.js
                            ↓
        HTTP POST /api/form-entries (with auth token)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          2. BACKEND - PHASE 1: VALIDATION & TRANSFORM        │
└─────────────────────────────────────────────────────────────┘
                            ↓
        server.js receives POST
                            ↓
        routes/forms.js → validation middleware
                            ↓
        services/form-transformer.js:
          • Raw form data (checkbox arrays, text inputs)
          • → Normalized JSON (PascalCase keys)
          • → Human-readable format (revert keys/values)
                            ↓
        Store JSON to Cloud Storage
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          3. BACKEND - PHASE 2: DATABASE PERSISTENCE          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        services/database-service.js
                            ↓
        Save to PostgreSQL (form_submissions table)
                            ↓
        Generate unique case ID
                            ↓
┌─────────────────────────────────────────────────────────────┐
│      4. BACKEND - PHASE 3: PIPELINE SUBMISSION (Async)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
        services/pipeline-service.js
                            ↓
        HTTP POST to Python normalization API
                            ↓
        Python service performs 5-phase processing:
          1. Parse raw form data
          2. Normalize field names
          3. Validate data integrity
          4. Generate document templates
          5. Create PDF outputs
                            ↓
        Update status cache for SSE streaming
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              5. BACKGROUND PROCESSING                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Document generation (CM-110, etc.)
                            ↓
        services/dropbox-service.js uploads to Dropbox
                            ↓
        email-service.js sends notifications
                            ↓
        Audit logging
                            ↓
┌─────────────────────────────────────────────────────────────┐
│      6. CLIENT SIDE - PROGRESS TRACKING (Optional)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
        js/sse-client.js connects to:
          GET /api/jobs/:jobId/stream
                            ↓
        Receive real-time progress updates
                            ↓
        Display progress indicators
                            ↓
        Show document generation status
```

---

### Client Intake to Document Generation Bridge

```
┌─────────────────────────────────────────────────────────────┐
│                  1. CLIENT SUBMITS INTAKE                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Habitability form → POST /api/intakes
                            ↓
        routes/intakes-jsonb.js
                            ↓
        Store in intake_submissions table (JSONB page data)
                            ↓
        Generate intake number: INT-YYYYMMDD-NNNN
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              2. ATTORNEY LOADS DOCUMENT FORM                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Click "Load from Intake" button
                            ↓
        js/intake-modal.js opens search interface
                            ↓
        GET /api/intakes (with filters)
                            ↓
        Display list of matching intakes
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               3. ATTORNEY SELECTS INTAKE                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Select intake from modal
                            ↓
        transformIntakeToFormData() converts:
          • intake_submissions fields → personal info section
          • Addresses → plaintiff address
          • Property details → case details
          • Issues → discovery checkboxes
                            ↓
        Form auto-populates with intake data
                            ↓
        Attorney adds plaintiffs/defendants for document
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            4. ATTORNEY SUBMITS DOCUMENT FORM                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Form submission proceeds normally (see pipeline above)
                            ↓
        Links to original intake via intake_id
                            ↓
        Documents generated for case
```

---

## Key Features

### 1. Multi-Page Client Intake Form
- **5-page comprehensive habitability complaint intake**
- **25+ sections** across personal, property, building, health, and documentation
- **Required field validation** with real-time feedback
- **JSONB storage** for flexible data structure
- **Save-and-resume functionality** (30-day token expiration)
- **Email confirmation** with intake number

### 2. Document Generation System
- **Dynamic plaintiff/defendant sections** with unique ID generation
- **Comprehensive issue tracking** across 5 categories:
  - Building issues (structural, electrical, plumbing, HVAC)
  - Health hazards (mold, lead paint, asbestos)
  - Safety concerns (broken locks, fire hazards)
  - Utility problems (heat, water, electricity)
  - Pest infestations (rodents, cockroaches, bedbugs)
- **Issue consolidation** (multiple checkboxes → canonical values)
- **Real-time "At a Glance" case summary**
- **PDF generation** via Docmosis or CM-110 form filling
- **Async background processing** (non-blocking)

### 3. Intake-to-Document Bridge
- **Search and load existing client intakes**
- **Auto-populate document form** from intake data
- **Transform intake format** to document format
- **Link documents to original intake**
- **Attorney assignment and case tracking**

### 4. Cloud Integration
- **Google Cloud Storage** - Form data and generated documents
- **Dropbox** - Automatic cloud backup with folder structure
- **SendGrid** - Email notifications and recovery links
- **Cloud SQL** - PostgreSQL with automatic backups
- **Cloud Run** - Containerized deployment with auto-scaling

### 5. Monitoring & Observability
- **Prometheus metrics** for request tracking
- **Real-time progress tracking** via SSE
- **Structured logging** with daily rotation
- **Health check endpoints** (liveness, readiness)
- **Detailed error reporting** and audit logs
- **Performance monitoring** (request latencies, error rates)

### 6. Security & Authentication
- **Token-based API authentication** (Bearer tokens or query params)
- **Authorization header support**
- **Public intake submission endpoint** (no auth for POST /api/intakes)
- **Protected data retrieval** (auth required for GET)
- **Sensitive field masking** in logs
- **Audit trail** of all operations
- **Session recovery** with time-limited tokens (30 days)

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test
npm run test:e2e

# Build production assets
npm run build
```

### Database Setup
```bash
# Start Cloud SQL proxy
./scripts/start-db-proxy.sh

# Run migrations
make db-migrate

# Seed reference data
make db-seed
```

### Deployment
```bash
# Deploy to Cloud Run
./scripts/deploy.sh

# Verify deployment
./scripts/quick-verify.sh
```

---

## Environment Variables Reference

### Critical (Required)
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_TOKEN` - Application authentication token
- `GCP_PROJECT_ID` - Google Cloud project ID

### Important (Warnings if missing)
- `SENDGRID_API_KEY` - Email service API key
- `DROPBOX_REFRESH_TOKEN` - Dropbox OAuth refresh token
- `PIPELINE_API_URL` - Python normalization service endpoint
- `GCS_BUCKET_NAME` - Google Cloud Storage bucket

### Optional (Defaults available)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/staging/production)
- `LOG_LEVEL` - Logging verbosity (debug/info/warn/error)
- `PIPELINE_API_ENABLED` - Enable pipeline integration (default: true)

---

## Additional Notes

### Current Branch: `feature/load-from-intake-modal`
**Recent Commits:**
- feat: Complete client intake system with attorney modal integration
- fix: Align formData field names with React form for plumbing issues
- fix: Align building issues column names with database schema
- fix: Use correct Authorization header format for intake API calls
- fix: Resolve variable name collision in intake-modal.js

### Key Technical Decisions
1. **Vanilla JavaScript** for frontend (no framework dependencies)
2. **JSONB columns** for flexible schema in intake data
3. **Two-stage transformation** (normalize → revert) for data integrity
4. **Server-Sent Events** for real-time progress (not WebSockets)
5. **Token-based auth** with multiple methods (header + query param)
6. **Public intake submission** (POST without auth, GET requires auth)

### Production Readiness
✅ Robust error handling
✅ Comprehensive logging and monitoring
✅ Health check endpoints for Kubernetes
✅ Prometheus metrics for observability
✅ CI/CD pipeline with automated deployment
✅ Database migrations and schema versioning
✅ Security features (auth, audit logs, sensitive masking)
✅ Email notifications with retry logic
✅ Cloud backup (Dropbox + GCS)
✅ Real-time progress tracking

---

**Last Updated:** 2025-11-18
**Documentation Version:** 1.0
**Codebase Branch:** feature/load-from-intake-modal

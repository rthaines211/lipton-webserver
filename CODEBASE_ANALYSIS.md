# Lipton Legal Document Automation System - Comprehensive Codebase Analysis

## Executive Summary

This is a sophisticated legal document automation platform built with Node.js/Express backend and vanilla JavaScript frontend. It's designed for handling habitability legal cases, generating discovery documents (SROGs, PODs, Admissions) and filling California CM-110 court forms. The system uses PostgreSQL for data storage, Dropbox for cloud backup, SendGrid for email notifications, and integrates with a Python FastAPI pipeline for document normalization and generation.

**Technology Stack:**
- **Backend:** Node.js 20 (Alpine Docker), Express.js 4.18
- **Database:** PostgreSQL 12+ with pg-boss job queue
- **Frontend:** Vanilla JavaScript (no frameworks), HTML5
- **PDF:** pdf-lib for form-field filling, pdftk (legacy)
- **Cloud:** Google Cloud Run, Cloud SQL, Cloud Storage
- **Email:** SendGrid API
- **File Storage:** Dropbox (OAuth 2.0 refresh tokens), Google Cloud Storage
- **Monitoring:** Prometheus metrics, Winston logging, Custom health checks
- **Testing:** Playwright (E2E tests)

---

## 1. DATABASE ARCHITECTURE

### Database Type: PostgreSQL

**Location:** Cloud SQL (Production) or Unix socket connection
- Production: `/cloudsql/docmosis-tornado:us-central1:legal-forms-db`
- Development: `localhost:5432`
- Database: `legal_forms_db`
- User: `postgres` (dev) / `app-user` (prod)

**Schema Files:**
- `/Users/ryanhaines/Desktop/Lipton Webserver/database/schema.sql` (Main schema - 200+ lines)
- Multiple migration files in `/Users/ryanhaines/Desktop/Lipton Webserver/database/`

### Core Tables:

#### 1. **cases** Table
```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP,
    internal_name VARCHAR(255),
    form_name VARCHAR(255),
    property_address TEXT NOT NULL,
    city VARCHAR(255),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(255),
    filing_location VARCHAR(255),
    raw_payload JSONB NOT NULL,      -- Original immutable submission
    latest_payload JSONB,             -- Editable view
    is_active BOOLEAN DEFAULT true
);
```
**Purpose:** Stores main case/submission information
**Indexes:** created_at, property_address, city_state, active status

#### 2. **parties** Table (Plaintiffs & Defendants)
```sql
CREATE TABLE parties (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    party_type VARCHAR(20) CHECK (IN 'plaintiff', 'defendant'),
    party_number INTEGER,            -- Order in form
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(511),
    plaintiff_type VARCHAR(50),      -- Individual, Organization
    age_category VARCHAR(50),        -- Adult, Minor
    is_head_of_household BOOLEAN,
    unit_number VARCHAR(50),
    entity_type VARCHAR(50),         -- For defendants
    role VARCHAR(50),                -- Manager/Owner
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```
**Constraint:** Unique index on one Head of Household per unit per case
**Purpose:** Stores both plaintiffs and defendants with their properties

#### 3. **issue_categories** Table
Categories like: Vermin, Insects, Environmental, Safety, etc.
```sql
CREATE TABLE issue_categories (
    id UUID PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE,  -- 'vermin', 'insects', etc.
    category_name VARCHAR(255),
    display_order INTEGER,
    is_multi_select BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

#### 4. **issue_options** Table
Individual options within categories (e.g., "Rats/Mice", "Bedbugs")
```sql
CREATE TABLE issue_options (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES issue_categories(id),
    option_code VARCHAR(50),        -- 'RatsMice', 'Bedbugs'
    option_name VARCHAR(255),
    display_order INTEGER,
    created_at TIMESTAMP,
    is_active BOOLEAN,
    CONSTRAINT UNIQUE (category_id, option_code)
);
```

#### 5. **party_issue_selections** Table
Links parties to their selected issues
```sql
CREATE TABLE party_issue_selections (
    id UUID PRIMARY KEY,
    party_id UUID REFERENCES parties(id),
    issue_option_id UUID REFERENCES issue_options(id),
    selected_at TIMESTAMP,
    notes TEXT,
    CONSTRAINT UNIQUE (party_id, issue_option_id)
);
```

#### 6. **discovery_details** Table
Additional discovery information per plaintiff
```sql
CREATE TABLE discovery_details (
    id UUID PRIMARY KEY,
    party_id UUID REFERENCES parties(id),
    has_received_notice BOOLEAN,
    notice_date DATE,
    notice_type VARCHAR(255),
    has_filed_complaint BOOLEAN,
    complaint_date DATE,
    has_repair_request BOOLEAN,
    repair_request_date DATE,
    has_documentation BOOLEAN,
    documentation_types TEXT[],      -- Array of document types
    additional_notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT UNIQUE (party_id)
);
```

### Additional Schemas Created by pg-boss:
- **pgboss** schema - Job queue management (automatic)

### Connection Pool Configuration:
```javascript
const pool = new Pool({
    max: 20,                          // Max concurrent connections
    idleTimeoutMillis: 30000,         // Close idle after 30s
    connectionTimeoutMillis: 2000,    // Fail fast on connection issues
    maxUses: 7500,                    // Rotate connections to prevent leaks
    allowExitOnIdle: true
});
```

---

## 2. BACKEND ARCHITECTURE

### Main Server File
**Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/server.js`
**Size:** ~3100 lines of monolithic code
**Entry Point:** `node server.js`

### Server Configuration

#### Express App Setup:
```javascript
const app = express();
const PORT = process.env.PORT || 3000;
```

#### Middleware Stack (In Order):
1. **CORS** - Cross-Origin Resource Sharing
2. **Request Logging** - Winston structured logging
3. **Metrics** - Prometheus metrics middleware
4. **Compression** - Gzip/Brotli compression (level 6)
5. **Body Parsing** - JSON (10MB limit) + URL-encoded
6. **Cache Headers** - HTTP caching strategy
7. **Authentication** - Token-based access control (except health checks)
8. **Static Files** - Express.static(__dirname)

#### Authentication (requireAuth Middleware):
- **Production Mode:** Token required in URL query (`?token=xxx`) OR Authorization header (`Bearer xxx`)
- **Development Mode:** Authentication bypassed
- **Exceptions:** 
  - Health check endpoints (`/health*`, `/metrics`)
  - Static assets (`.js`, `.css`, `.png`, etc.)
- **Token Source:** `ACCESS_TOKEN` env variable

### API Endpoints

#### Form Management Endpoints:

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/form-entries` | Submit form + save JSON + DB + trigger pipeline | Required |
| GET | `/api/form-entries` | List all submissions with pagination | Required |
| GET | `/api/form-entries/:id` | Get specific submission | Required |
| PUT | `/api/form-entries/:id` | Update submission | Required |
| DELETE | `/api/form-entries/:id` | Delete specific submission | Required |
| DELETE | `/api/form-entries/clear-all` | Delete all submissions | Required |

#### PDF Generation Endpoints (via `/server/routes/pdf-routes.js`):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/pdf/generate` | Trigger async PDF generation |
| GET | `/api/pdf/status/:jobId` | Check job status |
| GET | `/api/pdf/download/:jobId` | Download generated PDF |
| GET | `/api/pdf/preview/:jobId` | Preview PDF in browser (NOT IMPLEMENTED) |
| POST | `/api/pdf/retry/:jobId` | Retry failed PDF generation (NOT IMPLEMENTED) |

#### Pipeline & Progress Endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pipeline-status/:caseId` | Poll normalization pipeline status |
| GET | `/api/jobs/:jobId/stream` | Server-Sent Events stream for progress |
| POST | `/api/pipeline-retry/:caseId` | Manually retry failed pipeline |
| POST | `/api/regenerate-documents/:caseId` | Regenerate documents from saved case |

#### Health & Monitoring Endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Liveness probe (always 200) |
| GET | `/health/ready` | Readiness probe (DB + dependencies) |
| GET | `/health/detailed` | Detailed diagnostics |
| GET | `/metrics` | Prometheus metrics export |

#### Static Pages:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Main form page (index.html) |
| GET | `/review.html` | Submission review page |
| GET | `/success` | Success confirmation page |

### Core Services (in `/server/services/`):

#### 1. **transformation-service.js** (700+ lines)
**Purpose:** Transform raw form data to structured JSON

**Key Functions:**
- `transformFormData(rawData)` - Convert form fields to structured format
- `extractIssueData(rawData, plaintiffNum)` - Parse issue selections
- `revertToOriginalFormat(structuredData)` - Convert normalized keys back to human-readable
- `generateShortId()` - Create 6-char unique IDs

**Data Flow:**
1. Raw form data → transformFormData() → PascalCase keys
2. PascalCase JSON → revertToOriginalFormat() → Human-readable keys/values
3. Output matches original form specifications

#### 2. **pdf-service.js** (700+ lines, Created 2025-11-12)
**Purpose:** Generate filled CM-110 PDFs

**Key Functions:**
- `generatePDF(formData, jobId, options)` - Main PDF generation
- `generateAndUploadPDF(formData, jobId, options)` - Generate + upload to Dropbox
- Progress callback for SSE updates

**Workflow:**
1. Load PDF template (cm110-decrypted)
2. Parse PDF structure with pdf-lib
3. Map form data to PDF fields
4. Fill PDF fields with values
5. Add bates stamps to pages
6. Flatten form fields (make read-only)
7. Save to temp directory
8. Upload to Dropbox
9. Return metadata

#### 3. **job-queue-service.js** (100+ lines)
**Purpose:** Async job processing using pg-boss (PostgreSQL job queue)

**Job Types:**
- `pdf-generation` - Generate new PDF
- `pdf-regeneration` - Regenerate existing PDF

**Configuration:**
- Schema: `pgboss`
- Retry limit: 3 attempts
- Retry delay: 1 min initial + exponential backoff
- Expiry: 24 hours
- Retention: 7 days

**Key Functions:**
- `initializeJobQueue()` - Set up pg-boss
- `enqueuePdfGeneration(formData, options)` - Queue new job
- `subscribePdfGeneration(handler)` - Listen for job events

#### 4. **storage-service.js**
**Purpose:** Abstract file storage (local or GCS)

**Key Functions:**
- `saveFormData(filename, data)` - Save JSON to storage
- `readFormData(filename)` - Load JSON from storage
- `listFormEntries()` - List all submissions
- `deleteFormData(filename)` - Delete submission

**Storage Options:**
- Development: Local filesystem (`/data` directory)
- Production: Google Cloud Storage (GCS bucket)

#### 5. **database-service.js**
**Purpose:** PostgreSQL connection management

**Functions:**
- `getPool()` - Get connection pool
- Database lifecycle management

#### 6. **pipeline-service.js**
**Purpose:** Call Python normalization pipeline

**Integration:**
- Calls Python FastAPI server (separate deployment)
- Endpoint: `PIPELINE_API_URL` (default: localhost:8000)
- Operation: POST /api/normalize with form data
- Polling: Check `/api/progress/{caseId}` every 2 seconds

#### 7. **sse-service.js**
**Purpose:** Server-Sent Events for real-time progress

**Key Functions:**
- `updateStatus(phase, jobId, statusData)` - Broadcast to SSE clients
- Connection management for multiple clients

### Utility Modules:

#### **pdf-field-mapper.js**
Maps form data to CM-110 PDF fields based on configuration

**Configuration File:** `/server/config/cm110-field-mapping.json` (11KB)

**Mapping Includes:**
- Plaintiff fields (all 5 pages)
- Defendant fields (all 5 pages)
- Court/jurisdiction fields
- Attorney information (hardcoded Lipton Legal Group)
- Party statement field

#### **pdf-templates.js**
Load PDF template files from filesystem

**Template Locations:**
- `/specs/templates/cm110-decrypted.pdf` (main template)

### Models:

#### **pdf-generation-job.js**
Job tracking model for PDF generation

**Properties:**
- jobId, status, progress
- filename, filePath, dropboxPath, dropboxUrl
- sizeBytes, error
- Timestamps: createdAt, completedAt, failedAt

---

## 3. FRONTEND STRUCTURE

### Main HTML File
**Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/index.html`
**Size:** ~500+ lines
**Structure:** Single-page application with tabbed interface

### Tabs/Sections:

#### 1. **Document Generation Form** (Main Tab)
Dynamic form for collecting legal case information:

**Form Sections:**
- Case filing information (filing location, date)
- Property address (street, city, state, zip, unit)
- Plaintiffs (dynamic add/remove)
  - Name, type (Individual/Organization), age category
  - Head of household checkbox
  - Issue selection (if head of household)
- Defendants (dynamic add/remove)
  - Name, entity type, role (manager/owner)
- Issue Categories (expandable sections)
  - Vermin/Insects
  - Environmental/Safety
  - Property condition
  - Multiple selection with checkboxes

**Special Features:**
- "At a Glance" summary panel showing:
  - Filing metadata
  - Party counts (plaintiffs/defendants)
  - Household indicators
- Real-time form validation
- Confirmation modal before submission
- Email notification opt-in modal

#### 2. **Habitability Intake Form** (New Tab)
Comprehensive habitability complaint intake:
- Personal information
- Address and building details
- Building issues (electrical, plumbing, HVAC, etc.)
- Common area issues
- Pest/vermin issues
- Health and safety hazards
- Landlord/property manager conduct
- Neighbor involvement
- Document uploads

#### 3. **View Submissions** (Dashboard Tab)
- List all form submissions
- Search/filter/sort capabilities
- Statistics dashboard

### JavaScript Modules (in `/js/` directory):

#### **form-submission.js** (1000+ lines)
Main form submission handler

**Key Functions:**
- `showReviewScreen()` - Display confirmation modal
- `confirmSubmission()` - Validate and show email modal
- `submitForm(notificationEmail, optedIn)` - Main submission handler
- `handleSubmissionSuccess(result)` - Process successful submission
- `handleSubmissionError(error)` - Process errors
- `resetFormAfterSubmission(result)` - Reset form to initial state

**Form Submission Flow:**
1. User fills form
2. Clicks "Submit Form" → Confirmation modal
3. Reviews data
4. Clicks "Confirm & Submit" → Email notification modal
5. Enters email or skips
6. `submitForm()` sends POST to `/api/form-entries`
7. Response received → Form resets immediately
8. SSE connection established for progress tracking
9. Documents generate in background

#### **sse-client.js** (300+ lines)
Server-Sent Events client for real-time progress

**JobProgressStream Class:**
```javascript
class JobProgressStream {
    constructor(jobId, sseUrl)
    connect()                    // Establish SSE connection
    setupEventHandlers()         // Handle open, message, error
    startSilenceDetection()      // Detect connection drops
    handleReconnection()         // Auto-reconnect logic
    destroy()                    // Clean up resources
}
```

**Features:**
- Auto-reconnection with exponential backoff
- Configurable max attempts (6 = ~2 minutes)
- Silence detection (20 second threshold)
- Event handlers for progress, completion, errors
- Prevents duplicate connections

#### **party-management.js** (300+ lines)
Manage dynamic plaintiffs/defendants

**Key Functions:**
- `addPlaintiff()` - Add new plaintiff block
- `removePlaintiff(num)` - Remove plaintiff
- `addDefendant()` - Add new defendant block
- `removeDefendant(num)` - Remove defendant
- `updateSectionHeader()` - Update display names
- `updateHoHVisibility()` - Show/hide issues based on HoH selection

#### **document-regeneration.js** (600+ lines)
Handle regeneration of previously submitted documents

**Key Functions:**
- `regenerateDocuments(caseId)` - Trigger regeneration
- `trackRegenerationProgress(caseId)` - Monitor progress
- Modal UI for regeneration workflow

#### **progress-state.js** (100+ lines)
Manage client-side progress state

**Tracks:**
- Current phase of processing
- Progress percentage (0-100)
- Status messages
- Timestamps

#### **sse-manager.js** (100+ lines)
High-level SSE connection management

### CSS Styling:
**Location:** Inline in `<style>` tag in index.html

**Design System:**
- **Primary Navy:** #1F2A44 (headers, buttons)
- **Secondary Teal:** #00AEEF (accents, add buttons)
- **Neutral Gray:** #F5F5F5 (backgrounds)
- **Text:** #333333 (body text)

**Features:**
- Mobile-responsive design
- Accordion-style expandable sections
- Custom checkbox/radio button styling
- Modal dialogs for confirmation and email collection
- Progress indicators with percentage display
- Toast notifications for status updates

### Form Field Naming Convention:
```
plaintiff-{num}-first-name
plaintiff-{num}-last-name
plaintiff-{num}-type
plaintiff-{num}-age
plaintiff-{num}-head
plaintiff-{num}-issue-{categoryCode}[]

defendant-{num}-first-name
defendant-{num}-last-name
defendant-{num}-entity
defendant-{num}-role

property-address
property-city
property-state
property-zip

filing-location
filing-date

documentTypesToGenerate[]
```

### External Libraries:
- Font Awesome 6.4 (icons)
- Google Fonts (Merriweather, Open Sans)
- No frontend frameworks (vanilla JavaScript)

---

## 4. EMAIL SYSTEM

### Email Service Provider: SendGrid

**Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/email-service.js` (300+ lines)

### Configuration:
```javascript
CONFIG = {
    apiKey: process.env.SENDGRID_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'notifications@liptonlegal.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Lipton Legal',
    enabled: process.env.EMAIL_ENABLED !== 'false',
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000')
}
```

### Email Functions:

#### `sendCompletionNotification(options)`
Sends document completion notification

**Parameters:**
```javascript
{
    to: 'user@example.com',
    name: 'John Doe',
    streetAddress: '123 Main Street',
    caseId: 12345,
    documentCount: 32,
    dropboxLink: 'https://www.dropbox.com/...'
}
```

**Email Content:**
- Recipient greeting with name
- Property address
- Document count
- Dropbox download link
- Professional branding (Lipton Legal)
- Mobile-responsive HTML template

**Features:**
- Automatic retry with exponential backoff (up to 3 times)
- HTML + plain text versions
- XSS protection (HTML escaping)
- Graceful error handling (never throws)
- Winston logging for all operations
- Email validation

### Email Templates:
**Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/email-templates.js` (300+ lines)

**Template Functions:**
- `getCompletionEmailTemplate(options)` - Completion notification template
- `formatDate(date)` - Format dates for emails
- `escapeHtml(text)` - XSS protection

**Template Features:**
- Professional HTML layout with Lipton Legal branding
- Mobile-responsive design using HTML email best practices
- Dark text (#333333) on light background
- Teal accents (#00AEEF) for call-to-action buttons
- Plain text fallback for text-only email clients

---

## 5. DOCUMENT GENERATION SYSTEM

### Overview
The system generates California legal discovery documents (SROGs, PODs, Admissions) and CM-110 court forms through a Python FastAPI pipeline.

### Document Types Supported:
1. **SROG** - Supplemental Requests for Production of Documents
2. **POD** - Requests for Admissions
3. **Admissions** - Requests for Admissions (detailed)
4. **CM-110** - Civil Court Form (Case Management - California)

### Workflow:

#### Phase 1: Form Submission
```
User submits form
  ↓
POST /api/form-entries (Node.js)
  ├─ Transform form data to structured JSON
  ├─ Save to file storage (GCS or local)
  ├─ Save to PostgreSQL database
  └─ Return immediately with dbCaseId
```

#### Phase 2: Background Pipeline Execution
```
callNormalizationPipeline(formData, dbCaseId)
  ↓
POST to Python FastAPI: /api/normalize
  ├─ Phase 1: Data validation
  ├─ Phase 2: Field normalization
  ├─ Phase 3: Template matching
  ├─ Phase 4: Document generation (32 docs)
  └─ Phase 5: Assembly + upload to Dropbox
  ↓
Poll /api/progress/{caseId} every 2 seconds
  ├─ Get progress update
  ├─ Broadcast via SSE
  └─ Update frontend UI
```

#### Phase 3: Document Delivery
```
Upon pipeline completion:
  ├─ If email opted-in:
  │   └─ sendCompletionNotification(email, caseId, dropboxLink)
  ├─ Store completion status in cache
  ├─ Update database with completion status
  └─ Frontend receives completion event
```

### CM-110 PDF Generation Details:

#### Template:
- **File:** `cm110-decrypted.pdf` (unencrypted template)
- **Library:** pdf-lib (Node.js PDF manipulation)
- **Pages:** 5 pages total

#### Field Mapping:
**Configuration:** `/server/config/cm110-field-mapping.json`

**Mapped Fields:**
- **Plaintiffs:** All 5 pages (semicolon-separated for multiple)
- **Defendants:** All 5 pages (semicolon-separated for multiple)
- **Court:** County, city/zip
- **Attorney:** Hardcoded "Lipton Legal Group"
- **Case Title:** Auto-generated from parties

**Sample Mapping:**
```json
{
  "plaintiffFields": {
    "page1": { "pdfField": "form1[0].#subform[0].Plaintiff[0]", "maxLength": 100 },
    "page2": { "pdfField": "form1[0].#subform[1].Plaintiff[0]", "maxLength": 100 },
    ...
  },
  "defendantFields": {
    "page1": { "pdfField": "form1[0].#subform[0].Defendant[0]", "maxLength": 100 },
    ...
  }
}
```

#### Generation Steps:
1. Load template with pdf-lib (ignoreEncryption: true)
2. Get form fields from PDF
3. Map form data to PDF field names
4. Fill each field with value
5. Add bates stamps to page footers
6. Flatten form (remove editability)
7. Save to temp directory: `/output/case-{id}/cm110.pdf`
8. Upload to Dropbox: `/Current Clients/case-{id}/cm110.pdf`

#### Progress Tracking:
- **Phase 1:** Loading template (10%)
- **Phase 2:** Parsing PDF structure (20%)
- **Phase 3:** Mapping fields (40%)
- **Phase 4:** Filling fields (70%)
- **Phase 5:** Flattening form (85%)
- **Phase 6:** Saving to disk (95%)
- **Phase 7:** Uploading to Dropbox (100%)

---

## 6. DROPBOX INTEGRATION

### Configuration:
**Service File:** `/Users/ryanhaines/Desktop/Lipton Webserver/dropbox-service.js` (300+ lines)

### Authentication Method: OAuth 2.0 Refresh Token (Preferred)
```javascript
DROPBOX_CONFIG = {
    appKey: process.env.DROPBOX_APP_KEY,
    appSecret: process.env.DROPBOX_APP_SECRET,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,  // Legacy
    enabled: process.env.DROPBOX_ENABLED === 'true',
    basePath: process.env.DROPBOX_BASE_PATH || '/Current Clients',
    localOutputPath: process.env.LOCAL_OUTPUT_PATH || '/output',
    continueOnFailure: process.env.CONTINUE_ON_DROPBOX_FAILURE !== 'false'
}
```

### Key Features:
- **Token auto-refresh:** Never expires (compared to access tokens)
- **Folder creation:** Automatic folder structure in Dropbox
- **Path mapping:** Maps local folders to Dropbox structure
- **Overwrite mode:** Files are overwritten (not duplicated)
- **Error handling:** Graceful degradation if upload fails

### Folder Structure:
```
/Current Clients/
├─ case-001/
│  ├─ cm110.pdf
│  ├─ srog1.pdf
│  ├─ srog2.pdf
│  ├─ pod1.pdf
│  └─ admissions.pdf
├─ case-002/
│  └─ ...
```

### Dropbox Methods:

#### `mapLocalPathToDropbox(localPath)`
Converts local path to Dropbox path
```
/output/case-001/cm110.pdf
  ↓
/Current Clients/case-001/cm110.pdf
```

#### `uploadFile(localFilePath, options)`
Upload file with automatic folder creation
- Creates folders recursively
- Overwrites existing files
- Returns dropbox path and shared link

#### `createFolder(folderPath)`
Create folder in Dropbox recursively

#### `createSharedLink(dropboxPath)`
Generate shareable link for files

### Status:
- **Current Status:** Integrated and functional
- **Latest Update:** OAuth refresh token migration (2025-10-27)
- **Note:** Currently used for document backup after generation

---

## 7. DEPLOYMENT CONFIGURATION

### Container: Docker (Alpine Linux)

**Dockerfile Location:** `/Users/ryanhaines/Desktop/Lipton Webserver/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

**Features:**
- Alpine base (minimal image size)
- Production dependencies only
- npm ci (deterministic builds)
- Port 8080 (Cloud Run standard)

### Cloud Run Deployment:

#### Environment Variables:
**Production:** `/config/.env.production`
```
NODE_ENV=production
PORT=8080
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db
DB_NAME=legal_forms_db
DB_USER=app-user
NODE_SERVER_URL=https://node-server-zyiwmzwenq-uc.a.run.app
PYTHON_PIPELINE_URL=https://python-pipeline-945419684329.us-central1.run.app
DROPBOX_ENABLED=true
PIPELINE_API_ENABLED=true
```

**Staging:** `/config/.env.staging`

**Development:** `/config/.env.development`
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
NODE_SERVER_URL=http://localhost:3000
PIPELINE_API_URL=http://localhost:5001
```

#### Cloud SQL Connection:
- **Unix socket:** `/cloudsql/{PROJECT}:{REGION}:{INSTANCE}`
- **Instance:** docmosis-tornado:us-central1:legal-forms-db
- **Database:** legal_forms_db
- **User credentials:** From GCP Secret Manager

#### Secrets Management:
Sensitive values stored in GCP Secret Manager:
- Database passwords
- SendGrid API key
- Dropbox OAuth tokens
- Access tokens
- API keys

#### CI/CD: GitHub Actions
**Workflow Location:** `.github/workflows/`

**Triggers:**
- Push to `develop` → Deploy to development
- Push to `main` → Deploy to staging (auto) + production (manual approval)

### Environment Variable Validation:

**Validator:** `/config/env-validator.js`
**Purpose:** Fail fast with clear errors for missing required variables

**Validates:**
- NODE_ENV
- PORT
- Database credentials
- API keys
- Feature flags

---

## 8. MONITORING & LOGGING

### Logging: Winston

**Logger Module:** `/monitoring/logger.js` (200+ lines)

**Features:**
- Multiple transport layers (console, file rotation)
- Structured JSON logging
- Log levels: error, warn, info, debug
- Daily log rotation
- Production-ready format

**Log Locations:**
- Console output (development)
- Daily log files (production)
- CloudRun logs (via stdout)

### Metrics: Prometheus

**Metrics Module:** `/monitoring/metrics.js` (300+ lines)

**Tracked Metrics:**
- HTTP request count (by method, path, status)
- Request duration (histogram)
- Active connections
- Form submissions count
- Form submission errors
- Form processing time
- Document generation statistics

**Export Endpoint:** `GET /metrics`

**Format:** Prometheus text format

### Health Checks:

**Health Check Module:** `/monitoring/health-checks.js` (300+ lines)

#### Endpoints:

1. **`GET /health`** - Liveness probe
   - Always returns 200
   - Used by Cloud Run to verify container is alive

2. **`GET /health/ready`** - Readiness probe
   - Checks database connectivity
   - Checks file storage access
   - Returns 503 if dependencies unavailable

3. **`GET /health/detailed`** - Detailed diagnostics
   - Database status
   - Storage status
   - Dropbox integration status
   - Pipeline API status
   - Memory usage
   - Uptime
   - Version information

### Middleware:

#### Request Logging Middleware
- Logs all HTTP requests
- Records response time
- Includes status codes
- Structured format for analysis

#### Metrics Middleware
- Increments HTTP counters
- Records response times
- Groups by method/path
- Updates Prometheus metrics

---

## 9. TECHNOLOGY STACK SUMMARY

### Backend Stack:
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20 (Alpine) | Server runtime |
| Framework | Express.js | 4.18.2 | HTTP server |
| Database | PostgreSQL | 12+ | Primary data store |
| Job Queue | pg-boss | 12.1.1 | Background processing |
| PDF | pdf-lib | 1.17.1 | PDF field filling |
| Cloud Storage | Google Cloud Storage | 7.7.0 | File storage (prod) |
| Email | SendGrid | 8.1.6 | Email delivery |
| File Sync | Dropbox SDK | 10.34.0 | Cloud backup |
| Logging | Winston | 3.18.3 | Structured logging |
| Metrics | prom-client | 15.1.3 | Prometheus export |
| HTTP Client | Axios | 1.12.2 | API calls |
| Compression | compression | 1.8.1 | Response compression |
| CORS | cors | 2.8.5 | Cross-origin support |
| Dotenv | dotenv | 17.2.3 | Env var management |

### Frontend Stack:
| Component | Technology | Version |
|-----------|-----------|---------|
| HTML | HTML5 | - |
| CSS | CSS3 (inline) | - |
| JavaScript | ES6+ | Vanilla (no frameworks) |
| Icons | Font Awesome | 6.4.0 |
| Fonts | Google Fonts | Latest |
| HTTP Client | Fetch API | Native |
| SSE | EventSource API | Native |

### Infrastructure:
| Component | Service | Details |
|-----------|---------|---------|
| Hosting | Google Cloud Run | Serverless containers |
| Database | Cloud SQL | PostgreSQL 12+ |
| Storage | Cloud Storage | GCS bucket |
| Container Registry | Google Cloud | gcr.io |
| Secrets | Secret Manager | GCP Secret Manager |
| CI/CD | GitHub Actions | Automated deployment |

---

## 10. KEY FEATURES & IMPLEMENTATION

### 1. Dynamic Form Sections
- JavaScript adds/removes plaintiff and defendant blocks
- Real-time DOM manipulation
- Preserves existing data when adding new party

### 2. Form Validation
- Required field checks
- Email format validation
- State abbreviation validation
- Real-time feedback with inline errors

### 3. Issue Category Management
- Multi-select checkboxes organized by category
- Expandable/collapsible accordion sections
- Conditional display based on "Head of Household" selection

### 4. Data Transformation Pipeline
- Raw form data → Normalized PascalCase format
- Normalized format → Original human-readable format
- Preserves all information during round-trip conversion

### 5. Real-time Progress Tracking
- Server-Sent Events (SSE) for real-time updates
- Automatic reconnection with exponential backoff
- Client-side progress state management
- Frontend UI updates during background processing

### 6. Database Transactions
- Multi-step form submission wrapped in transaction
- Automatic rollback on error
- Maintains data consistency

### 7. Dual Storage System
- JSON files (local or GCS)
- PostgreSQL relational database
- Complementary systems for different access patterns

### 8. PDF Generation
- Template-based form filling
- Automatic field mapping
- Page numbering with bates stamps
- Dropbox upload with folder structure

### 9. Email Notifications
- Opt-in email collection during form submission
- Automatic retry with exponential backoff
- Professional HTML templates
- Completion notifications with document links

### 10. Error Handling
- Graceful degradation (e.g., continue if DB fails)
- Comprehensive error logging
- User-friendly error messages
- Fallback mechanisms

---

## 11. DATA FLOW DIAGRAMS

### Form Submission Flow:
```
┌─────────────┐
│  User Form  │
└──────┬──────┘
       │ Submit
       ↓
┌──────────────────────────────┐
│ Frontend Validation          │
│ - Check required fields      │
│ - Validate email format      │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ Confirmation Modal           │
│ - Review submission data     │
└──────┬───────────────────────┘
       │ Confirmed
       ↓
┌──────────────────────────────┐
│ Email Notification Modal     │
│ - Collect email (optional)   │
│ - Save preference            │
└──────┬───────────────────────┘
       │
       ↓ POST /api/form-entries
       │
   ────┼─────────────────────────────────
       │
       ↓
┌──────────────────────────────┐
│ Backend Processing (Node.js) │
│ 1. Transform form data       │
│ 2. Save to file storage      │
│ 3. Save to database          │
│ 4. Return response           │
└──────┬───────────────────────┘
       │
       ↓ HTTP 201
       │
┌──────────────────────────────┐
│ Frontend Success Handler     │
│ - Reset form immediately     │
│ - Show success alert         │
│ - Establish SSE connection  │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ Background Processing        │
│ - Python pipeline execution  │
│ - Document generation        │
│ - Dropbox upload            │
│ - Email notification (if opt-in)
└──────────────────────────────┘
```

### Database Schema Relationships:
```
cases (main table)
├─ parties (plaintiffs & defendants)
│  ├─ issue_selections (what issues they reported)
│  │  └─ issue_options (specific issue choices)
│  │     └─ issue_categories (grouping)
│  │
│  └─ discovery_details (additional info)
│
└─ raw_payload (original JSON)
```

---

## 12. SECURITY CONSIDERATIONS

### Authentication:
- Token-based access control (production only)
- Token can be in URL query or Authorization header
- Static assets bypass authentication (no sensitive data)
- Health check endpoints always accessible

### Authorization:
- Single token shared across all API consumers
- No role-based access control (future enhancement)
- No user management system (current architecture)

### Data Protection:
- Input validation on all form fields
- XSS protection via HTML escaping in emails
- SQL injection protection via parameterized queries (pg)
- HTTPS in production (Cloud Run enforced)

### Secrets Management:
- Database passwords stored in GCP Secret Manager
- API keys never hardcoded
- Environment variables for all sensitive config
- Credentials rotated regularly

### Rate Limiting:
- Not currently implemented (Cloud Run provides default rate limiting)

### Logging:
- Sensitive data (passwords, tokens) never logged
- All API calls logged with status codes
- Error stack traces logged for debugging

---

## 13. PERFORMANCE OPTIMIZATION

### Frontend:
- Static asset caching (1 year with immutable flag)
- HTML caching (5 minutes with revalidation)
- No-cache for API responses
- Vanilla JavaScript (no framework overhead)
- CSS minification (inline)

### Backend:
- Response compression (Gzip/Brotli, level 6)
- Connection pooling (20 concurrent connections)
- Database connection rotation (7500 max uses)
- Idle timeout (30 seconds)
- Fail-fast connection timeout (2 seconds)

### Database:
- Indexed queries on frequently searched fields
- Connection pooling with proper tuning
- Async/await for non-blocking operations
- Transaction support for consistency

### File Storage:
- Streaming for large file operations
- Dual storage prevents single point of failure
- Cloud Storage for production (highly available)

---

## 14. TESTING

### Test Framework: Playwright

**Test Location:** `/tests/`

**Test Types:**
- **E2E Tests:** Form submission workflow
- **Form Validation Tests:** Field validation
- **Integration Tests:** PDF service
- **Performance Tests:** Load testing

**Key Test Files:**
- `simple-form-test.spec.js` - Basic form submission
- `form-completion.spec.js` - Full workflow
- `all-issues-checked.spec.js` - Issue selection
- `test-end-to-end-pipeline.spec.js` - Pipeline integration

**Running Tests:**
```bash
npm test                 # Run all tests
npm run test:headed      # With browser visible
npm run test:debug       # Debug mode
npm run test:report      # View results
```

---

## 15. CURRENT LIMITATIONS & NOTES

### Known Issues:
1. **Dropbox Upload:** Currently temporarily disabled (commented out) due to deployment issues
2. **Document Types:** Limited to specific types (SROGS, PODs, Admissions, CM-110)
3. **PDF Preview:** Not yet implemented (`/api/pdf/preview/:jobId`)
4. **PDF Retry:** Not yet implemented (`/api/pdf/retry/:jobId`)
5. **No User Management:** Single shared token for all users

### Future Enhancements:
1. Role-based access control (RBAC)
2. Multi-user support with authentication
3. Document template customization
4. Advanced search and filtering
5. Document versioning and history
6. Webhook support for external integrations
7. API key management per user
8. Rate limiting and quota management
9. Audit logging for compliance
10. Mobile app (native or PWA)

### Missing Implementations:
- GET `/api/pdf/preview/:jobId` - Preview PDF in browser
- POST `/api/pdf/retry/:jobId` - Manual retry for failed PDFs
- Document regeneration detailed workflow
- Advanced analytics dashboard
- Export functionality (CSV, Excel)

---

## 16. QUICK REFERENCE

### Important Files to Know:
- **Main Server:** `/server.js`
- **Form Page:** `/index.html`
- **Database Schema:** `/database/schema.sql`
- **Form Submission:** `/js/form-submission.js`
- **PDF Service:** `/server/services/pdf-service.js`
- **PDF Field Mapping:** `/server/config/cm110-field-mapping.json`
- **Email Templates:** `/email-templates.js`
- **Dropbox Service:** `/dropbox-service.js`
- **Environment Config:** `/.env`

### Important Commands:
```bash
npm install              # Install dependencies
npm start               # Start server
npm run dev             # Start with nodemon (development)
npm test                # Run Playwright tests
npm run validate:env    # Validate environment variables
node build.js           # Build production bundle
```

### Important Endpoints to Test:
```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/detailed

# Metrics
curl http://localhost:3000/metrics

# Form submission
curl -X POST http://localhost:3000/api/form-entries \
  -H "Content-Type: application/json" \
  -d '{"id": "test-123", ...}'

# Check status
curl http://localhost:3000/api/pipeline-status/test-123
```

### Environment Variables Checklist:
```
NODE_ENV                      ✓
PORT                          ✓
DB_HOST                       ✓
DB_PORT                       ✓
DB_NAME                       ✓
DB_USER                       ✓
DB_PASSWORD                   ✓ (from Secret Manager in prod)
ACCESS_TOKEN                  ✓
DROPBOX_APP_KEY               ✓
DROPBOX_APP_SECRET            ✓
DROPBOX_REFRESH_TOKEN         ✓
DROPBOX_ENABLED               ✓
DROPBOX_BASE_PATH             ✓
LOCAL_OUTPUT_PATH             ✓
SENDGRID_API_KEY              ✓
EMAIL_FROM_ADDRESS            ✓
EMAIL_FROM_NAME               ✓
EMAIL_ENABLED                 ✓
PIPELINE_API_URL              ✓
PIPELINE_API_ENABLED          ✓
EXECUTE_PIPELINE_ON_SUBMIT    ✓
GCS_BUCKET_NAME               ✓
GCLOUD_PROJECT                ✓
```


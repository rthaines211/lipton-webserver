# Email Notification Feature - Complete Architecture Analysis

## 1. OVERALL PROJECT STRUCTURE & TECH STACK

### Technology Stack
- **Frontend**: HTML5, JavaScript (vanilla, no frameworks)
- **Backend**: Node.js + Express.js (v4.18.2)
- **Secondary Backend**: Python FastAPI (v0.115.0) for document normalization pipeline
- **Database**: PostgreSQL (pg v8.16.3)
- **Cloud Storage**: Google Cloud Storage (via @google-cloud/storage v7.7.0)
- **Cloud Deployment**: GCP Cloud Run
- **Authentication**: Token-based (Bearer tokens)
- **Third-party APIs**: 
  - Dropbox API (dropbox v10.34.0) - file storage/sharing
  - Docmosis API - document generation
- **Logging & Monitoring**: Winston, Prometheus metrics, custom health checks

### Project Architecture
```
/Users/ryanhaines/Desktop/Lipton Webserver/
├── index.html                          # Main form UI with emailNotificationModal
├── server.js                           # Monolithic Node.js backend (2576 lines)
├── dropbox-service.js                  # Dropbox integration module
├── success.html                        # Success page (unused - redirect removed)
├── server/                             # Modularized server structure (Phase 1 refactoring)
│   ├── index.js                        # Express app entry point with middleware
│   ├── routes/
│   │   └── health-routes.js            # Health check endpoints
│   ├── services/
│   │   ├── database-service.js
│   │   ├── pipeline-service.js
│   │   ├── transformation-service.js   # Form data transformation logic
│   │   └── storage-service.js
│   ├── middleware/
│   │   └── auth.js                     # Authentication
│   ├── utils/
│   └── config/
├── js/                                 # Client-side JavaScript
│   ├── form-submission.js              # Form submission handler (includes email modal logic)
│   ├── sse-client.js                   # Server-Sent Events for progress tracking
│   ├── party-management.js             # Dynamic plaintiff/defendant management
│   ├── progress-state.js               # Progress state management
│   └── sse-manager.js
├── api/                                # Python FastAPI application
│   ├── main.py                         # FastAPI entry point
│   ├── database.py
│   ├── models.py
│   ├── etl_service.py
│   ├── config.py
│   └── json_builder.py
├── monitoring/                         # Observability
│   ├── logger.js                       # Winston logger configuration
│   ├── metrics.js                      # Prometheus metrics
│   ├── health-checks.js                # Health check functions
│   ├── middleware.js                   # Middleware for logging/metrics
│   └── log-middleware.js
├── database/                           # Database schemas and migrations
├── data/                               # Local development file storage
└── package.json                        # Node.js dependencies

```

---

## 2. CURRENT PIPELINE FLOW (Form Submission → Completion)

### Form Submission Workflow

#### Phase 1: Frontend Submission
```
User fills form 
  ↓
Clicks "Submit Form" button
  ↓
showReviewScreen() called
  ├─ Runs runFullValidation(form)
  └─ Shows confirmationModal (review data)
  ↓
User clicks "Confirm & Submit"
  ├─ closeConfirmationModal()
  └─ showEmailNotificationModal() [THIS IS WHERE EMAIL COLLECTION HAPPENS]
  ↓
User either:
  ├─ Enters email → submitEmailNotification()
  │  └─ Validates email with regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  │  └─ Calls submitForm(email, true, name)
  └─ Skips email → skipEmailNotification()
     └─ Calls submitForm(null, false, null)
```

#### Phase 2: Backend Form Processing
**Endpoint**: `POST /api/form-entries`
**Location**: `/Users/ryanhaines/Desktop/Lipton Webserver/server.js` (lines 1589-1810)

```
Form Data Received
  ↓
1. VALIDATION (10% progress)
   ├─ Checks for required fields (id, at least one plaintiff)
   └─ Creates tempCaseId for progress tracking
  ↓
2. DATA TRANSFORMATION (20% progress)
   ├─ transformFormData(rawData)
   │  └─ Converts HTML form fields into structured JSON
   │  └─ Generates unique IDs for parties
   │  └─ Extracts plaintiff/defendant data
   │  └─ Processes discovery/issue selections
   │
   └─ revertToOriginalFormat(structuredData)
      └─ Reverts keys from PascalCase to human-readable format
      └─ Maps values to original specifications
  ↓
3. FILE STORAGE (30% progress)
   ├─ Save to Google Cloud Storage OR local /data directory
   │  └─ Filename: form-entry-{id}.json
   └─ Content includes full structured data + server timestamp
  ↓
4. DATABASE STORAGE (40% progress)
   ├─ Call saveToDatabase(structuredData, rawPayload)
   ├─ Insert case record with:
   │  ├─ property_address (from Full_Address.StreetAddress)
   │  ├─ submitter_name (from notificationName, or 'Anonymous')
   │  ├─ submitter_email (from notificationEmail, or '')
   │  └─ raw_payload (entire form submission)
   │
   ├─ Insert parties (plaintiffs and defendants)
   ├─ Insert issue selections
   └─ Returns dbCaseId (database case ID)
  ↓
5. RESPONSE SENT IMMEDIATELY (non-blocking)
   ├─ Returns 201 with:
   │  ├─ success: true
   │  ├─ id: {formData.id} (UUID)
   │  ├─ dbCaseId: {trackingCaseId} (for SSE progress)
   │  ├─ filename: form-entry-{id}.json
   │  └─ pipelineEnabled: {boolean}
   └─ Form resets immediately on frontend
  ↓
6. BACKGROUND PIPELINE EXECUTION (40-100% progress)
   └─ callNormalizationPipeline() executes asynchronously
      ├─ Send form data to Python FastAPI /api/normalize endpoint
      ├─ Poll /api/progress/{caseId} every 2 seconds
      │  └─ Track document generation progress (X/32 documents)
      └─ Update cache with progress updates
         └─ Frontend polls /api/pipeline-status/:caseId
```

### Dropbox Integration (Currently Disabled)
**Location**: `/Users/ryanhaines/Desktop/Lipton Webserver/dropbox-service.js`
**Status**: TEMPORARILY DISABLED (2025-10-22) due to 500 errors

```
IF (dropboxService.isEnabled()) {
  ├─ mapLocalPathToDropbox(localPath)
  │  └─ Maps /output/{path} → /Apps/LegalFormApp/{path}
  │
  ├─ ensureParentFoldersExist(dropboxPath)
  │  └─ Recursively creates folder hierarchy in Dropbox
  │
  └─ uploadFile(localPath, fileContent)
     ├─ Reads file from local storage
     └─ Uploads to Dropbox with WriteMode.overwrite
} else {
  └─ Upload skipped (no notification to user)
}
```

### Success Callback Flow
```
Backend sends response with:
├─ success: true
├─ dbCaseId (for progress tracking)
└─ pipelineEnabled: true/false

Frontend handleSubmissionSuccess(result):
├─ Stores lastSubmissionId in sessionStorage
├─ IF pipelineEnabled:
│  └─ Creates SSE connection via createJobStream(caseId)
│     ├─ Connects to /api/pipeline-stream/:caseId
│     └─ Listens for progress updates
├─ Resets form immediately
└─ User can submit new form while first one processes in background
```

---

## 3. FRONTEND STRUCTURE - Email Notification Flow

### HTML Structure
**File**: `/Users/ryanhaines/Desktop/Lipton Webserver/index.html` (lines ~3300-3350)

```html
<!-- Email Notification Modal -->
<div id="emailNotificationModal" class="modal">
    <div class="modal-content confirmation-modal">
        <div class="modal-header">
            <i class="fas fa-envelope-open-text" style="color: #00AEEF; font-size: 2rem;"></i>
            <h2>Email Notifications?</h2>
            <p>Would you like to receive an email when your documents are processed?</p>
        </div>
        <div class="modal-body">
            <div class="confirmation-note">
                <i class="fas fa-info-circle"></i>
                <span>This is optional. Enter an email address to get a notification when processing is complete.</span>
            </div>
            <form id="emailNotificationForm">
                <div class="form-group">
                    <label for="notification-name-input">Name (Optional):</label>
                    <input type="text" id="notification-name-input" name="notification-name" 
                           placeholder="Your name" maxlength="100">
                </div>
                <div class="form-group">
                    <label for="notificationEmailInput">Email Address (Optional):</label>
                    <input type="email" id="notificationEmailInput" name="notificationEmail" 
                           placeholder="your.email@example.com" maxlength="255">
                    <div id="notificationEmailError" class="error-message" style="display: none;"></div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="skipEmailNotification()">
                Skip for Now
            </button>
            <button type="button" class="btn btn-primary" onclick="submitEmailNotification()">
                <i class="fas fa-paper-plane"></i> Submit with Email
            </button>
        </div>
    </div>
</div>
```

### JavaScript Functions
**File**: `/Users/ryanhaines/Desktop/Lipton Webserver/js/form-submission.js` (lines 103-167)

Key functions:
```javascript
showEmailNotificationModal()     // Show modal after confirmation
closeEmailNotificationModal()    // Close modal
skipEmailNotification()          // User skips email → submitForm(null, false)
submitEmailNotification()        // User provides email → submitForm(email, true, name)
submitForm(email, optedIn, name) // Main submission handler
```

Email validation:
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (email && !emailRegex.test(email)) {
    alert('Please enter a valid email address');
    return;
}
```

### Form Submission Metadata
Data sent to backend includes:
```javascript
data.notificationEmail = notificationEmail;      // Email address or null
data.notificationEmailOptIn = optedIn;          // Boolean
data.notificationName = notificationName;        // Name or null
```

---

## 4. BACKEND SERVICES & ENDPOINTS

### Primary Express Server
**File**: `/Users/ryanhaines/Desktop/Lipton Webserver/server.js`
**Port**: 3000 (default)

#### Active Endpoints:

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| POST | `/api/form-entries` | Submit form | Yes (production) |
| GET | `/api/form-entries` | List all submissions | Yes (production) |
| DELETE | `/api/form-entries/:id` | Delete form | Yes (production) |
| GET | `/health` | Health check | No |
| GET | `/health/detailed` | Detailed health | No |
| GET | `/api/pipeline-status/:caseId` | Get pipeline progress | Yes |
| POST | `/api/pipeline-retry/:caseId` | Retry pipeline | Yes |
| GET | `/metrics` | Prometheus metrics | No |

#### Email Data in Database

**Table**: `cases`
```sql
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    property_address VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    filing_location VARCHAR(255),
    internal_name VARCHAR(255),
    form_name VARCHAR(255),
    raw_payload JSONB,                  -- Full form submission (includes notificationEmail)
    is_active BOOLEAN DEFAULT true,
    submitter_name VARCHAR(255),        -- From notificationName or 'Anonymous'
    submitter_email VARCHAR(255),       -- From notificationEmail or ''
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Query in server.js (lines 1423-1443)**:
```javascript
INSERT INTO cases (
    property_address, city, state, zip_code, county, filing_location,
    internal_name, form_name, raw_payload, is_active, submitter_name, submitter_email
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id
```

Parameters:
- `$11`: `rawPayload.notificationName || 'Anonymous'`
- `$12`: `rawPayload.notificationEmail || ''`

---

## 5. DROPBOX INTEGRATION

### Configuration
**File**: `/Users/ryanhaines/Desktop/Lipton Webserver/.env.example`

```env
# Dropbox Configuration
DROPBOX_ACCESS_TOKEN=                    # OAuth token from Dropbox Apps
DROPBOX_ENABLED=false                    # Currently disabled
DROPBOX_BASE_PATH=/Apps/LegalFormApp    # Base folder in Dropbox
LOCAL_OUTPUT_PATH=/output               # Local mirroring directory
CONTINUE_ON_DROPBOX_FAILURE=true         # Don't fail submission if upload fails
```

### Folder Structure
When documents are generated, the system creates:
```
Dropbox Root
└── /Apps/LegalFormApp/
    └── /[Street Address]/        <-- Organized by property address
        ├── form-entry-[id].json
        └── generated-documents/
            ├── Complaint.pdf
            ├── Proof-of-Service.pdf
            └── ... (up to 32 documents)
```

### Services Module
**File**: `/Users/ryanhaines/Desktop/Lipton Webserver/server/services/storage-service.js`

Handles:
- File persistence to Cloud Storage or local filesystem
- Metadata tagging
- Public link generation (if needed)

---

## 6. DATABASE SCHEMA

### Core Tables
```sql
-- Cases (primary table)
cases {
    id: integer (PRIMARY KEY),
    property_address: varchar(255),
    city: varchar(100),
    state: char(2),
    zip_code: varchar(10),
    county: varchar(100),
    filing_location: varchar(255),
    internal_name: varchar(255),
    form_name: varchar(255),
    raw_payload: jsonb,           -- Full form submission (includes notificationEmail)
    is_active: boolean,
    submitter_name: varchar(255), -- Email notification metadata
    submitter_email: varchar(255),-- Email notification metadata
    created_at: timestamp,
    updated_at: timestamp
}

-- Parties (plaintiffs/defendants)
parties {
    id: integer (PRIMARY KEY),
    case_id: integer (FOREIGN KEY),
    party_type: enum ('plaintiff', 'defendant'),
    party_number: integer,
    first_name: varchar(100),
    last_name: varchar(100),
    full_name: varchar(255),
    plaintiff_type: varchar(50),
    age_category: varchar(50),
    is_head_of_household: boolean,
    unit_number: varchar(20)
}

-- Issue categories & selections
issue_categories {
    id: integer (PRIMARY KEY),
    category_code: varchar(50),  -- 'electrical', 'plumbing', etc.
    category_name: varchar(255),
    description: text
}

issue_options {
    id: integer (PRIMARY KEY),
    category_id: integer (FOREIGN KEY),
    option_name: varchar(255),   -- 'Broken locks', 'Mold', etc.
    order_index: integer
}

party_issue_selections {
    id: integer (PRIMARY KEY),
    party_id: integer (FOREIGN KEY),
    issue_option_id: integer (FOREIGN KEY)
}
```

---

## 7. ENVIRONMENT VARIABLES

### Required for Email Notification Feature
```env
# No email service variables currently configured
# Application stores email locally in:
# 1. cases.submitter_email (PostgreSQL)
# 2. raw_payload.notificationEmail (PostgreSQL JSONB)
# 3. form-entry-{id}.json (File storage)
```

### Optional Email Service Variables (to be added)
```env
# Email Service Configuration (Future)
EMAIL_PROVIDER=sendgrid|aws-ses|mailgun|smtp
SENDGRID_API_KEY=                         # If using SendGrid
AWS_SES_REGION=us-east-1                  # If using AWS SES
AWS_ACCESS_KEY_ID=                        # If using AWS SES
AWS_SECRET_ACCESS_KEY=                    # If using AWS SES
MAILGUN_DOMAIN=                           # If using Mailgun
MAILGUN_API_KEY=                          # If using Mailgun
SMTP_HOST=                                # If using SMTP
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM_ADDRESS=notifications@liptonlegal.com
EMAIL_FROM_NAME=Lipton Legal
```

---

## 8. CURRENT DEPENDENCIES

### npm Dependencies (package.json)
```json
{
  "@google-cloud/storage": "^7.7.0",
  "axios": "^1.12.2",              // HTTP client for Python API calls
  "compression": "^1.8.1",         // Gzip compression
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "dropbox": "^10.34.0",           // Dropbox API integration
  "eventsource": "^4.0.0",         // Server-Sent Events (SSE)
  "express": "^4.18.2",
  "morgan": "^1.10.0",             // HTTP request logger
  "pg": "^8.16.3",                 // PostgreSQL client
  "prom-client": "^15.1.3",        // Prometheus metrics
  "response-time": "^2.3.4",
  "winston": "^3.18.3",            // Structured logging
  "winston-daily-rotate-file": "^5.0.0"
}
```

### No Email Libraries Currently Installed
- **nodemailer** (not installed) - would add SMTP/Transactional support
- **sendgrid** (not installed) - would add SendGrid integration
- **aws-sdk** (not installed) - would add AWS SES support

---

## 9. FORM SUBMISSION DATA FLOW - Complete Example

### What Gets Stored:

#### 1. In PostgreSQL (cases table)
```javascript
{
    submitter_name: "John Doe",           // From email modal
    submitter_email: "john@example.com",  // From email modal
    raw_payload: {
        // ... entire form submission including:
        notificationEmail: "john@example.com",
        notificationEmailOptIn: true,
        notificationName: "John Doe",
        // ... all form fields
    }
}
```

#### 2. In File Storage (form-entry-{id}.json)
```json
{
    "Form": { ... },
    "PlaintiffDetails": [ ... ],
    "DefendantDetails2": [ ... ],
    "Full_Address": { ... },
    "NotificationEmail": "john@example.com",
    "NotificationEmail Opt-In": true,
    "serverTimestamp": "2025-10-24T...",
    // ... all transformed form data
}
```

#### 3. In Dropbox (if enabled)
```
/Apps/LegalFormApp/
├── 123 Main Street/
│   ├── form-entry-{uuid}.json
│   └── generated-documents/
│       ├── Complaint.pdf
│       ├── Proof-of-Service.pdf
│       └── ... (up to 32 documents)
```

---

## 10. AUTHENTICATION & SECURITY

### Token-Based Authentication
**Header**: `Authorization: Bearer {token}`
**Query**: `?token={token}`

### Static Assets Bypass Auth
These extensions skip authentication:
- `.js, .css, .png, .jpg, .jpeg, .gif, .svg, .ico, .woff, .woff2, .ttf, .eot, .otf, .webp, .map`

### Health Checks Bypass Auth
- `/health`
- `/health/detailed`
- `/metrics` (Prometheus)

---

## IMPLEMENTATION CHECKLIST

### Current State
- [x] Email is collected in frontend modal
- [x] Email stored in database (submitter_email field)
- [x] Email stored in raw_payload (notificationEmail field)
- [ ] Email service integration (NO EMAIL IS ACTUALLY SENT YET)

### Required for Implementation
1. [ ] Add email service package (nodemailer, SendGrid, AWS SES, or Mailgun)
2. [ ] Configure email provider credentials in .env
3. [ ] Create email service module (email-service.js)
4. [ ] Create email templates (HTML email templates)
5. [ ] Add email sending on pipeline completion
6. [ ] Add email queue/retry logic for reliability
7. [ ] Update frontend with delivery confirmation
8. [ ] Add test email functionality
9. [ ] Implement unsubscribe mechanism
10. [ ] Add email delivery logging/metrics

### Files Requiring Changes
- `package.json` - add email service library
- `server.js` - add email sending after pipeline completes (in callNormalizationPipeline())
- `.env` and `.env.example` - add email service configuration
- New file: `email-service.js` - email sending logic with retry/queue
- New file: `email-templates.js` - HTML email templates
- `index.html` - email confirmation modal (ALREADY EXISTS)
- `monitoring/metrics.js` - add email metrics (sent, failed, bounced)
- `monitoring/logger.js` - add email event logging

---

## KEY INTEGRATION POINTS

### Where Email Should Be Sent
**Location**: `server.js`, in the `callNormalizationPipeline()` function around line 1330

When the pipeline completes successfully:
```javascript
if (pipelineResult.success) {
    // SUCCESS - Send email notification here
    if (rawPayload.notificationEmail && rawPayload.notificationEmailOptIn) {
        await emailService.sendCompletionNotification({
            email: rawPayload.notificationEmail,
            name: rawPayload.notificationName,
            caseId: caseId,
            documentCount: pipelineResult.documentCount,
            downloadUrl: generateShareLink(caseId)
        });
    }
}
```

### Where to Get Recipient Email
```javascript
// From database (cases table)
const case = await pool.query('SELECT submitter_email FROM cases WHERE id = $1', [caseId]);
const recipientEmail = case.rows[0].submitter_email;

// Or from the form data passed to the function
const recipientEmail = rawPayload.notificationEmail;

// Or from the raw_payload stored in database
const caseData = await pool.query('SELECT raw_payload FROM cases WHERE id = $1', [caseId]);
const recipientEmail = caseData.rows[0].raw_payload.notificationEmail;
```

---

## DOCUMENTATION NOTES

This document describes the complete architecture for implementing email notifications in the Lipton Legal Forms application. The groundwork is already in place - the frontend collects email addresses and the backend stores them. What remains is to integrate an email service and add the logic to send transactional notifications when document generation completes.

The application uses a clean separation of concerns with the email notification flow integrated into the existing form submission and document generation pipeline. This ensures that emails are only sent when documents are actually ready, and provides a good user experience with non-blocking form submission.


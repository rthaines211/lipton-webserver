# Architecture Diagrams - Email Notification Feature

## 1. Form Submission Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Browser)                                 │
│                                                                             │
│  User fills form                                                            │
│         ↓                                                                   │
│  Clicks "Submit Form" → showReviewScreen()                                  │
│         ↓                                                                   │
│  ┌─────────────────────────────┐                                           │
│  │ confirmationModal            │  (Shows summary of data)                  │
│  │ - Plaintiffs/Defendants      │                                           │
│  │ - Address                    │                                           │
│  │ - Issues selected            │                                           │
│  └─────────────────────────────┘                                           │
│         ↓                                                                   │
│  User clicks "Confirm & Submit"                                            │
│         ↓                                                                   │
│  ┌─────────────────────────────────────────────┐                           │
│  │ emailNotificationModal  ← EMAIL COLLECTION  │                           │
│  │ ┌─────────────────────────────────────────┐ │                           │
│  │ │ Name: [________________]                │ │                           │
│  │ │ Email: [________________@______.com]    │ │                           │
│  │ │                                         │ │                           │
│  │ │ [Skip for Now] [Submit with Email]     │ │                           │
│  │ └─────────────────────────────────────────┘ │                           │
│  └─────────────────────────────────────────────┘                           │
│         ↓                                                                   │
│  submitForm(email, optedIn, name)                                           │
│         ↓                                                                   │
│  POST /api/form-entries                                                     │
│       {                                                                     │
│         id: "uuid",                                                         │
│         notificationEmail: "user@example.com",                              │
│         notificationEmailOptIn: true,                                       │
│         notificationName: "John Doe",                                       │
│         ... all form data ...                                               │
│       }                                                                     │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │
                       │ HTTP POST
                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Node.js)                                  │
│                      POST /api/form-entries                                 │
│                                                                             │
│  1. VALIDATION (10%)                                                        │
│     ├─ Check required fields                                                │
│     └─ Create temp case ID for tracking                                     │
│                                                                             │
│  2. DATA TRANSFORMATION (20%)                                               │
│     ├─ transformFormData() → Structured JSON                                │
│     └─ revertToOriginalFormat() → Human-readable keys/values                │
│                                                                             │
│  3. FILE STORAGE (30%)                                                      │
│     ├─ Save to Google Cloud Storage (production)                            │
│     └─ Filename: form-entry-{id}.json                                       │
│                                                                             │
│  4. DATABASE STORAGE (40%)                                                  │
│     └─ INSERT INTO cases (                                                  │
│           property_address,                                                 │
│           submitter_name: "John Doe",         ← FROM EMAIL MODAL            │
│           submitter_email: "user@example.com", ← FROM EMAIL MODAL           │
│           raw_payload: { ... notificationEmail ... }                        │
│         )                                                                   │
│         RETURNING id → dbCaseId                                             │
│                                                                             │
│  5. IMMEDIATE RESPONSE (Non-blocking)                                       │
│     └─ HTTP 201 {                                                           │
│          success: true,                                                     │
│          dbCaseId: 12345,                                                   │
│          pipelineEnabled: true                                              │
│        }                                                                    │
│                                                                             │
│  6. BACKGROUND PIPELINE (40-100%)                                           │
│     ├─ callNormalizationPipeline(formData, dbCaseId)                        │
│     ├─ POST to Python API /api/normalize                                    │
│     ├─ Poll /api/progress/{caseId} every 2s                                 │
│     └─ Update pipeline status cache                                         │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │ Response 201
                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Browser)                                 │
│                                                                             │
│  handleSubmissionSuccess(result)                                            │
│       ↓                                                                     │
│  Form resets immediately                                                    │
│       ↓                                                                     │
│  Show success message with case ID                                          │
│       ↓                                                                     │
│  (If pipelineEnabled) Create SSE connection for progress tracking           │
│       ↓                                                                     │
│  User can start new submission while background processing continues       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Document Generation & Email Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 BACKGROUND PIPELINE EXECUTION (Node.js)                     │
│                        callNormalizationPipeline()                          │
│                                                                             │
│  Python FastAPI Server                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                  /api/normalize (5-phase pipeline)               │       │
│  │                                                                   │       │
│  │  1. Phase 1: Data Validation                                     │       │
│  │  2. Phase 2: Field Normalization                                 │       │
│  │  3. Phase 3: Template Matching                                   │       │
│  │  4. Phase 4: Document Generation (32 documents)                  │       │
│  │  5. Phase 5: Document Assembly/Upload                            │       │
│  │                                                                   │       │
│  │  Progress Polling: /api/progress/{caseId}                        │       │
│  │  Response: { total: 32, completed: 15, current_doc: "..." }      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Pipeline Completion Check                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ if (pipelineResult.success) {                                    │       │
│  │                                                                   │       │
│  │   // ← EMAIL NOTIFICATION POINT (TO BE IMPLEMENTED)             │       │
│  │   if (submitter_email && optedIn) {                              │       │
│  │     await emailService.sendCompletionNotification({              │       │
│  │       to: submitter_email,                                       │       │
│  │       name: submitter_name,                                      │       │
│  │       caseId: dbCaseId,                                          │       │
│  │       documentCount: 32,                                         │       │
│  │       downloadLink: generateDropboxShareLink(caseId)             │       │
│  │     });                                                           │       │
│  │   }                                                               │       │
│  │ }                                                                 │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Store Completion Status in Cache                                          │
│  └─ setPipelineStatus(caseId, {                                            │
│       status: 'completed',                                                  │
│       progress: 100,                                                        │
│       documentCount: 32,                                                    │
│       completionTime: now()                                                 │
│     })                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
              │
              │ SSE Event or Polling Result
              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FRONTEND (Browser) - Progress Tracking                      │
│                    Polling /api/pipeline-status/:caseId                    │
│                                                                             │
│  Progress Updates                                                           │
│  ├─ 10%: Saving form...                                                     │
│  ├─ 20%: Connecting to database...                                          │
│  ├─ 40%: Starting pipeline...                                               │
│  ├─ 60%: Generating documents (15/32)...                                    │
│  ├─ 85%: Final document assembly...                                         │
│  └─ 100%: ✓ Completed!                                                      │
│                                                                             │
│  When Complete:                                                             │
│  ├─ Hide progress indicator                                                 │
│  ├─ Show completion notification                                            │
│  └─ Display document download links (if Dropbox enabled)                   │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              │ Email delivery happens asynchronously
              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EMAIL SERVICE (Node.js)                                │
│                                                                             │
│  Send Email Notification                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ To: user@example.com                                             │       │
│  │ Subject: Your legal documents are ready                          │       │
│  │                                                                   │       │
│  │ Email Content:                                                   │       │
│  │ ─────────────────────────────────────────────────────────────    │       │
│  │ Dear John Doe,                                                   │       │
│  │                                                                   │       │
│  │ Your document generation has completed successfully!             │       │
│  │                                                                   │       │
│  │ Case ID: 12345                                                   │       │
│  │ Property: 123 Main Street                                        │       │
│  │ Documents Generated: 32                                          │       │
│  │                                                                   │       │
│  │ [Download Documents] (Dropbox link)                              │       │
│  │ [View Case Details] (Portal link)                                │       │
│  │                                                                   │       │
│  │ Processing Time: 15 minutes                                      │       │
│  │                                                                   │       │
│  │ Questions? Reply to this email or contact support.               │       │
│  │                                                                   │       │
│  │ Best regards,                                                    │       │
│  │ The Lipton Legal Team                                            │       │
│  │ ─────────────────────────────────────────────────────────────    │       │
│  │                                                                   │       │
│  │ Email Provider: SendGrid / AWS SES / Mailgun / SMTP              │       │
│  │ Status: Sent / Queued / Failed (with retry)                      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Delivery Tracking                                                          │
│  ├─ Log: email_id, recipient, status, timestamp                            │
│  ├─ Retry Failed Emails (exponential backoff)                              │
│  ├─ Track Opens/Clicks (if enabled)                                        │
│  └─ Update Metrics (emails_sent, emails_failed, etc.)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Storage Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       STORAGE LAYERS                                         │
│                                                                              │
│  PostgreSQL Database                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ cases TABLE                                                             │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │ │ id: 12345                                                       │   │  │
│  │ │ property_address: "123 Main Street"                             │   │  │
│  │ │ city: "Los Angeles"                                             │   │  │
│  │ │ state: "CA"                                                     │   │  │
│  │ │ zip_code: "90001"                                               │   │  │
│  │ │ submitter_name: "John Doe"          ← EMAIL NOTIFICATION DATA  │   │  │
│  │ │ submitter_email: "john@example.com" ← EMAIL NOTIFICATION DATA  │   │  │
│  │ │ raw_payload: {                      ← FULL FORM SUBMISSION     │   │  │
│  │ │   id: "uuid-...",                                               │   │  │
│  │ │   notificationEmail: "john@example.com",                        │   │  │
│  │ │   notificationEmailOptIn: true,                                 │   │  │
│  │ │   notificationName: "John Doe",                                 │   │  │
│  │ │   plaintiff-1-first-name: "John",                               │   │  │
│  │ │   plaintiff-1-last-name: "Doe",                                 │   │  │
│  │ │   ... all 100+ form fields ...                                  │   │  │
│  │ │ }                                                               │   │  │
│  │ │ created_at: "2025-10-24T10:30:00Z"                             │   │  │
│  │ └─────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Google Cloud Storage (GCS)                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Bucket: docmosis-tornado-form-submissions (production)                  │  │
│  │                                                                          │  │
│  │ form-entry-uuid-12345.json                                              │  │
│  │ {                                                                        │  │
│  │   "Form": { ... },                                                       │  │
│  │   "PlaintiffDetails": [ ... ],                                           │  │
│  │   "DefendantDetails2": [ ... ],                                          │  │
│  │   "Full_Address": { ... },                                               │  │
│  │   "NotificationEmail": "john@example.com",     ← EMAIL                  │  │
│  │   "NotificationEmail Opt-In": true,            ← EMAIL                  │  │
│  │   "serverTimestamp": "2025-10-24T10:30:00Z",                            │  │
│  │   ... all transformed form data ...                                      │  │
│  │ }                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Dropbox (If Enabled)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ /Apps/LegalFormApp/                                                     │  │
│  │ └── 123 Main Street/                ← Organized by property address     │  │
│  │     ├── form-entry-uuid-12345.json  ← Form backup                       │  │
│  │     └── generated-documents/                                            │  │
│  │         ├── Complaint.pdf                                               │  │
│  │         ├── Proof-of-Service.pdf                                        │  │
│  │         ├── Discovery-Requests.pdf                                      │  │
│  │         └── ... (up to 32 documents)                                    │  │
│  │                                                                          │  │
│  │ Shared Link:                                                            │  │
│  │ https://www.dropbox.com/sh/abc123xyz...                                │  │
│  │ (Can be sent in email notification)                                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Local Filesystem (Development Only)                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ /data/form-entry-uuid-12345.json                                        │  │
│  │ /output/123-Main-Street/form-entry-uuid-12345.json                     │  │
│  │ /output/123-Main-Street/generated-documents/*.pdf                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Email Notification Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMAIL NOTIFICATION IMPLEMENTATION                        │
│                                                                             │
│  server.js - callNormalizationPipeline() function                          │
│  Line ~1330-1350                                                            │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ const pipelinePromise = axios.post(                               │    │
│  │   `${PIPELINE_CONFIG.apiUrl}/api/normalize`,                      │    │
│  │   structuredData                                                   │    │
│  │ );                                                                 │    │
│  │                                                                    │    │
│  │ // When promise resolves or rejects:                              │    │
│  │ pipelinePromise                                                   │    │
│  │   .then(async (response) => {                                     │    │
│  │     if (response.data.success) {                                  │    │
│  │       // ← SEND EMAIL HERE                                        │    │
│  │       if (structuredData.raw_payload?.notificationEmail) {        │    │
│  │         try {                                                      │    │
│  │           const emailResult = await emailService.sendNotification({    │
│  │             to: structuredData.raw_payload.notificationEmail,     │    │
│  │             name: structuredData.raw_payload.notificationName,    │    │
│  │             caseId: caseId,                                       │    │
│  │             status: 'success',                                    │    │
│  │             documentCount: response.data.documentCount || 32      │    │
│  │           });                                                      │    │
│  │           console.log('✉️  Email sent:', emailResult);            │    │
│  │         } catch (emailError) {                                     │    │
│  │           console.error('⚠️  Email send failed:', emailError);    │    │
│  │           // Don't fail the pipeline if email fails               │    │
│  │         }                                                           │    │
│  │       }                                                             │    │
│  │     }                                                               │    │
│  │   })                                                                │    │
│  │   .catch(async (error) => {                                       │    │
│  │     // SEND FAILURE EMAIL                                         │    │
│  │     if (structuredData.raw_payload?.notificationEmail) {          │    │
│  │       await emailService.sendNotification({                       │    │
│  │         to: structuredData.raw_payload.notificationEmail,         │    │
│  │         name: structuredData.raw_payload.notificationName,        │    │
│  │         caseId: caseId,                                           │    │
│  │         status: 'failed',                                         │    │
│  │         error: error.message                                      │    │
│  │       });                                                           │    │
│  │     }                                                               │    │
│  │   });                                                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Required Files to Create                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 1. email-service.js                                                │    │
│  │    ├─ Handles email provider initialization                        │    │
│  │    ├─ sendNotification(options) method                             │    │
│  │    ├─ Retry logic with exponential backoff                         │    │
│  │    ├─ Fallback to alternative provider if primary fails            │    │
│  │    └─ Email delivery tracking & logging                            │    │
│  │                                                                     │    │
│  │ 2. email-templates.js                                              │    │
│  │    ├─ getCompletionEmail(options) - Success template              │    │
│  │    ├─ getFailureEmail(options) - Failure template                 │    │
│  │    ├─ HTML templates with Lipton Legal branding                   │    │
│  │    └─ Responsive email design (mobile-friendly)                   │    │
│  │                                                                     │    │
│  │ 3. Update package.json                                             │    │
│  │    └─ Add "nodemailer": "^6.9.0" (or SendGrid/AWS SES)            │    │
│  │                                                                     │    │
│  │ 4. Update .env.example                                             │    │
│  │    ├─ EMAIL_PROVIDER=sendgrid                                      │    │
│  │    ├─ SENDGRID_API_KEY=                                            │    │
│  │    ├─ EMAIL_FROM_ADDRESS=notifications@liptonlegal.com            │    │
│  │    └─ EMAIL_FROM_NAME=Lipton Legal                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Module Dependency Diagram

```
                           index.html
                             │
                ┌────────────┼────────────┐
                ↓            ↓            ↓
          form-submission  sse-client  party-management
          .js              .js         .js
                │            │            │
                └────────────┼────────────┘
                             ↓
                    /api/form-entries (POST)
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
    PostgreSQL        Google Cloud        File System
    (cases table)      Storage             (/data or GCS)
                       (form data)         (form-entry-X.json)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                       server.js
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
  Data Transform      DB Storage           File Storage
  (transform-         (saveToDatabase)      (saveFormData)
   FormData)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                callNormalizationPipeline()
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   Python API         Progress Polling      Status Cache
   /api/normalize     /api/progress          (setPipelineStatus)
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
            (NEW) email-service    Dropbox
            .js                    (optional)
                    │
              ┌─────┴─────┐
              ↓           ↓
         Email Template  Email Provider
         .js             (SendGrid/AWS SES)
```

---

## 6. State Transitions

```
Form Submission State Machine:

┌─────────────┐
│  IDLE       │ User hasn't submitted
└──────┬──────┘
       │ Submit clicked
       ↓
┌─────────────────┐
│ CONFIRMATION    │ Review data modal shown
└──────┬──────────┘
       │ Confirm clicked
       ↓
┌──────────────────────┐
│ EMAIL_COLLECTION     │ Email modal shown
└──────┬───────────────┘
       │ Email submitted or skipped
       ↓
┌──────────────────────┐
│ SUBMITTING           │ Sending to server
└──────┬───────────────┘
       │ Server responds
       ↓
┌──────────────────────┐
│ SUBMITTED            │ Form saved to DB
└──────┬───────────────┘
       │ Form resets immediately
       ↓
┌──────────────────────┐
│ RESET_READY          │ Ready for new submission
└──────┬───────────────┘
       │ (Meanwhile, pipeline runs in background)
       ↓
┌──────────────────────┐
│ PROCESSING           │ Documents being generated
│ (Background)         │ Progress: 40% → 100%
└──────┬───────────────┘
       │ Pipeline completes
       ↓
┌──────────────────────┐
│ DOCUMENTS_READY      │ All 32 documents ready
└──────┬───────────────┘
       │ Email sending triggers
       ↓
┌──────────────────────┐
│ EMAIL_SENT           │ Notification delivered
└──────────────────────┘
```


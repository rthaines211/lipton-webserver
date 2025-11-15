# SSE Integration for PDF Generation

**Tasks Complete**: T025-T027
**Status**: Phase 2 Foundational Infrastructure - COMPLETE ✅

---

## Overview

Created a centralized SSE (Server-Sent Events) service that extends the existing pipeline SSE system to support PDF generation progress notifications.

### Architecture

The SSE service uses **namespaces** to separate different features:
- `pipeline`: Python normalization pipeline progress (existing)
- `pdf`: PDF generation and Dropbox upload progress (new)

---

## Implementation

### Created File: `server/services/sse-service.js`

**Features**:
- ✅ Multi-namespace status cache (in-memory)
- ✅ Auto-expiration (15 minutes TTL)
- ✅ Automatic cleanup of expired entries
- ✅ Connection management with heartbeats
- ✅ Force-flush to prevent buffering issues
- ✅ Graceful client disconnect handling

**Core Functions**:

```javascript
// Update status (called by PDF service during generation)
updateStatus('pdf', jobId, {
  status: 'processing',
  phase: 'generating',
  progress: 50,
  message: 'Filling PDF fields...'
});

// Get status (for HTTP polling if needed)
const status = getStatus('pdf', jobId);

// Setup SSE connection (in route handler)
const connection = setupSSEConnection(req, res, 'pdf', jobId);
```

---

## Usage Example: PDF Generation Progress

### 1. PDF Service Updates Status

```javascript
// server/services/pdf-service.js
const { updateStatus } = require('./sse-service');

async function generatePDF(formSubmissionId) {
  const jobId = `pdf-${formSubmissionId}`;

  try {
    // Update: Starting
    updateStatus('pdf', jobId, {
      status: 'processing',
      phase: 'mapping',
      progress: 10,
      message: 'Mapping form data to PDF fields...'
    });

    // Map fields
    const pdfFields = mapFormDataToPdfFields(formData);

    // Update: Generating
    updateStatus('pdf', jobId, {
      status: 'processing',
      phase: 'generating',
      progress: 40,
      message: 'Generating PDF document...'
    });

    // Generate PDF
    const pdfBytes = await fillPDFTemplate(pdfFields);

    // Update: Uploading
    updateStatus('pdf', jobId, {
      status: 'processing',
      phase: 'uploading',
      progress: 75,
      message: 'Uploading to Dropbox...'
    });

    // Upload to Dropbox
    const dropboxResult = await uploadToDropbox(pdfBytes);

    // Update: Complete
    updateStatus('pdf', jobId, {
      status: 'success',
      phase: 'complete',
      progress: 100,
      message: 'PDF generated successfully',
      result: {
        dropboxFileId: dropboxResult.id,
        dropboxFilePath: dropboxResult.path,
        filename: dropboxResult.name
      }
    });

  } catch (error) {
    // Update: Failed
    updateStatus('pdf', jobId, {
      status: 'failed',
      phase: 'error',
      progress: 0,
      message: 'PDF generation failed',
      error: error.message
    });
  }
}
```

### 2. Route Handler for SSE Connection

```javascript
// server/routes/pdf-routes.js (or server.js)
const { setupSSEConnection } = require('../services/sse-service');

/**
 * GET /api/pdf/jobs/:jobId/stream
 *
 * SSE endpoint for real-time PDF generation progress
 */
app.get('/api/pdf/jobs/:jobId/stream', (req, res) => {
  const { jobId } = req.params;

  // Setup SSE connection with 'pdf' namespace
  setupSSEConnection(req, res, 'pdf', jobId);
});
```

### 3. Frontend Client Connection

```javascript
// js/pdf-progress-monitor.js
const eventSource = new EventSource(`/api/pdf/jobs/pdf-${formSubmissionId}/stream`);

eventSource.addEventListener('open', (e) => {
  const data = JSON.parse(e.data);
  console.log('Connected to PDF generation stream', data);
});

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Progress: ${data.progress}%`, data.message);

  // Update UI
  updateProgressBar(data.progress);
  updateStatusMessage(data.message);
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  console.log('PDF generation complete!', data.result);

  // Show success message and download link
  showSuccessMessage(data.result);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  const data = JSON.parse(e.data);
  console.error('PDF generation failed:', data.error);

  // Show error message
  showErrorMessage(data.error);
  eventSource.close();
});
```

---

## Progress Phases for PDF Generation

Recommended phases for PDF generation workflow:

| Phase | Progress % | Description |
|-------|-----------|-------------|
| `pending` | 0% | Job created, waiting to start |
| `mapping` | 10-30% | Mapping form data to PDF fields |
| `generating` | 30-60% | Filling PDF template with data |
| `uploading` | 60-90% | Uploading to Dropbox |
| `complete` | 100% | Successfully completed |
| `error` | 0% | Failed at any stage |

---

## Coordination with Python Pipeline

The SSE service uses **separate namespaces** for different features:

```javascript
// Pipeline progress (existing)
updateStatus('pipeline', caseId, { ... });
const pipelineStatus = getStatus('pipeline', caseId);

// PDF progress (new)
updateStatus('pdf', jobId, { ... });
const pdfStatus = getStatus('pdf', jobId);
```

This allows both systems to operate independently with their own:
- Status tracking
- Progress updates
- SSE connections
- Cache expiration

**No conflicts** between pipeline and PDF generation.

---

## SSE Message Format

All SSE messages follow this format:

```
event: progress
data: {"jobId":"pdf-123","status":"processing","phase":"generating","progress":50,"message":"Filling PDF fields..."}
```

**Event Types**:
- `open`: Connection established
- `progress`: Progress update (status: pending/processing)
- `complete`: Job completed successfully (status: success)
- `error`: Job failed (status: failed)

**Data Fields**:
```javascript
{
  jobId: string,           // Job identifier
  status: string,          // pending, processing, success, failed
  phase: string,           // Current phase (mapping, generating, uploading, etc.)
  progress: number,        // 0-100
  message: string,         // Human-readable status message
  error: string | null,    // Error message if failed
  result: object | null    // Result data if completed
}
```

---

## Cache Management

**Auto-Expiration**:
- All status entries expire after 15 minutes
- Automatic cleanup runs every 5 minutes
- Prevents memory leaks from abandoned jobs

**Manual Cleanup**:
```javascript
const { deleteStatus, cleanupExpiredEntries } = require('./services/sse-service');

// Delete specific job
deleteStatus('pdf', jobId);

// Force cleanup of all expired entries
const cleanedCount = cleanupExpiredEntries();
```

---

## Connection Management

**Heartbeats**:
- Sent every 15 seconds to keep connection alive
- Prevents proxy/firewall timeouts
- Format: `:heartbeat\n\n` (SSE comment)

**Force Flush**:
- All messages are force-flushed immediately
- Prevents Node.js buffering issues
- Uses `res.flush()` and socket uncork/cork

**Client Disconnect**:
- Automatically detected via `req.on('close')`
- Cleans up intervals and closes connection gracefully
- Logs disconnect for monitoring

---

## Testing

**Manual Test**:
```bash
# Connect to SSE stream
curl -N http://localhost:3000/api/pdf/jobs/pdf-123/stream

# In another terminal, trigger PDF generation
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"formSubmissionId": 123}'
```

**Expected Output**:
```
event: open
data: {"status":"connected","jobId":"pdf-123","namespace":"pdf"}

event: progress
data: {"jobId":"pdf-123","status":"processing","phase":"mapping","progress":10,...}

event: progress
data: {"jobId":"pdf-123","status":"processing","phase":"generating","progress":40,...}

event: complete
data: {"jobId":"pdf-123","status":"success","phase":"complete","progress":100,...}
```

---

## Integration Checklist

- [x] T025: Created `server/services/sse-service.js`
- [x] T026: Implemented SSE event namespace for PDF generation (`pdf` namespace)
- [x] T027: Coordinated SSE with Python pipeline (separate namespaces, no conflicts)
- [ ] Add SSE route in `server/routes/pdf-routes.js` (Phase 3)
- [ ] Integrate with PDF service during generation (Phase 3)
- [ ] Create frontend SSE client for progress monitoring (Phase 3)
- [ ] Add progress bar UI component (Phase 3)

---

## Next Steps (Phase 3)

1. **Implement PDF Service** (T028-T060):
   - Use SSE service to broadcast progress
   - Call `updateStatus()` at each phase
   - Handle errors with proper SSE notifications

2. **Create SSE Route**:
   - Add `GET /api/pdf/jobs/:jobId/stream` route
   - Use `setupSSEConnection()` helper

3. **Frontend Integration**:
   - Connect EventSource to SSE endpoint
   - Update progress UI in real-time
   - Handle completion/error events

---

**Phase 2 Complete!** ✅

All foundational infrastructure is now in place:
- Database schema ✅
- Model layer ✅
- Field mapper ✅
- SSE service ✅

Ready to begin Phase 3: Core PDF Generation MVP! 🚀

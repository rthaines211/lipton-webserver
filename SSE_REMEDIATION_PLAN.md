# SSE Error Remediation Plan

## Quick Fix Implementation Guide

This document provides step-by-step instructions to fix the SSE parsing error issue.

---

## Priority 1: Immediate Fix (5 minutes)

### Fix the JSON Parsing Error in sse-client.js

**File to Edit:** `/Users/ryanhaines/Desktop/Lipton Webserver/js/sse-client.js`

**Line Numbers:** 179-203

**Current Problem Code:**
```javascript
handleErrorEvent(event) {
    try {
        const data = JSON.parse(event.data); // ← Fails when event.data is undefined
        console.error(`❌ Job failed for ${this.jobId}:`, data);
        // ... rest of error handling
    } catch (error) {
        console.error(`Failed to parse error event for ${this.jobId}:`, error);
    }
}
```

**Replace With:**
```javascript
handleErrorEvent(event) {
    // Check if this is a server-sent error event with data
    if (event.data === undefined || event.data === null) {
        // This is a browser connection error, not a server error event
        // The onerror handler will handle the reconnection logic
        return;
    }

    try {
        const data = JSON.parse(event.data);
        console.error(`❌ Job failed for ${this.jobId}:`, data);

        // Update progress state
        if (typeof markJobFailed === 'function') {
            markJobFailed(this.jobId, data.code, data.message);
        }

        // Show error toast
        if (typeof progressToast !== 'undefined' && progressToast.showError) {
            progressToast.showError(this.jobId, data.code, data.message);
        }

        // Call custom error handler
        if (this.onError) {
            this.onError(data);
        }

        // Close connection after error
        this.close();
    } catch (error) {
        console.error(`Failed to parse server error event for ${this.jobId}:`, error);
        console.error(`Raw event data:`, event.data);
    }
}
```

---

## Priority 2: Stop Unnecessary Reconnections (10 minutes)

### Add Completion Tracking to Prevent Reconnection After Job Completion

**File to Edit:** `/Users/ryanhaines/Desktop/Lipton Webserver/js/sse-client.js`

**Step 1: Add jobCompleted flag to constructor (Line ~32)**

```javascript
constructor(jobId, sseUrl = '') {
    this.jobId = jobId;
    // ... existing properties ...
    this.isDestroyed = false;
    this.jobCompleted = false;  // ← Add this line

    // Event handlers
    this.onProgress = null;
    // ... rest of constructor
}
```

**Step 2: Update handleCompleteEvent method (Line ~148)**

```javascript
handleCompleteEvent(event) {
    try {
        const data = JSON.parse(event.data);
        console.log(`✅ Job completed for ${this.jobId}:`, data);

        // Mark as completed to prevent reconnection
        this.jobCompleted = true;  // ← Add this line

        // Update progress state
        if (typeof markJobComplete === 'function') {
            markJobComplete(this.jobId, data.total, data.outputUrl);
        }

        // ... rest of existing code ...

        // Close connection after completion
        this.close();
    } catch (error) {
        console.error(`Failed to parse completion event for ${this.jobId}:`, error);
    }
}
```

**Step 3: Update handleConnectionError method (Line ~209)**

```javascript
handleConnectionError() {
    this.isConnected = false;

    // Don't reconnect if job is already completed
    if (this.jobCompleted) {
        console.log(`Job ${this.jobId} already completed, not reconnecting`);
        this.clearSilenceTimeout();
        return;
    }

    // Don't reconnect if explicitly destroyed
    if (this.isDestroyed) {
        console.log(`SSE stream for ${this.jobId} is destroyed, not reconnecting`);
        return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`Max reconnection attempts reached for ${this.jobId}`);
        this.showConnectionFailed();
        return;
    }

    // ... rest of existing reconnection logic ...
}
```

---

## Priority 3: Server-Side Enhancement (Optional - 15 minutes)

### Improve Server Response for Missing Job Status

**File to Edit:** `/Users/ryanhaines/Desktop/Lipton Webserver/server.js`

**Line Numbers:** Around 2262-2335

**Current Code:**
```javascript
app.get('/api/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        // ... headers ...
    });

    console.log(`📡 SSE connection established for job: ${jobId}`);

    // Send initial connection event
    res.write('event: open\n');
    res.write(`data: {"status":"connected","jobId":"${jobId}"}\n\n`);

    // Function to send progress updates
    const sendProgress = () => {
        const status = getPipelineStatus(jobId);
        if (status) {
            // ... send status ...
        }
    };
    // ... rest of code ...
});
```

**Enhanced Version:**
```javascript
app.get('/api/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
    });

    console.log(`📡 SSE connection established for job: ${jobId}`);

    // Check if job exists before setting up stream
    const initialStatus = getPipelineStatus(jobId);

    // If no status found, assume job is complete or doesn't exist
    if (!initialStatus) {
        console.log(`📡 No status found for job ${jobId}, sending completion signal`);

        // Send completion event indicating job is done or not found
        res.write('event: complete\n');
        res.write(`data: ${JSON.stringify({
            jobId,
            status: 'complete',
            message: 'Job completed or not found',
            phase: 'complete',
            progress: 100
        })}\n\n`);

        // Close the connection gracefully
        setTimeout(() => {
            res.end();
        }, 100);
        return;
    }

    // Send initial connection event
    res.write('event: open\n');
    res.write(`data: {"status":"connected","jobId":"${jobId}"}\n\n`);

    // ... rest of existing code ...
});
```

---

## Deployment Instructions

### Step 1: Apply the Fixes

```bash
# 1. Navigate to the project directory
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# 2. Create a backup of the original file
cp js/sse-client.js js/sse-client.js.backup

# 3. Apply the fixes to sse-client.js using your editor
# Make the changes described above

# 4. If applying server fix, backup server.js
cp server.js server.js.backup

# 5. Apply server fixes if desired
```

### Step 2: Test Locally

```bash
# 1. Start the server locally
npm start

# 2. Open browser developer console

# 3. Submit a test form

# 4. Monitor console for errors
# - Should NOT see: "Failed to parse error event"
# - Should NOT see rapid reconnection attempts

# 5. Verify job completes successfully
```

### Step 3: Deploy to GCP

```bash
# 1. Build and push the updated container
gcloud builds submit --tag gcr.io/docmosis-tornado/node-server:latest .

# 2. Deploy the new version
gcloud run deploy node-server \
  --image gcr.io/docmosis-tornado/node-server:latest \
  --region us-central1

# 3. Monitor logs after deployment
gcloud run services logs tail node-server --region=us-central1
```

---

## Verification Checklist

After applying the fixes, verify:

- [ ] No "Failed to parse error event" messages in browser console
- [ ] SSE connections don't rapidly open/close after job completion
- [ ] Jobs still complete successfully
- [ ] Progress updates display correctly
- [ ] Error toasts appear for genuine errors
- [ ] Network interruptions are handled gracefully

---

## Rollback Plan

If issues occur after deployment:

```bash
# 1. Restore original files
cp js/sse-client.js.backup js/sse-client.js
cp server.js.backup server.js  # if server was modified

# 2. Rebuild and deploy
gcloud builds submit --tag gcr.io/docmosis-tornado/node-server:rollback .
gcloud run deploy node-server \
  --image gcr.io/docmosis-tornado/node-server:rollback \
  --region us-central1

# 3. Verify rollback successful
curl https://node-server-zyiwmzwenq-uc.a.run.app/health
```

---

## Monitoring After Fix

### Key Metrics to Watch

1. **SSE Connection Duration**
   ```bash
   gcloud logging read \
     'resource.type="cloud_run_revision" AND
      textPayload:("SSE connection established" OR "SSE connection closed")' \
     --project=docmosis-tornado \
     --format="table(timestamp,textPayload)"
   ```

2. **Error Rate**
   ```bash
   gcloud logging read \
     'resource.type="cloud_run_revision" AND
      severity>=ERROR' \
     --project=docmosis-tornado \
     --limit=50
   ```

3. **Client-Side Monitoring**
   Add this to your HTML for temporary monitoring:
   ```javascript
   // Temporary monitoring code
   let sseErrors = 0;
   const originalError = console.error;
   console.error = function(...args) {
       if (args[0]?.includes('Failed to parse')) {
           sseErrors++;
           console.log(`SSE Parse Errors: ${sseErrors}`);
       }
       originalError.apply(console, args);
   };
   ```

---

## Expected Outcome

### Before Fix
- Multiple "Failed to parse error event" messages
- 30+ SSE reconnection attempts per job
- Cluttered browser console

### After Fix
- Zero JSON parsing errors
- Maximum 1-2 SSE connections per job
- Clean browser console
- Reduced server load

---

## Support and Troubleshooting

If issues persist after applying these fixes:

1. Check browser console for new error patterns
2. Review server logs for unusual SSE behavior
3. Test with different browsers (Chrome, Firefox, Safari)
4. Verify CloudFlare/CDN isn't interfering with SSE streams
5. Check Cloud Run instance health and scaling settings

**Test Command for SSE Stream:**
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
  "https://node-server-zyiwmzwenq-uc.a.run.app/api/jobs/test-job/stream" \
  2>&1 | head -20
```

---

## Long-term Improvements

Consider these enhancements for future releases:

1. **Add TypeScript types** for EventSource events
2. **Implement exponential backoff** with jitter for reconnections
3. **Add SSE connection metrics** to monitoring dashboard
4. **Create integration tests** for SSE error scenarios
5. **Document SSE event schemas** in OpenAPI spec
6. **Add circuit breaker pattern** for persistent failures
7. **Implement SSE connection pooling** for multiple jobs

---

## Summary

This remediation plan provides three levels of fixes:

1. **Immediate (5 min):** Fix JSON parsing error - eliminates console errors
2. **Important (10 min):** Prevent unnecessary reconnections - reduces server load
3. **Optional (15 min):** Improve server response - better API design

The fixes are low-risk and backward compatible. No database changes or data migrations are required. The application will continue to function normally during and after the fix deployment.
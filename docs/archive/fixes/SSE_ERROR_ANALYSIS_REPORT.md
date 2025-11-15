# SSE Error Analysis Report

## Executive Summary

**Issue:** SSE (Server-Sent Events) connection is experiencing rapid reconnection cycles with JSON parsing errors in the client-side error handler.

**Severity:** Medium - The application still functions correctly and documents are generated successfully, but this causes unnecessary server load and client-side errors.

**Root Cause:** The SSE connection is closing prematurely when no pipeline status exists in the cache, triggering a browser native error event with undefined data which the client attempts to parse as JSON.

---

## 1. Issue Description

### Symptoms Observed
1. **Console Error:** `Failed to parse error event for 1761167164456-mjw15zwcp: SyntaxError: "undefined" is not valid JSON`
2. **Rapid Reconnection:** SSE connections open and close within 1-2 seconds repeatedly
3. **Despite Errors:** The job completes successfully and documents are generated

### Browser Console Log Analysis
```javascript
sse-client.js?v=1:202 Failed to parse error event for 1761167164456-mjw15zwcp:
SyntaxError: "undefined" is not valid JSON
    at JSON.parse (<anonymous>)
    at JobProgressStream.handleErrorEvent (sse-client.js?v=1:181:31)
    at EventSource.<anonymous> (sse-client.js?v=1:98:18)
```

---

## 2. Root Cause Analysis

### Primary Issue: Mishandling of Browser Error Events

The SSE client code incorrectly assumes that browser-generated error events will have a `data` property with JSON content. In reality:

1. **Browser Error Events:** When the EventSource API encounters a connection error, it fires an error event with `event.data = undefined`
2. **Server Error Events:** When the server sends an error event, it has `event.data` with JSON content

The code at `sse-client.js:179-203` doesn't differentiate between these two types of errors:

```javascript
handleErrorEvent(event) {
    try {
        const data = JSON.parse(event.data); // ❌ event.data is undefined for connection errors
        // ... rest of the code
    } catch (error) {
        console.error(`Failed to parse error event for ${this.jobId}:`, error);
    }
}
```

### Secondary Issue: Premature Connection Closure

The server is closing SSE connections when no pipeline status exists in the cache:

**Server Behavior (server.js:2280-2305):**
1. When a client connects with a job ID, the server checks `getPipelineStatus(jobId)`
2. If no status exists (returns `null`), the connection sends nothing and closes
3. This happens immediately after the job completes and status is removed from cache

**Rapid Reconnection Pattern:**
```
21:06:34 SSE connection established
21:06:35 SSE connection closed (1 second later)
21:06:38 SSE connection established (3 seconds gap - reconnect delay)
21:06:39 SSE connection closed (1 second later)
```

---

## 3. Technical Evidence

### Test Results

**Reproduction Test Output:**
```
✅ SSE connection opened
🔴 Connection error: {
  type: 'error',
  message: undefined,
  code: undefined,
  ...
}
❌ Error event received
  Event type: error
  Event data: undefined    ← Key finding
  Data type: undefined
  ⚠️  WARNING: event.data is undefined!
  Failed to parse: "undefined" is not valid JSON
```

### Code Flow Analysis

1. **Job Completion:** Pipeline finishes, status marked as 'success'
2. **SSE Server:** Sends completion event and closes connection after 1 second
3. **Cache Cleanup:** Status removed from cache
4. **Client Reconnect:** SSE client automatically reconnects (browser behavior)
5. **No Status Found:** Server can't find status in cache, connection closes
6. **Browser Error:** Fires error event with undefined data
7. **Parse Failure:** Client tries to JSON.parse(undefined)
8. **Cycle Repeats:** Until max reconnection attempts reached

---

## 4. Impact Assessment

### Current Impact
- **User Experience:** No functional impact - jobs complete successfully
- **Console Noise:** Multiple error messages clutter developer console
- **Server Load:** Unnecessary connections (30+ reconnections per job)
- **Network Traffic:** Wasted bandwidth from repeated handshakes

### Potential Risks
- **Scalability:** High user volume could overwhelm server with reconnection storms
- **Monitoring:** Real errors might be hidden among false positives
- **Client Performance:** Excessive reconnection attempts consume resources

---

## 5. Recommended Solution

### Fix 1: Properly Handle Browser Error Events (Client-Side)

**File:** `/Users/ryanhaines/Desktop/Lipton Webserver/js/sse-client.js`

**Current Code (Lines 179-203):**
```javascript
handleErrorEvent(event) {
    try {
        const data = JSON.parse(event.data);
        // ... handle server error
    } catch (error) {
        console.error(`Failed to parse error event for ${this.jobId}:`, error);
    }
}
```

**Proposed Fix:**
```javascript
handleErrorEvent(event) {
    // Check if this is a server-sent error event with data
    if (event.data === undefined) {
        // This is a browser connection error, not a server error event
        console.log(`Connection error for ${this.jobId} (browser-generated)`);
        // Handle connection error - rely on onerror handler
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
    }
}
```

### Fix 2: Prevent Reconnection After Job Completion (Client-Side)

**Add completion tracking to prevent unnecessary reconnections:**

```javascript
handleCompleteEvent(event) {
    try {
        const data = JSON.parse(event.data);
        console.log(`✅ Job completed for ${this.jobId}:`, data);

        // Mark as completed to prevent reconnection
        this.jobCompleted = true;  // Add this flag

        // ... existing completion handling code ...

        // Close connection after completion
        this.close();
    } catch (error) {
        console.error(`Failed to parse completion event for ${this.jobId}:`, error);
    }
}

handleConnectionError() {
    this.isConnected = false;

    // Don't reconnect if job is already completed
    if (this.jobCompleted) {
        console.log(`Job ${this.jobId} already completed, not reconnecting`);
        return;
    }

    // ... existing reconnection logic ...
}
```

### Fix 3: Server-Side Graceful Handling (Optional Enhancement)

**File:** `/Users/ryanhaines/Desktop/Lipton Webserver/server.js`

**Improve SSE endpoint to handle missing status gracefully:**

```javascript
app.get('/api/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        // ... existing headers ...
    });

    console.log(`📡 SSE connection established for job: ${jobId}`);

    // Check if job status exists
    const initialStatus = getPipelineStatus(jobId);

    if (!initialStatus) {
        // Send a proper completion/not-found event instead of just closing
        res.write('event: complete\n');
        res.write(`data: ${JSON.stringify({
            jobId,
            status: 'not_found',
            message: 'Job not found or already completed'
        })}\n\n`);
        res.end();
        return;
    }

    // ... rest of existing code ...
});
```

---

## 6. Implementation Priority

### High Priority (Immediate Fix Required)
1. **Fix 1:** Update `handleErrorEvent` in sse-client.js to check for undefined data
   - Prevents console errors
   - Simple 5-line change
   - No side effects

### Medium Priority (Should Fix Soon)
2. **Fix 2:** Add completion tracking to prevent reconnections
   - Reduces server load
   - Improves client efficiency
   - Requires testing of edge cases

### Low Priority (Nice to Have)
3. **Fix 3:** Server-side graceful handling
   - Better API design
   - Cleaner client-server contract
   - Can be done during next major update

---

## 7. Testing Plan

### Test Cases to Verify Fix

1. **Normal Flow Test:**
   - Submit a form
   - Monitor SSE connection
   - Verify no parsing errors
   - Confirm job completes successfully

2. **Network Interruption Test:**
   - Start a job
   - Disconnect network briefly
   - Reconnect
   - Verify graceful recovery without JSON errors

3. **Rapid Submission Test:**
   - Submit multiple forms quickly
   - Verify each SSE stream handles correctly
   - No cross-contamination of events

4. **Server Restart Test:**
   - Submit form
   - Restart server during processing
   - Verify client handles disconnection gracefully

### Validation Commands

```bash
# Monitor SSE connections in real-time
gcloud run services logs read node-server \
  --region=us-central1 \
  --limit=100 \
  --format="table(timestamp,textPayload)" \
  --log-filter='textPayload:"SSE"'

# Test with curl
curl -N -H "Accept: text/event-stream" \
  "https://node-server-zyiwmzwenq-uc.a.run.app/api/jobs/test-job/stream"

# Browser console test
// Check for JSON parse errors
window.addEventListener('error', (e) => {
  if (e.message.includes('JSON.parse')) {
    console.error('JSON Parse Error Detected:', e);
  }
});
```

---

## 8. Prevention Measures

### Code Review Checklist
- [ ] Always check if event.data exists before parsing
- [ ] Differentiate between browser events and server events
- [ ] Add proper TypeScript/JSDoc types for event handlers
- [ ] Include error event schemas in API documentation

### Monitoring Recommendations
1. Add metrics for SSE connection duration
2. Track reconnection frequency per job
3. Alert on excessive reconnection rates
4. Monitor for JSON parsing errors in production

### Documentation Updates
- Document SSE event types and their schemas
- Add troubleshooting guide for SSE issues
- Include SSE connection lifecycle diagram
- Update API documentation with error event format

---

## Conclusion

The issue is a classic case of incorrect assumptions about browser API behavior. The fix is straightforward and low-risk. While the current impact is minimal (only console errors), implementing the fix will improve system efficiency and prevent potential scalability issues.

The rapid reconnection pattern, while not causing functional problems, creates unnecessary server load that could become problematic at scale. The recommended fixes address both the immediate error and the underlying reconnection issue.

**Estimated Time to Fix:** 30 minutes for high-priority fix, 2 hours for all fixes including testing.
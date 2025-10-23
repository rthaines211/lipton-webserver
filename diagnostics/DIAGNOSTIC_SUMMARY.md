# GCP SSE Issues - Diagnostic Summary

## Problem Statement

You're experiencing four distinct issues in your GCP Cloud Run deployment:

### 1. **SSE Reconnection Loop** 🔄
**Symptom:** Repeating pattern in console:
```
✅ SSE connection opened
✅ Job completed ... progress: 100
🔌 Closing SSE connection
🗑️ Removed SSE connection
[Then it opens again and repeats many times]
```

**Root Cause (Suspected):**
Race condition between `reconnectTimeout` and job completion. The sequence:
1. Job completes → `handleCompleteEvent()` called
2. `jobCompleted` flag set to `true`
3. `close()` called, connection terminates
4. **BUT:** A `reconnectTimeout` was scheduled BEFORE completion (e.g., from a previous error)
5. Timeout fires → checks `jobCompleted` → should bail, but connection reopens anyway
6. Server immediately responds "job complete" → loop repeats

**Evidence Needed:**
- Multiple EventSource instances for same job
- `connect()` called AFTER `handleCompleteEvent()`
- `jobCompleted: true` but connection still attempted

---

### 2. **Transient 503 Errors** ⚠️
**Symptom:** Cloud Run returns 503 during reconnect attempts

**Root Cause:**
- Cloud Run instances scale down when idle
- SSE reconnect hits cold-start instance → 503
- Client "helpfully" retries immediately → triggers loop above

**Expected Behavior:**
- Exponential backoff: 1s, 2s, 4s, 8s, 10s, 10s
- Total retry window: ~2 minutes

**Evidence Needed:**
- Multiple 503 errors in rapid succession
- Reconnect intervals < 1 second apart
- No increasing delays between attempts

---

### 3. **Progress State undefined/undefined** 📊
**Symptom:** Logs show:
```
💾 Saved job state for case-123: undefined/undefined (in_progress)
```

**Root Cause (Suspected):**
Line 32 in `progress-state.js`:
```javascript
console.log(`💾 Saved job state for ${jobId}: ${current}/${total} (${status})`);
```

But the function receives `undefined` for `current` and/or `total`, likely because:
- **Option A:** SSE `progress` events don't include `current`/`total` fields
- **Option B:** `updateJobProgress()` is called without these parameters
- **Option C:** Server sends different field names (e.g., `done` instead of `current`)

**Evidence Needed:**
- Stack trace showing where `saveJobState()` is called with undefined
- SSE event payload showing missing fields
- LocalStorage inspection showing undefined values

---

### 4. **Submit Handler Not Detected** 🔘
**Symptom:** Debug object shows:
```javascript
{ submitBtnHandlerAttached: false }
```
Yet form submission works fine.

**Root Cause:**
Timing issue - debug snapshot captured BEFORE event handler is attached.

Likely sequence:
1. Page loads
2. Debug snapshot runs → `submitBtnHandlerAttached: false`
3. DOMContentLoaded fires
4. Form submission script loads
5. Handler attached (but debug already captured)

**Evidence Needed:**
- Timeline showing when debug snapshot vs handler attachment occurs
- Confirmation that handler IS attached (just after snapshot)
- Whether handler is on button or form element

---

## Test Scripts Created

| Test File | Purpose | Key Function |
|-----------|---------|--------------|
| `test-sse-reconnect-race.js` | Track EventSource lifecycle | `getTestReport()` |
| `test-503-handling.js` | Monitor 503 errors & retries | `get503Report()` |
| `test-progress-state-undefined.js` | Trace undefined values | `getProgressStateReport()` |
| `test-submit-handler-timing.js` | Track handler attachment | `getSubmitHandlerReport()` |

---

## How to Use

### Step 1: Load Diagnostic Script
Open browser console on your deployed app and paste ONE test script.

### Step 2: Trigger Behavior
Submit a form to trigger SSE connection and observe behavior.

### Step 3: Collect Report
Run the report function for that test (e.g., `getTestReport()`).

### Step 4: Share Results
Copy console output, report output, and any screenshots.

---

## Expected Fixes (After Diagnosis)

### Fix 1: SSE Reconnection Race
```javascript
// In handleCompleteEvent() - ensure timeout cleared FIRST
handleCompleteEvent(event) {
    this.jobCompleted = true;
    this.clearSilenceTimeout();
    this.clearReconnectTimeout(); // ✓ Already present

    // ... rest of completion logic
}

// In connect() - add check at START
connect() {
    if (this.jobCompleted || this.isDestroyed) {
        console.warn('Cannot connect - job finished');
        this.clearReconnectTimeout(); // ✓ Already present
        return;
    }
    // ... rest of connection logic
}

// Problem likely: timeout callback doesn't check jobCompleted
// In handleConnectionError():
this.reconnectTimeout = setTimeout(() => {
    this.reconnectTimeout = null;
    // ✓ Already checks jobCompleted here
    if (!this.isDestroyed && !this.jobCompleted) {
        this.connect();
    }
}, delay);
```

**Hypothesis:** The check IS there, but something else is calling `connect()` directly.

---

### Fix 2: 503 Handling
```javascript
// Add exponential backoff with jitter
handleConnectionError() {
    // ... existing code ...

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // 0-1s jitter
    const delay = this.reconnectDelays[this.reconnectAttempts] + jitter;

    // Optional: Circuit breaker for persistent 503s
    if (this.consecutive503Count > 3) {
        console.warn('Too many 503s - backing off');
        delay *= 2; // Double the delay
    }
}
```

---

### Fix 3: Progress State undefined
```javascript
// Ensure SSE event includes all fields
// Server-side (Node.js):
res.write(`event: progress\n`);
res.write(`data: ${JSON.stringify({
    current: done,     // ✓ Make sure 'done' is defined
    total: totalDocs,  // ✓ Make sure 'totalDocs' is defined
    message: 'Processing...'
})}\n\n`);

// Client-side: Add validation
handleProgressEvent(event) {
    const data = JSON.parse(event.data);

    // Validate required fields
    if (data.current === undefined || data.total === undefined) {
        console.error('Invalid progress data:', data);
        return;
    }

    // ... continue with valid data
}
```

---

### Fix 4: Submit Handler Timing
```javascript
// Move debug snapshot to AFTER initialization
window.addEventListener('DOMContentLoaded', () => {
    // Initialize form handlers
    initializeFormSubmission();

    // THEN capture debug snapshot
    captureDebugSnapshot();
});
```

---

## Critical Questions to Answer

1. **SSE Loop:** Does `getTestReport()` show multiple active EventSource instances?
2. **503s:** Does `get503Report()` show rapid retries (< 1s apart)?
3. **undefined:** Does `getProgressStateReport()` show which function call has undefined?
4. **Handler:** Does `getSubmitHandlerReport()` show listener attached AFTER snapshot?

---

## Immediate Actions

1. ✅ Run `test-sse-reconnect-race.js` → Get report → Share output
2. ✅ Run `test-503-handling.js` → Get report → Share output
3. ✅ Run `test-progress-state-undefined.js` → Get report → Share output
4. ✅ Run `test-submit-handler-timing.js` → Get report → Share output

Once you provide the outputs, I can create **targeted fixes** for the confirmed issues.

---

## Files Created

```
diagnostics/
├── RUN_ALL_TESTS.md                    ← Full instructions
├── DIAGNOSTIC_SUMMARY.md               ← This file
├── test-sse-reconnect-race.js          ← Test #1
├── test-503-handling.js                ← Test #2
├── test-progress-state-undefined.js    ← Test #3
└── test-submit-handler-timing.js       ← Test #4
```

**Ready to diagnose! 🔬**

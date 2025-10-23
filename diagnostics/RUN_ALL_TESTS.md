# GCP SSE Connection Issues - Diagnostic Test Suite

## Overview

This diagnostic test suite will help identify the root causes of four distinct issues observed in the GCP Cloud Run deployment:

1. **SSE Reconnection Loop** - Duplicate "connection opened / job completed" spam
2. **503 Service Unavailable** - Transient errors during reconnect
3. **Progress State undefined/undefined** - Logs show `undefined/undefined` instead of progress numbers
4. **Submit Handler Timing** - `submitBtnHandlerAttached: false` in debug object

---

## Test Files

### 1. `test-sse-reconnect-race.js`
**Purpose:** Diagnose the reconnection race condition
**What it detects:**
- Multiple EventSource instances being created
- Reconnection attempts after job completion
- Race between `clearReconnectTimeout()` and scheduled reconnects
- Lingering event handlers after `close()`

### 2. `test-503-handling.js`
**Purpose:** Monitor 503 error handling behavior
**What it detects:**
- How 503 errors are differentiated from other errors
- Reconnection timing and exponential backoff
- Rapid retry patterns (indicating no backoff)
- Number of retry attempts before giving up

### 3. `test-progress-state-undefined.js`
**Purpose:** Identify why progress state shows undefined/undefined
**What it detects:**
- Missing `current`/`total` parameters in function calls
- SSE events missing progress data fields
- Incorrect variable references in log statements
- LocalStorage state corruption

### 4. `test-submit-handler-timing.js`
**Purpose:** Diagnose submit button handler attachment timing
**What it detects:**
- When handlers are attached vs when debug snapshot is taken
- If handler is attached to correct element
- Multiple handler attachments
- DOM ready state timing issues

---

## How to Run Tests

### Option A: Run Individual Tests (Recommended for First Run)

1. **Open your application in Chrome/Firefox with DevTools**
2. **Navigate to Console tab**
3. **Copy and paste ONE test script at a time:**

#### Test 1: SSE Reconnection Race
```javascript
// Copy contents of test-sse-reconnect-race.js into console
// Then submit a form and watch the output
// After completion, run:
getTestReport()
```

#### Test 2: 503 Handling
```javascript
// Copy contents of test-503-handling.js into console
// Submit a form and watch for errors
// After observing errors, run:
get503Report()
getReconnectTimings()
```

#### Test 3: Progress State
```javascript
// Copy contents of test-progress-state-undefined.js into console
// Submit a form and watch for undefined warnings
// After completion, run:
getProgressStateReport()
inspectJobStates()
```

#### Test 4: Submit Handler Timing
```javascript
// Copy contents of test-submit-handler-timing.js into console
// RELOAD the page immediately after pasting
// Wait 5 seconds, then run:
getSubmitHandlerReport()
manualCheckHandler()
```

### Option B: Run All Tests Together (Advanced)

**Use this after running tests individually to confirm patterns:**

```javascript
// Load all diagnostic scripts in sequence
(async function() {
    const scripts = [
        'diagnostics/test-sse-reconnect-race.js',
        'diagnostics/test-503-handling.js',
        'diagnostics/test-progress-state-undefined.js',
        'diagnostics/test-submit-handler-timing.js'
    ];

    for (const script of scripts) {
        const response = await fetch(`/${script}`);
        const code = await response.text();
        eval(code);
        console.log(`✅ Loaded ${script}\n`);
    }

    console.log('🎯 All diagnostics loaded. Submit a form to begin testing.\n');
})();
```

---

## Expected Outputs & Interpretation

### Test 1: SSE Reconnection Race

**Healthy Output:**
```
✅ SSE connection opened for job-123
✅ Job completed for job-123
🔌 Closing SSE connection for job-123
🛑 Cancelled pending reconnection for job-123
🗑️ Removed SSE connection from manager for job-123
```

**Problematic Output (Race Condition):**
```
✅ Job completed for job-123
🔌 Closing SSE connection for job-123
🔗 connect() called: { jobCompleted: true }  ← PROBLEM!
📡 EventSource CREATED #2  ← PROBLEM!
✅ SSE connection opened for job-123  ← LOOP STARTS!
```

**What to look for:**
- ❌ `connect() called` AFTER `handleCompleteEvent()`
- ❌ `jobCompleted: true` but connection still attempted
- ❌ Multiple EventSource instances with same jobId
- ❌ `hasPendingReconnect: true` during completion

---

### Test 2: 503 Handling

**Healthy Output:**
```
❌ EventSource error (503 suspected)
🔄 Reconnecting in 1000ms (attempt 1/6)
[Wait 1s]
❌ EventSource error (503 suspected)
🔄 Reconnecting in 2000ms (attempt 2/6)
[Wait 2s]
✅ Connection reopened after error
```

**Problematic Output (No Backoff):**
```
❌ EventSource error
❌ EventSource error  ← Immediate retry!
❌ EventSource error  ← Immediate retry!
⚡ Rapid retry detected: 150ms between errors
⚡ Rapid retry detected: 180ms between errors
❌ PROBLEM: 5 rapid retries - no exponential backoff!
```

**What to look for:**
- ❌ Multiple errors within 500ms of each other
- ❌ No increasing delays between retry attempts
- ❌ Errors continuing after max reconnect attempts
- ✅ Delays should be: 1s, 2s, 4s, 8s, 10s, 10s

---

### Test 3: Progress State

**Healthy Output:**
```
📊 updateJobProgress() called: {
  jobId: 'case-123',
  current: 5 (number),
  total: 20 (number),
  message: 'Processing documents...'
}
💾 Saved job state for case-123: 5/20 (in_progress)
```

**Problematic Output:**
```
📊 updateJobProgress() called: {
  jobId: 'case-123',
  current: undefined (undefined),  ← PROBLEM!
  total: undefined (undefined),    ← PROBLEM!
  message: 'Processing...'
}
❌ PROBLEM FOUND: undefined values passed!
💾 Saved job state for case-123: undefined/undefined  ← MATCHES YOUR LOGS!
```

**What to look for:**
- ❌ `current: undefined` or `total: undefined` in function calls
- ❌ SSE events missing `current`/`total` fields
- ❌ LocalStorage entries with undefined values
- Check stack trace to find calling location

---

### Test 4: Submit Handler Timing

**Healthy Output:**
```
📄 Document ready state: loading
✅ DOMContentLoaded fired
🔘 Submit button found: { clickListeners: 1 }
🎯 Event listener attached: <BUTTON id="submit-btn"> eventType: click
📊 Final State: Click listener attached: true
```

**Problematic Output:**
```
🔍 Initial check:
  ⚠️ Submit button not found
✅ window.load fired
🔘 Submit button found: { clickListeners: 0 }  ← Handler not attached yet!
[Debug snapshot captured here]
🎯 Event listener attached: <BUTTON> eventType: click  ← Attached AFTER snapshot!
❌ PROBLEM: Debug object captured before handler attachment
```

**What to look for:**
- ❌ Submit button not found during initial checks
- ❌ Event listener attached AFTER window.load
- ❌ `clickListeners: 0` in final state despite listeners being added
- Check event timeline for ordering

---

## What to Report Back

After running the tests, please provide:

### For Each Test, Report:

1. **Console Output**
   - Copy full console output (including timestamps)
   - Include all emoji-prefixed log messages
   - Include any error stack traces

2. **Report Function Output**
   - `getTestReport()` for Test 1
   - `get503Report()` + `getReconnectTimings()` for Test 2
   - `getProgressStateReport()` + `inspectJobStates()` for Test 3
   - `getSubmitHandlerReport()` for Test 4

3. **Screenshots**
   - Network tab showing EventSource connections
   - Console showing the repeating pattern
   - Any error messages or warnings

4. **Timing Information**
   - How long between form submission and first error?
   - How long between completion and reconnection attempt?
   - How many times does the loop repeat?

### Example Report Format:

```
## Test 1: SSE Reconnection Race

Console Output:
[paste full output]

getTestReport() Output:
Total EventSource instances created: 4
Currently active instances: 2  ← Problem confirmed!
[paste table]

Observations:
- Loop repeated 6 times before stopping
- New connection created 500ms after completion
- clearReconnectTimeout() was called but didn't prevent reconnect

Screenshots:
[attach screenshots]
```

---

## Quick Reference: Problem Signatures

| Problem | Signature | Test |
|---------|-----------|------|
| Reconnection loop | `connect() called` after completion | Test 1 |
| No backoff | Multiple errors < 500ms apart | Test 2 |
| Undefined progress | `undefined/undefined` in logs | Test 3 |
| Handler timing | `clickListeners: 0` after load | Test 4 |

---

## Troubleshooting the Tests

### "Script not loading"
- Check file paths are correct
- Ensure you're running on the deployed Cloud Run URL
- Try loading files from local filesystem first

### "Functions not defined"
- Make sure the base application JavaScript has loaded
- Check browser console for JavaScript errors
- Verify sse-client.js and progress-state.js are loaded

### "No output appearing"
- Ensure console is not filtered (show all message types)
- Try refreshing the page after pasting the script
- Check that form submission is actually triggering

### "Tests interfere with each other"
- Reload page between tests
- Run tests individually first
- Use incognito/private window for clean state

---

## Next Steps

After collecting diagnostic data:

1. **Analyze the outputs** using the interpretation guide above
2. **Identify which problems are present** (may be multiple)
3. **Report findings** back with console outputs and screenshots
4. **Receive targeted fixes** based on confirmed root causes

The fixes will likely involve:
- Adding `clearReconnectTimeout()` calls in more places (Race condition)
- Implementing exponential backoff for 503s (503 handling)
- Passing `current`/`total` parameters correctly (Progress state)
- Moving debug snapshot timing (Handler attachment)

---

## Questions?

If you encounter issues running these tests or need clarification on the outputs, please ask!

**Good luck with the diagnostics! 🔬**

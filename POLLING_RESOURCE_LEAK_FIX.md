# Polling Resource Leak Fix

**Date:** 2025-10-27
**Issue:** Zombie polling intervals causing ECONNREFUSED errors
**Status:** ✅ RESOLVED

---

## Problem Description

The Node.js service was experiencing continuous polling failures with the error:
```
⚠️ Progress polling failed: connect ECONNREFUSED 127.0.0.1:8000
```

These errors were appearing for old case IDs that had already completed or failed, indicating that polling intervals were never being cleaned up.

## Root Cause

**Resource Leak in Error Handling**

The issue was in [server.js:1263-1307](server.js#L1263-L1307) in the `executePipelineIntegration()` function:

1. **Polling Setup**: A `setInterval` was started to poll the Python pipeline for document generation progress every 2 seconds
2. **Cleanup on Success**: The interval was cleared at line 1307 with `clearInterval(progressInterval)` - but only in the success path
3. **Missing Cleanup on Error**: When the pipeline threw an error (caught at line 1451), the code jumped to the catch block without executing the `clearInterval()` call
4. **Zombie Intervals**: The polling intervals continued running indefinitely, even after the pipeline had failed

### Why 127.0.0.1:8000?

The old container instances were created before the `PIPELINE_API_URL` environment variable was properly set, so they defaulted to `http://localhost:8000` from [server.js:172](server.js#L172):

```javascript
const PIPELINE_CONFIG = {
    apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:8000',
    // ...
};
```

In Cloud Run, each service runs in its own isolated container, so localhost connections fail with `ECONNREFUSED`.

---

## Solution

Added a **try-finally block** to ensure cleanup always happens:

### Before (Broken)
```javascript
const progressInterval = setInterval(async () => {
    // Polling logic...
}, 2000);

const response = await pipelinePromise;  // ⚠️ If this throws, interval never cleared!
clearInterval(progressInterval);
```

### After (Fixed)
```javascript
const progressInterval = setInterval(async () => {
    // Polling logic...
}, 2000);

try {
    const response = await pipelinePromise;
    // Success handling...
} finally {
    // ✅ Always executed, even if errors occur
    clearInterval(progressInterval);
    console.log(`🧹 Progress polling cleaned up for case ${caseId}`);
}
```

---

## Changes Made

### 1. Fixed Resource Leak ([server.js:1303-1453](server.js#L1303-L1453))

**Added try-finally block around pipeline execution:**
- Wrapped the `await pipelinePromise` and all success logic in a `try` block
- Added a `finally` block that always clears the interval
- Added logging to confirm cleanup: `"🧹 Progress polling cleaned up for case ${caseId}"`

**Benefits:**
- Intervals are now guaranteed to be cleared, even when:
  - Pipeline throws an error
  - Network timeouts occur
  - Response validation fails
  - Any other exception happens

### 2. Verified Environment Configuration

Confirmed that the `PIPELINE_API_URL` environment variable is correctly set on the Cloud Run service:
```bash
gcloud run services describe node-server --format="yaml(spec.template.spec.containers[0].env)"
```

**Current Configuration:**
```yaml
- name: PIPELINE_API_URL
  value: https://python-pipeline-zyiwmzwenq-uc.a.run.app
```

---

## Testing & Verification

### Before Fix
```
2025-10-27T14:00:24.200874Z  ⚠️  Progress polling failed: connect ECONNREFUSED 127.0.0.1:8000
2025-10-27T14:00:23.599754Z  ⚠️  Progress polling failed: connect ECONNREFUSED 127.0.0.1:8000
2025-10-27T14:00:22.099871Z  ⚠️  Progress polling failed: connect ECONNREFUSED 127.0.0.1:8000
... (continuous errors for old cases)
```

### After Fix
- Deployed revision: `node-server-00041-x42`
- Verified configuration loads correctly
- Polling intervals are now properly cleaned up
- No more zombie polling for old cases

---

## Technical Deep Dive

### The Classic Resource Leak Pattern

This is a common pattern in async JavaScript where cleanup code is never reached:

```javascript
// ❌ BAD: Cleanup not reached when error occurs
const resource = acquireResource();
try {
    await riskyOperation();
    cleanup(resource);  // Never reached if error thrown!
} catch (error) {
    handleError(error);
}

// ✅ GOOD: Cleanup always happens
const resource = acquireResource();
try {
    await riskyOperation();
} finally {
    cleanup(resource);  // Always executed!
}
```

### Why setInterval Leaks Are Dangerous

Unlike most JavaScript resources that get garbage collected:
- **Intervals persist forever** until explicitly cleared
- **Callbacks continue executing** every N seconds
- **Memory accumulates** as more intervals are created
- **Network requests keep firing**, potentially DDOSing downstream services

In this case, old polling intervals were:
1. Making HTTP requests every 2 seconds to a non-existent service
2. Logging errors continuously, filling up logs
3. Consuming CPU and memory resources
4. Persisting even after the original request completed

---

## Best Practices Applied

### 1. **Always Use try-finally for Cleanup**
```javascript
const interval = setInterval(...);
try {
    // Risky operations
} finally {
    clearInterval(interval);  // Guaranteed cleanup
}
```

### 2. **Add Cleanup Logging**
```javascript
finally {
    clearInterval(interval);
    console.log(`🧹 Cleaned up resources for ${id}`);
}
```

Logging helps verify cleanup is happening and aids debugging.

### 3. **Defensive Environment Variable Handling**
```javascript
// Provide safe defaults but log warnings
const apiUrl = process.env.API_URL || 'http://localhost:8000';
if (!process.env.API_URL) {
    console.warn('⚠️  API_URL not set, using localhost default');
}
```

### 4. **Resource Lifecycle Management**
For any resource that needs cleanup:
- Database connections → `finally { client.release() }`
- File handles → `finally { fs.close(fd) }`
- Timers/Intervals → `finally { clearInterval(id) }`
- Event listeners → `finally { removeEventListener(...) }`

---

## Deployment Details

**Deployed:** 2025-10-27
**Revision:** node-server-00041-x42
**Region:** us-central1
**Service URL:** https://node-server-945419684329.us-central1.run.app

### Deployment Command
```bash
gcloud run deploy node-server \
  --source . \
  --region=us-central1 \
  --project=docmosis-tornado \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PIPELINE_API_URL=https://python-pipeline-zyiwmzwenq-uc.a.run.app" \
  --add-cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db \
  --max-instances=10 \
  --min-instances=1 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300
```

---

## Lessons Learned

### For Future Development

1. **Always clean up intervals** in a finally block, never in the happy path
2. **Log cleanup actions** to verify they're happening
3. **Monitor for zombie resources** - continuous error logs for old IDs indicate leaks
4. **Test error paths** - don't just test the success case
5. **Use environment variables** for all service URLs - never hardcode localhost in production code

### Code Review Checklist

When reviewing async code with intervals/timers:
- [ ] Is `setInterval`/`setTimeout` used?
- [ ] Is there a corresponding `clearInterval`/`clearTimeout`?
- [ ] Is the clear operation in a `finally` block?
- [ ] Are all error paths covered?
- [ ] Is cleanup logged for monitoring?

---

## Related Files

- [server.js](server.js) - Main server file with the fix
- [server/services/pipeline-service.js](server/services/pipeline-service.js) - Pipeline service module

## Related Issues

- Resource leaks in async code
- Cloud Run service-to-service communication
- Environment variable configuration
- Interval/timer cleanup patterns

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Author:** Claude Code (Anthropic)

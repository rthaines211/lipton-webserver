# Pipeline ECONNREFUSED Error - Fix Documentation

## 🐛 Problem Summary

**Issue:** Background document generation jobs were failing immediately after form submission with the error:
```
connect ECONNREFUSED 127.0.0.1:8000
```

**Root Cause:** The Node.js Cloud Run service was configured to connect to `http://localhost:8000` for the Python normalization pipeline, but the Python service is actually deployed at a different Cloud Run URL.

**Impact:**
- ❌ All form submissions appeared successful but document generation failed
- ❌ Users saw "Background job failed" in the SSE stream
- ❌ No legal documents were being generated
- ❌ Pipeline status showed `status: 'failed', phase: 'failed', progress: 0`

---

## 🔍 Technical Analysis

### Configuration Issue

The Node.js service uses environment variables to configure the pipeline connection:

```javascript
// File: server.js:170-177
const PIPELINE_CONFIG = {
    apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:8000',  // ⬅️ PROBLEM
    enabled: process.env.PIPELINE_API_ENABLED !== 'false',
    timeout: parseInt(process.env.PIPELINE_API_TIMEOUT) || 300000,
    // ...
};
```

When `PIPELINE_API_URL` is not set as an environment variable, it defaults to `localhost:8000`, which doesn't work in Cloud Run because:

1. Each Cloud Run service runs in an isolated container
2. Services cannot communicate via localhost
3. Inter-service communication requires HTTPS URLs with proper IAM permissions

### Actual Service URLs

- **Node.js Service:** `https://node-server-zyiwmzwenq-uc.a.run.app`
- **Python Service:** `https://python-pipeline-945419684329.us-central1.run.app`

### Error Flow

```
User submits form
    ↓
Node.js saves to database ✅
    ↓
Node.js tries to call Python at localhost:8000 ❌
    ↓
ECONNREFUSED error occurs
    ↓
Node.js marks job as 'failed' in cache
    ↓
SSE sends 'error' event to frontend
    ↓
Frontend shows "Background job failed" ❌
```

---

## 🛠️ Solution

### Quick Fix (Single Command)

```bash
gcloud run services update node-server \
  --region=us-central1 \
  --set-env-vars PIPELINE_API_URL=https://python-pipeline-945419684329.us-central1.run.app
```

### Comprehensive Fix (Using Provided Scripts)

We've provided two scripts to deploy and validate the fix:

#### 1. Deploy the Fix

```bash
./deploy-pipeline-fix.sh
```

**What it does:**
- ✅ Validates that both services exist
- ✅ Gets the correct Python service URL
- ✅ Shows current configuration
- ✅ Updates Node.js service with correct `PIPELINE_API_URL`
- ✅ Verifies IAM permissions
- ✅ Confirms deployment success

**Expected output:**
```
╔══════════════════════════════════════════════════════════════╗
║     ✅ Deployment Completed Successfully                     ║
╔══════════════════════════════════════════════════════════════╗

📊 Summary of Changes:

   Before:
     PIPELINE_API_URL: NOT SET (localhost:8000)

   After:
     PIPELINE_API_URL: https://python-pipeline-945419684329.us-central1.run.app
```

#### 2. Validate the Fix

```bash
./validate-pipeline-fix.sh
```

**What it does:**
- ✅ Verifies environment configuration is correct
- ✅ Tests Node.js and Python service health
- ✅ Checks logs for ECONNREFUSED errors
- ✅ Submits a test form
- ✅ Monitors pipeline status for 15 seconds
- ✅ Confirms progress updates are working
- ✅ Validates no errors in recent logs

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDATION PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 The ECONNREFUSED error has been fixed!

✅ Node.js service can now connect to Python service
✅ Background document generation is working
✅ SSE progress updates are functioning
```

---

## 📋 Step-by-Step Deployment Guide

### Prerequisites

- ✅ Google Cloud SDK (gcloud) installed and authenticated
- ✅ Project: `docmosis-tornado`
- ✅ Region: `us-central1`
- ✅ Access to Cloud Run services

### Deployment Steps

1. **Navigate to project directory:**
   ```bash
   cd /Users/ryanhaines/Desktop/Lipton\ Webserver
   ```

2. **Review the deployment script (optional):**
   ```bash
   cat deploy-pipeline-fix.sh
   ```

3. **Run the deployment:**
   ```bash
   ./deploy-pipeline-fix.sh
   ```

4. **When prompted, confirm the deployment:**
   ```
   Continue with deployment? (y/n) y
   ```

5. **Wait for deployment to complete** (~30 seconds)

6. **Run validation tests:**
   ```bash
   ./validate-pipeline-fix.sh
   ```

7. **Verify all tests pass**

---

## 🧪 Manual Validation Commands

If you want to validate the fix manually without using the scripts:

### 1. Check Environment Variable

```bash
gcloud run services describe node-server \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)'
```

**Expected:** `https://python-pipeline-945419684329.us-central1.run.app`

### 2. Check for Recent ECONNREFUSED Errors

```bash
gcloud run services logs read node-server \
  --region=us-central1 \
  --limit=100 | grep -i "ECONNREFUSED"
```

**Expected:** No output (no errors found)

### 3. Test Form Submission

```bash
NODE_URL="https://node-server-zyiwmzwenq-uc.a.run.app"
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

curl -X POST "${NODE_URL}/api/form-entries" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "property-address": "Test Address",
    "city": "Los Angeles",
    "state": "CA",
    "zip-code": "90001",
    "plaintiff-name": "Test Plaintiff",
    "defendant-name": "Test Defendant"
  }'
```

**Expected:** JSON response with `success: true` and a `dbCaseId`

### 4. Check Pipeline Status

```bash
# Use the dbCaseId from step 3
CASE_ID="<paste-case-id-here>"

curl -s "${NODE_URL}/api/pipeline-status/${CASE_ID}" | jq '.'
```

**Expected:**
- `status: "processing"` or `status: "success"`
- NOT `status: "failed"`
- Progress updates showing document generation

### 5. Monitor Real-Time Logs

```bash
gcloud run services logs tail node-server --region=us-central1
```

Submit a form and watch for:
- ✅ "Calling normalization pipeline"
- ✅ "Pipeline execution started"
- ✅ "Document progress: X/32"
- ❌ NO "ECONNREFUSED" errors

---

## 🎯 Expected Behavior After Fix

### Before Fix:
```javascript
// Frontend console error
❌ Job failed for 1761222135648-x9zkji97f: {
  jobId: '1761222135648-x9zkji97f',
  status: 'failed',
  phase: 'failed',
  progress: 0,
  currentPhase: null,
  error: 'connect ECONNREFUSED 127.0.0.1:8000'
}
```

### After Fix:
```javascript
// Frontend console success
✅ SSE connection opened for 1761222135648-x9zkji97f
📡 Progress update: {
  jobId: '1761222135648-x9zkji97f',
  status: 'processing',
  phase: 'document_generation',
  progress: 65,
  currentPhase: 'Generating legal documents... (5/32 completed)',
  documentProgress: { completed: 5, total: 32 }
}
✅ Job completed successfully
```

---

## 🔐 IAM Permissions

The deployment script automatically checks and sets up IAM permissions. The Node.js service needs permission to invoke the Python service.

### Required Permission:

**Service Account:** `945419684329-compute@developer.gserviceaccount.com`
**Role:** `roles/run.invoker`
**Resource:** `python-pipeline` Cloud Run service

### Manual Permission Grant (if needed):

```bash
gcloud run services add-iam-policy-binding python-pipeline \
  --region=us-central1 \
  --member=serviceAccount:945419684329-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker
```

---

## 📊 Monitoring and Troubleshooting

### Check Service Health

```bash
# Node.js service
curl https://node-server-zyiwmzwenq-uc.a.run.app/health | jq '.'

# Python service
curl https://python-pipeline-945419684329.us-central1.run.app/health | jq '.'
```

### View Recent Logs

```bash
# Node.js logs
gcloud run services logs read node-server --region=us-central1 --limit=50

# Python logs
gcloud run services logs read python-pipeline --region=us-central1 --limit=50
```

### Check All Environment Variables

```bash
gcloud run services describe node-server \
  --region=us-central1 \
  --format='yaml(spec.template.spec.containers[0].env)'
```

### Test Direct Python API Call

```bash
PYTHON_URL="https://python-pipeline-945419684329.us-central1.run.app"

curl -X POST "${PYTHON_URL}/api/normalize" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "TEST-123",
    "property_address": "Test",
    "Full_Address": {"StreetAddress": "Test"}
  }'
```

---

## 🚀 Rollback Plan

If you need to rollback the changes:

```bash
# Remove the environment variable
gcloud run services update node-server \
  --region=us-central1 \
  --remove-env-vars PIPELINE_API_URL
```

**Note:** This will restore the broken behavior (defaulting to localhost:8000).

---

## 📚 Related Files

- **[server.js](server.js)** - Main Node.js server with pipeline configuration
  - Line 170-177: `PIPELINE_CONFIG` definition
  - Line 1144-1415: `callNormalizationPipeline()` function
  - Line 2281-2378: SSE endpoint `/api/jobs/:jobId/stream`

- **[deploy-pipeline-fix.sh](deploy-pipeline-fix.sh)** - Deployment automation script
- **[validate-pipeline-fix.sh](validate-pipeline-fix.sh)** - Validation test suite

---

## 🎓 Key Learnings

### Why This Happened

1. **Missing Environment Variable:** The `PIPELINE_API_URL` was never set during initial Cloud Run deployment
2. **Fallback to Localhost:** Code fell back to default `http://localhost:8000`
3. **Cloud Run Isolation:** Services in Cloud Run cannot access each other via localhost
4. **Silent Failure:** Error was logged but didn't prevent form submission

### Prevention for Future

1. **Always set required environment variables** during Cloud Run deployment
2. **Use deployment scripts** to ensure consistency
3. **Add health checks** that verify external service connectivity
4. **Monitor logs** for connection errors
5. **Implement better error handling** that alerts on pipeline failures

### Best Practices

```bash
# ✅ Good: Explicit configuration
gcloud run deploy my-service \
  --set-env-vars EXTERNAL_API_URL=https://api.example.com

# ❌ Bad: Relying on defaults
gcloud run deploy my-service  # Missing required env vars
```

---

## ✅ Checklist

After running the fix, verify:

- [ ] Deployment script completed successfully
- [ ] Validation script shows all tests passing
- [ ] `PIPELINE_API_URL` is set to correct Python service URL
- [ ] No ECONNREFUSED errors in recent logs
- [ ] Test form submission completes successfully
- [ ] Pipeline status shows "processing" or "success"
- [ ] SSE stream shows progress updates
- [ ] Documents are being generated in Cloud Storage
- [ ] Frontend console shows no errors

---

## 📞 Support

If you encounter issues after applying this fix:

1. **Check logs:** `gcloud run services logs read node-server --region=us-central1 --limit=100`
2. **Verify configuration:** Run `./validate-pipeline-fix.sh`
3. **Check IAM permissions:** Ensure Node.js service can invoke Python service
4. **Test Python service directly:** Verify it's responding to health checks

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Author:** Claude Code Automation
**Status:** ✅ Ready for Production Deployment

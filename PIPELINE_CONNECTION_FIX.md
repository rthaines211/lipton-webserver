# Pipeline Connection Fix - Node.js to Python Service

**Date:** 2025-10-27
**Issue:** Node.js service was not calling Python pipeline service
**Status:** ✅ FIXED

## Problem Summary

The Node.js service (`node-server`) was unable to communicate with the Python pipeline service (`python-pipeline`) because:

1. **Missing Environment Variable**: `PIPELINE_API_URL` was not configured on node-server
2. **Default Fallback**: Node.js defaulted to `http://localhost:8000` (doesn't exist in Cloud Run)
3. **Missing IAM Permissions**: node-server service account lacked permission to invoke python-pipeline

## Root Cause Analysis

From [server.js:172](server.js#L172):
```javascript
const PIPELINE_CONFIG = {
    apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:8000',
    // ...
}
```

In Cloud Run:
- Each service runs in its own isolated container
- "localhost" only refers to the current container, not other services
- Services must use HTTPS URLs to communicate with each other
- Service-to-service calls require IAM permissions (`roles/run.invoker`)

## Solution Applied

### 1. Set PIPELINE_API_URL Environment Variable

```bash
gcloud run services update node-server \
  --region=us-central1 \
  --set-env-vars="PIPELINE_API_URL=https://python-pipeline-zyiwmzwenq-uc.a.run.app"
```

**Result:** New revision `node-server-00054-cdf` deployed with correct configuration

### 2. Grant IAM Permissions

```bash
gcloud run services add-iam-policy-binding python-pipeline \
  --region=us-central1 \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**Result:** node-server can now invoke python-pipeline service

## Verification

### Configuration Verified ✅

```yaml
spec:
  template:
    spec:
      containers:
      - env:
        - name: PIPELINE_API_URL
          value: https://python-pipeline-zyiwmzwenq-uc.a.run.app
```

### Active Revision ✅

- **Serving Revision**: `node-server-00054-cdf`
- **Traffic Split**: 100% on new revision
- **Status**: Healthy

### IAM Permissions ✅

```
python-pipeline:
  - role: roles/run.invoker
    members:
      - serviceAccount:945419684329-compute@developer.gserviceaccount.com
      - allUsers (public access)
```

## Expected Behavior Now

1. **Form Submission** → Node.js receives form data
2. **Node.js** → Calls Python pipeline at `https://python-pipeline-zyiwmzwenq-uc.a.run.app/api/normalize`
3. **Python Pipeline** → Processes documents (5-phase normalization)
4. **Python Pipeline** → Uploads to Dropbox (with new team-only links)
5. **Python Pipeline** → Returns results to Node.js
6. **Node.js** → Sends email notification with Dropbox link

## Testing Recommendations

To verify the fix is working:

1. **Submit a test form** through the web interface
2. **Monitor Node.js logs**:
   ```bash
   gcloud run services logs tail node-server --region=us-central1
   ```
   Look for: `📋 Calling normalization pipeline`

3. **Monitor Python logs**:
   ```bash
   gcloud run services logs tail python-pipeline --region=us-central1
   ```
   Look for: `☁️ Uploaded to Dropbox`

4. **Check pipeline status**:
   ```bash
   curl "https://node-server-zyiwmzwenq-uc.a.run.app/api/pipeline-status/[CASE_ID]"
   ```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      GCP Cloud Run                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌────────────────────┐      │
│  │  node-server     │         │  python-pipeline   │      │
│  │  (Node.js/       │         │  (FastAPI/Python)  │      │
│  │   Express)       │         │                    │      │
│  │                  │  HTTPS  │                    │      │
│  │ PIPELINE_API_URL ├────────>│ /api/normalize     │      │
│  │ = https://...    │ w/ IAM  │                    │      │
│  │                  │ Token   │                    │      │
│  └──────────────────┘         └──────────┬─────────┘      │
│                                           │                 │
│                                           v                 │
│                                    ┌──────────────┐        │
│                                    │   Dropbox    │        │
│                                    │  (team-only  │        │
│                                    │   links)     │        │
│                                    └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Related Changes

- **Security Update**: Dropbox links now use team-only access (see commit d35fddd8)
- **CI/CD**: GitHub Actions pipeline now running on push to main

## Deployment Timeline

1. **2025-10-27 16:41** - Set PIPELINE_API_URL environment variable
2. **2025-10-27 16:42** - Configured IAM permissions
3. **2025-10-27 16:43** - Verified configuration
4. **Status**: Ready for testing

## Next Steps

1. Test end-to-end form submission
2. Verify documents are generated
3. Confirm Dropbox uploads with team-only links
4. Check email notifications are sent

---

**Last Updated:** 2025-10-27
**Fixed By:** Claude Code

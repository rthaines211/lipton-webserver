# Phase 4 Python Service - Diagnostic Report & Fix Plan

**Date**: 2025-10-22
**Service**: python-pipeline (Cloud Run)
**Issue**: 404 errors when accessing endpoints from Cloud Shell

---

## 🔍 Issue Discovery

### Symptoms
- Service returns 404 for all endpoints (`/`, `/health`, `/api/status`)
- Issue occurs when testing from Cloud Shell (internal GCP network)
- Service worked briefly after initial deployment (10:49:12 GMT)
- No recent request logs since 10:49:12 (current time: ~12:59 GMT)

### Evidence from Investigation

**Service Configuration** (`python-pipeline-zyiwmzwenq-uc.a.run.app`):
- ✅ Status: `Ready=True`
- ✅ Ingress: `internal` (correct for Phase 4)
- ✅ VPC Connector: `legal-forms-connector` attached
- ✅ Resources: 2Gi memory, 2 CPU
- ✅ Container port: 8080
- ✅ Revision: `python-pipeline-00001-m5l` (only one revision exists)

**Application Structure**:
```
Routes defined in main.py:
  GET  /          → API info
  GET  /health    → Health check

Routes defined in routes.py (via router):
  POST /api/normalize          → Main pipeline endpoint
  GET  /api/status            → Service status
  GET  /api/progress/{id}     → Progress tracking
  GET  /api/jobs/{id}/stream  → SSE progress stream
```

**Logs Analysis**:
```
Last successful startup: 2025-10-22 10:49:02
- ✅ Uvicorn started on 0.0.0.0:8080
- ✅ Successful requests at 10:49:02 and 10:49:12
- ❌ No logs after 10:49:12 (over 2 hours ago)
- ❌ No recent request logs from Cloud Shell tests
```

**Scaling Configuration**:
- Min instances: 0 (default - can scale to zero)
- Max instances: 10
- Container concurrency: 160

---

## 🎯 Root Cause Analysis

### Primary Suspect: Cold Start Failure

**Theory**: The service scaled down to 0 instances after inactivity (after 10:49:12). When Cloud Shell requests arrive, Cloud Run attempts to cold start the container but fails silently, returning generic 404 pages.

**Supporting Evidence**:
1. No request logs appearing in Cloud Run logs (requests aren't reaching the container)
2. 2+ hour gap since last successful request
3. Min instances = 0 allows complete scale-down
4. 404 response is generic HTML from Google Frontend, not FastAPI's JSON 404
5. Startup probe configured: `tcpSocket on port 8080` with 240s timeout

**Why Cold Start Might Fail**:
- **Permission issues**: User `appuser` in Dockerfile might not have needed permissions
- **Startup timeout**: Application takes too long to initialize (>240s probe timeout)
- **Missing dependencies**: Python imports or file access failing on cold start
- **Environment variable issues**: `PORT` not properly read from Cloud Run

### Secondary Suspects

**2. Ingress Configuration Issue**
- Setting changed from `all` to `internal` at 10:49
- However, Cloud Shell should be able to access `internal` services
- Less likely but possible if Cloud Shell is routing externally

**3. IAM/Authentication Issue**
- IAM policy has `user:liptonlegalgroup@gmail.com` as invoker
- Cloud Shell uses same account, so auth should work
- Would return 403, not 404

**4. Container Image Corruption**
- Image digest: `sha256:a12def6797e36de5607608c4e95061ef65892e07464f5a305a01a1c7d829dced`
- Only one revision exists, worked initially
- Less likely

---

## 🔧 Proposed Solutions (Prioritized)

### Solution 1: Force Service Wake-Up & Keep Warm ⭐ **TRY FIRST**

**Action**: Set min-instances to 1 to prevent scale-to-zero and force immediate container restart.

**Command**:
```bash
gcloud run services update python-pipeline \
  --region=us-central1 \
  --min-instances=1
```

**Expected Result**:
- Forces new container instance to start immediately
- Prevents future cold start issues
- Logs should show startup sequence
- Service stays warm (costs ~$7-10/month for f1-micro equivalent)

**Validation**:
```bash
# Wait 30 seconds for container to start
sleep 30

# Check logs for startup
gcloud run services logs read python-pipeline --region=us-central1 --limit=20

# Test from Cloud Shell
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://python-pipeline-zyiwmzwenq-uc.a.run.app/health
```

**Cost Impact**: ~$7-10/month (one always-on instance)

---

### Solution 2: Trigger Manual Revision Rollout

**Action**: Force a new deployment to trigger container restart without code changes.

**Command**:
```bash
gcloud run services update python-pipeline \
  --region=us-central1 \
  --update-labels=deployment-timestamp=$(date +%s)
```

**Expected Result**:
- Creates new revision with same code
- Forces fresh container startup
- Validates that container can start successfully

**Validation**: Same as Solution 1

---

### Solution 3: Fix Dockerfile Permissions (If Solutions 1-2 Fail)

**Issue**: Non-root user `appuser` might lack permissions to execute uvicorn.

**Current Dockerfile** (lines 20-32):
```dockerfile
# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Start FastAPI application with uvicorn
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

**Fix**: Install uvicorn for user and ensure proper PATH.

**Modified Dockerfile**:
```dockerfile
# Install dependencies for appuser
RUN pip install --no-cache-dir -r requirements.txt && \
    useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Ensure user's local bin is in PATH
ENV PATH=/home/appuser/.local/bin:$PATH

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**Deployment**:
```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver/normalization work"

# Rebuild and deploy
gcloud run deploy python-pipeline \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --ingress=internal \
  --vpc-connector=legal-forms-connector \
  --set-env-vars="HOST=0.0.0.0,DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render,USE_INTERNAL_API=true,ENABLE_WEBHOOKS=false" \
  --set-secrets="DOCMOSIS_ACCESS_KEY=docmosis-key:latest" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=1
```

---

### Solution 4: Debug with Startup Logging

**Action**: Add verbose logging to understand startup failures.

**Create startup script** `startup.sh`:
```bash
#!/bin/bash
echo "=== Startup Script Begin ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Working Directory: $(pwd)"
echo "Port: ${PORT:-8080}"
echo "Python Version: $(python3 --version)"
echo "Uvicorn Location: $(which uvicorn)"
echo "Directory Contents:"
ls -la
echo "=== Starting Uvicorn ==="
exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
```

**Modified Dockerfile CMD**:
```dockerfile
COPY startup.sh .
RUN chmod +x startup.sh
CMD ["./startup.sh"]
```

---

### Solution 5: Simplify Ingress for Testing

**Action**: Temporarily switch to `ingress=all` to isolate ingress as the problem.

**Command**:
```bash
gcloud run services update python-pipeline \
  --region=us-central1 \
  --ingress=all
```

**Test from Local Machine**:
```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://python-pipeline-zyiwmzwenq-uc.a.run.app/health
```

**If this works**: Problem is with `ingress=internal` + Cloud Shell routing
**If this fails**: Problem is with container startup

---

## 📋 Recommended Action Plan

### Phase A: Quick Diagnosis (5 minutes)

1. **Check current instance count**:
   ```bash
   gcloud run services describe python-pipeline \
     --region=us-central1 \
     --format="value(status.traffic[0].revisionName)"

   gcloud run revisions describe python-pipeline-00001-m5l \
     --region=us-central1 \
     --format="yaml(status)"
   ```

2. **Try Solution 1 (Min Instances = 1)**:
   - Lowest risk
   - Forces immediate restart
   - Prevents future cold starts
   - Can easily revert

3. **Wait 30 seconds and check logs**:
   ```bash
   gcloud run services logs tail python-pipeline --region=us-central1
   ```

4. **Test from Cloud Shell**:
   ```bash
   curl -v -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://python-pipeline-zyiwmzwenq-uc.a.run.app/health
   ```

### Phase B: If Phase A Succeeds ✅

- Service is now working
- Keep min-instances=1 for production reliability
- Phase 4 validation complete
- Proceed to Phase 5

### Phase C: If Phase A Fails ❌

1. **Check logs for errors during startup**:
   ```bash
   gcloud run services logs read python-pipeline \
     --region=us-central1 \
     --limit=50 | grep -i "error\|failed\|permission"
   ```

2. **Try Solution 5 (Change to ingress=all)**:
   - Tests if problem is ingress-related
   - Quick test, easy to revert

3. **If still failing, try Solution 3 (Fix Dockerfile)**:
   - Address permission issues
   - Redeploy with fixes

4. **If still failing, try Solution 4 (Debug logging)**:
   - Identify exact failure point
   - May reveal environment issues

---

## 🎯 Success Criteria

**Service is considered working when**:

1. ✅ Service status shows `Ready=True`
2. ✅ Health endpoint returns JSON:
   ```json
   {"status": "healthy", "service": "normalization-api"}
   ```
3. ✅ Root endpoint returns API info
4. ✅ Logs show successful request handling
5. ✅ No cold start failures in logs
6. ✅ Service accessible from Cloud Shell with auth token

---

## 📊 Expected Outcomes

### Best Case (Solution 1 works)
- **Time**: 5 minutes
- **Action**: Set min-instances=1
- **Result**: Service immediately accessible
- **Cost**: +$7-10/month

### Medium Case (Solutions 2-3 work)
- **Time**: 15-20 minutes
- **Action**: Redeploy service
- **Result**: Service working after rebuild
- **Cost**: No change

### Worst Case (Requires debugging)
- **Time**: 30-45 minutes
- **Action**: Deep dive with Solution 4
- **Result**: Identify root cause, fix, redeploy
- **Cost**: Depends on fix

---

## 📝 Additional Notes

### Why This Happened

The service likely worked during initial testing because:
1. Container was freshly started from deployment
2. Requests came quickly after deployment (still warm)
3. When we changed ingress settings, service restarted successfully

After 2+ hours of inactivity:
1. Service scaled to 0 instances (min-instances=0)
2. Cloud Shell requests triggered cold start
3. Cold start failed silently (possible permission/timeout issue)
4. Cloud Run returned generic 404 instead of service 404

### Production Recommendations

For production stability:
- **Set min-instances=1** for critical services
- **Monitor cold start metrics** in Cloud Monitoring
- **Set up health check alerts** (404 responses should trigger alert)
- **Use startup probes** to validate container readiness
- **Consider Cloud Run jobs** for long-running tasks
- **Implement circuit breakers** for Node.js → Python calls

---

## 🚀 Next Steps After Fix

Once Python service is validated:

1. ✅ Verify VPC connectivity to Docmosis (10.128.0.3:8080)
2. ✅ Test `/api/normalize` endpoint with sample data
3. ✅ Confirm secrets are accessible
4. ✅ Proceed to Phase 5: Deploy Node.js service
5. ✅ Test end-to-end: Node.js → Python → Docmosis

---

**Prepared by**: Claude Code
**Status**: Ready for execution
**Priority**: HIGH - Blocking Phase 5 deployment

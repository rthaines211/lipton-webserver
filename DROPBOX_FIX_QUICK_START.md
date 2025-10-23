# Dropbox Fix - Quick Start Guide

**Issue:** Dropbox uploads not working - files generating but not uploading to cloud
**Status:** Fix ready to deploy
**Time to fix:** ~5 minutes

---

## TL;DR - Run This

**Option 1: Simple deployment (recommended)**
```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver
./deploy-dropbox-simple.sh
```

**Option 2: Full deployment with verification**
```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver
./deploy-dropbox-fix.sh
```

That's it! The script handles everything automatically.

---

## What's Wrong?

The Python pipeline service has Dropbox fully configured (environment variables, secrets, code) but the `dropbox` Python package isn't loading properly in the container. This causes silent failures - no uploads, no errors, just nothing.

**Evidence:**
- ✅ Documents generate successfully (3-4 .docx per form)
- ❌ No Dropbox initialization messages in logs
- ❌ No upload attempts (success or failure)
- ❌ Empty Dropbox link in completion notification

---

## What the Fix Does

The `deploy-dropbox-fix.sh` script will:

1. ✅ **Verify** your environment (gcloud, secrets, config)
2. ✅ **Backup** current service configuration
3. ✅ **Force rebuild** python-pipeline without cache (ensures fresh package install)
4. ✅ **Deploy** with enhanced logging
5. ✅ **Verify** service health and Dropbox initialization
6. ✅ **Monitor** logs for upload activity

---

## Step-by-Step

### 1. Run the Fix Script

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver
./deploy-dropbox-fix.sh
```

### 2. Wait for Deployment (~3-5 minutes)

You'll see:
```
═══════════════════════════════════════════════════════════════
PHASE 1: Pre-Deployment Checks
═══════════════════════════════════════════════════════════════

✅ Found Python service directory
✅ gcloud CLI configured
✅ Service 'python-pipeline' exists
✅ Secret 'dropbox-token' exists
✅ requirements.txt includes dropbox package

═══════════════════════════════════════════════════════════════
PHASE 4: Deploy Python Pipeline (Clean Build)
═══════════════════════════════════════════════════════════════

🚀 Deploying python-pipeline with --no-cache flag...
...
✅ Deployment successful
```

### 3. Test It

The script will pause and show you:
```
To test the Dropbox upload functionality:

1. Navigate to: https://node-server-945419684329.us-central1.run.app
2. Fill out and submit a test form
3. Monitor logs (press Enter to start)
```

Press Enter to monitor logs, then submit a form in another window.

### 4. Verify Success

**In logs, you should see:**
```
✅ Dropbox service initialized
   Base path: /Current Clients
☁️  Uploaded to Dropbox: webhook_documents/... → /Current Clients/...
✅ Dropbox upload successful: /Current Clients/.../file.docx
```

**In Dropbox:**
- Open Dropbox web/app
- Navigate to `/Current Clients/`
- Look for new folder with property address
- Verify 3-4 .docx files inside

---

## Troubleshooting

### ❌ Deployment Failed

**Check build logs:**
```bash
gcloud builds list --limit=1
BUILD_ID=$(gcloud builds list --limit=1 --format="get(id)")
gcloud builds log $BUILD_ID
```

**Common issues:**
- Docker build timeout → Increase timeout in script
- Package install failed → Check requirements.txt syntax
- Insufficient permissions → Run `gcloud auth login`

### ⚠️ Service Deployed But No Uploads

**Check logs:**
```bash
gcloud run services logs read python-pipeline --region=us-central1 --limit=100 | grep -i dropbox
```

**Look for:**
- `❌ Dropbox authentication failed` → Token expired, regenerate
- `⚠️  Dropbox module not found` → Package didn't install, redeploy
- No messages at all → Module not loading, check imports

### 🔍 Still Not Working?

**Run full diagnostics:**
```bash
# 1. Check environment variables
gcloud run services describe python-pipeline --region=us-central1 --format="yaml(spec.template.spec.containers[0].env)"

# 2. Check secret access
gcloud secrets versions access latest --secret=dropbox-token | head -c 50

# 3. Check recent logs
gcloud run services logs read python-pipeline --region=us-central1 --limit=200

# 4. Test service directly
SERVICE_URL=$(gcloud run services describe python-pipeline --region=us-central1 --format="get(status.url)")
curl -X GET "$SERVICE_URL/health"
```

**Still stuck?**
- Read full diagnostic report: `DROPBOX_DIAGNOSTIC_REPORT.md`
- Check backup config: `./backups/dropbox-fix-*/service-config.yaml`
- Review Python code: `normalization work/src/utils/dropbox_service.py`

---

## Manual Deployment (If Script Fails)

```bash
# Navigate to project root
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# Deploy manually with no-cache flag
gcloud run deploy python-pipeline \
  --source="./normalization work" \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --no-cache \
  --set-env-vars="DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Current Clients,DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents,DROPBOX_CONTINUE_ON_FAILURE=true" \
  --set-secrets="DROPBOX_ACCESS_TOKEN=dropbox-token:latest"

# Wait 30 seconds
sleep 30

# Check logs
gcloud run services logs read python-pipeline --region=us-central1 --limit=50
```

---

## Expected Results

### ✅ Before Fix
```
2025-10-23 15:36:25 - ✅ Phase 5 complete!
2025-10-23 15:36:26 - ✅ Clark Kent vs f f - SROGs Set 1.docx sent successfully
2025-10-23 15:36:31 - ✅ Job completed: 3 documents, URL:
                                                        ^^^ Empty!
```

### ✅ After Fix
```
2025-10-23 16:45:12 - ✅ Dropbox service initialized
2025-10-23 16:45:12 -    Base path: /Current Clients
2025-10-23 16:45:15 - ✅ Phase 5 complete!
2025-10-23 16:45:16 - ✅ Clark Kent vs f f - SROGs Set 1.docx sent successfully
2025-10-23 16:45:16 - ☁️  Uploaded to Dropbox: webhook_documents/... → /Current Clients/...
2025-10-23 16:45:16 - ✅ Dropbox upload successful: /Current Clients/.../file.docx
2025-10-23 16:45:19 - ✅ Job completed: 3 documents, URL: https://www.dropbox.com/...
                                                        ^^^ Dropbox link!
```

---

## Rollback (If Needed)

If something goes wrong, rollback to previous version:

```bash
# Get previous revision
gcloud run revisions list --service=python-pipeline --region=us-central1 --limit=5

# Rollback to specific revision
gcloud run services update-traffic python-pipeline \
  --region=us-central1 \
  --to-revisions=python-pipeline-00XXX-xxx=100

# Or restore from backup
BACKUP_DIR=$(ls -td backups/dropbox-fix-* | head -1)
gcloud run services replace "$BACKUP_DIR/service-config.yaml" --region=us-central1
```

---

## Files Created

This fix creates three files:

1. **`deploy-dropbox-fix.sh`** - Automated deployment script (this guide)
2. **`DROPBOX_DIAGNOSTIC_REPORT.md`** - Detailed technical analysis
3. **`DROPBOX_FIX_QUICK_START.md`** - This quick start guide

---

## Support

**Questions or issues?**

1. Check logs: `gcloud run services logs read python-pipeline --region=us-central1`
2. Read full report: `DROPBOX_DIAGNOSTIC_REPORT.md`
3. Review code: `normalization work/src/utils/dropbox_service.py`
4. Test locally: `cd normalization work && python -c "from src.utils import dropbox_service; print(dropbox_service.is_enabled())"`

---

**Ready to fix it?**

```bash
./deploy-dropbox-fix.sh
```

**That's it!** The script does everything automatically. You'll be uploading to Dropbox in ~5 minutes.

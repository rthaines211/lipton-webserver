# Dropbox OAuth Fix - Complete Guide

## 🔍 Problem Summary

**Issue:** Dropbox access token expired, causing document uploads to fail
**Impact:** Docmosis-generated documents saved locally but NOT uploaded to Dropbox
**Root Cause:** Short-lived tokens expire after ~4 hours
**Solution:** Implement OAuth refresh tokens (auto-refresh forever)

---

## 🚀 Quick Start (2 Options)

### Option A: Automated Script (Recommended) ⚡

Run the complete deployment script that handles everything:

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
./scripts/deploy-dropbox-oauth-fix.sh
```

This script will:
1. ✅ Guide you through generating a refresh token
2. ✅ Update GCP Secret Manager
3. ✅ Replace dropbox_service.py with OAuth version
4. ✅ Deploy to Cloud Run
5. ✅ Verify everything works

**Requirements:**
- Your Dropbox App Key and App Secret ready
- Web browser access for OAuth flow
- gcloud CLI authenticated

---

### Option B: Manual Steps 🔧

If you prefer to do it step-by-step:

#### Step 1: Generate Refresh Token

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
python3 scripts/generate-dropbox-refresh-token.py
```

Follow the prompts:
1. Enter your App Key and App Secret
2. Visit the authorization URL in your browser
3. Click "Allow" to authorize
4. Copy the authorization code and paste it back
5. **Save the generated refresh token!**

#### Step 2: Update GCP Secrets

The script will generate a `setup-dropbox-secrets.sh` file. Run it:

```bash
bash setup-dropbox-secrets.sh
```

Or manually:

```bash
# Create secrets (if they don't exist)
gcloud secrets create dropbox-app-key --project=docmosis-tornado
gcloud secrets create dropbox-app-secret --project=docmosis-tornado
gcloud secrets create dropbox-refresh-token --project=docmosis-tornado

# Store values (replace with your actual values)
echo -n "YOUR_APP_KEY" | gcloud secrets versions add dropbox-app-key --data-file=- --project=docmosis-tornado
echo -n "YOUR_APP_SECRET" | gcloud secrets versions add dropbox-app-secret --data-file=- --project=docmosis-tornado
echo -n "YOUR_REFRESH_TOKEN" | gcloud secrets versions add dropbox-refresh-token --data-file=- --project=docmosis-tornado

# Grant access to Cloud Run service account
for secret in dropbox-app-key dropbox-app-secret dropbox-refresh-token; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=docmosis-tornado
done
```

#### Step 3: Update Code

Backup and replace the Dropbox service:

```bash
# Backup old version
cp "normalization work/src/utils/dropbox_service.py" \
   "normalization work/src/utils/dropbox_service.py.backup.$(date +%Y%m%d)"

# Replace with OAuth version
cp "normalization work/src/utils/dropbox_service_v2.py" \
   "normalization work/src/utils/dropbox_service.py"
```

#### Step 4: Deploy to Cloud Run

```bash
cd "normalization work"

gcloud run deploy python-pipeline \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0 \
  --port=8080 \
  --update-secrets="DROPBOX_APP_KEY=dropbox-app-key:latest,DROPBOX_APP_SECRET=dropbox-app-secret:latest,DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
  --set-env-vars="DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Current Clients,DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents,DROPBOX_CONTINUE_ON_FAILURE=true,BUILD_ID=build-$(date +%s)" \
  --service-account="945419684329-compute@developer.gserviceaccount.com" \
  --project=docmosis-tornado
```

#### Step 5: Verify

Check logs for successful initialization:

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=python-pipeline AND textPayload:\"Dropbox service initialized\"" \
  --limit=5 \
  --project=docmosis-tornado \
  --freshness=10m
```

---

## 📊 What Changed?

### Before (Short-lived Token)
```python
# Old: Expires after ~4 hours
_dbx_client = dropbox.Dropbox(DROPBOX_CONFIG['access_token'])
# ❌ Needs manual renewal every 4 hours
```

### After (OAuth Refresh Token)
```python
# New: Auto-refreshes forever
_dbx_client = dropbox.Dropbox(
    oauth2_refresh_token=DROPBOX_CONFIG['refresh_token'],
    app_key=DROPBOX_CONFIG['app_key'],
    app_secret=DROPBOX_CONFIG['app_secret']
)
# ✅ Automatically refreshes when needed
```

### Environment Variables

**Old:**
- `DROPBOX_ACCESS_TOKEN` - Short-lived token (expires)

**New:**
- `DROPBOX_APP_KEY` - OAuth App Key (never expires)
- `DROPBOX_APP_SECRET` - OAuth App Secret (never expires)
- `DROPBOX_REFRESH_TOKEN` - Refresh token (never expires)

---

## 🔍 Verification & Testing

### Check Service Status

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=python-pipeline" \
  --project=docmosis-tornado \
  --limit=50 \
  --format="table(timestamp,textPayload)"

# Monitor logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=python-pipeline" \
  --project=docmosis-tornado
```

### Check for Dropbox Activity

```bash
# Look for successful uploads
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=python-pipeline AND textPayload:\"Uploaded to Dropbox\"" \
  --limit=10 \
  --project=docmosis-tornado \
  --freshness=1h
```

### Expected Log Messages

**✅ Success:**
```
✅ Dropbox service initialized (OAuth)
   Account: Your Name
   Email: your@email.com
   Base path: /Current Clients
   🔄 Token auto-refresh enabled
```

**❌ Failure:**
```
❌ Dropbox authentication failed: AuthError(...)
   Please verify your OAuth credentials are correct
```

---

## 🧪 Testing Upload

1. Submit a test form through your application
2. Monitor logs:
   ```bash
   gcloud run services logs tail python-pipeline --region=us-central1 --project=docmosis-tornado
   ```
3. Look for:
   - `"Sending webhooks..."` - Pipeline starts
   - `"saved_file": "webhook_documents/..."` - Document generated
   - `"☁️  Uploaded to Dropbox"` - Upload successful
4. Check Dropbox folder: `/Current Clients/`

---

## 🛠️ Troubleshooting

### Problem: "Dropbox authentication failed"

**Solution:**
1. Verify secrets are correct:
   ```bash
   gcloud secrets versions list dropbox-app-key --project=docmosis-tornado
   gcloud secrets versions list dropbox-app-secret --project=docmosis-tornado
   gcloud secrets versions list dropbox-refresh-token --project=docmosis-tornado
   ```

2. Regenerate refresh token:
   ```bash
   python3 scripts/generate-dropbox-refresh-token.py
   ```

3. Update secrets and redeploy

### Problem: "Missing credentials"

**Solution:**
Check environment variables in Cloud Run:
```bash
gcloud run services describe python-pipeline \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" \
  --project=docmosis-tornado
```

Should show secrets for `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`

### Problem: Documents still not uploading

**Solution:**
1. Verify `DROPBOX_ENABLED=true`:
   ```bash
   gcloud run services describe python-pipeline \
     --region=us-central1 \
     --format="value(spec.template.spec.containers[0].env)" \
     --project=docmosis-tornado | grep DROPBOX
   ```

2. Check if files are being generated locally:
   - Look in logs for `"saved_file": "webhook_documents/..."`

3. Check Dropbox initialization logs:
   ```bash
   gcloud logging read \
     "resource.type=cloud_run_revision AND resource.labels.service_name=python-pipeline AND textPayload:\"Dropbox\"" \
     --limit=20 \
     --project=docmosis-tornado
   ```

### Problem: "Unable to refresh access token"

This means you're still using short-lived tokens instead of refresh tokens.

**Solution:**
1. Verify you replaced `dropbox_service.py` with the OAuth version
2. Verify environment variables are set correctly
3. Redeploy the service

---

## 📁 Files Created/Modified

### New Files
- `scripts/generate-dropbox-refresh-token.py` - Token generation script
- `scripts/deploy-dropbox-oauth-fix.sh` - Complete deployment automation
- `normalization work/src/utils/dropbox_service_v2.py` - OAuth version
- `DROPBOX_OAUTH_FIX_GUIDE.md` - This guide

### Modified Files
- `normalization work/src/utils/dropbox_service.py` - Replaced with OAuth version
  - Backup: `dropbox_service.py.backup.YYYYMMDD`

### GCP Resources
- Secret: `dropbox-app-key` (new)
- Secret: `dropbox-app-secret` (new)
- Secret: `dropbox-refresh-token` (new)
- Secret: `dropbox-token` (can be deleted after migration)

---

## 🔒 Security Notes

1. **Refresh tokens never expire** unless you revoke them in Dropbox settings
2. **App secrets stored in GCP Secret Manager** (encrypted at rest)
3. **Service account permissions** grant access only to authorized secrets
4. **Refresh tokens can be revoked** at any time from Dropbox App Console

---

## 📚 Additional Resources

- [Dropbox OAuth Guide](https://www.dropbox.com/developers/documentation/http/documentation)
- [GCP Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)

---

## 🎯 Summary

**Before:**
- ❌ Token expires every ~4 hours
- ❌ Manual renewal required
- ❌ Service breaks when token expires

**After:**
- ✅ Token auto-refreshes forever
- ✅ Zero maintenance required
- ✅ Service never breaks due to token expiration

---

**Questions or Issues?**

Check logs:
```bash
gcloud run services logs tail python-pipeline --region=us-central1 --project=docmosis-tornado
```

Or review the comprehensive codebase documentation created during analysis.

**Last Updated:** 2025-10-27
**Author:** Claude Code

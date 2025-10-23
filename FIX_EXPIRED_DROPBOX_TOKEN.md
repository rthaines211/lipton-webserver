# 🚨 URGENT: Fix Expired Dropbox Token

## Status: Dropbox Token Has Expired ⏰

Your deployment succeeded, but the Dropbox access token is **expired**.

**Evidence from logs (2025-10-23 15:54:13):**
```
❌ Dropbox authentication failed: AuthError('expired_access_token')
⚠️ Unable to refresh access token without refresh token and app key
```

**Impact:**
- ✅ Documents generate successfully (4 .docx files)
- ❌ **Dropbox uploads skipped** (token expired)
- ❌ No shareable Dropbox links created

---

## Quick Fix: Generate New Long-Lived Token

### Step 1: Generate New Token (2 minutes)

1. **Go to Dropbox App Console:**
   ```
   https://www.dropbox.com/developers/apps
   ```

2. **Select Your App** (or create one if needed):
   - Click on your existing app
   - If you don't have one, create a new "Scoped access" app

3. **Generate Access Token:**
   - Click the **"Settings"** tab
   - Scroll to **"Generated access token"**
   - Click **"Generate"** button
   - **IMPORTANT:** Copy the entire token (it's very long)

4. **Token Should Look Like:**
   ```
   sl.u.AAAA...very_long_string...BBBB
   ```
   (Hundreds of characters)

---

### Step 2: Update Secret in GCP (1 minute)

Save the new token to Google Cloud Secret Manager:

```bash
# Create a temporary file with the token
echo "YOUR_NEW_TOKEN_HERE" > /tmp/dropbox-token.txt

# Update the secret
gcloud secrets versions add dropbox-token --data-file=/tmp/dropbox-token.txt

# Clean up
rm /tmp/dropbox-token.txt
```

**Or use direct input:**
```bash
echo "sl.u.YOUR_VERY_LONG_TOKEN_HERE" | gcloud secrets versions add dropbox-token --data-file=-
```

---

### Step 3: Redeploy Python Service (3 minutes)

Force the service to pick up the new token:

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# Quick redeploy
./deploy-dropbox-simple.sh
```

**Or manually:**
```bash
gcloud run services update python-pipeline \
  --region=us-central1 \
  --update-secrets=DROPBOX_ACCESS_TOKEN=dropbox-token:latest
```

---

### Step 4: Verify It Works (1 minute)

```bash
# Wait 30 seconds for service to restart
sleep 30

# Check logs for successful initialization
gcloud run services logs read python-pipeline \
  --region=us-central1 \
  --limit=50 | grep -i "dropbox"
```

**You should see:**
```
✅ Dropbox service initialized
   Base path: /Current Clients
```

**NOT:**
```
❌ Dropbox authentication failed: AuthError('expired_access_token')
```

---

### Step 5: Test with Form Submission

1. **Submit a test form:**
   ```
   https://node-server-945419684329.us-central1.run.app
   ```

2. **Monitor logs in real-time:**
   ```bash
   gcloud run services logs read python-pipeline \
     --region=us-central1 \
     --limit=50 \
     --follow | grep "☁️"
   ```

3. **You should see:**
   ```
   ☁️  Uploaded to Dropbox: webhook_documents/... → /Current Clients/...
   ✅ Dropbox upload successful: /Current Clients/.../file.docx
   ```

4. **Check Dropbox:**
   - Open Dropbox
   - Navigate to `/Current Clients/`
   - Verify new folders with .docx files

---

## Why This Happened

### The Problem: Short-Lived vs Long-Lived Tokens

Your current token is **short-lived** (expires in 4 hours). This happened because:

1. Token was generated without "offline access" scope
2. No refresh token was configured
3. Token expired on Oct 23, 2025 at ~15:54 UTC

### The Solution: Long-Lived Token

Generate a new token with these characteristics:
- ✅ **Never expires** (unless manually revoked)
- ✅ No refresh token needed
- ✅ Works indefinitely

---

## Current Token Status

**From logs:**
```
2025-10-23 15:54:13 - ❌ Dropbox authentication failed:
  AuthError('90a5f85a9e4048f2acd5622368fa4fa5',
  AuthError('expired_access_token', None))
```

**Current token ID:** `90a5f85a9e4048f2acd5622368fa4fa5`
**Status:** Expired ⏰
**Action Required:** Replace with new long-lived token

---

## Troubleshooting

### Issue: "Token is still expired after update"

**Check if secret was actually updated:**
```bash
gcloud secrets versions list dropbox-token
```

You should see a new version with a recent timestamp.

**Check if service is using latest version:**
```bash
gcloud run services describe python-pipeline \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

Should show: `dropbox-token:latest`

### Issue: "Still no uploads in logs"

**Force container restart:**
```bash
# Update with a dummy env var to force restart
gcloud run services update python-pipeline \
  --region=us-central1 \
  --update-env-vars="RESTART_TIME=$(date +%s)"
```

### Issue: "Can't find my Dropbox app"

**Create a new app:**
1. Go to: https://www.dropbox.com/developers/apps/create
2. Choose: **Scoped access**
3. Choose: **Full Dropbox** (or App folder)
4. Name your app: `LegalFormApp` (or similar)
5. Go to **Settings** tab → Generate access token

---

## Prevention: Making Tokens Last Forever

To avoid this in the future:

### Option 1: Use OAuth 2.0 with Refresh Token
- Configure app with offline access
- Store refresh token in Secret Manager
- Implement token refresh logic

### Option 2: Use Generated Access Token (Recommended)
- Generate token from Dropbox App Console
- These tokens don't expire (unless manually revoked)
- **This is what we're doing now ✅**

### Option 3: Monitor Token Expiration
- Add health check for Dropbox authentication
- Alert when token is about to expire
- Proactively regenerate before expiration

---

## Quick Copy-Paste Commands

**Complete fix in 3 commands:**

```bash
# 1. Update secret (paste your new token)
echo "sl.u.YOUR_NEW_VERY_LONG_TOKEN_HERE" | \
  gcloud secrets versions add dropbox-token --data-file=-

# 2. Redeploy service
gcloud run services update python-pipeline \
  --region=us-central1 \
  --update-secrets=DROPBOX_ACCESS_TOKEN=dropbox-token:latest

# 3. Verify it worked
sleep 30 && \
gcloud run services logs read python-pipeline \
  --region=us-central1 \
  --limit=20 | grep -i "dropbox"
```

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| Deployment | ✅ Success | None needed |
| Document Generation | ✅ Working | None needed |
| Dropbox Module | ✅ Loaded | None needed |
| **Dropbox Token** | ❌ **EXPIRED** | **Generate new token** |
| Dropbox Uploads | ❌ Blocked | Fix token first |

---

**Time to fix:** ~5 minutes
**Difficulty:** Easy (just copy new token)
**Priority:** HIGH (no backups happening)

---

## Need Help?

**Check current status:**
```bash
gcloud run services logs read python-pipeline \
  --region=us-central1 \
  --limit=100 | grep -E "Dropbox|AuthError|expired"
```

**Get Dropbox app info:**
```bash
# Show masked token from secret
gcloud secrets versions access latest --secret=dropbox-token | head -c 30
echo "..."
```

---

**Ready to fix it?**

1. Get new token from: https://www.dropbox.com/developers/apps
2. Run the 3 commands above
3. Test with a form submission
4. Celebrate! 🎉

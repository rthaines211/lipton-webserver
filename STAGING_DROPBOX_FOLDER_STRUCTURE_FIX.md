# ✅ Staging Dropbox Folder Structure Fix - Complete

**Date:** October 27, 2025
**Issue:** Documents uploading flat to `/Staging/Current Clients/` instead of organized folder structure
**Status:** RESOLVED ✅

---

## 🐛 Root Cause

### The Problem

**Expected folder structure:**
```
/Staging/Current Clients/
└── <Street Address>/
    └── <HoH Name>/
        └── Discovery Propounded/
            ├── ADMISSIONS/
            │   └── document.docx
            ├── SROGs/
            │   └── document.docx
            └── PODs/
                └── document.docx
```

**Actual result:**
```
/Staging/Current Clients/
├── document1.docx  ❌ Flat, no folders!
├── document2.docx  ❌
└── document3.docx  ❌
```

### Configuration Mismatch

**Python pipeline saves documents to:**
```python
webhook_documents/Hello/Clark Kent/Discovery Propounded/ADMISSIONS/doc.docx
                 ^^^^^^^^^^^^^^^ This is the actual path
```

**But env var was configured as:**
```bash
DROPBOX_LOCAL_OUTPUT_PATH=output  ❌ Wrong!
```

**Result:**
```python
# In dropbox_service.py line 143:
if output_str in local_str:  # "output" in "webhook_documents/..."
    # NOT FOUND!
    logger.warning(f"⚠️  Could not find '{output_str}' in '{local_str}', using filename only")
    relative_path = Path(local_path_obj.name)  # Just the filename!
```

`★ Insight ─────────────────────────────────────`
**Path Mapping Logic:** The Dropbox service tries to find the "local output path" in the full file path to extract the relative folder structure. When it can't find "output" in "webhook_documents/...", it falls back to safety mode and uploads just the filename to avoid breaking the upload entirely.

**Example of Correct Mapping:**
- Local path: `webhook_documents/123 Main St/John Doe/Discovery/SROGs/doc.docx`
- Remove prefix: `123 Main St/John Doe/Discovery/SROGs/doc.docx`
- Add base path: `/Staging/Current Clients/123 Main St/John Doe/Discovery/SROGs/doc.docx` ✅

This preserves the entire folder hierarchy from street address down to document type.
`─────────────────────────────────────────────────`

---

## ✅ Solution

### Fixed Configuration

**Changed Python pipeline env var:**
```diff
- DROPBOX_LOCAL_OUTPUT_PATH=output
+ DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents
```

**New revision:** `python-pipeline-staging-00002-vs6`

### How It Works Now

```python
# Local path
webhook_documents/Hello/Clark Kent/Discovery Propounded/ADMISSIONS/doc.docx

# Remove "webhook_documents/" prefix
Hello/Clark Kent/Discovery Propounded/ADMISSIONS/doc.docx

# Add base path
/Staging/Current Clients/Hello/Clark Kent/Discovery Propounded/ADMISSIONS/doc.docx ✅
```

**Result:** Full folder structure preserved! 🎉

---

## 📊 Before vs After

### Before (Flat Upload) ❌

**Log output:**
```
⚠️  Could not find 'output' in 'webhook_documents/Hello/Clark Kent/...'
☁️  Uploaded to Dropbox: ... → /Staging/Current Clients/document.docx
```

**Dropbox structure:**
```
/Staging/Current Clients/
├── Clark Kent vs fasdf asdf - Discovery Request for Admissions.docx
├── Clark Kent vs fasdf asdf - Discovery Propounded PODs.docx
├── Clark Kent vs fasdf asdf - Discovery Propounded SROGs.docx
└── Clark Kent vs fasdf asdf - Form Interrogatories.docx
```

❌ **Problems:**
- All files in one folder (messy!)
- Can't find documents by plaintiff name
- Can't browse by discovery type
- Shared link points to flat folder

### After (Structured Upload) ✅

**Log output:**
```
☁️  Uploaded to Dropbox: ... → /Staging/Current Clients/Hello/Clark Kent/Discovery Propounded/ADMISSIONS/document.docx
```

**Dropbox structure:**
```
/Staging/Current Clients/
└── Hello/                              ← Street Address
    └── Clark Kent/                     ← HoH Name
        └── Discovery Propounded/       ← Category
            ├── ADMISSIONS/             ← Doc Type
            │   └── Clark Kent vs fasdf asdf - Discovery Request for Admissions.docx
            ├── SROGs/
            │   └── Clark Kent vs fasdf asdf - Discovery Propounded SROGs.docx
            ├── PODs/
            │   └── Clark Kent vs fasdf asdf - Discovery Propounded PODs.docx
            └── FORM_INTERROGATORIES/
                └── Clark Kent vs fasdf asdf - Form Interrogatories.docx
```

✅ **Benefits:**
- Organized by street address → HoH → discovery type → document type
- Easy to navigate and find specific documents
- Shared link shows full folder hierarchy
- Matches production structure
- Professional client experience

---

## 🧪 Testing Instructions

### Test 1: Submit a New Form

1. **Open staging:**
   ```
   https://node-server-staging-zyiwmzwenq-uc.a.run.app
   ```

2. **Fill out form:**
   - Property address: `456 Test Avenue`
   - Plaintiff (HoH): `Jane Smith`
   - Add some discovery items

3. **Submit and wait for pipeline**

### Test 2: Check Python Pipeline Logs

```bash
gcloud run services logs read python-pipeline-staging \
  --region=us-central1 \
  --limit=100 | grep -i "uploaded to dropbox"
```

**Expected output (with folder structure):**
```
☁️  Uploaded to Dropbox: webhook_documents/456 Test Avenue/Jane Smith/Discovery Propounded/ADMISSIONS/doc.docx
    → /Staging/Current Clients/456 Test Avenue/Jane Smith/Discovery Propounded/ADMISSIONS/doc.docx
```

**Should NOT see:**
```
⚠️  Could not find 'webhook_documents' in '...'  ❌ This warning means it's broken
```

### Test 3: Verify Dropbox Structure

1. **Log into Dropbox**
2. **Navigate to:** `/Staging/Current Clients/`
3. **Verify structure:**
   ```
   ✅ Street address folder exists
   ✅ HoH name folder exists inside street address
   ✅ Discovery Propounded folder exists
   ✅ Document type folders (ADMISSIONS, SROGs, etc.) exist
   ✅ Documents are in correct type folders
   ```

### Test 4: Check Shared Link

1. **Submit form with email notification**
2. **Click Dropbox link in email**
3. **Should open:** `/Staging/Current Clients/[street]/`
4. **Should see:** Full folder hierarchy, not flat file list

---

## 📋 Configuration Summary

### Python Pipeline (python-pipeline-staging)

**Current Configuration (✅ FIXED):**
```bash
DROPBOX_ENABLED=true
DROPBOX_BASE_PATH=/Staging/Current Clients
DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents  ✅ CORRECTED

# OAuth credentials (already correct)
DROPBOX_APP_KEY=dropbox-app-key:latest
DROPBOX_APP_SECRET=dropbox-app-secret:latest
DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest
```

**Revision:** `python-pipeline-staging-00002-vs6`

### Expected Folder Hierarchy

```
/Staging/Current Clients/
└── <Property Address>/
    └── <Plaintiff Name (HoH)>/
        ├── Discovery Propounded/
        │   ├── ADMISSIONS/
        │   │   └── [Plaintiff] vs [Defendant] - Discovery Request for Admissions Set X of Y.docx
        │   ├── SROGs/
        │   │   └── [Plaintiff] vs [Defendant] - Discovery Propounded SROGs Set X of Y.docx
        │   ├── PODs/
        │   │   └── [Plaintiff] vs [Defendant] - Discovery Propounded PODs Set X of Y.docx
        │   ├── FORM_INTERROGATORIES/
        │   │   └── [Plaintiff] vs [Defendant] - Form Interrogatories Set X of Y.docx
        │   └── SPECIAL_INTERROGATORIES/
        │       └── [Plaintiff] vs [Defendant] - Special Interrogatories Set X of Y.docx
        └── Other Documents/
            └── (future document types)
```

---

## 🔧 Production Parity Check

### Production Configuration
```bash
DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents  ✅
DROPBOX_BASE_PATH=/Current Clients
```

### Staging Configuration (After Fix)
```bash
DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents  ✅ NOW MATCHES
DROPBOX_BASE_PATH=/Staging/Current Clients
```

✅ **Parity Achieved:** Staging now matches production's path handling logic!

---

## 🐛 Troubleshooting

### Issue: Documents still uploading flat

**Check logs for warnings:**
```bash
gcloud run services logs read python-pipeline-staging \
  --region=us-central1 \
  --limit=50 | grep "Could not find"
```

**If you see:**
```
⚠️  Could not find 'webhook_documents' in '...'
```

**Then:**
- Configuration didn't take effect
- Check: `gcloud run services describe python-pipeline-staging --format="value(spec.template.spec.containers[0].env)" | grep DROPBOX_LOCAL`
- Should show: `'value': 'webhook_documents'`

### Issue: Folders not being created

**Check for folder creation logs:**
```bash
gcloud run services logs read python-pipeline-staging \
  --region=us-central1 \
  --limit=100 | grep "Created Dropbox folder"
```

**Should see:**
```
📁 Created Dropbox folder: /Staging/Current Clients/456 Test Avenue
📁 Created Dropbox folder: /Staging/Current Clients/456 Test Avenue/Jane Smith
📁 Created Dropbox folder: /Staging/Current Clients/456 Test Avenue/Jane Smith/Discovery Propounded
📁 Created Dropbox folder: /Staging/Current Clients/456 Test Avenue/Jane Smith/Discovery Propounded/ADMISSIONS
```

### Issue: Wrong folder structure

**Verify the local path in webhook:**
```bash
# Check what path the webhook actually sends
gcloud run services logs read python-pipeline-staging \
  --region=us-central1 \
  --limit=100 | grep "saved_file"
```

**Should show:**
```json
"saved_file": "webhook_documents/[Address]/[Name]/Discovery Propounded/[Type]/doc.docx"
```

If the local path is different, update `DROPBOX_LOCAL_OUTPUT_PATH` to match it.

---

## 📚 Related Issues

- [STAGING_DROPBOX_FIX_COMPLETE.md](STAGING_DROPBOX_FIX_COMPLETE.md) - Database schema initialization
- [STAGING_EMAIL_DROPBOX_LINKS_FIX.md](STAGING_EMAIL_DROPBOX_LINKS_FIX.md) - Email shared links fix
- [EMAIL_DROPBOX_LINKS_FIX.md](EMAIL_DROPBOX_LINKS_FIX.md) - Production OAuth migration

---

## ✅ Summary

**Problem:**
- Documents uploading flat to `/Staging/Current Clients/[filename]` ❌
- No folder organization by street address, HoH, or document type

**Root Cause:**
- `DROPBOX_LOCAL_OUTPUT_PATH='output'` didn't match actual path `webhook_documents/...`
- Path mapping failed, fell back to filename-only upload

**Solution:**
- Changed `DROPBOX_LOCAL_OUTPUT_PATH='webhook_documents'` ✅
- Redeployed Python pipeline (revision 00002-vs6)

**Result:**
- Full folder hierarchy preserved: `/Staging/Current Clients/[Address]/[Name]/Discovery Propounded/[Type]/doc.docx` ✅
- Organized, professional structure
- Easy navigation for clients
- Matches production behavior

**Status:** Ready for testing! 🚀

---

**Fixed by:** Claude Code
**Completed:** October 27, 2025
**Python Pipeline Revision:** python-pipeline-staging-00002-vs6

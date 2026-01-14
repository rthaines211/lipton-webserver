# Phase 8: Deployment Guide - Contingency Agreement Form

## Overview

Deploy the contingency agreement form to production alongside the existing docs form on litponlegal.com.

**Current Setup:**
- Domain: `litponlegal.com`
- Platform: Google Cloud Run
- Project: `docmosis-tornado`
- Service: `node-server`
- Region: `us-central1`
- SSL: Already configured ✅

**Form URLs:**
- Docs form: `https://litponlegal.com/forms/docs` (existing)
- Contingency form: `https://litponlegal.com/forms/agreement` (new)

---

## Pre-Deployment Checklist

### ✅ Code Complete
- [x] Contingency form frontend complete
- [x] Backend API complete
- [x] Document generation working
- [x] Guardian data population working
- [x] Automatic ZIP download working
- [x] All tests passing (8/8)

### ⚠️ Before Deploying

1. **Database Migration**
   - Run migration to add `document_paths` column (if not already done in production)
   - Script: `/tmp/add_document_paths_column.sql`

2. **Environment Variables**
   - Production already has: DB_PASSWORD, ACCESS_TOKEN, GCS_BUCKET_NAME
   - No new environment variables needed ✅

3. **Dependencies**
   - New packages added: `pizzip`, `docxtemplater`, `archiver`
   - Will be installed automatically during Cloud Run build ✅

4. **Template File**
   - Template located at: `templates/LLG Contingency Fee Agreement - Template.docx`
   - Ensure this file exists in production deployment ✅

---

## Deployment Steps

### Step 1: Commit Changes to Git

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# Check status
git status

# Add all new files
git add .

# Commit
git commit -m "feat: Add contingency agreement form with document generation

- Implement contingency agreement form UI matching docs form
- Add document generation service (one DOCX per plaintiff)
- Implement guardian data population for minors
- Add automatic ZIP download to browser
- Create comprehensive test suite (8/8 tests passing)
- Complete Phase 6 & Phase 7"

# Push to repository
git push origin main
```

### Step 2: Deploy to Cloud Run

Use existing deployment script:

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# Run deployment script
./deploy-to-cloud-run.sh
```

This script will:
1. Grant Secret Manager permissions (if needed)
2. Build Docker image from source
3. Deploy to Cloud Run
4. Verify health endpoint

### Step 3: Run Database Migration (if needed)

Connect to Cloud SQL and run:

```sql
-- Check if column exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contingency_agreements'
AND column_name = 'document_paths';

-- If not exists, add it
ALTER TABLE contingency_agreements
ADD COLUMN IF NOT EXISTS document_paths JSONB;

COMMENT ON COLUMN contingency_agreements.document_paths
IS 'Array of paths to generated DOCX files';
```

### Step 4: Verify Deployment

1. **Health Check**
   ```bash
   curl https://litponlegal.com/health
   ```
   Expected: `{"status":"healthy",...}`

2. **Test Contingency Form Access**
   - Navigate to: `https://litponlegal.com/forms/agreement/`
   - Enter password: `lipton-agreement-2025`
   - Should see contingency form

3. **Test End-to-End**
   - Fill out form with 2 plaintiffs (1 adult, 1 minor)
   - Mark second plaintiff as minor
   - Select first plaintiff as guardian
   - Submit form
   - Verify ZIP download starts automatically
   - Open DOCX files and verify data is correct

---

## Cloud Run Configuration

### Current Service Configuration
```yaml
Service: node-server
Project: docmosis-tornado
Region: us-central1
Min Instances: 0
Max Instances: 10
Memory: 512Mi
CPU: 1
Timeout: 300s
```

### Environment Variables (Cloud Run)
```bash
NODE_ENV=production
PORT=8080
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db
DB_NAME=lipton_legal_forms
DB_USER=admin
DB_PASSWORD=[from Secret Manager]
ACCESS_TOKEN=[from Secret Manager]
GCS_BUCKET_NAME=lipton-legal-uploads
```

### Cloud SQL Connection
- Instance: `docmosis-tornado:us-central1:legal-forms-db`
- Connected via Unix socket
- Automatic connection handling ✅

---

## File Storage

### Generated Documents Location

**Local Development:**
```
/Users/ryanhaines/Desktop/Lipton Webserver/generated-documents/contingency-agreements/
```

**Production (Cloud Run):**
Documents will be stored in the container's ephemeral filesystem:
```
/app/generated-documents/contingency-agreements/
```

**Important Notes:**
- Cloud Run containers are stateless
- Files are stored temporarily in container
- Files are included in ZIP download immediately
- No persistent storage needed (files downloaded to user immediately)
- Old files cleaned up automatically when container restarts

**Alternative (if persistent storage needed):**
- Could upload to Google Cloud Storage bucket
- Would need to modify `contingency-document-generator.js`
- Not required for current workflow ✅

---

## DNS Configuration

DNS already configured for litponlegal.com pointing to Cloud Run service ✅

No DNS changes needed. New form will be accessible at:
```
https://litponlegal.com/forms/agreement/
```

---

## SSL/HTTPS

Cloud Run provides automatic SSL certificates for custom domains ✅

Certificate managed by Google. No action needed.

---

## Monitoring

### Application Logs
View logs in Google Cloud Console:
```
https://console.cloud.google.com/run/detail/us-central1/node-server/logs?project=docmosis-tornado
```

### Key Metrics to Monitor
- Request latency (should be < 2 seconds for 4 plaintiffs)
- Document generation success rate
- Error rates
- Memory usage
- CPU usage

### Health Endpoint
```bash
curl https://litponlegal.com/health
```

### Form-Specific Endpoints
```bash
# Docs form (existing)
curl https://litponlegal.com/forms/docs/

# Contingency form (new)
curl https://litponlegal.com/forms/agreement/
```

---

## Rollback Plan

If deployment has issues:

### Quick Rollback
```bash
# Rollback to previous revision
gcloud run services update-traffic node-server \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1 \
  --project=docmosis-tornado
```

### Find Previous Revision
```bash
gcloud run revisions list \
  --service=node-server \
  --region=us-central1 \
  --project=docmosis-tornado
```

---

## Post-Deployment Testing

### Smoke Tests

1. **Health Check**
   ```bash
   curl https://litponlegal.com/health
   ```

2. **Docs Form** (ensure existing form still works)
   - Visit: `https://litponlegal.com/forms/docs/`
   - Test submission

3. **Contingency Form** (test new form)
   - Visit: `https://litponlegal.com/forms/agreement/`
   - Password: `lipton-agreement-2025`
   - Submit test case
   - Verify ZIP download

### Test Cases to Run in Production

Run through key scenarios:
1. Single adult plaintiff
2. Adult + minor with guardian data
3. Multiple plaintiffs
4. Download ZIP file
5. Open DOCX files and verify data

---

## Troubleshooting

### Issue: Form won't load
- **Check**: Cloud Run logs for errors
- **Check**: Health endpoint responds
- **Solution**: Redeploy if needed

### Issue: Documents not generating
- **Check**: Template file exists in container
- **Check**: `pizzip` and `docxtemplater` installed
- **Solution**: Rebuild and redeploy

### Issue: ZIP download not working
- **Check**: `archiver` package installed
- **Check**: Document paths in database
- **Solution**: Check logs for document generation errors

### Issue: Guardian data not populating
- **Check**: Backend logs show "Populated guardian data for minor"
- **Solution**: Already tested and working ✅

---

## Security Notes

### Passwords
- Docs form: Already in production
- Contingency form: `lipton-agreement-2025`
- Passwords stored in `middleware/password-auth.js`

### Authentication
- Form-level password protection ✅
- API endpoints open (trusted network)
- Consider adding API authentication if exposing publicly

### SQL Injection
- All queries use parameterized statements ✅
- Tested and verified safe ✅

---

## Success Criteria

Deployment successful when:
- ✅ Health endpoint responds
- ✅ Docs form still works
- ✅ Contingency form loads and accepts password
- ✅ Form submits successfully
- ✅ Documents generate correctly
- ✅ ZIP download works
- ✅ Guardian data populates for minors
- ✅ No errors in Cloud Run logs

---

## Quick Deployment Commands

```bash
# 1. Commit and push
cd /Users/ryanhaines/Desktop/Lipton\ Webserver
git add .
git commit -m "feat: Add contingency agreement form"
git push origin main

# 2. Deploy to Cloud Run
./deploy-to-cloud-run.sh

# 3. Verify
curl https://litponlegal.com/health

# 4. Test in browser
open https://litponlegal.com/forms/agreement/
```

---

## Post-Deployment

After successful deployment:

1. **Update Documentation**
   - Document the new form URL
   - Share password with team
   - Update any internal wikis

2. **Monitor**
   - Watch logs for first few submissions
   - Check document generation success
   - Monitor performance

3. **Backup**
   - Database backups already configured ✅
   - No additional backup needed for documents (ephemeral)

---

## Support

If issues arise:
- Check Cloud Run logs first
- Review test report: `PHASE7_TEST_REPORT.md`
- Re-run test suite: `bash /tmp/test-suite-contingency.sh`
- Check database connectivity
- Verify template file exists

---

## Next Steps After Deployment

**Phase 9: Documentation**
- Create user guide
- Document API endpoints
- Update README
- Create admin documentation

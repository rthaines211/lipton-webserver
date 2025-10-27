# Environment Variables Reference

Complete reference for all environment variables used in the Legal Form Application.

---

## Table of Contents

- [Critical Variables](#critical-variables)
- [Important Variables](#important-variables)
- [Optional Variables](#optional-variables)
- [Secret Management](#secret-management)
- [Environment-Specific Values](#environment-specific-values)

---

## Critical Variables

These variables are **required** for the application to function. The application will fail to start if any of these are missing.

### NODE_ENV

- **Description:** Application environment mode
- **Valid Values:** `development`, `staging`, `production`
- **Production Value:** `production`
- **Development Value:** `development`
- **Used In:** [server.js:88](../server.js#L88)
- **Purpose:** Determines which features are enabled:
  - **Production mode** (`production`):
    - Authentication is **REQUIRED**
    - Cloud Storage is **ENABLED**
    - Error details are **HIDDEN** from responses
  - **Development mode** (`development`):
    - Authentication is **BYPASSED**
    - Cloud Storage is **DISABLED** (uses local filesystem)
    - Error details are **SHOWN** in responses

**Example:**
```bash
NODE_ENV=production
```

---

### DB_USER

- **Description:** PostgreSQL database username
- **Production Value:** `app-user` (from GCP Secret: `db-user`)
- **Development Value:** `ryanhaines` (local user)
- **Used In:** [server.js:205](../server.js#L205)
- **Storage:** GCP Secret Manager for production value

**Example:**
```bash
# Production
DB_USER=app-user

# Development
DB_USER=ryanhaines
```

---

### DB_HOST

- **Description:** Database connection host
- **Production Value:** `/cloudsql/docmosis-tornado:us-central1:legal-forms-db` (Cloud SQL Unix socket)
- **Development Value:** `localhost`
- **Used In:** [server.js:206](../server.js#L206)
- **Notes:**
  - Production uses Cloud SQL Unix socket for secure connection
  - Requires Cloud SQL connection annotation on Cloud Run service
  - Format: `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`

**Example:**
```bash
# Production (Cloud SQL)
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db

# Development (Local PostgreSQL)
DB_HOST=localhost
```

---

### DB_PASSWORD

- **Description:** PostgreSQL database password
- **Storage:** **ALWAYS** in GCP Secret Manager (secret: `DB_PASSWORD`)
- **Used In:** [server.js:208](../server.js#L208)
- **Security:** Never commit to version control, never log

**Cloud Run Configuration:**
```bash
--update-secrets="DB_PASSWORD=DB_PASSWORD:latest"
```

---

### DB_NAME

- **Description:** PostgreSQL database name
- **Production Value:** `legal_forms_db`
- **Development Value:** `legal_forms_db`
- **Used In:** [server.js:207](../server.js#L207)

**Example:**
```bash
DB_NAME=legal_forms_db
```

---

### DB_PORT

- **Description:** PostgreSQL port
- **Default Value:** `5432` (standard PostgreSQL port)
- **Used In:** [server.js:209](../server.js#L209)
- **Notes:** Rarely needs to be changed

**Example:**
```bash
DB_PORT=5432
```

---

## Important Variables

These variables are needed for specific features. The application will start without them, but features won't work.

### SENDGRID_API_KEY

- **Description:** SendGrid API key for sending email notifications
- **Storage:** **ALWAYS** in GCP Secret Manager (secret: `sendgrid-api-key`)
- **Used In:** [email-service.js](../email-service.js)
- **Setup:** Create at https://app.sendgrid.com/settings/api_keys
- **Permissions Required:** Mail Send
- **Security:** Treat as password, never commit to version control

**Features Affected:**
- Email notifications after form submission
- Document availability notifications

**Cloud Run Configuration:**
```bash
--update-secrets="SENDGRID_API_KEY=sendgrid-api-key:latest"
```

---

### EMAIL_FROM_ADDRESS

- **Description:** Email address that appears in the "From" field
- **Production Value:** `notifications@liptonlegal.com`
- **Used In:** [email-service.js](../email-service.js)
- **Requirements:** Must be verified in SendGrid
- **Verification:** https://app.sendgrid.com/settings/sender_auth

**Example:**
```bash
EMAIL_FROM_ADDRESS=notifications@liptonlegal.com
```

---

### EMAIL_FROM_NAME

- **Description:** Name that appears in the "From" field
- **Production Value:** `Lipton Legal`
- **Used In:** [email-service.js](../email-service.js)

**Example:**
```bash
EMAIL_FROM_NAME=Lipton Legal
```

---

### EMAIL_ENABLED

- **Description:** Enable/disable email notifications
- **Valid Values:** `true`, `false`
- **Production Value:** `true`
- **Development Value:** `false` (avoid sending test emails)
- **Used In:** [email-service.js](../email-service.js)

**Example:**
```bash
# Production
EMAIL_ENABLED=true

# Development
EMAIL_ENABLED=false
```

---

### ACCESS_TOKEN

- **Description:** API authentication token for securing endpoints
- **Storage:** **ALWAYS** in GCP Secret Manager (secret: `ACCESS_TOKEN`)
- **Used In:** [server.js:87](../server.js#L87)
- **Purpose:** When `NODE_ENV=production`, all non-static endpoints require this token
- **Usage:**
  - URL query: `?token=YOUR_TOKEN`
  - Header: `Authorization: Bearer YOUR_TOKEN`

**Cloud Run Configuration:**
```bash
--update-secrets="ACCESS_TOKEN=ACCESS_TOKEN:latest"
```

---

### PIPELINE_API_URL

- **Description:** URL of the Python normalization pipeline service
- **Production Value:** `https://python-pipeline-zyiwmzwenq-uc.a.run.app`
- **Development Value:** `http://localhost:8000`
- **Used In:** [server.js:172](../server.js#L172)
- **Purpose:** Processes legal forms through 5-phase normalization pipeline

**Example:**
```bash
# Production
PIPELINE_API_URL=https://python-pipeline-zyiwmzwenq-uc.a.run.app

# Development
PIPELINE_API_URL=http://localhost:8000
```

---

### DROPBOX_ACCESS_TOKEN

- **Description:** Dropbox API access token for file uploads
- **Storage:** **ALWAYS** in GCP Secret Manager (secret: `dropbox-token`)
- **Used In:** [dropbox-service.js](../dropbox-service.js)
- **Issue:** Current implementation uses short-lived tokens (expire ~4 hours)
- **Recommendation:** Migrate to OAuth refresh tokens (like Python service)

**Cloud Run Configuration:**
```bash
--update-secrets="DROPBOX_ACCESS_TOKEN=dropbox-token:latest"
```

---

## Optional Variables

These variables have sensible defaults and can be omitted.

### PORT

- **Description:** HTTP server port
- **Default Value:**
  - Cloud Run: `8080` (auto-set)
  - Local: `3000`
- **Used In:** [server.js:78](../server.js#L78)
- **Notes:** Cloud Run automatically sets this, no need to configure

---

### EMAIL_MAX_RETRIES

- **Description:** Maximum number of retry attempts for failed emails
- **Default Value:** `3`
- **Used In:** [email-service.js](../email-service.js)
- **Retry Strategy:** Exponential backoff (1s, 2s, 4s)

**Example:**
```bash
EMAIL_MAX_RETRIES=3
```

---

### EMAIL_RETRY_DELAY_MS

- **Description:** Base delay between email retry attempts (milliseconds)
- **Default Value:** `1000` (1 second)
- **Used In:** [email-service.js](../email-service.js)
- **Notes:** Uses exponential backoff, so actual delays are 1s, 2s, 4s

**Example:**
```bash
EMAIL_RETRY_DELAY_MS=1000
```

---

### PIPELINE_API_ENABLED

- **Description:** Enable/disable pipeline integration
- **Valid Values:** `true`, `false`
- **Default Value:** `true`
- **Used In:** [server.js:173](../server.js#L173)

**Example:**
```bash
PIPELINE_API_ENABLED=true
```

---

### PIPELINE_API_TIMEOUT

- **Description:** Pipeline request timeout (milliseconds)
- **Default Value:** `60000` (1 minute) for development
- **Production Value:** `300000` (5 minutes) - large documents take time
- **Used In:** [server.js:174](../server.js#L174)

**Example:**
```bash
# Production (allow more time)
PIPELINE_API_TIMEOUT=300000

# Development
PIPELINE_API_TIMEOUT=60000
```

---

### EXECUTE_PIPELINE_ON_SUBMIT

- **Description:** Automatically execute pipeline when forms are submitted
- **Valid Values:** `true`, `false`
- **Default Value:** `true`
- **Used In:** [server.js:176](../server.js#L176)

**Example:**
```bash
EXECUTE_PIPELINE_ON_SUBMIT=true
```

---

### CONTINUE_ON_PIPELINE_FAILURE

- **Description:** Continue saving form even if pipeline fails
- **Valid Values:** `true`, `false`
- **Default Value:** `true`
- **Used In:** [server.js:177](../server.js#L177)
- **Purpose:** Prevents data loss if pipeline has issues

**Example:**
```bash
CONTINUE_ON_PIPELINE_FAILURE=true
```

---

### DROPBOX_ENABLED

- **Description:** Enable/disable Dropbox uploads
- **Valid Values:** `true`, `false`
- **Production Value:** `true`
- **Development Value:** `false`
- **Used In:** [server.js:2239](../server.js#L2239)

**Example:**
```bash
# Production
DROPBOX_ENABLED=true

# Development
DROPBOX_ENABLED=false
```

---

### DROPBOX_BASE_PATH

- **Description:** Base folder path in Dropbox for document storage
- **Production Value:** `/Current Clients`
- **Development Value:** `/Apps/LegalFormApp`
- **Used In:** [dropbox-service.js](../dropbox-service.js)
- **Format:** Documents organized as `{BASE_PATH}/{case-number}/{documents}`

**Example:**
```bash
DROPBOX_BASE_PATH=/Current Clients
```

---

### LOCAL_OUTPUT_PATH

- **Description:** Local directory for temporary document storage
- **Default Value:** `output`
- **Used In:** [dropbox-service.js](../dropbox-service.js)
- **Purpose:** Documents stored here before Dropbox upload

**Example:**
```bash
LOCAL_OUTPUT_PATH=output
```

---

### CONTINUE_ON_DROPBOX_FAILURE

- **Description:** Continue even if Dropbox upload fails
- **Valid Values:** `true`, `false`
- **Default Value:** `true`
- **Purpose:** Prevents data loss if Dropbox has issues
- **Behavior:** Documents saved locally even if upload fails

**Example:**
```bash
CONTINUE_ON_DROPBOX_FAILURE=true
```

---

### GCLOUD_PROJECT

- **Description:** Google Cloud project ID
- **Production Value:** `docmosis-tornado`
- **Used In:** [server.js:229](../server.js#L229), [server.js:234](../server.js#L234)
- **Default:** Auto-detected from Cloud Run environment

**Example:**
```bash
GCLOUD_PROJECT=docmosis-tornado
```

---

### GCS_BUCKET_NAME

- **Description:** Google Cloud Storage bucket for form submissions
- **Production Value:** `docmosis-tornado-form-submissions`
- **Used In:** [server.js:229](../server.js#L229)
- **Format:** `{PROJECT_ID}-form-submissions`
- **Requirements:** Bucket must exist and service account must have write access

**Example:**
```bash
GCS_BUCKET_NAME=docmosis-tornado-form-submissions
```

---

## Secret Management

### What Should Be a Secret?

**Always secrets:**
- Passwords (`DB_PASSWORD`)
- API keys (`SENDGRID_API_KEY`, `DROPBOX_ACCESS_TOKEN`)
- Authentication tokens (`ACCESS_TOKEN`)
- Private keys
- OAuth client secrets

**Never secrets:**
- URLs (`PIPELINE_API_URL`)
- Email addresses (`EMAIL_FROM_ADDRESS`)
- Feature flags (`EMAIL_ENABLED`, `DROPBOX_ENABLED`)
- Timeouts and limits
- Project IDs

### Creating Secrets

```bash
# Create a new secret
gcloud secrets create SECRET_NAME --project=docmosis-tornado

# Add value to secret
echo -n "secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=docmosis-tornado

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=docmosis-tornado
```

### Using Secrets in Cloud Run

```bash
gcloud run services update node-server \
  --update-secrets="ENV_VAR_NAME=SECRET_NAME:latest" \
  --region=us-central1 \
  --project=docmosis-tornado
```

---

## Environment-Specific Values

### Production

```env
NODE_ENV=production
DB_USER=app-user
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db
EMAIL_ENABLED=true
DROPBOX_ENABLED=true
PIPELINE_API_TIMEOUT=300000
```

### Staging

```env
NODE_ENV=staging
DB_USER=app-user-staging
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db-staging
EMAIL_ENABLED=true
EMAIL_FROM_NAME=Lipton Legal [STAGING]
DROPBOX_BASE_PATH=/Staging/Current Clients
```

### Development

```env
NODE_ENV=development
DB_USER=ryanhaines
DB_HOST=localhost
EMAIL_ENABLED=false
DROPBOX_ENABLED=false
PIPELINE_API_URL=http://localhost:8000
```

---

## Validation

### Manual Validation

```bash
# Check which variables are set
npm run validate:env

# Expected output:
# ✅ All required environment variables are set
```

### Automatic Validation

The application validates environment variables on startup ([server.js:46-49](../server.js#L46-L49)).

If validation fails:
```
❌ CRITICAL ERRORS - Application cannot start:

   • DB_USER is not set
     Description: PostgreSQL username
     Example: app-user

❌ Cannot start application - missing critical environment variables
```

---

## Troubleshooting

### Common Issues

**Issue:** Application won't start in production
**Cause:** Missing critical environment variable
**Solution:** Run validation and fix missing variables

**Issue:** Emails not sending
**Cause:** `SENDGRID_API_KEY` not set or `EMAIL_ENABLED=false`
**Solution:** Verify secret is mounted and `EMAIL_ENABLED=true`

**Issue:** Dropbox uploads failing
**Cause:** Token expired or `DROPBOX_ENABLED=false`
**Solution:** Regenerate token or migrate to OAuth refresh tokens

**Issue:** Pipeline timing out
**Cause:** `PIPELINE_API_TIMEOUT` too short
**Solution:** Increase to 300000 (5 minutes) for production

---

## Related Documentation

- [Configuration README](../config/README.md) - Configuration file structure
- [Deployment Guide](DEPLOYMENT.md) - How to deploy with environment variables
- [Cloud Run Architecture](CLOUD_RUN_ARCHITECTURE.md) - System architecture

---

**Last Updated:** October 27, 2025
**Version:** 1.0

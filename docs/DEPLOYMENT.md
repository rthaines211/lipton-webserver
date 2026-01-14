# Deployment Guide

Complete guide for deploying the Legal Form Application to Google Cloud Run.

---

## Quick Start

> **⚠️ IMPORTANT: Deployment Flow**
>
> **Pushing to `main` does NOT deploy directly to production.** The CI/CD pipeline follows a linear progression:
>
> 1. `develop` → **Development** (automatic)
> 2. `main` → **Staging** (automatic) → **Production** (requires manual approval in GitHub)

### Deploy to Development

```bash
git push origin develop  # Auto-deploys to node-server-dev
```

### Deploy to Staging

```bash
git push origin main  # Auto-deploys to node-server-staging
```

### Deploy to Production

Production deployment requires **manual approval** in GitHub Actions:

```bash
# Step 1: Push to main (triggers staging deployment first)
git push origin main

# Step 2: Wait for staging deployment to complete

# Step 3: Approve production deployment in GitHub:
#   1. Go to GitHub Actions tab
#   2. Find the running "CI/CD Pipeline" workflow
#   3. Click "Review deployments" for the production environment
#   4. Approve the deployment
```

Alternatively, use manual deployment script (bypasses GitHub Actions):
```bash
./scripts/deploy.sh production
```

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Artifacts](#deployment-artifacts)
- [Automated Deployment (CI/CD)](#automated-deployment-cicd)
- [Manual Deployment](#manual-deployment)
- [First-Time Setup](#first-time-setup)
- [Updating Environment Variables](#updating-environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [Git](https://git-scm.com/downloads)
- [Node.js 20+](https://nodejs.org/)

### Required Access

- GCP project: `docmosis-tornado`
- IAM roles:
  - `roles/run.admin` (deploy Cloud Run services)
  - `roles/secretmanager.secretAccessor` (access secrets)
  - `roles/storage.admin` (manage Cloud Storage)

### Authentication

```bash
# Authenticate to GCP
gcloud auth login

# Set default project
gcloud config set project docmosis-tornado
```

---

## Deployment Artifacts

### What Gets Deployed

The `.gcloudignore` file controls which files are included in Cloud Run deployments. Understanding this is critical for successful PDF generation.

**Key Files INCLUDED in Deployment:**
```
✅ normalization work/pdf_templates/  # PDF templates (REQUIRED for CM-110 generation)
   ├── cm110.pdf                      # Original encrypted template
   └── cm110-decrypted.pdf            # Active template used by pdf-lib

✅ server/                             # Backend services
   ├── config/cm110-field-mapping.json   # PDF field mappings
   ├── services/pdf-service.js          # PDF generation logic
   ├── routes/pdf-routes.js             # API endpoints
   └── utils/pdf-field-mapper.js        # Field mapping utilities

✅ js/                                 # Frontend JavaScript
✅ index.html                          # Main UI
✅ server.js                           # Express server
✅ package.json                        # Dependencies (includes pdf-lib, pg-boss)
```

**Files EXCLUDED from Deployment:**
```
❌ node_modules/        # Reinstalled during build
❌ tests/               # Test files not needed in production
❌ *.md                 # Documentation (except README.md)
❌ .git/                # Git metadata
❌ logs/                # Log files
❌ data/                # Local form submissions
❌ .env*                # Environment files (using Secrets Manager)
```

### Critical: PDF Templates Must Be Deployed

**⚠️ IMPORTANT:** The `.gcloudignore` file has been configured to **INCLUDE** PDF templates:

```gitignore
# .gcloudignore contents:

# IMPORTANT: Do NOT exclude PDF templates - they're needed for CM-110 generation
# The following files MUST be included:
# - normalization work/pdf_templates/cm110.pdf
# - normalization work/pdf_templates/cm110-decrypted.pdf
```

**Why this matters:**
- pdf-lib requires the template file at runtime
- Template is loaded from `normalization work/pdf_templates/cm110-decrypted.pdf`
- If templates are excluded, PDF generation will fail with "Template not found" error

### Verifying Deployment Contents

**After deployment, verify templates are present:**

```bash
# Connect to Cloud Run container (requires gcloud beta)
gcloud beta run services proxy node-server --region=us-central1

# In another terminal, check if templates exist
curl http://localhost:8080/api/health/detailed
# Look for: "pdfTemplates": {"available": true, "count": 2}
```

**Check deployment size:**
```bash
# View recent deployment
gcloud run revisions list --service=node-server --region=us-central1 --limit=1

# Deployment should be ~50-100MB
# If it's only 5-10MB, templates may be missing
```

---

## Automated Deployment (CI/CD)

### GitHub Actions Workflow

The application uses GitHub Actions for automated deployments. The workflow is defined in [`.github/workflows/ci-cd-main.yml`](../.github/workflows/ci-cd-main.yml).

### Deployment Triggers

| Branch | Event | Environment | Service Name | Approval Required |
|--------|-------|-------------|--------------|-------------------|
| `develop` | Push | Development | `node-server-dev` | No |
| `main` | Push | Staging | `node-server-staging` | No |
| `main` | Push (after staging) | Production | `node-server` | **Yes** (GitHub Environment) |

> **Note:** Production deployment is part of the same workflow triggered by pushing to `main`. After staging completes successfully, the production job waits for manual approval via GitHub's environment protection rules. This is NOT a separate manual trigger - it's a gated step in the pipeline.

### Workflow Steps

1. **Code Quality** - Linting, formatting checks
2. **Testing** - Automated tests with PostgreSQL
3. **Security Scanning** - npm audit, container scanning
4. **Build** - Docker image creation
5. **Deploy** - Cloud Run deployment with full configuration
6. **Validation** - Smoke tests and health checks

### Configuration Files Used

- `config/production.env` - Production variables
- `config/staging.env` - Staging variables
- `config/development.env` - Development variables
- `.gcloudignore` - Files excluded from Cloud Run deployment

**All environment variables are automatically applied from these files.**

### Triggering Manual Production Deployment

```bash
# Via GitHub CLI
gh workflow run "CI/CD Pipeline" --field environment=production

# Via GitHub Web UI
# 1. Go to Actions tab
# 2. Select "CI/CD Pipeline"
# 3. Click "Run workflow"
# 4. Select "production"
# 5. Approve deployment in Environments tab
```

---

## Manual Deployment

### Using Deployment Script (Recommended)

```bash
# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to development
./scripts/deploy.sh development
```

**What the script does:**
1. ✅ Validates GCP authentication
2. ✅ Loads environment variables from `config/*.env`
3. ✅ Confirms deployment (prompts you)
4. ✅ Deploys to Cloud Run with all secrets
5. ✅ Runs health check
6. ✅ Shows service URL and next steps

### Using gcloud Command Directly

```bash
# Load configuration
ENV_VARS=$(cat config/production.env | grep -v '^#' | grep -v '^$' | tr '\n' ',' | sed 's/,$//')

# Deploy
gcloud run deploy node-server \
  --source=. \
  --region=us-central1 \
  --project=docmosis-tornado \
  --platform=managed \
  --allow-unauthenticated \
  --update-secrets="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,DROPBOX_ACCESS_TOKEN=dropbox-token:latest" \
  --set-env-vars="$ENV_VARS" \
  --service-account=945419684329-compute@developer.gserviceaccount.com \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0
```

---

## First-Time Setup

If this is your first deployment, follow these steps:

### 1. Create GCP Secrets

```bash
# Create secrets (if they don't exist)
gcloud secrets create DB_PASSWORD --project=docmosis-tornado
gcloud secrets create ACCESS_TOKEN --project=docmosis-tornado
gcloud secrets create sendgrid-api-key --project=docmosis-tornado
gcloud secrets create dropbox-token --project=docmosis-tornado
gcloud secrets create db-user --project=docmosis-tornado

# Add values to secrets
echo -n "your-db-password" | gcloud secrets versions add DB_PASSWORD --data-file=-
echo -n "your-access-token" | gcloud secrets versions add ACCESS_TOKEN --data-file=-
echo -n "SG.your-sendgrid-key" | gcloud secrets versions add sendgrid-api-key --data-file=-
echo -n "your-dropbox-token" | gcloud secrets versions add dropbox-token --data-file=-
echo -n "app-user" | gcloud secrets versions add db-user --data-file=-
```

### 2. Grant Service Account Access

```bash
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

for secret in DB_PASSWORD ACCESS_TOKEN sendgrid-api-key dropbox-token db-user; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=docmosis-tornado
done
```

### 3. Create Cloud SQL Instance (if needed)

```bash
gcloud sql instances create legal-forms-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --project=docmosis-tornado

# Create database
gcloud sql databases create legal_forms_db \
  --instance=legal-forms-db \
  --project=docmosis-tornado

# Create user
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=YOUR_PASSWORD \
  --project=docmosis-tornado
```

### 4. Create Cloud Storage Bucket

```bash
gsutil mb -p docmosis-tornado -l us-central1 gs://docmosis-tornado-form-submissions

# Grant service account access
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:objectAdmin gs://docmosis-tornado-form-submissions
```

### 5. Update Configuration Files

Edit `config/production.env` with your actual values:
- Update `DB_HOST` with your Cloud SQL connection string
- Verify all other values are correct

### 6. Deploy

```bash
./scripts/deploy.sh production
```

### 7. Verify

```bash
./scripts/test-production-config.sh
```

---

## Updating Environment Variables

### Updating Non-Sensitive Variables

**Method 1: Update config file and redeploy**

```bash
# 1. Edit config file
vim config/production.env

# 2. Commit changes
git add config/production.env
git commit -m "Update production configuration"
git push

# GitHub Actions automatically redeploys with new values
```

**Method 2: Update directly in Cloud Run**

```bash
gcloud run services update node-server \
  --update-env-vars="NEW_VAR=new_value" \
  --region=us-central1
```

### Updating Secrets

```bash
# Update secret value
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Cloud Run automatically uses latest version (`:latest`)
# If you want to force update:
gcloud run services update node-server \
  --update-secrets="ENV_VAR=SECRET_NAME:latest" \
  --region=us-central1
```

### Adding New Variables

1. Add to config file:
   ```bash
   echo "NEW_FEATURE_FLAG=true" >> config/production.env
   ```

2. If critical, add to validator:
   ```bash
   vim config/env-validator.js
   # Add to critical or important section
   ```

3. Commit and deploy:
   ```bash
   git add config/
   git commit -m "Add NEW_FEATURE_FLAG configuration"
   git push  # Auto-deploys with new variable
   ```

---

## Troubleshooting

### Deployment Failures

**Error:** "Permission denied"
```bash
# Check authentication
gcloud auth list

# Verify project
gcloud config get-value project

# Re-authenticate if needed
gcloud auth login
```

**Error:** "Secret not found"
```bash
# List secrets
gcloud secrets list --project=docmosis-tornado

# Create missing secret
gcloud secrets create SECRET_NAME --project=docmosis-tornado
echo -n "value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

**Error:** "Service account lacks permission"
```bash
# Grant access to secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Application Not Starting

**Check validation errors:**
```bash
# View recent logs
gcloud run services logs read node-server --region=us-central1 --limit=50

# Look for validation failures
gcloud run services logs read node-server --region=us-central1 | grep "❌"
```

**Common issues:**
- Missing critical environment variable → Run fix script: `./scripts/fix-cloud-run-env-vars.sh`
- Wrong NODE_ENV value → Should be 'production'
- Database connection failure → Check DB_HOST and Cloud SQL connection

### Verifying Configuration

```bash
# Check all environment variables
gcloud run services describe node-server \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"

# Count variables
gcloud run services describe node-server \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env[].name)" | wc -l

# Should show 30+ variables
```

### Testing After Deployment

```bash
# 1. Health check
curl https://node-server-zyiwmzwenq-uc.a.run.app/health

# 2. Run automated tests
./scripts/test-production-config.sh

# 3. Submit test form
# Open browser to service URL and submit test data

# 4. Check logs for errors
gcloud run services logs read node-server --region=us-central1 --limit=100
```

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Health endpoint returns 200 OK
- [ ] All 30+ environment variables are set
- [ ] NODE_ENV equals 'production'
- [ ] Authentication is enabled (requests without token return 401/403)
- [ ] Database queries work (submit test form)
- [ ] Email notifications send (submit form with email)
- [ ] Dropbox uploads work (check Dropbox folder)
- [ ] Pipeline processes forms (check logs)
- [ ] No errors in Cloud Run logs

**Quick verification:**
```bash
./scripts/test-production-config.sh
```

---

## Rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list \
  --service=node-server \
  --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic node-server \
  --to-revisions=node-server-00055-xsv=100 \
  --region=us-central1
```

### Rollback via Git

```bash
# Revert last commit
git revert HEAD
git push

# GitHub Actions automatically deploys reverted version
```

---

## Monitoring

### View Logs

```bash
# Tail logs (live)
gcloud run services logs tail node-server --region=us-central1

# Read recent logs
gcloud run services logs read node-server --region=us-central1 --limit=100

# Filter for errors
gcloud run services logs read node-server --region=us-central1 | grep "ERROR"
```

### Check Service Status

```bash
# Service description
gcloud run services describe node-server --region=us-central1

# Current revision
gcloud run services describe node-server \
  --region=us-central1 \
  --format="value(status.latestReadyRevisionName)"

# Service URL
gcloud run services describe node-server \
  --region=us-central1 \
  --format="value(status.url)"
```

---

## Related Documentation

- [Environment Variables Reference](ENVIRONMENT_VARIABLES.md) - Complete variable documentation
- [Configuration README](../config/README.md) - Configuration file structure
- [CI/CD Workflows](operations/CI_CD_WORKFLOWS.md) - GitHub Actions workflows

---

**Last Updated:** October 27, 2025
**Version:** 1.0

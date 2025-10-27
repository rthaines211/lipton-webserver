# GitHub Secrets Setup Guide

Complete guide to setting up GitHub Secrets for CI/CD automation.

## Table of Contents
- [Overview](#overview)
- [GCP Service Account Setup](#gcp-service-account-setup)
- [Adding Secrets to GitHub](#adding-secrets-to-github)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Overview

GitHub Secrets store sensitive credentials that your CI/CD workflows need to deploy to Google Cloud Platform. These secrets are encrypted and never exposed in logs.

**Required Secret:**
- `GCP_SA_KEY` - Google Cloud Service Account JSON key

**Optional Secrets:**
- `SLACK_WEBHOOK_URL` - For deployment notifications
- `CODECOV_TOKEN` - For code coverage reports

## GCP Service Account Setup

### Option 1: Use Existing Service Account

If you've been deploying to GCP manually, you likely already have a service account.

**Find your existing service account:**

```bash
# List all service accounts in your project
gcloud iam service-accounts list --project=docmosis-tornado

# Output will look like:
# DISPLAY NAME              EMAIL
# github-actions            github-actions@docmosis-tornado.iam.gserviceaccount.com
# node-server               node-server@docmosis-tornado.iam.gserviceaccount.com
```

**Create a new key for your existing service account:**

```bash
# Replace with your service account email
SERVICE_ACCOUNT_EMAIL="github-actions@docmosis-tornado.iam.gserviceaccount.com"

# Create and download key
gcloud iam service-accounts keys create ~/gcp-sa-key.json \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=docmosis-tornado

# Key file created at: ~/gcp-sa-key.json
```

### Option 2: Create New Service Account

Create a dedicated service account for GitHub Actions:

```bash
# Set project
gcloud config set project docmosis-tornado

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --description="Service account for GitHub Actions workflows"

# Create key
gcloud iam service-accounts keys create ~/gcp-sa-key.json \
  --iam-account=github-actions@docmosis-tornado.iam.gserviceaccount.com
```

### Grant Required Permissions

The service account needs these roles to deploy your application:

```bash
# Set variables
PROJECT_ID="docmosis-tornado"
SA_EMAIL="github-actions@docmosis-tornado.iam.gserviceaccount.com"

# Grant Cloud Run Admin (deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

# Grant Service Account User (act as other service accounts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Grant Storage Admin (for Cloud Storage)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

# Grant Artifact Registry Writer (push Docker images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

# Grant Cloud SQL Client (database access)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

# Grant Compute Instance Admin (for VM monitoring deployment)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/compute.instanceAdmin.v1"
```

**Verify permissions:**

```bash
# List all roles for the service account
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$SA_EMAIL" \
  --format="table(bindings.role)"
```

Expected output:
```
ROLE
roles/run.admin
roles/iam.serviceAccountUser
roles/storage.admin
roles/artifactregistry.writer
roles/cloudsql.client
roles/compute.instanceAdmin.v1
```

## Adding Secrets to GitHub

### Method 1: GitHub Web UI (Recommended)

**Step-by-step:**

1. **Open your service account key file:**
   ```bash
   cat ~/gcp-sa-key.json
   ```

2. **Copy the entire JSON content** (it will look like this):
   ```json
   {
     "type": "service_account",
     "project_id": "docmosis-tornado",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "github-actions@docmosis-tornado.iam.gserviceaccount.com",
     "client_id": "123456789",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

3. **Go to your GitHub repository**

4. **Navigate to Settings:**
   - Click **Settings** tab
   - In left sidebar, click **Secrets and variables** → **Actions**

5. **Create new secret:**
   - Click **New repository secret**
   - Name: `GCP_SA_KEY`
   - Value: Paste the entire JSON content
   - Click **Add secret**

6. **Verify:**
   - You should see `GCP_SA_KEY` in the list
   - It will show as "Updated X seconds ago"

### Method 2: GitHub CLI

If you have the GitHub CLI installed:

```bash
# Login to GitHub CLI
gh auth login

# Add secret from file
gh secret set GCP_SA_KEY < ~/gcp-sa-key.json

# Verify
gh secret list
```

### Security Best Practices

**After adding the secret:**

1. **Delete the local key file:**
   ```bash
   # Securely delete the key file
   shred -u ~/gcp-sa-key.json  # Linux
   # or
   rm -P ~/gcp-sa-key.json     # macOS
   ```

2. **Never commit the key file:**
   ```bash
   # Add to .gitignore
   echo "*.json" >> .gitignore
   echo "*-key.json" >> .gitignore
   echo "gcp-*.json" >> .gitignore
   ```

3. **Rotate keys regularly:**
   ```bash
   # List existing keys
   gcloud iam service-accounts keys list \
     --iam-account=$SA_EMAIL

   # Delete old keys (keep only the latest)
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=$SA_EMAIL
   ```

## Adding Optional Secrets

### Slack Notifications (Optional)

If you want deployment notifications in Slack:

1. **Create Slack webhook:**
   - Go to https://api.slack.com/apps
   - Create new app → Incoming Webhooks
   - Copy webhook URL (looks like: `https://hooks.slack.com/services/...`)

2. **Add to GitHub:**
   - Settings → Secrets → New secret
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL

3. **Uncomment notification steps in workflows:**
   ```yaml
   # In .github/workflows/*.yml
   # Find and uncomment sections like:
   - name: Send deployment notification
     run: |
       curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
         -H 'Content-Type: application/json' \
         -d '{"text":"Deployment successful!"}'
   ```

## Verification

### Test the Secret

Create a test workflow to verify the secret works:

```bash
# Create test workflow file
mkdir -p .github/workflows
cat > .github/workflows/test-gcp-auth.yml << 'EOF'
name: Test GCP Authentication

on:
  workflow_dispatch:

jobs:
  test-auth:
    runs-on: ubuntu-latest
    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Test gcloud commands
        run: |
          gcloud config list
          gcloud projects list
          gcloud run services list --region=us-central1

      - name: Success!
        run: echo "✅ GCP authentication working!"
EOF
```

**Run the test:**

1. Commit and push the test workflow
2. Go to **Actions** tab in GitHub
3. Select **Test GCP Authentication**
4. Click **Run workflow**
5. Wait for it to complete

**Expected result:**
- ✅ All steps should pass
- ✅ You should see your GCP project info in logs
- ✅ Cloud Run services should be listed

**If it fails:**
- Check the secret name is exactly `GCP_SA_KEY`
- Verify the JSON is valid (no extra spaces/newlines)
- Ensure service account has required permissions

## Troubleshooting

### Error: "credentials_json: input must be a JSON object"

**Problem**: The secret isn't valid JSON

**Solution:**
```bash
# Validate JSON locally
cat ~/gcp-sa-key.json | jq .

# If valid, re-copy and re-add to GitHub
# Make sure to copy the ENTIRE content including { and }
```

### Error: "Permission denied"

**Problem**: Service account lacks required permissions

**Solution:**
```bash
# Re-run the permission grants from above
# Or use the all-in-one script:
./scripts/setup-github-actions-permissions.sh
```

### Error: "Service account does not exist"

**Problem**: Service account was deleted or doesn't exist

**Solution:**
```bash
# Create new service account (see Option 2 above)
# Then add permissions and create key
```

### Secret Not Found in Workflow

**Problem**: Workflow can't access the secret

**Checklist:**
- ✅ Secret name is exactly `GCP_SA_KEY` (case-sensitive)
- ✅ Secret is in the correct repository
- ✅ Repository settings allow workflow access
- ✅ Secret was saved (not just previewed)

### Verify Secret is Set

```bash
# Using GitHub CLI
gh secret list

# Expected output:
# GCP_SA_KEY  Updated 2025-10-23
```

## Helper Scripts

### Create Service Account Script

Save as `scripts/create-github-actions-sa.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID="docmosis-tornado"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="gcp-sa-key.json"

echo "Creating GitHub Actions service account..."

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Actions CI/CD" \
  --project=$PROJECT_ID

# Grant permissions
roles=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/storage.admin"
  "roles/artifactregistry.writer"
  "roles/cloudsql.client"
  "roles/compute.instanceAdmin.v1"
)

for role in "${roles[@]}"; do
  echo "Granting $role..."
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role"
done

# Create key
echo "Creating service account key..."
gcloud iam service-accounts keys create $KEY_FILE \
  --iam-account=$SA_EMAIL \
  --project=$PROJECT_ID

echo ""
echo "✅ Service account created: $SA_EMAIL"
echo "✅ Key file created: $KEY_FILE"
echo ""
echo "Next steps:"
echo "1. cat $KEY_FILE"
echo "2. Copy the entire JSON content"
echo "3. Go to GitHub → Settings → Secrets → Add GCP_SA_KEY"
echo "4. Delete key file: shred -u $KEY_FILE"
```

**Run it:**
```bash
chmod +x scripts/create-github-actions-sa.sh
./scripts/create-github-actions-sa.sh
```

## Summary

**Quick checklist:**

- [ ] Service account created or identified
- [ ] Service account has required roles (6 roles)
- [ ] Key file generated (`gcp-sa-key.json`)
- [ ] Secret added to GitHub as `GCP_SA_KEY`
- [ ] Local key file deleted securely
- [ ] Test workflow run successfully
- [ ] Optional secrets added (Slack, etc.)

**You're ready when:**
- ✅ `gh secret list` shows `GCP_SA_KEY`
- ✅ Test workflow passes all steps
- ✅ Local key file is deleted

## Next Steps

After secrets are configured:

1. **Commit workflows to main:**
   ```bash
   git add .github/workflows/
   git commit -m "ci: add CI/CD workflows"
   git push origin main
   ```

2. **Watch first deployment:**
   - Go to **Actions** tab
   - See workflows trigger automatically
   - Check logs for any issues

3. **Set up production environment:**
   - Settings → Environments → New environment
   - Name: `production`
   - Add required reviewers

---

**Need Help?**
- GCP Documentation: https://cloud.google.com/iam/docs/service-accounts
- GitHub Secrets Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Troubleshooting: See [CI_CD_WORKFLOWS.md](CI_CD_WORKFLOWS.md)

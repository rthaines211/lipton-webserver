# GitHub Environment Protection Setup

## Overview
This guide explains how to configure GitHub Environments to ensure staging deploys first, followed by manual approval for production.

## Current Workflow Behavior

### On Push to `main` Branch:
1. ✅ **Quality Checks** → Code linting, formatting, complexity analysis
2. ✅ **Testing** → Unit tests, integration tests, E2E tests
3. ✅ **Security Scanning** → Dependency audit, secret scanning, container scanning
4. ✅ **Build** → Creates artifacts for development, staging, and production
5. ✅ **Deploy to Staging** → Automatically deploys to staging environment
6. ⏸️ **Wait for Approval** → Manual approval required for production
7. ✅ **Deploy to Production** → Only after staging succeeds and approval granted

---

## Required GitHub Configuration

### Step 1: Create GitHub Environments

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Create three environments:

#### Environment: `development`
- **URL**: `https://node-server-dev-zyiwmzwenq-uc.a.run.app`
- **Protection Rules**: None (auto-deploy on develop branch)

#### Environment: `staging`
- **URL**: `https://node-server-staging-zyiwmzwenq-uc.a.run.app`
- **Protection Rules**:
  - ✅ **Required reviewers**: (Optional) Add 1-2 reviewers
  - ✅ **Deployment branches**: Only `main` branch
  - ⏱️ **Wait timer**: 0 minutes (deploy immediately)

#### Environment: `production`
- **URL**: `https://node-server-zyiwmzwenq-uc.a.run.app`
- **Protection Rules**: ⚠️ **CRITICAL**
  - ✅ **Required reviewers**: Add 1-2 senior team members
  - ✅ **Deployment branches**: Only `main` branch
  - ⏱️ **Wait timer**: (Optional) 10-30 minutes minimum wait
  - 🔒 **Prevent self-review**: Recommended

---

### Step 2: Configure Required Secrets

Add these secrets in **Settings** → **Secrets and variables** → **Actions**:

#### Repository Secrets (Required):
```
GCP_SA_KEY                    # Google Cloud Service Account JSON key
```

#### Environment-Specific Secrets:

**Staging Environment:**
```
DB_PASSWORD_STAGING           # Staging database password
ACCESS_TOKEN_STAGING          # Staging API access token
SENDGRID_API_KEY_STAGING      # Staging SendGrid key
DROPBOX_ACCESS_TOKEN_STAGING  # Staging Dropbox token
```

**Production Environment:**
```
DB_PASSWORD                   # Production database password
ACCESS_TOKEN                  # Production API access token
SENDGRID_API_KEY             # Production SendGrid key
DROPBOX_ACCESS_TOKEN         # Production Dropbox token
DOCMOSIS_ACCESS_KEY          # Production Docmosis key
```

---

### Step 3: Set Up Branch Protection Rules

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch:

**Branch Protection Rules for `main`:**
- ✅ **Require pull request reviews before merging**
  - Required approvals: 1-2
  - Dismiss stale reviews when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - Required checks:
    - `Code Quality & Linting`
    - `Run Test Suite`
    - `Security Scanning`
    - `Build Application (staging)`
- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history** (optional but recommended)
- ❌ **Do not allow force pushes**
- ❌ **Do not allow deletions**

---

## How the Deployment Flow Works

### Scenario 1: Push to `main` Branch
```
Developer pushes to main
    ↓
Quality checks run (linting, formatting)
    ↓
Tests run (unit, integration, E2E)
    ↓
Security scanning (dependencies, secrets, containers)
    ↓
Build artifacts for all environments
    ↓
✅ STAGING: Auto-deploys to staging
    ↓
⏸️  PRODUCTION: Waits for manual approval
    ↓
(Reviewer clicks "Review deployments" in GitHub Actions)
    ↓
✅ PRODUCTION: Deploys after approval
```

### Scenario 2: Push to `develop` Branch
```
Developer pushes to develop
    ↓
Quality checks + Tests + Security
    ↓
Build artifacts
    ↓
✅ DEVELOPMENT: Auto-deploys to dev environment
```

### Scenario 3: Pull Request to `main`
```
Developer opens PR to main
    ↓
Quality checks + Tests + Security
    ↓
Build validation only (no deployment)
    ↓
Reviewers approve PR
    ↓
Merge to main → Triggers staging deployment
```

---

## Verification Checklist

After configuration, verify the setup:

- [ ] Three environments exist: `development`, `staging`, `production`
- [ ] Production environment has required reviewers set
- [ ] Production environment is restricted to `main` branch only
- [ ] All required secrets are configured
- [ ] Branch protection rules are active on `main`
- [ ] GCP service account has Cloud Run deployment permissions

---

## Testing the Setup

### Test 1: Trigger Staging Deployment
```bash
# Make a small change
git checkout main
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: verify staging deployment pipeline"
git push origin main
```

**Expected Result:**
- Workflow runs automatically
- Staging deploys without approval
- Production job waits for approval

### Test 2: Approve Production Deployment
1. Go to GitHub Actions tab
2. Click on the running workflow
3. Click "Review deployments" button
4. Select "production" environment
5. Click "Approve and deploy"

**Expected Result:**
- Production deployment starts immediately
- Deploys to production Cloud Run service

---

## Troubleshooting

### Issue: Production deploys without approval
**Solution**: Ensure production environment has "Required reviewers" configured

### Issue: Staging deployment fails
**Solution**: Check that `config/staging.env` exists and `GCP_SA_KEY` secret is valid

### Issue: Secrets not found during deployment
**Solution**: Verify secrets exist in Google Cloud Secret Manager:
```bash
gcloud secrets list --project=docmosis-tornado
```

### Issue: Docker image not found
**Solution**: Check that Docker image was built successfully in the build job:
```bash
gcloud container images list --repository=gcr.io/docmosis-tornado
```

---

## Security Best Practices

1. **🔐 Never commit secrets** to the repository
2. **👥 Require multiple approvers** for production (2+ recommended)
3. **🕐 Set a wait timer** on production (10-30 minutes) to allow rollback
4. **📝 Document each production deployment** with clear release notes
5. **🔄 Test in staging first** before requesting production approval
6. **🚨 Set up alerts** for failed deployments
7. **📊 Monitor staging** for errors before promoting to production

---

## Monitoring Deployments

### View Deployment Status
- **GitHub**: Actions tab shows all workflow runs
- **Cloud Run**: Console shows active revisions and traffic split

### Check Logs
```bash
# Staging logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=100

# Production logs
gcloud run services logs read node-server --region=us-central1 --limit=100
```

### Rollback if Needed
```bash
# List revisions
gcloud run revisions list --service=node-server --region=us-central1

# Route traffic to previous revision
gcloud run services update-traffic node-server \
  --region=us-central1 \
  --to-revisions=node-server-00123-xyz=100
```

---

## Next Steps

1. ✅ Create the three GitHub environments
2. ✅ Configure production environment with required reviewers
3. ✅ Add all required secrets to GitHub
4. ✅ Set up branch protection on `main`
5. ✅ Test the workflow with a small change
6. ✅ Document your deployment process for the team
7. ✅ Set up monitoring and alerting

---

## Additional Resources

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Cloud Run Deployment](https://cloud.google.com/run/docs/deploying)
- [Cloud Run Rollbacks](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)

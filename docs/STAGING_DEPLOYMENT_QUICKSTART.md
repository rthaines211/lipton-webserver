# Staging-First Deployment Quick Start

## ✅ You're Already Set Up! (Almost)

Your GitHub Actions workflow is **already configured** to deploy to staging first, then wait for manual approval before production. This guide will help you complete the setup.

---

## 🎯 Current Status

### What's Working ✅
- ✅ CI/CD pipeline configured in [.github/workflows/ci-cd-main.yml](.github/workflows/ci-cd-main.yml)
- ✅ Sequential deployment: staging → (approval) → production
- ✅ Staging config file exists: [config/staging.env](config/staging.env)
- ✅ Production config file exists: [config/production.env](config/production.env)
- ✅ Environment separation (databases, storage, Dropbox folders)

### What Needs Configuration ⚠️
- ⚠️ GitHub Environment protection rules (manual approval)
- ⚠️ GitHub Secrets for deployment
- ⚠️ GCP Service Account key
- ⚠️ Docker image building (currently commented out)

---

## 📋 5-Step Setup Checklist

### Step 1: Create GitHub Environments (5 minutes)

1. Go to: **https://github.com/YOUR_ORG/YOUR_REPO/settings/environments**
2. Click "New environment" and create:

#### `staging` Environment:
   - **Protection rules**:
     - ✅ Required reviewers: (Optional, or leave empty for auto-deploy)
     - ✅ Deployment branches: Only `main`
   - **Secrets**: Add staging-specific secrets (see Step 2)

#### `production` Environment:
   - **Protection rules**: ⚠️ **CRITICAL**
     - ✅ Required reviewers: **Add yourself or team members**
     - ✅ Deployment branches: Only `main`
     - ✅ Wait timer: 10 minutes (optional but recommended)
   - **Secrets**: Add production-specific secrets (see Step 2)

---

### Step 2: Add GitHub Secrets (10 minutes)

Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Repository-Level Secret (Required):
```
Name: GCP_SA_KEY
Value: [Paste your GCP Service Account JSON key]
```

To get the service account key:
```bash
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=945419684329-compute@developer.gserviceaccount.com

# Display the key (copy this value to GitHub secret)
cat ~/gcp-key.json
```

#### Staging Environment Secrets:
Go to the `staging` environment → **Environment secrets**:
```
DB_PASSWORD_STAGING
ACCESS_TOKEN_STAGING
SENDGRID_API_KEY_STAGING
DROPBOX_ACCESS_TOKEN_STAGING
```

#### Production Environment Secrets:
Go to the `production` environment → **Environment secrets**:
```
DB_PASSWORD
ACCESS_TOKEN
SENDGRID_API_KEY
DROPBOX_ACCESS_TOKEN
DOCMOSIS_ACCESS_KEY
```

---

### Step 3: Verify GCP Secret Manager (5 minutes)

Check that secrets exist in GCP:

```bash
# List all secrets
gcloud secrets list --project=docmosis-tornado

# Expected secrets:
# - DB_PASSWORD (production)
# - DB_PASSWORD_STAGING (staging)
# - ACCESS_TOKEN (production)
# - ACCESS_TOKEN_STAGING (staging)
# - sendgrid-api-key-staging
# - sendgrid-api-key (production)
# - dropbox-token-staging
# - dropbox-token (production)
# - docmosis-key
```

If missing, create them:
```bash
# Create staging database password
echo -n "your-staging-db-password" | \
  gcloud secrets create DB_PASSWORD_STAGING \
  --data-file=- \
  --replication-policy=automatic

# Create production access token
echo -n "your-production-token" | \
  gcloud secrets create ACCESS_TOKEN \
  --data-file=- \
  --replication-policy=automatic
```

---

### Step 4: Update Workflow for Docker Builds (Optional)

Your workflow currently has Docker builds configured but they're partially commented out. You have two options:

#### Option A: Enable Docker Builds (Recommended for containerized deployments)

The workflow at [.github/workflows/ci-cd-main.yml:424-440](.github/workflows/ci-cd-main.yml#L424) already has the deployment command configured. Just ensure the Docker image is being built and pushed to GCR.

Check if you have a [Dockerfile](Dockerfile) in the root directory. If yes, enable the Docker build steps in the workflow.

#### Option B: Direct Code Deployment (Simpler, no containers)

If you want to deploy code directly without Docker:
1. Remove `--image` parameter from deployment
2. Use `gcloud run deploy --source=.` instead
3. Cloud Run will build the container automatically

---

### Step 5: Test the Deployment Flow (15 minutes)

#### 5.1 Trigger a Staging Deployment
```bash
# Make a small change
git checkout main
echo "# Test staging deployment" >> README.md
git add README.md
git commit -m "test: verify staging-first deployment flow"
git push origin main
```

#### 5.2 Monitor the Workflow
1. Go to: **https://github.com/YOUR_ORG/YOUR_REPO/actions**
2. Click on the running "CI/CD Pipeline" workflow
3. Watch the jobs execute:
   - ✅ Code Quality & Linting
   - ✅ Run Test Suite
   - ✅ Security Scanning
   - ✅ Build Application
   - ✅ 🚀 Deploy to Staging
   - ⏸️ 🚀 Deploy to Production (waiting for approval)

#### 5.3 Verify Staging Deployment
```bash
# Check staging health
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Check staging logs
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=20
```

#### 5.4 Approve Production Deployment
1. In GitHub Actions, click "Review deployments" button
2. Check the "production" checkbox
3. (Optional) Add a comment: "Staging verified, deploying to production"
4. Click "Approve and deploy"

#### 5.5 Verify Production Deployment
```bash
# Check production health
curl https://node-server-zyiwmzwenq-uc.a.run.app/health

# Check production logs
gcloud run services logs read node-server \
  --region=us-central1 \
  --limit=20
```

---

## 🔄 Day-to-Day Usage

Once set up, your typical deployment flow:

### 1. Development Work
```bash
# Work on feature branch
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Open Pull Request
```bash
gh pr create --title "Add new feature" --body "Description..."

# Or use GitHub web UI
```

**What happens**: CI runs (tests, linting, security) but NO deployment occurs.

### 3. Merge to Main
```bash
# After PR approval, merge to main
gh pr merge --squash

# Or click "Squash and merge" in GitHub
```

**What happens automatically**:
1. ✅ CI runs again on main branch
2. ✅ Builds all artifacts
3. ✅ **DEPLOYS TO STAGING AUTOMATICALLY**
4. ⏸️ Waits for your approval for production

### 4. Test Staging
```bash
# Manually test staging environment
# URL: https://node-server-staging-zyiwmzwenq-uc.a.run.app

# Check logs for errors
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=50

# Run smoke tests
./scripts/test-staging.sh  # (if you create one)
```

### 5. Approve Production
1. Go to GitHub Actions
2. Find your workflow run
3. Click "Review deployments"
4. Select "production"
5. Add approval comment
6. Click "Approve and deploy"

**What happens**: Production deploys with the same code that's running in staging.

---

## 🚨 Common Issues & Solutions

### Issue: "Environment not found" error
**Solution**: Create the GitHub environments (Step 1)

### Issue: "Required reviewers not met"
**Solution**: Add yourself as a required reviewer in production environment settings

### Issue: Docker image not found
**Solution**: Either:
- Enable Docker builds in the workflow
- OR use `--source=.` deployment method (Cloud Run builds automatically)

### Issue: GCP authentication failed
**Solution**: Verify `GCP_SA_KEY` secret is correctly set and contains valid JSON

### Issue: Database connection failed in staging
**Solution**:
1. Verify Cloud SQL instance exists: `legal-forms-db-staging`
2. Check service account has Cloud SQL Client role
3. Verify `--add-cloudsql-instances` matches your instance

### Issue: Secrets not found during deployment
**Solution**: Create missing secrets in GCP Secret Manager (Step 3)

---

## 📊 Monitoring Your Deployments

### GitHub Actions Dashboard
- View all workflow runs: `https://github.com/YOUR_ORG/YOUR_REPO/actions`
- Filter by event: Push, Pull Request, Manual
- Download logs for debugging

### Cloud Run Console
- **Staging**: `https://console.cloud.google.com/run/detail/us-central1/node-server-staging`
- **Production**: `https://console.cloud.google.com/run/detail/us-central1/node-server`

### Cloud Logging
```bash
# Stream staging logs in real-time
gcloud run services logs tail node-server-staging --region=us-central1

# Filter for errors only
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --filter="severity>=ERROR" \
  --limit=50
```

---

## 🎯 Success Criteria

Your setup is complete when:

✅ **Environment Protection**
- [ ] `staging` environment exists
- [ ] `production` environment exists with required reviewers
- [ ] Deployment branches restricted to `main`

✅ **Secrets Configuration**
- [ ] `GCP_SA_KEY` repository secret exists
- [ ] Staging environment secrets configured
- [ ] Production environment secrets configured
- [ ] GCP Secret Manager secrets exist

✅ **Workflow Validation**
- [ ] Push to `main` triggers staging deployment
- [ ] Staging deploys successfully
- [ ] Production waits for approval
- [ ] Production deploys after approval

✅ **Testing**
- [ ] Staging URL responds: `https://node-server-staging-zyiwmzwenq-uc.a.run.app`
- [ ] Production URL responds: `https://node-server-zyiwmzwenq-uc.a.run.app`
- [ ] No errors in logs
- [ ] Database connections work

---

## 📚 Additional Resources

- **Full Deployment Flow**: [DEPLOYMENT_FLOW.md](DEPLOYMENT_FLOW.md)
- **Environment Setup Details**: [GITHUB_ENVIRONMENT_SETUP.md](GITHUB_ENVIRONMENT_SETUP.md)
- **CI/CD Workflow**: [.github/workflows/ci-cd-main.yml](.github/workflows/ci-cd-main.yml)
- **GitHub Environments**: https://docs.github.com/en/actions/deployment/targeting-different-environments
- **Cloud Run Deployment**: https://cloud.google.com/run/docs/deploying

---

## 🆘 Need Help?

1. **Check workflow logs**: GitHub Actions tab → Click on failed workflow → View logs
2. **Check staging logs**: `gcloud run services logs read node-server-staging --region=us-central1 --limit=100`
3. **Verify configuration**: `gcloud run services describe node-server-staging --region=us-central1`
4. **Test locally**: Follow instructions in [config/README.md](config/README.md)

---

## 🎉 Next Steps

After completing setup:
1. ✅ Document your deployment process for the team
2. ✅ Set up Slack notifications for deployments
3. ✅ Create runbooks for common issues
4. ✅ Schedule regular staging testing
5. ✅ Set up monitoring alerts in GCP
6. ✅ Create rollback procedures documentation

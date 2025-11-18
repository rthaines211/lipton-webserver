# Deployment Workflow

## Simplified Linear Progression: develop → main → production

This document describes the **simplified deployment workflow** that provides a clear, linear progression through environments.

---

## 🎯 Overview

| Branch | Environment | Service Name | URL | Auto-Deploy |
|--------|-------------|--------------|-----|-------------|
| `develop` | Development | `node-server-dev` | https://node-server-dev-zyiwmzwenq-uc.a.run.app | ✅ Yes |
| `main` | Staging | `node-server-staging` | https://node-server-staging-zyiwmzwenq-uc.a.run.app | ✅ Yes |
| `main` (tagged) | Production | `node-server` | https://node-server-zyiwmzwenq-uc.a.run.app | ⚠️ Manual approval required |

---

## 📋 Workflow Steps

### 1️⃣ **Development** (Active Development)

**Branch:** `develop`
**Environment:** Development
**Purpose:** Day-to-day development, experimental features, testing

```bash
# Work on develop branch
git checkout develop
git pull origin develop

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin develop
```

**What Happens:**
- GitHub Actions workflow `deploy-dev.yml` triggers automatically
- Runs linter and tests (non-blocking)
- Deploys to `node-server-dev` service
- Available at: https://node-server-dev-zyiwmzwenq-uc.a.run.app

**Configuration:**
- Uses `config/development.env`
- Connects to `legal-forms-db-dev` database
- Email notifications disabled
- Pipeline enabled for testing

---

### 2️⃣ **Staging** (Pre-Production Testing)

**Branch:** `main`
**Environment:** Staging
**Purpose:** Final testing before production, QA validation

```bash
# Merge develop into main when ready for staging
git checkout main
git pull origin main
git merge develop

# Push to trigger staging deployment
git push origin main
```

**What Happens:**
- GitHub Actions workflow `ci-cd-main.yml` triggers automatically
- Runs comprehensive CI pipeline:
  - Code quality checks
  - Full test suite with PostgreSQL
  - Security scanning
  - Build validation
- Deploys to `node-server-staging` service
- Available at: https://node-server-staging-zyiwmzwenq-uc.a.run.app

**Configuration:**
- Uses `config/staging.env`
- Connects to `legal-forms-db-staging` database
- Email notifications enabled (staging list)
- Full feature parity with production

---

### 3️⃣ **Production** (Live System)

**Branch:** `main` (with manual approval)
**Environment:** Production
**Purpose:** Live customer-facing application

```bash
# Production deployment requires manual approval in GitHub Actions
# No command needed - approve via GitHub UI after staging validation
```

**What Happens:**
- After staging deployment completes successfully
- Go to: https://github.com/YOUR_ORG/YOUR_REPO/actions
- Find the workflow run for your commit
- Click "Review deployments" button
- Approve "production" environment
- Workflow continues and deploys to `node-server` service
- Available at: https://node-server-zyiwmzwenq-uc.a.run.app

**Configuration:**
- Uses `config/production.env`
- Connects to `legal-forms-db` database (production)
- Email notifications enabled (production list)
- All monitoring and alerting active

---

## 🔄 Complete Development Cycle Example

### Scenario: Adding a new feature

```bash
# 1. Start work on develop
git checkout develop
git pull origin develop

# 2. Create feature branch (optional, but recommended)
git checkout -b feature/new-client-intake-field
# ... make changes ...
git add .
git commit -m "feat: Add new client intake field"
git push origin feature/new-client-intake-field

# 3. Create PR to develop, review, merge
# (Done via GitHub UI)

# 4. develop auto-deploys to DEV
# Test at: https://node-server-dev-zyiwmzwenq-uc.a.run.app

# 5. When ready for staging testing
git checkout main
git pull origin main
git merge develop
git push origin main

# 6. main auto-deploys to STAGING
# QA team tests at: https://node-server-staging-zyiwmzwenq-uc.a.run.app

# 7. When staging tests pass, approve production deployment
# Go to GitHub Actions → Review deployments → Approve production

# 8. Production deployment completes
# Live at: https://node-server-zyiwmzwenq-uc.a.run.app
```

---

## 🚨 Emergency Hotfix Process

For critical production bugs that need immediate fixing:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make the fix
# ... edit files ...
git add .
git commit -m "fix: Critical bug in form submission"
git push origin hotfix/critical-bug-fix

# 3. Create PR to main, get approval, merge
# (Done via GitHub UI)

# 4. Auto-deploys to staging first
# Verify fix at: https://node-server-staging-zyiwmzwenq-uc.a.run.app

# 5. Approve production deployment
# (Via GitHub Actions UI)

# 6. Backport to develop
git checkout develop
git merge main
git push origin develop
```

---

## 📊 Deployment Monitoring

### Check Deployment Status

```bash
# Check all environments at once
./scripts/check-all-deployments.sh

# Or manually:
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health | jq
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health | jq
curl https://node-server-zyiwmzwenq-uc.a.run.app/health | jq
```

### View Deployment Logs

```bash
# Development
gcloud run services logs read node-server-dev --region=us-central1 --limit=50

# Staging
gcloud run services logs read node-server-staging --region=us-central1 --limit=50

# Production
gcloud run services logs read node-server --region=us-central1 --limit=50
```

### Check Which Commit is Deployed

```bash
# Check health endpoint for deployment info
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health | jq '.deploymentInfo'

# Output shows:
# {
#   "branch": "main",
#   "commit": "e0022254abc...",
#   "timestamp": "2025-11-17T..."
# }
```

---

## ⚙️ Configuration Files

| Environment | Config File | Database | Secrets |
|-------------|-------------|----------|---------|
| Development | `config/development.env` | `legal-forms-db-dev` | `*_DEV` secrets |
| Staging | `config/staging.env` | `legal-forms-db-staging` | `*_STAGING` secrets |
| Production | `config/production.env` | `legal-forms-db` | Production secrets |

---

## 🔐 Security Notes

1. **Never commit secrets** to any configuration files
2. All secrets managed via Google Cloud Secret Manager
3. Development uses test API keys (safe for local testing)
4. Staging uses staging-specific keys (isolated from production)
5. Production secrets require elevated permissions to access

---

## 🎛️ Workflow Files

- **Development:** `.github/workflows/deploy-dev.yml`
- **Staging + Production:** `.github/workflows/ci-cd-main.yml`

---

## ✅ Benefits of This Workflow

1. **Clear Progression:** develop → main → production
2. **Automatic Testing:** Each stage runs appropriate tests
3. **Safety Net:** Staging validation before production
4. **Manual Approval:** Production requires human review
5. **Rollback Ready:** Can quickly revert via Git
6. **Parallel Work:** Develop continues while staging/prod are stable

---

## 🐛 Troubleshooting

### "My push to develop didn't deploy"

Check GitHub Actions:
```bash
# View workflow runs
gh run list --workflow=deploy-dev.yml --limit=5
```

### "Staging deployment failed"

1. Check workflow logs in GitHub Actions
2. Verify `config/staging.env` is valid
3. Ensure secrets exist: `DB_PASSWORD_STAGING`, `ACCESS_TOKEN_STAGING`, etc.

### "I want to deploy to dev manually"

Trigger via GitHub UI:
1. Go to Actions → Deploy to Dev Environment
2. Click "Run workflow"
3. Select `develop` branch
4. Click "Run workflow" button

---

## 📝 Summary

```
develop branch     →  DEV environment      (automatic)
    ↓
main branch        →  STAGING environment  (automatic)
    ↓
manual approval    →  PRODUCTION          (manual gate)
```

**Key principle:** Code flows **forward** through environments, never backward. Production changes must be backported to develop.

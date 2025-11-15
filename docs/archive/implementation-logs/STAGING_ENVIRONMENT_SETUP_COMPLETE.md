# ✅ Staging Environment Setup - Complete

**Date:** October 27, 2025
**Status:** Ready for deployment
**Estimated Setup Time:** 15 minutes
**Monthly Cost:** $10-15

---

## 📋 Summary

A complete staging environment has been designed and configured for your GCP production deployment. The staging environment mirrors production architecture but uses separate, isolated infrastructure to enable safe testing.

---

## 🎯 What Was Accomplished

### 1. Architecture Design ✅

Created a multi-environment architecture with:
- **Production Environment:** Live system serving real users
- **Staging Environment:** Pre-production testing (NEW)
- **Development Environment:** Local development

**Documentation:** [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md)

### 2. Infrastructure Setup Script ✅

Created automated setup script: [scripts/setup-staging-environment.sh](scripts/setup-staging-environment.sh)

**Creates:**
- Cloud SQL staging database (`legal-forms-db-staging`)
- Cloud Storage bucket (`docmosis-tornado-form-submissions-staging`)
- Secret Manager staging secrets (DB_PASSWORD_STAGING, ACCESS_TOKEN_STAGING, etc.)
- Cloud Run services (`node-server-staging`, `python-pipeline-staging`)
- IAM permissions and service accounts

**Features:**
- ✅ Fully automated (one command)
- ✅ Safe to re-run (idempotent)
- ✅ Color-coded output
- ✅ Validation checks at each step
- ✅ Health checks after deployment
- ✅ Generates configuration summary

### 3. Deployment Scripts Updated ✅

Updated [scripts/deploy.sh](scripts/deploy.sh) to support staging:

**Changes:**
- ✅ Environment-specific secret names (`DB_PASSWORD_STAGING` vs `DB_PASSWORD`)
- ✅ Environment-specific database connections
- ✅ Cloud SQL instance configuration per environment

**Usage:**
```bash
./scripts/deploy.sh staging      # Deploy to staging
./scripts/deploy.sh production   # Deploy to production
./scripts/deploy.sh development  # Deploy to development
```

### 4. CI/CD Pipeline Updated ✅

Updated [.github/workflows/ci-cd-main.yml](.github/workflows/ci-cd-main.yml):

**Changes:**
- ✅ Staging uses staging-specific secrets
- ✅ Cloud SQL connection properly configured
- ✅ Automatic deployment to staging from main branch
- ✅ Manual approval gate before production

**Pipeline Flow:**
```
Push to main → Tests → Build → Deploy Staging (auto) → Approve → Deploy Production
```

### 5. Configuration Files ✅

All configuration files already existed and are ready:
- ✅ [config/staging.env](config/staging.env) - Staging environment variables
- ✅ [config/production.env](config/production.env) - Production environment variables
- ✅ [config/development.env](config/development.env) - Development environment variables

### 6. Comprehensive Documentation ✅

Created detailed documentation:

| Document | Purpose | Location |
|----------|---------|----------|
| **Quick Start** | Get started in 15 minutes | [STAGING_QUICKSTART.md](STAGING_QUICKSTART.md) |
| **Complete Guide** | Detailed staging usage | [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md) |
| **Architecture** | Multi-environment design | [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md) |
| **This Summary** | What was accomplished | [STAGING_ENVIRONMENT_SETUP_COMPLETE.md](STAGING_ENVIRONMENT_SETUP_COMPLETE.md) |

---

## 🚀 How to Deploy Staging (First Time)

### Step 1: Run Setup Script

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
./scripts/setup-staging-environment.sh
```

**What it does:**
1. Verifies GCP authentication
2. Enables required APIs
3. Creates Cloud SQL staging database (~10 minutes)
4. Creates Cloud Storage bucket
5. Creates/updates staging secrets
6. Deploys Cloud Run services
7. Configures service permissions
8. Runs health checks
9. Generates summary file

**You'll be prompted for:**
- Staging database password
- API tokens (or press Enter to copy from production)

**Duration:** 10-15 minutes

### Step 2: Verify Deployment

```bash
# Check services
gcloud run services list

# Test health
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# View logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=20
```

### Step 3: Test Application

1. Open staging URL in browser
2. Submit a test form
3. Verify:
   - Form saves to staging database
   - Files upload to Dropbox `/Staging/Current Clients`
   - Email notification has `[STAGING]` prefix

---

## 📊 Environment Comparison

### Infrastructure

| Component | Production | Staging | Difference |
|-----------|-----------|---------|------------|
| **Node Service** | `node-server` | `node-server-staging` | Separate service |
| **Python Service** | `python-pipeline` | `python-pipeline-staging` | Separate service |
| **Database Instance** | `legal-forms-db` | `legal-forms-db-staging` | Separate database |
| **Database Tier** | db-n1-standard-1 | db-f1-micro | Smaller tier |
| **Storage Bucket** | `...-submissions` | `...-submissions-staging` | Separate bucket |
| **Min Instances** | 1 | 0 | Scales to zero |
| **Backups** | 30 days | 7 days | Shorter retention |

### Configuration

| Variable | Production | Staging |
|----------|-----------|---------|
| `NODE_ENV` | production | staging |
| `DB_HOST` | .../legal-forms-db | .../legal-forms-db-staging |
| `DROPBOX_BASE_PATH` | /Current Clients | /Staging/Current Clients |
| `EMAIL_FROM_ADDRESS` | notifications@... | staging-notifications@... |
| `EMAIL_FROM_NAME` | Lipton Legal | Lipton Legal [STAGING] |

### Secrets

| Secret | Production | Staging | Isolated? |
|--------|-----------|---------|-----------|
| DB Password | `DB_PASSWORD` | `DB_PASSWORD_STAGING` | ✅ Yes |
| Access Token | `ACCESS_TOKEN` | `ACCESS_TOKEN_STAGING` | ✅ Yes |
| SendGrid Key | `sendgrid-api-key` | `sendgrid-api-key-staging` | ✅ Yes |
| Dropbox Token | `dropbox-token` | `dropbox-token-staging` | ✅ Yes |

---

## 💰 Cost Analysis

### Monthly Costs

| Environment | Components | Monthly Cost |
|-------------|-----------|-------------|
| **Production** | • Cloud SQL: $45<br>• Cloud Run: $40-80<br>• Storage: $5 | **$100-150** |
| **Staging** | • Cloud SQL: $7.67<br>• Cloud Run: $2-5<br>• Storage: $0.50 | **$10-15** |
| **Total** | | **$110-165** |

**Cost Impact:** Staging adds only 10-15% to infrastructure cost

### Cost Optimization Tips

1. **Scale to zero:** Staging has `min-instances=0` (saves ~$30/month)
2. **Smaller database:** Uses db-f1-micro instead of db-n1-standard-1
3. **Shorter retention:** 90-day lifecycle vs 365-day
4. **Pause when not needed:**
   ```bash
   # Stop staging database
   gcloud sql instances patch legal-forms-db-staging --activation-policy=NEVER

   # Restart when needed
   gcloud sql instances patch legal-forms-db-staging --activation-policy=ALWAYS
   ```

---

## 🔄 Deployment Workflow

### Automatic via CI/CD

```
Developer pushes to main
         ↓
GitHub Actions runs tests
         ↓
Build container images
         ↓
Deploy to STAGING (automatic) ✅
         ↓
Run smoke tests
         ↓
Wait for manual approval
         ↓
Deploy to PRODUCTION (after approval) ✅
```

### Manual Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Test in staging
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# If tests pass, deploy to production
./scripts/deploy.sh production
```

---

## 📁 Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| [scripts/setup-staging-environment.sh](scripts/setup-staging-environment.sh) | Automated staging setup |
| [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md) | Complete usage guide |
| [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md) | Architecture documentation |
| [STAGING_QUICKSTART.md](STAGING_QUICKSTART.md) | Quick start guide |
| [STAGING_ENVIRONMENT_SETUP_COMPLETE.md](STAGING_ENVIRONMENT_SETUP_COMPLETE.md) | This summary |

### Modified Files

| File | Changes |
|------|---------|
| [scripts/deploy.sh](scripts/deploy.sh) | Added environment-specific secrets and SQL instances |
| [.github/workflows/ci-cd-main.yml](.github/workflows/ci-cd-main.yml) | Updated staging deployment with correct secrets |

### Existing Files (Ready to Use)

| File | Status |
|------|--------|
| [config/staging.env](config/staging.env) | ✅ Already configured |
| [config/production.env](config/production.env) | ✅ Already configured |
| [config/development.env](config/development.env) | ✅ Already configured |

---

## ✅ Checklist: What to Do Next

### Immediate (Required)

- [ ] Run `./scripts/setup-staging-environment.sh`
- [ ] Verify staging deployment with health checks
- [ ] Test form submission in staging
- [ ] Update GitHub repository:
  ```bash
  git add .
  git commit -m "feat: add staging environment configuration and documentation"
  git push origin main
  ```

### Soon (Recommended)

- [ ] Create Dropbox folder: `/Staging/Current Clients`
- [ ] Verify SendGrid sender: `staging-notifications@liptonlegal.com`
- [ ] Test CI/CD pipeline by pushing to main
- [ ] Train team on staging usage
- [ ] Set up monitoring alerts

### Optional (Nice to Have)

- [ ] Configure separate Dropbox app for staging
- [ ] Set up staging-specific monitoring dashboard
- [ ] Create automated smoke tests
- [ ] Document team approval process

---

## 🎓 Key Concepts Explained

### Environment Parity

**Why it matters:** Staging mirrors production to catch issues before they reach users.

**What's the same:**
- Application code
- Configuration structure
- Service architecture
- Integration patterns

**What's different:**
- Resource sizing (smaller/cheaper)
- Data (test data, not production)
- Credentials (separate secrets)
- URL endpoints

### Infrastructure Isolation

**Why it matters:** Prevents staging tests from affecting production.

**Separate resources:**
- ✅ Different databases
- ✅ Different storage buckets
- ✅ Different Cloud Run services
- ✅ Different secrets
- ✅ Different Dropbox folders

### Cost Optimization

**Why it matters:** Keep staging affordable while maintaining functionality.

**Strategies used:**
- Scale to zero (min-instances=0)
- Smaller database tier (db-f1-micro)
- Shorter retention (90 vs 365 days)
- No high availability
- Reduced instance counts

---

## 🛠️ Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| **"Secret not found"** | Run setup script or create manually: `gcloud secrets create SECRET_NAME_STAGING` |
| **Database connection fails** | Verify Cloud SQL connection: `gcloud run services describe node-server-staging` |
| **Health check returns 503** | Check logs: `gcloud run services logs read node-server-staging --limit=100` |
| **Deployment fails** | Verify secrets exist: `gcloud secrets list --filter="name:STAGING"` |
| **High costs** | Pause staging DB: `gcloud sql instances patch legal-forms-db-staging --activation-policy=NEVER` |

---

## 📚 Documentation Reference

| Document | When to Use |
|----------|------------|
| [STAGING_QUICKSTART.md](STAGING_QUICKSTART.md) | First time setup (15 min) |
| [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md) | Detailed usage and operations |
| [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md) | Understanding the architecture |
| [scripts/setup-staging-environment.sh](scripts/setup-staging-environment.sh) | Automated setup script |
| [scripts/deploy.sh](scripts/deploy.sh) | Manual deployment |

---

## 🎉 Success Criteria

You'll know staging is working when:

✅ **Services are deployed:**
```bash
gcloud run services list | grep staging
# Shows: node-server-staging and python-pipeline-staging
```

✅ **Health checks pass:**
```bash
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health
# Returns: {"status":"ok",...}
```

✅ **Form submission works:**
- Submit test form → Success
- Check database → Data saved
- Check Dropbox → Files uploaded
- Check email → Notification sent with [STAGING]

✅ **CI/CD deploys automatically:**
- Push to main → Tests run → Staging deploys

---

## 💡 Best Practices Reminder

1. ✅ **Test in staging before production**
2. ✅ **Use staging for demos and training**
3. ✅ **Keep staging configuration in sync**
4. ✅ **Never copy production data without sanitization**
5. ✅ **Monitor staging costs monthly**
6. ✅ **Scale to zero when not in use**
7. ✅ **Document any staging-specific changes**

---

## 🚀 Ready to Deploy!

Your staging environment is **fully configured** and ready to deploy.

**Next step:** Run the setup script:

```bash
./scripts/setup-staging-environment.sh
```

**Questions?** Check the [complete guide](docs/STAGING_ENVIRONMENT_GUIDE.md) or [architecture docs](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md).

---

**Status:** ✅ Complete
**Setup Required:** Yes (run setup script)
**Est. Time:** 15 minutes
**Monthly Cost:** $10-15
**Documentation:** Complete
**Scripts:** Ready
**CI/CD:** Configured

**Created by:** Claude Code
**Date:** October 27, 2025

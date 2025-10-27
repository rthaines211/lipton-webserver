# Staging Environment - Quick Start Guide

## 🚀 Get Started in 3 Steps

This guide will help you set up and deploy your staging environment in under 15 minutes.

---

## Prerequisites

- ✅ Google Cloud CLI installed (`gcloud`)
- ✅ Authenticated to GCP (`gcloud auth login`)
- ✅ Access to `docmosis-tornado` project
- ✅ Git repository up to date

---

## Step 1: Run Setup Script (10-15 minutes)

The automated setup script creates all staging infrastructure:

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
./scripts/setup-staging-environment.sh
```

**What it does:**
- ✅ Creates Cloud SQL staging database (`legal-forms-db-staging`)
- ✅ Creates Cloud Storage bucket (`docmosis-tornado-form-submissions-staging`)
- ✅ Creates Secret Manager staging secrets
- ✅ Deploys Cloud Run services (`node-server-staging`, `python-pipeline-staging`)
- ✅ Configures service-to-service communication

**Expected prompts:**
- Database password for staging
- Access token (or copy from production)
- SendGrid API key (or copy from production)
- Dropbox token (or copy from production)

**Duration:** ~10-15 minutes (Cloud SQL creation is slow)

**Cost:** ~$10-15/month

---

## Step 2: Verify Deployment (2 minutes)

Once setup completes, verify everything is working:

```bash
# 1. Check services are running
gcloud run services list --format="table(name,region,url)"

# Expected output:
# NAME                      REGION       URL
# node-server              us-central1  https://node-server-...
# node-server-staging      us-central1  https://node-server-staging-...
# python-pipeline          us-central1  https://python-pipeline-...
# python-pipeline-staging  us-central1  https://python-pipeline-staging-...

# 2. Test staging health endpoint
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Expected output: {"status":"ok",...}

# 3. View staging logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=20
```

✅ **Success indicators:**
- All services listed and have URLs
- Health endpoint returns HTTP 200
- No errors in logs

---

## Step 3: Test Your First Deployment (5 minutes)

Now test deploying code to staging:

```bash
# Option A: Manual deployment
./scripts/deploy.sh staging

# Option B: Automatic via CI/CD
git add .
git commit -m "test: verify staging environment"
git push origin main
# Staging auto-deploys from main branch
```

**Test the application:**

1. **Open staging URL in browser:**
   ```
   https://node-server-staging-zyiwmzwenq-uc.a.run.app
   ```

2. **Submit a test form:**
   - Fill out the legal form
   - Verify submission succeeds
   - Check logs for processing

3. **Verify integrations:**
   - **Database:** Form saved to staging database
   - **Dropbox:** Files uploaded to `/Staging/Current Clients`
   - **Email:** Notification sent with `[STAGING]` prefix

---

## 🎉 Success! What's Next?

### View Your Configuration

A summary file was created: `staging-environment-info.txt`

```bash
cat staging-environment-info.txt
```

### Explore the Documentation

- **Complete Guide:** [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md)
- **Architecture:** [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md)
- **CI/CD Workflows:** [docs/operations/CI_CD_WORKFLOWS.md](docs/operations/CI_CD_WORKFLOWS.md)

### Common Tasks

```bash
# Deploy to staging
./scripts/deploy.sh staging

# View staging logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=50

# Connect to staging database
gcloud sql connect legal-forms-db-staging --user=app-user-staging --database=legal_forms_db_staging

# Update a staging secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME_STAGING --data-file=-

# Test staging endpoint
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health
```

---

## 🐛 Troubleshooting

### Issue: "Secret not found"

**Solution:**
```bash
# List secrets to verify
gcloud secrets list --filter="name:STAGING"

# Create missing secret
gcloud secrets create DB_PASSWORD_STAGING --replication-policy=automatic
echo -n "your-password" | gcloud secrets versions add DB_PASSWORD_STAGING --data-file=-
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Verify Cloud SQL connection
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(spec.template.spec.cloudSqlInstances)"

# Should show: docmosis-tornado:us-central1:legal-forms-db-staging
```

### Issue: "Health check returns 503"

**Solution:**
```bash
# Check service logs for errors
gcloud run services logs read node-server-staging --region=us-central1 --limit=100

# Check if service is fully deployed
gcloud run services describe node-server-staging --region=us-central1
```

### Need More Help?

- View logs: `gcloud run services logs read node-server-staging --region=us-central1 --limit=100`
- Check configuration: `gcloud run services describe node-server-staging --region=us-central1 --format=yaml > staging-config.yaml`
- Review full guide: [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md)

---

## 📊 Environment Comparison

| Aspect | Production | Staging |
|--------|-----------|---------|
| **Service Name** | `node-server` | `node-server-staging` |
| **Database** | `legal-forms-db` | `legal-forms-db-staging` |
| **Dropbox Folder** | `/Current Clients` | `/Staging/Current Clients` |
| **Email From** | `notifications@...` | `staging-notifications@...` |
| **Cost** | ~$100-150/month | ~$10-15/month |
| **Auto-deploy** | Manual approval | Automatic from main |
| **Data Retention** | 365 days | 90 days |

---

## 🔄 Workflow: Dev → Staging → Production

```
1. Make changes locally
   ↓
2. Push to main branch
   ↓
3. CI/CD runs tests
   ↓
4. Auto-deploy to STAGING ✅
   ↓
5. Test in staging
   ↓
6. Approve deployment
   ↓
7. Deploy to PRODUCTION ✅
```

---

## ✨ Best Practices

1. ✅ **Always test in staging first**
2. ✅ **Use staging for demos and training**
3. ✅ **Don't copy production data without sanitization**
4. ✅ **Monitor staging costs monthly**
5. ✅ **Scale staging to zero when not in use**

---

## 📞 Support

**Documentation:**
- Staging Guide: [docs/STAGING_ENVIRONMENT_GUIDE.md](docs/STAGING_ENVIRONMENT_GUIDE.md)
- Architecture: [docs/MULTI_ENVIRONMENT_ARCHITECTURE.md](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md)

**Scripts:**
- Setup: [scripts/setup-staging-environment.sh](scripts/setup-staging-environment.sh)
- Deploy: [scripts/deploy.sh](scripts/deploy.sh)

**Configuration:**
- Staging Config: [config/staging.env](config/staging.env)
- Production Config: [config/production.env](config/production.env)

---

**Last Updated:** October 27, 2025
**Setup Time:** ~15 minutes
**Monthly Cost:** ~$10-15
**Status:** ✅ Ready to use

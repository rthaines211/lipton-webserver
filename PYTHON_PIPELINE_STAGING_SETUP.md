# Python Pipeline Staging Deployment Guide

## 🚀 Quick Deploy

Deploy the Python normalization pipeline to staging:

```bash
./scripts/deploy-python-pipeline-staging.sh
```

**Duration:** 3-5 minutes (container build + deployment)

---

## 📋 What Gets Deployed

**Service Name:** `python-pipeline-staging`

**Configuration:**
- **Memory:** 2Gi (double Node.js for document processing)
- **CPU:** 1 vCPU
- **Timeout:** 600 seconds (10 minutes for large documents)
- **Min Instances:** 0 (scales to zero when idle)
- **Max Instances:** 3 (lower than production for cost)

**Environment:**
- `DROPBOX_BASE_PATH=/Staging/Current Clients`
- `ENVIRONMENT=staging`

**Secrets:**
- `DROPBOX_ACCESS_TOKEN` → `dropbox-token-staging`
- `DROPBOX_APP_KEY` → `dropbox-app-key` (shared with production)
- `DROPBOX_APP_SECRET` → `dropbox-app-secret` (shared with production)
- `DROPBOX_REFRESH_TOKEN` → `dropbox-refresh-token` (shared with production)

---

## ✅ Prerequisites

Before deploying, verify:

```bash
# Check secrets exist
gcloud secrets list | grep -E "(dropbox-token-staging|dropbox-app-key)"

# Should see:
# dropbox-token-staging
# dropbox-app-key
# dropbox-app-secret
# dropbox-refresh-token
```

✅ All secrets exist!

---

## 🎯 Deployment Steps

### Step 1: Deploy Python Pipeline

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
./scripts/deploy-python-pipeline-staging.sh
```

**What happens:**
1. ✅ Verifies authentication and source code
2. ✅ Checks Dropbox secrets exist
3. ✅ Builds Docker container from `normalization work/`
4. ✅ Deploys to Cloud Run as `python-pipeline-staging`
5. ✅ Configures service-to-service permissions
6. ✅ Tests health endpoint

**Output:** Service URL (e.g., `https://python-pipeline-staging-xyz.run.app`)

---

### Step 2: Update Staging Configuration

After deployment completes, update [config/staging.env](config/staging.env):

```bash
# Python Normalization Pipeline Configuration
PIPELINE_API_URL=https://python-pipeline-staging-[YOUR-URL].run.app  # ← Use actual URL
PIPELINE_API_ENABLED=true
PIPELINE_API_TIMEOUT=300000
EXECUTE_PIPELINE_ON_SUBMIT=true
CONTINUE_ON_PIPELINE_FAILURE=true
```

---

### Step 3: Redeploy Node.js Service

Redeploy Node.js to pick up the new pipeline URL:

```bash
./scripts/deploy.sh staging
```

---

### Step 4: Test Integration

```bash
# Get the Node.js staging URL
NODE_URL=$(gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="value(status.url)")

# Submit a test form (via browser or API)
open $NODE_URL

# Check logs for pipeline execution
gcloud run services logs read node-server-staging --region=us-central1 --limit=50
gcloud run services logs read python-pipeline-staging --region=us-central1 --limit=50
```

---

## 🔍 Verification

### Check Service Status

```bash
# List all staging services
gcloud run services list | grep staging

# Should show:
# node-server-staging       us-central1  https://...
# python-pipeline-staging   us-central1  https://...
```

### Test Pipeline Health

```bash
# Get pipeline URL
PIPELINE_URL=$(gcloud run services describe python-pipeline-staging \
  --region=us-central1 \
  --format="value(status.url)")

# Test health endpoint
curl $PIPELINE_URL/health

# Expected: {"status":"healthy", ...}
```

### Verify Permissions

```bash
# Check if node-server-staging can invoke python-pipeline-staging
gcloud run services get-iam-policy python-pipeline-staging \
  --region=us-central1 \
  --format=json | grep "945419684329-compute"

# Should see the service account in the policy
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│              STAGING ENVIRONMENT                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────────┐   │
│  │ node-server-     │ HTTP │ python-pipeline-     │   │
│  │   staging        │─────►│   staging            │   │
│  │                  │      │                      │   │
│  │ • Forms          │      │ • Normalize docs     │   │
│  │ • Database       │      │ • Process data       │   │
│  │ • Email          │      │ • Upload to Dropbox  │   │
│  └──────────────────┘      └──────────────────────┘   │
│           │                          │                  │
│           ▼                          ▼                  │
│  ┌──────────────────┐      ┌──────────────────────┐   │
│  │ legal-forms-db-  │      │ Dropbox:             │   │
│  │   staging        │      │ /Staging/            │   │
│  │ (PostgreSQL)     │      │   Current Clients    │   │
│  └──────────────────┘      └──────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Impact

| Component | Monthly Cost |
|-----------|-------------|
| **Before** (Node.js only) | ~$10 |
| **After** (Node.js + Python) | ~$13-15 |
| **Increase** | +$3-5 |

**Why so low?**
- ✅ Scales to zero when idle (`min-instances=0`)
- ✅ Only runs when processing documents
- ✅ Smaller max instances (3 vs 10)

---

## 🐛 Troubleshooting

### Issue: "Secret not found"

```bash
# Check which secrets exist
gcloud secrets list | grep dropbox

# If dropbox-token-staging is missing, create it:
echo -n "your-dropbox-token" | gcloud secrets versions add dropbox-token-staging --data-file=-
```

### Issue: Deployment fails with "source not found"

```bash
# Verify you're in the project root
pwd
# Should show: /Users/ryanhaines/Desktop/Lipton Webserver

# Verify normalization work exists
ls "normalization work/Dockerfile"
# Should exist
```

### Issue: Health check fails (HTTP 503)

```bash
# Wait 30-60 seconds for container startup
sleep 30

# Test again
curl $(gcloud run services describe python-pipeline-staging --region=us-central1 --format="value(status.url)")/health

# Check logs
gcloud run services logs read python-pipeline-staging --region=us-central1 --limit=50
```

### Issue: Node.js can't invoke Python pipeline

```bash
# Grant permission manually
gcloud run services add-iam-policy-binding python-pipeline-staging \
  --region=us-central1 \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

## 🔄 Updating Python Pipeline

When you make changes to the Python code:

```bash
# Redeploy (rebuilds container)
./scripts/deploy-python-pipeline-staging.sh
```

Changes are automatically picked up from `normalization work/` directory.

---

## 📝 Next Steps After Deployment

1. ✅ Update [config/staging.env](config/staging.env) with pipeline URL
2. ✅ Redeploy Node.js: `./scripts/deploy.sh staging`
3. ✅ Test form submission end-to-end
4. ✅ Verify documents appear in Dropbox `/Staging/Current Clients`
5. ✅ Check both service logs for errors

---

## 📚 Related Documentation

- [Staging Environment Guide](docs/STAGING_ENVIRONMENT_GUIDE.md)
- [Multi-Environment Architecture](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md)
- [Python Pipeline Usage](normalization work/PIPELINE-USAGE.md)

---

**Created:** October 27, 2025
**Status:** Ready to deploy
**Estimated Time:** 5 minutes

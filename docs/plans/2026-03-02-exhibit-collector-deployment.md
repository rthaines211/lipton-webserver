# Exhibit Collector GCP Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the exhibit collector as a dedicated Cloud Run service at `exhibits.liptonlegal.com` via a new GitHub Actions workflow.

**Architecture:** A new deploy-only GitHub Actions workflow triggers on push to `main` for exhibit-relevant paths and on `workflow_dispatch`. It authenticates to GCP via an existing service account key secret, then runs `gcloud run deploy exhibit-collector --source .` with 2Gi memory, no Cloud SQL, and only the `ACCESS_TOKEN` secret. A minimal `config/exhibits-production.env` supplies non-secret env vars.

**Tech Stack:** GitHub Actions, `google-github-actions/auth@v2`, `google-github-actions/setup-gcloud@v2`, `gcloud run deploy --source .`, Cloud Run (managed), GCP Secret Manager.

---

### Task 1: Create `config/exhibits-production.env`

**Files:**
- Create: `config/exhibits-production.env`

**Step 1: Create the file**

```bash
# config/exhibits-production.env
# Exhibit Collector — Production Environment Configuration
# Non-secret env vars only. Secrets are mounted from GCP Secret Manager.
# Used by: .github/workflows/deploy-exhibit-collector.yml
#
# ⚠️  DO NOT put sensitive values here.
# ACCESS_TOKEN is mounted via --update-secrets in the workflow.

# ============================================
# Core Application Configuration
# ============================================

NODE_ENV=production

# ============================================
# Google Cloud Platform Configuration
# ============================================

GCLOUD_PROJECT=docmosis-tornado
```

Save that content to `config/exhibits-production.env`.

**Step 2: Verify it matches the pattern**

Open `config/production.env` and confirm the new file uses the same format (comments, section headers, no sensitive values). The exhibits file intentionally omits DB, pipeline, Dropbox, email, and Docmosis vars — those are not used by the exhibit collector.

**Step 3: Commit**

```bash
git add config/exhibits-production.env
git commit -m "feat: add exhibits-production env config"
```

---

### Task 2: Create `.github/workflows/deploy-exhibit-collector.yml`

**Files:**
- Create: `.github/workflows/deploy-exhibit-collector.yml`
- Reference: `.github/workflows/ci-cd-main.yml` (deploy-staging and deploy-production jobs — model auth, gcloud setup, and deploy steps from these)

**Step 1: Create the workflow file**

```yaml
# =============================================================================
# Deploy Exhibit Collector — Cloud Run
# =============================================================================
#
# Deploys the exhibit-collector service to Cloud Run on push to main
# for exhibit-relevant paths, or on manual dispatch.
#
# Service: exhibit-collector
# Domain:  exhibits.liptonlegal.com (mapped separately after first deploy)
# =============================================================================

name: Deploy Exhibit Collector

on:
  push:
    branches:
      - main
    paths:
      - 'forms/exhibits/**'
      - 'routes/exhibits.js'
      - 'services/exhibit-processor.js'
      - 'services/duplicate-detector.js'
      - 'services/pdf-page-builder.js'
      - 'server.js'
      - 'package*.json'
      - 'Dockerfile'
      - 'config/exhibits-production.env'
      - '.github/workflows/deploy-exhibit-collector.yml'

  workflow_dispatch:

concurrency:
  group: deploy-exhibit-collector
  cancel-in-progress: true

env:
  GCP_PROJECT_ID: docmosis-tornado
  GCP_REGION: us-central1
  SERVICE_NAME: exhibit-collector
  SERVICE_ACCOUNT: 945419684329-compute@developer.gserviceaccount.com

jobs:
  deploy:
    name: 🚀 Deploy Exhibit Collector
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://exhibits.liptonlegal.com

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔐 Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: ☁️ Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: 📋 Load environment configuration
        id: load-config
        run: |
          ENV_VARS=$(cat config/exhibits-production.env \
            | grep -v '^#' \
            | grep -v '^$' \
            | grep -v '^PORT=' \
            | tr '\n' ',' \
            | sed 's/,$//')
          echo "env_vars=$ENV_VARS" >> $GITHUB_OUTPUT
          VAR_COUNT=$(echo "$ENV_VARS" | tr ',' '\n' | wc -l)
          echo "📊 Loaded $VAR_COUNT environment variables"

      - name: 🚀 Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --source=. \
            --region=${{ env.GCP_REGION }} \
            --project=${{ env.GCP_PROJECT_ID }} \
            --platform=managed \
            --allow-unauthenticated \
            --update-secrets="ACCESS_TOKEN=ACCESS_TOKEN:latest" \
            --set-env-vars="${{ steps.load-config.outputs.env_vars }}" \
            --service-account=${{ env.SERVICE_ACCOUNT }} \
            --memory=2Gi \
            --cpu=1 \
            --timeout=300 \
            --max-instances=5 \
            --min-instances=0

          echo "✅ Deployed ${{ env.SERVICE_NAME }}"

      - name: 🔍 Get service URL
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.GCP_REGION }} \
            --project=${{ env.GCP_PROJECT_ID }} \
            --format='value(status.url)')
          echo "✅ Service URL: $URL"

      - name: ✅ Health check
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.GCP_REGION }} \
            --project=${{ env.GCP_PROJECT_ID }} \
            --format='value(status.url)')
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health" || echo "000")
          if [ "$HTTP_STATUS" == "200" ]; then
            echo "✅ Health check passed (HTTP $HTTP_STATUS)"
          else
            echo "⚠️  Health check returned HTTP $HTTP_STATUS"
          fi
```

Save to `.github/workflows/deploy-exhibit-collector.yml`.

**Step 2: Verify auth pattern matches existing workflow**

Open `.github/workflows/ci-cd-main.yml` lines ~344-350 and confirm the `google-github-actions/auth@v2` + `google-github-actions/setup-gcloud@v2` steps match. They should be identical — same `secrets.GCP_SA_KEY` secret.

**Step 3: Commit**

```bash
git add .github/workflows/deploy-exhibit-collector.yml
git commit -m "feat: add GitHub Actions workflow for exhibit-collector Cloud Run deployment"
```

---

### Task 3: Verify and push to trigger first deploy

**Step 1: Confirm both files are on the branch**

```bash
git log --oneline -5
git diff main..HEAD --name-only
```

Expected output includes:
```
config/exhibits-production.env
.github/workflows/deploy-exhibit-collector.yml
docs/plans/2026-03-02-exhibit-collector-gcp-deployment-design.md
docs/plans/2026-03-02-exhibit-collector-deployment.md
```

**Step 2: Merge to main (or push directly)**

If working on `feature/exhibit-collector`, either:
- Open a PR and merge to `main`, or
- Push directly to `main` if that's the team workflow

The push to `main` will trigger the workflow because `server.js`, `package*.json`, or the workflow file itself will be in the changed paths.

**Step 3: Watch the workflow run**

In GitHub → Actions → "Deploy Exhibit Collector" → confirm the deploy job completes green.

**Step 4: Confirm the Cloud Run service exists**

```bash
gcloud run services describe exhibit-collector \
  --region=us-central1 \
  --project=docmosis-tornado \
  --format='value(status.url)'
```

Expected: a `*.run.app` URL.

**Step 5: Test the health endpoint**

```bash
curl https://<service-url>/health
```

Expected: `{"status":"ok"}` or similar 200 response.

---

### Task 4: Map the custom domain (one-time manual step)

This is a one-time post-deploy step run from a local machine with `gcloud` authenticated.

**Step 1: Create the domain mapping**

```bash
gcloud run domain-mappings create \
  --service exhibit-collector \
  --domain exhibits.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

The command will output DNS records to add (typically a CNAME).

**Step 2: Add DNS record**

Add the CNAME record to the DNS provider for `liptonlegal.com`. Point `exhibits` at the value provided by the command above.

**Step 3: Verify the mapping**

```bash
gcloud run domain-mappings describe \
  --domain exhibits.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

Look for `status: True` on the `CertificateProvisioned` and `Ready` conditions. DNS propagation can take a few minutes to an hour.

**Step 4: Smoke test the custom domain**

```bash
curl https://exhibits.liptonlegal.com/health
```

Expected: 200 response.

Then open `https://exhibits.liptonlegal.com/forms/exhibits/` in a browser and confirm the exhibit collector form loads.

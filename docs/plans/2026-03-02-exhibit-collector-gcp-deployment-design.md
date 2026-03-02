# Exhibit Collector — GCP Deployment Design

**Date:** 2026-03-02
**Status:** Approved
**Author:** Ryan Haines

---

## Overview

Deploy the exhibit collector as a dedicated Cloud Run service at `exhibits.liptonlegal.com`, following the same pattern used for the contingency agreement form. Deployment is automated via a new GitHub Actions workflow that triggers on push to `main` for exhibit-relevant paths.

---

## Architecture

### Cloud Run Service

| Setting | Value |
|---|---|
| Service name | `exhibit-collector` |
| Project | `docmosis-tornado` |
| Region | `us-central1` |
| Memory | `2Gi` |
| CPU | `1` |
| Min instances | `0` |
| Max instances | `5` |
| Timeout | `300s` |
| Cloud SQL | None |
| Secrets | `ACCESS_TOKEN=ACCESS_TOKEN:latest` |
| Domain | `exhibits.liptonlegal.com` |

Memory is set to 2Gi (vs 1Gi for other services) because `sharp`, `tesseract.js`, and PDF assembly via `pdf-lib` are memory-heavy operations. The exhibit collector does not use the database — sessions are in-memory and temp files live in `/tmp` — so no Cloud SQL attachment or `DB_PASSWORD` secret is needed.

---

## Files to Create

### 1. `.github/workflows/deploy-exhibit-collector.yml`

GitHub Actions workflow. Triggers on push to `main` for exhibit-relevant paths, plus `workflow_dispatch` for manual deploys.

**Jobs:**
- `deploy` — authenticates via `secrets.GCP_SA_KEY`, runs `gcloud run deploy exhibit-collector --source .`

No quality/test/security gates — those run in `ci-cd-main.yml` before merge. This workflow is deploy-only.

**Path filter** (triggers only when these change):
```
forms/exhibits/**
routes/exhibits.js
services/exhibit-processor.js
services/duplicate-detector.js
services/pdf-page-builder.js
server.js
package*.json
Dockerfile
.github/workflows/deploy-exhibit-collector.yml
```

### 2. `config/exhibits-production.env`

Minimal env config for the exhibit-collector service. No DB vars, pipeline vars, or Dropbox vars.

```
NODE_ENV=production
GCLOUD_PROJECT=docmosis-tornado
```

`ACCESS_TOKEN` is mounted from Secret Manager, not from this file.

---

## Post-Deploy: Domain Mapping (One-Time Manual Step)

After the first successful deploy, run:

```bash
gcloud run domain-mappings create \
  --service exhibit-collector \
  --domain exhibits.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

Then add the CNAME record returned by that command to the DNS provider. Verify with:

```bash
gcloud run domain-mappings describe \
  --domain exhibits.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

The form will be accessible at `https://exhibits.liptonlegal.com/forms/exhibits/`.

---

## Non-Goals

- Staging environment for exhibits (not needed — no DB writes, stateless)
- Separate Dockerfile (existing Dockerfile is used as-is)
- Cloud Build triggers (GitHub Actions handles this)

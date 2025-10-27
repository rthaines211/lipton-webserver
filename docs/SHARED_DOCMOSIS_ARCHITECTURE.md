# Shared Docmosis Architecture

## Overview

The Docmosis document generation service is **shared between staging and production environments**. This is intentional and cost-effective since Docmosis is a stateless service that transforms templates + data into documents.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ node-server      │─────┐                                    │
│  │ (Cloud Run)      │     │                                    │
│  └──────────────────┘     │                                    │
│                            │                                    │
│  ┌──────────────────┐     │                                    │
│  │ python-pipeline  │─────┤                                    │
│  │ (Cloud Run)      │     │                                    │
│  └──────────────────┘     │                                    │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │    ┌─────────────────────────────┐
                             ├───►│  SHARED DOCMOSIS VM         │
                             │    │  10.128.0.3:8080            │
                             │    │  (Stateless Document Gen)   │
                             │    └─────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            │                                    │
│  ┌──────────────────┐     │                                    │
│  │ node-server-     │─────┤                                    │
│  │   staging        │     │                                    │
│  └──────────────────┘     │                                    │
│                            │                                    │
│  ┌──────────────────┐     │                                    │
│  │ python-pipeline- │─────┘                                    │
│  │   staging        │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│                    STAGING ENVIRONMENT                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Why Shared Docmosis is Safe

### Stateless Service
Docmosis is **stateless** - it doesn't store any data between requests:

```
Input:  Template + Data → Process → Output: Document
```

**No persistence:**
- ✅ No database
- ✅ No file storage
- ✅ No session state
- ✅ Pure transformation service

### Similar to Other Shared Services

Sharing Docmosis is like sharing:
- **Redis cache** (stateless data transformation)
- **Image processing service** (transforms images, doesn't store them)
- **PDF renderer** (converts HTML → PDF)

**Unlike** sharing:
- ❌ Databases (stores data - **must be separate**)
- ❌ Storage buckets (stores files - **must be separate**)
- ❌ Message queues (holds state - **should be separate**)

---

## Configuration

### Shared Settings

**VM Location:**
- **Internal IP:** `10.128.0.3`
- **Port:** `8080`
- **Endpoint:** `http://10.128.0.3:8080/api/render`

**Secret:**
- **Name:** `docmosis-key`
- **Shared by:** Production and staging
- **Access:** Both service accounts have `secretAccessor` role

### Environment-Specific Configuration

#### Production ([config/production.env](../config/production.env))
```bash
DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render
DOCMOSIS_ENABLED=true
# DOCMOSIS_ACCESS_KEY from Secret Manager
```

#### Staging ([config/staging.env](../config/staging.env))
```bash
DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render
DOCMOSIS_ENABLED=true
# DOCMOSIS_ACCESS_KEY from Secret Manager
```

**Same URL, same secret** - both point to the shared VM.

---

## Data Isolation Despite Sharing

Even though staging and production share Docmosis, **data remains isolated**:

### What Gets Shared
```
┌────────────────────────────────────┐
│  Docmosis VM (Shared)              │
│  • Template processor              │
│  • Document renderer               │
│  • API endpoint                    │
└────────────────────────────────────┘
```

### What Stays Separate
```
PRODUCTION                      STAGING
├─ Database (separate)          ├─ Database (separate)
├─ Storage (separate)           ├─ Storage (separate)
├─ Dropbox folder (separate)    ├─ Dropbox folder (separate)
└─ Templates (same VM)          └─ Templates (same VM)
```

**Example flow:**

**Production:**
1. Form data from production database
2. Send to Docmosis → Generate document
3. Save to production Dropbox `/Current Clients`

**Staging:**
1. Form data from staging database
2. Send to Docmosis → Generate document
3. Save to staging Dropbox `/Staging/Current Clients`

**Result:** Documents never mix because they're saved to different locations!

---

## Cost Optimization

### Single VM vs. Two VMs

| Approach | Monthly Cost | Benefit |
|----------|-------------|---------|
| **Shared Docmosis** (current) | ~$30-50 | ✅ Cost-effective |
| **Separate VMs** | ~$60-100 | ❌ Double cost for no isolation benefit |

**Savings:** ~$30-50/month by sharing

### Why This Works

Docmosis usage pattern:
- **Low frequency:** Document generation happens per form submission
- **Stateless:** No data contamination risk
- **Quick processing:** ~1-5 seconds per document
- **No resource conflicts:** Can handle staging + production load easily

**VM specs:**
- **Type:** e2-micro or e2-small
- **Memory:** 1-2GB
- **CPU:** 1-2 vCPUs
- **Concurrent capacity:** ~10-20 requests/second

---

## Security Considerations

### Access Control

**Secret Access:**
```bash
# Both environments use same secret
Secret: docmosis-key
Access: serviceAccount:945419684329-compute@developer.gserviceaccount.com
```

**Network Access:**
- Internal IP only (`10.128.0.3`)
- No public internet access
- Only Cloud Run services in same VPC can access

### Isolation Mechanisms

1. **Data Source Isolation:** Each environment reads from separate databases
2. **Output Isolation:** Each environment saves to separate Dropbox folders
3. **Audit Trails:** Logs show which environment made each request

---

## Monitoring

### Shared Resource Monitoring

Monitor Docmosis for both environments:

```bash
# Check VM status
gcloud compute instances describe docmosis-tornado-vm \
  --zone=us-central1-c \
  --format="table(name,status,networkInterfaces[0].networkIP)"

# Check VM metrics (CPU, memory)
gcloud compute instances describe docmosis-tornado-vm \
  --zone=us-central1-c
```

### Usage Metrics

Track which environment uses Docmosis:

```bash
# Production logs
gcloud run services logs read node-server --region=us-central1 \
  | grep -i docmosis

# Staging logs
gcloud run services logs read node-server-staging --region=us-central1 \
  | grep -i docmosis
```

---

## Troubleshooting

### Issue: "Connection refused to Docmosis"

**Check VM is running:**
```bash
gcloud compute instances describe docmosis-tornado-vm --zone=us-central1-c
# Status should be: RUNNING
```

**Start if stopped:**
```bash
gcloud compute instances start docmosis-tornado-vm --zone=us-central1-c
```

### Issue: "Docmosis slow for both environments"

**VM may be undersized:**
```bash
# Check current machine type
gcloud compute instances describe docmosis-tornado-vm \
  --zone=us-central1-c \
  --format="value(machineType)"

# Upgrade if needed (requires stop/start)
gcloud compute instances set-machine-type docmosis-tornado-vm \
  --zone=us-central1-c \
  --machine-type=e2-medium
```

### Issue: "Need to test new Docmosis templates"

**Staging is perfect for this!**
1. Update templates on Docmosis VM
2. Test in staging first
3. Verify documents generate correctly
4. Production uses same templates - safe to proceed

---

## Future Considerations

### When to Separate Docmosis

Consider separate VMs if:
- ❌ **Heavy load:** > 100 document generations/minute
- ❌ **Different template versions:** Staging needs to test incompatible templates
- ❌ **Strict compliance:** Regulatory requirement for complete isolation
- ❌ **Performance isolation:** Can't have staging load affect production

For your use case: **Sharing is recommended** ✅

### Alternative: Docmosis Cloud

Instead of self-hosted VM, consider Docmosis Cloud SaaS:
- **Pros:** No VM management, auto-scaling, zero maintenance
- **Cons:** Monthly subscription cost, external dependency
- **Cost:** ~$50-200/month depending on usage

---

## Deployment

### Redeploy Services with Docmosis

**Staging:**
```bash
./scripts/deploy.sh staging
```

**Production:**
```bash
./scripts/deploy.sh production
```

Both will now have:
- ✅ `DOCMOSIS_API_URL` environment variable
- ✅ `DOCMOSIS_ACCESS_KEY` secret mounted
- ✅ Access to shared Docmosis VM

### Verify Configuration

```bash
# Check staging
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep DOCMOSIS

# Check production
gcloud run services describe node-server \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)" | grep DOCMOSIS
```

---

## Summary

**Shared Resources:**
- ✅ Docmosis VM (stateless document generation)
- ✅ Docmosis secret (API key)
- ✅ Network (same VPC)

**Isolated Resources:**
- ✅ Databases (separate instances)
- ✅ Storage buckets (separate buckets)
- ✅ Dropbox folders (separate paths)
- ✅ Email addresses (separate addresses)
- ✅ Application data (100% isolated)

**Benefits:**
- 💰 Save ~$30-50/month
- 🔄 Simplified management (one VM to monitor)
- 🔒 No data contamination risk (stateless service)
- ✅ Same behavior in staging and production

**Decision:** ✅ **Sharing Docmosis is safe and recommended**

---

**Created:** October 27, 2025
**Status:** Configured and ready to deploy
**Cost Savings:** ~$30-50/month vs. separate VMs

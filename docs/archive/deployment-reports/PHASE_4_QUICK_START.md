# Phase 4 Quick Start Guide - Deploy Python FastAPI Service

**Status**: Ready to Deploy
**Prerequisites**: Phase 1 ✅ and Phase 3 ✅ Complete
**Estimated Duration**: 20-25 minutes

---

## Quick Reference - VPC Connector Details

Use these values when deploying Phase 4 services:

```
VPC Connector Name: legal-forms-connector
Region: us-central1
Network: default
IP Range: 10.8.0.0/28
Status: READY ✅

Docmosis Access:
- Internal IP: 10.128.0.3
- Port: 8080
- API URL: http://10.128.0.3:8080/api/render
- Firewall Rule: allow-cloudrun-to-docmosis (ENABLED) ✅
```

---

## Phase 4 Steps Summary

### 4.1 Prepare Python Service
- Navigate to: `/Users/ryanhaines/Desktop/Lipton Webserver/normalization work`
- Verify Dockerfile exists or create it
- Ensure requirements.txt exists with FastAPI and dependencies

### 4.2 Grant Secret Access
- Get PROJECT_NUMBER
- Grant Docmosis key access to Compute SA
- Set DOCMOSIS_API_URL to: `http://10.128.0.3:8080/api/render`

### 4.3 Deploy to Cloud Run
```bash
gcloud run deploy python-pipeline \
  --source . \
  --region=us-central1 \
  --vpc-connector=legal-forms-connector \
  --set-env-vars="DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render" \
  ... [other flags from deployment plan]
```

### 4.4 Validate
- Service deployed and running
- VPC Connector attached
- Can reach Docmosis (test endpoint responds)
- Logs show no connection errors

---

## Firewall Configuration Already In Place

✅ Rule Name: `allow-cloudrun-to-docmosis`
- Source: 10.8.0.0/28 (VPC Connector IP range)
- Destination: Instances with "http-server" tag
- Protocol: TCP:8080
- Direction: INGRESS
- Status: ENABLED and VERIFIED

**No additional firewall rules needed for Phase 4.**

---

## Network Connectivity Verified

✅ Test completed: Docmosis API responds with HTTP 400
- Confirms: Network path is open
- Confirms: Firewall rule is working
- Confirms: Docmosis service is accessible
- Ready for: Phase 4 deployment

---

## Common Phase 4 Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Connection refused | VPC Connector not attached | Add `--vpc-connector=legal-forms-connector` flag |
| 403 Forbidden from Docmosis | Firewall rule missing/wrong | Rule exists: `allow-cloudrun-to-docmosis` (verified) |
| VPC Connector not READY | Creation still in progress | Wait 5 minutes from Phase 3 completion |
| Cannot reach 10.128.0.3 | IP conflict or VM moved | Verify: `gcloud compute instances describe docmosis-tornado-vm --zone=us-central1-c` |
| Timeout connecting to Docmosis | Docmosis service down | Test from Cloud Shell: `gcloud compute ssh test-vm ... curl http://10.128.0.3:8080` |

---

## Pre-Phase 4 Checklist

- [ ] Reviewed Phase 3 Completion Report
- [ ] VPC Connector status is READY: `gcloud compute networks vpc-access connectors describe legal-forms-connector --region=us-central1`
- [ ] Firewall rule exists: `gcloud compute firewall-rules describe allow-cloudrun-to-docmosis`
- [ ] Docmosis VM IP is 10.128.0.3: `gcloud compute instances describe docmosis-tornado-vm --zone=us-central1-c`
- [ ] Phase 1 secrets exist: `gcloud secrets list`
- [ ] Ready to proceed with Phase 4 deployment

---

## Commands to Execute for Phase 4

See: `/Users/ryanhaines/Desktop/Lipton Webserver/GCP_PHASED_DEPLOYMENT.md` - Section "Phase 4: Deploy Python FastAPI Service (Internal)"

**Key Command for VPC Connector**:
```bash
gcloud run deploy python-pipeline \
  --source . \
  --region=us-central1 \
  --vpc-connector=legal-forms-connector \
  --set-env-vars="DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render"
```

---

Ready to proceed to Phase 4!

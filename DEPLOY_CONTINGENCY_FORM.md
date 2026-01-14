# Deploy Contingency Agreement Form to agreement.liptonlegal.com

## Quick Start

Deploy the contingency agreement form as a separate Cloud Run service:

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# 1. Commit your changes
git add .
git commit -m "feat: Add contingency agreement form"
git push origin main

# 2. Deploy to Cloud Run
./deploy-contingency-to-cloud-run.sh
```

## What This Creates

- **Service Name**: `contingency-agreement-form`
- **Temporary URL**: `https://contingency-agreement-form-[hash]-uc.a.run.app`
- **Final URL**: `https://agreement.liptonlegal.com`

## After Deployment

### Step 1: Test the Service

The deployment script will output a temporary URL. Test it:

```bash
# Example URL (yours will be different)
curl https://contingency-agreement-form-abc123-uc.a.run.app/health
```

Expected response:
```json
{"status":"healthy","timestamp":"..."}
```

### Step 2: Map Custom Domain

Run this command (provided by deployment script):

```bash
gcloud run domain-mappings create \
  --service contingency-agreement-form \
  --domain agreement.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

This will output DNS records like:

```
Please add the following DNS records:
NAME                         TYPE   DATA
agreement.liptonlegal.com    A      216.239.32.21
agreement.liptonlegal.com    A      216.239.34.21
agreement.liptonlegal.com    A      216.239.36.21
agreement.liptonlegal.com    A      216.239.38.21
```

### Step 3: Add DNS Records

In your DNS provider (where liptonlegal.com is managed):

1. Add **A records** for `agreement.liptonlegal.com` with the IPs shown above
2. Or add a **CNAME record**: `agreement` → `ghs.googlehosted.com`

**Which to use:**
- **A records** = Faster, more reliable (recommended)
- **CNAME** = Simpler, but might have slight delays

### Step 4: Wait for DNS Propagation

- Usually takes 5-15 minutes
- Can take up to 48 hours (rare)

Check status:
```bash
# Check DNS
dig agreement.liptonlegal.com

# Check domain mapping status
gcloud run domain-mappings describe \
  --domain agreement.liptonlegal.com \
  --region us-central1 \
  --project docmosis-tornado
```

### Step 5: Verify Deployment

Once DNS propagates:

```bash
# Health check
curl https://agreement.liptonlegal.com/health

# Should return: {"status":"healthy",...}
```

Test in browser:
1. Visit: `https://agreement.liptonlegal.com/forms/agreement/`
2. Password: `lipton-agreement-2025`
3. Fill out form and test submission
4. Verify ZIP download works

## Architecture

### Separate Services
- **Docs form**: `docs.liptonlegal.com` → `node-server` service (existing)
- **Contingency form**: `agreement.liptonlegal.com` → `contingency-agreement-form` service (new)

Both services:
- Use the same Cloud SQL database
- Share the same secrets (DB_PASSWORD, ACCESS_TOKEN)
- Independent scaling and deployment

### Why Separate Services?

✅ **Benefits:**
- Independent deployments (update one without affecting the other)
- Separate URLs (cleaner organization)
- Independent scaling
- Easier to monitor and troubleshoot

## Database

Both services connect to the same database:
- **Instance**: `docmosis-tornado:us-central1:legal-forms-db`
- **Database**: `lipton_legal_forms`
- **Tables**:
  - `contingency_agreements`
  - `contingency_plaintiffs`
  - `contingency_defendants`

Database already has all necessary tables ✅

## Environment Variables

Set automatically by deployment script:

```bash
NODE_ENV=production
PORT=8080
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db
DB_NAME=lipton_legal_forms
DB_USER=admin
DB_PASSWORD=[from Secret Manager]
ACCESS_TOKEN=[from Secret Manager]
```

## Monitoring

### View Logs
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=contingency-agreement-form" \
  --limit 50 \
  --project docmosis-tornado
```

### View Service Details
```bash
gcloud run services describe contingency-agreement-form \
  --region us-central1 \
  --project docmosis-tornado
```

### View All Revisions
```bash
gcloud run revisions list \
  --service contingency-agreement-form \
  --region us-central1 \
  --project docmosis-tornado
```

## Rollback

If you need to rollback:

```bash
# List revisions
gcloud run revisions list \
  --service contingency-agreement-form \
  --region us-central1 \
  --project docmosis-tornado

# Rollback to specific revision
gcloud run services update-traffic contingency-agreement-form \
  --to-revisions=REVISION_NAME=100 \
  --region us-central1 \
  --project docmosis-tornado
```

## Update/Redeploy

To deploy updates:

```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver

# Commit changes
git add .
git commit -m "Update contingency form"
git push

# Redeploy
./deploy-contingency-to-cloud-run.sh
```

## Troubleshooting

### Issue: Domain mapping fails
**Solution**: Check that agreement.liptonlegal.com isn't already mapped to another service

```bash
gcloud run domain-mappings list --project docmosis-tornado
```

### Issue: DNS not resolving
**Solution**:
1. Verify DNS records are added correctly
2. Wait longer (DNS can take time)
3. Use `dig agreement.liptonlegal.com` to check

### Issue: Service won't start
**Solution**: Check logs for errors

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=contingency-agreement-form" \
  --limit 50 \
  --project docmosis-tornado
```

### Issue: Database connection fails
**Solution**: Verify Cloud SQL instance is running and accessible

```bash
gcloud sql instances describe legal-forms-db --project docmosis-tornado
```

## Cost Estimate

Cloud Run charges per request:
- **First 2 million requests/month**: Free
- **After that**: $0.40 per million requests
- **Memory**: $0.0000025 per GB-second
- **CPU**: $0.00002400 per vCPU-second

Estimated cost for typical usage: **$5-10/month**

## Success Checklist

- [ ] Deployment script runs successfully
- [ ] Health endpoint responds at temporary URL
- [ ] Custom domain mapped
- [ ] DNS records added
- [ ] DNS propagated
- [ ] Health check works at https://agreement.liptonlegal.com/health
- [ ] Form loads at https://agreement.liptonlegal.com/forms/agreement/
- [ ] Can login with password
- [ ] Form submission works
- [ ] ZIP download works
- [ ] Documents contain correct data

## Support

If you encounter issues:
1. Check deployment logs
2. Verify DNS configuration
3. Test with temporary Cloud Run URL first
4. Check Cloud SQL connectivity
5. Review test report: `PHASE7_TEST_REPORT.md`

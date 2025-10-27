# Staging Environment Guide

## Overview

The staging environment is a complete mirror of production that allows you to test changes safely before deploying to production. It uses separate infrastructure, databases, and configurations to ensure complete isolation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                     │
├─────────────────────────────────────────────────────────────┤
│  • Cloud Run: node-server                                    │
│  • Cloud Run: python-pipeline                                │
│  • Cloud SQL: legal-forms-db                                 │
│  • Storage: docmosis-tornado-form-submissions                │
│  • Dropbox: /Current Clients                                 │
│  • Email: notifications@liptonlegal.com                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                        │
├─────────────────────────────────────────────────────────────┤
│  • Cloud Run: node-server-staging                            │
│  • Cloud Run: python-pipeline-staging                        │
│  • Cloud SQL: legal-forms-db-staging                         │
│  • Storage: docmosis-tornado-form-submissions-staging        │
│  • Dropbox: /Staging/Current Clients                         │
│  • Email: staging-notifications@liptonlegal.com [STAGING]    │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Initial Setup (One-Time)

Run the setup script to create all staging infrastructure:

```bash
cd /path/to/Lipton\ Webserver
chmod +x scripts/setup-staging-environment.sh
./scripts/setup-staging-environment.sh
```

This script will create:
- Cloud SQL staging database
- Cloud Storage staging bucket
- Secret Manager staging secrets
- Cloud Run staging services

**Duration:** 10-15 minutes (Cloud SQL creation is slow)

**Cost:** ~$10-15/month

### 2. Verify Setup

After setup completes, verify the environment:

```bash
# Check services are running
gcloud run services list --format="table(name,region,url)"

# Test staging health endpoint
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# View staging database
gcloud sql instances describe legal-forms-db-staging
```

## Resource Naming Conventions

| Resource Type | Production | Staging |
|--------------|------------|---------|
| Node.js Service | `node-server` | `node-server-staging` |
| Python Service | `python-pipeline` | `python-pipeline-staging` |
| Database Instance | `legal-forms-db` | `legal-forms-db-staging` |
| Database Name | `legal_forms_db` | `legal_forms_db_staging` |
| Database User | `app-user` | `app-user-staging` |
| Storage Bucket | `...-form-submissions` | `...-form-submissions-staging` |
| Dropbox Folder | `/Current Clients` | `/Staging/Current Clients` |
| Email From | `notifications@...` | `staging-notifications@...` |
| Secrets | `DB_PASSWORD` | `DB_PASSWORD_STAGING` |

## Deployment Workflows

### Manual Deployment to Staging

Deploy to staging using the deployment script:

```bash
# From project root
./scripts/deploy.sh staging
```

The script will:
1. Load configuration from [config/staging.env](../config/staging.env)
2. Deploy to `node-server-staging` Cloud Run service
3. Use staging-specific secrets
4. Connect to staging database
5. Run health checks

### CI/CD Automated Deployment

GitHub Actions automatically deploys to staging when:
- Code is pushed to the `main` branch
- All tests pass
- Quality checks pass
- Security scans complete

**Workflow:** [.github/workflows/ci-cd-main.yml](../.github/workflows/ci-cd-main.yml)

**Deployment Flow:**
```
Push to main → Tests → Build → Deploy Staging → Deploy Production (manual approval)
```

### Staging Deployment Sequence

1. **Build Job** builds staging container image
2. **Deploy-Staging Job** deploys to Cloud Run
3. **Smoke Tests** verify deployment health
4. **Manual Approval** required for production deployment

## Configuration Management

### Environment Variables

Staging configuration is defined in [config/staging.env](../config/staging.env):

```bash
NODE_ENV=staging
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db-staging
DROPBOX_BASE_PATH=/Staging/Current Clients
EMAIL_FROM_ADDRESS=staging-notifications@liptonlegal.com
EMAIL_FROM_NAME=Lipton Legal [STAGING]
# ... etc
```

### Secrets Management

Staging secrets are stored separately in Google Secret Manager:

```bash
# View staging secrets
gcloud secrets list --filter="name:STAGING"

# Update a staging secret
echo -n "new-value" | gcloud secrets versions add DB_PASSWORD_STAGING --data-file=-

# Access a secret value (requires permission)
gcloud secrets versions access latest --secret=ACCESS_TOKEN_STAGING
```

**Staging Secrets:**
- `DB_PASSWORD_STAGING` - Staging database password
- `ACCESS_TOKEN_STAGING` - API authentication token
- `sendgrid-api-key-staging` - SendGrid API key
- `dropbox-token-staging` - Dropbox OAuth token

## Testing in Staging

### 1. Functional Testing

Test all application features in staging before production:

```bash
# Staging URL
STAGING_URL="https://node-server-staging-zyiwmzwenq-uc.a.run.app"

# Test health endpoint
curl $STAGING_URL/health

# Test with authentication
curl -H "Authorization: Bearer $ACCESS_TOKEN" $STAGING_URL/api/cases

# Submit a test form
open $STAGING_URL
```

### 2. Database Testing

Connect to staging database to verify data:

```bash
# Connect via Cloud SQL proxy
gcloud sql connect legal-forms-db-staging \
  --user=app-user-staging \
  --database=legal_forms_db_staging

# Or use psql directly
psql "host=/cloudsql/docmosis-tornado:us-central1:legal-forms-db-staging dbname=legal_forms_db_staging user=app-user-staging"
```

### 3. Integration Testing

Test external service integrations:

**Dropbox:**
- Files upload to `/Staging/Current Clients` folder
- Verify folder structure and permissions
- Check shared links are team-only

**Email:**
- Emails sent from `staging-notifications@liptonlegal.com`
- Subject line includes `[STAGING]` prefix
- Test with real email addresses

**Python Pipeline:**
- Verify `node-server-staging` can invoke `python-pipeline-staging`
- Check logs for successful pipeline execution

### 4. Performance Testing

Test under load in staging:

```bash
# Install Apache Bench
brew install httpd  # macOS

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 $STAGING_URL/health

# Monitor Cloud Run metrics
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(status.conditions)"
```

## Monitoring & Debugging

### View Logs

```bash
# Node.js service logs
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=50

# Python pipeline logs
gcloud run services logs read python-pipeline-staging \
  --region=us-central1 \
  --limit=50

# Stream logs in real-time
gcloud run services logs tail node-server-staging --region=us-central1
```

### Check Service Health

```bash
# Get service status
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(status)"

# View revisions
gcloud run revisions list \
  --service=node-server-staging \
  --region=us-central1

# Check resource usage
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].resources)"
```

### Database Monitoring

```bash
# Check database metrics
gcloud sql operations list --instance=legal-forms-db-staging

# View database connections
gcloud sql instances describe legal-forms-db-staging \
  --format="yaml(currentDiskSize,maxDiskSize,databaseInstalledVersion)"
```

## Data Management

### Staging Data Lifecycle

- **Retention:** 90 days (automatic deletion)
- **Backups:** 7 daily backups retained
- **Purpose:** Testing only - not production data

### Copying Production Data to Staging

**⚠️ Warning:** Only copy sanitized/anonymized data

```bash
# Export from production
gcloud sql export sql legal-forms-db \
  gs://docmosis-tornado-backups/prod-export-$(date +%Y%m%d).sql \
  --database=legal_forms_db

# Import to staging
gcloud sql import sql legal-forms-db-staging \
  gs://docmosis-tornado-backups/prod-export-$(date +%Y%m%d).sql \
  --database=legal_forms_db_staging
```

### Resetting Staging Data

```bash
# Drop and recreate staging database
gcloud sql databases delete legal_forms_db_staging \
  --instance=legal-forms-db-staging

gcloud sql databases create legal_forms_db_staging \
  --instance=legal-forms-db-staging

# Run schema migrations
psql -h /cloudsql/docmosis-tornado:us-central1:legal-forms-db-staging \
  -U app-user-staging \
  -d legal_forms_db_staging \
  -f schema.sql
```

## Cost Optimization

### Estimated Monthly Costs

| Resource | Configuration | Monthly Cost |
|----------|--------------|-------------|
| Cloud SQL | db-f1-micro (staging) | $7.67 |
| Cloud Storage | ~1GB (with lifecycle) | $0.02 |
| Cloud Run | Pay per use | $2-5 |
| **Total** | | **$10-15** |

### Cost Reduction Tips

1. **Scale to zero when not in use:**
   ```bash
   # Set min instances to 0
   gcloud run services update node-server-staging \
     --min-instances=0 \
     --region=us-central1
   ```

2. **Use smaller database tier:**
   - Staging uses `db-f1-micro` (smallest tier)
   - Production uses `db-n1-standard-1` or higher

3. **Implement lifecycle policies:**
   - Storage: Auto-delete files after 90 days
   - Backups: Keep only 7 days of backups

4. **Pause staging when not needed:**
   ```bash
   # Stop database (saves ~$7/month)
   gcloud sql instances patch legal-forms-db-staging \
     --activation-policy=NEVER

   # Restart when needed
   gcloud sql instances patch legal-forms-db-staging \
     --activation-policy=ALWAYS
   ```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Secret not found"

**Problem:** Staging secrets not created

**Solution:**
```bash
# Run setup script
./scripts/setup-staging-environment.sh

# Or manually create missing secret
gcloud secrets create DB_PASSWORD_STAGING --replication-policy=automatic
echo -n "your-password" | gcloud secrets versions add DB_PASSWORD_STAGING --data-file=-
```

#### 2. Database Connection Fails

**Problem:** Cloud Run can't connect to Cloud SQL

**Solution:**
```bash
# Verify Cloud SQL connection is configured
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="yaml(spec.template.spec.cloudSqlInstances)"

# Add if missing
gcloud run services update node-server-staging \
  --add-cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db-staging \
  --region=us-central1
```

#### 3. Dropbox Upload Fails

**Problem:** Staging folder doesn't exist or permissions denied

**Solution:**
- Create `/Staging/Current Clients` folder in Dropbox
- Verify Dropbox token has write permissions
- Check service logs for detailed error

#### 4. Email Not Sending

**Problem:** SendGrid key invalid or email not verified

**Solution:**
- Verify `staging-notifications@liptonlegal.com` in SendGrid
- Check SendGrid API key is valid
- Test with SendGrid API directly

### Getting Help

**View detailed logs:**
```bash
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=100 \
  --format="table(timestamp,severity,textPayload)"
```

**Check service configuration:**
```bash
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format=yaml > staging-config.yaml
```

## Best Practices

### 1. Always Test in Staging First

- Deploy to staging before production
- Run full test suite in staging
- Verify all integrations work
- Get stakeholder approval

### 2. Keep Staging in Sync with Production

- Use same configuration structure
- Match production resource sizing (scaled down)
- Update staging when production changes
- Test migrations in staging first

### 3. Use Staging for Training

- Train new team members in staging
- Test new features with stakeholders
- Demo new functionality safely

### 4. Monitor Costs

- Review monthly Cloud costs
- Shut down staging when not in use
- Clean up old data regularly

### 5. Security

- Use separate secrets for staging
- Don't expose staging publicly
- Sanitize production data before copying
- Treat staging credentials as sensitive

## Promoting Staging to Production

When staging testing is complete:

1. **Verify staging health:**
   ```bash
   curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health
   ```

2. **Deploy to production:**
   ```bash
   # Manual deployment
   ./scripts/deploy.sh production

   # Or via GitHub Actions (requires approval)
   # Push to main branch → Staging deploys → Approve production deployment
   ```

3. **Monitor production:**
   ```bash
   # Watch logs
   gcloud run services logs tail node-server --region=us-central1

   # Test health
   curl https://node-server-zyiwmzwenq-uc.a.run.app/health
   ```

4. **Rollback if needed:**
   ```bash
   # List revisions
   gcloud run revisions list --service=node-server --region=us-central1

   # Rollback to previous revision
   gcloud run services update-traffic node-server \
     --to-revisions=node-server-00054-xyz=100 \
     --region=us-central1
   ```

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [CI/CD Workflows](operations/CI_CD_WORKFLOWS.md)
- [GitHub Secrets Setup](setup/GITHUB_SECRETS_SETUP.md)

## Quick Reference

```bash
# Deploy to staging
./scripts/deploy.sh staging

# View staging logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=50

# Test staging
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Connect to staging database
gcloud sql connect legal-forms-db-staging --user=app-user-staging --database=legal_forms_db_staging

# Update staging secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME_STAGING --data-file=-

# View staging services
gcloud run services list --filter="name:staging"
```

---

**Last Updated:** October 27, 2025
**Maintained By:** DevOps Team

# Development Environment Guide

## Overview

This development environment is a complete, isolated instance of the Lipton Legal Group infrastructure for safe development and testing.

## Resources Created

### Cloud SQL
- **Instance**: `legal-forms-db-dev`
- **Database**: `legal_forms_db_dev`
- **User**: `app-user-dev`
- **Connection**: `docmosis-tornado:us-central1:legal-forms-db-dev`

### Cloud Run
- **Service**: `node-server-dev`
- **URL**: https://node-server-dev-zyiwmzwenq-uc.a.run.app (check after first deploy)
- **Max Instances**: 5
- **Memory**: 1 GiB

### Cloud Storage
- **Bucket**: `docmosis-tornado-form-submissions-dev`
- **Lifecycle**: 90-day auto-deletion

### Secret Manager
- `DB_PASSWORD_DEV` - Database password
- `ACCESS_TOKEN_DEV` - API access token
- (Add others as needed)

## Git Workflow

### Branch Strategy
```
main (production) ← merge from staging
  ↑
staging (pre-prod) ← merge from dev
  ↑
dev/* (development) ← Claude Code works here
```

### Creating a Dev Branch
```bash
git checkout -b dev/feature-name
# Make changes with Claude Code
git push origin dev/feature-name
# Auto-deploys to node-server-dev
```

### Deploying to Dev
Pushes to any `dev/*` or `feature/*` branch automatically deploy to the dev environment via GitHub Actions.

Manual deploy:
```bash
gcloud run deploy node-server-dev --source=. --region=us-central1
```

## Database Migrations

### Running Migrations
```bash
# Connect to dev database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Run migration
\i migrations/001_create_intake_tables.sql
```

### Creating New Migrations
1. Create file: `migrations/XXX_description.sql`
2. Write SQL (include rollback instructions in comments)
3. Test on dev database
4. Commit to repo
5. Run on staging → production when ready

## Local Development

### Option 1: Deploy to Cloud Run (Recommended)
- Push to dev branch
- GitHub Actions deploys automatically
- Test at Cloud Run URL

### Option 2: Run Locally with Cloud SQL Proxy
```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy

# Run proxy (in separate terminal)
./cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=app-user-dev
export DB_NAME=legal_forms_db_dev
export DB_PASSWORD=<get from secret manager>
export NODE_ENV=development

# Run app
npm start
```

## Viewing Logs

```bash
# Cloud Run logs
gcloud run logs read node-server-dev --region=us-central1 --limit=50

# Follow logs (live)
gcloud run logs tail node-server-dev --region=us-central1

# Database logs
gcloud sql operations list --instance=legal-forms-db-dev --limit=10
```

## Accessing Database

### Via Cloud Console
1. Go to Cloud SQL → legal-forms-db-dev
2. Click "Connect using Cloud Shell"
3. Run: `gcloud sql connect legal-forms-db-dev --user=app-user-dev`

### Via psql (local)
```bash
# Through Cloud SQL Proxy
psql -h localhost -U app-user-dev -d legal_forms_db_dev
```

## Cost Monitoring

Dev environment costs approximately **$10-13/month**:
- Cloud SQL: ~$8/month
- Cloud Run: ~$2-5/month (low traffic)
- Storage: ~$0.20/month

To check current costs:
```bash
gcloud billing accounts list
gcloud billing budgets list --billing-account=<ACCOUNT_ID>
```

## Cleanup (if needed)

To delete the entire dev environment:
```bash
# Delete Cloud Run service
gcloud run services delete node-server-dev --region=us-central1

# Delete Cloud SQL instance
gcloud sql instances delete legal-forms-db-dev

# Delete storage bucket
gcloud storage rm -r gs://docmosis-tornado-form-submissions-dev

# Delete secrets
gcloud secrets delete DB_PASSWORD_DEV
gcloud secrets delete ACCESS_TOKEN_DEV
```

**Warning**: This is destructive and cannot be undone!

## Troubleshooting

### Service won't deploy
- Check Cloud Build logs: https://console.cloud.google.com/cloud-build/builds
- Verify secrets exist: `gcloud secrets list | grep DEV`
- Check service account permissions

### Can't connect to database
- Verify Cloud SQL instance is running: `gcloud sql instances describe legal-forms-db-dev`
- Check credentials in Secret Manager
- Ensure service has Cloud SQL Client role

### Getting 500 errors
- Check Cloud Run logs: `gcloud run logs read node-server-dev --region=us-central1`
- Verify environment variables are set correctly
- Check database connection string

## Next Steps

1. ✅ Dev environment set up
2. Run database migration: `migrations/001_create_intake_tables.sql`
3. Create dev branch: `git checkout -b dev/intake-system`
4. Start coding with Claude Code!

## Support

For issues, check:
- GCP Console: https://console.cloud.google.com/
- Cloud Run: https://console.cloud.google.com/run?project=docmosis-tornado
- Cloud SQL: https://console.cloud.google.com/sql/instances?project=docmosis-tornado

# Configuration Files

This directory contains environment-specific configuration files for the Legal Form Application.

## Files

### `production.env`
Production environment configuration for Cloud Run deployment.
- **Used by:** GitHub Actions CI/CD, manual deployment scripts
- **Includes:** All non-sensitive configuration values
- **Excludes:** Passwords, API keys (managed in GCP Secret Manager)

### `staging.env`
Staging environment configuration for pre-production testing.
- **Used by:** GitHub Actions CI/CD for staging deployments
- **Purpose:** Test changes before production with separate data
- **Includes:** Same structure as production but different values

### `development.env`
Local development configuration for your laptop.
- **Used by:** Local development
- **Purpose:** Run application locally without cloud services
- **Includes:** Localhost connections, disabled cloud features

### `env-validator.js`
Environment variable validation module.
- **Purpose:** Validates all required variables are set on startup
- **Usage:** Automatically run by server.js on startup
- **Features:** Fails fast with clear error messages if misconfigured

## How Configuration Works

### 1. Local Development
```bash
# Copy development config to .env
cp config/development.env .env

# Start server
npm start
```

The application reads `.env` file via `dotenv` package.

### 2. Cloud Run Production
```bash
# Deploy with configuration
gcloud run deploy node-server \
  --set-env-vars="$(cat config/production.env | grep -v '^#' | grep -v '^$' | tr '\n' ',')"
```

Cloud Run injects environment variables directly into the container.

### 3. Sensitive Values (Secrets)
Passwords and API keys are NEVER stored in `.env` files. They live in GCP Secret Manager:

```bash
# View secrets
gcloud secrets list --project=docmosis-tornado

# Access a secret value (requires permission)
gcloud secrets versions access latest --secret=DB_PASSWORD

# Update a secret
echo -n "new-password" | gcloud secrets versions add DB_PASSWORD --data-file=-
```

## Environment Variables by Category

### Critical (Application Won't Start Without These)
- `NODE_ENV` - Application environment
- `DB_USER` - Database username
- `DB_HOST` - Database host
- `DB_PASSWORD` - Database password (secret)
- `DB_NAME` - Database name

### Important (Features Won't Work Without These)
- `SENDGRID_API_KEY` - Email notifications (secret)
- `EMAIL_FROM_ADDRESS` - Email sender address
- `ACCESS_TOKEN` - API authentication (secret)
- `PIPELINE_API_URL` - Python pipeline URL
- `DROPBOX_ACCESS_TOKEN` - Dropbox uploads (secret)

### Optional (Have Sensible Defaults)
- `PORT` - Server port (auto-set by Cloud Run)
- `DB_PORT` - Database port (default: 5432)
- `EMAIL_ENABLED` - Enable emails (default: true)
- `DROPBOX_ENABLED` - Enable Dropbox (default: false)
- `GCLOUD_PROJECT` - GCP project (auto-detected)

**For complete reference, see:** [../docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md)

## Adding New Environment Variables

### Step 1: Add to Configuration Files
```bash
# Add to all environment files
echo "NEW_FEATURE_FLAG=true" >> config/production.env
echo "NEW_FEATURE_FLAG=true" >> config/staging.env
echo "NEW_FEATURE_FLAG=false" >> config/development.env
```

### Step 2: Add to Validator (if critical)
Edit `config/env-validator.js`:
```javascript
critical: {
    'NEW_FEATURE_FLAG': {
        description: 'Enable new feature',
        example: 'true'
    }
}
```

### Step 3: Use in Code
```javascript
const isFeatureEnabled = process.env.NEW_FEATURE_FLAG === 'true';
```

### Step 4: Deploy
```bash
git add config/
git commit -m "Add NEW_FEATURE_FLAG configuration"
git push  # GitHub Actions automatically deploys with new variable
```

## Validation

### Manual Validation
```bash
# Validate current environment
node config/env-validator.js

# Expected output:
# ✅ All required environment variables are set
```

### Automatic Validation
The validator runs automatically on server startup ([server.js:45-47](../server.js#L45-L47)):
```javascript
const envValidator = require('./config/env-validator');
envValidator.validate(); // Exits if critical vars missing
```

If validation fails, the server **refuses to start** and shows clear error messages.

## Troubleshooting

### Error: "DB_USER is not set"
**Cause:** Environment variable not configured in Cloud Run

**Fix:**
```bash
gcloud run services update node-server \
  --set-env-vars="DB_USER=app-user" \
  --region=us-central1
```

### Error: "Invalid value for NODE_ENV"
**Cause:** NODE_ENV has invalid value (not development/staging/production)

**Fix:**
```bash
# Set to correct value
export NODE_ENV=production
```

### Warning: "SENDGRID_API_KEY is not set"
**Cause:** Secret not mounted to Cloud Run

**Fix:**
```bash
gcloud run services update node-server \
  --update-secrets="SENDGRID_API_KEY=sendgrid-api-key:latest" \
  --region=us-central1
```

## Best Practices

### ✅ DO
- Store sensitive values in GCP Secret Manager
- Use separate configurations for each environment
- Validate environment variables on startup
- Commit configuration files to Git
- Document what each variable does

### ❌ DON'T
- Put passwords or API keys in `.env` files
- Commit `.env` files to Git (they're in `.gitignore`)
- Use production secrets in development
- Deploy without validating configuration
- Use magic values (hardcode strings) in code

## Security Notes

### Sensitive Data
These variables contain sensitive data and MUST be stored in Secret Manager:
- `DB_PASSWORD` - Database credentials
- `ACCESS_TOKEN` - API authentication
- `SENDGRID_API_KEY` - Email service credentials
- `DROPBOX_ACCESS_TOKEN` - File storage credentials

### Access Control
Only authorized service accounts can access secrets:
```bash
# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Audit Logging
All secret access is logged in GCP:
```bash
# View secret access logs
gcloud logging read "protoPayload.serviceName=\"secretmanager.googleapis.com\""
```

## Related Documentation

- [Environment Variables Reference](../docs/ENVIRONMENT_VARIABLES.md) - Complete variable documentation
- [Deployment Guide](../docs/DEPLOYMENT.md) - How to deploy with configuration
- [Cloud Run Architecture](../docs/CLOUD_RUN_ARCHITECTURE.md) - System architecture

## Questions?

For questions about configuration:
1. Check this README first
2. Review [docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md)
3. Run validation: `node config/env-validator.js`
4. Check Cloud Run logs: `gcloud run services logs read node-server`

---

**Last Updated:** October 27, 2025
**Maintainer:** Development Team
**Version:** 1.0

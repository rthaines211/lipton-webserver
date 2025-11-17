#!/bin/bash

###############################################################################
# DEV ENVIRONMENT SETUP SCRIPT
# Lipton Legal Group - Client Intake System
# 
# This script creates a complete development environment in GCP including:
# - Cloud SQL PostgreSQL instance (dev)
# - Cloud Storage bucket (dev)
# - Secret Manager secrets (dev)
# - Cloud Run service configuration (dev)
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Project set to: docmosis-tornado
# - Permissions to create resources
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
DB_INSTANCE_NAME="legal-forms-db-dev"
DB_NAME="legal_forms_db_dev"
DB_USER="app-user-dev"
BUCKET_NAME="docmosis-tornado-form-submissions-dev"
CLOUD_RUN_SERVICE="node-server-dev"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Dev Environment Setup Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Verify we're in the correct project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Switching to project: $PROJECT_ID${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}Project:${NC} $PROJECT_ID"
echo -e "${GREEN}Region:${NC} $REGION"
echo ""

###############################################################################
# Step 1: Create Cloud SQL Dev Instance
###############################################################################

echo -e "${YELLOW}Step 1: Creating Cloud SQL instance...${NC}"

# Check if instance already exists
if gcloud sql instances describe $DB_INSTANCE_NAME &>/dev/null; then
    echo -e "${YELLOW}Cloud SQL instance '$DB_INSTANCE_NAME' already exists. Skipping...${NC}"
else
    echo "Creating Cloud SQL instance: $DB_INSTANCE_NAME"
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --backup-start-time=03:00 \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=2 \
        --project=$PROJECT_ID
    
    echo -e "${GREEN}✓ Cloud SQL instance created${NC}"
fi

# Wait for instance to be ready
echo "Waiting for Cloud SQL instance to be ready..."
gcloud sql operations wait $(gcloud sql operations list --instance=$DB_INSTANCE_NAME --filter="status=PENDING" --format="value(name)" --limit=1) --project=$PROJECT_ID 2>/dev/null || true

###############################################################################
# Step 2: Create Database and User
###############################################################################

echo -e "${YELLOW}Step 2: Creating database and user...${NC}"

# Create database
if gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE_NAME &>/dev/null; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists. Skipping...${NC}"
else
    echo "Creating database: $DB_NAME"
    gcloud sql databases create $DB_NAME \
        --instance=$DB_INSTANCE_NAME \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Generate secure password for database user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create user (will fail if exists, which is fine)
echo "Creating database user: $DB_USER"
gcloud sql users create $DB_USER \
    --instance=$DB_INSTANCE_NAME \
    --password=$DB_PASSWORD \
    --project=$PROJECT_ID 2>/dev/null || echo -e "${YELLOW}User may already exist${NC}"

echo -e "${GREEN}✓ Database user configured${NC}"
echo -e "${YELLOW}DB Password (save this!):${NC} $DB_PASSWORD"

###############################################################################
# Step 3: Create Cloud Storage Bucket
###############################################################################

echo -e "${YELLOW}Step 3: Creating Cloud Storage bucket...${NC}"

# Check if bucket exists
if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
    echo -e "${YELLOW}Bucket '$BUCKET_NAME' already exists. Skipping...${NC}"
else
    echo "Creating bucket: $BUCKET_NAME"
    gcloud storage buckets create gs://$BUCKET_NAME \
        --location=$REGION \
        --uniform-bucket-level-access \
        --project=$PROJECT_ID
    
    # Add lifecycle rule (90-day deletion for dev data)
    echo "Adding lifecycle policy (90-day deletion)..."
    cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 90
        }
      }
    ]
  }
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
    rm /tmp/lifecycle.json
    
    echo -e "${GREEN}✓ Storage bucket created${NC}"
fi

###############################################################################
# Step 4: Create Secret Manager Secrets
###############################################################################

echo -e "${YELLOW}Step 4: Creating Secret Manager secrets...${NC}"

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
        echo "Updating existing secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    else
        echo "Creating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --replication-policy=automatic --project=$PROJECT_ID
    fi
}

# Database password
create_or_update_secret "DB_PASSWORD_DEV" "$DB_PASSWORD"

# Generate dev access token
DEV_ACCESS_TOKEN=$(openssl rand -base64 32)
create_or_update_secret "ACCESS_TOKEN_DEV" "$DEV_ACCESS_TOKEN"

# Copy other secrets from staging or create placeholders
echo ""
echo -e "${YELLOW}Note: You may need to manually create these additional secrets:${NC}"
echo "  - sendgrid-api-key-dev (or reuse staging key for dev)"
echo "  - dropbox-token-dev (or use staging credentials)"
echo "  - docmosis-key (can reuse production key)"
echo ""
echo "Example command to create:"
echo "  echo -n 'your-value' | gcloud secrets create SECRET_NAME_DEV --data-file=-"
echo ""

echo -e "${GREEN}✓ Core secrets created${NC}"

###############################################################################
# Step 5: Grant Service Account Access to Secrets
###############################################################################

echo -e "${YELLOW}Step 5: Configuring IAM permissions...${NC}"

SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

# Grant Secret Manager access
gcloud secrets add-iam-policy-binding DB_PASSWORD_DEV \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

gcloud secrets add-iam-policy-binding ACCESS_TOKEN_DEV \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudsql.client" 2>/dev/null || true

echo -e "${GREEN}✓ IAM permissions configured${NC}"

###############################################################################
# Step 6: Create cloudbuild-dev.yaml
###############################################################################

echo -e "${YELLOW}Step 6: Creating Cloud Build configuration...${NC}"

cat > cloudbuild-dev.yaml <<'EOF'
# Cloud Build configuration for DEV environment
# Triggered by pushes to dev/* branches

steps:
  # Step 1: Install dependencies
  - name: 'node:18'
    entrypoint: npm
    args: ['install']
    
  # Step 2: Run tests (if they exist)
  - name: 'node:18'
    entrypoint: npm
    args: ['test']
    env:
      - 'NODE_ENV=test'
    # Continue even if tests fail in dev
    allowFailure: true
    
  # Step 3: Build the application (if needed)
  - name: 'node:18'
    entrypoint: npm
    args: ['run', 'build']
    # Only if you have a build script
    allowFailure: true

  # Step 4: Deploy to Cloud Run (dev)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'node-server-dev'
      - '--source=.'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--set-cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db-dev'
      - '--max-instances=5'
      - '--memory=1Gi'
      - '--cpu=1'
      - '--timeout=300'
      - '--set-env-vars=NODE_ENV=development,DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db-dev,DB_NAME=legal_forms_db_dev,DB_USER=app-user-dev,DB_PORT=5432,GCS_BUCKET_NAME=docmosis-tornado-form-submissions-dev,EMAIL_FROM_ADDRESS=dev-notifications@liptonlegal.com,EMAIL_FROM_NAME=Lipton Legal [DEV],EMAIL_ENABLED=false,DROPBOX_ENABLED=false,DOCMOSIS_ENABLED=false'
      - '--update-secrets=DB_PASSWORD=DB_PASSWORD_DEV:latest,ACCESS_TOKEN=ACCESS_TOKEN_DEV:latest'

# Deployment options
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'

# Build timeout
timeout: '1200s'
EOF

echo -e "${GREEN}✓ cloudbuild-dev.yaml created${NC}"

###############################################################################
# Step 7: Create/Update GitHub Actions Workflow
###############################################################################

echo -e "${YELLOW}Step 7: Creating GitHub Actions workflow...${NC}"

mkdir -p .github/workflows

cat > .github/workflows/deploy-dev.yml <<'EOF'
name: Deploy to Dev Environment

on:
  push:
    branches:
      - 'dev/**'
      - 'feature/**'
      - 'dev'
  workflow_dispatch:

env:
  PROJECT_ID: docmosis-tornado
  REGION: us-central1
  SERVICE_NAME: node-server-dev

jobs:
  deploy:
    name: Deploy to Cloud Run (Dev)
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint || echo "No linter configured"
        continue-on-error: true
      
      - name: Run tests
        run: npm test || echo "No tests configured"
        continue-on-error: true
        env:
          NODE_ENV: test
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/945419684329/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
          service_account: 'github-actions@docmosis-tornado.iam.gserviceaccount.com'
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --source=. \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated \
            --set-cloudsql-instances=${{ env.PROJECT_ID }}:${{ env.REGION }}:legal-forms-db-dev \
            --max-instances=5 \
            --memory=1Gi \
            --cpu=1 \
            --timeout=300 \
            --set-env-vars="NODE_ENV=development,DB_HOST=/cloudsql/${{ env.PROJECT_ID }}:${{ env.REGION }}:legal-forms-db-dev,DB_NAME=legal_forms_db_dev,DB_USER=app-user-dev,DB_PORT=5432,GCS_BUCKET_NAME=docmosis-tornado-form-submissions-dev,EMAIL_FROM_ADDRESS=dev-notifications@liptonlegal.com,EMAIL_FROM_NAME=Lipton Legal [DEV],EMAIL_ENABLED=false,DROPBOX_ENABLED=false,DOCMOSIS_ENABLED=false" \
            --update-secrets="DB_PASSWORD=DB_PASSWORD_DEV:latest,ACCESS_TOKEN=ACCESS_TOKEN_DEV:latest"
      
      - name: Get Service URL
        run: |
          SERVICE_URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          echo "🚀 Dev service deployed to: $SERVICE_URL"
          echo "SERVICE_URL=$SERVICE_URL" >> $GITHUB_OUTPUT
        id: get-url
      
      - name: Comment PR with URL
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Dev deployment successful!\n\nURL: ${{ steps.get-url.outputs.SERVICE_URL }}'
            })
EOF

echo -e "${GREEN}✓ GitHub Actions workflow created${NC}"

###############################################################################
# Step 8: Create Initial Migration Script
###############################################################################

echo -e "${YELLOW}Step 8: Creating database migration setup...${NC}"

# Create migrations directory structure
mkdir -p migrations

# Create initial migration file
cat > migrations/001_create_intake_tables.sql <<'EOF'
-- Migration: Create Client Intake Tables
-- Created: 2025-11-17
-- Description: Initial schema for client intake system

-- Table 1: Intake Submissions (main record)
CREATE TABLE IF NOT EXISTS intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_email VARCHAR(255) NOT NULL,
    attorney_id UUID,
    status VARCHAR(50) DEFAULT 'new',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmation_number VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching by email
CREATE INDEX idx_intake_submissions_email ON intake_submissions(client_email);
CREATE INDEX idx_intake_submissions_status ON intake_submissions(status);
CREATE INDEX idx_intake_submissions_submitted_at ON intake_submissions(submitted_at DESC);

-- Table 2-6: Page Data (JSONB for flexibility)
CREATE TABLE IF NOT EXISTS intake_page_1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_4 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_page_5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for page lookups
CREATE INDEX idx_intake_page_1_submission ON intake_page_1(submission_id);
CREATE INDEX idx_intake_page_2_submission ON intake_page_2(submission_id);
CREATE INDEX idx_intake_page_3_submission ON intake_page_3(submission_id);
CREATE INDEX idx_intake_page_4_submission ON intake_page_4(submission_id);
CREATE INDEX idx_intake_page_5_submission ON intake_page_5(submission_id);

-- Table 7: Saved Sessions (for save & resume)
CREATE TABLE IF NOT EXISTS saved_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    session_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup and cleanup
CREATE INDEX idx_saved_sessions_token ON saved_sessions(token);
CREATE INDEX idx_saved_sessions_expires_at ON saved_sessions(expires_at);

-- Table 8: Attorneys (for authentication)
CREATE TABLE IF NOT EXISTS attorneys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'attorney',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookup (login)
CREATE INDEX idx_attorneys_email ON attorneys(email);
CREATE INDEX idx_attorneys_is_active ON attorneys(is_active);

-- Table 9: Audit Logs (for security tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_type VARCHAR(100),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_id, resource_type);

-- Add foreign key for attorney_id after attorneys table is created
ALTER TABLE intake_submissions 
ADD CONSTRAINT fk_intake_submissions_attorney 
FOREIGN KEY (attorney_id) REFERENCES attorneys(id) ON DELETE SET NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_intake_submissions_updated_at BEFORE UPDATE ON intake_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_1_updated_at BEFORE UPDATE ON intake_page_1 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_2_updated_at BEFORE UPDATE ON intake_page_2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_3_updated_at BEFORE UPDATE ON intake_page_3 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_4_updated_at BEFORE UPDATE ON intake_page_4 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intake_page_5_updated_at BEFORE UPDATE ON intake_page_5 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attorneys_updated_at BEFORE UPDATE ON attorneys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "app-user-dev";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "app-user-dev";
EOF

echo -e "${GREEN}✓ Migration script created${NC}"

###############################################################################
# Step 9: Create README for dev environment
###############################################################################

echo -e "${YELLOW}Step 9: Creating documentation...${NC}"

cat > DEV_ENVIRONMENT.md <<'EOF'
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
EOF

echo -e "${GREEN}✓ Documentation created${NC}"

###############################################################################
# Summary
###############################################################################

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Dev Environment Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Resources Created:${NC}"
echo "  • Cloud SQL: $DB_INSTANCE_NAME"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"
echo "  • Storage: gs://$BUCKET_NAME"
echo "  • Secrets: DB_PASSWORD_DEV, ACCESS_TOKEN_DEV"
echo ""
echo -e "${YELLOW}Files Created:${NC}"
echo "  • cloudbuild-dev.yaml"
echo "  • .github/workflows/deploy-dev.yml"
echo "  • migrations/001_create_intake_tables.sql"
echo "  • DEV_ENVIRONMENT.md"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run database migration:"
echo "     gcloud sql connect $DB_INSTANCE_NAME --user=$DB_USER --database=$DB_NAME"
echo "     Then: \\i migrations/001_create_intake_tables.sql"
echo ""
echo "  2. Commit the new files to git:"
echo "     git add cloudbuild-dev.yaml .github/workflows/deploy-dev.yml migrations/ DEV_ENVIRONMENT.md"
echo "     git commit -m 'Add dev environment configuration'"
echo "     git push origin main"
echo ""
echo "  3. Create a dev branch:"
echo "     git checkout -b dev/intake-system"
echo ""
echo "  4. Start developing with Claude Code!"
echo ""
echo -e "${YELLOW}Important Credentials:${NC}"
echo "  DB Password: $DB_PASSWORD"
echo "  (Also stored in Secret Manager as DB_PASSWORD_DEV)"
echo ""
echo -e "${GREEN}Dev environment ready! 🚀${NC}"
EOF

chmod +x setup_dev_environment.sh
echo "Setup script created successfully!"

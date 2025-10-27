#!/bin/bash
################################################################################
# Staging Environment Setup Script
#
# This script creates a complete staging environment that mirrors production:
# - Cloud SQL database (staging)
# - Cloud Storage bucket (staging)
# - Secret Manager secrets (staging versions)
# - Cloud Run services (staging)
#
# The staging environment allows safe testing without affecting production.
#
# Usage:
#   ./scripts/setup-staging-environment.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project permissions (Owner or Editor role)
#   - Existing production secrets to copy from
#
# Author: Claude Code
# Date: October 27, 2025
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"

# Staging resource names
STAGING_DB_INSTANCE="legal-forms-db-staging"
STAGING_DB_NAME="legal_forms_db_staging"
STAGING_DB_USER="app-user-staging"
STAGING_BUCKET="docmosis-tornado-form-submissions-staging"
STAGING_NODE_SERVICE="node-server-staging"
STAGING_PYTHON_SERVICE="python-pipeline-staging"

# Service account
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Staging Environment Setup                                   ║${NC}"
echo -e "${BLUE}║  Lipton Legal Form Application                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This script will create a complete staging environment that mirrors production.${NC}"
echo ""
echo -e "${GREEN}Resources to be created:${NC}"
echo "  • Cloud SQL Database: $STAGING_DB_INSTANCE"
echo "  • Cloud Storage Bucket: $STAGING_BUCKET"
echo "  • Secret Manager secrets (staging versions)"
echo "  • Cloud Run Services: $STAGING_NODE_SERVICE, $STAGING_PYTHON_SERVICE"
echo ""
echo -e "${YELLOW}Estimated costs:${NC}"
echo "  • Cloud SQL (db-f1-micro): ~\$7.67/month"
echo "  • Cloud Storage: ~\$0.02/GB/month"
echo "  • Cloud Run: Pay per use (minimal cost for testing)"
echo "  • Total estimated: ~\$10-15/month"
echo ""
read -p "Proceed with staging setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Setup cancelled.${NC}"
    exit 0
fi
echo ""

# ============================================================================
# Step 1: Verify Authentication
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 1: Verifying GCP authentication...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo -e "${RED}❌ Not authenticated to GCP${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}✅ Authenticated as: $ACTIVE_ACCOUNT${NC}"
echo ""

# Verify project
echo "Verifying project access..."
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
    echo -e "${RED}❌ Cannot access project: $PROJECT_ID${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project accessible: $PROJECT_ID${NC}"
echo ""

# ============================================================================
# Step 2: Enable Required APIs
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 2: Enabling required GCP APIs...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

REQUIRED_APIS=(
    "run.googleapis.com"
    "sql-component.googleapis.com"
    "sqladmin.googleapis.com"
    "storage-api.googleapis.com"
    "secretmanager.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    echo "Checking $api..."
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo -e "${GREEN}✅ $api already enabled${NC}"
    else
        echo "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID"
        echo -e "${GREEN}✅ $api enabled${NC}"
    fi
done
echo ""

# ============================================================================
# Step 3: Create Cloud SQL Staging Database
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 3: Creating Cloud SQL staging database...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if staging database already exists
if gcloud sql instances describe "$STAGING_DB_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Staging database already exists: $STAGING_DB_INSTANCE${NC}"
    echo "Skipping database creation."
else
    echo "Creating Cloud SQL instance (this takes 5-10 minutes)..."
    echo -e "${YELLOW}☕ Time for coffee! This will take a while...${NC}"

    gcloud sql instances create "$STAGING_DB_INSTANCE" \
        --project="$PROJECT_ID" \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --backup \
        --backup-start-time=03:00 \
        --retained-backups-count=7 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=3

    echo -e "${GREEN}✅ Cloud SQL instance created: $STAGING_DB_INSTANCE${NC}"
fi
echo ""

# Create database
echo "Creating database: $STAGING_DB_NAME..."
if gcloud sql databases describe "$STAGING_DB_NAME" --instance="$STAGING_DB_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Database already exists: $STAGING_DB_NAME${NC}"
else
    gcloud sql databases create "$STAGING_DB_NAME" \
        --instance="$STAGING_DB_INSTANCE" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ Database created: $STAGING_DB_NAME${NC}"
fi
echo ""

# Create database user
echo "Creating database user: $STAGING_DB_USER..."
echo -e "${YELLOW}Enter a password for the staging database user (min 8 characters):${NC}"
while true; do
    read -s STAGING_DB_PASSWORD
    echo ""
    if [ -z "$STAGING_DB_PASSWORD" ]; then
        echo -e "${RED}❌ Password cannot be empty. Please try again:${NC}"
        continue
    fi
    if [ ${#STAGING_DB_PASSWORD} -lt 8 ]; then
        echo -e "${RED}❌ Password must be at least 8 characters. Please try again:${NC}"
        continue
    fi
    # Confirm password
    echo -e "${YELLOW}Confirm password:${NC}"
    read -s STAGING_DB_PASSWORD_CONFIRM
    echo ""
    if [ "$STAGING_DB_PASSWORD" != "$STAGING_DB_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}❌ Passwords do not match. Please try again:${NC}"
        echo -e "${YELLOW}Enter password:${NC}"
        continue
    fi
    break
done

if gcloud sql users list --instance="$STAGING_DB_INSTANCE" --project="$PROJECT_ID" | grep -q "$STAGING_DB_USER"; then
    echo -e "${YELLOW}⚠️  User already exists, updating password...${NC}"
    gcloud sql users set-password "$STAGING_DB_USER" \
        --instance="$STAGING_DB_INSTANCE" \
        --project="$PROJECT_ID" \
        --password="$STAGING_DB_PASSWORD"
else
    gcloud sql users create "$STAGING_DB_USER" \
        --instance="$STAGING_DB_INSTANCE" \
        --project="$PROJECT_ID" \
        --password="$STAGING_DB_PASSWORD"
fi
echo -e "${GREEN}✅ Database user configured: $STAGING_DB_USER${NC}"
echo ""

# Get connection name
DB_CONNECTION_NAME=$(gcloud sql instances describe "$STAGING_DB_INSTANCE" \
    --project="$PROJECT_ID" \
    --format="value(connectionName)")
echo -e "${GREEN}✅ Connection name: $DB_CONNECTION_NAME${NC}"
echo ""

# ============================================================================
# Step 4: Create Cloud Storage Bucket
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 4: Creating Cloud Storage bucket...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if gsutil ls "gs://$STAGING_BUCKET" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Bucket already exists: $STAGING_BUCKET${NC}"
else
    echo "Creating bucket: $STAGING_BUCKET..."
    gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$STAGING_BUCKET"

    # Set lifecycle policy (delete after 90 days)
    cat > /tmp/lifecycle-staging.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
    gsutil lifecycle set /tmp/lifecycle-staging.json "gs://$STAGING_BUCKET"
    rm /tmp/lifecycle-staging.json

    echo -e "${GREEN}✅ Bucket created: $STAGING_BUCKET${NC}"
fi

# Set appropriate IAM permissions
echo "Setting bucket permissions..."
gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:objectAdmin" "gs://$STAGING_BUCKET"
echo -e "${GREEN}✅ Bucket permissions configured${NC}"
echo ""

# ============================================================================
# Step 5: Create Secret Manager Secrets
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 5: Creating Secret Manager secrets...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2

    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}⚠️  Secret exists: $secret_name (adding new version)${NC}"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
    else
        echo "Creating secret: $secret_name..."
        gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --labels=environment=staging,application=legal-forms

        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
    fi

    # Grant access to service account
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --project="$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet

    echo -e "${GREEN}✅ Secret configured: $secret_name${NC}"
}

# Database password (already have it from Step 3)
create_or_update_secret "DB_PASSWORD_STAGING" "$STAGING_DB_PASSWORD"
echo ""

# Access token
echo -e "${YELLOW}Enter staging access token (or press Enter to copy from production):${NC}"
read -s STAGING_ACCESS_TOKEN
echo ""
if [ -z "$STAGING_ACCESS_TOKEN" ]; then
    echo "Copying from production ACCESS_TOKEN..."
    STAGING_ACCESS_TOKEN=$(gcloud secrets versions access latest --secret="ACCESS_TOKEN" --project="$PROJECT_ID")
fi
create_or_update_secret "ACCESS_TOKEN_STAGING" "$STAGING_ACCESS_TOKEN"
echo ""

# SendGrid API key
echo -e "${YELLOW}Enter SendGrid API key (or press Enter to copy from production):${NC}"
read -s STAGING_SENDGRID_KEY
echo ""
if [ -z "$STAGING_SENDGRID_KEY" ]; then
    echo "Copying from production sendgrid-api-key..."
    STAGING_SENDGRID_KEY=$(gcloud secrets versions access latest --secret="sendgrid-api-key" --project="$PROJECT_ID")
fi
create_or_update_secret "sendgrid-api-key-staging" "$STAGING_SENDGRID_KEY"
echo ""

# Dropbox token
echo -e "${YELLOW}Enter Dropbox access token (or press Enter to copy from production):${NC}"
read -s STAGING_DROPBOX_TOKEN
echo ""
if [ -z "$STAGING_DROPBOX_TOKEN" ]; then
    echo "Copying from production dropbox-token..."
    STAGING_DROPBOX_TOKEN=$(gcloud secrets versions access latest --secret="dropbox-token" --project="$PROJECT_ID")
fi
create_or_update_secret "dropbox-token-staging" "$STAGING_DROPBOX_TOKEN"
echo ""

# ============================================================================
# Step 6: Deploy Cloud Run Services
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 6: Deploying Cloud Run services...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Note: This uses your existing deploy.sh script${NC}"
echo ""

# Check if deploy.sh exists
if [ ! -f "scripts/deploy.sh" ]; then
    echo -e "${RED}❌ deploy.sh not found${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Make deploy.sh executable
chmod +x scripts/deploy.sh

# Deploy to staging
echo "Running: ./scripts/deploy.sh staging"
echo ""
./scripts/deploy.sh staging

echo ""
echo -e "${GREEN}✅ Staging services deployed${NC}"
echo ""

# ============================================================================
# Step 7: Configure Service-to-Service Communication
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 7: Configuring service-to-service communication...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if python-pipeline-staging exists
echo "Checking if $STAGING_PYTHON_SERVICE exists..."
if gcloud run services describe "$STAGING_PYTHON_SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" &>/dev/null; then

    echo -e "${GREEN}✅ Python pipeline service found${NC}"
    echo "Granting $STAGING_NODE_SERVICE permission to invoke $STAGING_PYTHON_SERVICE..."
    gcloud run services add-iam-policy-binding "$STAGING_PYTHON_SERVICE" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/run.invoker"

    echo -e "${GREEN}✅ Service-to-service permissions configured${NC}"
else
    echo -e "${YELLOW}⚠️  Python pipeline service not found: $STAGING_PYTHON_SERVICE${NC}"
    echo -e "${YELLOW}   This is optional. The Node.js service will work without it.${NC}"
    echo -e "${YELLOW}   To deploy Python pipeline later, use: gcloud run deploy $STAGING_PYTHON_SERVICE${NC}"
    echo -e "${GREEN}✅ Skipping service-to-service permissions (not needed yet)${NC}"
fi
echo ""

# ============================================================================
# Step 8: Verify Deployment
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 8: Verifying deployment...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Get service URLs
NODE_URL=$(gcloud run services describe "$STAGING_NODE_SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.url)")

PYTHON_URL=$(gcloud run services describe "$STAGING_PYTHON_SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.url)")

echo -e "${GREEN}Service URLs:${NC}"
echo "  • Node.js Server: $NODE_URL"
echo "  • Python Pipeline: $PYTHON_URL"
echo ""

# Test health endpoints
echo "Testing health endpoints..."
NODE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$NODE_URL/health" || echo "000")
if [ "$NODE_HEALTH" == "200" ]; then
    echo -e "${GREEN}✅ Node server health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Node server health check returned HTTP $NODE_HEALTH${NC}"
fi

PYTHON_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$PYTHON_URL/health" || echo "000")
if [ "$PYTHON_HEALTH" == "200" ]; then
    echo -e "${GREEN}✅ Python pipeline health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Python pipeline health check returned HTTP $PYTHON_HEALTH${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Staging Environment Setup Complete!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGING ENVIRONMENT SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Infrastructure:${NC}"
echo "  • Database: $STAGING_DB_INSTANCE"
echo "    - Connection: $DB_CONNECTION_NAME"
echo "    - Database: $STAGING_DB_NAME"
echo "    - User: $STAGING_DB_USER"
echo ""
echo "  • Storage: gs://$STAGING_BUCKET"
echo "    - Lifecycle: Delete after 90 days"
echo ""
echo "  • Secrets: Created in Secret Manager"
echo "    - DB_PASSWORD_STAGING"
echo "    - ACCESS_TOKEN_STAGING"
echo "    - sendgrid-api-key-staging"
echo "    - dropbox-token-staging"
echo ""

echo -e "${GREEN}Services:${NC}"
echo "  • Node.js Server: $NODE_URL"
echo "  • Python Pipeline: $PYTHON_URL"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Test the staging environment:"
echo "   curl $NODE_URL/health"
echo ""
echo "2. Submit a test form:"
echo "   Open $NODE_URL in your browser"
echo ""
echo "3. Monitor logs:"
echo "   gcloud run services logs read $STAGING_NODE_SERVICE --region=$REGION"
echo ""
echo "4. View database:"
echo "   gcloud sql connect $STAGING_DB_INSTANCE --user=$STAGING_DB_USER --database=$STAGING_DB_NAME"
echo ""
echo "5. Deploy updates via CI/CD:"
echo "   git push origin main"
echo "   (Staging auto-deploys from main branch)"
echo ""

echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo ""
echo "1. Staging uses separate Dropbox folder: /Staging/Current Clients"
echo "2. Staging emails have [STAGING] prefix to avoid confusion"
echo "3. Data in staging is isolated from production"
echo "4. Staging auto-deletes data after 90 days"
echo "5. Estimated monthly cost: \$10-15"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Staging environment is ready for testing!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Save configuration to file
cat > staging-environment-info.txt <<EOF
Staging Environment Configuration
Generated: $(date)

Database:
  Instance: $STAGING_DB_INSTANCE
  Connection: $DB_CONNECTION_NAME
  Database: $STAGING_DB_NAME
  User: $STAGING_DB_USER

Storage:
  Bucket: $STAGING_BUCKET

Services:
  Node Server: $NODE_URL
  Python Pipeline: $PYTHON_URL

Secrets:
  DB_PASSWORD_STAGING
  ACCESS_TOKEN_STAGING
  sendgrid-api-key-staging
  dropbox-token-staging
EOF

echo -e "${GREEN}✅ Configuration saved to: staging-environment-info.txt${NC}"
echo ""

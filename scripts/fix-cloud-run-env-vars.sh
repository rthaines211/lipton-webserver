#!/bin/bash
################################################################################
# Fix Cloud Run Environment Variables
#
# This script updates the node-server Cloud Run service with ALL required
# environment variables and secrets that were missing from the deployment.
#
# Author: Claude Code
# Date: October 27, 2025
################################################################################

set -e  # Exit on error

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Cloud Run Environment Variables Fix                         ║${NC}"
echo -e "${BLUE}║  Service: node-server                                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify we're authenticated
echo -e "${YELLOW}Step 1: Verifying GCP authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo -e "${RED}❌ Not authenticated to GCP${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}✅ Authenticated as: $ACTIVE_ACCOUNT${NC}"
echo ""

# Step 2: Check if secrets exist
echo -e "${YELLOW}Step 2: Verifying required secrets exist...${NC}"
REQUIRED_SECRETS=(
    "DB_PASSWORD"
    "ACCESS_TOKEN"
    "sendgrid-api-key"
    "dropbox-token"
    "db-user"
)

ALL_SECRETS_EXIST=true
for secret in "${REQUIRED_SECRETS[@]}"; do
    if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${GREEN}  ✅ $secret${NC}"
    else
        echo -e "${RED}  ❌ $secret (missing)${NC}"
        echo -e "${YELLOW}     Create with: gcloud secrets create $secret --project=$PROJECT_ID${NC}"
        ALL_SECRETS_EXIST=false
    fi
done

if [ "$ALL_SECRETS_EXIST" = false ]; then
    echo ""
    echo -e "${RED}❌ Some secrets are missing. Please create them first.${NC}"
    exit 1
fi
echo ""

# Step 3: Get Cloud SQL connection name
echo -e "${YELLOW}Step 3: Looking up Cloud SQL connection...${NC}"
SQL_INSTANCES=$(gcloud sql instances list --project="$PROJECT_ID" --format="value(connectionName)" 2>/dev/null || echo "")
if [ -z "$SQL_INSTANCES" ]; then
    echo -e "${YELLOW}⚠️  No Cloud SQL instances found${NC}"
    echo -e "${YELLOW}   Using localhost for DB_HOST (you may need to update this)${NC}"
    DB_HOST="localhost"
else
    # Take the first instance and format as Unix socket path
    INSTANCE_CONNECTION=$(echo "$SQL_INSTANCES" | head -n 1)
    DB_HOST="/cloudsql/$INSTANCE_CONNECTION"
    echo -e "${GREEN}✅ Found Cloud SQL instance: $INSTANCE_CONNECTION${NC}"
    echo -e "${GREEN}   DB_HOST will be: $DB_HOST${NC}"
fi
echo ""

# Step 4: Get DB_USER from secret
echo -e "${YELLOW}Step 4: Retrieving DB_USER from secret...${NC}"
DB_USER=$(gcloud secrets versions access latest --secret="db-user" --project="$PROJECT_ID" 2>/dev/null || echo "app-user")
echo -e "${GREEN}✅ DB_USER: $DB_USER${NC}"
echo ""

# Step 5: Show current configuration
echo -e "${YELLOW}Step 5: Checking current Cloud Run configuration...${NC}"
CURRENT_ENV_COUNT=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null | grep -c "name:" || echo "0")
echo -e "${YELLOW}Current environment variables: $CURRENT_ENV_COUNT${NC}"
echo ""

# Step 6: Confirm deployment
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Ready to update Cloud Run service with:${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Core Configuration:${NC}"
echo "  • NODE_ENV = production"
echo ""
echo -e "${GREEN}Database (PostgreSQL):${NC}"
echo "  • DB_USER = $DB_USER (from secret)"
echo "  • DB_HOST = $DB_HOST"
echo "  • DB_NAME = legal_forms_db"
echo "  • DB_PORT = 5432"
echo "  • DB_PASSWORD = [SECRET]"
echo ""
echo -e "${GREEN}Pipeline API:${NC}"
echo "  • PIPELINE_API_URL = https://python-pipeline-zyiwmzwenq-uc.a.run.app"
echo "  • PIPELINE_API_ENABLED = true"
echo "  • PIPELINE_API_TIMEOUT = 300000 (5 minutes)"
echo "  • EXECUTE_PIPELINE_ON_SUBMIT = true"
echo "  • CONTINUE_ON_PIPELINE_FAILURE = true"
echo ""
echo -e "${GREEN}Dropbox:${NC}"
echo "  • DROPBOX_ENABLED = true"
echo "  • DROPBOX_ACCESS_TOKEN = [SECRET]"
echo "  • DROPBOX_BASE_PATH = /Current Clients"
echo "  • LOCAL_OUTPUT_PATH = output"
echo "  • CONTINUE_ON_DROPBOX_FAILURE = true"
echo ""
echo -e "${GREEN}Email (SendGrid):${NC}"
echo "  • EMAIL_PROVIDER = sendgrid"
echo "  • EMAIL_FROM_ADDRESS = notifications@liptonlegal.com"
echo "  • EMAIL_FROM_NAME = Lipton Legal"
echo "  • EMAIL_ENABLED = true"
echo "  • EMAIL_MAX_RETRIES = 3"
echo "  • EMAIL_RETRY_DELAY_MS = 1000"
echo "  • SENDGRID_API_KEY = [SECRET]"
echo ""
echo -e "${GREEN}GCP Resources:${NC}"
echo "  • GCLOUD_PROJECT = $PROJECT_ID"
echo "  • GCS_BUCKET_NAME = $PROJECT_ID-form-submissions"
echo ""
echo -e "${GREEN}Authentication:${NC}"
echo "  • ACCESS_TOKEN = [SECRET]"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi
echo ""

# Step 7: Update Cloud Run service
echo -e "${YELLOW}Step 7: Updating Cloud Run service...${NC}"
echo -e "${BLUE}This will create a new revision with complete configuration...${NC}"
echo ""

gcloud run services update "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --update-secrets="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,DROPBOX_ACCESS_TOKEN=dropbox-token:latest" \
    --set-env-vars="NODE_ENV=production,DB_USER=$DB_USER,DB_HOST=$DB_HOST,DB_NAME=legal_forms_db,DB_PORT=5432,GCLOUD_PROJECT=$PROJECT_ID,GCS_BUCKET_NAME=$PROJECT_ID-form-submissions,PIPELINE_API_URL=https://python-pipeline-zyiwmzwenq-uc.a.run.app,PIPELINE_API_ENABLED=true,PIPELINE_API_TIMEOUT=300000,EXECUTE_PIPELINE_ON_SUBMIT=true,CONTINUE_ON_PIPELINE_FAILURE=true,DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Current Clients,LOCAL_OUTPUT_PATH=output,CONTINUE_ON_DROPBOX_FAILURE=true,EMAIL_PROVIDER=sendgrid,EMAIL_FROM_ADDRESS=notifications@liptonlegal.com,EMAIL_FROM_NAME=Lipton Legal,EMAIL_ENABLED=true,EMAIL_MAX_RETRIES=3,EMAIL_RETRY_DELAY_MS=1000" \
    --service-account="$SERVICE_ACCOUNT" \
    --quiet

echo ""
echo -e "${GREEN}✅ Cloud Run service updated successfully!${NC}"
echo ""

# Step 8: Get the new revision
echo -e "${YELLOW}Step 8: Verifying new revision...${NC}"
NEW_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.latestReadyRevisionName)")
echo -e "${GREEN}✅ New revision: $NEW_REVISION${NC}"

NEW_ENV_COUNT=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null | grep -c "name:" || echo "0")
echo -e "${GREEN}✅ Environment variables now: $NEW_ENV_COUNT${NC}"
echo ""

# Step 9: Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.url)")
echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo ""

# Step 10: Display next steps
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Deployment Complete!                                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps - Verification:${NC}"
echo ""
echo "1. Check service health:"
echo "   curl $SERVICE_URL/health"
echo ""
echo "2. View all environment variables:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format=\"yaml(spec.template.spec.containers[0].env)\""
echo ""
echo "3. Monitor logs for startup:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo "4. Test authentication (should require token):"
echo "   curl -I $SERVICE_URL"
echo ""
echo "5. Test database connection:"
echo "   # Submit a test form and verify it saves to database"
echo ""
echo "6. Test email notification:"
echo "   # Submit a form with email address and verify email is sent"
echo ""

# Important notes
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo ""
echo "1. ${YELLOW}Authentication Now Enabled:${NC}"
echo "   NODE_ENV=production means authentication is now REQUIRED"
echo "   Use ?token=YOUR_TOKEN or Authorization: Bearer YOUR_TOKEN"
echo ""
echo "2. ${YELLOW}Cloud SQL Connection:${NC}"
if [ "$DB_HOST" = "localhost" ]; then
    echo "   ⚠️  DB_HOST is set to 'localhost' because no Cloud SQL instance was found"
    echo "   You need to either:"
    echo "   a) Create a Cloud SQL instance, or"
    echo "   b) Manually set DB_HOST to your database connection string"
else
    echo "   ✅ DB_HOST configured for Cloud SQL Unix socket"
    echo "   Make sure Cloud SQL connection is configured:"
    echo "   gcloud run services update $SERVICE_NAME --add-cloudsql-instances=$INSTANCE_CONNECTION --region=$REGION"
fi
echo ""
echo "3. ${YELLOW}GCS Bucket:${NC}"
echo "   Verify bucket exists or create it:"
echo "   gsutil ls gs://$PROJECT_ID-form-submissions || gsutil mb -p $PROJECT_ID -l $REGION gs://$PROJECT_ID-form-submissions"
echo ""
echo "4. ${YELLOW}Dropbox OAuth Migration (Optional):${NC}"
echo "   Node.js service still uses DROPBOX_ACCESS_TOKEN (short-lived)"
echo "   Consider migrating to OAuth refresh token like Python service"
echo "   This will prevent token expiration issues"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Configuration Complete!                                     ║${NC}"
echo -e "${GREEN}║  Your Cloud Run service now has all required variables       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

#!/bin/bash
################################################################################
# Deploy Python Pipeline to Staging
#
# This script deploys the Python normalization pipeline service to Cloud Run
# staging environment.
#
# Usage:
#   ./scripts/deploy-python-pipeline-staging.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Staging Dropbox secrets created
#   - Python pipeline code in "normalization work" directory
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
SERVICE_NAME="python-pipeline-staging"
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"
SOURCE_DIR="normalization work"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Python Pipeline - Deploy to Staging                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Service:${NC} $SERVICE_NAME"
echo -e "${GREEN}Region:${NC} $REGION"
echo -e "${GREEN}Source:${NC} $SOURCE_DIR"
echo ""

# Step 1: Verify authentication
echo -e "${YELLOW}Step 1: Verifying GCP authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo -e "${RED}❌ Not authenticated to GCP${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo -e "${GREEN}✅ Authenticated as: $ACTIVE_ACCOUNT${NC}"
echo ""

# Step 2: Verify source directory exists
echo -e "${YELLOW}Step 2: Checking source directory...${NC}"
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $SOURCE_DIR${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

if [ ! -f "$SOURCE_DIR/Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found in: $SOURCE_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Source directory found: $SOURCE_DIR${NC}"
echo -e "${GREEN}✅ Dockerfile found${NC}"
echo ""

# Step 3: Verify staging secrets exist
echo -e "${YELLOW}Step 3: Verifying staging secrets...${NC}"
REQUIRED_SECRETS=(
    "dropbox-token-staging"
    "dropbox-app-key"
    "dropbox-app-secret"
    "dropbox-refresh-token"
)

ALL_SECRETS_EXIST=true
for secret in "${REQUIRED_SECRETS[@]}"; do
    if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${GREEN}  ✅ $secret${NC}"
    else
        echo -e "${RED}  ❌ $secret (missing)${NC}"
        ALL_SECRETS_EXIST=false
    fi
done

if [ "$ALL_SECRETS_EXIST" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some secrets are missing.${NC}"
    echo -e "${YELLOW}For staging, we can use production secrets for Dropbox app credentials.${NC}"
    echo ""
    read -p "Use production Dropbox credentials for staging? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled. Please create missing secrets first.${NC}"
        exit 1
    fi
fi
echo ""

# Step 4: Confirm deployment
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Ready to deploy Python Pipeline to Staging${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  • Service: $SERVICE_NAME"
echo "  • Region: $REGION"
echo "  • Source: $SOURCE_DIR"
echo "  • Resources: 2Gi memory, 1 CPU"
echo "  • Dropbox folder: /Staging/Current Clients"
echo ""
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi
echo ""

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}Step 5: Deploying to Cloud Run...${NC}"
echo -e "${BLUE}This will build the container and deploy (takes 2-5 minutes)${NC}"
echo ""

gcloud run deploy "$SERVICE_NAME" \
    --source="$SOURCE_DIR" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --platform=managed \
    --service-account="$SERVICE_ACCOUNT" \
    --memory=2Gi \
    --cpu=1 \
    --timeout=600 \
    --max-instances=3 \
    --min-instances=0 \
    --update-secrets="DROPBOX_ACCESS_TOKEN=dropbox-token-staging:latest,DROPBOX_APP_KEY=dropbox-app-key:latest,DROPBOX_APP_SECRET=dropbox-app-secret:latest,DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
    --set-env-vars="DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Staging/Current Clients,DROPBOX_LOCAL_OUTPUT_PATH=output,ENVIRONMENT=staging"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Step 6: Get service URL
echo -e "${YELLOW}Step 6: Retrieving service information...${NC}"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.url)")

NEW_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format="value(status.latestReadyRevisionName)")

echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo -e "${GREEN}✅ Revision: $NEW_REVISION${NC}"
echo ""

# Step 7: Grant node-server-staging permission to invoke
echo -e "${YELLOW}Step 7: Configuring service-to-service permissions...${NC}"
gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/run.invoker"

echo -e "${GREEN}✅ Permissions configured${NC}"
echo ""

# Step 8: Test health endpoint
echo -e "${YELLOW}Step 8: Testing health endpoint...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned HTTP $HTTP_STATUS${NC}"
    echo -e "${YELLOW}   Service may still be starting up. Check logs:${NC}"
    echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION"
fi
echo ""

# Display next steps
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Python Pipeline Deployment Complete!                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Service Information:${NC}"
echo "  • Service Name: $SERVICE_NAME"
echo "  • Service URL: $SERVICE_URL"
echo "  • Revision: $NEW_REVISION"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Update config/staging.env with the new pipeline URL:"
echo "   PIPELINE_API_URL=$SERVICE_URL"
echo "   PIPELINE_API_ENABLED=true"
echo "   EXECUTE_PIPELINE_ON_SUBMIT=true"
echo ""
echo "2. Redeploy Node.js service to pick up the new config:"
echo "   ./scripts/deploy.sh staging"
echo ""
echo "3. Test the pipeline integration:"
echo "   curl -X POST $SERVICE_URL/process -H \"Content-Type: application/json\" -d '{...}'"
echo ""
echo "4. View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Python Pipeline is ready!                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

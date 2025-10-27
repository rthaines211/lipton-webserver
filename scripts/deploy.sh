#!/bin/bash
################################################################################
# Manual Deployment Script
#
# Deploys the application to Cloud Run using configuration from config/ directory.
# This script mirrors what GitHub Actions does but can be run manually.
#
# Usage:
#   ./scripts/deploy.sh production
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh development
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
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

# Function to display usage
usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./scripts/deploy.sh <environment>"
    echo ""
    echo -e "${BLUE}Environments:${NC}"
    echo "  production  - Deploy to production (https://node-server-zyiwmzwenq-uc.a.run.app)"
    echo "  staging     - Deploy to staging (https://node-server-staging-zyiwmzwenq-uc.a.run.app)"
    echo "  development - Deploy to development (https://node-server-dev-zyiwmzwenq-uc.a.run.app)"
    echo ""
    echo -e "${BLUE}Example:${NC}"
    echo "  ./scripts/deploy.sh production"
    exit 1
}

# Check arguments
if [ $# -ne 1 ]; then
    echo -e "${RED}Error: Environment argument required${NC}"
    echo ""
    usage
fi

ENVIRONMENT=$1

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo ""
    usage
fi

# Set environment-specific values
case $ENVIRONMENT in
    production)
        SERVICE_NAME="node-server"
        CONFIG_FILE="config/production.env"
        IMAGE_TAG="production-$(git rev-parse --short HEAD)"
        SECRETS="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,DROPBOX_ACCESS_TOKEN=dropbox-token:latest,DOCMOSIS_ACCESS_KEY=docmosis-key:latest"
        SQL_INSTANCE="legal-forms-db"
        ;;
    staging)
        SERVICE_NAME="node-server-staging"
        CONFIG_FILE="config/staging.env"
        IMAGE_TAG="staging-$(git rev-parse --short HEAD)"
        SECRETS="DB_PASSWORD=DB_PASSWORD_STAGING:latest,ACCESS_TOKEN=ACCESS_TOKEN_STAGING:latest,SENDGRID_API_KEY=sendgrid-api-key-staging:latest,DROPBOX_ACCESS_TOKEN=dropbox-token-staging:latest,DOCMOSIS_ACCESS_KEY=docmosis-key:latest"
        SQL_INSTANCE="legal-forms-db-staging"
        ;;
    development)
        SERVICE_NAME="node-server-dev"
        CONFIG_FILE="config/development.env"
        IMAGE_TAG="development-$(git rev-parse --short HEAD)"
        SECRETS="DB_PASSWORD=DB_PASSWORD_STAGING:latest,ACCESS_TOKEN=ACCESS_TOKEN_STAGING:latest,SENDGRID_API_KEY=sendgrid-api-key-staging:latest,DROPBOX_ACCESS_TOKEN=dropbox-token-staging:latest,DOCMOSIS_ACCESS_KEY=docmosis-key:latest"
        SQL_INSTANCE="legal-forms-db-staging"
        ;;
esac

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Cloud Run Deployment Script                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
echo -e "${GREEN}Service:${NC} $SERVICE_NAME"
echo -e "${GREEN}Config:${NC} $CONFIG_FILE"
echo -e "${GREEN}Image Tag:${NC} $IMAGE_TAG"
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

# Step 2: Check configuration file exists
echo -e "${YELLOW}Step 2: Checking configuration file...${NC}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration file found${NC}"

# Count variables
VAR_COUNT=$(cat "$CONFIG_FILE" | grep -v '^#' | grep -v '^$' | wc -l | tr -d ' ')
echo -e "${GREEN}✅ Found $VAR_COUNT environment variables${NC}"
echo ""

# Step 3: Load configuration
echo -e "${YELLOW}Step 3: Loading environment variables...${NC}"
# Filter out PORT (Cloud Run sets this automatically) and any other reserved vars
ENV_VARS=$(cat "$CONFIG_FILE" | grep -v '^#' | grep -v '^$' | grep -v '^PORT=' | tr '\n' ',' | sed 's/,$//')
echo -e "${GREEN}✅ Configuration loaded (PORT excluded - Cloud Run sets this automatically)${NC}"
echo ""

# Step 4: Confirm deployment
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Ready to deploy:${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  • Environment: $ENVIRONMENT"
echo "  • Service: $SERVICE_NAME"
echo "  • Region: $REGION"
echo "  • Variables: $VAR_COUNT"
echo ""
if [ "$ENVIRONMENT" == "production" ]; then
    echo -e "${RED}⚠️  WARNING: You are deploying to PRODUCTION!${NC}"
    echo ""
fi
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi
echo ""

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}Step 5: Deploying to Cloud Run...${NC}"
echo ""

gcloud run deploy "$SERVICE_NAME" \
    --source=. \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --platform=managed \
    --allow-unauthenticated \
    --update-secrets="$SECRETS" \
    --set-env-vars="$ENV_VARS" \
    --add-cloudsql-instances="$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --service-account="$SERVICE_ACCOUNT" \
    --memory=1Gi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0

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

# Step 7: Run basic health check
echo -e "${YELLOW}Step 7: Running health check...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_STATUS${NC}"
fi
echo ""

# Step 8: Display next steps
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Complete!                                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Test the service:"
echo "   curl $SERVICE_URL/health"
echo ""
echo "2. View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo "3. Check environment variables:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format=\"yaml(spec.template.spec.containers[0].env)\""
echo ""
echo "4. Test with authentication (production only):"
if [ "$ENVIRONMENT" == "production" ]; then
    echo "   curl -H \"Authorization: Bearer \$ACCESS_TOKEN\" $SERVICE_URL"
else
    echo "   (Authentication disabled in $ENVIRONMENT)"
fi
echo ""
echo "5. Submit a test form:"
echo "   Open $SERVICE_URL in your browser"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Deployment Successful!                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

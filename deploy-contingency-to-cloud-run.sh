#!/bin/bash
# ============================================================================
# Cloud Run Deployment Script - Contingency Agreement Form
# ============================================================================
# Deploys the contingency agreement form as a separate Cloud Run service
# to be accessed at agreement.liptonlegal.com
#
# Prerequisites:
#   - Secrets must exist in Secret Manager:
#     * DB_PASSWORD (database password)
#     * ACCESS_TOKEN (API authentication token)
#   - Cloud SQL instance must be running
#   - Docker/Cloud Build configured in project
#
# Usage: ./deploy-contingency-to-cloud-run.sh
# ============================================================================

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="docmosis-tornado"
PROJECT_NUMBER="945419684329"
SERVICE_NAME="contingency-agreement-form"
REGION="us-central1"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUD_SQL_INSTANCE="docmosis-tornado:us-central1:legal-forms-db"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  Cloud Run Deployment - Contingency Agreement Form${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Project ID:      ${PROJECT_ID}"
echo -e "  Service Name:    ${SERVICE_NAME}"
echo -e "  Region:          ${REGION}"
echo -e "  Domain:          agreement.liptonlegal.com"
echo -e "  Service Account: ${SERVICE_ACCOUNT}"
echo ""

# ============================================================================
# STEP 1: Grant Secret Manager Permissions
# ============================================================================
echo -e "${BLUE}[1/4] Granting Secret Manager permissions...${NC}"

echo -e "${YELLOW}  → Granting access to DB_PASSWORD...${NC}"
gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" \
  --quiet 2>/dev/null || true

echo -e "${YELLOW}  → Granting access to ACCESS_TOKEN...${NC}"
gcloud secrets add-iam-policy-binding ACCESS_TOKEN \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" \
  --quiet 2>/dev/null || true

echo -e "${GREEN}  ✓ Secret Manager permissions granted${NC}"
echo ""

# ============================================================================
# STEP 2: Deploy to Cloud Run
# ============================================================================
echo -e "${BLUE}[2/4] Deploying to Cloud Run...${NC}"
echo -e "${YELLOW}  This will build from source and may take 2-3 minutes...${NC}"
echo ""

gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --service-account ${SERVICE_ACCOUNT} \
  --add-cloudsql-instances ${CLOUD_SQL_INSTANCE} \
  --set-env-vars "NODE_ENV=production,PORT=8080,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=lipton_legal_forms,DB_USER=admin" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --quiet

echo ""
echo -e "${GREEN}  ✓ Deployed to Cloud Run${NC}"
echo ""

# ============================================================================
# STEP 3: Get Service URL
# ============================================================================
echo -e "${BLUE}[3/4] Getting service URL...${NC}"

SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo -e "${GREEN}  ✓ Service URL: ${SERVICE_URL}${NC}"
echo ""

# ============================================================================
# STEP 4: Map Custom Domain
# ============================================================================
echo -e "${BLUE}[4/4] Mapping custom domain...${NC}"
echo ""
echo -e "${YELLOW}To map agreement.liptonlegal.com to this service:${NC}"
echo ""
echo -e "1. Run this command:"
echo -e "${GREEN}   gcloud run domain-mappings create --service ${SERVICE_NAME} --domain agreement.liptonlegal.com --region ${REGION} --project ${PROJECT_ID}${NC}"
echo ""
echo -e "2. Add the DNS records shown by the command above to your DNS provider"
echo ""
echo -e "3. Verify the mapping:"
echo -e "${GREEN}   gcloud run domain-mappings describe --domain agreement.liptonlegal.com --region ${REGION} --project ${PROJECT_ID}${NC}"
echo ""

# ============================================================================
# STEP 5: Verification
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. Test the service directly:"
echo -e "   ${GREEN}curl ${SERVICE_URL}/health${NC}"
echo ""
echo -e "2. Map the custom domain (see instructions above)"
echo ""
echo -e "3. After DNS propagates, test at:"
echo -e "   ${GREEN}https://agreement.liptonlegal.com/forms/agreement/${NC}"
echo ""
echo -e "4. Password: ${GREEN}lipton-agreement-2025${NC}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "   gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit 50 --project ${PROJECT_ID}"
echo ""

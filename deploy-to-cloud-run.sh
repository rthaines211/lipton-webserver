#!/bin/bash
# ============================================================================
# Cloud Run Deployment Script - Legal Form Application
# ============================================================================
# This script handles complete deployment of the Node.js service to Cloud Run
# including IAM permissions, secret access, and verification
#
# Prerequisites:
#   - Secrets must exist in Secret Manager with versions:
#     * DB_PASSWORD (database password)
#     * ACCESS_TOKEN (API authentication token)
#   - Cloud SQL instances must be running
#   - Docker/Cloud Build must be configured in project
#
# Usage: ./deploy-to-cloud-run.sh
#
# What this script does:
#   1. Grants Secret Manager IAM permissions to service account
#   2. Deploys application to Cloud Run (builds from source)
#   3. Verifies deployment health and connectivity
#
# Author: Claude Code
# Last Updated: 2025-10-23 02:50 UTC
# Recent Changes:
#   - Fixed Cloud SQL instance reference (now using only legal-forms-db)
#   - Secret permissions already granted for DB_PASSWORD and ACCESS_TOKEN
# ============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
PROJECT_NUMBER="945419684329"
SERVICE_NAME="node-server"
REGION="us-central1"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  Cloud Run Deployment - Legal Form Application${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Project ID:      ${PROJECT_ID}"
echo -e "  Service Name:    ${SERVICE_NAME}"
echo -e "  Region:          ${REGION}"
echo -e "  Service Account: ${SERVICE_ACCOUNT}"
echo ""

# ============================================================================
# STEP 1: Grant Secret Manager Permissions
# ============================================================================
echo -e "${BLUE}[1/3] Granting Secret Manager permissions...${NC}"

# Grant access to DB_PASSWORD secret
echo -e "${YELLOW}  → Granting access to DB_PASSWORD...${NC}"
gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" \
  --quiet

# Grant access to ACCESS_TOKEN secret
echo -e "${YELLOW}  → Granting access to ACCESS_TOKEN...${NC}"
gcloud secrets add-iam-policy-binding ACCESS_TOKEN \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" \
  --quiet

# Note: GCS_BUCKET_NAME is set via environment variable, not secret
# No secret binding needed for bucket name

echo -e "${GREEN}  ✓ Secret Manager permissions granted${NC}"
echo ""

# ============================================================================
# STEP 2: Deploy to Cloud Run
# ============================================================================
echo -e "${BLUE}[2/3] Deploying to Cloud Run...${NC}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=1 \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,GCS_BUCKET_NAME=docmosis-tornado-form-submissions" \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest" \
  --set-cloudsql-instances="docmosis-tornado:us-central1:legal-forms-db" \
  --service-account="${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}"

echo -e "${GREEN}  ✓ Deployment complete${NC}"
echo ""

# ============================================================================
# STEP 3: Verify Deployment
# ============================================================================
echo -e "${BLUE}[3/3] Verifying deployment...${NC}"

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo -e "${YELLOW}  Service URL: ${SERVICE_URL}${NC}"
echo ""

# Wait a moment for service to stabilize
echo -e "${YELLOW}  → Waiting 10 seconds for service to stabilize...${NC}"
sleep 10

# Test health endpoint
echo -e "${YELLOW}  → Testing /health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${SERVICE_URL}/health" || true)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ Health check passed (HTTP ${HEALTH_CODE})${NC}"
    echo -e "${GREEN}    Response: ${HEALTH_BODY}${NC}"
else
    echo -e "${RED}  ✗ Health check failed (HTTP ${HEALTH_CODE})${NC}"
    echo -e "${RED}    Response: ${HEALTH_BODY}${NC}"
fi
echo ""

# Test database health
echo -e "${YELLOW}  → Testing /api/health/db endpoint...${NC}"
DB_HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${SERVICE_URL}/api/health/db" || true)
DB_HEALTH_BODY=$(echo "$DB_HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')
DB_HEALTH_CODE=$(echo "$DB_HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$DB_HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ Database health check passed (HTTP ${DB_HEALTH_CODE})${NC}"
    echo -e "${GREEN}    Response: ${DB_HEALTH_BODY}${NC}"
else
    echo -e "${RED}  ✗ Database health check failed (HTTP ${DB_HEALTH_CODE})${NC}"
    echo -e "${RED}    Response: ${DB_HEALTH_BODY}${NC}"
fi
echo ""

# Check recent logs
echo -e "${YELLOW}  → Checking recent logs for errors...${NC}"
ERROR_COUNT=$(gcloud run services logs read "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --limit=50 \
  --format="value(textPayload)" 2>/dev/null | grep -i "error" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}  ✓ No errors found in recent logs${NC}"
else
    echo -e "${YELLOW}  ⚠ Found ${ERROR_COUNT} error entries in recent logs${NC}"
    echo -e "${YELLOW}    Run this to view: gcloud run services logs read ${SERVICE_NAME} --region=${REGION}${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}  Deployment Summary${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}  Service URL:     ${SERVICE_URL}${NC}"
echo -e "${GREEN}  Health Endpoint: ${SERVICE_URL}/health${NC}"
echo -e "${GREEN}  DB Health:       ${SERVICE_URL}/api/health/db${NC}"
echo -e "${GREEN}  API Docs:        ${SERVICE_URL}/api${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test the application at: ${SERVICE_URL}"
echo -e "  2. Verify database connectivity"
echo -e "  3. Test form submissions"
echo -e "  4. Monitor logs: gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --follow"
echo ""

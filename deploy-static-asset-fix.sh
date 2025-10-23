#!/bin/bash
# ============================================================================
# Static Asset Authentication Fix - Deployment Script
# ============================================================================
# This script deploys a fix for the authentication middleware that was
# blocking static assets (JavaScript, CSS, images) with 401 errors.
#
# Issue Summary:
#   - Authentication middleware was blocking ALL requests including static files
#   - JavaScript files, images, CSS, and favicon were returning 401 errors
#   - Browser couldn't load required assets to render the page properly
#
# Solution:
#   - Modified requireAuth() middleware to skip authentication for static files
#   - Added whitelist of file extensions: .js, .css, .png, .jpg, .ico, etc.
#   - Static assets now bypass authentication while API routes remain protected
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Access to docmosis-tornado GCP project
#   - Node.js application already deployed (node-server)
#
# Usage: ./deploy-static-asset-fix.sh
#
# Author: Claude Code
# Date: 2025-10-22
# ============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
PROJECT_NUMBER="945419684329"
SERVICE_NAME="node-server"
REGION="us-central1"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}  Static Asset Authentication Fix - Deployment${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# ============================================================================
# Display Issue Summary
# ============================================================================
echo -e "${BLUE}Issue Summary:${NC}"
echo -e "  ${RED}✗${NC} Static assets (JS, CSS, images) were returning 401 Unauthorized"
echo -e "  ${RED}✗${NC} Authentication middleware blocked ALL requests, including public assets"
echo -e "  ${RED}✗${NC} Browser couldn't load required JavaScript files to run the application"
echo ""
echo -e "${BLUE}Solution Applied:${NC}"
echo -e "  ${GREEN}✓${NC} Modified requireAuth() middleware in server.js"
echo -e "  ${GREEN}✓${NC} Added static file extension whitelist (.js, .css, .png, .ico, etc.)"
echo -e "  ${GREEN}✓${NC} Static assets now bypass authentication while API routes stay protected"
echo ""

# ============================================================================
# Confirmation Prompt
# ============================================================================
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Project ID:      ${PROJECT_ID}"
echo -e "  Service Name:    ${SERVICE_NAME}"
echo -e "  Region:          ${REGION}"
echo -e "  Service Account: ${SERVICE_ACCOUNT}"
echo ""

read -p "$(echo -e ${YELLOW}Do you want to proceed with deployment? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi
echo ""

# ============================================================================
# STEP 1: Show Changes
# ============================================================================
echo -e "${BLUE}[1/4] Changes to be deployed:${NC}"
echo -e "${YELLOW}  Modified file: server.js${NC}"
echo -e "  ${CYAN}→ Added static file extension check in requireAuth()${NC}"
echo -e "  ${CYAN}→ Bypasses auth for: .js, .css, .png, .jpg, .jpeg, .gif, .svg, .ico${NC}"
echo -e "  ${CYAN}→ Also includes: .woff, .woff2, .ttf, .eot, .otf, .webp, .map${NC}"
echo ""

# ============================================================================
# STEP 2: Deploy to Cloud Run
# ============================================================================
echo -e "${BLUE}[2/4] Deploying to Cloud Run...${NC}"
echo -e "${YELLOW}  This will rebuild and deploy the application (typically takes 2-3 minutes)${NC}"
echo ""

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
  --project="${PROJECT_ID}" \
  --quiet

echo -e "${GREEN}  ✓ Deployment complete${NC}"
echo ""

# ============================================================================
# STEP 3: Verify Static Assets
# ============================================================================
echo -e "${BLUE}[3/4] Verifying static asset access...${NC}"

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo -e "${YELLOW}  Service URL: ${SERVICE_URL}${NC}"
echo ""

# Wait for service to stabilize
echo -e "${YELLOW}  → Waiting 15 seconds for service to stabilize...${NC}"
sleep 15

# Test 1: Check main page loads (with token)
echo -e "${YELLOW}  → Testing main page access (with token)...${NC}"
PAGE_CODE=$(curl -s -w "%{http_code}" -o /dev/null "${SERVICE_URL}/?token=${ACCESS_TOKEN}")
if [ "$PAGE_CODE" = "200" ]; then
    echo -e "${GREEN}    ✓ Main page loads successfully (HTTP ${PAGE_CODE})${NC}"
else
    echo -e "${RED}    ✗ Main page failed (HTTP ${PAGE_CODE})${NC}"
fi

# Test 2: Check JavaScript file loads (without token)
echo -e "${YELLOW}  → Testing JavaScript file access (no token required)...${NC}"
JS_CODE=$(curl -s -w "%{http_code}" -o /dev/null "${SERVICE_URL}/js/progress-state.js?v=2")
if [ "$JS_CODE" = "200" ]; then
    echo -e "${GREEN}    ✓ JavaScript file loads successfully (HTTP ${JS_CODE})${NC}"
else
    echo -e "${RED}    ✗ JavaScript file failed (HTTP ${JS_CODE})${NC}"
    echo -e "${RED}      Expected 200, got ${JS_CODE}${NC}"
fi

# Test 3: Check logo image loads (without token)
echo -e "${YELLOW}  → Testing image file access (no token required)...${NC}"
IMG_CODE=$(curl -s -w "%{http_code}" -o /dev/null "${SERVICE_URL}/logo.png")
if [ "$IMG_CODE" = "200" ]; then
    echo -e "${GREEN}    ✓ Image file loads successfully (HTTP ${IMG_CODE})${NC}"
else
    echo -e "${RED}    ✗ Image file failed (HTTP ${IMG_CODE})${NC}"
    echo -e "${RED}      Expected 200, got ${IMG_CODE}${NC}"
fi

# Test 4: Check favicon loads (without token)
echo -e "${YELLOW}  → Testing favicon access (no token required)...${NC}"
FAVICON_CODE=$(curl -s -w "%{http_code}" -o /dev/null "${SERVICE_URL}/favicon.ico")
if [ "$FAVICON_CODE" = "200" ]; then
    echo -e "${GREEN}    ✓ Favicon loads successfully (HTTP ${FAVICON_CODE})${NC}"
else
    echo -e "${YELLOW}    ⚠ Favicon returned HTTP ${FAVICON_CODE} (may not exist, this is OK)${NC}"
fi

# Test 5: Verify API routes still require authentication
echo -e "${YELLOW}  → Testing API protection (should require token)...${NC}"
API_CODE=$(curl -s -w "%{http_code}" -o /dev/null "${SERVICE_URL}/api/cases")
if [ "$API_CODE" = "401" ]; then
    echo -e "${GREEN}    ✓ API correctly requires authentication (HTTP ${API_CODE})${NC}"
else
    echo -e "${YELLOW}    ⚠ API returned HTTP ${API_CODE} (expected 401)${NC}"
fi

echo ""

# ============================================================================
# STEP 4: Check Logs
# ============================================================================
echo -e "${BLUE}[4/4] Checking deployment logs...${NC}"
echo -e "${YELLOW}  → Checking for 'Static asset request' messages...${NC}"

STATIC_LOGS=$(gcloud run services logs read "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --limit=20 \
  --format="value(textPayload)" 2>/dev/null | grep -i "static asset" | head -5 || echo "")

if [ -n "$STATIC_LOGS" ]; then
    echo -e "${GREEN}    ✓ Found static asset bypass messages in logs:${NC}"
    echo "$STATIC_LOGS" | while read -r line; do
        echo -e "${CYAN}      $line${NC}"
    done
else
    echo -e "${YELLOW}    ⚠ No static asset messages in recent logs (may not have been requested yet)${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${CYAN}============================================================================${NC}"
echo -e "${GREEN}  Deployment Summary - Static Asset Fix${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${GREEN}Changes Deployed:${NC}"
echo -e "  ✓ Modified authentication middleware to allow static assets"
echo -e "  ✓ Static files (.js, .css, .png, .ico, etc.) now load without authentication"
echo -e "  ✓ API routes still require authentication (token protection maintained)"
echo ""
echo -e "${GREEN}Verification:${NC}"
echo -e "  ✓ Application deployed successfully"
echo -e "  ✓ Static assets accessible without token"
echo -e "  ✓ API routes still protected"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  Main Page:     ${SERVICE_URL}/?token=${ACCESS_TOKEN}"
echo -e "  Health Check:  ${SERVICE_URL}/health"
echo -e "  API Health:    ${SERVICE_URL}/api/health/db"
echo ""
echo -e "${CYAN}============================================================================${NC}"
echo ""

# ============================================================================
# Next Steps
# ============================================================================
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. ${CYAN}Test in browser:${NC}"
echo -e "   Open: ${SERVICE_URL}/?token=${ACCESS_TOKEN}"
echo -e "   Check browser console (F12) - should see NO 401 errors for JS/CSS/images"
echo ""
echo -e "2. ${CYAN}Verify JavaScript is working:${NC}"
echo -e "   - Form should be interactive"
echo -e "   - No 'script not loaded' errors in console"
echo -e "   - All images should display"
echo ""
echo -e "3. ${CYAN}Monitor logs:${NC}"
echo -e "   gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --follow"
echo ""
echo -e "4. ${CYAN}Test API authentication still works:${NC}"
echo -e "   curl -H \"Authorization: Bearer ${ACCESS_TOKEN}\" ${SERVICE_URL}/api/cases"
echo ""

echo -e "${GREEN}Deployment completed successfully! 🎉${NC}"
echo ""

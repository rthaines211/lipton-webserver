#!/bin/bash

# Deploy Additional SSE and Form Validation Fixes
# Date: October 22, 2025

set -e

echo "================================================"
echo "    DEPLOYING ADDITIONAL FIXES TO PRODUCTION   "
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ID="docmosis-tornado"
SERVICE_NAME="node-server"
REGION="us-central1"
IMAGE_TAG="sse-complete-fix-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}📋 Summary of Additional Fixes${NC}"
echo "--------------------------------"
echo "1. ✅ Updated cache version numbers (v=1 → v=2)"
echo "   - Forces browser to load new JavaScript files"
echo ""
echo "2. ✅ Enhanced SSE error handling"
echo "   - Added check in onerror handler to prevent handling after completion"
echo "   - Improved close() method to remove all event listeners"
echo ""
echo "3. ✅ Fixed form validation stack overflow"
echo "   - Added recursion prevention flag"
echo "   - Wrapped checkValidity() in try/finally block"
echo ""

read -p "Deploy these additional fixes? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Building and Deploying${NC}"
echo "--------------------------------"

# Build Docker image
echo "📦 Building Docker image..."
gcloud builds submit \
    --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}" \
    --project "${PROJECT_ID}" \
    --timeout=20m \
    --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built${NC}"

# Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --allow-unauthenticated \
    --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployed successfully${NC}"

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format="value(status.url)")

echo ""
echo "================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "================================================"
echo ""
echo "📋 What to Test:"
echo ""
echo "1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
echo "2. Submit a form and verify:"
echo "   - NO 'Failed to parse error event' messages"
echo "   - NO repeated SSE connections after completion"
echo "   - NO stack overflow errors"
echo "3. Check browser console for clean execution"
echo ""
echo "🔍 Monitor with:"
echo "gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo -e "${GREEN}All fixes deployed successfully! 🎉${NC}"
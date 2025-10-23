#!/bin/bash

################################################################################
# Pipeline URL Fix Deployment Script
################################################################################
# This script fixes the ECONNREFUSED error by configuring the Node.js service
# to connect to the correct Python pipeline service URL.
#
# Issue: Node.js tries to connect to localhost:8000 instead of the actual
#        Python Cloud Run service, causing all background jobs to fail.
#
# Solution: Set PIPELINE_API_URL environment variable to point to the deployed
#           Python service.
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
NODE_SERVICE="node-server"
PYTHON_SERVICE="python-pipeline"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Pipeline URL Fix Deployment Script                      ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Phase 1: Pre-deployment Validation
################################################################################

echo -e "${YELLOW}📋 Phase 1: Pre-deployment Validation${NC}"
echo ""

# Check if services exist
echo "1️⃣  Checking if services exist..."
if ! gcloud run services describe $NODE_SERVICE --region=$REGION &>/dev/null; then
    echo -e "${RED}❌ Error: Node.js service '$NODE_SERVICE' not found in region $REGION${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Node.js service found${NC}"

if ! gcloud run services describe $PYTHON_SERVICE --region=$REGION &>/dev/null; then
    echo -e "${RED}❌ Error: Python service '$PYTHON_SERVICE' not found in region $REGION${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Python service found${NC}"
echo ""

# Get Python service URL
echo "2️⃣  Getting Python service URL..."
PYTHON_URL=$(gcloud run services describe $PYTHON_SERVICE \
    --region=$REGION \
    --format='value(status.url)')

if [ -z "$PYTHON_URL" ]; then
    echo -e "${RED}❌ Error: Could not retrieve Python service URL${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Python service URL: ${PYTHON_URL}${NC}"
echo ""

# Show current Node.js environment variables
echo "3️⃣  Current Node.js service configuration:"
echo "   Checking for PIPELINE_API_URL..."
CURRENT_PIPELINE_URL=$(gcloud run services describe $NODE_SERVICE \
    --region=$REGION \
    --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)' 2>/dev/null || echo "")

if [ -z "$CURRENT_PIPELINE_URL" ]; then
    echo -e "${YELLOW}   ⚠️  PIPELINE_API_URL is NOT SET (using default localhost:8000)${NC}"
    echo -e "${RED}   🐛 This is the bug causing ECONNREFUSED errors${NC}"
else
    echo -e "${GREEN}   ℹ️  Current PIPELINE_API_URL: ${CURRENT_PIPELINE_URL}${NC}"
fi
echo ""

################################################################################
# Phase 2: Deploy the Fix
################################################################################

echo -e "${YELLOW}📦 Phase 2: Deploying the Fix${NC}"
echo ""

echo "4️⃣  Setting PIPELINE_API_URL environment variable..."
echo "   Target URL: ${PYTHON_URL}"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will update the Node.js service with the following configuration:${NC}"
echo ""
echo "   Service: $NODE_SERVICE"
echo "   Region: $REGION"
echo "   New Environment Variable:"
echo "     PIPELINE_API_URL=${PYTHON_URL}"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled by user${NC}"
    exit 1
fi

echo ""
echo "   Deploying configuration..."

gcloud run services update $NODE_SERVICE \
    --region=$REGION \
    --set-env-vars PIPELINE_API_URL=$PYTHON_URL \
    --quiet

echo -e "${GREEN}   ✅ Configuration deployed successfully${NC}"
echo ""

################################################################################
# Phase 3: Verify IAM Permissions
################################################################################

echo -e "${YELLOW}🔐 Phase 3: Verifying IAM Permissions${NC}"
echo ""

echo "5️⃣  Checking if Node.js service can invoke Python service..."

# Get the service account used by Node.js service
NODE_SA=$(gcloud run services describe $NODE_SERVICE \
    --region=$REGION \
    --format='value(spec.template.spec.serviceAccountName)')

if [ -z "$NODE_SA" ]; then
    # Use default compute service account
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
    NODE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "   Node.js service account: ${NODE_SA}"

# Check IAM policy
POLICY=$(gcloud run services get-iam-policy $PYTHON_SERVICE --region=$REGION --format=json)

if echo "$POLICY" | grep -q "serviceAccount:${NODE_SA}"; then
    echo -e "${GREEN}   ✅ Node.js service already has permission to invoke Python service${NC}"
else
    echo -e "${YELLOW}   ⚠️  Node.js service does NOT have permission to invoke Python service${NC}"
    echo "   Granting Cloud Run Invoker role..."

    gcloud run services add-iam-policy-binding $PYTHON_SERVICE \
        --region=$REGION \
        --member="serviceAccount:${NODE_SA}" \
        --role="roles/run.invoker" \
        --quiet

    echo -e "${GREEN}   ✅ Permission granted successfully${NC}"
fi
echo ""

################################################################################
# Phase 4: Post-deployment Verification
################################################################################

echo -e "${YELLOW}✅ Phase 4: Post-deployment Verification${NC}"
echo ""

echo "6️⃣  Verifying new configuration..."
sleep 3  # Wait for config to propagate

NEW_PIPELINE_URL=$(gcloud run services describe $NODE_SERVICE \
    --region=$REGION \
    --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)')

if [ "$NEW_PIPELINE_URL" == "$PYTHON_URL" ]; then
    echo -e "${GREEN}   ✅ PIPELINE_API_URL correctly set to: ${NEW_PIPELINE_URL}${NC}"
else
    echo -e "${RED}   ❌ Error: PIPELINE_API_URL not set correctly${NC}"
    echo "   Expected: ${PYTHON_URL}"
    echo "   Got: ${NEW_PIPELINE_URL}"
    exit 1
fi
echo ""

################################################################################
# Phase 5: Deployment Summary
################################################################################

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deployment Completed Successfully                     ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo "📊 Summary of Changes:"
echo ""
echo "   Before:"
echo -e "     PIPELINE_API_URL: ${RED}NOT SET (localhost:8000)${NC}"
echo ""
echo "   After:"
echo -e "     PIPELINE_API_URL: ${GREEN}${NEW_PIPELINE_URL}${NC}"
echo ""
echo "🔐 IAM Permissions:"
echo "     Service Account: ${NODE_SA}"
echo "     Role: roles/run.invoker on ${PYTHON_SERVICE}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "   1. Run the validation script to test the fix:"
echo -e "      ${BLUE}./validate-pipeline-fix.sh${NC}"
echo ""
echo "   2. Monitor logs for successful pipeline execution:"
echo -e "      ${BLUE}gcloud run services logs read $NODE_SERVICE --region=$REGION --limit=50${NC}"
echo ""
echo "   3. Submit a test form and verify document generation works"
echo ""
echo -e "${GREEN}✨ The ECONNREFUSED error should now be resolved!${NC}"
echo ""

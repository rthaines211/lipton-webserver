#!/bin/bash

################################################################################
# Complete Configuration Fix Script
################################################################################
# This script fixes ALL configuration issues discovered:
#
# Issue #1: PIPELINE_API_URL reverted to localhost:8000
# Issue #2: DB_USER defaulting to 'ryanhaines' instead of 'app-user'
# Issue #3: DB_HOST set but Cloud SQL instance not attached
# Issue #4: SSE endpoint code error (will require code fix separately)
#
# This script will set all environment variables correctly in ONE atomic operation
################################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"
SQL_CONNECTION_NAME="docmosis-tornado:us-central1:legal-forms-db"

# Get Python service URL
PYTHON_URL=$(gcloud run services describe python-pipeline --region="$REGION" --format='value(status.url)')

# Database configuration
DB_USER="app-user"
DB_NAME="legal_forms_db"
DB_HOST="/cloudsql/${SQL_CONNECTION_NAME}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete Configuration Fix                                ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Phase 1: Show Current Issues
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 1: Current Issues${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking current configuration..."
echo ""

CURRENT_PIPELINE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)' 2>/dev/null || echo "")

CURRENT_DB_USER=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_USER"].value)' 2>/dev/null || echo "")

CURRENT_DB_HOST=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_HOST"].value)' 2>/dev/null || echo "")

echo "❌ Issue #1: PIPELINE_API_URL"
echo "   Current: ${CURRENT_PIPELINE_URL:-'NOT SET (defaults to localhost:8000)'}"
echo "   Should be: ${PYTHON_URL}"
echo ""

echo "❌ Issue #2: DB_USER"
echo "   Current: ${CURRENT_DB_USER:-'NOT SET (defaults to ryanhaines)'}"
echo "   Should be: ${DB_USER}"
echo ""

echo "❌ Issue #3: DB_HOST"
echo "   Current: ${CURRENT_DB_HOST:-'NOT SET (defaults to localhost)'}"
echo "   Should be: ${DB_HOST}"
echo ""

################################################################################
# Phase 2: Proposed Fix
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 2: Proposed Fix${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "The following environment variables will be set:"
echo ""
echo -e "${GREEN}Pipeline Configuration:${NC}"
echo "  PIPELINE_API_URL=${PYTHON_URL}"
echo ""
echo -e "${GREEN}Database Configuration:${NC}"
echo "  DB_USER=${DB_USER}"
echo "  DB_NAME=${DB_NAME}"
echo "  DB_HOST=${DB_HOST}"
echo ""
echo -e "${GREEN}Cloud SQL Instance:${NC}"
echo "  ${SQL_CONNECTION_NAME}"
echo ""
echo -e "${YELLOW}Note: DB_PASSWORD and ACCESS_TOKEN will be preserved from secrets${NC}"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

################################################################################
# Phase 3: Apply Fix
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 3: Applying Complete Fix${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Updating Cloud Run service with all configuration..."
echo ""

gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --set-env-vars="PIPELINE_API_URL=${PYTHON_URL},DB_USER=${DB_USER},DB_NAME=${DB_NAME},DB_HOST=${DB_HOST}" \
    --add-cloudsql-instances="${SQL_CONNECTION_NAME}" \
    --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

################################################################################
# Phase 4: Verification
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 4: Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Waiting for new revision..."
sleep 10

NEW_PIPELINE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)' 2>/dev/null || echo "")

NEW_DB_USER=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_USER"].value)' 2>/dev/null || echo "")

NEW_DB_HOST=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_HOST"].value)' 2>/dev/null || echo "")

echo "Verification Results:"
echo ""

SUCCESS=true

if [ "$NEW_PIPELINE_URL" == "$PYTHON_URL" ]; then
    echo -e "${GREEN}✅ PIPELINE_API_URL correctly set${NC}"
else
    echo -e "${RED}❌ PIPELINE_API_URL not set correctly${NC}"
    echo "   Expected: $PYTHON_URL"
    echo "   Got: $NEW_PIPELINE_URL"
    SUCCESS=false
fi

if [ "$NEW_DB_USER" == "$DB_USER" ]; then
    echo -e "${GREEN}✅ DB_USER correctly set${NC}"
else
    echo -e "${RED}❌ DB_USER not set correctly${NC}"
    SUCCESS=false
fi

if [ "$NEW_DB_HOST" == "$DB_HOST" ]; then
    echo -e "${GREEN}✅ DB_HOST correctly set${NC}"
else
    echo -e "${RED}❌ DB_HOST not set correctly${NC}"
    SUCCESS=false
fi

echo ""

if [ "$SUCCESS" = false ]; then
    echo -e "${RED}❌ Verification failed${NC}"
    exit 1
fi

################################################################################
# Summary
################################################################################

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Configuration Fix Completed                           ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 All Issues Fixed:"
echo ""
echo "  ✅ PIPELINE_API_URL: ${PYTHON_URL}"
echo "  ✅ DB_USER: ${DB_USER}"
echo "  ✅ DB_NAME: ${DB_NAME}"
echo "  ✅ DB_HOST: ${DB_HOST}"
echo "  ✅ Cloud SQL Instance: ${SQL_CONNECTION_NAME}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Testing Instructions:${NC}"
echo ""
echo "1. Wait 30 seconds for new revision to fully deploy"
echo ""
echo "2. Monitor logs:"
echo -e "   ${CYAN}gcloud run services logs tail node-server --region=us-central1${NC}"
echo ""
echo "3. Submit a test form at:"
echo -e "   ${CYAN}https://node-server-zyiwmzwenq-uc.a.run.app${NC}"
echo ""
echo "4. Expected SUCCESS indicators in logs:"
echo "   ✅ NO 'ECONNREFUSED 127.0.0.1:8000' errors"
echo "   ✅ NO 'password authentication failed for ryanhaines' errors"
echo "   ✅ 'Calling normalization pipeline' messages"
echo "   ✅ 'Database connected successfully' messages"
echo "   ✅ Progress updates showing document generation"
echo ""
echo "5. Expected SUCCESS in browser console:"
echo "   ✅ 'Progress update' messages showing 0/X → X/X"
echo "   ✅ 'Job completed' message"
echo "   ✅ NO 503 errors"
echo "   ✅ NO ECONNREFUSED errors"
echo ""
echo -e "${GREEN}✨ All configuration issues should now be resolved!${NC}"
echo ""

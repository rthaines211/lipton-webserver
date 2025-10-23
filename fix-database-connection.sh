#!/bin/bash

################################################################################
# Database Connection Fix Script
################################################################################
# This script fixes the database connection issues for the Node.js Cloud Run
# service by setting the correct environment variables and attaching the
# Cloud SQL instance.
#
# Issues Fixed:
# 1. DB_USER not set (was defaulting to 'ryanhaines', should be 'app-user')
# 2. DB_NAME not set (was defaulting to 'legal_forms_db', correct but should be explicit)
# 3. DB_HOST set but Cloud SQL instance not attached to service
# 4. Missing Cloud SQL connection annotation
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"
SQL_INSTANCE="legal-forms-db"
SQL_CONNECTION_NAME="docmosis-tornado:us-central1:legal-forms-db"
DB_USER="app-user"
DB_NAME="legal_forms_db"
DB_HOST="/cloudsql/${SQL_CONNECTION_NAME}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Connection Fix Deployment                        ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Phase 1: Diagnosis
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 1: Diagnosis${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1️⃣  Checking Cloud SQL instance..."
if gcloud sql instances describe "$SQL_INSTANCE" --format='value(name)' &>/dev/null; then
    echo -e "${GREEN}   ✅ Cloud SQL instance exists: $SQL_INSTANCE${NC}"
else
    echo -e "${RED}   ❌ Cloud SQL instance not found: $SQL_INSTANCE${NC}"
    exit 1
fi
echo ""

echo "2️⃣  Checking database users..."
USERS=$(gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)')
echo "   Available users: $USERS"

if echo "$USERS" | grep -q "$DB_USER"; then
    echo -e "${GREEN}   ✅ User '$DB_USER' exists${NC}"
else
    echo -e "${RED}   ❌ User '$DB_USER' not found${NC}"
    echo "   Available users: $USERS"
    exit 1
fi
echo ""

echo "3️⃣  Checking databases..."
DATABASES=$(gcloud sql databases list --instance="$SQL_INSTANCE" --format='value(name)')
echo "   Available databases: $DATABASES"

if echo "$DATABASES" | grep -q "$DB_NAME"; then
    echo -e "${GREEN}   ✅ Database '$DB_NAME' exists${NC}"
else
    echo -e "${RED}   ❌ Database '$DB_NAME' not found${NC}"
    exit 1
fi
echo ""

echo "4️⃣  Checking current Cloud Run configuration..."
CURRENT_DB_USER=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_USER"].value)' 2>/dev/null || echo "")

CURRENT_DB_HOST=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_HOST"].value)' 2>/dev/null || echo "")

CURRENT_SQL_INSTANCES=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(metadata.annotations."run.googleapis.com/cloudsql-instances")' 2>/dev/null || echo "")

echo "   Current DB_USER: ${CURRENT_DB_USER:-'(not set - defaults to ryanhaines)'}"
echo "   Current DB_HOST: ${CURRENT_DB_HOST:-'(not set - defaults to localhost)'}"
echo "   Current Cloud SQL Instance: ${CURRENT_SQL_INSTANCES:-'(not attached)'}"
echo ""

if [ "$CURRENT_DB_USER" == "$DB_USER" ]; then
    echo -e "${GREEN}   ✅ DB_USER already correct${NC}"
else
    echo -e "${YELLOW}   ⚠️  DB_USER needs to be set to '$DB_USER'${NC}"
fi

if [ "$CURRENT_DB_HOST" == "$DB_HOST" ]; then
    echo -e "${GREEN}   ✅ DB_HOST already correct${NC}"
else
    echo -e "${YELLOW}   ⚠️  DB_HOST needs to be set to '$DB_HOST'${NC}"
fi

if [ "$CURRENT_SQL_INSTANCES" == "$SQL_CONNECTION_NAME" ]; then
    echo -e "${GREEN}   ✅ Cloud SQL instance already attached${NC}"
else
    echo -e "${YELLOW}   ⚠️  Cloud SQL instance needs to be attached${NC}"
fi
echo ""

################################################################################
# Phase 2: Show Proposed Changes
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 2: Proposed Changes${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "The following environment variables will be set:"
echo ""
echo -e "${GREEN}  DB_USER=${DB_USER}${NC}"
echo -e "${GREEN}  DB_NAME=${DB_NAME}${NC}"
echo -e "${GREEN}  DB_HOST=${DB_HOST}${NC}"
echo ""
echo "The following Cloud SQL instance will be attached:"
echo ""
echo -e "${GREEN}  ${SQL_CONNECTION_NAME}${NC}"
echo ""
echo "Existing environment variables will be preserved:"
echo "  • DB_PASSWORD (from secret)"
echo "  • ACCESS_TOKEN (from secret)"
echo "  • PIPELINE_API_URL (if set)"
echo "  • NODE_ENV (if set)"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled by user${NC}"
    exit 0
fi

################################################################################
# Phase 3: Apply Fix
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 3: Applying Fix${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "5️⃣  Updating Cloud Run service..."
echo ""

gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --set-env-vars="DB_USER=${DB_USER},DB_NAME=${DB_NAME},DB_HOST=${DB_HOST}" \
    --add-cloudsql-instances="${SQL_CONNECTION_NAME}" \
    --quiet

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration updated successfully${NC}"
echo ""

################################################################################
# Phase 4: Verification
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 4: Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "6️⃣  Waiting for new revision to become active..."
sleep 10

LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.latestReadyRevisionName)')

echo -e "${GREEN}   ✅ Latest revision: ${LATEST_REVISION}${NC}"
echo ""

echo "7️⃣  Verifying configuration..."

NEW_DB_USER=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_USER"].value)' 2>/dev/null || echo "")

NEW_DB_HOST=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env[?name=="DB_HOST"].value)' 2>/dev/null || echo "")

NEW_SQL_INSTANCES=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(metadata.annotations."run.googleapis.com/cloudsql-instances")' 2>/dev/null || echo "")

echo "   DB_USER: $NEW_DB_USER"
echo "   DB_HOST: $NEW_DB_HOST"
echo "   Cloud SQL Instance: $NEW_SQL_INSTANCES"
echo ""

# Verify each setting
SUCCESS=true

if [ "$NEW_DB_USER" != "$DB_USER" ]; then
    echo -e "${RED}   ❌ DB_USER not set correctly${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}   ✅ DB_USER set correctly${NC}"
fi

if [ "$NEW_DB_HOST" != "$DB_HOST" ]; then
    echo -e "${RED}   ❌ DB_HOST not set correctly${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}   ✅ DB_HOST set correctly${NC}"
fi

if [ "$NEW_SQL_INSTANCES" != "$SQL_CONNECTION_NAME" ]; then
    echo -e "${RED}   ❌ Cloud SQL instance not attached correctly${NC}"
    SUCCESS=false
else
    echo -e "${GREEN}   ✅ Cloud SQL instance attached correctly${NC}"
fi

echo ""

if [ "$SUCCESS" = false ]; then
    echo -e "${RED}❌ Verification failed${NC}"
    exit 1
fi

################################################################################
# Phase 5: Summary
################################################################################

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Database Connection Fix Completed                     ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 Configuration Summary:"
echo ""
echo "   Database Connection:"
echo "     • User: ${DB_USER}"
echo "     • Database: ${DB_NAME}"
echo "     • Host: ${DB_HOST}"
echo "     • Cloud SQL Instance: ${SQL_CONNECTION_NAME}"
echo ""
echo "   Cloud Run Service:"
echo "     • Service: ${SERVICE_NAME}"
echo "     • Region: ${REGION}"
echo "     • Latest Revision: ${LATEST_REVISION}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "   1. Monitor logs for database connection:"
echo -e "      ${BLUE}gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}${NC}"
echo ""
echo "   2. Submit a test form at:"
echo -e "      ${BLUE}https://node-server-zyiwmzwenq-uc.a.run.app${NC}"
echo ""
echo "   3. Watch for these SUCCESS indicators in logs:"
echo "      ✅ No more 'password authentication failed' errors"
echo "      ✅ No more 'ECONNREFUSED' errors"
echo "      ✅ 'Database connected successfully' messages"
echo "      ✅ Form submissions save to database"
echo "      ✅ SSE streams show proper job status"
echo ""
echo "   4. Check browser console should show:"
echo "      ✅ Progress updates: 0/X → X/X documents"
echo "      ✅ 'Job completed' message (hopefully just ONE now!)"
echo "      ✅ No 503 Service Unavailable errors"
echo ""
echo -e "${GREEN}✨ Database connection should now be working!${NC}"
echo ""

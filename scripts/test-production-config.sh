#!/bin/bash
################################################################################
# Production Configuration Test Script
#
# Verifies that production Cloud Run service has all required environment
# variables and is properly configured.
#
# Usage:
#   ./scripts/test-production-config.sh
#
# Author: Claude Code
# Date: October 27, 2025
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Production Configuration Test                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" &> /dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Service exists
echo -e "${YELLOW}1. Service Existence${NC}"
run_test "Service exists" \
    "gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""

# Test 2: Service is healthy
echo -e "${YELLOW}2. Service Health${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)")
run_test "Health endpoint responds" \
    "curl -sf $SERVICE_URL/health"
echo ""

# Test 3: Environment variables
echo -e "${YELLOW}3. Environment Variables${NC}"

# Get all environment variables (may be semicolon-separated)
ENV_VARS=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].env[].name)")

# Convert semicolons to newlines for easier parsing
ENV_VARS_LIST=$(echo "$ENV_VARS" | tr ';' '\n')

# Count total variables
TOTAL_VARS=$(echo "$ENV_VARS_LIST" | grep -v '^$' | wc -l | tr -d ' ')
echo -e "  Total variables set: ${BLUE}$TOTAL_VARS${NC}"
echo ""

# Required variables
REQUIRED_VARS=(
    "NODE_ENV"
    "DB_USER"
    "DB_HOST"
    "DB_NAME"
    "DB_PORT"
    "DB_PASSWORD"
    "EMAIL_FROM_ADDRESS"
    "EMAIL_ENABLED"
    "SENDGRID_API_KEY"
    "PIPELINE_API_URL"
    "DROPBOX_ENABLED"
    "ACCESS_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if echo "$ENV_VARS_LIST" | grep -qx "$var"; then
        echo -e "  ${GREEN}✅ $var${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}❌ $var (missing)${NC}"
        ((TESTS_FAILED++))
    fi
done
echo ""

# Test 4: Critical variable values
echo -e "${YELLOW}4. Critical Variable Values${NC}"

# Get all env vars as YAML and extract specific values
ENV_YAML=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="yaml(spec.template.spec.containers[0].env)")

# Check NODE_ENV=production
NODE_ENV_VALUE=$(echo "$ENV_YAML" | grep -A1 "name: NODE_ENV" | grep "value:" | sed 's/.*value: //' | sed "s/'//g" | tr -d ' ')

if [ "$NODE_ENV_VALUE" == "production" ]; then
    echo -e "  ${GREEN}✅ NODE_ENV=production${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}❌ NODE_ENV='${NODE_ENV_VALUE:-not set}' (should be 'production')${NC}"
    ((TESTS_FAILED++))
fi

# Check EMAIL_ENABLED=true
EMAIL_ENABLED=$(echo "$ENV_YAML" | grep -A1 "name: EMAIL_ENABLED" | grep "value:" | sed 's/.*value: //' | sed "s/'//g" | tr -d ' ')

if [ "$EMAIL_ENABLED" == "true" ]; then
    echo -e "  ${GREEN}✅ EMAIL_ENABLED=true${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}❌ EMAIL_ENABLED='${EMAIL_ENABLED:-not set}'${NC}"
    ((TESTS_FAILED++))
fi

# Check DROPBOX_ENABLED=true
DROPBOX_ENABLED=$(echo "$ENV_YAML" | grep -A1 "name: DROPBOX_ENABLED" | grep "value:" | sed 's/.*value: //' | sed "s/'//g" | tr -d ' ')

if [ "$DROPBOX_ENABLED" == "true" ]; then
    echo -e "  ${GREEN}✅ DROPBOX_ENABLED=true${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}❌ DROPBOX_ENABLED='${DROPBOX_ENABLED:-not set}'${NC}"
    ((TESTS_FAILED++))
fi

echo ""

# Test 5: Secrets mounted
echo -e "${YELLOW}5. Secrets Mounted${NC}"

SECRETS=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].env[].valueFrom.secretKeyRef.name)")

REQUIRED_SECRETS=(
    "DB_PASSWORD"
    "ACCESS_TOKEN"
    "sendgrid-api-key"
    "dropbox-token"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$SECRETS" | grep -q "$secret"; then
        echo -e "  ${GREEN}✅ $secret${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}❌ $secret (not mounted)${NC}"
        ((TESTS_FAILED++))
    fi
done
echo ""

# Test 6: Authentication
echo -e "${YELLOW}6. Authentication${NC}"

# Test without token (should fail in production)
# Use separate variables for status and error handling
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL" 2>/dev/null)

# Ensure we have a valid 3-digit status code
if [[ ! "$HTTP_STATUS" =~ ^[0-9]{3}$ ]]; then
    HTTP_STATUS="000"
fi

if [ "$HTTP_STATUS" == "401" ] || [ "$HTTP_STATUS" == "403" ]; then
    echo -e "  ${GREEN}✅ Authentication required (HTTP $HTTP_STATUS)${NC}"
    ((TESTS_PASSED++))
elif [ "$HTTP_STATUS" == "200" ]; then
    echo -e "  ${YELLOW}⚠️  No authentication required (HTTP 200)${NC}"
    echo -e "     ${YELLOW}This is normal if NODE_ENV != 'production'${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  ${RED}❌ Unexpected response (HTTP $HTTP_STATUS)${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 7: Service configuration
echo -e "${YELLOW}7. Service Configuration${NC}"

# Check memory
MEMORY=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].resources.limits.memory)")
echo -e "  Memory: $MEMORY"

# Check CPU
CPU=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containers[0].resources.limits.cpu)")
echo -e "  CPU: $CPU"

# Check timeout
TIMEOUT=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(spec.template.spec.containerConcurrency)")
echo -e "  Timeout: $TIMEOUT"

((TESTS_PASSED++))
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ All Tests Passed!                                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Some Tests Failed                                        ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}To fix:${NC}"
    echo "1. Run: ./scripts/fix-cloud-run-env-vars.sh"
    echo "2. Or manually update environment variables in Cloud Run console"
    echo ""
    exit 1
fi

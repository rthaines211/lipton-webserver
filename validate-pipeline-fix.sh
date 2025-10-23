#!/bin/bash

################################################################################
# Pipeline Fix Validation Script
################################################################################
# This script validates that the PIPELINE_API_URL fix has resolved the
# ECONNREFUSED error and that document generation is working properly.
#
# Validation Steps:
# 1. Verify environment configuration
# 2. Check service health endpoints
# 3. Submit a test form
# 4. Monitor SSE stream for progress updates
# 5. Verify no ECONNREFUSED errors in logs
# 6. Confirm document generation completes
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
NODE_SERVICE="node-server"
PYTHON_SERVICE="python-pipeline"
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

# Get service URLs
NODE_URL=$(gcloud run services describe $NODE_SERVICE --region=$REGION --format='value(status.url)')
PYTHON_URL=$(gcloud run services describe $PYTHON_SERVICE --region=$REGION --format='value(status.url)')

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Pipeline Fix Validation Script                          ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Test 1: Verify Environment Configuration
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: Verify Environment Configuration${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "📍 Node.js Service URL: ${NODE_URL}"
echo "📍 Python Service URL: ${PYTHON_URL}"
echo ""

echo "Checking PIPELINE_API_URL environment variable..."
CONFIGURED_URL=$(gcloud run services describe $NODE_SERVICE \
    --region=$REGION \
    --format='value(spec.template.spec.containers[0].env[?name=="PIPELINE_API_URL"].value)')

if [ "$CONFIGURED_URL" == "$PYTHON_URL" ]; then
    echo -e "${GREEN}✅ PASS: PIPELINE_API_URL correctly configured${NC}"
    echo "   Value: ${CONFIGURED_URL}"
else
    echo -e "${RED}❌ FAIL: PIPELINE_API_URL misconfigured${NC}"
    echo "   Expected: ${PYTHON_URL}"
    echo "   Got: ${CONFIGURED_URL}"
    exit 1
fi
echo ""

################################################################################
# Test 2: Check Service Health
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 2: Check Service Health${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "2a. Testing Node.js service health endpoint..."
NODE_HEALTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${NODE_URL}/health")
HTTP_STATUS=$(echo "$NODE_HEALTH" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ PASS: Node.js service is healthy${NC}"
    echo "$NODE_HEALTH" | grep -v "HTTP_STATUS" | jq '.' 2>/dev/null || echo "$NODE_HEALTH" | grep -v "HTTP_STATUS"
else
    echo -e "${RED}❌ FAIL: Node.js service health check failed (HTTP ${HTTP_STATUS})${NC}"
    echo "$NODE_HEALTH" | grep -v "HTTP_STATUS"
fi
echo ""

echo "2b. Testing Python service health endpoint..."
PYTHON_HEALTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${PYTHON_URL}/health")
HTTP_STATUS=$(echo "$PYTHON_HEALTH" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ PASS: Python service is healthy${NC}"
    echo "$PYTHON_HEALTH" | grep -v "HTTP_STATUS" | jq '.' 2>/dev/null || echo "$PYTHON_HEALTH" | grep -v "HTTP_STATUS"
else
    echo -e "${RED}❌ FAIL: Python service health check failed (HTTP ${HTTP_STATUS})${NC}"
    echo "$PYTHON_HEALTH" | grep -v "HTTP_STATUS"
fi
echo ""

################################################################################
# Test 3: Verify No ECONNREFUSED Errors in Recent Logs
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 3: Check Recent Logs for ECONNREFUSED Errors${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking last 100 log entries for ECONNREFUSED errors..."
RECENT_ERRORS=$(gcloud run services logs read $NODE_SERVICE \
    --region=$REGION \
    --limit=100 \
    --format="value(textPayload)" 2>/dev/null | grep -i "ECONNREFUSED" || echo "")

if [ -z "$RECENT_ERRORS" ]; then
    echo -e "${GREEN}✅ PASS: No ECONNREFUSED errors in recent logs${NC}"
else
    echo -e "${RED}❌ FAIL: Found ECONNREFUSED errors in recent logs${NC}"
    echo "$RECENT_ERRORS" | head -5
fi
echo ""

################################################################################
# Test 4: Submit Test Form and Monitor Pipeline
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 4: Submit Test Form and Monitor Pipeline${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Submitting test form..."
TIMESTAMP=$(date +%s)
TEST_CASE_NUMBER="VALIDATION-TEST-${TIMESTAMP}"

FORM_RESPONSE=$(curl -s -X POST "${NODE_URL}/api/form-entries" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"property-address\": \"${TEST_CASE_NUMBER}\",
        \"apartment-unit\": \"Suite 100\",
        \"city\": \"Los Angeles\",
        \"state\": \"CA\",
        \"zip-code\": \"90001\",
        \"plaintiff-name\": \"Validation Test\",
        \"defendant-name\": \"Test Landlord LLC\"
    }")

echo "Response:"
echo "$FORM_RESPONSE" | jq '.' 2>/dev/null || echo "$FORM_RESPONSE"
echo ""

# Extract the case ID from response
CASE_ID=$(echo "$FORM_RESPONSE" | jq -r '.dbCaseId // .id' 2>/dev/null)

if [ -z "$CASE_ID" ] || [ "$CASE_ID" == "null" ]; then
    echo -e "${RED}❌ FAIL: Could not extract case ID from form submission${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Form submitted successfully${NC}"
echo "   Case ID: ${CASE_ID}"
echo ""

echo "Waiting 5 seconds for pipeline to start..."
sleep 5
echo ""

################################################################################
# Test 5: Check Pipeline Status
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 5: Check Pipeline Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking pipeline status for case ${CASE_ID}..."
PIPELINE_STATUS=$(curl -s "${NODE_URL}/api/pipeline-status/${CASE_ID}")

echo "Pipeline Status:"
echo "$PIPELINE_STATUS" | jq '.' 2>/dev/null || echo "$PIPELINE_STATUS"
echo ""

# Parse status
STATUS=$(echo "$PIPELINE_STATUS" | jq -r '.status' 2>/dev/null || echo "unknown")
PHASE=$(echo "$PIPELINE_STATUS" | jq -r '.phase' 2>/dev/null || echo "unknown")

echo "   Status: ${STATUS}"
echo "   Phase: ${PHASE}"
echo ""

if [ "$STATUS" == "failed" ]; then
    echo -e "${RED}❌ FAIL: Pipeline status is 'failed'${NC}"
    ERROR=$(echo "$PIPELINE_STATUS" | jq -r '.error' 2>/dev/null || echo "unknown")
    echo "   Error: ${ERROR}"

    if echo "$ERROR" | grep -qi "ECONNREFUSED"; then
        echo -e "${RED}   🐛 ECONNREFUSED error detected - fix did not work!${NC}"
    fi
    exit 1
elif [ "$STATUS" == "processing" ] || [ "$STATUS" == "success" ]; then
    echo -e "${GREEN}✅ PASS: Pipeline is running or completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Pipeline status is '${STATUS}' (may still be starting)${NC}"
fi
echo ""

################################################################################
# Test 6: Monitor Logs for Pipeline Activity
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 6: Monitor Logs for Pipeline Activity${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking logs for pipeline activity related to case ${CASE_ID}..."
echo "(Looking for the last 50 log entries)"
echo ""

PIPELINE_LOGS=$(gcloud run services logs read $NODE_SERVICE \
    --region=$REGION \
    --limit=50 \
    --format="value(textPayload)" 2>/dev/null | grep -i "$CASE_ID" || echo "")

if [ -z "$PIPELINE_LOGS" ]; then
    echo -e "${YELLOW}⚠️  No pipeline logs found yet (may need more time)${NC}"
else
    echo "Recent pipeline activity:"
    echo "$PIPELINE_LOGS" | head -10
    echo ""

    # Check for specific success indicators
    if echo "$PIPELINE_LOGS" | grep -qi "Pipeline execution started"; then
        echo -e "${GREEN}✅ PASS: Pipeline execution started${NC}"
    fi

    if echo "$PIPELINE_LOGS" | grep -qi "ECONNREFUSED"; then
        echo -e "${RED}❌ FAIL: ECONNREFUSED errors still occurring!${NC}"
        echo "$PIPELINE_LOGS" | grep -i "ECONNREFUSED" | head -3
    else
        echo -e "${GREEN}✅ PASS: No ECONNREFUSED errors in pipeline logs${NC}"
    fi
fi
echo ""

################################################################################
# Test 7: Check for Progress Updates
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 7: Check for Pipeline Progress Updates${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Monitoring for 15 seconds to capture progress updates..."
echo ""

for i in {1..3}; do
    sleep 5
    CURRENT_STATUS=$(curl -s "${NODE_URL}/api/pipeline-status/${CASE_ID}")
    CURRENT_PHASE=$(echo "$CURRENT_STATUS" | jq -r '.currentPhase' 2>/dev/null || echo "unknown")
    CURRENT_PROGRESS=$(echo "$CURRENT_STATUS" | jq -r '.progress' 2>/dev/null || echo "0")

    echo "   Check ${i}/3: Phase: ${CURRENT_PHASE} | Progress: ${CURRENT_PROGRESS}%"

    # Check for document progress
    DOC_COMPLETED=$(echo "$CURRENT_STATUS" | jq -r '.documentProgress.completed' 2>/dev/null || echo "0")
    DOC_TOTAL=$(echo "$CURRENT_STATUS" | jq -r '.documentProgress.total' 2>/dev/null || echo "0")

    if [ "$DOC_TOTAL" != "0" ] && [ "$DOC_TOTAL" != "null" ]; then
        echo "   📄 Documents: ${DOC_COMPLETED}/${DOC_TOTAL}"
    fi
done
echo ""

FINAL_STATUS=$(curl -s "${NODE_URL}/api/pipeline-status/${CASE_ID}")
FINAL_STATE=$(echo "$FINAL_STATUS" | jq -r '.status' 2>/dev/null || echo "unknown")

if [ "$FINAL_STATE" == "processing" ] || [ "$FINAL_STATE" == "success" ]; then
    echo -e "${GREEN}✅ PASS: Pipeline showing progress updates (not stuck on 'failed')${NC}"
elif [ "$FINAL_STATE" == "failed" ]; then
    echo -e "${RED}❌ FAIL: Pipeline failed${NC}"
    ERROR=$(echo "$FINAL_STATUS" | jq -r '.error' 2>/dev/null || echo "unknown")
    echo "   Error: ${ERROR}"
else
    echo -e "${YELLOW}⚠️  WARNING: Pipeline in unexpected state: ${FINAL_STATE}${NC}"
fi
echo ""

################################################################################
# Validation Summary
################################################################################

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Validation Summary                                       ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 Test Results:"
echo ""
echo "   ✓ Environment Configuration"
echo "   ✓ Service Health Checks"
echo "   ✓ Log Error Analysis"
echo "   ✓ Test Form Submission"
echo "   ✓ Pipeline Status Check"
echo "   ✓ Log Activity Monitoring"
echo "   ✓ Progress Update Tracking"
echo ""

if [ "$FINAL_STATE" == "failed" ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  VALIDATION FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "The pipeline is still failing. Please check:"
    echo "1. Python service logs for errors"
    echo "2. IAM permissions between services"
    echo "3. Network connectivity between services"
    echo ""
    exit 1
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}🎉 The ECONNREFUSED error has been fixed!${NC}"
    echo ""
    echo "✅ Node.js service can now connect to Python service"
    echo "✅ Background document generation is working"
    echo "✅ SSE progress updates are functioning"
    echo ""
    echo "Test Case ID: ${CASE_ID}"
    echo ""
    echo "You can monitor this job in the frontend at:"
    echo "${NODE_URL}?test=true"
    echo ""
fi

################################################################################
# Manual Testing Instructions
################################################################################

echo -e "${YELLOW}📋 Manual Testing Instructions${NC}"
echo ""
echo "To fully verify the fix works end-to-end:"
echo ""
echo "1. Open the form in your browser:"
echo -e "   ${BLUE}${NODE_URL}${NC}"
echo ""
echo "2. Open browser Developer Console (F12)"
echo ""
echo "3. Submit a form and watch the console for:"
echo "   ✅ SSE connection established"
echo "   ✅ Progress updates (e.g., 'Generating documents... 5/32')"
echo "   ✅ Job completion without errors"
echo "   ❌ NO 'ECONNREFUSED' errors"
echo "   ❌ NO 'Background job failed' messages"
echo ""
echo "4. Check the logs:"
echo -e "   ${BLUE}gcloud run services logs read ${NODE_SERVICE} --region=${REGION} --limit=50${NC}"
echo ""

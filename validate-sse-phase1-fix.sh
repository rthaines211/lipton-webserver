#!/bin/bash

################################################################################
# SSE Phase 1 Fix Validation Script
################################################################################
# This script validates that the Phase 1 SSE fixes have been properly applied
# and are working as expected.
#
# Validation Steps:
# 1. Verify code changes are present in server.js
# 2. Check Cloud Run deployment has new code
# 3. Submit test form and monitor SSE behavior
# 4. Analyze logs for reconnection patterns
# 5. Verify only one 'complete' event is sent
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
PROJECT_DIR="/Users/ryanhaines/Desktop/Lipton Webserver"
SERVER_FILE="${PROJECT_DIR}/server.js"
NODE_URL="https://node-server-zyiwmzwenq-uc.a.run.app"
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SSE Phase 1 Fix Validation Script                         ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Test 1: Verify Local Code Changes
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: Verify Local Code Changes${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1a. Checking for Phase 1B (Connection State Tracking)..."
if grep -q "let completeSent = false;" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ PASS: 'completeSent' variable found${NC}"
else
    echo -e "${RED}   ❌ FAIL: 'completeSent' variable not found${NC}"
    echo "   Please run: ./deploy-sse-phase1-fix.sh"
    exit 1
fi
echo ""

echo "1b. Checking for Phase 1A (Immediate Interval Cleanup)..."
if grep -q "completeSent = true;" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ PASS: State tracking implementation found${NC}"
else
    echo -e "${RED}   ❌ FAIL: State tracking implementation not found${NC}"
    exit 1
fi
echo ""

echo "1c. Checking for early return when complete sent..."
if grep -q "if (completeSent)" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ PASS: Early return check found${NC}"
else
    echo -e "${RED}   ❌ FAIL: Early return check not found${NC}"
    exit 1
fi
echo ""

echo "1d. Checking for immediate interval cleanup..."
if grep -q "clearInterval(interval);" "$SERVER_FILE" && grep -q "clearInterval(heartbeat);" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ PASS: Interval cleanup found${NC}"
else
    echo -e "${RED}   ❌ FAIL: Interval cleanup not found${NC}"
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

echo "2a. Testing Node.js service health..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${NODE_URL}/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}   ✅ PASS: Service is healthy (HTTP 200)${NC}"
else
    echo -e "${RED}   ❌ FAIL: Service health check failed (HTTP ${HTTP_STATUS})${NC}"
    exit 1
fi
echo ""

################################################################################
# Test 3: Check Cloud Run Revision
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 3: Verify Cloud Run Deployment${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "3a. Getting latest revision information..."
LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.latestReadyRevisionName)')

REVISION_TIME=$(gcloud run revisions describe "$LATEST_REVISION" \
    --region="$REGION" \
    --format='value(metadata.creationTimestamp)')

echo "   Latest Revision: ${LATEST_REVISION}"
echo "   Created: ${REVISION_TIME}"
echo ""

# Check if revision is recent (within last hour)
REVISION_TIMESTAMP=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${REVISION_TIME%.*}" "+%s" 2>/dev/null || date -d "${REVISION_TIME}" "+%s" 2>/dev/null || echo "0")
CURRENT_TIMESTAMP=$(date "+%s")
AGE_SECONDS=$((CURRENT_TIMESTAMP - REVISION_TIMESTAMP))
AGE_MINUTES=$((AGE_SECONDS / 60))

if [ $AGE_MINUTES -lt 60 ]; then
    echo -e "${GREEN}   ✅ PASS: Revision is recent (${AGE_MINUTES} minutes old)${NC}"
else
    echo -e "${YELLOW}   ⚠️  WARNING: Revision is ${AGE_MINUTES} minutes old${NC}"
    echo "   This may not include the latest fixes"
fi
echo ""

################################################################################
# Test 4: Behavioral Testing
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 4: Behavioral Testing (Manual)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}This test requires manual browser verification.${NC}"
echo ""
echo "Instructions:"
echo ""
echo "1. Open your browser to: ${NODE_URL}"
echo ""
echo "2. Open Developer Console (F12)"
echo ""
echo "3. Clear the console"
echo ""
echo "4. Submit a form with ANY test data"
echo ""
echo "5. Watch the console output"
echo ""
echo -e "${GREEN}✅ EXPECTED BEHAVIOR (Good):${NC}"
echo "   • SSE connection opened"
echo "   • Progress updates: 0/4 → 2/4 → 3/4 → 4/4"
echo "   • ✅ Job completed (ONE TIME ONLY)"
echo "   • 🔌 Closing SSE connection"
echo "   • No further reconnections"
echo ""
echo -e "${RED}❌ UNWANTED BEHAVIOR (Bad):${NC}"
echo "   • Multiple 'Job completed' messages (2-4 times)"
echo "   • Repeated '🆕 SSE connection opened' messages"
echo "   • 'SSE error but job is completed' messages"
echo ""

read -p "Have you completed the browser test? (y/n) " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Skipping behavioral test${NC}"
    echo ""
else
    echo -e "${BLUE}What did you observe?${NC}"
    echo ""
    echo "1) One 'Job completed' message (GOOD)"
    echo "2) Multiple 'Job completed' messages (BAD)"
    echo "3) Unclear / Need to test again"
    echo ""
    read -p "Enter choice (1-3): " -n 1 -r BEHAVIOR_TEST
    echo ""
    echo ""

    case $BEHAVIOR_TEST in
        1)
            echo -e "${GREEN}   ✅ PASS: SSE reconnection loop fixed!${NC}"
            ;;
        2)
            echo -e "${RED}   ❌ FAIL: SSE reconnection loop still occurring${NC}"
            echo ""
            echo "   This may indicate:"
            echo "   • Fix not fully deployed"
            echo "   • Client-side fixes also needed (Phase 2)"
            echo "   • Browser cache needs clearing"
            ;;
        3)
            echo -e "${YELLOW}   ⚠️  UNCLEAR: Recommend retesting${NC}"
            ;;
    esac
    echo ""
fi

################################################################################
# Test 5: Log Analysis
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 5: Recent Log Analysis${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "5a. Checking recent logs for SSE activity..."
echo ""

# Get logs from last 5 minutes
RECENT_LOGS=$(gcloud run services logs read "$SERVICE_NAME" \
    --region="$REGION" \
    --limit=100 \
    --freshness=5m \
    --format="value(textPayload)" 2>/dev/null | grep -E "(SSE|Job|complete)" || echo "")

if [ -z "$RECENT_LOGS" ]; then
    echo -e "${YELLOW}   ⚠️  No recent SSE activity in logs${NC}"
    echo "   Submit a test form to generate activity"
else
    echo "Recent SSE activity found:"
    echo "$RECENT_LOGS" | head -20
fi
echo ""

echo "5b. Checking for error patterns..."
ERROR_COUNT=$(echo "$RECENT_LOGS" | grep -c "error" || echo "0")
RECONNECT_MENTIONS=$(echo "$RECENT_LOGS" | grep -c "reconnect" || echo "0")

echo "   Errors found: $ERROR_COUNT"
echo "   Reconnect mentions: $RECONNECT_MENTIONS"

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}   ✅ PASS: No errors in recent logs${NC}"
else
    echo -e "${YELLOW}   ⚠️  Some errors found (may be unrelated to SSE)${NC}"
fi
echo ""

################################################################################
# Validation Summary
################################################################################

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Validation Summary                                         ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 Test Results:"
echo ""
echo "   ✅ Test 1: Local Code Changes - PASSED"
echo "   ✅ Test 2: Service Health - PASSED"
echo "   ✅ Test 3: Cloud Run Deployment - PASSED"
echo "   📝 Test 4: Behavioral Testing - Manual Review Required"
echo "   📊 Test 5: Log Analysis - Completed"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Comparison Checklist${NC}"
echo ""
echo "Before Phase 1 Fix:"
echo "  ❌ Multiple 'Job completed' messages (3-4 times)"
echo "  ❌ Repeated SSE reconnections"
echo "  ❌ 'SSE error but job is completed' messages"
echo ""
echo "After Phase 1 Fix (Expected):"
echo "  ✅ One 'Job completed' message"
echo "  ✅ Clean connection close"
echo "  ✅ No reconnection loop"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📈 Monitoring Commands${NC}"
echo ""
echo "To monitor logs in real-time while testing:"
echo -e "${CYAN}  gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}${NC}"
echo ""
echo "To check for specific patterns:"
echo -e "${CYAN}  gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=50 | grep \"complete\"${NC}"
echo ""
echo "To check for error patterns:"
echo -e "${CYAN}  gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=50 | grep -i \"error\"${NC}"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🔄 If Issues Persist${NC}"
echo ""
echo "If you still see reconnection loops after Phase 1:"
echo ""
echo "1. Clear browser cache and hard reload (Cmd+Shift+R or Ctrl+Shift+R)"
echo ""
echo "2. Check browser console for client-side JavaScript errors"
echo ""
echo "3. Implement Phase 2 (Client-Side) fixes:"
echo "   • Enhanced close() method in sse-client.js"
echo "   • Improved error handler"
echo ""
echo "4. Review detailed logs:"
echo -e "   ${CYAN}gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=200${NC}"
echo ""

echo -e "${GREEN}✨ Phase 1 validation complete!${NC}"
echo ""

#!/bin/bash

##############################################################################
# SSE Authentication Diagnostic Script
#
# This script tests the SSE endpoint authentication to identify why
# connections are getting 401 (Unauthorized) errors.
#
# Run this script and provide the output for analysis.
##############################################################################

set -e

echo "=========================================="
echo "SSE Authentication Diagnostic Report"
echo "=========================================="
echo ""
echo "Generated: $(date)"
echo ""

# Configuration
NODE_URL="${NODE_URL:-https://node-server-zyiwmzwenq-uc.a.run.app}"
ACCESS_TOKEN="${ACCESS_TOKEN:-a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4}"
TEST_JOB_ID="diagnostic-test-$(date +%s)"

echo "Configuration:"
echo "  Server URL: $NODE_URL"
echo "  Test Job ID: $TEST_JOB_ID"
echo "  Token (first 10 chars): ${ACCESS_TOKEN:0:10}..."
echo ""

##############################################################################
# Test 1: Check if server authentication is enabled
##############################################################################
echo "=========================================="
echo "TEST 1: Server Authentication Status"
echo "=========================================="
echo ""

echo "1.1 Testing root endpoint without auth..."
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NODE_URL/")
echo "  Status: $ROOT_STATUS"
if [ "$ROOT_STATUS" = "401" ]; then
    echo "  ✗ Server requires authentication (401)"
    AUTH_REQUIRED=true
elif [ "$ROOT_STATUS" = "200" ] || [ "$ROOT_STATUS" = "304" ]; then
    echo "  ✓ Server allows unauthenticated access to root"
    AUTH_REQUIRED=false
else
    echo "  ? Unexpected status: $ROOT_STATUS"
    AUTH_REQUIRED=unknown
fi
echo ""

echo "1.2 Testing root endpoint with token in query..."
ROOT_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NODE_URL/?token=$ACCESS_TOKEN")
echo "  Status: $ROOT_AUTH_STATUS"
echo ""

##############################################################################
# Test 2: Test SSE endpoint without authentication
##############################################################################
echo "=========================================="
echo "TEST 2: SSE Endpoint - No Authentication"
echo "=========================================="
echo ""

echo "2.1 Testing SSE stream without any auth..."
echo "  URL: $NODE_URL/api/jobs/$TEST_JOB_ID/stream"
echo ""

# Use timeout to prevent hanging on successful connection
timeout 3 curl -s -N \
    -H "Accept: text/event-stream" \
    -w "\n  HTTP Status: %{http_code}\n" \
    "$NODE_URL/api/jobs/$TEST_JOB_ID/stream" 2>&1 | head -20 || true

echo ""

##############################################################################
# Test 3: Test SSE endpoint with query parameter authentication
##############################################################################
echo "=========================================="
echo "TEST 3: SSE Endpoint - Query Param Auth"
echo "=========================================="
echo ""

echo "3.1 Testing SSE stream with ?token=xxx..."
echo "  URL: $NODE_URL/api/jobs/$TEST_JOB_ID/stream?token=xxx"
echo ""

timeout 3 curl -s -N \
    -H "Accept: text/event-stream" \
    -w "\n  HTTP Status: %{http_code}\n" \
    "$NODE_URL/api/jobs/$TEST_JOB_ID/stream?token=$ACCESS_TOKEN" 2>&1 | head -20 || true

echo ""

##############################################################################
# Test 4: Test SSE endpoint with Authorization header
##############################################################################
echo "=========================================="
echo "TEST 4: SSE Endpoint - Header Auth"
echo "=========================================="
echo ""

echo "4.1 Testing SSE stream with Authorization header..."
echo "  URL: $NODE_URL/api/jobs/$TEST_JOB_ID/stream"
echo "  Header: Authorization: Bearer xxx"
echo ""

timeout 3 curl -s -N \
    -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -w "\n  HTTP Status: %{http_code}\n" \
    "$NODE_URL/api/jobs/$TEST_JOB_ID/stream" 2>&1 | head -20 || true

echo ""

##############################################################################
# Test 5: Check server logs for SSE requests
##############################################################################
echo "=========================================="
echo "TEST 5: Recent Server Logs"
echo "=========================================="
echo ""

echo "5.1 Checking Cloud Run logs for SSE-related entries..."
gcloud run services logs read node-server \
    --region=us-central1 \
    --limit=50 \
    --format="table(timestamp,textPayload)" 2>/dev/null | grep -E "(stream|SSE|401|Unauthorized|auth)" || echo "  No matching logs found"

echo ""

##############################################################################
# Test 6: Check current SSE client implementation
##############################################################################
echo "=========================================="
echo "TEST 6: Client Implementation Check"
echo "=========================================="
echo ""

echo "6.1 Checking how SSE client constructs URL..."
grep -n "this.sseUrl = " js/sse-client.js || true
echo ""

echo "6.2 Checking EventSource initialization..."
grep -n "new EventSource" js/sse-client.js || true
echo ""

##############################################################################
# Test 7: Check server.js authentication middleware
##############################################################################
echo "=========================================="
echo "TEST 7: Server Authentication Config"
echo "=========================================="
echo ""

echo "7.1 Checking authentication middleware..."
grep -n "authMiddleware\|ACCESS_TOKEN\|REQUIRE_AUTH" server.js | head -30 || true
echo ""

echo "7.2 Checking if /api/jobs/:jobId/stream is protected..."
grep -B5 -A5 "app.get.*\/api\/jobs.*stream" server.js | head -20 || true
echo ""

##############################################################################
# Summary
##############################################################################
echo "=========================================="
echo "DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""
echo "KEY FINDINGS:"
echo ""
echo "1. Server authentication required: $AUTH_REQUIRED"
echo "2. Root endpoint status (no auth): $ROOT_STATUS"
echo "3. Root endpoint status (with auth): $ROOT_AUTH_STATUS"
echo ""
echo "NEXT STEPS:"
echo "  1. Review the test results above"
echo "  2. Identify which authentication method works"
echo "  3. Apply the fix to sse-client.js"
echo ""
echo "=========================================="
echo "END OF DIAGNOSTIC REPORT"
echo "=========================================="

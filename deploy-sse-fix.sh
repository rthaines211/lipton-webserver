#!/bin/bash

##############################################################################
# Deploy SSE Authentication Fix to GCP Cloud Run
#
# This script deploys the updated sse-client.js that includes token
# authentication for SSE connections in production.
##############################################################################

set -e

echo "=========================================="
echo "Deploying SSE Authentication Fix to GCP"
echo "=========================================="
echo ""
echo "Starting: $(date)"
echo ""

# Configuration
PROJECT_ID="docmosis-tornado"
SERVICE_NAME="node-server"
REGION="us-central1"
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

echo "Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo ""

# Verify fix is applied
echo "1. Verifying fix is applied to source files..."
if grep -q "🔐 SSE URL with auth token" js/sse-client.js; then
    echo "  ✅ Fix verified in js/sse-client.js"
else
    echo "  ❌ ERROR: Fix not found in js/sse-client.js"
    echo ""
    echo "Please run ./fix-sse-auth.sh first!"
    exit 1
fi

if grep -q "🔐 SSE URL with auth token" dist/js/sse-client.js; then
    echo "  ✅ Fix verified in dist/js/sse-client.js"
else
    echo "  ❌ ERROR: Fix not found in dist/js/sse-client.js"
    echo ""
    echo "Please run ./fix-sse-auth.sh first!"
    exit 1
fi
echo ""

# Deploy to Cloud Run
echo "2. Deploying to Cloud Run..."
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --platform managed \
  --quiet

echo ""
echo "  ✅ Deployment complete"
echo ""

# Get service URL
echo "3. Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(status.url)')

echo "  Service URL: $SERVICE_URL"
echo ""

# Wait for deployment to stabilize
echo "4. Waiting for deployment to stabilize (10 seconds)..."
sleep 10
echo ""

# Test the deployment
echo "=========================================="
echo "Testing Deployed SSE Fix"
echo "=========================================="
echo ""

echo "5. Testing root endpoint with authentication..."
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/?token=$ACCESS_TOKEN")
echo "  Status: $ROOT_STATUS"

if [ "$ROOT_STATUS" = "200" ] || [ "$ROOT_STATUS" = "304" ]; then
    echo "  ✅ Authentication working"
else
    echo "  ❌ Authentication failed (expected 200, got $ROOT_STATUS)"
fi
echo ""

echo "6. Testing SSE endpoint with token in URL..."
TEST_JOB_ID="deploy-test-$(date +%s)"
SSE_URL="$SERVICE_URL/api/jobs/$TEST_JOB_ID/stream?token=$ACCESS_TOKEN"

echo "  URL: $SSE_URL"
echo "  Testing connection (3 second timeout)..."
echo ""

# Use gtimeout if available (brew install coreutils), otherwise skip
if command -v gtimeout &> /dev/null; then
    gtimeout 3 curl -s -N \
        -H "Accept: text/event-stream" \
        "$SSE_URL" 2>&1 | head -10 || true
elif command -v timeout &> /dev/null; then
    timeout 3 curl -s -N \
        -H "Accept: text/event-stream" \
        "$SSE_URL" 2>&1 | head -10 || true
else
    echo "  (timeout command not available, skipping SSE test)"
fi
echo ""

# Check recent logs
echo "7. Checking recent Cloud Run logs..."
gcloud run services logs read $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --limit=20 \
    --format="table(timestamp,textPayload)" 2>/dev/null | grep -E "(stream|SSE|error|Error)" || echo "  No relevant logs found"
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "NEXT STEPS - Manual Testing Required:"
echo ""
echo "1. Open browser and navigate to:"
echo "   $SERVICE_URL/?token=$ACCESS_TOKEN"
echo ""
echo "2. Open browser Developer Console (F12)"
echo ""
echo "3. Submit a form and verify in console:"
echo "   ✅ Look for: '🔐 SSE URL with auth token: ...'"
echo "   ✅ Look for: '✅ SSE connection opened for ...'"
echo "   ✅ Look for: '📊 Progress update for ...'"
echo "   ❌ Should NOT see: 'GET .../stream 401 (Unauthorized)'"
echo ""
echo "4. Verify progress toast/notifications appear on the page"
echo ""
echo "=========================================="
echo "Troubleshooting"
echo "=========================================="
echo ""
echo "If still getting 401 errors:"
echo ""
echo "A. Check browser console for the exact SSE URL being used"
echo "B. Verify token is in the URL: ?token=xxx"
echo "C. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "D. Check this diagnostic:"
echo "   curl -v \"$SERVICE_URL/api/jobs/test/stream?token=$ACCESS_TOKEN\""
echo ""
echo "If you see errors, run:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=100"
echo ""
echo "=========================================="
echo ""

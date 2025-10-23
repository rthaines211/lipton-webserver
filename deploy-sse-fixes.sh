#!/bin/bash

# SSE Fix Deployment Script for Google Cloud Run
# This script deploys the SSE error fixes to production

set -e

echo "================================================"
echo "      SSE ERROR FIX DEPLOYMENT SCRIPT         "
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
SERVICE_NAME="node-server"
REGION="us-central1"
IMAGE_TAG="sse-fix-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}📋 Pre-deployment Checklist${NC}"
echo "--------------------------------"

# Check if files have been modified
echo -n "✓ Checking if sse-client.js was modified... "
if diff -q js/sse-client.js js/sse-client.js.backup > /dev/null 2>&1; then
    echo -e "${RED}NO CHANGES DETECTED${NC}"
    echo "  ⚠️  Warning: sse-client.js hasn't been modified from backup"
else
    echo -e "${GREEN}MODIFIED${NC}"
fi

echo -n "✓ Checking if server.js was modified... "
if diff -q server.js server.js.backup > /dev/null 2>&1; then
    echo -e "${YELLOW}NOT MODIFIED${NC} (Optional fix)"
else
    echo -e "${GREEN}MODIFIED${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Summary of Changes${NC}"
echo "--------------------------------"
echo "1. Fixed JSON parsing error in sse-client.js"
echo "   - Added check for undefined event.data"
echo "   - Prevents 'undefined is not valid JSON' errors"
echo ""
echo "2. Added completion tracking in sse-client.js"
echo "   - Prevents reconnection after job completion"
echo "   - Reduces unnecessary server load"
echo ""
echo "3. Enhanced server SSE handling in server.js"
echo "   - Sends proper completion event for missing jobs"
echo "   - Graceful handling of non-existent job IDs"
echo ""

# Confirm deployment
read -p "Do you want to deploy these fixes to production? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Starting Deployment Process${NC}"
echo "--------------------------------"

# Step 1: Build Docker image
echo ""
echo "📦 Step 1: Building Docker image..."
echo "   Tag: gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"
gcloud builds submit \
    --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}" \
    --project "${PROJECT_ID}" \
    --timeout=20m

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Step 2: Deploy to Cloud Run
echo ""
echo "☁️  Step 2: Deploying to Cloud Run..."
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"

gcloud run deploy "${SERVICE_NAME}" \
    --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --allow-unauthenticated

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Deployed to Cloud Run successfully${NC}"

# Step 3: Verify deployment
echo ""
echo "🔍 Step 3: Verifying deployment..."

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format="value(status.url)")

echo "   Service URL: ${SERVICE_URL}"

# Test health endpoint
echo -n "   Testing health endpoint... "
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}OK (${HEALTH_STATUS})${NC}"
else
    echo -e "${RED}FAILED (${HEALTH_STATUS})${NC}"
fi

# Test SSE endpoint with non-existent job
echo -n "   Testing SSE endpoint... "
SSE_TEST=$(curl -s -N -m 2 "${SERVICE_URL}/api/jobs/test-deployment/stream" 2>&1 | head -1)
if [[ $SSE_TEST == *"event:"* ]]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}Check manually${NC}"
fi

# Step 4: Monitor logs
echo ""
echo "📊 Step 4: Monitoring initial logs..."
echo "   Fetching last 20 log entries..."
echo ""

gcloud run services logs read "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --limit=20 \
    --format="table(timestamp,textPayload)" | head -25

echo ""
echo "================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
echo "================================================"
echo ""
echo "📋 Post-Deployment Actions:"
echo "  1. Test form submission in production"
echo "  2. Monitor browser console for errors"
echo "  3. Check server logs for SSE connection patterns"
echo ""
echo "🔍 Monitoring Commands:"
echo ""
echo "# Watch live logs:"
echo "gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
echo ""
echo "# Check SSE connections:"
echo "gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=100 --log-filter='textPayload:SSE'"
echo ""
echo "# Test SSE endpoint:"
echo "curl -N '${SERVICE_URL}/api/jobs/test/stream'"
echo ""

# Create rollback script
echo "📝 Creating rollback script..."
cat > rollback-sse-fixes.sh << 'EOF'
#!/bin/bash
echo "🔄 Rolling back SSE fixes..."

# Restore original files
cp js/sse-client.js.backup js/sse-client.js
cp server.js.backup server.js

# Deploy previous version
echo "Rebuilding and deploying original version..."
gcloud builds submit --tag "gcr.io/docmosis-tornado/node-server:rollback" .
gcloud run deploy node-server \
    --image "gcr.io/docmosis-tornado/node-server:rollback" \
    --region us-central1 \
    --allow-unauthenticated

echo "✅ Rollback completed"
EOF

chmod +x rollback-sse-fixes.sh
echo -e "${GREEN}✅ Rollback script created: ./rollback-sse-fixes.sh${NC}"
echo ""
echo "Deployment complete! 🎉"
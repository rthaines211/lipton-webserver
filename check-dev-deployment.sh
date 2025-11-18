#!/bin/bash
#
# Dev Deployment Verification Script
# Checks if the Week 2.5 refactoring changes are deployed
#

DEV_URL="https://node-server-dev-zyiwmzwenq-uc.a.run.app"

echo "=================================================="
echo "Dev Environment Deployment Check"
echo "=================================================="
echo ""

echo "1. Checking health endpoint..."
HEALTH=$(curl -s "$DEV_URL/health")
echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
echo ""

echo "2. Checking if service is running..."
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Service is healthy"
else
    echo "❌ Service may be unhealthy"
fi
echo ""

echo "3. Checking deployment info..."
BRANCH=$(echo "$HEALTH" | jq -r '.deploymentInfo.branch' 2>/dev/null)
echo "Current branch: $BRANCH"
echo ""

if [ "$BRANCH" = "main" ]; then
    echo "✅ Running from main branch (refactoring deployed)"
elif [ "$BRANCH" = "dev/intake-system" ]; then
    echo "⚠️  Still running from dev/intake-system branch"
    echo "   Deployment may still be in progress..."
    echo "   Check: https://github.com/rthaines211/lipton-webserver/actions"
else
    echo "⚠️  Unknown branch: $BRANCH"
fi
echo ""

echo "4. Testing form submission endpoint (requires auth)..."
# This will fail without auth, but shows if endpoint exists
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$DEV_URL/api/form-entries"
echo ""

echo "5. Testing metrics endpoint..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$DEV_URL/metrics"
echo ""

echo "=================================================="
echo "Deployment Status Summary"
echo "=================================================="
echo "Dev URL: $DEV_URL"
echo "GitHub Actions: https://github.com/rthaines211/lipton-webserver/actions"
echo ""
echo "Latest commits:"
git log --oneline -3
echo ""

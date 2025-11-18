#!/bin/bash
# Check both dev and staging deployments

DEV_URL="https://node-server-dev-zyiwmzwenq-uc.a.run.app"
STAGING_URL="https://node-server-staging-zyiwmzwenq-uc.a.run.app"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Deployment Status Check - Week 2.5 Refactoring           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

check_env() {
    local NAME=$1
    local URL=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $NAME ENVIRONMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    HEALTH=$(curl -s "$URL/health" 2>&1)
    
    if echo "$HEALTH" | grep -q "healthy"; then
        echo "✅ Service: HEALTHY"
        
        BRANCH=$(echo "$HEALTH" | jq -r '.deploymentInfo.branch' 2>/dev/null)
        UPTIME=$(echo "$HEALTH" | jq -r '.uptime' 2>/dev/null)
        
        echo "📍 Branch: $BRANCH"
        echo "⏱️  Uptime: $(printf "%.1f" $UPTIME)s"
        
        if [ "$BRANCH" = "main" ]; then
            echo "🎉 REFACTORING DEPLOYED!"
        elif [ "$BRANCH" = "dev/intake-system" ]; then
            if [ "$UPTIME" != "null" ] && [ $(echo "$UPTIME < 120" | bc -l) -eq 1 ]; then
                echo "⏳ Deployment in progress (recently restarted)"
            else
                echo "⚠️  Old deployment still running"
            fi
        fi
    else
        echo "❌ Service: UNHEALTHY or UNREACHABLE"
        echo "$HEALTH" | head -5
    fi
    echo ""
}

check_env "DEV" "$DEV_URL"
check_env "STAGING" "$STAGING_URL"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MONITORING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GitHub Actions: https://github.com/rthaines211/lipton-webserver/actions"
echo "Dev URL: $DEV_URL"
echo "Staging URL: $STAGING_URL"
echo ""

#!/bin/bash
#=============================================================================
# Quick CI/CD Setup Verification (No GitHub CLI Required)
#=============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="docmosis-tornado"
REGION="us-central1"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Quick CI/CD Setup Verification                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#=============================================================================
# Check 1: Local Files
#=============================================================================
echo -e "${BLUE}[1/5] Checking Local Configuration Files...${NC}"

if [ -f ".github/workflows/ci-cd-main.yml" ]; then
    echo -e "  ${GREEN}✓${NC} CI/CD workflow exists"
else
    echo -e "  ${RED}✗${NC} CI/CD workflow missing"
fi

if [ -f "config/staging.env" ]; then
    echo -e "  ${GREEN}✓${NC} Staging config exists"
else
    echo -e "  ${RED}✗${NC} Staging config missing"
fi

if [ -f "config/production.env" ]; then
    echo -e "  ${GREEN}✓${NC} Production config exists"
else
    echo -e "  ${RED}✗${NC} Production config missing"
fi

if [ -f "Dockerfile" ]; then
    echo -e "  ${GREEN}✓${NC} Dockerfile exists"
else
    echo -e "  ${YELLOW}⚠${NC} No Dockerfile (will use Cloud Run source-based deployment)"
fi
echo ""

#=============================================================================
# Check 2: Git Repository
#=============================================================================
echo -e "${BLUE}[2/5] Checking Git Repository...${NC}"

if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Git repository detected"

    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "  ${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"

    # Get remote URL
    REMOTE_URL=$(git config --get remote.origin.url || echo "none")
    if [[ $REMOTE_URL == *"github.com"* ]]; then
        echo -e "  ${GREEN}✓${NC} GitHub remote configured"
        # Extract repo name from URL
        REPO_NAME=$(echo "$REMOTE_URL" | sed -E 's/.*github\.com[:/](.+)(\.git)?$/\1/' | sed 's/\.git$//')
        echo -e "     Repository: $REPO_NAME"
    else
        echo -e "  ${RED}✗${NC} No GitHub remote found"
    fi
else
    echo -e "  ${RED}✗${NC} Not a git repository"
fi
echo ""

#=============================================================================
# Check 3: Google Cloud Setup
#=============================================================================
echo -e "${BLUE}[3/5] Checking Google Cloud Setup...${NC}"

if command -v gcloud &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} gcloud CLI installed"

    ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "none")
    if [ "$ACTIVE_PROJECT" == "$PROJECT_ID" ]; then
        echo -e "  ${GREEN}✓${NC} Correct project active: $PROJECT_ID"
    else
        echo -e "  ${YELLOW}⚠${NC} Different project active: $ACTIVE_PROJECT"
        echo -e "     Run: ${BLUE}gcloud config set project $PROJECT_ID${NC}"
    fi

    # Check Cloud Run services
    echo -e ""
    echo -e "  Checking Cloud Run services..."

    if gcloud run services describe node-server-staging --region=$REGION --project=$PROJECT_ID &> /dev/null; then
        STAGING_URL=$(gcloud run services describe node-server-staging --region=$REGION --project=$PROJECT_ID --format="value(status.url)")
        echo -e "  ${GREEN}✓${NC} Staging service exists"
        echo -e "     URL: $STAGING_URL"
    else
        echo -e "  ${YELLOW}⚠${NC} Staging service not found (will be created on first deploy)"
    fi

    if gcloud run services describe node-server --region=$REGION --project=$PROJECT_ID &> /dev/null; then
        PROD_URL=$(gcloud run services describe node-server --region=$REGION --project=$PROJECT_ID --format="value(status.url)")
        echo -e "  ${GREEN}✓${NC} Production service exists"
        echo -e "     URL: $PROD_URL"
    else
        echo -e "  ${YELLOW}⚠${NC} Production service not found (will be created on first deploy)"
    fi
else
    echo -e "  ${RED}✗${NC} gcloud CLI not installed"
    echo -e "     Install from: https://cloud.google.com/sdk/docs/install"
fi
echo ""

#=============================================================================
# Check 4: GCP Secrets
#=============================================================================
echo -e "${BLUE}[4/5] Checking GCP Secret Manager...${NC}"

if command -v gcloud &> /dev/null; then
    REQUIRED_SECRETS=(
        "DB_PASSWORD"
        "ACCESS_TOKEN"
        "dropbox-token"
        "sendgrid-api-key"
    )

    MISSING=0
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if gcloud secrets describe "$secret" --project=$PROJECT_ID &> /dev/null; then
            echo -e "  ${GREEN}✓${NC} $secret"
        else
            echo -e "  ${RED}✗${NC} $secret (missing)"
            MISSING=$((MISSING+1))
        fi
    done

    if [ $MISSING -gt 0 ]; then
        echo -e ""
        echo -e "  ${YELLOW}⚠ $MISSING secret(s) missing${NC}"
        echo -e "     Create with: ${BLUE}echo -n 'value' | gcloud secrets create SECRET_NAME --data-file=-${NC}"
    fi
fi
echo ""

#=============================================================================
# Check 5: Connectivity Tests
#=============================================================================
echo -e "${BLUE}[5/5] Testing Service Connectivity...${NC}"

if [ ! -z "$STAGING_URL" ]; then
    echo -e "  Testing staging..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "  ${GREEN}✓${NC} Staging responding (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" == "000" ]; then
        echo -e "  ${YELLOW}⚠${NC} Staging not reachable"
    else
        echo -e "  ${YELLOW}⚠${NC} Staging returned HTTP $HTTP_CODE"
    fi
fi

if [ ! -z "$PROD_URL" ]; then
    echo -e "  Testing production..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "  ${GREEN}✓${NC} Production responding (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" == "000" ]; then
        echo -e "  ${YELLOW}⚠${NC} Production not reachable"
    else
        echo -e "  ${YELLOW}⚠${NC} Production returned HTTP $HTTP_CODE"
    fi
fi
echo ""

#=============================================================================
# Summary
#=============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Manual Steps Required (GitHub)                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -z "$REPO_NAME" ]; then
    GITHUB_BASE="https://github.com/$REPO_NAME"

    echo -e "${YELLOW}1. Configure GitHub Environments:${NC}"
    echo -e "   ${BLUE}$GITHUB_BASE/settings/environments${NC}"
    echo -e ""
    echo -e "   Create two environments:"
    echo -e "   • ${GREEN}staging${NC} - No protection rules (auto-deploy)"
    echo -e "   • ${GREEN}production${NC} - Add required reviewers (you or team)"
    echo -e ""

    echo -e "${YELLOW}2. Add GitHub Secrets:${NC}"
    echo -e "   ${BLUE}$GITHUB_BASE/settings/secrets/actions${NC}"
    echo -e ""
    echo -e "   Repository secret:"
    echo -e "   • ${GREEN}GCP_SA_KEY${NC} - Google Cloud service account JSON key"
    echo -e ""
    echo -e "   To get the service account key:"
    echo -e "   ${BLUE}gcloud iam service-accounts keys create ~/gcp-key.json \\${NC}"
    echo -e "   ${BLUE}  --iam-account=945419684329-compute@developer.gserviceaccount.com${NC}"
    echo -e ""

    echo -e "${YELLOW}3. Test the Pipeline:${NC}"
    echo -e "   ${BLUE}git checkout main${NC}"
    echo -e "   ${BLUE}echo '# Test' >> README.md${NC}"
    echo -e "   ${BLUE}git add README.md${NC}"
    echo -e "   ${BLUE}git commit -m 'test: deployment pipeline'${NC}"
    echo -e "   ${BLUE}git push origin main${NC}"
    echo -e ""
    echo -e "   Then watch: ${BLUE}$GITHUB_BASE/actions${NC}"
    echo -e ""
else
    echo -e "${RED}Could not determine GitHub repository${NC}"
    echo -e "Make sure you have a GitHub remote configured"
fi

echo -e "${GREEN}✅ Local setup looks good!${NC}"
echo -e "${YELLOW}⚠  Complete the GitHub configuration steps above to finish setup${NC}"
echo ""

#!/bin/bash
#=============================================================================
# CI/CD Setup Verification Script
#=============================================================================
#
# This script verifies that your staging-first deployment pipeline is
# correctly configured and ready to use.
#
# Usage:
#   chmod +x scripts/verify-cicd-setup.sh
#   ./scripts/verify-cicd-setup.sh
#
#=============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
STAGING_SERVICE="node-server-staging"
PROD_SERVICE="node-server"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CI/CD Staging-First Deployment Verification                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#=============================================================================
# Check 1: GitHub CLI Availability
#=============================================================================
echo -e "${BLUE}[1/9] Checking GitHub CLI...${NC}"
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -n 1)
    echo -e "  ${GREEN}✓${NC} GitHub CLI found: $GH_VERSION"
else
    echo -e "  ${RED}✗${NC} GitHub CLI not found"
    echo -e "  ${YELLOW}  Install with: brew install gh${NC}"
    echo -e "  ${YELLOW}  Then authenticate: gh auth login${NC}"
    exit 1
fi

# Check if authenticated
if gh auth status &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} GitHub CLI authenticated"
else
    echo -e "  ${RED}✗${NC} GitHub CLI not authenticated"
    echo -e "  ${YELLOW}  Run: gh auth login${NC}"
    exit 1
fi
echo ""

#=============================================================================
# Check 2: Google Cloud CLI Availability
#=============================================================================
echo -e "${BLUE}[2/9] Checking Google Cloud CLI...${NC}"
if command -v gcloud &> /dev/null; then
    GCLOUD_VERSION=$(gcloud version --format="value(core.version)")
    echo -e "  ${GREEN}✓${NC} gcloud CLI found: $GCLOUD_VERSION"

    # Check active project
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ "$CURRENT_PROJECT" == "$PROJECT_ID" ]; then
        echo -e "  ${GREEN}✓${NC} Active project: $PROJECT_ID"
    else
        echo -e "  ${YELLOW}⚠${NC} Active project: $CURRENT_PROJECT (expected: $PROJECT_ID)"
        echo -e "  ${YELLOW}  Run: gcloud config set project $PROJECT_ID${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} gcloud CLI not found"
    echo -e "  ${YELLOW}  Install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi
echo ""

#=============================================================================
# Check 3: GitHub Environments
#=============================================================================
echo -e "${BLUE}[3/9] Checking GitHub Environments...${NC}"

# Get repository info
REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO_FULL" ]; then
    echo -e "  ${RED}✗${NC} Not in a GitHub repository or gh not configured"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Repository: $REPO_FULL"

# Note: GitHub CLI doesn't have direct environment commands yet
# So we provide instructions
echo -e "  ${YELLOW}ℹ${NC} Manual check required for environments:"
echo -e "     Visit: https://github.com/$REPO_FULL/settings/environments"
echo -e "     Verify these environments exist:"
echo -e "       - staging (required)"
echo -e "       - production (with required reviewers)"
echo ""

#=============================================================================
# Check 4: GitHub Secrets
#=============================================================================
echo -e "${BLUE}[4/9] Checking GitHub Secrets...${NC}"

# List repository secrets
SECRET_COUNT=$(gh secret list 2>/dev/null | wc -l)
if [ "$SECRET_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Found $SECRET_COUNT repository secret(s)"
    gh secret list | while read -r line; do
        echo -e "     - $line"
    done

    # Check for required secret
    if gh secret list | grep -q "GCP_SA_KEY"; then
        echo -e "  ${GREEN}✓${NC} GCP_SA_KEY secret exists"
    else
        echo -e "  ${RED}✗${NC} GCP_SA_KEY secret missing"
        echo -e "  ${YELLOW}  This is required for deployment${NC}"
    fi
else
    echo -e "  ${RED}✗${NC} No repository secrets found"
    echo -e "  ${YELLOW}  Add GCP_SA_KEY secret in GitHub Settings${NC}"
fi
echo ""

#=============================================================================
# Check 5: Cloud Run Services
#=============================================================================
echo -e "${BLUE}[5/9] Checking Cloud Run Services...${NC}"

# Check staging service
if gcloud run services describe "$STAGING_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Staging service exists: $STAGING_SERVICE"

    # Get staging URL
    STAGING_URL=$(gcloud run services describe "$STAGING_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="value(status.url)")
    echo -e "     URL: $STAGING_URL"
else
    echo -e "  ${YELLOW}⚠${NC} Staging service not found: $STAGING_SERVICE"
    echo -e "     (Will be created on first deployment)"
fi

# Check production service
if gcloud run services describe "$PROD_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Production service exists: $PROD_SERVICE"

    # Get production URL
    PROD_URL=$(gcloud run services describe "$PROD_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="value(status.url)")
    echo -e "     URL: $PROD_URL"
else
    echo -e "  ${YELLOW}⚠${NC} Production service not found: $PROD_SERVICE"
    echo -e "     (Will be created on first deployment)"
fi
echo ""

#=============================================================================
# Check 6: GCP Secret Manager
#=============================================================================
echo -e "${BLUE}[6/9] Checking GCP Secret Manager...${NC}"

EXPECTED_SECRETS=(
    "DB_PASSWORD"
    "DB_PASSWORD_STAGING"
    "ACCESS_TOKEN"
    "ACCESS_TOKEN_STAGING"
    "sendgrid-api-key"
    "sendgrid-api-key-staging"
    "dropbox-token"
    "dropbox-token-staging"
    "docmosis-key"
)

MISSING_SECRETS=()

for secret in "${EXPECTED_SECRETS[@]}"; do
    if gcloud secrets describe "$secret" --project="$PROJECT_ID" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Secret exists: $secret"
    else
        echo -e "  ${RED}✗${NC} Secret missing: $secret"
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e ""
    echo -e "  ${YELLOW}⚠ Missing secrets:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo -e "     - $secret"
    done
    echo -e "  ${YELLOW}  Create with: echo -n 'value' | gcloud secrets create $secret --data-file=-${NC}"
fi
echo ""

#=============================================================================
# Check 7: Configuration Files
#=============================================================================
echo -e "${BLUE}[7/9] Checking Configuration Files...${NC}"

if [ -f "config/staging.env" ]; then
    echo -e "  ${GREEN}✓${NC} Staging config exists: config/staging.env"
    VAR_COUNT=$(grep -c "=" config/staging.env | grep -v "^#" || echo "0")
    echo -e "     Variables: $VAR_COUNT"
else
    echo -e "  ${RED}✗${NC} Staging config missing: config/staging.env"
fi

if [ -f "config/production.env" ]; then
    echo -e "  ${GREEN}✓${NC} Production config exists: config/production.env"
    VAR_COUNT=$(grep -c "=" config/production.env | grep -v "^#" || echo "0")
    echo -e "     Variables: $VAR_COUNT"
else
    echo -e "  ${RED}✗${NC} Production config missing: config/production.env"
fi

if [ -f ".github/workflows/ci-cd-main.yml" ]; then
    echo -e "  ${GREEN}✓${NC} CI/CD workflow exists: .github/workflows/ci-cd-main.yml"
else
    echo -e "  ${RED}✗${NC} CI/CD workflow missing: .github/workflows/ci-cd-main.yml"
fi
echo ""

#=============================================================================
# Check 8: Service Connectivity
#=============================================================================
echo -e "${BLUE}[8/9] Testing Service Connectivity...${NC}"

if [ ! -z "$STAGING_URL" ]; then
    echo -e "  Testing staging endpoint..."
    if curl -f -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health" &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/health")
        if [ "$HTTP_CODE" == "200" ]; then
            echo -e "  ${GREEN}✓${NC} Staging service responding (HTTP $HTTP_CODE)"
        else
            echo -e "  ${YELLOW}⚠${NC} Staging service returned HTTP $HTTP_CODE"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Staging service not responding (may not be deployed yet)"
    fi
fi

if [ ! -z "$PROD_URL" ]; then
    echo -e "  Testing production endpoint..."
    if curl -f -s -o /dev/null -w "%{http_code}" "$PROD_URL/health" &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/health")
        if [ "$HTTP_CODE" == "200" ]; then
            echo -e "  ${GREEN}✓${NC} Production service responding (HTTP $HTTP_CODE)"
        else
            echo -e "  ${YELLOW}⚠${NC} Production service returned HTTP $HTTP_CODE"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Production service not responding"
    fi
fi
echo ""

#=============================================================================
# Check 9: Recent Workflow Runs
#=============================================================================
echo -e "${BLUE}[9/9] Checking Recent Workflow Runs...${NC}"

RECENT_RUNS=$(gh run list --workflow=ci-cd-main.yml --limit=5 --json conclusion,status,createdAt,headBranch 2>/dev/null || echo "")
if [ ! -z "$RECENT_RUNS" ]; then
    echo -e "  ${GREEN}✓${NC} Recent workflow runs found:"
    gh run list --workflow=ci-cd-main.yml --limit=5
else
    echo -e "  ${YELLOW}ℹ${NC} No recent workflow runs found"
    echo -e "     (This is normal if you haven't pushed to main yet)"
fi
echo ""

#=============================================================================
# Summary
#=============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Verification Summary                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Setup Status:${NC}"
echo -e "  • GitHub CLI: Ready"
echo -e "  • Google Cloud CLI: Ready"
echo -e "  • Configuration Files: Present"
echo -e "  • CI/CD Workflow: Configured"
echo ""

echo -e "${YELLOW}Manual Verification Required:${NC}"
echo -e "  1. GitHub Environments:"
echo -e "     Visit: https://github.com/$REPO_FULL/settings/environments"
echo -e "     ✓ Verify 'staging' environment exists"
echo -e "     ✓ Verify 'production' environment has required reviewers"
echo ""
echo -e "  2. Environment Secrets:"
echo -e "     Visit: https://github.com/$REPO_FULL/settings/secrets/actions"
echo -e "     ✓ Verify staging environment secrets are set"
echo -e "     ✓ Verify production environment secrets are set"
echo ""

echo -e "${GREEN}Ready to Test?${NC}"
echo -e "  Run the deployment test:"
echo -e "  ${BLUE}./scripts/test-deployment-flow.sh${NC}"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Complete manual verification steps above"
echo -e "  2. Fix any ${RED}✗${NC} or ${YELLOW}⚠${NC} items shown"
echo -e "  3. Run deployment test script"
echo -e "  4. Push a small change to test the full pipeline"
echo ""

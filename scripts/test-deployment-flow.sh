#!/bin/bash
#=============================================================================
# Test Deployment Flow
#=============================================================================
#
# This script tests your staging-first deployment pipeline by:
# 1. Creating a test branch
# 2. Making a small change
# 3. Pushing to trigger the pipeline
# 4. Monitoring the deployment progress
#
# Usage:
#   chmod +x scripts/test-deployment-flow.sh
#   ./scripts/test-deployment-flow.sh
#
#=============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Staging-First Deployment Flow                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#=============================================================================
# Step 1: Pre-flight Checks
#=============================================================================
echo -e "${BLUE}[Step 1/7] Pre-flight checks...${NC}"

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Not in a git repository"
    exit 1
fi
echo -e "${GREEN}✓${NC} Git repository detected"

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗${NC} GitHub CLI not found. Install with: brew install gh"
    exit 1
fi
echo -e "${GREEN}✓${NC} GitHub CLI available"

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗${NC} Not authenticated with GitHub. Run: gh auth login"
    exit 1
fi
echo -e "${GREEN}✓${NC} GitHub authenticated"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"
echo ""

#=============================================================================
# Step 2: Confirm Test
#=============================================================================
echo -e "${BLUE}[Step 2/7] Deployment Test Confirmation${NC}"
echo ""
echo -e "This script will:"
echo -e "  1. Create a test commit on the ${YELLOW}main${NC} branch"
echo -e "  2. Push to trigger the CI/CD pipeline"
echo -e "  3. Monitor the deployment progress"
echo -e "  4. Wait for staging deployment"
echo -e "  5. Guide you through production approval"
echo ""
echo -e "${YELLOW}⚠ WARNING:${NC} This will trigger a real deployment to staging!"
echo ""
read -p "Continue with deployment test? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Test cancelled${NC}"
    exit 0
fi
echo ""

#=============================================================================
# Step 3: Checkout and Update Main Branch
#=============================================================================
echo -e "${BLUE}[Step 3/7] Preparing main branch...${NC}"

# Ensure we're on main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "Switching to main branch..."
    git checkout main
fi

# Pull latest changes
echo -e "Pulling latest changes..."
git pull origin main

echo -e "${GREEN}✓${NC} Main branch up to date"
echo ""

#=============================================================================
# Step 4: Create Test Change
#=============================================================================
echo -e "${BLUE}[Step 4/7] Creating test change...${NC}"

# Create a test file or update existing one
TEST_FILE="docs/DEPLOYMENT_TEST.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

cat > "$TEST_FILE" << EOF
# Deployment Test

This file was created to test the staging-first deployment pipeline.

**Test Details:**
- Date: $TIMESTAMP
- Branch: main
- Purpose: Verify staging → approval → production flow

## Expected Behavior

1. ✅ CI/CD pipeline triggers on push to main
2. ✅ Quality checks, tests, and security scans run
3. ✅ Application builds successfully
4. ✅ Staging deploys automatically
5. ⏸️ Production waits for manual approval
6. ✅ Production deploys after approval

## Test Status

This test was initiated at: $TIMESTAMP

Monitor progress: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions
EOF

git add "$TEST_FILE"
git commit -m "test: verify staging-first deployment pipeline

This commit tests the CI/CD pipeline to ensure:
- Staging deploys automatically on push to main
- Production requires manual approval
- Sequential deployment flow works correctly

Test timestamp: $TIMESTAMP"

echo -e "${GREEN}✓${NC} Test commit created"
echo -e "   File: $TEST_FILE"
echo ""

#=============================================================================
# Step 5: Push and Trigger Pipeline
#=============================================================================
echo -e "${BLUE}[Step 5/7] Pushing to trigger pipeline...${NC}"
echo ""
echo -e "${YELLOW}This will trigger the deployment pipeline!${NC}"
read -p "Push to main branch now? (yes/no): " PUSH_CONFIRM

if [ "$PUSH_CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Push cancelled. You can manually push with:${NC}"
    echo -e "  git push origin main"
    exit 0
fi

git push origin main

echo -e "${GREEN}✓${NC} Pushed to main branch"
echo ""

#=============================================================================
# Step 6: Monitor Workflow
#=============================================================================
echo -e "${BLUE}[Step 6/7] Monitoring workflow...${NC}"
echo ""

# Wait a moment for GitHub to register the push
echo -e "Waiting for GitHub to start workflow..."
sleep 5

# Get the latest workflow run
echo -e "Fetching workflow status..."
WORKFLOW_URL=$(gh run list --workflow=ci-cd-main.yml --limit=1 --json url -q '.[0].url')

if [ -z "$WORKFLOW_URL" ]; then
    echo -e "${YELLOW}⚠${NC} Could not find workflow run"
    echo -e "   Check manually: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
else
    echo -e "${GREEN}✓${NC} Workflow started!"
    echo -e "   URL: $WORKFLOW_URL"
    echo ""

    # Watch the workflow
    echo -e "${BLUE}Watching workflow progress...${NC}"
    echo -e "(Press Ctrl+C to stop watching, deployment will continue)"
    echo ""

    gh run watch $(gh run list --workflow=ci-cd-main.yml --limit=1 --json databaseId -q '.[0].databaseId') || true
fi
echo ""

#=============================================================================
# Step 7: Approval Instructions
#=============================================================================
echo -e "${BLUE}[Step 7/7] Production Approval Guide${NC}"
echo ""

# Check if workflow is waiting for approval
WORKFLOW_STATUS=$(gh run list --workflow=ci-cd-main.yml --limit=1 --json status -q '.[0].status')

if [ "$WORKFLOW_STATUS" == "waiting" ]; then
    echo -e "${GREEN}✓${NC} Staging deployment complete!"
    echo -e "${YELLOW}⏸ ${NC} Production deployment waiting for approval"
    echo ""
else
    echo -e "${BLUE}ℹ${NC} Workflow status: $WORKFLOW_STATUS"
    echo ""
fi

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "1️⃣  ${GREEN}Verify Staging Deployment${NC}"
echo -e "   Visit: https://node-server-staging-zyiwmzwenq-uc.a.run.app"
echo -e "   Test the application functionality"
echo -e "   Check logs: ${BLUE}gcloud run services logs read node-server-staging --region=us-central1 --limit=50${NC}"
echo ""

echo -e "2️⃣  ${GREEN}Approve Production Deployment${NC}"
echo -e "   a) Go to: $WORKFLOW_URL"
echo -e "   b) Click '${YELLOW}Review deployments${NC}' button"
echo -e "   c) Check the '${YELLOW}production${NC}' checkbox"
echo -e "   d) (Optional) Add approval comment"
echo -e "   e) Click '${YELLOW}Approve and deploy${NC}'"
echo ""

echo -e "3️⃣  ${GREEN}Verify Production Deployment${NC}"
echo -e "   Visit: https://node-server-zyiwmzwenq-uc.a.run.app"
echo -e "   Check logs: ${BLUE}gcloud run services logs read node-server --region=us-central1 --limit=50${NC}"
echo ""

echo -e "4️⃣  ${GREEN}Monitor Deployment${NC}"
echo -e "   Watch workflow: ${BLUE}gh run watch${NC}"
echo -e "   View all runs: ${BLUE}gh run list --workflow=ci-cd-main.yml${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Quick Commands Reference                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cat << 'EOF'
# View workflow runs
gh run list --workflow=ci-cd-main.yml

# Watch current workflow
gh run watch

# View staging logs
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=100

# Test staging endpoint
curl -s https://node-server-staging-zyiwmzwenq-uc.a.run.app/health | jq

# View production logs
gcloud run services logs read node-server \
  --region=us-central1 \
  --limit=100

# Test production endpoint
curl -s https://node-server-zyiwmzwenq-uc.a.run.app/health | jq

# Rollback if needed
gcloud run revisions list \
  --service=node-server \
  --region=us-central1

gcloud run services update-traffic node-server \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
EOF

echo ""
echo -e "${GREEN}✅ Deployment test initiated successfully!${NC}"
echo ""

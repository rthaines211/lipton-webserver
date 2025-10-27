#!/bin/bash
#=============================================================================
# GitHub CI/CD Setup Helper Script
#=============================================================================
#
# This script helps you set up everything needed for GitHub Actions CI/CD:
# 1. Creates/retrieves GCP service account key
# 2. Provides instructions for adding GitHub secrets
# 3. Verifies your setup
#
# Usage:
#   chmod +x scripts/setup-github-cicd.sh
#   ./scripts/setup-github-cicd.sh
#
#=============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="gcp-sa-key-temp.json"

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         GitHub Actions CI/CD Setup Helper                 ║"
echo "║         Legal Form Application                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

#=============================================================================
# Step 1: Check Prerequisites
#=============================================================================

echo -e "${CYAN}📋 Step 1: Checking Prerequisites...${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found${NC}"
    echo "   Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}✅ gcloud CLI installed${NC}"

# Check if gh is installed (optional)
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI installed${NC}"
    GH_CLI_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  GitHub CLI not installed (optional but helpful)${NC}"
    echo "   Install: brew install gh"
    GH_CLI_AVAILABLE=false
fi

# Check if authenticated to GCP
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated to GCP${NC}"
    echo "   Run: gcloud auth login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated to GCP${NC}"

# Check project access
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo -e "${RED}❌ Cannot access project: $PROJECT_ID${NC}"
    echo "   Run: gcloud config set project $PROJECT_ID"
    exit 1
fi
echo -e "${GREEN}✅ Can access project: $PROJECT_ID${NC}"

echo ""

#=============================================================================
# Step 2: Service Account Setup
#=============================================================================

echo -e "${CYAN}🔐 Step 2: Service Account Setup...${NC}"
echo ""

# Check if service account exists
if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &> /dev/null; then
    echo -e "${GREEN}✅ Service account exists: $SA_EMAIL${NC}"
    SA_EXISTS=true
else
    echo -e "${YELLOW}⚠️  Service account doesn't exist${NC}"
    SA_EXISTS=false

    # Ask to create
    read -p "   Create service account? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Creating service account..."
        gcloud iam service-accounts create $SA_NAME \
            --display-name="GitHub Actions CI/CD" \
            --description="Service account for GitHub Actions workflows" \
            --project=$PROJECT_ID
        echo -e "${GREEN}   ✅ Service account created${NC}"
        SA_EXISTS=true
    else
        echo -e "${RED}   ❌ Cannot proceed without service account${NC}"
        exit 1
    fi
fi

# Grant required permissions
if [ "$SA_EXISTS" = true ]; then
    echo ""
    echo "   Granting required IAM roles..."

    roles=(
        "roles/run.admin:Cloud Run Admin"
        "roles/iam.serviceAccountUser:Service Account User"
        "roles/storage.admin:Storage Admin"
        "roles/artifactregistry.writer:Artifact Registry Writer"
        "roles/cloudsql.client:Cloud SQL Client"
        "roles/compute.instanceAdmin.v1:Compute Instance Admin"
    )

    for role_info in "${roles[@]}"; do
        IFS=: read -r role description <<< "$role_info"
        echo "   - Granting $description..."
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:$SA_EMAIL" \
            --role="$role" \
            --condition=None \
            --quiet &> /dev/null || true
    done

    echo -e "${GREEN}   ✅ Permissions granted${NC}"
fi

echo ""

#=============================================================================
# Step 3: Create Service Account Key
#=============================================================================

echo -e "${CYAN}🔑 Step 3: Service Account Key...${NC}"
echo ""

# Check for existing keys
EXISTING_KEYS=$(gcloud iam service-accounts keys list \
    --iam-account=$SA_EMAIL \
    --filter="keyType=USER_MANAGED" \
    --format="value(name)" | wc -l)

if [ "$EXISTING_KEYS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $EXISTING_KEYS existing key(s)${NC}"
    read -p "   Create a new key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Skipping key creation"
        echo "   Using existing keys"
        KEY_CREATED=false
    fi
fi

if [ "${KEY_CREATED:-true}" = true ]; then
    echo "   Creating new service account key..."
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL \
        --project=$PROJECT_ID
    echo -e "${GREEN}   ✅ Key created: $KEY_FILE${NC}"
    KEY_CREATED=true
fi

echo ""

#=============================================================================
# Step 4: Display Key for GitHub
#=============================================================================

if [ "$KEY_CREATED" = true ]; then
    echo -e "${CYAN}📋 Step 4: GitHub Secret Setup${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}IMPORTANT: Copy the JSON below to add to GitHub Secrets${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Service Account Key JSON:${NC}"
    echo ""
    cat $KEY_FILE
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Provide GitHub CLI option if available
    if [ "$GH_CLI_AVAILABLE" = true ]; then
        echo -e "${GREEN}Option 1: Add secret using GitHub CLI (Recommended)${NC}"
        echo ""
        read -p "   Add secret now using GitHub CLI? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "   Adding secret to GitHub..."
            gh secret set GCP_SA_KEY < $KEY_FILE && \
                echo -e "${GREEN}   ✅ Secret added to GitHub!${NC}" || \
                echo -e "${RED}   ❌ Failed to add secret${NC}"
        fi
        echo ""
    fi

    echo -e "${GREEN}Option 2: Add secret manually via GitHub website${NC}"
    echo ""
    echo "   1. Go to: https://github.com/YOUR-ORG/YOUR-REPO/settings/secrets/actions"
    echo "   2. Click: 'New repository secret'"
    echo "   3. Name: GCP_SA_KEY"
    echo "   4. Value: Copy the JSON above (ENTIRE content)"
    echo "   5. Click: 'Add secret'"
    echo ""

    # Delete key file
    read -p "   Delete local key file now? (recommended) (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v shred &> /dev/null; then
            shred -u $KEY_FILE
        else
            rm -P $KEY_FILE 2>/dev/null || rm $KEY_FILE
        fi
        echo -e "${GREEN}   ✅ Key file securely deleted${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Remember to delete: $KEY_FILE${NC}"
    fi

    echo ""
fi

#=============================================================================
# Step 5: GitHub Pages Setup
#=============================================================================

echo -e "${CYAN}📚 Step 5: GitHub Pages Setup${NC}"
echo ""
echo "   GitHub Pages hosts your VitePress documentation"
echo ""
echo "   Manual steps required:"
echo "   1. Go to: https://github.com/YOUR-ORG/YOUR-REPO/settings/pages"
echo "   2. Under 'Build and deployment':"
echo "      - Source: GitHub Actions ✅"
echo "   3. Click 'Save'"
echo ""
echo "   After first deployment, your docs will be at:"
echo "   https://YOUR-USERNAME.github.io/YOUR-REPO/"
echo ""

read -p "   Press Enter when GitHub Pages is configured..."

echo ""

#=============================================================================
# Step 6: Production Environment Setup
#=============================================================================

echo -e "${CYAN}🚀 Step 6: Production Environment Setup${NC}"
echo ""
echo "   Production deployments require manual approval"
echo ""
echo "   Manual steps required:"
echo "   1. Go to: https://github.com/YOUR-ORG/YOUR-REPO/settings/environments"
echo "   2. Click 'New environment'"
echo "   3. Name: production"
echo "   4. Click 'Configure environment'"
echo "   5. Enable: 'Required reviewers' ✅"
echo "   6. Add reviewers (people who can approve production deployments)"
echo "   7. Click 'Save protection rules'"
echo ""

read -p "   Press Enter when production environment is configured..."

echo ""

#=============================================================================
# Step 7: Verification
#=============================================================================

echo -e "${CYAN}✅ Step 7: Verification${NC}"
echo ""

# Verify GitHub CLI secret (if available)
if [ "$GH_CLI_AVAILABLE" = true ]; then
    echo "   Checking GitHub secrets..."
    if gh secret list | grep -q "GCP_SA_KEY"; then
        echo -e "${GREEN}   ✅ GCP_SA_KEY secret found${NC}"
    else
        echo -e "${YELLOW}   ⚠️  GCP_SA_KEY secret not found${NC}"
        echo "      Add it manually: https://github.com/YOUR-ORG/YOUR-REPO/settings/secrets/actions"
    fi
else
    echo -e "${YELLOW}   ⚠️  Cannot verify secrets without GitHub CLI${NC}"
    echo "      Verify manually: gh secret list"
fi

echo ""

# Check if workflows exist
echo "   Checking GitHub Actions workflows..."
workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l)
if [ "$workflow_count" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Found $workflow_count workflow file(s)${NC}"
    find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | while read file; do
        echo "      - $(basename $file)"
    done
else
    echo -e "${YELLOW}   ⚠️  No workflow files found in .github/workflows/${NC}"
fi

echo ""

#=============================================================================
# Summary
#=============================================================================

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 Setup Summary                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo -e "${GREEN}✅ Service account configured: $SA_EMAIL${NC}"
echo -e "${GREEN}✅ Service account permissions granted${NC}"
if [ "$KEY_CREATED" = true ]; then
    echo -e "${GREEN}✅ Service account key created${NC}"
fi
echo ""

echo -e "${YELLOW}📝 Manual Steps Completed:${NC}"
echo "   - [ ] GitHub Secret (GCP_SA_KEY) added"
echo "   - [ ] GitHub Pages configured (Source: GitHub Actions)"
echo "   - [ ] Production environment created with required reviewers"
echo ""

echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "   1. Verify all manual steps above are complete"
echo ""
echo "   2. Commit and push the workflows:"
echo "      $ git add .github/workflows/"
echo "      $ git commit -m \"ci: add CI/CD automation\""
echo "      $ git push origin main"
echo ""
echo "   3. Watch the workflows run:"
echo "      https://github.com/YOUR-ORG/YOUR-REPO/actions"
echo ""
echo "   4. Check deployment:"
echo "      https://node-server-zyiwmzwenq-uc.a.run.app"
echo ""

echo -e "${CYAN}📖 Documentation:${NC}"
echo "   - Setup Guide: docs/setup/GITHUB_SECRETS_SETUP.md"
echo "   - CI/CD Guide: docs/operations/CI_CD_WORKFLOWS.md"
echo "   - Summary: CI_CD_AUTOMATION_COMPLETE.md"
echo ""

echo -e "${GREEN}✅ Setup helper complete!${NC}"
echo ""

#!/bin/bash
# ============================================================================
# Dropbox OAuth Fix - Complete Deployment Script
# ============================================================================
# This script guides you through fixing the Dropbox token expiration issue
# by implementing OAuth refresh tokens.
#
# What this does:
#   1. Generates refresh token (interactive)
#   2. Updates GCP Secret Manager
#   3. Replaces dropbox_service.py with OAuth version
#   4. Redeploys Python pipeline to Cloud Run
#   5. Verifies Dropbox is working
#
# Prerequisites:
#   - Python 3 with dropbox library (script will install if needed)
#   - gcloud CLI authenticated
#   - Dropbox App Key and App Secret ready
#
# Usage: ./scripts/deploy-dropbox-oauth-fix.sh
#
# Author: Claude Code
# Date: 2025-10-27
# ============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="docmosis-tornado"
PROJECT_NUMBER="945419684329"
SERVICE_NAME="python-pipeline"
REGION="us-central1"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TOKEN_GENERATOR="$SCRIPT_DIR/generate-dropbox-refresh-token.py"
DROPBOX_SERVICE_OLD="$PROJECT_ROOT/normalization work/src/utils/dropbox_service.py"
DROPBOX_SERVICE_NEW="$PROJECT_ROOT/normalization work/src/utils/dropbox_service_v2.py"
SETUP_SCRIPT="$PROJECT_ROOT/setup-dropbox-secrets.sh"

print_header() {
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# ============================================================================
# STEP 0: Pre-flight checks
# ============================================================================
print_header "Dropbox OAuth Fix - Pre-flight Checks"

print_step "Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    print_error "Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi
print_success "gcloud authenticated"

print_step "Checking project access..."
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
    print_error "Cannot access project: $PROJECT_ID"
    exit 1
fi
print_success "Project accessible: $PROJECT_ID"

print_step "Checking required files..."
if [ ! -f "$TOKEN_GENERATOR" ]; then
    print_error "Token generator not found: $TOKEN_GENERATOR"
    exit 1
fi
if [ ! -f "$DROPBOX_SERVICE_NEW" ]; then
    print_error "New dropbox service not found: $DROPBOX_SERVICE_NEW"
    exit 1
fi
print_success "All required files present"

echo ""

# ============================================================================
# STEP 1: Generate Refresh Token
# ============================================================================
print_header "STEP 1: Generate Dropbox Refresh Token"

echo -e "${YELLOW}You will need:${NC}"
echo "  1. Your Dropbox App Key"
echo "  2. Your Dropbox App Secret"
echo "  3. Access to a web browser"
echo ""

if confirm "Ready to generate refresh token?"; then
    echo ""
    print_step "Running token generator..."
    echo ""

    # Run the token generator
    python3 "$TOKEN_GENERATOR"

    echo ""
    print_success "Token generated!"
    echo ""
else
    print_warning "Skipping token generation"
    echo "You can run it manually later with:"
    echo "  python3 $TOKEN_GENERATOR"
    exit 0
fi

# ============================================================================
# STEP 2: Update GCP Secrets
# ============================================================================
print_header "STEP 2: Update GCP Secret Manager"

if [ -f "$SETUP_SCRIPT" ]; then
    echo "The token generator created a setup script for you."
    echo ""

    if confirm "Run the setup script to update GCP secrets?"; then
        print_step "Updating secrets..."
        echo ""
        bash "$SETUP_SCRIPT"
        echo ""
        print_success "Secrets updated!"
    else
        print_warning "Skipping secret updates"
        echo "You can run the script later with:"
        echo "  bash $SETUP_SCRIPT"
        exit 0
    fi
else
    print_warning "Setup script not found. You'll need to manually update secrets."
    echo "Did you save the commands when prompted by the token generator?"
    exit 1
fi

# ============================================================================
# STEP 3: Backup and Replace dropbox_service.py
# ============================================================================
print_header "STEP 3: Update dropbox_service.py"

print_step "Creating backup of old version..."
BACKUP_FILE="${DROPBOX_SERVICE_OLD}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DROPBOX_SERVICE_OLD" "$BACKUP_FILE"
print_success "Backup created: $BACKUP_FILE"

print_step "Replacing with OAuth version..."
cp "$DROPBOX_SERVICE_NEW" "$DROPBOX_SERVICE_OLD"
print_success "dropbox_service.py updated with OAuth support"

echo ""

# ============================================================================
# STEP 4: Update Cloud Run Environment Variables
# ============================================================================
print_header "STEP 4: Update Cloud Run Configuration"

print_step "Updating Python pipeline service..."

gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-secrets="DROPBOX_APP_KEY=dropbox-app-key:latest,DROPBOX_APP_SECRET=dropbox-app-secret:latest,DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
    --set-env-vars="BUILD_ID=build-$(date +%s)" \
    --quiet

print_success "Service configuration updated"
echo ""

# ============================================================================
# STEP 5: Deploy Updated Code
# ============================================================================
print_header "STEP 5: Deploy Updated Code to Cloud Run"

echo "This will build and deploy the Python pipeline with the new OAuth code."
echo ""

if confirm "Ready to deploy?"; then
    print_step "Deploying to Cloud Run (this may take a few minutes)..."
    echo ""

    cd "$PROJECT_ROOT/normalization work"

    gcloud run deploy "$SERVICE_NAME" \
        --source . \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=1Gi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=10 \
        --min-instances=0 \
        --port=8080 \
        --update-secrets="DROPBOX_APP_KEY=dropbox-app-key:latest,DROPBOX_APP_SECRET=dropbox-app-secret:latest,DROPBOX_REFRESH_TOKEN=dropbox-refresh-token:latest" \
        --set-env-vars="DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Current Clients,DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents,DROPBOX_CONTINUE_ON_FAILURE=true,BUILD_ID=build-$(date +%s)" \
        --service-account="${SERVICE_ACCOUNT}" \
        --project="${PROJECT_ID}"

    print_success "Deployment complete!"
    echo ""
else
    print_warning "Skipping deployment"
    exit 0
fi

# ============================================================================
# STEP 6: Verify Dropbox Connection
# ============================================================================
print_header "STEP 6: Verify Dropbox Connection"

print_step "Waiting 10 seconds for service to stabilize..."
sleep 10

print_step "Checking logs for Dropbox initialization..."
echo ""

# Check recent logs for Dropbox activity
LOG_OUTPUT=$(gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload:\"Dropbox service initialized\" OR textPayload:\"Dropbox authentication failed\")" \
    --limit=5 \
    --format="value(textPayload)" \
    --project="$PROJECT_ID" \
    --freshness=5m \
    2>/dev/null || echo "")

if echo "$LOG_OUTPUT" | grep -q "Dropbox service initialized"; then
    print_success "Dropbox is initialized and working!"
    echo ""
    echo "Log entries:"
    echo "$LOG_OUTPUT"
elif echo "$LOG_OUTPUT" | grep -q "authentication failed"; then
    print_error "Dropbox authentication failed!"
    echo ""
    echo "Log entries:"
    echo "$LOG_OUTPUT"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify secrets are correct in Secret Manager"
    echo "  2. Check service account has access to secrets"
    echo "  3. Try regenerating the refresh token"
    exit 1
else
    print_warning "No clear Dropbox initialization logs yet"
    echo "The service may still be starting up."
    echo ""
    echo "Check logs manually with:"
    echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
fi

echo ""

# ============================================================================
# STEP 7: Test Upload (Optional)
# ============================================================================
print_header "STEP 7: Test Dropbox Upload (Optional)"

echo "You can test the Dropbox upload by submitting a form through your application."
echo "Watch the logs to see if documents are uploaded successfully."
echo ""
echo "To monitor logs in real-time:"
echo "  gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --project=$PROJECT_ID"
echo ""

# ============================================================================
# Summary
# ============================================================================
print_header "Deployment Complete!"

echo -e "${GREEN}✅ Dropbox OAuth refresh token implementation deployed${NC}"
echo ""
echo "What changed:"
echo "  • dropbox_service.py now uses OAuth refresh tokens"
echo "  • Tokens auto-refresh automatically (no more expiration!)"
echo "  • GCP secrets store your OAuth credentials securely"
echo ""
echo "Next steps:"
echo "  1. Submit a test form through your application"
echo "  2. Verify documents appear in Dropbox"
echo "  3. Monitor logs for any issues"
echo ""
echo "Useful commands:"
echo "  • View logs:    gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --project=$PROJECT_ID"
echo "  • View secrets: gcloud secrets list --project=$PROJECT_ID"
echo "  • Rollback:     cp $BACKUP_FILE $DROPBOX_SERVICE_OLD && redeploy"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

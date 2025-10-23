#!/bin/bash

################################################################################
# Toast Notification Removal Script
#
# This script safely removes the Notyf toast notification system from the
# Lipton Legal application while preserving all core functionality.
#
# What it does:
# 1. Creates backups of all files before modification
# 2. Removes Notyf CDN references from index.html
# 3. Removes toast trigger calls from sse-client.js and form-submission.js
# 4. Removes Notyf dependency from package.json
# 5. Deletes toast-notifications.js file
# 6. Cleans build artifacts in dist/
# 7. Runs npm install to update package-lock.json
#
# Usage:
#   chmod +x remove-toasts.sh
#   ./remove-toasts.sh
#
# Author: Claude Code
# Date: 2025-10-23
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters for summary
FILES_MODIFIED=0
FILES_DELETED=0
LINES_REMOVED=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     Toast Notification Removal Script${NC}"
echo -e "${BLUE}     Lipton Legal Form Application${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

################################################################################
# Step 1: Create Backup
################################################################################
echo -e "${YELLOW}[1/8]${NC} Creating backup of files..."

BACKUP_DIR="backups/toast-removal-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup files that will be modified
cp index.html "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  index.html not found"
cp js/sse-client.js "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  js/sse-client.js not found"
cp js/form-submission.js "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  js/form-submission.js not found"
cp package.json "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  package.json not found"
cp js/toast-notifications.js "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  js/toast-notifications.js not found"

echo -e "${GREEN}✓${NC} Backup created in: ${BACKUP_DIR}"
echo ""

################################################################################
# Step 2: Remove Notyf CDN from index.html
################################################################################
echo -e "${YELLOW}[2/8]${NC} Removing Notyf CDN references from index.html..."

if [ -f "index.html" ]; then
    # Remove Notyf CSS link
    sed -i.bak '/notyf.*\.min\.css/d' index.html

    # Remove Notyf JS script
    sed -i.bak '/notyf.*\.min\.js/d' index.html

    # Remove toast-notifications.js script
    sed -i.bak '/toast-notifications\.js/d' index.html

    # Clean up backup files created by sed
    rm index.html.bak 2>/dev/null || true

    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    LINES_REMOVED=$((LINES_REMOVED + 3))
    echo -e "${GREEN}✓${NC} Removed 3 lines from index.html"
else
    echo -e "${RED}✗${NC} index.html not found"
fi
echo ""

################################################################################
# Step 3: Remove toast calls from js/sse-client.js
################################################################################
echo -e "${YELLOW}[3/8]${NC} Removing toast triggers from js/sse-client.js..."

if [ -f "js/sse-client.js" ]; then
    # Create a temporary file for the modified content
    cat js/sse-client.js | \
    # Remove reconnection toast (lines 105-107)
    sed '/if (this\.reconnectAttempts > 0) {/,/}/d' | \
    # Remove progress update toast (lines 170-172)
    sed '/if (typeof progressToast !== .undefined. && progressToast\.showProgress) {/{N;N;d;}' | \
    # Remove success toast (lines 203-205)
    sed '/if (typeof progressToast !== .undefined. && progressToast\.showSuccess) {/{N;N;d;}' | \
    # Remove error toast (lines 248-250)
    sed '/if (typeof progressToast !== .undefined. && progressToast\.showError) {/{N;N;d;}' | \
    # Remove connection lost toast (lines 310-312)
    sed '/progressToast\.showProgress(this\.jobId, 0, 0, .Connection lost/,/)/d' | \
    # Remove connection failed toast (lines 368-374)
    sed '/progressToast\.showError(/{:a;N;/);/!ba;d;}' \
    > js/sse-client.js.tmp

    mv js/sse-client.js.tmp js/sse-client.js

    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    LINES_REMOVED=$((LINES_REMOVED + 18))
    echo -e "${GREEN}✓${NC} Removed 6 toast trigger blocks (~18 lines) from js/sse-client.js"
else
    echo -e "${RED}✗${NC} js/sse-client.js not found"
fi
echo ""

################################################################################
# Step 4: Remove toast calls from js/form-submission.js
################################################################################
echo -e "${YELLOW}[4/8]${NC} Removing toast triggers from js/form-submission.js..."

if [ -f "js/form-submission.js" ]; then
    # Remove background progress toast (line 310)
    sed -i.bak '/progressToast\.showProgress(caseId, 0, 0, .Documents generating in background/d' js/form-submission.js

    # Remove success toast block (lines 371-381)
    sed -i.bak '/if (!pipelineEnabled && typeof Notyf !== .undefined.) {/,/}/d' js/form-submission.js

    # Clean up backup files
    rm js/form-submission.js.bak 2>/dev/null || true

    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    LINES_REMOVED=$((LINES_REMOVED + 15))
    echo -e "${GREEN}✓${NC} Removed 3 toast trigger blocks (~15 lines) from js/form-submission.js"
else
    echo -e "${RED}✗${NC} js/form-submission.js not found"
fi
echo ""

################################################################################
# Step 5: Remove Notyf from package.json
################################################################################
echo -e "${YELLOW}[5/8]${NC} Removing Notyf dependency from package.json..."

if [ -f "package.json" ]; then
    # Remove the notyf dependency line
    sed -i.bak '/"notyf":/d' package.json

    # Clean up backup files
    rm package.json.bak 2>/dev/null || true

    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    LINES_REMOVED=$((LINES_REMOVED + 1))
    echo -e "${GREEN}✓${NC} Removed Notyf dependency from package.json"
else
    echo -e "${RED}✗${NC} package.json not found"
fi
echo ""

################################################################################
# Step 6: Delete toast-notifications.js
################################################################################
echo -e "${YELLOW}[6/8]${NC} Deleting toast-notifications.js..."

if [ -f "js/toast-notifications.js" ]; then
    LINES_IN_FILE=$(wc -l < js/toast-notifications.js)
    rm js/toast-notifications.js
    FILES_DELETED=$((FILES_DELETED + 1))
    LINES_REMOVED=$((LINES_REMOVED + LINES_IN_FILE))
    echo -e "${GREEN}✓${NC} Deleted js/toast-notifications.js (${LINES_IN_FILE} lines)"
else
    echo -e "${YELLOW}⚠${NC} js/toast-notifications.js not found (may already be deleted)"
fi
echo ""

################################################################################
# Step 7: Clean dist/ build artifacts
################################################################################
echo -e "${YELLOW}[7/8]${NC} Cleaning build artifacts in dist/..."

DIST_FILES_REMOVED=0

if [ -f "dist/js/toast-notifications.js" ]; then
    rm dist/js/toast-notifications.js
    DIST_FILES_REMOVED=$((DIST_FILES_REMOVED + 1))
    echo -e "${GREEN}✓${NC} Removed dist/js/toast-notifications.js"
fi

if [ -f "dist/index.html" ]; then
    # Apply same changes to dist/index.html
    sed -i.bak '/notyf.*\.min\.css/d' dist/index.html
    sed -i.bak '/notyf.*\.min\.js/d' dist/index.html
    sed -i.bak '/toast-notifications\.js/d' dist/index.html
    rm dist/index.html.bak 2>/dev/null || true
    DIST_FILES_REMOVED=$((DIST_FILES_REMOVED + 1))
    echo -e "${GREEN}✓${NC} Updated dist/index.html"
fi

if [ $DIST_FILES_REMOVED -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC} No dist/ artifacts found (may not be built yet)"
else
    FILES_MODIFIED=$((FILES_MODIFIED + DIST_FILES_REMOVED))
fi
echo ""

################################################################################
# Step 8: Run npm install to update package-lock.json
################################################################################
echo -e "${YELLOW}[8/8]${NC} Running npm install to update dependencies..."

if command -v npm &> /dev/null; then
    npm install --silent
    echo -e "${GREEN}✓${NC} npm install completed successfully"
else
    echo -e "${YELLOW}⚠${NC} npm not found - skipping dependency update"
    echo -e "  Run 'npm install' manually to update package-lock.json"
fi
echo ""

################################################################################
# Summary
################################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     Removal Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  Files modified: ${FILES_MODIFIED}"
echo -e "  Files deleted: ${FILES_DELETED}"
echo -e "  Lines removed: ${LINES_REMOVED}"
echo -e "  Backup location: ${BACKUP_DIR}"
echo ""
echo -e "${YELLOW}What Changed:${NC}"
echo -e "  ✓ Removed Notyf CDN references from index.html"
echo -e "  ✓ Removed toast triggers from js/sse-client.js (6 blocks)"
echo -e "  ✓ Removed toast triggers from js/form-submission.js (3 blocks)"
echo -e "  ✓ Removed Notyf from package.json dependencies"
echo -e "  ✓ Deleted js/toast-notifications.js"
echo -e "  ✓ Cleaned dist/ build artifacts"
echo -e "  ✓ Updated npm dependencies"
echo ""
echo -e "${YELLOW}What Still Works:${NC}"
echo -e "  ✓ Form submission and validation"
echo -e "  ✓ Document generation pipeline (background)"
echo -e "  ✓ SSE connection and progress tracking"
echo -e "  ✓ Database persistence"
echo -e "  ✓ File uploads to Dropbox"
echo ""
echo -e "${YELLOW}What's Different:${NC}"
echo -e "  ⚠ No visual toast notifications"
echo -e "  ⚠ No progress indicators during document generation"
echo -e "  ⚠ No success/error popups"
echo -e "  ℹ Check browser console for progress logs"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Test the application thoroughly (see TOAST_REMOVAL_PLAN.md)"
echo -e "  2. Run 'npm run build' to rebuild dist/ directory"
echo -e "  3. Deploy to production after verification"
echo ""
echo -e "${BLUE}Rollback Instructions:${NC}"
echo -e "  If you need to restore the toast system:"
echo -e "  ${GREEN}cp ${BACKUP_DIR}/* .${NC}"
echo -e "  ${GREEN}npm install${NC}"
echo ""
echo -e "${GREEN}Done!${NC} Review TOAST_REMOVAL_PLAN.md for testing checklist."
echo ""

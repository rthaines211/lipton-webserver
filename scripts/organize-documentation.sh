#!/bin/bash

# Documentation Organization Script
# This script reorganizes the scattered .md files into a proper directory structure

set -e

echo "========================================="
echo "Documentation Organization Script"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to move files safely
move_files() {
    local pattern="$1"
    local destination="$2"
    local description="$3"

    echo -e "${YELLOW}Moving ${description}...${NC}"

    # Count files matching pattern
    count=$(ls -1 ${pattern} 2>/dev/null | wc -l)

    if [ "$count" -gt 0 ]; then
        for file in ${pattern}; do
            if [ -f "$file" ]; then
                echo "  → Moving: $file"
                mv "$file" "$destination"
            fi
        done
        echo -e "${GREEN}  ✓ Moved $count files${NC}"
    else
        echo "  ✗ No files found matching: ${pattern}"
    fi
    echo ""
}

# Step 1: Create directory structure
echo -e "${YELLOW}Step 1: Creating directory structure...${NC}"
mkdir -p docs/archive/{deployment-reports,fixes,implementation-logs}
mkdir -p docs/client-intake
mkdir -p docs/integrations/{dropbox/archive,email}
mkdir -p docs/testing
mkdir -p docs/cleanup
mkdir -p docs/deployment
mkdir -p docs/architecture
mkdir -p docs/setup
echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Step 2: Move Phase and Deployment reports
echo -e "${YELLOW}Step 2: Organizing deployment reports...${NC}"
move_files "PHASE1*.md" "docs/archive/deployment-reports/" "Phase 1 reports"
move_files "PHASE_2*.md" "docs/archive/deployment-reports/" "Phase 2 reports"
move_files "PHASE_3*.md" "docs/archive/deployment-reports/" "Phase 3 reports"
move_files "PHASE_4*.md" "docs/archive/deployment-reports/" "Phase 4 reports"
move_files "PHASE_5*.md" "docs/archive/deployment-reports/" "Phase 5 reports"
move_files "PHASE*.md" "docs/archive/deployment-reports/" "Other phase reports"

# Step 3: Move fix reports to archive
echo -e "${YELLOW}Step 3: Archiving fix reports...${NC}"
move_files "SSE_*.md" "docs/archive/fixes/" "SSE fixes"
move_files "*_FIX*.md" "docs/archive/fixes/" "General fixes"
move_files "FIX_*.md" "docs/archive/fixes/" "Fix documents"
move_files "PIPELINE_*.md" "docs/archive/fixes/" "Pipeline fixes"
move_files "POLLING_*.md" "docs/archive/fixes/" "Polling fixes"

# Step 4: Move completion summaries
echo -e "${YELLOW}Step 4: Archiving completion reports...${NC}"
move_files "*_COMPLETE.md" "docs/archive/implementation-logs/" "Completion reports"
move_files "*_COMPLETION*.md" "docs/archive/implementation-logs/" "Completion logs"
move_files "*_SUMMARY.md" "docs/archive/implementation-logs/" "Summary reports"
move_files "*_STATUS.md" "docs/archive/implementation-logs/" "Status reports"
move_files "*_REPORT.md" "docs/archive/implementation-logs/" "General reports"

# Step 5: Move client intake docs (handle files with spaces)
echo -e "${YELLOW}Step 5: Organizing client intake documentation...${NC}"
if [ -f "Client Intake Implementation Plan - REVISED.md" ]; then
    echo "  → Moving: Client Intake Implementation Plan - REVISED.md"
    mv "Client Intake Implementation Plan - REVISED.md" "docs/client-intake/client-intake-implementation-plan.md"
fi
if [ -f "Client Intake Prompt.md" ]; then
    echo "  → Moving: Client Intake Prompt.md"
    mv "Client Intake Prompt.md" "docs/client-intake/client-intake-prompt.md"
fi
if [ -f "Client Intake Requirements.md" ]; then
    echo "  → Moving: Client Intake Requirements.md"
    mv "Client Intake Requirements.md" "docs/client-intake/client-intake-requirements.md"
fi
move_files "CLIENT_INTAKE*.md" "docs/client-intake/" "Client intake specs"
echo ""

# Step 6: Move Dropbox documentation
echo -e "${YELLOW}Step 6: Organizing Dropbox documentation...${NC}"
# Keep these as active references
if [ -f "DROPBOX_QUICK_START.md" ]; then
    mv "DROPBOX_QUICK_START.md" "docs/integrations/dropbox/"
fi
if [ -f "DROPBOX_OAUTH_FIX_GUIDE.md" ]; then
    mv "DROPBOX_OAUTH_FIX_GUIDE.md" "docs/integrations/dropbox/"
fi
# Archive the rest
move_files "DROPBOX_*.md" "docs/integrations/dropbox/archive/" "Dropbox archive docs"

# Step 7: Move email documentation
echo -e "${YELLOW}Step 7: Organizing email/notification documentation...${NC}"
move_files "EMAIL_*.md" "docs/integrations/email/" "Email documentation"
move_files "ARCHITECTURE_EMAIL*.md" "docs/integrations/email/" "Email architecture"

# Step 8: Move testing documentation
echo -e "${YELLOW}Step 8: Organizing testing documentation...${NC}"
move_files "TESTING*.md" "docs/testing/" "Testing guides"
move_files "VALIDATION*.md" "docs/testing/" "Validation guides"
move_files "REGENERATION*.md" "docs/testing/" "Regeneration guides"
move_files "MANUAL_*.md" "docs/testing/" "Manual test plans"
move_files "LOCAL_TESTING*.md" "docs/testing/" "Local testing docs"
move_files "EXAMPLE_*.md" "docs/testing/" "Example documentation"

# Step 9: Move deployment documentation
echo -e "${YELLOW}Step 9: Organizing deployment documentation...${NC}"
move_files "DEPLOYMENT*.md" "docs/deployment/" "Deployment guides"
move_files "GCP*.md" "docs/deployment/" "GCP deployment"
move_files "STAGING*.md" "docs/deployment/" "Staging docs"
move_files "REFACTORING*.md" "docs/deployment/" "Refactoring guides"
move_files "CLOUD_RUN*.md" "docs/deployment/" "Cloud Run docs"
move_files "PYTHON_PIPELINE*.md" "docs/deployment/" "Python pipeline docs"

# Step 10: Move architecture documentation
echo -e "${YELLOW}Step 10: Organizing architecture documentation...${NC}"
move_files "ARCHITECTURE*.md" "docs/architecture/" "Architecture docs"
move_files "CODEBASE_ANALYSIS.md" "docs/architecture/" "Codebase analysis"

# Step 11: Move setup documentation
echo -e "${YELLOW}Step 11: Organizing setup documentation...${NC}"
move_files "SETUP*.md" "docs/setup/" "Setup guides"
move_files "ENVIRONMENT*.md" "docs/setup/" "Environment docs"
move_files "FINAL_SETUP*.md" "docs/setup/" "Final setup steps"

# Step 12: Move cleanup documentation
echo -e "${YELLOW}Step 12: Moving cleanup documentation...${NC}"
move_files "CODEBASE_CLEANUP*.md" "docs/cleanup/" "Cleanup audit"
move_files "DETAILED_FILE*.md" "docs/cleanup/" "File analysis"
move_files "CLEANUP_QUICK*.md" "docs/cleanup/" "Cleanup reference"
move_files "MD_FILES_ORGANIZATION*.md" "docs/cleanup/" "MD organization plan"

# Step 13: Move CI/CD documentation
echo -e "${YELLOW}Step 13: Organizing CI/CD documentation...${NC}"
move_files "CI_CD*.md" "docs/deployment/" "CI/CD documentation"

# Step 14: Archive remaining misc docs
echo -e "${YELLOW}Step 14: Archiving miscellaneous documentation...${NC}"
move_files "DOCUMENTATION_*.md" "docs/archive/implementation-logs/" "Documentation logs"
move_files "BEFORE_AFTER*.md" "docs/archive/implementation-logs/" "Before/after comparisons"
move_files "PRODUCTION_STATUS.md" "docs/archive/implementation-logs/" "Production status"
move_files "READY_TO_TEST.md" "docs/archive/implementation-logs/" "Test readiness"
move_files "*_PLAN.md" "docs/archive/implementation-logs/" "Implementation plans"
move_files "*_CHECKLIST.md" "docs/archive/implementation-logs/" "Checklists"

# Special cases for important active docs
echo -e "${YELLOW}Step 15: Handling special cases...${NC}"
if [ -f "TOAST_REMOVAL_PLAN.md" ]; then
    mv "TOAST_REMOVAL_PLAN.md" "docs/archive/implementation-logs/"
fi
if [ -f "TDD_IMPLEMENTATION_SUMMARY.md" ]; then
    mv "TDD_IMPLEMENTATION_SUMMARY.md" "docs/archive/implementation-logs/"
fi
if [ -f "TDD_SUMMARY.md" ]; then
    mv "TDD_SUMMARY.md" "docs/archive/implementation-logs/"
fi
echo ""

# Step 16: Summary
echo "========================================="
echo -e "${GREEN}Organization Complete!${NC}"
echo "========================================="
echo ""

# Count remaining .md files at root
remaining=$(ls -1 *.md 2>/dev/null | wc -l)
echo "Files remaining at root: $remaining"

if [ "$remaining" -gt 0 ]; then
    echo ""
    echo "Remaining files at root level:"
    ls -1 *.md 2>/dev/null | head -20
    echo ""
    echo -e "${YELLOW}Note: README.md and 00_START_HERE.md should remain at root${NC}"
    echo -e "${YELLOW}Review other remaining files to determine if they should be moved${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Review the organized structure in docs/"
echo "2. Verify no critical documentation was misplaced"
echo "3. Update any code references to moved documentation"
echo "4. Commit the changes: git add -A && git commit -m 'docs: Reorganize documentation structure'"
echo ""
echo -e "${GREEN}✓ Documentation organization complete${NC}"
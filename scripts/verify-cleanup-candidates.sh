#!/bin/bash

# Batch Verification Script for Cleanup Candidates
# Checks all files identified as potential cleanup targets

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CLEANUP CANDIDATES VERIFICATION REPORT           ║${NC}"
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo ""
echo "Generated: $(date)"
echo "Repository: $REPO_ROOT"
echo ""

# Arrays to store results
SAFE_FILES=()
REVIEW_FILES=()
UNSAFE_FILES=()

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: DUPLICATE ROUTE FILES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check routes/intakes.js
echo -e "${YELLOW}Checking: routes/intakes.js${NC}"
if "$SCRIPT_DIR/verify-file-usage.sh" "routes/intakes.js" > /tmp/verify-intakes.log 2>&1; then
  SAFE_FILES+=("routes/intakes.js")
  echo -e "${GREEN}✓ SAFE${NC}"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1 ]; then
    UNSAFE_FILES+=("routes/intakes.js")
    echo -e "${RED}✗ NOT SAFE${NC}"
  else
    REVIEW_FILES+=("routes/intakes.js")
    echo -e "${YELLOW}⚠ REVIEW${NC}"
  fi
fi
echo ""

# Check routes/intakes-expanded.js
echo -e "${YELLOW}Checking: routes/intakes-expanded.js${NC}"
if "$SCRIPT_DIR/verify-file-usage.sh" "routes/intakes-expanded.js" > /tmp/verify-intakes-expanded.log 2>&1; then
  SAFE_FILES+=("routes/intakes-expanded.js")
  echo -e "${GREEN}✓ SAFE${NC}"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1 ]; then
    UNSAFE_FILES+=("routes/intakes-expanded.js")
    echo -e "${RED}✗ NOT SAFE${NC}"
  else
    REVIEW_FILES+=("routes/intakes-expanded.js")
    echo -e "${YELLOW}⚠ REVIEW${NC}"
  fi
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: DUPLICATE DATABASE SERVICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check which database service is used less
echo -e "${YELLOW}Analyzing database service usage...${NC}"
DB_SERVICE_COUNT=$(grep -r "database-service" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
DB_COUNT=$(grep -r "require.*'\.\/database'" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)

echo "  database-service.js: $DB_SERVICE_COUNT references"
echo "  database.js: $DB_COUNT references"

if [ "$DB_SERVICE_COUNT" -gt "$DB_COUNT" ]; then
  echo -e "  ${GREEN}Recommendation: Keep database-service.js, consolidate database.js${NC}"
  REVIEW_FILES+=("services/database.js")
else
  echo -e "  ${GREEN}Recommendation: Keep database.js, consolidate database-service.js${NC}"
  REVIEW_FILES+=("services/database-service.js")
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: UNUSED DIRECTORIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check /server/ directory
echo -e "${YELLOW}Checking: server/ directory${NC}"
SERVER_IMPORTS=$(grep -r "require.*'\.\/server\/" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "server.js:" || true)
SERVER_IMPORTS2=$(grep -r "require.*'\.\.\/server\/" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" || true)

if [ -z "$SERVER_IMPORTS" ] && [ -z "$SERVER_IMPORTS2" ]; then
  echo -e "${GREEN}✓ No imports found - likely safe to delete${NC}"
  SAFE_FILES+=("server/")
else
  echo -e "${RED}✗ Found imports:${NC}"
  echo "$SERVER_IMPORTS"
  echo "$SERVER_IMPORTS2"
  UNSAFE_FILES+=("server/")
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: MIGRATION DIRECTORIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Analyzing migration directories...${NC}"
if [ -d "database/migrations" ]; then
  echo "  database/migrations/: $(ls database/migrations 2>/dev/null | wc -l) files"
fi
if [ -d "migrations" ]; then
  echo "  migrations/: $(ls migrations/*.sql 2>/dev/null | wc -l) SQL files"
fi
if [ -d "Dev Setup/migrations" ]; then
  echo "  Dev Setup/migrations/: $(ls "Dev Setup/migrations" 2>/dev/null | wc -l) files"
fi
echo -e "${YELLOW}⚠ Recommendation: Consolidate all to /migrations/ directory${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FINAL SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ SAFE TO DELETE (${#SAFE_FILES[@]} files/directories):${NC}"
if [ ${#SAFE_FILES[@]} -eq 0 ]; then
  echo "  (none)"
else
  for file in "${SAFE_FILES[@]}"; do
    echo "  - $file"
  done
fi
echo ""

echo -e "${YELLOW}⚠️ REVIEW BEFORE DELETING (${#REVIEW_FILES[@]} files/directories):${NC}"
if [ ${#REVIEW_FILES[@]} -eq 0 ]; then
  echo "  (none)"
else
  for file in "${REVIEW_FILES[@]}"; do
    echo "  - $file"
  done
fi
echo ""

echo -e "${RED}❌ NOT SAFE TO DELETE (${#UNSAFE_FILES[@]} files/directories):${NC}"
if [ ${#UNSAFE_FILES[@]} -eq 0 ]; then
  echo "  (none)"
else
  for file in "${UNSAFE_FILES[@]}"; do
    echo "  - $file"
  done
fi
echo ""

# Generate deletion commands for safe files
if [ ${#SAFE_FILES[@]} -gt 0 ]; then
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}RECOMMENDED DELETION COMMANDS${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""
  echo "# Delete safe files/directories:"
  for file in "${SAFE_FILES[@]}"; do
    if [ -d "$file" ]; then
      echo "rm -rf \"$file\""
    else
      echo "rm \"$file\""
    fi
  done
  echo ""
fi

# Output detailed logs location
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Detailed verification logs saved to:"
echo "  /tmp/verify-intakes.log"
echo "  /tmp/verify-intakes-expanded.log"
echo ""
echo "To view detailed analysis: cat /tmp/verify-*.log"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

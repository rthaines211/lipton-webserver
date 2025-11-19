#!/bin/bash

# Verification Script for File Dependencies
# Usage: ./scripts/verify-file-usage.sh <file-path>
#
# This script checks if a file is safe to delete by searching for:
# 1. Direct requires/imports
# 2. Dynamic requires
# 3. References in tests
# 4. References in other branches
# 5. References in configuration files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if file path provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No file path provided${NC}"
  echo "Usage: $0 <file-path>"
  echo "Example: $0 routes/intakes.js"
  exit 1
fi

FILE_PATH="$1"
FILE_NAME=$(basename "$FILE_PATH")
FILE_NAME_NO_EXT="${FILE_NAME%.*}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}File Dependency Analysis${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "File: ${YELLOW}$FILE_PATH${NC}"
echo ""

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo -e "${RED}✗ File does not exist: $FILE_PATH${NC}"
  exit 1
fi

# Safety score (0-100, 100 = completely safe to delete)
SAFETY_SCORE=100
WARNINGS=0
BLOCKERS=0

echo -e "${BLUE}1. Checking for direct requires/imports...${NC}"
DIRECT_REQUIRES=$(grep -r "require.*$FILE_NAME_NO_EXT" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "$FILE_PATH" || true)
if [ -n "$DIRECT_REQUIRES" ]; then
  echo -e "${RED}✗ Found direct requires:${NC}"
  echo "$DIRECT_REQUIRES"
  SAFETY_SCORE=$((SAFETY_SCORE - 50))
  BLOCKERS=$((BLOCKERS + 1))
else
  echo -e "${GREEN}✓ No direct requires found${NC}"
fi
echo ""

echo -e "${BLUE}2. Checking for ES6 imports...${NC}"
ES6_IMPORTS=$(grep -r "import.*$FILE_NAME_NO_EXT" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "$FILE_PATH" || true)
if [ -n "$ES6_IMPORTS" ]; then
  echo -e "${RED}✗ Found ES6 imports:${NC}"
  echo "$ES6_IMPORTS"
  SAFETY_SCORE=$((SAFETY_SCORE - 50))
  BLOCKERS=$((BLOCKERS + 1))
else
  echo -e "${GREEN}✓ No ES6 imports found${NC}"
fi
echo ""

echo -e "${BLUE}3. Checking for dynamic requires...${NC}"
DYNAMIC_REQUIRES=$(grep -r "require(\`.*$FILE_NAME_NO_EXT" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" || true)
DYNAMIC_REQUIRES2=$(grep -r 'require(`.*'"$FILE_NAME_NO_EXT" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".git" || true)
if [ -n "$DYNAMIC_REQUIRES" ] || [ -n "$DYNAMIC_REQUIRES2" ]; then
  echo -e "${YELLOW}⚠ Found dynamic requires (may or may not use this file):${NC}"
  echo "$DYNAMIC_REQUIRES"
  echo "$DYNAMIC_REQUIRES2"
  SAFETY_SCORE=$((SAFETY_SCORE - 20))
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No dynamic requires found${NC}"
fi
echo ""

echo -e "${BLUE}4. Checking references in test files...${NC}"
TEST_REFERENCES=$(grep -r "$FILE_NAME_NO_EXT" tests/ 2>/dev/null || true)
if [ -n "$TEST_REFERENCES" ]; then
  echo -e "${YELLOW}⚠ Found in test files:${NC}"
  echo "$TEST_REFERENCES"
  SAFETY_SCORE=$((SAFETY_SCORE - 15))
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No test references found${NC}"
fi
echo ""

echo -e "${BLUE}5. Checking references in configuration files...${NC}"
CONFIG_REFERENCES=$(grep -r "$FILE_NAME" package.json *.json *.yaml *.yml Dockerfile Makefile 2>/dev/null || true)
if [ -n "$CONFIG_REFERENCES" ]; then
  echo -e "${RED}✗ Found in configuration files:${NC}"
  echo "$CONFIG_REFERENCES"
  SAFETY_SCORE=$((SAFETY_SCORE - 30))
  BLOCKERS=$((BLOCKERS + 1))
else
  echo -e "${GREEN}✓ No configuration references found${NC}"
fi
echo ""

echo -e "${BLUE}6. Checking git history (last 10 commits)...${NC}"
GIT_HISTORY=$(git log --oneline --all -10 --source -- "$FILE_PATH" 2>/dev/null || true)
if [ -n "$GIT_HISTORY" ]; then
  echo -e "${YELLOW}⚠ Recent git activity:${NC}"
  echo "$GIT_HISTORY"
  SAFETY_SCORE=$((SAFETY_SCORE - 10))
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No recent git activity${NC}"
fi
echo ""

echo -e "${BLUE}7. Checking for string references to filename...${NC}"
STRING_REFERENCES=$(grep -r "'$FILE_NAME'" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "$FILE_PATH" || true)
STRING_REFERENCES2=$(grep -r "\"$FILE_NAME\"" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "$FILE_PATH" || true)
if [ -n "$STRING_REFERENCES" ] || [ -n "$STRING_REFERENCES2" ]; then
  echo -e "${YELLOW}⚠ Found string references:${NC}"
  echo "$STRING_REFERENCES"
  echo "$STRING_REFERENCES2"
  SAFETY_SCORE=$((SAFETY_SCORE - 10))
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No string references found${NC}"
fi
echo ""

# Final assessment
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FINAL ASSESSMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Safety Score: ${YELLOW}$SAFETY_SCORE/100${NC}"
echo -e "Blockers: ${RED}$BLOCKERS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $SAFETY_SCORE -ge 90 ]; then
  echo -e "${GREEN}✅ SAFE TO DELETE${NC}"
  echo -e "This file appears to have no dependencies."
  echo -e "Recommendation: Safe to delete immediately."
  exit 0
elif [ $SAFETY_SCORE -ge 70 ]; then
  echo -e "${YELLOW}⚠️ REVIEW BEFORE DELETING${NC}"
  echo -e "This file has minor references that should be reviewed."
  echo -e "Recommendation: Review warnings, then delete if appropriate."
  exit 0
elif [ $SAFETY_SCORE -ge 50 ]; then
  echo -e "${YELLOW}🤔 UNCERTAIN - NEEDS INVESTIGATION${NC}"
  echo -e "This file has multiple references."
  echo -e "Recommendation: Investigate further before deletion."
  exit 1
else
  echo -e "${RED}❌ NOT SAFE TO DELETE${NC}"
  echo -e "This file is actively used in the codebase."
  echo -e "Recommendation: Do not delete without refactoring dependencies first."
  exit 1
fi
